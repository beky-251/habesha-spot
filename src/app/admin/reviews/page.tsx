"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ReviewStatus = "pending" | "approved" | "rejected";
type ReviewFilter = "all" | ReviewStatus;

type ReviewRecord = {
id: string;
business_id: string;
rating: number;
comment: string | null;
status: string;
created_at: string;
};

type BusinessRecord = {
id: string;
name: string;
slug: string;
};

type Review = {
id: string;
business_id: string;
business_name: string;
business_slug: string;
rating: number;
comment: string | null;
status: ReviewStatus;
created_at: string;
};

const FILTERS: { label: string; value: ReviewFilter }[] = [
{ label: "All reviews", value: "all" },
{ label: "Pending", value: "pending" },
{ label: "Approved", value: "approved" },
{ label: "Rejected", value: "rejected" },
];

function statusClass(status: ReviewStatus): string {
switch (status) {
case "approved":
return "bg-green-100 text-green-800";
case "rejected":
return "bg-red-100 text-red-800";
default:
return "bg-amber-100 text-amber-800";
}
}

function formatDate(value: string): string {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "Unknown date";
}

return new Intl.DateTimeFormat("en", {
year: "numeric",
month: "short",
day: "numeric",
}).format(date);
}

export default function AdminReviewsPage() {
const [reviews, setReviews] = useState<Review[]>([]);
const [filter, setFilter] = useState<ReviewFilter>("all");
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);
const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
const [error, setError] = useState("");
const [notice, setNotice] = useState("");
const [authorized, setAuthorized] = useState(false);
const [reloadKey, setReloadKey] = useState(0);

const supabase = useMemo(() => createClient(), []);

