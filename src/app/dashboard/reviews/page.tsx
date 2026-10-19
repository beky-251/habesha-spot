"use client";

import {
Suspense,
useCallback,
useEffect,
useState,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Review = {
id: string;
business_id: string;
user_id: string;
rating: number;
comment: string | null;
status: string;
created_at: string;
};

type Business = {
id: string;
name: string;
slug: string;
owner_user_id: string;
};

type ReviewReply = {
id: string;
review_id: string;
business_id: string;
owner_user_id: string;
reply: string;
created_at: string;
updated_at: string;
};

type ReviewWithDetails = Review & {
business: Business;
ownerReply: ReviewReply | null;
};

type FilterType = "all" | "positive" | "low";

export default function DashboardReviewsPage() {
return (
<Suspense
fallback={ <main className="min-h-screen bg-gray-50 px-4 py-10"> <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8">
Loading reviews... </div> </main>
}
> <DashboardReviewsContent /> </Suspense>
);
}

function DashboardReviewsContent() {
const [supabase] = useState(() => createClient());
const searchParams = useSearchParams();

const requestedReviewId = searchParams.get("reviewId");

const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [filter, setFilter] = useState<FilterType>("all");
const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

const loadReviews = useCallback(async () => {
setLoading(true);
setError("");

try {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    setReviews([]);
    setError("Please sign in to view your business reviews.");
    return;
  }

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, name, slug, owner_user_id")
    .eq("owner_user_id", user.id);

  if (businessesError) {
    throw businessesError;
  }

  const ownedBusinesses = (businesses ?? []) as Business[];

  if (ownedBusinesses.length === 0) {
    setReviews([]);
    return;
  }

  const businessIds = ownedBusinesses.map((business) => business.id);

  const { data: reviewData, error: reviewsError } = await supabase
    .from("reviews")
    .select(
      "id, business_id, user_id, rating, comment, status, created_at",
    )
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    throw reviewsError;
  }

  const fetchedReviews = (reviewData ?? []) as Review[];

  if (fetchedReviews.length === 0) {
    setReviews([]);
    setReplyDrafts({});
    return;
  }

  const reviewIds = fetchedReviews.map((review) => review.id);

  const { data: replyData, error: repliesError } = await supabase
    .from("review_replies")
    .select(
      "id, review_id, business_id, owner_user_id, reply, created_at, updated_at",
    )
    .in("review_id", reviewIds);

  if (repliesError) {
    throw repliesError;
  }

  const replyMap = new Map<string, ReviewReply>();

  for (const reply of (replyData ?? []) as ReviewReply[]) {
    replyMap.set(reply.review_id, reply);
  }

  const businessMap = new Map(
    ownedBusinesses.map((business) => [business.id, business]),
  );

  const detailedReviews: ReviewWithDetails[] = fetchedReviews
    .map((review) => {
      const business = businessMap.get(review.business_id);

      if (!business) {
        return null;
      }

      return {
        ...review,
        business,
        ownerReply: replyMap.get(review.id) ?? null,
      };
    })
    .filter(
      (review): review is ReviewWithDetails => review !== null,
    );

  setReviews(detailedReviews);

  setReplyDrafts((previous) => {
    const next = { ...previous };

    for (const review of detailedReviews) {
      if (!(review.id in next)) {
        next[review.id] = review.ownerReply?.reply ?? "";
      }
    }

    return next;
  });
} catch (err) {
  console.error("Failed to load reviews:", err);

  setError(
    err instanceof Error
      ? err.message
      : "Unable to load reviews. Please try again.",
  );
} finally {
  setLoading(false);
}

}, [supabase]);

useEffect(() => {
  let cancelled = false;

  const load = async () => {
    if (cancelled) return;

    await loadReviews();
  };

  void load();

  return () => {
    cancelled = true;
  };
}, [loadReviews]);


