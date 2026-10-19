import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
try {
const supabase = await createClient();

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { error: "You must be signed in to view dashboard statistics." },
    { status: 401 },
  );
}

const { data: businesses, error: businessesError } = await supabase
  .from("businesses")
  .select("id, status, average_rating, review_count")
  .eq("owner_user_id", user.id);

if (businessesError) {
  throw businessesError;
}

const businessList = businesses ?? [];
const businessIds = businessList.map((business) => business.id);

let totalReviews = 0;
let weightedRatingTotal = 0;
let ratedReviewCount = 0;

for (const business of businessList) {
  const count = Number(business.review_count ?? 0);
  const rating = Number(business.average_rating ?? 0);

  totalReviews += count;

  if (count > 0 && rating > 0) {
    weightedRatingTotal += rating * count;
    ratedReviewCount += count;
  }
}

let unreadNotifications = 0;

const { count: notificationCount, error: notificationError } =
  await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

if (notificationError) {
  throw notificationError;
}

unreadNotifications = notificationCount ?? 0;

return NextResponse.json({
  statistics: {
    totalBusinesses: businessList.length,
    approvedBusinesses: businessList.filter(
      (business) => business.status === "approved",
    ).length,
    pendingBusinesses: businessList.filter(
      (business) => business.status === "pending",
    ).length,
    rejectedBusinesses: businessList.filter(
      (business) => business.status === "rejected",
    ).length,
    totalReviews,
    averageRating:
      ratedReviewCount > 0
        ? Number(
            (weightedRatingTotal / ratedReviewCount).toFixed(1),
          )
        : 0,
    unreadNotifications,
    businessCountForReviewStats: businessIds.length,
  },
});

} catch (error) {
console.error("Dashboard statistics error:", error);

return NextResponse.json(
  { error: "Unable to load dashboard statistics." },
  { status: 500 },
);

}
}
