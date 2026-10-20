"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";

type BusinessStatus = "pending" | "approved" | "rejected";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BusinessStatus;
  created_at: string;
};

type BusinessesResponse = {
  businesses?: Business[];
  error?: string;
};

const statusConfig: Record<
  BusinessStatus,
  {
    label: string;
    description: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  approved: {
    label: "Approved",
    description: "Your listing is approved.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending review",
    description: "Your listing is awaiting review.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock3,
  },
  rejected: {
    label: "Rejected",
    description: "Your listing was not approved.",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
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

function getBusinessStatus(status: string): BusinessStatus {
  if (status === "approved" || status === "rejected") {
    return status;
  }

  return "pending";
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

      const result = (await response.json()) as BusinessesResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load your business listings.",
        );
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
          : "An unexpected error occurred while loading your listings.",
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
      void loadBusinesses(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadBusinesses]);

  const totalCount = businesses.length;

  const approvedCount = businesses.filter(
    (business) => business.status === "approved",
  ).length;

  const pendingCount = businesses.filter(
    (business) => business.status === "pending",
  ).length;

  const rejectedCount = businesses.filter(
    (business) => business.status === "rejected",
  ).length;

  function retryLoading() {
    setLoading(true);
    setError("");
    void loadBusinesses();
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0B132B] p-6 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#FFB300]/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#FF6B00]/10" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              <Building2 className="h-4 w-4 text-[#FFB300]" />
              BUSINESS WORKSPACE
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Businesses
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Manage your business listings, keep information up to date, and
              help customers discover your spot on HabeshaSpot.
            </p>
          </div>

          <Link
            href="/business"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFB300] px-5 py-3.5 text-sm font-bold text-[#0B132B] shadow-sm transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-[#FFB300] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
          >
            <Plus className="h-5 w-5" />
            Add a Business
          </Link>
        </div>
      </section>

      {/* Business statistics */}
      <section aria-label="Business statistics">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-[#0B132B]">
            Listing overview
          </h2>

          <button
            type="button"
            onClick={retryLoading}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#64748B] transition hover:bg-white hover:text-[#0B132B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Total listings"
            value={loading ? "—" : totalCount}
            icon={Store}
            iconClass="bg-slate-100 text-[#0B132B]"
          />

          <StatCard
            label="Approved"
            value={loading ? "—" : approvedCount}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Pending review"
            value={loading ? "—" : pendingCount}
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Rejected"
            value={loading ? "—" : rejectedCount}
            icon={XCircle}
            iconClass="bg-red-50 text-red-700"
          />
        </div>
      </section>

      {/* Listings */}
      <section aria-label="Your business listings">
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#0B132B]">
            Your listings
          </h2>

          <p className="mt-1 text-sm text-[#64748B]">
            Manage each business from its own control panel.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#DCE3ED] bg-white px-6 py-16 text-center shadow-sm">
            <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-[#FFB300]" />

            <p className="mt-4 font-semibold text-[#0B132B]">
              Loading your listings
            </p>

            <p className="mt-1 text-sm text-[#64748B]">
              Please wait while we retrieve your businesses.
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <AlertCircle className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <h3 className="font-bold text-[#0B132B]">
                  We couldn&apos;t load your businesses
                </h3>

                <p className="mt-2 break-words text-sm leading-6 text-[#64748B]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={retryLoading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#101D35]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-14 text-center shadow-sm sm:px-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-[#0B132B]">
              <Building2 className="h-8 w-8" />
            </span>

            <h3 className="mt-5 text-xl font-extrabold text-[#0B132B]">
              Your business journey starts here
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
              You haven&apos;t added a business yet. Create your first listing
              to start building your presence on HabeshaSpot.
            </p>

            <Link
              href="/business"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFB300] px-5 py-3 text-sm font-bold text-[#0B132B] transition hover:bg-amber-300"
            >
              <Plus className="h-5 w-5" />
              Add your first business
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map((business) => {
              const status = getBusinessStatus(business.status);
              const config = statusConfig[status];
              const StatusIcon = config.icon;

              return (
                <article
                  key={business.id}
                  className="overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B132B] text-[#FFB300]">
                        <Store className="h-7 w-7" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words text-xl font-extrabold text-[#0B132B]">
                              {business.name}
                            </h3>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Added {formatDate(business.created_at)}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {config.label}
                          </span>
                        </div>

                        {business.description ? (
                          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#64748B]">
                            {business.description}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm italic text-[#94A3B8]">
                            No business description has been added yet.
                          </p>
                        )}

                        <div
                          className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${
                            status === "approved"
                              ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
                              : status === "rejected"
                                ? "border-red-100 bg-red-50 text-red-800"
                                : "border-amber-100 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {config.description}
                          {status === "pending" &&
                            " It will become publicly available after approval."}
                          {status === "rejected" &&
                            " Contact the administrator if you need more information."}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[#EEF2F7] pt-5">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                        Manage listing
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <ActionLink
                          href={`/dashboard/businesses/${encodeURIComponent(business.id)}/edit`}
                          icon={Building2}
                          label="Edit details"
                          primary
                        />

                        <ActionLink
                          href={`/dashboard/businesses/${encodeURIComponent(business.id)}/photos`}
                          icon={ImageIcon}
                          label="Manage photos"
                        />

                        <ActionLink
                          href={`/dashboard/businesses/${encodeURIComponent(business.id)}/hours`}
                          icon={Clock3}
                          label="Opening hours"
                        />

                        {status === "approved" && business.slug && (
                          <ActionLink
                            href={`/business/${encodeURIComponent(business.slug)}`}
                            icon={ExternalLink}
                            label="View public listing"
                            external
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Tips */}
      <section className="rounded-2xl border border-[#DCE3ED] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#0B132B]">
            <MapPin className="h-5 w-5" />
          </span>

          <div>
            <h2 className="font-extrabold text-[#0B132B]">
              Make your listing stand out
            </h2>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#64748B]">
              <li>
                • Keep your business description accurate and helpful.
              </li>
              <li>
                • Upload clear, relevant photos and choose a cover image.
              </li>
              <li>
                • Keep your opening hours up to date.
              </li>
              <li>
                • New listings may require administrator approval before
                appearing publicly.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE3ED] bg-white px-4 py-3">
        <p className="text-xs leading-5 text-[#64748B]">
          Need to add another location or business?
        </p>

        <Link
          href="/business"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#0B132B] hover:text-[#B77900]"
        >
          Create listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
  icon: typeof Store;
  iconClass: string;
};

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#DCE3ED] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-[#64748B] sm:text-sm">
          {label}
        </p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B132B]">
        {value}
      </p>
    </div>
  );
}

type ActionLinkProps = {
  href: string;
  icon: typeof Building2;
  label: string;
  primary?: boolean;
  external?: boolean;
};

function ActionLink({
  href,
  icon: Icon,
  label,
  primary = false,
  external = false,
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-[#101D35]"
          : "inline-flex items-center gap-2 rounded-xl border border-[#DCE3ED] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] transition hover:border-[#FFB300] hover:bg-amber-50 hover:text-[#0B132B]"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
      {external && <ExternalLink className="h-3.5 w-3.5" />}
    </Link>
  );
}