// Scroll to the review selected by a notification after reviews load.
useEffect(() => {
if (!requestedReviewId || loading) {
return;
}


const timer = window.setTimeout(() => {
  const element = document.getElementById(
    `review-${requestedReviewId}`,
  );

  element?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, 150);

return () => {
  window.clearTimeout(timer);
};

}, [requestedReviewId, loading, reviews]);

async function saveReply(review: ReviewWithDetails) {
const replyText = (replyDrafts[review.id] ?? "").trim();


setError("");
setSuccess("");

if (!replyText) {
  setError("Please enter a reply before saving.");
  return;
}

if (replyText.length > 2000) {
  setError("Replies cannot exceed 2,000 characters.");
  return;
}

setSavingReviewId(review.id);

try {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (review.business.owner_user_id !== user.id) {
    throw new Error(
      "You can only reply to reviews for your own business.",
    );
  }

  if (review.ownerReply) {
    const { error: updateError } = await supabase
      .from("review_replies")
      .update({
        reply: replyText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.ownerReply.id)
      .eq("owner_user_id", user.id);

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase
      .from("review_replies")
      .insert({
        review_id: review.id,
        business_id: review.business_id,
        owner_user_id: user.id,
        reply: replyText,
      });

    if (insertError) {
      throw insertError;
    }
  }

  setEditingReviewId(null);
  setSuccess("Your reply was saved successfully.");

  await loadReviews();
} catch (err) {
  console.error("Failed to save review reply:", err);

  setError(
    err instanceof Error ? err.message : "Unable to save your reply.",
  );
} finally {
  setSavingReviewId(null);
}

}

async function deleteReply(review: ReviewWithDetails) {
if (!review.ownerReply) {
return;
}


const confirmed = window.confirm(
  "Are you sure you want to delete this reply?",
);

if (!confirmed) {
  return;
}

setError("");
setSuccess("");
setDeletingReviewId(review.id);

try {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user || user.id !== review.business.owner_user_id) {
    throw new Error("You are not authorized to delete this reply.");
  }

  const { error: deleteError } = await supabase
    .from("review_replies")
    .delete()
    .eq("id", review.ownerReply.id)
    .eq("owner_user_id", user.id);

  if (deleteError) {
    throw deleteError;
  }

  setReplyDrafts((previous) => ({
    ...previous,
    [review.id]: "",
  }));

  setEditingReviewId(null);
  setSuccess("Your reply was deleted.");

  await loadReviews();
} catch (err) {
  console.error("Failed to delete reply:", err);

  setError(
    err instanceof Error ? err.message : "Unable to delete your reply.",
  );
} finally {
  setDeletingReviewId(null);
}

}

const visibleReviews = reviews.filter((review) => {
// Always include the notification's target review, regardless of filter.
if (review.id === requestedReviewId) {
return true;
}

if (filter === "positive") {
  return review.rating >= 4;
}

if (filter === "low") {
  return review.rating <= 3;
}

return true;

});

const averageRating =
reviews.length > 0
? reviews.reduce((sum, review) => sum + review.rating, 0) /
reviews.length
: 0;

const positiveReviews = reviews.filter(
(review) => review.rating >= 4,
).length;

const repliedCount = reviews.filter(
(review) => review.ownerReply !== null,
).length;

const requestedReviewExists = reviews.some(
(review) => review.id === requestedReviewId,
);

return ( <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-6 lg:px-8"> <div className="mx-auto max-w-5xl"> <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"> <div> <Link
           href="/dashboard"
           className="mb-3 inline-flex text-sm font-medium text-gray-600 hover:text-gray-900"
         >
← Back to dashboard </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Customer Reviews
        </h1>

        <p className="mt-2 text-gray-600">
          Read customer feedback and respond to reviews for your businesses.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void loadReviews()}
        disabled={loading}
        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Refreshing..." : "Refresh reviews"}
      </button>
    </div>

    {requestedReviewId && !loading && !requestedReviewExists && (
      <div
        role="status"
        className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        The requested review could not be found among the reviews available
        to your account. It may have been deleted, or the business may not
        belong to your account.
      </div>
    )}

    {error && (
      <div
        role="alert"
        className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {error}
      </div>
    )}

    {success && (
      <div
        role="status"
        className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {success}
      </div>
    )}

    <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total reviews" value={reviews.length.toString()} />
      <StatCard
        label="Average rating"
        value={`${averageRating.toFixed(1)} / 5`}
      />
      <StatCard
        label="Positive reviews"
        value={positiveReviews.toString()}
      />
      <StatCard
        label="Replies posted"
        value={`${repliedCount} / ${reviews.length}`}
      />
    </section>

    <section className="mb-5 flex flex-wrap gap-2">
      <FilterButton
        active={filter === "all"}
        onClick={() => setFilter("all")}
      >
        All reviews
      </FilterButton>

      <FilterButton
        active={filter === "positive"}
        onClick={() => setFilter("positive")}
      >
        Positive (4–5 ★)
      </FilterButton>

      <FilterButton
        active={filter === "low"}
        onClick={() => setFilter("low")}
      >
        Needs attention (1–3 ★)
      </FilterButton>
    </section>

    {loading ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
        Loading reviews...
      </div>
    ) : visibleReviews.length === 0 ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <div className="text-4xl" aria-hidden="true">
          ⭐
        </div>

        <h2 className="mt-4 text-lg font-semibold">
          {reviews.length === 0
            ? "No reviews yet"
            : "No reviews match this filter"}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {reviews.length === 0
            ? "Customer reviews for your businesses will appear here."
            : "Choose another filter to see more reviews."}
        </p>
      </div>
    ) : (
      <div className="space-y-5">
        {visibleReviews.map((review) => {
          const isEditing = editingReviewId === review.id;
          const hasReply = Boolean(review.ownerReply);
          const isSaving = savingReviewId === review.id;
          const isDeleting = deletingReviewId === review.id;
          const isRequestedReview = review.id === requestedReviewId;

          return (
            <article
              key={review.id}
              id={`review-${review.id}`}
              aria-label={
                isRequestedReview
                  ? "Review opened from notification"
                  : undefined
              }
              className={`scroll-mt-24 rounded-2xl border p-5 shadow-sm transition-colors duration-500 sm:p-6 ${
                isRequestedReview
                  ? "border-orange-400 bg-orange-50 ring-2 ring-orange-300"
                  : "border-gray-200 bg-white"
              }`}
            >
              {isRequestedReview && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-semibold text-orange-800">
                  <span aria-hidden="true">🔔</span>
                  Opened from your notification
                </div>
              )}

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <Link
                    href={`/business/${review.business.slug}`}
                    className="font-semibold text-gray-900 hover:text-blue-700"
                  >
                    {review.business.name}
                  </Link>

                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>

                <div
                  className="flex items-center gap-1 text-amber-500"
                  aria-label={`Rating: ${review.rating} out of 5`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={index}
                      className={
                        index < review.rating
                          ? "text-amber-500"
                          : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  ))}

                  <span className="ml-2 text-sm font-semibold text-gray-700">
                    {review.rating}/5
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-sm font-semibold text-gray-700">
                  Customer feedback
                </h2>

                <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">
                  {review.comment?.trim() ||
                    "The customer did not leave a written comment."}
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">
                    Your business reply
                  </h3>

                  {hasReply && !isEditing && (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      Replied
                    </span>
                  )}
                </div>

                {hasReply && !isEditing ? (
                  <>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {review.ownerReply?.reply}
                    </p>

                    {review.ownerReply?.updated_at && (
                      <p className="mt-2 text-xs text-gray-500">
                        Last updated{" "}
                        {new Date(
                          review.ownerReply.updated_at,
                        ).toLocaleDateString()}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyDrafts((previous) => ({
                            ...previous,
                            [review.id]: review.ownerReply?.reply ?? "",
                          }));
                          setEditingReviewId(review.id);
                          setError("");
                          setSuccess("");
                        }}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Edit reply
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteReply(review)}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete reply"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label
                      htmlFor={`reply-${review.id}`}
                      className="mt-3 block text-sm text-gray-600"
                    >
                      {hasReply
                        ? "Update your response to this customer."
                        : "Thank the customer or respond to their feedback."}
                    </label>

                    <textarea
                      id={`reply-${review.id}`}
                      value={replyDrafts[review.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((previous) => ({
                          ...previous,
                          [review.id]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={4}
                      placeholder="Write a professional, helpful reply..."
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <span className="text-xs text-gray-500">
                        {(replyDrafts[review.id] ?? "").length}/2000
                        {" "}characters
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReviewId(null);
                              setReplyDrafts((previous) => ({
                                ...previous,
                                [review.id]:
                                  review.ownerReply?.reply ?? "",
                              }));
                            }}
                            disabled={isSaving}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void saveReply(review)}
                          disabled={isSaving || isDeleting}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving
                            ? "Saving..."
                            : hasReply
                              ? "Update reply"
                              : "Post reply"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    )}
  </div>
</main>
);
}

function StatCard({
label,
value,
}: {
label: string;
value: string;
}) {
return ( <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"> <p className="text-sm text-gray-500">{label}</p> <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p> </div>
);
}

function FilterButton({
active,
onClick,
children,
}: {
active: boolean;
onClick: () => void;
children: ReactNode;
}) {
return (
<button
type="button"
onClick={onClick}
aria-pressed={active}
className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gray-900 text-white"
          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
      }`}
>
{children} </button>
);
}
