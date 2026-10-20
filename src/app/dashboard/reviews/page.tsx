"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


type Business = {
  id: string;
  name: string;
  status: string;
};

type Review = {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  status: string;
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

type Reviewer = {
  id: string;
  full_name?: string | null;
  name?: string | null;
};

type ReviewItem = {
  review: Review;
  business: Business;
  reviewer: Reviewer | null;
  reply: ReviewReply | null;
};

export default function DashboardReviewsPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<string[]>([]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("id, name, status")
        .eq("owner_user_id", user.id);

      if (businessesError) {
        throw new Error(businessesError.message);
      }

      const businesses = (businessesData ?? []) as Business[];

      if (businesses.length === 0) {
        setItems([]);
        return;
      }

      const businessIds = businesses.map((business) => business.id);

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, business_id, user_id, rating, comment, created_at, status")
        .in("business_id", businessIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (reviewsError) {
        throw new Error(reviewsError.message);
      }

      const reviews = (reviewsData ?? []) as Review[];

      if (reviews.length === 0) {
        setItems([]);
        return;
      }

      const reviewIds = reviews.map((review) => review.id);
      const reviewerIds = [...new Set(reviews.map((review) => review.user_id))];

      const [
        { data: repliesData, error: repliesError },
        { data: profilesData, error: profilesError },
      ] = await Promise.all([
        supabase
          .from("review_replies")
          .select(
            "id, review_id, business_id, owner_user_id, reply, created_at, updated_at",
          )
          .in("review_id", reviewIds),

        supabase
          .from("profiles")
          .select("id, full_name, name")
          .in("id", reviewerIds),
      ]);

      if (repliesError) {
        throw new Error(repliesError.message);
      }

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      const replies = (repliesData ?? []) as ReviewReply[];
      const reviewers = (profilesData ?? []) as Reviewer[];

      const businessMap = new Map(
        businesses.map((business) => [business.id, business]),
      );

      const replyMap = new Map(
        replies.map((reply) => [reply.review_id, reply]),
      );

      const reviewerMap = new Map(
        reviewers.map((reviewer) => [reviewer.id, reviewer]),
      );

      const nextItems = reviews
        .map((review) => {
          const business = businessMap.get(review.business_id);

          if (!business) {
            return null;
          }

          return {
            review,
            business,
            reviewer: reviewerMap.get(review.user_id) ?? null,
            reply: replyMap.get(review.id) ?? null,
          };
        })
        .filter((item): item is ReviewItem => item !== null);

      setItems(nextItems);

      setDrafts((previous) => {
        const next = { ...previous };

        for (const item of nextItems) {
          if (!(item.review.id in next)) {
            next[item.review.id] = item.reply?.reply ?? "";
          }
        }

        return next;
      });
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to load your reviews.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReviews]);

  function updateDraft(reviewId: string, value: string) {
    setDrafts((previous) => ({
      ...previous,
      [reviewId]: value,
    }));
  }

  function setSaving(reviewId: string, saving: boolean) {
    setSavingIds((previous) =>
      saving
        ? [...new Set([...previous, reviewId])]
        : previous.filter((id) => id !== reviewId),
    );
  }

  function toggleEditing(reviewId: string, editing: boolean) {
    setEditingIds((previous) =>
      editing
        ? [...new Set([...previous, reviewId])]
        : previous.filter((id) => id !== reviewId),
    );
  }

  async function saveReply(item: ReviewItem) {
    const reviewId = item.review.id;
    const replyText = (drafts[reviewId] ?? "").trim();

    setNotice("");
    setPageError("");

    if (!replyText) {
      setPageError("Please enter a reply before saving.");
      return;
    }

    if (replyText.length > 2000) {
      setPageError("Your reply cannot exceed 2,000 characters.");
      return;
    }

    setSaving(reviewId, true);

    try {
      const isEditing = Boolean(item.reply);

      const response = await fetch(
        isEditing
          ? `/api/review-replies/${item.reply!.id}`
          : "/api/review-replies",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? { reply: replyText }
              : {
                  review_id: reviewId,
                  business_id: item.business.id,
                  reply: replyText,
                },
          ),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to save your reply. Please try again.",
        );
      }

      setNotice(
        isEditing
          ? "Your reply has been updated."
          : "Your reply has been published.",
      );

      toggleEditing(reviewId, false);

      await loadReviews();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to save your reply.",
      );
    } finally {
      setSaving(reviewId, false);
    }
  }

  async function deleteReply(item: ReviewItem) {
    if (!item.reply) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this reply?",
    );

    if (!confirmed) {
      return;
    }

    setNotice("");
    setPageError("");
    setSaving(item.review.id, true);

    try {
      const response = await fetch(`/api/review-replies/${item.reply.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Unable to delete your reply.");
      }

      setNotice("Your reply has been deleted.");

      setDrafts((previous) => ({
        ...previous,
        [item.review.id]: "",
      }));

      toggleEditing(item.review.id, false);

      await loadReviews();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to delete your reply.",
      );
    } finally {
      setSaving(item.review.id, false);
    }
  }

  const averageRating =
    items.length > 0
      ? items.reduce((total, item) => total + item.review.rating, 0) /
        items.length
      : 0;

  const repliedCount = items.filter((item) => item.reply).length;
  const pendingReplyCount = items.length - repliedCount;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        {" "}
        <div className="mx-auto max-w-5xl">
          {" "}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            {" "}
            <p className="text-sm text-gray-600">
              Loading your customer reviews...{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      {" "}
      <div className="mx-auto max-w-5xl">
        {" "}
        <header className="mb-8">
          {" "}
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to dashboard{" "}
          </Link>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                Business dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Customer reviews
              </h1>

              <p className="mt-2 max-w-2xl text-gray-600">
                Read customer feedback and respond to reviews of your
                businesses.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadReviews()}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Refresh reviews
            </button>
          </div>
        </header>
        {pageError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {pageError}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Approved reviews</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {items.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Replies written</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {repliedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Average rating</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {items.length > 0 ? averageRating.toFixed(1) : "—"}
              {items.length > 0 && (
                <span className="ml-1 text-lg text-amber-500">★</span>
              )}
            </p>
          </div>
        </section>
        {items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-2xl">
              ★
            </div>

            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              No approved reviews yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              Approved customer reviews for your businesses will appear here.
              You can reply to each review once it becomes visible.
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Return to dashboard
            </Link>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Your reviews
              </h2>

              <p className="text-sm text-gray-500">
                {pendingReplyCount}{" "}
                {pendingReplyCount === 1 ? "review needs" : "reviews need"} a
                reply
              </p>
            </div>

            {items.map((item) => {
              const reviewId = item.review.id;
              const isEditing = editingIds.includes(reviewId);
              const isSaving = savingIds.includes(reviewId);
              const reviewerName =
                item.reviewer?.full_name?.trim() ||
                item.reviewer?.name?.trim() ||
                "Customer";

              return (
                <article
                  key={reviewId}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="border-b border-gray-100 p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-sm font-medium text-orange-700">
                          {item.business.name}
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-gray-900">
                          {reviewerName}
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(item.review.created_at).toLocaleDateString(
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
                        className="flex items-center gap-1"
                        aria-label={`${item.review.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <span
                            key={index}
                            className={
                              index < item.review.rating
                                ? "text-amber-500"
                                : "text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}

                        <span className="ml-1 text-sm font-semibold text-gray-700">
                          {item.review.rating}/5
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Customer feedback
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                        {item.review.comment?.trim() ||
                          "The customer left a rating without a comment."}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    {item.reply && !isEditing ? (
                      <div>
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <h4 className="font-semibold text-gray-900">
                            Your reply
                          </h4>

                          <span className="text-xs text-green-700">
                            Replied{" "}
                            {new Date(
                              item.reply.updated_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                          {item.reply.reply}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              updateDraft(reviewId, item.reply!.reply);
                              toggleEditing(reviewId, true);
                              setPageError("");
                              setNotice("");
                            }}
                            disabled={isSaving}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Edit reply
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteReply(item)}
                            disabled={isSaving}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isSaving ? "Please wait..." : "Delete reply"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {item.reply ? "Edit your reply" : "Reply to customer"}
                        </h4>

                        <p className="mt-1 text-sm text-gray-500">
                          Be helpful, professional, and respectful.
                        </p>

                        <textarea
                          value={drafts[reviewId] ?? ""}
                          onChange={(event) =>
                            updateDraft(reviewId, event.target.value)
                          }
                          maxLength={2000}
                          rows={4}
                          placeholder="Thank the customer or respond to their feedback..."
                          disabled={isSaving}
                          className="mt-4 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                        />

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-gray-500">
                            {(drafts[reviewId] ?? "").length}/2000 characters
                          </span>

                          <div className="flex flex-wrap gap-3">
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateDraft(
                                    reviewId,
                                    item.reply?.reply ?? "",
                                  );
                                  toggleEditing(reviewId, false);
                                  setPageError("");
                                }}
                                disabled={isSaving}
                                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => void saveReply(item)}
                              disabled={isSaving}
                              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving
                                ? "Saving..."
                                : item.reply
                                  ? "Save changes"
                                  : "Publish reply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
        <footer className="mt-10 border-t border-gray-200 py-6 text-center text-xs text-gray-500">
          Responding to customer feedback helps build trust in your business.
        </footer>
      </div>
    </main>
  );
}
