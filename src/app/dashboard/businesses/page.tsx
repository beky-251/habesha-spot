"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type BusinessStatus = "pending" | "approved" | "rejected";

type Business = {
id: string;
name: string;
slug: string;
description: string | null;
address: string | null;
phone: string | null;
status: BusinessStatus;
created_at: string;
};

type BusinessesResponse = {
businesses?: Business[];
error?: string;
};

function formatDate(dateString: string): string {
const date = new Date(dateString);

if (Number.isNaN(date.getTime())) {
return "Date unavailable";
}

return new Intl.DateTimeFormat("en", {
year: "numeric",
month: "short",
day: "numeric",
}).format(date);
}

function getStatusStyles(status: BusinessStatus): string {
switch (status) {
case "approved":
return "bg-green-100 text-green-800";
case "rejected":
return "bg-red-100 text-red-800";
default:
return "bg-amber-100 text-amber-800";
}
}

function getStatusLabel(status: BusinessStatus): string {
switch (status) {
case "approved":
return "Approved";
case "rejected":
return "Rejected";
default:
return "Pending Review";
}
}

export default function MyBusinessesPage() {
const [businesses, setBusinesses] = useState<Business[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadBusinesses = useCallback(async (signal?: AbortSignal) => {
try {
const response = await fetch("/api/businesses", {
method: "GET",
cache: "no-store",
signal,
});

  const result: BusinessesResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Unable to load your businesses.");
  }

  setBusinesses(result.businesses ?? []);
  setError("");
} catch (err: unknown) {
  if (err instanceof Error && err.name === "AbortError") {
    return;
  }

  setError(
    err instanceof Error
      ? err.message
      : "An unexpected error occurred while loading your businesses.",
  );
} finally {
  if (!signal?.aborted) {
    setLoading(false);
  }
}

}, []);

useEffect(() => {
const controller = new AbortController();

const timer = window.setTimeout(() => {
  if (!controller.signal.aborted) {
    void loadBusinesses(controller.signal);
  }
}, 0);

return () => {
  window.clearTimeout(timer);
  controller.abort();
};

}, [loadBusinesses]);

const approvedCount = businesses.filter(
(business) => business.status === "approved",
).length;

const pendingCount = businesses.filter(
(business) => business.status === "pending",
).length;

const rejectedCount = businesses.filter(
(business) => business.status === "rejected",
).length;

const totalCount = businesses.length;

return ( <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"> <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div> <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
Business Dashboard </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
        My Businesses
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
        Manage your listings, update business information, upload photos,
        and set your opening hours.
      </p>
    </div>

    <Link
      href="/business"
      className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
    >
      + Add a Business
    </Link>
  </header>

  <section
    aria-label="Business statistics"
    className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
  >
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Total Businesses</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">
        {loading ? "—" : totalCount}
      </p>
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Approved</p>
      <p className="mt-2 text-3xl font-bold text-green-700">
        {loading ? "—" : approvedCount}
      </p>
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Pending Review</p>
      <p className="mt-2 text-3xl font-bold text-amber-600">
        {loading ? "—" : pendingCount}
      </p>
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Rejected</p>
      <p className="mt-2 text-3xl font-bold text-red-700">
        {loading ? "—" : rejectedCount}
      </p>
    </div>
  </section>

  {error && (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <p className="text-sm font-semibold text-red-900">
        Unable to load your businesses
      </p>

      <p className="mt-1 text-sm text-red-700">{error}</p>

      <button
        type="button"
        onClick={() => {
          setLoading(true);
          void loadBusinesses();
        }}
        className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
      >
        Try Again
      </button>
    </div>
  )}

  {loading ? (
    <section
      aria-label="Loading businesses"
      className="rounded-2xl border border-gray-200 bg-white p-12 text-center"
    >
      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

      <p className="font-medium text-gray-900">
        Loading your businesses...
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Please wait while we retrieve your listings.
      </p>
    </section>
  ) : !error && businesses.length === 0 ? (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
        🏪
      </div>

      <h2 className="mt-5 text-xl font-bold text-gray-950">
        No businesses yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
        Add your first business to start building your presence on
        HabeshaSpot.
      </p>

      <Link
        href="/business"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Add Your First Business
      </Link>
    </section>
  ) : !error ? (
    <section aria-label="Your business listings" className="space-y-5">
      {businesses.map((business) => (
        <article
          key={business.id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="break-words text-xl font-bold text-gray-950">
                    {business.name}
                  </h2>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
                      business.status,
                    )}`}
                  >
                    {getStatusLabel(business.status)}
                  </span>
                </div>

                {business.description && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {business.description}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
                  {business.address && (
                    <p>
                      <span aria-hidden="true">📍 </span>
                      {business.address}
                    </p>
                  )}

                  {business.phone && (
                    <p>
                      <span aria-hidden="true">☎ </span>
                      {business.phone}
                    </p>
                  )}

                  <p>Created {formatDate(business.created_at)}</p>
                </div>

                {business.status === "pending" && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Your listing is awaiting admin review. It will be
                    publicly available after approval.
                  </p>
                )}

                {business.status === "rejected" && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    This listing was rejected. Please contact the
                    administrator if you need more information.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
              <Link
                href={`/dashboard/businesses/${encodeURIComponent(
                  business.id,
                )}/edit`}
                className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Edit Business
              </Link>

              <Link
                href={`/dashboard/businesses/${encodeURIComponent(
                  business.id,
                )}/photos`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Manage Photos
              </Link>

              <Link
                href={`/dashboard/businesses/${encodeURIComponent(
                  business.id,
                )}/hours`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Opening Hours
              </Link>

              {business.status === "approved" && business.slug && (
                <Link
                  href={`/business/${encodeURIComponent(business.slug)}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  View Listing ↗
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  ) : null}

  <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
    <h2 className="font-semibold text-gray-950">Helpful Tips</h2>

    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
      <li>
        • Keep your business name, contact details, and address accurate.
      </li>
      <li>
        • Upload clear photos and choose an attractive cover image.
      </li>
      <li>
        • Keep your opening hours updated so customers know when you are
        open.
      </li>
      <li>
        • New listings may need administrator approval before appearing
        publicly.
      </li>
    </ul>
  </section>
</main>
);
}
