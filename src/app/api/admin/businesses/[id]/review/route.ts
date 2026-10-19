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
    const { id: businessId } = await params;

    if (!businessId || !businessId.trim()) {
      return errorResponse("A business ID is required.", 400);
    }

    // 1. Verify the authenticated user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "You must sign in to perform this action.",
        401
      );
    }

    // 2. Verify administrator privileges.
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

    // 3. Parse and validate the request body.
    let body: ReviewRequest;

    try {
      body = (await request.json()) as ReviewRequest;
    } catch {
      return errorResponse("The request body must be valid JSON.", 400);
    }

    if (body.status !== "approved" && body.status !== "rejected") {
      return errorResponse(
        "Status must be approved or rejected.",
        400
      );
    }

    const status: ReviewStatus = body.status;

    // 4. Confirm that the business exists.
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup failed:", businessError);

      return errorResponse("Unable to retrieve the business.", 500);
    }

    if (!business) {
      return errorResponse("Business not found.", 404);
    }

    // 5. Update the business status.
    const { data: updatedBusiness, error: updateError } =
      await supabase
        .from("businesses")
        .update({ status })
        .eq("id", businessId)
        .select("id, name, status, owner_user_id")
        .maybeSingle();

    if (updateError) {
      console.error("Business approval error:", updateError);

      return errorResponse(
        "Could not update the business. Check your Supabase permissions and RLS policies.",
        500
      );
    }

    if (!updatedBusiness) {
      return errorResponse(
        "The business was not updated. Check the businesses table RLS policies.",
        403
      );
    }

    // 6. Attempt to notify the business owner.
    // Notification failure does not undo a successful status update.
    let notificationSent = false;

    if (updatedBusiness.owner_user_id) {
      const approved = status === "approved";

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: updatedBusiness.owner_user_id,
          title: approved
            ? "Your business has been approved!"
            : "Your business listing was rejected",
          message: approved
            ? `${updatedBusiness.name} has been approved and can now be listed on HabeshaSpot.`
            : `${updatedBusiness.name} was not approved. Please review your listing details and contact support if you need help.`,
          type: approved ? "business_approved" : "business_rejected",
          business_id: updatedBusiness.id,
        });

      if (notificationError) {
        console.error(
          "Business notification error:",
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
          ? "Business approved successfully."
          : "Business rejected successfully.",
      business: updatedBusiness,
      notificationSent,
    });
  } catch (error) {
    console.error("Business review API error:", error);

    return errorResponse(
      "An unexpected server error occurred.",
      500
    );
  }
}