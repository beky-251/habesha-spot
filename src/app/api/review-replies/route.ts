import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_REPLY_LENGTH = 2000;

type ReplyRequestBody = {
  review_id?: unknown;
  business_id?: unknown;
  reply?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to reply to reviews." },
        { status: 401 },
      );
    }

    let body: ReplyRequestBody;

    try {
      body = (await request.json()) as ReplyRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid reply data." },
        { status: 400 },
      );
    }

    const reviewId = body.review_id;
    const businessId = body.business_id;
    const reply =
      typeof body.reply === "string" ? body.reply.trim() : "";

    if (
      typeof reviewId !== "string" ||
      !UUID_PATTERN.test(reviewId) ||
      typeof businessId !== "string" ||
      !UUID_PATTERN.test(businessId)
    ) {
      return NextResponse.json(
        { error: "A valid review and business ID are required." },
        { status: 400 },
      );
    }

    if (!reply || reply.length > MAX_REPLY_LENGTH) {
      return NextResponse.json(
        {
          error: "Your reply must contain between 1 and 2000 characters.",
        },
        { status: 400 },
      );
    }

    // Verify that the signed-in user owns this business.
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, owner_user_id")
      .eq("id", businessId)
      .eq("owner_user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();

    if (businessError) {
      console.error("Business ownership lookup failed:", businessError);

      return NextResponse.json(
        { error: "Could not verify business ownership." },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "You are not authorized to reply for this business." },
        { status: 403 },
      );
    }

    // Only allow replies to approved reviews for this business.
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id, business_id, status")
      .eq("id", reviewId)
      .eq("business_id", businessId)
      .eq("status", "approved")
      .maybeSingle();

    if (reviewError) {
      console.error("Review lookup failed:", reviewError);

      return NextResponse.json(
        { error: "Could not verify this review." },
        { status: 500 },
      );
    }

    if (!review) {
      return NextResponse.json(
        { error: "Only approved reviews for your business can receive replies." },
        { status: 404 },
      );
    }

    // The database has a unique constraint on review_id.
    const { data: existingReply, error: existingReplyError } =
      await supabase
        .from("review_replies")
        .select("id")
        .eq("review_id", reviewId)
        .maybeSingle();

    if (existingReplyError) {
      console.error("Existing reply lookup failed:", existingReplyError);

      return NextResponse.json(
        { error: "Could not check for an existing reply." },
        { status: 500 },
      );
    }

    if (existingReply) {
      return NextResponse.json(
        {
          error:
            "A reply already exists for this review. Use the edit option to update it.",
        },
        { status: 409 },
      );
    }

    const { data: savedReply, error: insertError } = await supabase
      .from("review_replies")
      .insert({
        review_id: reviewId,
        business_id: businessId,
        owner_user_id: user.id,
        reply,
      })
      .select(
        "id, review_id, business_id, owner_user_id, reply, created_at, updated_at",
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "A reply already exists for this review." },
          { status: 409 },
        );
      }

      console.error("Review reply insertion failed:", insertError);

      return NextResponse.json(
        {
          error:
            "Could not save your reply. Check the review reply table's permissions.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Your reply was published successfully.",
        reply: savedReply,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Review reply API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}