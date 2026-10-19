import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Search,
  Star,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Find Local Businesses | HabeshaSpot",
  description:
    "Discover restaurants, coffee houses, hotels, shops, and local businesses across Ethiopia.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type SearchParams = Promise<{
  q?: string;
  city?: string;
  category?: string;
  sort?: string;
  page?: string;
}>;

type Category = {
  id: string;
  name: string;
  slug: string;
};

type City = {
  id: string;
  name: string;
  slug: string;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  average_rating: number;
  review_count: number;
  created_at: string;
  categories: {
    name: string;
    slug: string;
  } | null;
  cities: {
    name: string;
    slug: string;
  } | null;
  photo_url: string | null;
};

type BusinessPhoto = {
  business_id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
};

const ALLOWED_SORTS = [
  "recommended",
  "rating",
  "newest",
  "name",
] as const;

type SortOption = (typeof ALLOWED_SORTS)[number];

function getSingleRelation<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function isValidSort(value: string): value is SortOption {
  return ALLOWED_SORTS.some((option) => option === value);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function getSafePage(value?: string): number {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 1_000_000);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 100);
  const selectedCity = (params.city ?? "").slice(0, 100);
  const selectedCategory = (params.category ?? "").slice(
    0,
    100
  );

  const sort: SortOption =
    params.sort && isValidSort(params.sort)
      ? params.sort
      : "recommended";

  const requestedPage = getSafePage(params.page);

  const supabase = await createClient();

  let categories: Category[] = [];
  let cities: City[] = [];
  let businesses: Business[] = [];

  let totalCount = 0;
  let totalPages = 0;
  let currentPage = requestedPage;

  let errorMessage: string | null = null;

  try {
    // Load categories and cities for the search filters.
    const [categoriesResult, citiesResult] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("cities")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name"),
      ]);

    if (categoriesResult.error || citiesResult.error) {
      console.error(
        "Search filters failed:",
        categoriesResult.error?.message,
        citiesResult.error?.message
      );

      throw new Error("Unable to load search filters.");
    }

    categories = categoriesResult.data ?? [];
    cities = citiesResult.data ?? [];

    // Build the filtered and sorted business query.
    // Count matching businesses before applying pagination.
    const createBusinessQuery = (pageNumber: number) => {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let businessQuery = supabase
        .from("businesses")
        .select(
          `
            id,
            name,
            slug,
            description,
            address,
            average_rating,
            review_count,
            created_at,
            categories!inner (
              name,
              slug
            ),
            cities!inner (
              name,
              slug
            )
          `,
          { count: "exact" }
        )
        .eq("status", "approved");

      // Search business names.
      if (query) {
        const escapedQuery = escapeLikePattern(query);

        businessQuery = businessQuery.ilike(
          "name",
          `%${escapedQuery}%`
        );
      }

      // Filter by city.
      if (selectedCity) {
        businessQuery = businessQuery.eq(
          "cities.slug",
          selectedCity
        );
      }

      // Filter by category.
      if (selectedCategory) {
        businessQuery = businessQuery.eq(
          "categories.slug",
          selectedCategory
        );
      }

      // Apply sorting.
      if (sort === "rating") {
        businessQuery = businessQuery
          .order("average_rating", {
            ascending: false,
            nullsFirst: false,
          })
          .order("name", {
            ascending: true,
          });
      } else if (sort === "newest") {
        businessQuery = businessQuery
          .order("created_at", {
            ascending: false,
          })
          .order("name", {
            ascending: true,
          });
      } else {
        // Recommended currently uses alphabetical ordering.
        // Name A-Z uses the same ordering.
        businessQuery = businessQuery.order("name", {
          ascending: true,
        });
      }

      // Return only the requested page.
      return businessQuery.range(from, to);
    };

    // Load the requested page and get the exact matching count.
    let businessesResult =
      await createBusinessQuery(requestedPage);

    if (businessesResult.error) {
      console.error(
        "Business search failed:",
        businessesResult.error.message
      );

      throw new Error("Unable to load businesses.");
    }

    totalCount = businessesResult.count ?? 0;
    totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Use page 1 when there are no results.
    // Otherwise, keep the requested page within the valid range.
    currentPage =
      totalPages === 0
        ? 1
        : Math.min(requestedPage, totalPages);

    // If the requested page is beyond the last page,
    // fetch the last available page instead.
    if (
      totalPages > 0 &&
      currentPage !== requestedPage
    ) {
      businessesResult =
        await createBusinessQuery(currentPage);

      if (businessesResult.error) {
        console.error(
          "Business pagination failed:",
          businessesResult.error.message
        );

        throw new Error("Unable to load businesses.");
      }
    }

    const businessRows: Business[] = (
      businessesResult.data ?? []
    ).map((business) => ({
      ...business,
      average_rating: Number(
        business.average_rating ?? 0
      ),
      review_count: Number(
        business.review_count ?? 0
      ),
      categories: getSingleRelation(
        business.categories
      ),
      cities: getSingleRelation(business.cities),
      photo_url: null,
    }));

    // Load photos for the businesses on this page only.
    const businessIds = businessRows.map(
      (business) => business.id
    );

    const photosByBusiness = new Map<
      string,
      BusinessPhoto[]
    >();

    if (businessIds.length > 0) {
      const photosResult = await supabase
        .from("business_photos")
        .select(
          "business_id, storage_path, sort_order, is_cover"
        )
        .in("business_id", businessIds)
        .order("sort_order", {
          ascending: true,
        });

      if (photosResult.error) {
        // Photo failures should not hide business listings.
        console.error(
          "Business photos could not be loaded:",
          photosResult.error.message
        );
      } else {
        const photos =
          (photosResult.data ?? []) as BusinessPhoto[];

        for (const photo of photos) {
          const existing =
            photosByBusiness.get(photo.business_id) ?? [];

          existing.push(photo);

          photosByBusiness.set(
            photo.business_id,
            existing
          );
        }
      }
    }

    // Generate signed URLs from the private Storage bucket.
    businesses = await Promise.all(
      businessRows.map(
        async (business): Promise<Business> => {
          const photos = [
            ...(photosByBusiness.get(business.id) ?? []),
          ].sort((a, b) => {
            if (a.is_cover !== b.is_cover) {
              return a.is_cover ? -1 : 1;
            }

            return a.sort_order - b.sort_order;
          });

          let photoUrl: string | null = null;

          for (const photo of photos) {
            if (!photo.storage_path) {
              continue;
            }

            const { data, error } =
              await supabase.storage
                .from("business-photos")
                .createSignedUrl(
                  photo.storage_path,
                  3600
                );

            if (error || !data?.signedUrl) {
              console.error(
                `Could not generate photo URL for ${business.name}:`,
                error?.message ?? "No signed URL returned"
              );

              // Try the next photo if this one fails.
              continue;
            }

            photoUrl = data.signedUrl;
            break;
          }

          return {
            ...business,
            photo_url: photoUrl,
          };
        }
      )
    );
  } catch (error) {
    console.error("Search page error:", error);

    errorMessage =
      "We couldn't load businesses right now. Please try again.";
  }

  const hasFilters = Boolean(
    query || selectedCity || selectedCategory
  );

  const hasActiveOptions =
    hasFilters || sort !== "recommended";

  const sortLabels: Record<SortOption, string> = {
    recommended: "Recommended",
    rating: "Highest rated",
    newest: "Newest",
    name: "Name: A–Z",
  };

  // Build pagination links while preserving current filters.
  function buildPageHref(pageNumber: number): string {
    const search = new URLSearchParams();

    if (query) {
      search.set("q", query);
    }

    if (selectedCity) {
      search.set("city", selectedCity);
    }

    if (selectedCategory) {
      search.set("category", selectedCategory);
    }

    if (sort !== "recommended") {
      search.set("sort", sort);
    }

    search.set("page", String(pageNumber));

    return `/search?${search.toString()}`;
  }

  // Show the first page, last page, and pages near the current page.
  const visiblePages = Array.from(
    new Set(
      [
        1,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        totalPages,
      ].filter(
        (pageNumber) =>
          pageNumber >= 1 &&
          pageNumber <= totalPages
      )
    )
  ).sort((a, b) => a - b);

  const resultStart =
    totalCount === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const resultEnd = Math.min(
    currentPage * PAGE_SIZE,
    totalCount
  );

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#29231f]">
      {/* Navigation */}
      <header className="border-b border-[#eae2da] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#75452e] text-white">
              <MapPin size={22} />
            </span>

            <span className="text-xl font-extrabold">
              HabeshaSpot
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#75452e] hover:underline"
          >
            <ArrowLeft size={17} />
            Home
          </Link>
        </div>
      </header>

      {/* Search hero */}
      <section className="bg-[#75452e] px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            Discover local, love local
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
            Find your next favorite spot.
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/80">
            Search local businesses and discover places worth
            visiting across Ethiopia.
          </p>

          <form
            action="/search"
            method="GET"
            className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-xl md:grid-cols-[minmax(0,1fr)_200px_200px_auto]"
          >
            {/* Preserve sorting when changing search filters. */}
            {sort !== "recommended" && (
              <input
                type="hidden"
                name="sort"
                value={sort}
              />
            )}

            <label className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 px-3">
              <Search
                size={20}
                className="shrink-0 text-[#75452e]"
              />

              <input
                name="q"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Search businesses..."
                aria-label="Search by business name"
                className="min-w-0 flex-1 py-3 text-sm text-gray-900 outline-none"
              />
            </label>

            <select
              name="category"
              defaultValue={selectedCategory}
              aria-label="Filter by category"
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#75452e]"
            >
              <option value="">All categories</option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.slug}
                >
                  {category.name}
                </option>
              ))}
            </select>

            <select
              name="city"
              defaultValue={selectedCity}
              aria-label="Filter by city"
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#75452e]"
            >
              <option value="">All cities</option>

              {cities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#477454] px-6 py-3 font-semibold text-white transition hover:bg-[#365c40]"
            >
              <Search size={18} />
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Business results */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold">
              {query
                ? `Results for "${query}"`
                : "Explore businesses"}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {errorMessage
                ? "Search is temporarily unavailable."
                : totalCount === 0
                  ? "0 businesses found"
                  : `Showing ${resultStart}–${resultEnd} of ${totalCount} ${
                      totalCount === 1
                        ? "business"
                        : "businesses"
                    }`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sorting */}
            <form
              action="/search"
              method="GET"
              className="flex flex-wrap items-center gap-2"
            >
              {query && (
                <input
                  type="hidden"
                  name="q"
                  value={query}
                />
              )}

              {selectedCity && (
                <input
                  type="hidden"
                  name="city"
                  value={selectedCity}
                />
              )}

              {selectedCategory && (
                <input
                  type="hidden"
                  name="category"
                  value={selectedCategory}
                />
              )}

              <label
                htmlFor="sort"
                className="text-sm font-medium text-gray-600"
              >
                Sort by
              </label>

              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="rounded-xl border border-[#eae2da] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#75452e]"
              >
                <option value="recommended">
                  Recommended
                </option>

                <option value="rating">
                  Highest rated
                </option>

                <option value="newest">
                  Newest
                </option>

                <option value="name">
                  Name: A–Z
                </option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-[#75452e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#593321]"
              >
                Apply
              </button>
            </form>

            {hasActiveOptions && (
              <Link
                href="/search"
                className="text-sm font-semibold text-[#75452e] hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        </div>

        {/* Current search summary */}
        {(hasFilters || sort !== "recommended") && (
          <div className="mt-5 flex flex-wrap gap-2">
            {query && (
              <span className="rounded-full bg-[#efe3d9] px-3 py-1.5 text-sm text-[#75452e]">
                Search: {query}
              </span>
            )}

            {selectedCategory && (
              <span className="rounded-full bg-[#efe3d9] px-3 py-1.5 text-sm text-[#75452e]">
                Category:{" "}
                {categories.find(
                  (category) =>
                    category.slug === selectedCategory
                )?.name ?? selectedCategory}
              </span>
            )}

            {selectedCity && (
              <span className="rounded-full bg-[#efe3d9] px-3 py-1.5 text-sm text-[#75452e]">
                City:{" "}
                {cities.find(
                  (city) => city.slug === selectedCity
                )?.name ?? selectedCity}
              </span>
            )}

            {sort !== "recommended" && (
              <span className="rounded-full bg-[#efe3d9] px-3 py-1.5 text-sm text-[#75452e]">
                Sort: {sortLabels[sort]}
              </span>
            )}
          </div>
        )}

        {/* Error state */}
        {errorMessage ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <p className="font-semibold">
              Unable to load search results
            </p>

            <p className="mt-2 text-sm">
              {errorMessage}
            </p>

            <Link
              href="/search"
              className="mt-4 inline-flex font-semibold underline"
            >
              Try again
            </Link>
          </div>
        ) : businesses.length === 0 ? (
          /* Empty state */
          <div className="mt-8 rounded-2xl border border-[#eae2da] bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#efe3d9] text-[#75452e]">
              <Store size={30} />
            </span>

            <h3 className="mt-5 text-xl font-bold">
              No businesses found
            </h3>

            <p className="mx-auto mt-3 max-w-md leading-7 text-gray-600">
              Try another search or remove some filters.
              Approved businesses will appear here as they are
              added to HabeshaSpot.
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex rounded-xl bg-[#75452e] px-5 py-3 font-semibold text-white hover:bg-[#593321]"
            >
              Clear search
            </Link>

            <div>
              <Link
                href="/business"
                className="mt-4 inline-flex text-sm font-semibold text-[#75452e] hover:underline"
              >
                Add a business
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Business grid */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => (
                <article
                  key={business.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#eae2da] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Cover photo */}
                  <Link
                    href={`/business/${encodeURIComponent(
                      business.slug
                    )}`}
                    aria-label={`View ${business.name}`}
                    className="relative block h-56 overflow-hidden bg-[#efe3d9]"
                  >
                    {business.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={business.photo_url}
                        alt={`${business.name} cover photo`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-[#75452e]">
                        <ImageIcon
                          size={42}
                          strokeWidth={1.5}
                        />

                        <span className="text-sm font-medium">
                          No photo available
                        </span>
                      </div>
                    )}

                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#75452e] shadow-sm">
                      {business.categories?.name ??
                        "Local business"}
                    </span>
                  </Link>

                  {/* Business information */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold transition group-hover:text-[#75452e]">
                        <Link
                          href={`/business/${encodeURIComponent(
                            business.slug
                          )}`}
                        >
                          {business.name}
                        </Link>
                      </h3>

                      {business.cities && (
                        <p className="mt-2 flex items-start gap-2 text-sm text-gray-500">
                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0"
                          />

                          <span>
                            {business.cities.name}
                            {business.address
                              ? ` · ${business.address}`
                              : ""}
                          </span>
                        </p>
                      )}

                      {business.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                          {business.description}
                        </p>
                      )}
                    </div>

                    {/* Rating and details */}
                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <Star
                          size={17}
                          className="fill-amber-400 text-amber-500"
                        />

                        {business.review_count > 0
                          ? business.average_rating.toFixed(1)
                          : "New"}

                        {business.review_count > 0 && (
                          <span className="font-normal text-gray-500">
                            ({business.review_count})
                          </span>
                        )}
                      </span>

                      <Link
                        href={`/business/${encodeURIComponent(
                          business.slug
                        )}`}
                        className="font-semibold text-[#75452e] hover:underline"
                      >
                        View details →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label="Business results pages"
                className="mt-12 flex flex-col items-center gap-4"
              >
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* Previous page */}
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageHref(currentPage - 1)}
                      rel="prev"
                      aria-label="Previous page"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#eae2da] bg-white px-3 py-2.5 text-sm font-semibold text-[#75452e] transition hover:bg-[#efe3d9]"
                    >
                      <ChevronLeft size={18} />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-400"
                    >
                      <ChevronLeft size={18} />
                      <span>Previous</span>
                    </span>
                  )}

                  {/* Numbered pages */}
                  {visiblePages.map((pageNumber, index) => {
                    const previousPage =
                      visiblePages[index - 1];

                    const needsEllipsis =
                      previousPage !== undefined &&
                      pageNumber - previousPage > 1;

                    return (
                      <span
                        key={pageNumber}
                        className="inline-flex items-center gap-2"
                      >
                        {needsEllipsis && (
                          <span
                            aria-hidden="true"
                            className="px-1 text-gray-400"
                          >
                            …
                          </span>
                        )}

                        <Link
                          href={buildPageHref(pageNumber)}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={
                            pageNumber === currentPage
                              ? "page"
                              : undefined
                          }
                          className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                            pageNumber === currentPage
                              ? "border-[#75452e] bg-[#75452e] text-white"
                              : "border-[#eae2da] bg-white text-[#75452e] hover:bg-[#efe3d9]"
                          }`}
                        >
                          {pageNumber}
                        </Link>
                      </span>
                    );
                  })}

                  {/* Next page */}
                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageHref(currentPage + 1)}
                      rel="next"
                      aria-label="Next page"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#eae2da] bg-white px-3 py-2.5 text-sm font-semibold text-[#75452e] transition hover:bg-[#efe3d9]"
                    >
                      <span>Next</span>
                      <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-400"
                    >
                      <span>Next</span>
                      <ChevronRight size={18} />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-10 bg-[#29231f] px-5 py-8 text-center text-sm text-white/60">
        © {new Date().getFullYear()} HabeshaSpot. Discover
        local, love local.
      </footer>
    </main>
  );
}
