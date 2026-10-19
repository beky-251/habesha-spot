"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
Building2,
Plus,
Clock,
CheckCircle2,
XCircle,
ArrowRight,
Store,
RefreshCw,
AlertCircle,
Star,
Bell,
MessageSquare,
} from "lucide-react";

type Business = {
id: string;
name: string;
slug?: string;
status: "pending" | "approved" | "rejected" | string;
created_at?: string;
description?: string | null;
};

type DashboardResponse = {
businesses?: Business[];
error?: string;
};

type DashboardStatistics = {
totalBusinesses: number;
approvedBusinesses: number;
pendingBusinesses: number;
rejectedBusinesses: number;
totalReviews: number;
averageRating: number;
unreadNotifications: number;
};

type StatisticsResponse = {
statistics?: DashboardStatistics;
error?: string;
};

const EMPTY_STATISTICS: DashboardStatistics = {
totalBusinesses: 0,
approvedBusinesses: 0,
pendingBusinesses: 0,
rejectedBusinesses: 0,
totalReviews: 0,
averageRating: 0,
unreadNotifications: 0,
};

function formatDate(value?: string) {
if (!value) return "Date unavailable";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "Date unavailable";
}

return new Intl.DateTimeFormat("en", {
year: "numeric",
month: "short",
day: "numeric",
}).format(date);
}

function getStatus(status: string) {
switch (status) {
case "approved":
return {
label: "Approved",
className: "bg-emerald-50 text-emerald-700",
icon: CheckCircle2,
};


case "rejected":
  return {
    label: "Rejected",
    className: "bg-red-50 text-red-700",
    icon: XCircle,
  };

default:
  return {
    label: "Pending review",
    className: "bg-amber-50 text-amber-700",
    icon: Clock,
  };

}
}

export default function DashboardPage() {
const router = useRouter();

const [businesses, setBusinesses] = useState<Business[]>([]);
const [statistics, setStatistics] =
useState<DashboardStatistics>(EMPTY_STATISTICS);

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [statisticsError, setStatisticsError] = useState("");

const loadDashboard = useCallback(async () => {
setLoading(true);
setError("");
setStatisticsError("");

try {
  const [businessResponse, statisticsResponse] = await Promise.all([
    fetch("/api/businesses", {
      cache: "no-store",
    }),
    fetch("/api/dashboard/stats", {
      cache: "no-store",
    }),
  ]);

  if (
    businessResponse.status === 401 ||
    statisticsResponse.status === 401
  ) {
    router.replace("/login");
    return;
  }

  const businessData =
    (await businessResponse.json()) as DashboardResponse;

  if (!businessResponse.ok) {
    throw new Error(
      businessData.error || "Unable to load your businesses.",
    );
  }

  setBusinesses(
    Array.isArray(businessData.businesses)
      ? businessData.businesses
      : [],
  );

  if (statisticsResponse.ok) {
    const statisticsData =
      (await statisticsResponse.json()) as StatisticsResponse;

    if (statisticsData.statistics) {
      setStatistics({
        ...EMPTY_STATISTICS,
        ...statisticsData.statistics,
      });
    } else {
      setStatisticsError(
        statisticsData.error || "Statistics are not available yet.",
      );
    }
  } else {
    const statisticsData =
      (await statisticsResponse.json().catch(() => ({}))) as {
        error?: string;
      };

    setStatisticsError(
      statisticsData.error ||
        "Unable to load review and notification statistics.",
    );
  }
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Something went wrong while loading your dashboard.",
  );
} finally {
  setLoading(false);
}

}, [router]);

useEffect(() => {
const timer = window.setTimeout(() => {
void loadDashboard();
}, 0);


return () => window.clearTimeout(timer);


}, [loadDashboard]);

const statisticCards = [
{
label: "Total businesses",
value: statistics.totalBusinesses,
icon: Building2,
color: "bg-blue-50 text-blue-700",
},
{
label: "Approved",
value: statistics.approvedBusinesses,
icon: CheckCircle2,
color: "bg-emerald-50 text-emerald-700",
},
{
label: "Pending review",
value: statistics.pendingBusinesses,
icon: Clock,
color: "bg-amber-50 text-amber-700",
},
{
label: "Rejected",
value: statistics.rejectedBusinesses,
icon: XCircle,
color: "bg-red-50 text-red-700",
},
];

