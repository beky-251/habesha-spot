import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the signed-in user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to submit a review." },
        { status: 401 }
      );
    }

    // Validate the request body.
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid review data." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const businessId = data.business_id;
    const rating = data.rating;
    const comment = data.comment;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof businessId !== "string" ||
      !uuidPattern.test(businessId)
    ) {
      return NextResponse.json(
        { error: "A valid business ID is required." },
        { status: 400 }
      );
    }

    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        { error: "Rating must be a whole number from 1 to 5." },
        { status: 400 }
      );
    }

    if (
      comment !== undefined &&
      comment !== null &&
      typeof comment !== "string"
    ) {
      return NextResponse.json(
        { error: "The review comment must be text." },
        { status: 400 }
      );
    }

    const cleanComment =
      typeof comment === "string" ? comment.trim() : "";

    if (cleanComment.length > 2000) {
      return NextResponse.json(
        { error: "The review must be 2000 characters or fewer." },
        { status: 400 }
      );
    }

    // Verify that the business exists, is approved,
    // and identify its owner.
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, owner_user_id")
      .eq("id", businessId)
      .eq("status", "approved")
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup failed:", businessError);

      return NextResponse.json(
        { error: "Could not verify this business." },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "This business is unavailable for reviews." },
        { status: 404 }
      );
    }

    // Create a pending review using the authenticated user's ID.
    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        business_id: businessId,
        user_id: user.id,
        rating,
        comment: cleanComment || null,
        status: "pending",
      })
      .select("id, business_id, rating, comment, status, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this business." },
          { status: 409 }
        );
      }

      console.error("Review submission failed:", insertError);

      return NextResponse.json(
        { error: "Could not submit your review. Please try again." },
        { status: 500 }
      );
    }

    // Notify the business owner after the review is successfully saved.
    // Notification failure must not undo the submitted review.
    let notificationSent = false;

    if (business.owner_user_id && business.owner_user_id !== user.id) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: business.owner_user_id,
          title: "New review submitted",
          message: `Someone submitted a ${rating}-star review for ${business.name}. The review is awaiting approval.`,
          type: "review_received",
          business_id: business.id,
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "Review notification could not be created:",
          notificationError
        );
      } else {
        notificationSent = true;
      }
    }

    return NextResponse.json(
      {
        message: "Your review was submitted and is awaiting approval.",
        review,
        notificationSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Review API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
