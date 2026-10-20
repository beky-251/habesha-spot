import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_REPLY_LENGTH = 2000;

const UUID_PATTERN =
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
params: Promise<{ id: string }>;
};

type UpdateReplyBody = {
reply?: unknown;
};

async function getAuthenticatedUser() {
const supabase = await createClient();

const {
data: { user },
error,
} = await supabase.auth.getUser();

if (error || !user) {
return { supabase, user: null };
}

return { supabase, user };
}

export async function PATCH(
request: NextRequest,
context: RouteContext,
) {
try {
const { id } = await context.params;

if (!UUID_PATTERN.test(id)) {
  return NextResponse.json(
    { error: "Invalid reply ID." },
    { status: 400 },
  );
}

const { supabase, user } = await getAuthenticatedUser();

if (!user) {
  return NextResponse.json(
    { error: "Please sign in to edit your reply." },
    { status: 401 },
  );
}

let body: UpdateReplyBody;

try {
  body = (await request.json()) as UpdateReplyBody;
} catch {
  return NextResponse.json(
    { error: "Invalid request body." },
    { status: 400 },
  );
}

if (!body || typeof body !== "object" || Array.isArray(body)) {
  return NextResponse.json(
    { error: "Invalid reply data." },
    { status: 400 },
  );
}

if (typeof body.reply !== "string") {
  return NextResponse.json(
    { error: "Your reply must be text." },
    { status: 400 },
  );
}

const reply = body.reply.trim();

if (!reply || reply.length > MAX_REPLY_LENGTH) {
  return NextResponse.json(
    {
      error: "Your reply must contain between 1 and 2000 characters.",
    },
    { status: 400 },
  );
}

// Only the owner who created the reply can edit it.
const { data: existingReply, error: lookupError } = await supabase
  .from("review_replies")
  .select("id, review_id, business_id, owner_user_id")
  .eq("id", id)
  .eq("owner_user_id", user.id)
  .maybeSingle();

if (lookupError) {
  console.error("Reply lookup failed:", lookupError);

  return NextResponse.json(
    { error: "Could not find your reply." },
    { status: 500 },
  );
}

if (!existingReply) {
  return NextResponse.json(
    { error: "Reply not found or you are not authorized to edit it." },
    { status: 404 },
  );
}

// Verify the user still owns the business and that the review is approved.
const { data: business, error: businessError } = await supabase
  .from("businesses")
  .select("id")
  .eq("id", existingReply.business_id)
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
    { error: "You are not authorized to edit this reply." },
    { status: 403 },
  );
}

const { data: review, error: reviewError } = await supabase
  .from("reviews")
  .select("id")
  .eq("id", existingReply.review_id)
  .eq("business_id", existingReply.business_id)
  .eq("status", "approved")
  .maybeSingle();

if (reviewError) {
  console.error("Review verification failed:", reviewError);

  return NextResponse.json(
    { error: "Could not verify the review." },
    { status: 500 },
  );
}

if (!review) {
  return NextResponse.json(
    { error: "Only replies to approved reviews can be edited." },
    { status: 404 },
  );
}

const { data: updatedReply, error: updateError } = await supabase
  .from("review_replies")
  .update({
    reply,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id)
  .eq("owner_user_id", user.id)
  .select(
    "id, review_id, business_id, owner_user_id, reply, created_at, updated_at",
  )
  .maybeSingle();

if (updateError) {
  console.error("Reply update failed:", updateError);

  return NextResponse.json(
    { error: "Could not update your reply." },
    { status: 500 },
  );
}

if (!updatedReply) {
  return NextResponse.json(
    { error: "Reply could not be updated." },
    { status: 403 },
  );
}

return NextResponse.json({
  message: "Your reply was updated successfully.",
  reply: updatedReply,
});

} catch (error) {
console.error("Reply update API error:", error);

return NextResponse.json(
  { error: "An unexpected error occurred." },
  { status: 500 },
);

}
}

export async function DELETE(
_request: NextRequest,
context: RouteContext,
) {
try {
const { id } = await context.params;

if (!UUID_PATTERN.test(id)) {
  return NextResponse.json(
    { error: "Invalid reply ID." },
    { status: 400 },
  );
}

const { supabase, user } = await getAuthenticatedUser();

if (!user) {
  return NextResponse.json(
    { error: "Please sign in to delete your reply." },
    { status: 401 },
  );
}

// Find a reply owned by the signed-in user.
const { data: existingReply, error: lookupError } = await supabase
  .from("review_replies")
  .select("id, business_id, owner_user_id")
  .eq("id", id)
  .eq("owner_user_id", user.id)
  .maybeSingle();

if (lookupError) {
  console.error("Reply lookup failed:", lookupError);

  return NextResponse.json(
    { error: "Could not find your reply." },
    { status: 500 },
  );
}

if (!existingReply) {
  return NextResponse.json(
    { error: "Reply not found or you are not authorized to delete it." },
    { status: 404 },
  );
}

// Confirm current ownership before deleting.
const { data: business, error: businessError } = await supabase
  .from("businesses")
  .select("id")
  .eq("id", existingReply.business_id)
  .eq("owner_user_id", user.id)
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
    { error: "You are not authorized to delete this reply." },
    { status: 403 },
  );
}

const { error: deleteError } = await supabase
  .from("review_replies")
  .delete()
  .eq("id", id)
  .eq("owner_user_id", user.id);

if (deleteError) {
  console.error("Reply deletion failed:", deleteError);

  return NextResponse.json(
    { error: "Could not delete your reply." },
    { status: 500 },
  );
}

return NextResponse.json({
  message: "Your reply was deleted successfully.",
});

} catch (error) {
console.error("Reply deletion API error:", error);

return NextResponse.json(
  { error: "An unexpected error occurred." },
  { status: 500 },
);


}
}
