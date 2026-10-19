import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ReviewStatus = "approved" | "rejected";

type RouteContext = {
params: Promise<{ id: string }>;
};

export async function PATCH(
request: Request,
{ params }: RouteContext,
) {
try {
const supabase = await createClient();

// 1. Verify the signed-in user.
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { error: "You must sign in to perform this action." },
    { status: 401 },
  );
}

// 2. Verify that the user is an administrator.
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("Admin profile check failed:", profileError.message);

  return NextResponse.json(
    { error: "Unable to verify administrator permissions." },
    { status: 500 },
  );
}

if (profile?.role !== "admin") {
  return NextResponse.json(
    { error: "Administrator access is required." },
    { status: 403 },
  );
}

// 3. Get the review ID from the route.
const { id } = await params;

if (!id) {
  return NextResponse.json(
    { error: "A review ID is required." },
    { status: 400 },
  );
}

// 4. Validate the requested status.
let body: { status?: unknown };

try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { error: "The request body must contain valid JSON." },
    { status: 400 },
  );
}

const status = body.status;

if (status !== "approved" && status !== "rejected") {
  return NextResponse.json(
    { error: "Status must be approved or rejected." },
    { status: 400 },
  );
}

// 5. Update the review.
const reviewStatus: ReviewStatus = status;

const { data: review, error: updateError } = await supabase
  .from("reviews")
  .update({ status: reviewStatus })
  .eq("id", id)
  .select("id, status")
  .maybeSingle();

if (updateError) {
  console.error("Review update failed:", updateError.message);

  return NextResponse.json(
    {
      error:
        "Unable to update the review. Check your reviews table permissions and RLS policies.",
    },
    { status: 500 },
  );
}

if (!review) {
  return NextResponse.json(
    { error: "Review not found or you do not have permission to update it." },
    { status: 404 },
  );
}

// 6. Return the updated review.
return NextResponse.json({
  message: `Review ${reviewStatus} successfully.`,
  review,
});

} catch (error) {
console.error("Admin review API error:", error);

return NextResponse.json(
  { error: "An unexpected server error occurred." },
  { status: 500 },
);
}
}
