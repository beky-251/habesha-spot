import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ReviewStatus = "approved" | "rejected";

type RouteContext = {
params: Promise<{ id: string }>;
};

const UUID_PATTERN =
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function verifyAdmin() {
const supabase = await createClient();

const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
return {
supabase,
error: NextResponse.json(
{ error: "You must sign in to perform this action." },
{ status: 401 },
),
};
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("role")
.eq("id", user.id)
.maybeSingle();

if (profileError) {
console.error(
"Admin profile verification failed:",
profileError.message,
);

return {
  supabase,
  error: NextResponse.json(
    { error: "Unable to verify administrator permissions." },
    { status: 500 },
  ),
};


}

if (profile?.role !== "admin") {
return {
supabase,
error: NextResponse.json(
{ error: "Administrator access is required." },
{ status: 403 },
),
};
}

return { supabase, error: null };
}

async function getReviewId(params: RouteContext["params"]) {
const { id } = await params;

if (!UUID_PATTERN.test(id)) {
return null;
}

return id;
}

/**

* Approve or reject a review.
* PATCH /api/admin/reviews/[id]
  */
  export async function PATCH(
  request: Request,
  { params }: RouteContext,
  ) {
  try {
  const { supabase, error: adminError } = await verifyAdmin();

  if (adminError) {
  return adminError;
  }

  const id = await getReviewId(params);

  if (!id) {
  return NextResponse.json(
  { error: "A valid review ID is required." },
  { status: 400 },
  );
  }

  let body: { status?: unknown };

  try {
  body = await request.json();
  } catch {
  return NextResponse.json(
  { error: "The request body must contain valid JSON." },
  { status: 400 },
  );
  }

  if (
  body.status !== "approved" &&
  body.status !== "rejected"
  ) {
  return NextResponse.json(
  { error: "Status must be approved or rejected." },
  { status: 400 },
  );
  }

  const status: ReviewStatus = body.status;

  const { data: review, error: updateError } = await supabase
  .from("reviews")
  .update({
  status,
  updated_at: new Date().toISOString(),
  })
  .eq("id", id)
  .select("id, business_id, rating, status, updated_at")
  .maybeSingle();

  if (updateError) {
  console.error("Review update failed:", updateError.message);

  return NextResponse.json(
  {
  error:
  "Unable to update this review. Check the reviews table permissions and RLS policies.",
  },
  { status: 500 },
  );
  }

  if (!review) {
  return NextResponse.json(
  {
  error:
  "Review not found or you do not have permission to update it.",
  },
  { status: 404 },
  );
  }

  return NextResponse.json({
  message: `Review ${status} successfully.`,
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

/**

* Delete a review.
* DELETE /api/admin/reviews/[id]
  */
  export async function DELETE(
  _request: Request,
  { params }: RouteContext,
  ) {
  try {
  const { supabase, error: adminError } = await verifyAdmin();

  if (adminError) {
  return adminError;
  }

  const id = await getReviewId(params);

  if (!id) {
  return NextResponse.json(
  { error: "A valid review ID is required." },
  { status: 400 },
  );
  }

  const { data: deletedReview, error: deleteError } = await supabase
  .from("reviews")
  .delete()
  .eq("id", id)
  .select("id")
  .maybeSingle();

  if (deleteError) {
  console.error("Review deletion failed:", deleteError.message);

  return NextResponse.json(
  {
  error:
  "Unable to delete this review. Check the reviews table permissions and RLS policies.",
  },
  { status: 500 },
  );
  }

  if (!deletedReview) {
  return NextResponse.json(
  {
  error:
  "Review not found or you do not have permission to delete it.",
  },
  { status: 404 },
  );
  }

  return NextResponse.json({
  message: "Review deleted successfully.",
  id: deletedReview.id,
  });
  } catch (error) {
  console.error("Admin review deletion error:", error);

  return NextResponse.json(
  { error: "An unexpected server error occurred." },
  { status: 500 },
  );
  }
  }
