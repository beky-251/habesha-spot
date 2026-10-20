import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Store,
} from "lucide-react";

import SiteHeader from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Find Local Businesses | HabeshaSpot",
  description:
    "Discover cafes, restaurants, hotels, bakeries, and local businesses across Ethiopia.",
};

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

type RelatedCategory = {
  name: string;
  slug: string;
};

type RelatedCity = {
  name: string;
  slug: string;
};

type BusinessPhoto = {
  business_id: string;
  storage_path: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  average_rating: number | null;
  review_count: number | null;
  created_at: string;
  categories: RelatedCategory | RelatedCategory[] | null;
  cities: RelatedCity | RelatedCity[] | null;
  photo_url: string | null;
};

const SORT_OPTIONS = [
  "recommended",
  "rating",
  "newest",
  "name",
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  rating: "Highest rated",
  newest: "Newest",
  name: "Name: A–Z",
};

function isSortOption(value: string): value is SortOption {
  return SORT_OPTIONS.some((option) => option === value);
}

function getSafePage(value?: string): number {
  const page = Number(value);

  if (!Number.isSafeInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, 1_000_000);
}

function getSingleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function buildPageHref(
  pageNumber: number,
  query: string,
  city: string,
  category: string,
  sort: SortOption
): string {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (city) params.set("city", city);
  if (category) params.set("category", category);

  if (sort !== "recommended") {
    params.set("sort", sort);
  }

  params.set("page", String(pageNumber));

  return `/search?${params.toString()}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 100);
  const selectedCity = (params.city ?? "").trim().slice(0, 100);
  const selectedCategory = (params.category ?? "")
    .trim()
    .slice(0, 100);

  const sort: SortOption =
    params.sort && isSortOption(params.sort)
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
    // Load the real category and city options.
    const [categoriesResult, citiesResult] = await Promise.all([
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

    if (categoriesResult.error) {
      console.error(
        "Could not load search categories:",
        categoriesResult.error.message
      );
      throw new Error("Search categories could not be loaded.");
    }

    if (citiesResult.error) {
      console.error(
        "Could not load search cities:",
        citiesResult.error.message
      );
      throw new Error("Search cities could not be loaded.");
    }

    categories = categoriesResult.data ?? [];
    cities = citiesResult.data ?? [];

    // Create a filtered query for approved businesses only.
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

      if (query) {
        businessQuery = businessQuery.ilike(
          "name",
          `%${escapeLikePattern(query)}%`
        );
      }

      if (selectedCity) {
        businessQuery = businessQuery.eq(
          "cities.slug",
          selectedCity
        );
      }

      if (selectedCategory) {
        businessQuery = businessQuery.eq(
          "categories.slug",
          selectedCategory
        );
      }

      if (sort === "rating") {
        businessQuery = businessQuery
          .order("average_rating", {
            ascending: false,
            nullsFirst: false,
          })
          .order("name", { ascending: true });
      } else if (sort === "newest") {
        businessQuery = businessQuery
          .order("created_at", { ascending: false })
          .order("name", { ascending: true });
      } else {
        businessQuery = businessQuery.order("name", {
          ascending: true,
        });
      }

      return businessQuery.range(from, to);
    };

    let businessResult = await createBusinessQuery(requestedPage);

    if (businessResult.error) {
      console.error(
        "Business search failed:",
        businessResult.error.message
      );
      throw new Error("Businesses could not be loaded.");
    }

    totalCount = businessResult.count ?? 0;
    totalPages = Math.ceil(totalCount / PAGE_SIZE);

    currentPage =
      totalPages === 0
        ? 1
        : Math.min(requestedPage, totalPages);

    // If someone requests a page beyond the last page, use the last page.
    if (currentPage !== requestedPage && totalPages > 0) {
      businessResult = await createBusinessQuery(currentPage);

      if (businessResult.error) {
        console.error(
          "Business pagination failed:",
          businessResult.error.message
        );
        throw new Error("Business results could not be loaded.");
      }
    }

    const businessRows = (
      (businessResult.data ?? []) as unknown as Omit<
        Business,
        "photo_url"
      >[]
    ).map((business) => ({
      ...business,
      average_rating: Number(business.average_rating ?? 0),
      review_count: Number(business.review_count ?? 0),
      categories: getSingleRelation(business.categories),
      cities: getSingleRelation(business.cities),
      photo_url: null as string | null,
    }));

    // Fetch photos only for businesses on the current page.
    const businessIds = businessRows.map((business) => business.id);

    const photosByBusiness = new Map<string, BusinessPhoto[]>();

    if (businessIds.length > 0) {
      const photosResult = await supabase
        .from("business_photos")
        .select(
          "business_id, storage_path, sort_order, is_cover"
        )
        .in("business_id", businessIds)
        .order("sort_order", { ascending: true });

      if (photosResult.error) {
        // A photo problem should not hide otherwise valid businesses.
        console.error(
          "Business photos could not be loaded:",
          photosResult.error.message
        );
      } else {
        const photos = (photosResult.data ?? []) as BusinessPhoto[];

        for (const photo of photos) {
          const existing = photosByBusiness.get(photo.business_id) ?? [];

          existing.push(photo);
          photosByBusiness.set(photo.business_id, existing);
        }
      }
    }

    // The business-photos bucket is private, so generate temporary URLs.
    businesses = await Promise.all(
      businessRows.map(async (business): Promise<Business> => {
        const photos = [
          ...(photosByBusiness.get(business.id) ?? []),
        ].sort((a, b) => {
          if (a.is_cover !== b.is_cover) {
            return a.is_cover ? -1 : 1;
          }

          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });

        let photoUrl: string | null = null;

        for (const photo of photos) {
          if (!photo.storage_path) continue;

          const { data, error } = await supabase.storage
            .from("business-photos")
            .createSignedUrl(photo.storage_path, 3600);

          if (error || !data?.signedUrl) {
            console.error(
              "Could not generate a business photo URL:",
              error?.message
            );
            continue;
          }

          photoUrl = data.signedUrl;
          break;
        }

        return {
          ...business,
          photo_url: photoUrl,
        };
      })
    );
  } catch (error) {
    console.error("Search page error:", error);

    errorMessage =
      "We couldn't load search results right now. Please try again.";
  }

  const hasFilters = Boolean(
    query || selectedCity || selectedCategory
  );

  const hasActiveOptions =
    hasFilters || sort !== "recommended";

  const visiblePages = Array.from(
    new Set(
      [
        1,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        totalPages,
      ].filter((page) => page >= 1 && page <= totalPages)
    )
  ).sort((a, b) => a - b);

  const resultStart =
    totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const resultEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      <SiteHeader />

      {/* Search hero */}
      <section className="relative overflow-hidden bg-[#0B132B] px-5 py-12 text-white sm:px-8 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FFB300]/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-[#FF6B00]/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FFB300]">
            Discover. Eat. Explore.
          </p>

          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            Find your next favorite spot.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Discover cafes, restaurants, bakeries, hotels, and local
            places worth visiting across Ethiopia.
          </p>

          <form
            action="/search"
            method="GET"
            className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white p-3 shadow-2xl sm:p-4 md:grid-cols-[minmax(0,1fr)_190px_190px_auto]"
          >
            {sort !== "recommended" && (
              <input type="hidden" name="sort" value={sort} />
            )}

            <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[#DCE3ED] bg-white px-4">
              <Search
                size={20}
                aria-hidden="true"
                className="shrink-0 text-[#64748B]"
              />

              <span className="sr-only">Search businesses</span>

              <input
                type="search"
                name="q"
                defaultValue={query}
                maxLength={100}
                placeholder="Business name..."
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#0B132B] outline-none placeholder:text-[#64748B]"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-[#DCE3ED] bg-white px-3">
              <MapPin
                size={18}
                aria-hidden="true"
                className="shrink-0 text-[#64748B]"
              />

              <span className="sr-only">Filter by city</span>

              <select
                name="city"
                defaultValue={selectedCity}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#0B132B] outline-none"
              >
                <option value="">All cities</option>

                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-[#DCE3ED] bg-white px-3">
              <Store
                size={18}
                aria-hidden="true"
                className="shrink-0 text-[#64748B]"
              />

              <span className="sr-only">Filter by category</span>

              <select
                name="category"
                defaultValue={selectedCategory}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#0B132B] outline-none"
              >
                <option value="">All categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFB300] px-6 py-3 font-bold text-[#0B132B] transition hover:bg-[#FFD166] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB300]"
            >
              <Search size={18} aria-hidden="true" />
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Search results */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 border-b border-[#DCE3ED] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#64748B]">
              {hasFilters ? "Search results" : "Explore Ethiopia"}
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {query ? `Results for “${query}”` : "Discover local spots"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              {errorMessage
                ? "We couldn't retrieve the results."
                : `${totalCount} approved ${
                    totalCount === 1 ? "business" : "businesses"
                  } found`}
            </p>
          </div>

          <form
            action="/search"
            method="GET"
            className="flex flex-wrap items-center gap-2"
          >
            {query && <input type="hidden" name="q" value={query} />}
            {selectedCity && (
              <input type="hidden" name="city" value={selectedCity} />
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
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B]"
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              Sort by
            </label>

            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-[#DCE3ED] bg-white px-3 py-2.5 text-sm text-[#0B132B] outline-none focus:border-[#FFB300] focus:ring-2 focus:ring-[#FFB300]/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl border border-[#DCE3ED] bg-white px-4 py-2.5 text-sm font-bold text-[#0B132B] transition hover:bg-[#F1F5F9]"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Active filters */}
        {hasActiveOptions && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {query && (
              <span className="rounded-full border border-[#DCE3ED] bg-white px-3 py-1.5 text-sm text-[#334155]">
                Search: {query}
              </span>
            )}

            {selectedCategory && (
              <span className="rounded-full border border-[#DCE3ED] bg-white px-3 py-1.5 text-sm text-[#334155]">
                Category:{" "}
                {categories.find(
                  (category) => category.slug === selectedCategory
                )?.name ?? selectedCategory}
              </span>
            )}

            {selectedCity && (
              <span className="rounded-full border border-[#DCE3ED] bg-white px-3 py-1.5 text-sm text-[#334155]">
                City:{" "}
                {cities.find((city) => city.slug === selectedCity)?.name ??
                  selectedCity}
              </span>
            )}

            {sort !== "recommended" && (
              <span className="rounded-full border border-[#DCE3ED] bg-white px-3 py-1.5 text-sm text-[#334155]">
                Sort: {SORT_LABELS[sort]}
              </span>
            )}

            <Link
              href="/search"
              className="ml-1 text-sm font-bold text-[#0B132B] underline decoration-[#FFB300] decoration-2 underline-offset-4 hover:text-[#FF6B00]"
            >
              Clear filters
            </Link>
          </div>
        )}

        {/* Error state */}
        {errorMessage ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">Unable to load search results</h3>

            <p className="mt-2 text-sm leading-6">{errorMessage}</p>

            <Link
              href="/search"
              className="mt-4 inline-flex font-bold underline underline-offset-4"
            >
              Try again
            </Link>
          </div>
        ) : businesses.length === 0 ? (
          /* Empty state */
          <div className="mt-8 rounded-3xl border border-[#DCE3ED] bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF4D6] text-[#0B132B]">
              <Store size={30} aria-hidden="true" />
            </span>

            <h3 className="mt-5 text-xl font-extrabold">
              No businesses found
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#64748B]">
              Try another search or remove some filters. Approved businesses
              will appear here as they are added to HabeshaSpot.
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 font-bold text-white transition hover:bg-[#101D35]"
            >
              Clear search
              <ArrowRight size={17} aria-hidden="true" />
            </Link>

            <div>
              <Link
                href="/business"
                className="mt-4 inline-flex text-sm font-bold text-[#0B132B] underline decoration-[#FFB300] decoration-2 underline-offset-4 hover:text-[#FF6B00]"
              >
                Add a business
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-[#64748B]">
              Showing {resultStart}–{resultEnd} of {totalCount} businesses
            </p>

            {/* Business cards */}
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => {
                const category = getSingleRelation(business.categories);
                const city = getSingleRelation(business.cities);

                const rating = Number(business.average_rating ?? 0);
                const reviewCount = Number(business.review_count ?? 0);

                const businessHref = `/business/${encodeURIComponent(
                  business.slug
                )}`;

                return (
                  <article
                    key={business.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <Link
                      href={businessHref}
                      aria-label={`View ${business.name}`}
                      className="relative block h-56 overflow-hidden bg-[#EAF0F7]"
                    >
                      {business.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={business.photo_url}
                          alt={`${business.name} cover`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-[#64748B]">
                          <ImageIcon
                            size={40}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />

                          <span className="text-sm font-medium">
                            No photo available
                          </span>
                        </div>
                      )}

                      <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-white/60 bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0B132B] shadow-sm">
                        {category?.name ?? "Local business"}
                      </span>
                    </Link>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex-1">
                        <h3 className="text-xl font-extrabold tracking-tight">
                          <Link
                            href={businessHref}
                            className="transition hover:text-[#FF6B00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFB300]"
                          >
                            {business.name}
                          </Link>
                        </h3>

                        {(city || business.address) && (
                          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#64748B]">
                            <MapPin
                              size={16}
                              aria-hidden="true"
                              className="mt-1 shrink-0"
                            />

                            <span>
                              {city?.name}
                              {city && business.address ? " · " : ""}
                              {business.address}
                            </span>
                          </p>
                        )}

                        {business.description && (
                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#64748B]">
                            {business.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#EAF0F7] pt-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B132B]">
                          <Star
                            size={17}
                            aria-hidden="true"
                            className="fill-[#FFB300] text-[#FFB300]"
                          />

                          {reviewCount > 0 ? rating.toFixed(1) : "New"}

                          {reviewCount > 0 && (
                            <span className="font-normal text-[#64748B]">
                              ({reviewCount})
                            </span>
                          )}
                        </span>

                        <Link
                          href={businessHref}
                          className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#0B132B] transition hover:text-[#FF6B00]"
                        >
                          View details
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label="Business results pages"
                className="mt-12 flex flex-col items-center gap-4"
              >
                <p className="text-sm text-[#64748B]">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageHref(
                        currentPage - 1,
                        query,
                        selectedCity,
                        selectedCategory,
                        sort
                      )}
                      rel="prev"
                      aria-label="Previous page"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#DCE3ED] bg-white px-3 py-2.5 text-sm font-bold text-[#0B132B] transition hover:bg-[#F1F5F9]"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                      Previous
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-[#DCE3ED] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#94A3B8]"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                      Previous
                    </span>
                  )}

                  {visiblePages.map((pageNumber, index) => {
                    const previousPage = visiblePages[index - 1];
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
                            className="px-1 text-[#94A3B8]"
                          >
                            …
                          </span>
                        )}

                        <Link
                          href={buildPageHref(
                            pageNumber,
                            query,
                            selectedCity,
                            selectedCategory,
                            sort
                          )}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={
                            pageNumber === currentPage ? "page" : undefined
                          }
                          className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition ${
                            pageNumber === currentPage
                              ? "border-[#0B132B] bg-[#0B132B] text-white"
                              : "border-[#DCE3ED] bg-white text-[#0B132B] hover:border-[#FFB300] hover:bg-[#FFF9E8]"
                          }`}
                        >
                          {pageNumber}
                        </Link>
                      </span>
                    );
                  })}

                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageHref(
                        currentPage + 1,
                        query,
                        selectedCity,
                        selectedCategory,
                        sort
                      )}
                      rel="next"
                      aria-label="Next page"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#DCE3ED] bg-white px-3 py-2.5 text-sm font-bold text-[#0B132B] transition hover:bg-[#F1F5F9]"
                    >
                      Next
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-[#DCE3ED] bg-[#F1F5F9] px-3 py-2.5 text-sm text-[#94A3B8]"
                    >
                      Next
                      <ChevronRight size={18} aria-hidden="true" />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      <footer className="mt-8 border-t border-[#DCE3ED] bg-white px-5 py-8 text-center text-sm text-[#64748B]">
        © {new Date().getFullYear()} HabeshaSpot. Discover Ethiopia, one spot
        at a time.
      </footer>
    </main>
  );
}