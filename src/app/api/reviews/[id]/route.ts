import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ReviewStatus = "approved" | "rejected";

type ReviewRequest = {
  status?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: reviewId } = await params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(reviewId)) {
      return errorResponse("A valid review ID is required.", 400);
    }

    const supabase = await createClient();

    // 1. Authenticate the user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Please sign in to manage reviews.",
        401
      );
    }

    // 2. Verify administrator permissions.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Admin permission check failed:", profileError);

      return errorResponse(
        "Unable to verify administrator permissions.",
        500
      );
    }

    if (profile?.role !== "admin") {
      return errorResponse(
        "Administrator access is required.",
        403
      );
    }

    // 3. Parse and validate the requested status.
    let body: ReviewRequest;

    try {
      body = (await request.json()) as ReviewRequest;
    } catch {
      return errorResponse(
        "The request body must be valid JSON.",
        400
      );
    }

    if (body.status !== "approved" && body.status !== "rejected") {
      return errorResponse(
        "Status must be approved or rejected.",
        400
      );
    }

    const status: ReviewStatus = body.status;

    // 4. Retrieve the review and its associated business.
    const { data: existingReview, error: reviewError } =
      await supabase
        .from("reviews")
        .select(`
          id,
          business_id,
          user_id,
          status,
          businesses (
            id,
            name,
            owner_user_id
          )
        `)
        .eq("id", reviewId)
        .maybeSingle();

    if (reviewError) {
      console.error("Review lookup failed:", reviewError);

      return errorResponse(
        "Unable to retrieve the review.",
        500
      );
    }

    if (!existingReview) {
      return errorResponse("Review not found.", 404);
    }

    // Do not update or notify again if the status is unchanged.
    if (existingReview.status === status) {
      return NextResponse.json({
        success: true,
        message: `Review is already ${status}.`,
        notificationSent: false,
      });
    }

    // 5. Update the review status.
    const { data: updatedReview, error: updateError } =
      await supabase
        .from("reviews")
        .update({ status })
        .eq("id", reviewId)
        .select("id, business_id, rating, comment, status, created_at")
        .maybeSingle();

    if (updateError) {
      console.error("Review status update failed:", updateError);

      return errorResponse(
        "Could not update the review. Check your Supabase permissions and RLS policies.",
        500
      );
    }

    if (!updatedReview) {
      return errorResponse(
        "The review was not updated. Check the reviews table RLS policies.",
        403
      );
    }

    // 6. Notify the business owner.
    // Notification failures do not undo the successful status change.
    let notificationSent = false;

    const relatedBusinesses = existingReview.businesses;

    const business = Array.isArray(relatedBusinesses)
      ? relatedBusinesses[0]
      : relatedBusinesses;

    if (business?.owner_user_id) {
      const approved = status === "approved";

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: business.owner_user_id,
          title: approved
            ? "A customer review was approved"
            : "A customer review was rejected",
          message: approved
            ? `A customer review for ${business.name} has been approved and can be displayed publicly.`
            : `A customer review for ${business.name} was rejected by an administrator.`,
          type: approved
            ? "review_approved"
            : "review_rejected",
          business_id: business.id,
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "Review decision notification failed:",
          notificationError
        );
      } else {
        notificationSent = true;
      }
    }

    return NextResponse.json({
      success: true,
      message:
        status === "approved"
          ? "Review approved successfully."
          : "Review rejected successfully.",
      review: updatedReview,
      notificationSent,
    });
  } catch (error) {
    console.error("Admin review API error:", error);

    return errorResponse(
      "An unexpected server error occurred.",
      500
    );
  }
}
