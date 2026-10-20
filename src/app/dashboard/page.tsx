"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
AlertCircle,
ArrowRight,
Bell,
Building2,
CheckCircle2,
Clock3,
Eye,
LayoutDashboard,
MessageSquare,
Plus,
RefreshCw,
Star,
Store,
XCircle,
} from "lucide-react";

type Business = {
id: string;
name: string;
slug?: string;
status: string;
created_at?: string;
description?: string | null;
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

type DashboardResponse = {
businesses?: Business[];
error?: string;
};

type StatisticsResponse = {
statistics?: Partial<DashboardStatistics>;
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

function formatDate(value?: string): string {
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
className: "border-emerald-200 bg-emerald-50 text-emerald-700",
icon: CheckCircle2,
};


case "rejected":
  return {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  };

default:
  return {
    label: "Pending review",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock3,
  };

}
}

function normalizeStatistics(
statistics?: Partial<DashboardStatistics>,
): DashboardStatistics {
return {
totalBusinesses: Number(statistics?.totalBusinesses ?? 0),
approvedBusinesses: Number(statistics?.approvedBusinesses ?? 0),
pendingBusinesses: Number(statistics?.pendingBusinesses ?? 0),
rejectedBusinesses: Number(statistics?.rejectedBusinesses ?? 0),
totalReviews: Number(statistics?.totalReviews ?? 0),
averageRating: Number(statistics?.averageRating ?? 0),
unreadNotifications: Number(
statistics?.unreadNotifications ?? 0,
),
};
}

export default function DashboardPage() {
const router = useRouter();
const supabase = useMemo(() => createClient(), []);

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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    router.replace("/login");
    return;
  }

  const [businessResponse, statisticsResponse, notificationsResult] =
    await Promise.all([
      fetch("/api/businesses", {
        cache: "no-store",
      }),
      fetch("/api/dashboard/stats", {
        cache: "no-store",
      }),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
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
      businessData.error ||
        "Unable to load your business listings.",
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
      setStatistics(
        normalizeStatistics(statisticsData.statistics),
      );
    } else {
      setStatisticsError(
        statisticsData.error ||
          "Dashboard statistics are unavailable.",
      );
    }
  } else {
    const statisticsData =
      (await statisticsResponse.json().catch(() => ({}))) as {
        error?: string;
      };

    setStatisticsError(
      statisticsData.error ||
        "Unable to load customer statistics.",
    );
  }

  const notificationsErrorMessage = notificationsResult.error?.message;

  if (notificationsErrorMessage) {
    console.error(
      "Unable to load unread notification count:",
      notificationsErrorMessage,
      notificationsResult.error?.code,
    );
    setStatisticsError((current) =>
      current
        ? `${current} Unread notifications: ${notificationsErrorMessage}`
        : `Unread notifications could not be loaded: ${notificationsErrorMessage}`,
    );
  } else {
    setStatistics((current) => ({
      ...current,
      unreadNotifications: notificationsResult.count ?? 0,
    }));
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

}, [router, supabase]);

useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadDashboard();
  }, 0);

  let cancelled = false;
  let notificationChannel: ReturnType<typeof supabase.channel> | undefined;

  void supabase.auth.getUser().then((
    { data, error: authError }: Awaited<ReturnType<typeof supabase.auth.getUser>>,
  ) => {
    if (cancelled || authError || !data.user) {
      return;
    }

    notificationChannel = supabase
      .channel(`dashboard-notifications-${data.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${data.user.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .subscribe();
  });

  return () => {
    cancelled = true;
    window.clearTimeout(timer);

    if (notificationChannel) {
      void supabase.removeChannel(notificationChannel);
    }
  };
}, [loadDashboard, supabase]);

const overviewCards = [
{
label: "Total businesses",
value: statistics.totalBusinesses,
icon: Building2,
iconStyle: "bg-blue-50 text-blue-700",
description: "All your submitted listings",
},
{
label: "Approved",
value: statistics.approvedBusinesses,
icon: CheckCircle2,
iconStyle: "bg-emerald-50 text-emerald-700",
description: "Approved for public discovery",
},
{
label: "Pending review",
value: statistics.pendingBusinesses,
icon: Clock3,
iconStyle: "bg-amber-50 text-amber-800",
description: "Awaiting a decision",
},
{
label: "Rejected",
value: statistics.rejectedBusinesses,
icon: XCircle,
iconStyle: "bg-red-50 text-red-700",
description: "Listings needing attention",
},
];

const performanceCards = [
{
label: "Customer reviews",
value: statistics.totalReviews.toLocaleString(),
icon: MessageSquare,
iconStyle: "bg-blue-50 text-blue-700",
description: "Feedback on your businesses",
href: "/dashboard/reviews",
},
{
label: "Average rating",
value:
statistics.averageRating > 0
? `${statistics.averageRating.toFixed(1)} / 5`
: "Not rated",
icon: Star,
iconStyle: "bg-amber-50 text-amber-800",
description: "Rating across your businesses",
href: "/dashboard/reviews",
},
{
label: "Unread notifications",
value: statistics.unreadNotifications.toLocaleString(),
icon: Bell,
iconStyle: "bg-purple-50 text-purple-700",
description: "Updates that need your attention",
href: "/dashboard/notifications",
},
];

return ( <div className="space-y-8">
{/* Welcome banner */} <section className="relative overflow-hidden rounded-3xl bg-[#0B132B] p-6 text-white shadow-sm sm:p-8"> <div
       aria-hidden="true"
       className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#FFB300]/15 blur-3xl"
     />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-[#FF6B00]/10 blur-3xl"
    />

    <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[#FFCA45]">
          <LayoutDashboard size={14} aria-hidden="true" />
          Business dashboard
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Welcome to HabeshaSpot
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
          Manage your business listings, keep track of customer
          feedback, and help people discover your business across
          Ethiopia.
        </p>
      </div>

      <Link
        href="/business"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFB300] px-5 py-3 font-bold text-[#0B132B] transition hover:bg-[#FFD166] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Plus size={19} aria-hidden="true" />
        Add a business
      </Link>
    </div>
  </section>

  {/* Main error */}
  {error && (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={21}
          aria-hidden="true"
          className="mt-0.5 shrink-0"
        />

        <div>
          <p className="font-bold">
            Unable to load dashboard data
          </p>
          <p className="mt-1 text-sm leading-6">{error}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void loadDashboard()}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-red-100 disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={loading ? "animate-spin" : ""}
          aria-hidden="true"
        />
        Try again
      </button>
    </div>
  )}

  {/* Business overview */}
  <section aria-labelledby="business-overview-heading">
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#64748B]">
          Overview
        </p>

        <h2
          id="business-overview-heading"
          className="mt-2 text-xl font-extrabold tracking-tight text-[#0B132B] sm:text-2xl"
        >
          Business status
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          Track the progress of your submitted listings.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void loadDashboard()}
        disabled={loading}
        aria-label="Refresh dashboard"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE3ED] bg-white text-[#64748B] transition hover:border-[#FFB300] hover:text-[#0B132B] disabled:opacity-50"
      >
        <RefreshCw
          size={17}
          className={loading ? "animate-spin" : ""}
          aria-hidden="true"
        />
      </button>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {overviewCards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            className="rounded-2xl border border-[#DCE3ED] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#64748B]">
                  {card.label}
                </p>

                <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B132B]">
                  {loading ? "—" : card.value}
                </p>
              </div>

              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.iconStyle}`}
              >
                <Icon size={23} aria-hidden="true" />
              </span>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#64748B]">
              {card.description}
            </p>
          </article>
        );
      })}
    </div>
  </section>

  {/* Customer performance */}
  <section aria-labelledby="performance-heading">
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#64748B]">
        Engagement
      </p>

      <h2
        id="performance-heading"
        className="mt-2 text-xl font-extrabold tracking-tight text-[#0B132B] sm:text-2xl"
      >
        Customer performance
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#64748B]">
        Review customer feedback and stay informed about updates.
      </p>
    </div>

    {statisticsError && (
      <div
        role="status"
        className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <AlertCircle
          size={19}
          aria-hidden="true"
          className="mt-0.5 shrink-0"
        />

        <div>
          <p className="font-bold">
            Some statistics could not be loaded
          </p>

          <p className="mt-1 leading-6">{statisticsError}</p>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-2 font-bold underline underline-offset-4"
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
            className="group rounded-2xl border border-[#DCE3ED] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FFB300] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconStyle}`}
              >
                <Icon
                  size={22}
                  aria-hidden="true"
                  className={
                    card.label === "Average rating"
                      ? "fill-[#FFB300] text-[#FFB300]"
                      : ""
                  }
                />
              </span>

              <ArrowRight
                size={18}
                aria-hidden="true"
                className="text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#FF6B00]"
              />
            </div>

            <p className="mt-5 text-sm font-semibold text-[#64748B]">
              {card.label}
            </p>

            <p className="mt-1 text-2xl font-extrabold text-[#0B132B]">
              {loading ? "—" : card.value}
            </p>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              {card.description}
            </p>
          </Link>
        );
      })}
    </div>
  </section>

  {/* Quick actions */}
  <section aria-labelledby="quick-actions-heading">
    <div className="mb-5">
      <h2
        id="quick-actions-heading"
        className="text-xl font-extrabold tracking-tight text-[#0B132B]"
      >
        Quick actions
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#64748B]">
        Shortcuts to the tools you use most.
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* Add a business */}
      <Link
        href="/business"
        className="group flex items-center gap-4 rounded-2xl border border-[#DCE3ED] bg-white p-5 transition hover:border-[#FFB300] hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4D6] text-[#0B132B]">
          <Plus size={23} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[#0B132B]">
            Add a business
          </span>

          <span className="mt-1 block text-sm leading-6 text-[#64748B]">
            Submit a new listing for review.
          </span>
        </span>

        <ArrowRight
          size={19}
          aria-hidden="true"
          className="shrink-0 text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#FF6B00]"
        />
      </Link>

      {/* Manage businesses */}
      <Link
        href="/dashboard/businesses"
        className="group flex items-center gap-4 rounded-2xl border border-[#DCE3ED] bg-white p-5 transition hover:border-[#FFB300] hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Store size={23} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[#0B132B]">
            Manage businesses
          </span>

          <span className="mt-1 block text-sm leading-6 text-[#64748B]">
            Edit your listings, photos, and opening hours.
          </span>
        </span>

        <ArrowRight
          size={19}
          aria-hidden="true"
          className="shrink-0 text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#FF6B00]"
        />
      </Link>

      {/* Customer reviews — new shortcut */}
      <Link
        href="/dashboard/reviews"
        className="group flex items-center gap-4 rounded-2xl border border-[#DCE3ED] bg-white p-5 transition hover:border-[#FFB300] hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <MessageSquare size={23} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[#0B132B]">
            Customer reviews
          </span>

          <span className="mt-1 block text-sm leading-6 text-[#64748B]">
            Read feedback and write, edit, or delete your replies.
          </span>
        </span>

        <ArrowRight
          size={19}
          aria-hidden="true"
          className="shrink-0 text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#FF6B00]"
        />
      </Link>
    </div>
  </section>

  {/* Recent businesses */}
  <section className="overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-[#DCE3ED] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#64748B]">
          Your listings
        </p>

        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#0B132B]">
          Recent businesses
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          Check the status of your latest submissions.
        </p>
      </div>

      <Link
        href="/dashboard/businesses"
        className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#0B132B] transition hover:text-[#FF6B00] sm:self-center"
      >
        View all
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>

    {loading ? (
      <div className="space-y-5 p-6" aria-label="Loading businesses">
        {[1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse">
            <div className="h-4 w-1/3 rounded bg-[#E2E8F0]" />
            <div className="mt-3 h-3 w-1/2 rounded bg-[#F1F5F9]" />
          </div>
        ))}
      </div>
    ) : businesses.length === 0 ? (
      <div className="px-6 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4D6] text-[#0B132B]">
          <Building2 size={27} aria-hidden="true" />
        </span>

        <h3 className="mt-4 text-lg font-extrabold text-[#0B132B]">
          No businesses yet
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
          Add your first business listing to help people discover your
          products and services on HabeshaSpot.
        </p>

        <Link
          href="/business"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#101D35]"
        >
          <Plus size={17} aria-hidden="true" />
          Add your first business
        </Link>
      </div>
    ) : (
      <div className="divide-y divide-[#EAF0F7]">
        {businesses.slice(0, 5).map((business) => {
          const status = getStatus(business.status);
          const StatusIcon = status.icon;

          const canViewPublicListing =
            business.status === "approved" && Boolean(business.slug);

          return (
            <div
              key={business.id}
              className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
                  <Building2 size={21} aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <h3 className="truncate font-bold text-[#0B132B]">
                    {business.name}
                  </h3>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Submitted {formatDate(business.created_at)}
                  </p>

                  {business.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">
                      {business.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
                >
                  <StatusIcon size={14} aria-hidden="true" />
                  {status.label}
                </span>

                {canViewPublicListing && (
                  <Link
                    href={`/business/${encodeURIComponent(business.slug!)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE3ED] px-3 py-2 text-sm font-bold text-[#0B132B] transition hover:border-[#FFB300] hover:bg-[#FFF9E8]"
                  >
                    <Eye size={15} aria-hidden="true" />
                    View listing
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>

  {/* Approval explanation */}
  <section className="rounded-2xl border border-[#DCE3ED] bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#0B132B]">
        <Clock3 size={21} aria-hidden="true" />
      </span>

      <div>
        <h2 className="font-extrabold text-[#0B132B]">
          How business approval works
        </h2>

        <p className="mt-2 text-sm leading-7 text-[#64748B]">
          Submitted businesses are reviewed before they appear publicly.
          Approved businesses can be discovered by customers. Check your
          notifications for updates about your submissions.
        </p>

        <Link
          href="/dashboard/notifications"
          className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0B132B] transition hover:text-[#FF6B00]"
        >
          View notifications
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
</div>

);
}