const loadReviews = useCallback(async () => {
setLoading(true);
setError("");


try {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    window.location.replace("/login");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Unable to verify administrator permissions: ${profileError.message}`,
    );
  }

  if (profile?.role !== "admin") {
    window.location.replace("/");
    return;
  }

  const [
    { data: reviewData, error: reviewError },
    { data: businessData, error: businessError },
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, business_id, rating, comment, status, created_at")
      .order("created_at", { ascending: false }),

    supabase.from("businesses").select("id, name, slug"),
  ]);

  if (reviewError) {
    throw new Error(`Could not load reviews: ${reviewError.message}`);
  }

  if (businessError) {
    throw new Error(`Could not load businesses: ${businessError.message}`);
  }

  const businessMap = new Map<string, BusinessRecord>(
    ((businessData ?? []) as BusinessRecord[]).map((business) => [
      business.id,
      business,
    ]),
  );

  const validStatuses: ReviewStatus[] = [
    "pending",
    "approved",
    "rejected",
  ];

  const formattedReviews: Review[] = (
    (reviewData ?? []) as ReviewRecord[]
  )
    .filter((review) =>
      validStatuses.includes(review.status as ReviewStatus),
    )
    .map((review) => {
      const business = businessMap.get(review.business_id);

      return {
        id: review.id,
        business_id: review.business_id,
        business_name: business?.name ?? "Unknown business",
        business_slug: business?.slug ?? "",
        rating: review.rating,
        comment: review.comment,
        status: review.status as ReviewStatus,
        created_at: review.created_at,
      };
    });

  setReviews(formattedReviews);
  setAuthorized(true);
} catch (caughtError) {
  const message =
    caughtError instanceof Error
      ? caughtError.message
      : "An unexpected error occurred.";

  setError(message);
  setAuthorized(false);
} finally {
  setLoading(false);
}

}, [supabase]);

useEffect(() => {
let cancelled = false;


const timer = window.setTimeout(() => {
  if (!cancelled) {
    void loadReviews();
  }
}, 0);

return () => {
  cancelled = true;
  window.clearTimeout(timer);
};

}, [loadReviews, reloadKey]);

const filteredReviews = useMemo(() => {
const normalizedSearch = search.trim().toLowerCase();


return reviews.filter((review) => {
  const matchesFilter =
    filter === "all" || review.status === filter;

  const matchesSearch =
    normalizedSearch === "" ||
    review.business_name.toLowerCase().includes(normalizedSearch) ||
    (review.comment ?? "").toLowerCase().includes(normalizedSearch) ||
    review.rating.toString().includes(normalizedSearch);

  return matchesFilter && matchesSearch;
});

}, [reviews, filter, search]);

const counts = useMemo(
() => ({
all: reviews.length,
pending: reviews.filter((review) => review.status === "pending").length,
approved: reviews.filter((review) => review.status === "approved").length,
rejected: reviews.filter((review) => review.status === "rejected").length,
}),
[reviews],
);

async function updateReview(
reviewId: string,
status: "approved" | "rejected",
) {
setBusyReviewId(reviewId);
setError("");
setNotice("");

try {
  const response = await fetch(`/api/admin/reviews/${reviewId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const result: { error?: string; message?: string } =
    await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to update this review.");
  }

  setReviews((currentReviews) =>
    currentReviews.map((review) =>
      review.id === reviewId ? { ...review, status } : review,
    ),
  );

  setNotice(result.message ?? `Review ${status} successfully.`);
} catch (caughtError) {
  setError(
    caughtError instanceof Error
      ? caughtError.message
      : "Unable to update this review.",
  );
} finally {
  setBusyReviewId(null);
}

}

if (loading) {
return ( <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"> <p className="text-sm font-medium text-gray-600">
Loading reviews... </p> </main>
);
}

if (!authorized) {
return ( <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"> <div className="max-w-md text-center"> <h1 className="text-xl font-bold text-gray-900">
Unable to open reviews </h1>

      <p className="mt-2 text-sm text-gray-600">
        {error || "You may not have permission to access this page."}
      </p>

      <button
        type="button"
        onClick={() => {
          setLoading(true);
          setReloadKey((current) => current + 1);
        }}
        className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
      >
        Try again
      </button>

      <div className="mt-4">
        <Link href="/" className="text-sm text-amber-700 hover:underline">
          Return to homepage
        </Link>
      </div>
    </div>
  </main>
);

}

return ( <main className="min-h-screen bg-gray-50"> <header className="border-b border-gray-200 bg-white"> <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"> <div> <p className="text-sm font-semibold text-amber-700">
HabeshaSpot Administration </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          Manage Reviews
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review customer feedback and manage its publication status.
        </p>
      </div>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Admin Dashboard
        </Link>

        <Link
          href="/"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          View Website
        </Link>
      </nav>
    </div>
  </header>

  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {error && (
      <div
        role="alert"
        className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {error}
      </div>
    )}

    {notice && (
      <div
        role="status"
        className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {notice}
      </div>
    )}

    <section
      aria-label="Review statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {[
        {
          label: "Total reviews",
          count: counts.all,
          color: "text-gray-900",
        },
        {
          label: "Pending",
          count: counts.pending,
          color: "text-amber-700",
        },
        {
          label: "Approved",
          count: counts.approved,
          color: "text-green-700",
        },
        {
          label: "Rejected",
          count: counts.rejected,
          color: "text-red-700",
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">{item.label}</p>
          <p className={`mt-2 text-3xl font-bold ${item.color}`}>
            {item.count}
          </p>
        </div>
      ))}
    </section>

    <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Customer reviews
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredReviews.length}{" "}
              {filteredReviews.length === 1 ? "review" : "reviews"} found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="review-search">
              Search reviews
            </label>

            <input
              id="review-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search business or comment..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 sm:w-72"
            />

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setReloadKey((current) => current + 1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === item.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label}
              <span className="ml-2 opacity-75">
                {counts[item.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="px-5 py-16 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
            ★
          </div>

          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No reviews found
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Try another filter or search term.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredReviews.map((review) => (
            <article key={review.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="flex items-center gap-1 text-sm font-bold text-amber-600"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      <span aria-hidden="true">★</span>
                      <span>{review.rating}/5</span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                        review.status,
                      )}`}
                    >
                      {review.status}
                    </span>

                    <span className="text-xs text-gray-500">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-gray-900">
                    {review.business_name}
                  </h3>

                  {review.business_slug ? (
                    <Link
                      href={`/business/${review.business_slug}`}
                      className="mt-1 inline-block text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      View business
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">
                      Business page unavailable
                    </p>
                  )}

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {review.comment?.trim() || "No written comment."}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      disabled={busyReviewId === review.id}
                      onClick={() =>
                        void updateReview(review.id, "approved")
                      }
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyReviewId === review.id ? "Saving..." : "Approve"}
                    </button>
                  )}

                  {review.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={busyReviewId === review.id}
                      onClick={() =>
                        void updateReview(review.id, "rejected")
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyReviewId === review.id ? "Saving..." : "Reject"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  </div>
</main>

);
}
