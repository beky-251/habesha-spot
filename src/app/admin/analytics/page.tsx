import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MetricCardProps = {
  title: string;
  value: number;
  description: string;
  color: string;
};

function MetricCard({
  title,
  value,
  description,
  color,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}
        >
          Live
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Verify the current user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verify administrator permissions.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    redirect("/");
  }

  // Count businesses by status.
  const [
    allBusinesses,
    pendingBusinesses,
    approvedBusinesses,
    rejectedBusinesses,
    allReviews,
    pendingReviews,
    approvedReviews,
    rejectedReviews,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),

    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
  ]);

  const results = [
    allBusinesses,
    pendingBusinesses,
    approvedBusinesses,
    rejectedBusinesses,
    allReviews,
    pendingReviews,
    approvedReviews,
    rejectedReviews,
  ];

  const hasErrors = results.some((result) => result.error);

  if (hasErrors) {
    console.error(
      "Admin analytics query errors:",
      results
        .filter((result) => result.error)
        .map((result) => result.error?.message)
    );
  }

  const count = (value: number | null | undefined) => value ?? 0;

  const businessMetrics = [
    {
      title: "Total Businesses",
      value: count(allBusinesses.count),
      description: "All business listings in the database.",
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Pending Businesses",
      value: count(pendingBusinesses.count),
      description: "Listings waiting for administrator review.",
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "Approved Businesses",
      value: count(approvedBusinesses.count),
      description: "Listings approved by an administrator.",
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Rejected Businesses",
      value: count(rejectedBusinesses.count),
      description: "Listings that were not approved.",
      color: "bg-red-100 text-red-700",
    },
  ];

  const reviewMetrics = [
    {
      title: "Total Reviews",
      value: count(allReviews.count),
      description: "All customer reviews in the database.",
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Pending Reviews",
      value: count(pendingReviews.count),
      description: "Customer reviews awaiting moderation.",
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "Approved Reviews",
      value: count(approvedReviews.count),
      description: "Customer reviews approved for display.",
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Rejected Reviews",
      value: count(rejectedReviews.count),
      description: "Customer reviews that were rejected.",
      color: "bg-red-100 text-red-700",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              HabeshaSpot Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Analytics Dashboard
            </h1>

            <p className="mt-2 text-gray-600">
              Monitor business listings and customer review activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Back to Admin
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              View Website
            </Link>
          </div>
        </div>

        {hasErrors && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            Some analytics could not be loaded. Check the server terminal
            and your Supabase table permissions. Displayed counts may be
            incomplete.
          </div>
        )}

        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Business Listings
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Overview of business submissions and approval activity.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {businessMetrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Customer Reviews
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Overview of customer feedback and moderation.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {reviewMetrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Continue managing your directory.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Manage Businesses
            </Link>

            <Link
              href="/admin/reviews"
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Manage Reviews
            </Link>
          </div>
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          HabeshaSpot Admin · Discover local, love local.
        </footer>
      </div>
    </main>
  );
}