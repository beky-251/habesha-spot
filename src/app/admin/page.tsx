"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type BusinessStatus = "pending" | "approved" | "rejected" | string;

type Business = {
  id: string;
  name: string;
  slug: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status: BusinessStatus;
  created_at: string;
  owner_user_id?: string | null;
  category_id?: string | null;
  city_id?: string | null;
  categories?: { name: string } | null;
  cities?: { name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

type City = {
  id: string;
  name: string;
};

type FilterStatus = "all" | "pending" | "approved" | "rejected";

type ApiError = {
  error?: string;
  message?: string;
};

function getErrorMessage(
  data: ApiError | null,
  fallback: string
): string {
  return data?.error || data?.message || fallback;
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

function getStatusClasses(status: BusinessStatus): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 ring-green-600/20";
    case "rejected":
      return "bg-red-100 text-red-800 ring-red-600/20";
    case "pending":
      return "bg-amber-100 text-amber-800 ring-amber-600/20";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-500/20";
  }
}

function StatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingBusinessId, setUpdatingBusinessId] = useState<
    string | null
  >(null);

  const [isRefreshing, startRefreshTransition] = useTransition();

  const loadBusinesses = useCallback(
    async (signal?: AbortSignal) => {
      setPageError("");

      try {
        const response = await fetch("/api/admin/businesses", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal,
        });

        const data = (await response.json().catch(() => null)) as
          | {
              businesses?: Business[];
              error?: string;
            }
          | null;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          router.replace("/");
          return;
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to load businesses.")
          );
        }

        setBusinesses(
          Array.isArray(data?.businesses) ? data.businesses : []
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Unable to load admin businesses:", error);

        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to load businesses."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [router]
  );

  const loadReferenceData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [categoryResponse, cityResponse] = await Promise.all([
          fetch("/api/categories", {
            cache: "no-store",
            signal,
          }),
          fetch("/api/cities", {
            cache: "no-store",
            signal,
          }),
        ]);

        if (categoryResponse.ok) {
          const data = (await categoryResponse.json()) as {
            categories?: Category[];
          };

          if (!signal?.aborted) {
            setCategories(
              Array.isArray(data.categories) ? data.categories : []
            );
          }
        }

        if (cityResponse.ok) {
          const data = (await cityResponse.json()) as {
            cities?: City[];
          };

          if (!signal?.aborted) {
            setCities(Array.isArray(data.cities) ? data.cities : []);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Unable to load category and city data:", error);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    // Schedule the initial requests after the effect has started.
    // This avoids synchronous state updates in the effect body.
    const timer = window.setTimeout(() => {
      void loadBusinesses(controller.signal);
      void loadReferenceData(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadBusinesses, loadReferenceData]);

  const refreshBusinesses = useCallback(() => {
    startRefreshTransition(() => {
      void loadBusinesses();
    });
  }, [loadBusinesses]);

  const updateBusinessStatus = useCallback(
    async (business: Business, status: "approved" | "rejected") => {
      if (updatingBusinessId) {
        return;
      }

      if (
        status === "rejected" &&
        !window.confirm(
          `Are you sure you want to reject "${business.name}"?`
        )
      ) {
        return;
      }

      setUpdatingBusinessId(business.id);
      setActionError("");
      setSuccessMessage("");

      try {
        const response = await fetch(
          `/api/admin/businesses/${encodeURIComponent(business.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ status }),
          }
        );

        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              message?: string;
              business?: Business;
              notificationSent?: boolean;
            }
          | null;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          router.replace("/");
          return;
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to update business status.")
          );
        }

        if (data?.business) {
          setBusinesses((current) =>
            current.map((item) =>
              item.id === business.id
                ? { ...item, ...data.business }
                : item
            )
          );
        } else {
          setBusinesses((current) =>
            current.map((item) =>
              item.id === business.id ? { ...item, status } : item
            )
          );
        }

        setSuccessMessage(
          data?.message ||
            (status === "approved"
              ? "Business approved successfully."
              : "Business rejected successfully.")
        );

        if (data?.notificationSent === false) {
          setActionError(
            "The business status was updated, but its owner notification could not be created. Check the server logs."
          );
        }
      } catch (error) {
        console.error("Unable to update business:", error);

        setActionError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        );
      } finally {
        setUpdatingBusinessId(null);
      }
    },
    [router, updatingBusinessId]
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const cityNames = useMemo(
    () => new Map(cities.map((city) => [city.id, city.name])),
    [cities]
  );

  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesStatus =
        statusFilter === "all" || business.status === statusFilter;

      const categoryName =
        business.categories?.name ||
        (business.category_id
          ? categoryNames.get(business.category_id)
          : "") ||
        "";

      const cityName =
        business.cities?.name ||
        (business.city_id ? cityNames.get(business.city_id) : "") ||
        "";

      const matchesSearch =
        !query ||
        [
          business.name,
          business.description,
          business.address,
          business.email,
          business.phone,
          categoryName,
          cityName,
        ].some((value) => value?.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [
    businesses,
    searchQuery,
    statusFilter,
    categoryNames,
    cityNames,
  ]);

  const statistics = useMemo(
    () => ({
      total: businesses.length,
      pending: businesses.filter((item) => item.status === "pending")
        .length,
      approved: businesses.filter((item) => item.status === "approved")
        .length,
      rejected: businesses.filter((item) => item.status === "rejected")
        .length,
    }),
    [businesses]
  );

  const filterButtons: {
    label: string;
    value: FilterStatus;
    count: number;
  }[] = [
    { label: "All businesses", value: "all", count: statistics.total },
    {
      label: "Pending",
      value: "pending",
      count: statistics.pending,
    },
    {
      label: "Approved",
      value: "approved",
      count: statistics.approved,
    },
    {
      label: "Rejected",
      value: "rejected",
      count: statistics.rejected,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>

            <span>
              <span className="block text-lg font-bold">HabeshaSpot</span>
              <span className="block text-sm text-gray-500">
                Administrator dashboard
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshBusinesses}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Exit admin</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Business approvals
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Review submitted businesses, approve eligible listings, and
            reject submissions that do not meet your requirements.
          </p>
        </div>

        {pageError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load the admin dashboard
              </p>
              <p className="mt-1 text-sm">{pageError}</p>

              <button
                type="button"
                onClick={refreshBusinesses}
                className="mt-3 text-sm font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{actionError}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <section
          aria-label="Business statistics"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Total businesses"
            value={statistics.total}
            icon={<Building2 className="h-5 w-5" />}
            description="All submissions"
          />

          <StatCard
            label="Awaiting review"
            value={statistics.pending}
            icon={<Clock className="h-5 w-5" />}
            description="Need your attention"
          />

          <StatCard
            label="Approved"
            value={statistics.approved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            description="Approved listings"
          />

          <StatCard
            label="Rejected"
            value={statistics.rejected}
            icon={<XCircle className="h-5 w-5" />}
            description="Rejected submissions"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Submitted businesses</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {filteredBusinesses.length} result
                  {filteredBusinesses.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, category, city..."
                  aria-label="Search businesses"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {filterButtons.map((filter) => {
                const active = statusFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-emerald-700 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}

                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-white text-gray-600"
                      }`}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
              <p className="mt-4 font-medium">Loading businesses...</p>
              <p className="mt-1 text-sm text-gray-500">
                Please wait while we retrieve the latest submissions.
              </p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Building2 className="h-7 w-7" />
              </span>

              <h3 className="mt-4 text-lg font-semibold">
                No businesses found
              </h3>

              <p className="mt-2 max-w-md text-sm text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? "Try a different search term or status filter."
                  : "There are no business submissions to display yet."}
              </p>

              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBusinesses.map((business) => {
                const categoryName =
                  business.categories?.name ||
                  (business.category_id
                    ? categoryNames.get(business.category_id)
                    : "") ||
                  "Uncategorized";

                const cityName =
                  business.cities?.name ||
                  (business.city_id
                    ? cityNames.get(business.city_id)
                    : "") ||
                  "";

                const updating = updatingBusinessId === business.id;

                return (
                  <article
                    key={business.id}
                    className="p-5 transition hover:bg-gray-50 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="break-words text-lg font-bold">
                            {business.name}
                          </h3>

                          <StatusBadge status={business.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                          <span>{categoryName}</span>

                          {cityName && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {cityName}
                            </span>
                          )}

                          <span>Submitted {formatDate(business.created_at)}</span>
                        </div>

                        {business.address && (
                          <p className="mt-3 text-sm text-gray-600">
                            <span className="font-medium">Address:</span>{" "}
                            {business.address}
                          </p>
                        )}

                        {business.description && (
                          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-gray-600">
                            {business.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                          {business.phone && (
                            <span>
                              <span className="font-medium">Phone:</span>{" "}
                              {business.phone}
                            </span>
                          )}

                          {business.email && (
                            <span>
                              <span className="font-medium">Email:</span>{" "}
                              {business.email}
                            </span>
                          )}
                        </div>

                        {business.slug && business.status === "approved" && (
                          <Link
                            href={`/business/${encodeURIComponent(
                              business.slug
                            )}`}
                            className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            View public listing
                          </Link>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                        {business.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateBusinessStatus(
                                business,
                                "approved"
                              )
                            }
                            disabled={updating}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve
                          </button>
                        )}

                        {business.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateBusinessStatus(
                                business,
                                "rejected"
                              )
                            }
                            disabled={updating}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Showing {filteredBusinesses.length} of {businesses.length}{" "}
              businesses
            </span>
            <span>HabeshaSpot administration</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-500">{description}</p>
    </div>
  );
}