const performanceCards = [
{
label: "Customer reviews",
value: statistics.totalReviews.toLocaleString(),
icon: MessageSquare,
color: "bg-purple-50 text-purple-700",
href: "/dashboard/reviews",
description: "Read and respond to customer feedback",
},
{
label: "Average rating",
value:
statistics.averageRating > 0
? `${statistics.averageRating.toFixed(1)} / 5`
: "Not rated",
icon: Star,
color: "bg-amber-50 text-amber-700",
href: "/dashboard/reviews",
description: "Your businesses' customer ratings",
},
{
label: "Unread notifications",
value: statistics.unreadNotifications.toLocaleString(),
icon: Bell,
color: "bg-blue-50 text-blue-700",
href: "/dashboard/notifications",
description: "Updates that need your attention",
},
];

return ( <div className="space-y-8"> <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 p-6 text-white shadow-sm sm:p-8"> <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center"> <div> <p className="text-sm font-medium text-emerald-100">
YOUR BUSINESS DASHBOARD </p>

```
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Welcome to HabeshaSpot!
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
          Manage your business listings, monitor customer feedback, and
          help customers discover your business.
        </p>
      </div>

      <Link
        href="/business"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
      >
        <Plus className="h-5 w-5" />
        Add a business
      </Link>
    </div>
  </section>

  {error && (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

        <div>
          <p className="font-semibold">Unable to load dashboard data</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void loadDashboard()}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium hover:bg-red-100"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )}

  <section>
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Business overview
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Track your business listing statuses.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void loadDashboard()}
        disabled={loading}
        aria-label="Refresh dashboard statistics"
        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
      >
        <RefreshCw
          className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
        />
      </button>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statisticCards.map((statistic) => {
        const Icon = statistic.icon;

        return (
          <div
            key={statistic.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {statistic.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? "—" : statistic.value}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${statistic.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>

  <section>
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">
        Customer performance
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        See how customers are engaging with your businesses.
      </p>
    </div>

    {statisticsError && (
      <div
        role="status"
        className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">
            Some statistics could not be loaded
          </p>
          <p className="mt-1">{statisticsError}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      </div>
    )}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {performanceCards.map((card) => {
        const Icon = card.icon;

        return (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {card.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? "—" : card.value}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              {card.description}
            </p>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              View details
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        );
      })}
    </div>
  </section>

  <section>
    <h2 className="mb-4 text-lg font-bold text-gray-900">Quick actions</h2>

    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        href="/business"
        className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Plus className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">Add a business</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a new business listing.
          </p>
        </div>

        <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
      </Link>

      <Link
        href="/dashboard/businesses"
        className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Store className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">
            Manage businesses
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your listings.
          </p>
        </div>

        <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
      </Link>
    </div>
  </section>

  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Your recent businesses
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Check the status of your latest listings.
        </p>
      </div>

      <Link
        href="/dashboard/businesses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        View all
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>

    {loading ? (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    ) : businesses.length === 0 ? (
      <div className="px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Building2 className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-base font-semibold text-gray-900">
          No businesses yet
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Add your first business to help people discover your products
          and services on HabeshaSpot.
        </p>

        <Link
          href="/business"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Add your first business
        </Link>
      </div>
    ) : (
      <div className="divide-y divide-gray-100">
        {businesses.slice(0, 5).map((business) => {
          const status = getStatus(business.status);
          const StatusIcon = status.icon;

          return (
            <div
              key={business.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900">
                    {business.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Created {formatDate(business.created_at)}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </section>

  <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
    <h2 className="font-semibold text-blue-900">
      How business approval works
    </h2>

    <p className="mt-2 text-sm leading-6 text-blue-800">
      After you submit a business, our team reviews the listing. Approved
      businesses can appear publicly on HabeshaSpot. Check your
      notifications for updates about your submissions.
    </p>

    <Link
      href="/dashboard/notifications"
      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline"
    >
      View notifications
      <ArrowRight className="h-4 w-4" />
    </Link>
  </section>
</div>
);
}