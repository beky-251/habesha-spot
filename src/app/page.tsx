import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Coffee,
  Heart,
  Hotel,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
} from "lucide-react";

import SiteHeader from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "HabeshaSpot | Discover Your Next Favorite Spot",
  description:
    "Discover restaurants, coffee houses, hotels, shops, and local businesses across Ethiopia.",
};

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

type RelatedName =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  average_rating: number | null;
  review_count: number | null;
  categories: RelatedName;
  cities: RelatedName;
};

type BusinessPhoto = {
  business_id: string;
  storage_path: string;
  alt_text: string | null;
  is_cover: boolean;
  sort_order: number;
};

type BusinessCardData = Business & {
  coverPhotoUrl: string | null;
  coverPhotoAlt: string;
};

const categoryIcons: Record<string, typeof Store> = {
  restaurants: Utensils,
  "coffee-houses": Coffee,
  hotels: Hotel,
  shopping: ShoppingBag,
  bakeries: Store,
  "beauty-salons": Sparkles,
};

function getRelatedName(value: RelatedName): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value.name;
}

export default async function HomePage() {
  let categories: Category[] = [];
  let cities: City[] = [];
  let businesses: BusinessCardData[] = [];

  try {
    const supabase = await createClient();

    const [categoryResult, cityResult, businessResult] = await Promise.all([
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

      supabase
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
            categories ( name ),
            cities ( name )
          `,
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (categoryResult.error) {
      console.error("Homepage categories:", categoryResult.error.message);
    } else {
      categories = categoryResult.data ?? [];
    }

    if (cityResult.error) {
      console.error("Homepage cities:", cityResult.error.message);
    } else {
      cities = cityResult.data ?? [];
    }

    if (businessResult.error) {
      console.error("Homepage businesses:", businessResult.error.message);
    } else {
      const approvedBusinesses = (businessResult.data ?? []) as Business[];

      if (approvedBusinesses.length > 0) {
        const businessIds = approvedBusinesses.map((business) => business.id);

        const photoResult = await supabase
          .from("business_photos")
          .select(
            "business_id, storage_path, alt_text, is_cover, sort_order",
          )
          .in("business_id", businessIds)
          .order("sort_order", { ascending: true });

        let photos: BusinessPhoto[] = [];

        if (photoResult.error) {
          console.error(
            "Homepage business photos:",
            photoResult.error.message,
          );
        } else {
          photos = (photoResult.data ?? []) as BusinessPhoto[];
        }

        // Prefer the designated cover photo; otherwise use the first
        // available photo according to sort_order.
        const photoByBusiness = new Map<string, BusinessPhoto>();

        for (const photo of photos) {
          const currentPhoto = photoByBusiness.get(photo.business_id);

          if (
            !currentPhoto ||
            (photo.is_cover && !currentPhoto.is_cover) ||
            (photo.is_cover === currentPhoto.is_cover &&
              photo.sort_order < currentPhoto.sort_order)
          ) {
            photoByBusiness.set(photo.business_id, photo);
          }
        }

        // Create signed URLs for private Storage files.
        const photoUrlByBusiness = new Map<string, string>();

        await Promise.all(
          Array.from(photoByBusiness.entries()).map(
            async ([businessId, photo]) => {
              const { data, error } = await supabase.storage
                .from("business-photos")
                .createSignedUrl(photo.storage_path, 60 * 60);

              if (error) {
                console.error(
                  `Could not create photo URL for business ${businessId}:`,
                  error.message,
                );
                return;
              }

              if (data?.signedUrl) {
                photoUrlByBusiness.set(businessId, data.signedUrl);
              }
            },
          ),
        );

        businesses = approvedBusinesses.map((business) => {
          const photo = photoByBusiness.get(business.id);

          return {
            ...business,
            coverPhotoUrl: photo
              ? (photoUrlByBusiness.get(business.id) ?? null)
              : null,
            coverPhotoAlt:
              photo?.alt_text?.trim() ||
              `${business.name} cover photo`,
          };
        });
      }
    }
  } catch (error) {
    console.error("Could not load homepage data:", error);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#101D35]">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/images/hero.png"
            alt="Discover cafés, restaurants, and local businesses"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="absolute inset-0 -z-10 bg-[#101D35]/75" />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101D35]/95 via-[#101D35]/70 to-[#101D35]/30" />

        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-[#FF6B00]" />
              <span>Discover Ethiopia, one spot at a time</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Discover Your Next
              <span className="mt-2 block text-[#FF6B00]">
                Favorite Spot.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Find the best cafés, restaurants, hotels, shops, and local
              businesses around you. Discover new places and support local
              businesses with HabeshaSpot.
            </p>

            <form
              action="/search"
              method="GET"
              className="mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Search className="h-5 w-5 shrink-0 text-[#FF6B00]" />

                <input
                  type="search"
                  name="q"
                  placeholder="What are you looking for?"
                  aria-label="Search businesses"
                  className="w-full min-w-0 border-0 bg-transparent py-3 text-sm text-[#101D35] outline-none placeholder:text-gray-400 focus:ring-0"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-7 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#FF6B00]" />
                Explore places near you
              </span>

              <span className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#FF6B00]" />
                Support local businesses
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        id="categories"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Explore
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              What are you in the mood for?
            </h2>

            <p className="mt-3 max-w-xl leading-7 text-slate-500">
              Find the right place for every moment, all in one place.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 font-semibold text-orange-600 hover:text-orange-700"
          >
            View all
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Store
              className="mx-auto text-orange-500"
              size={32}
              aria-hidden="true"
            />

            <h3 className="mt-4 font-bold">Explore local businesses</h3>

            <p className="mt-2 text-sm text-slate-500">
              Browse our directory to discover available listings.
            </p>

            <Link
              href="/search"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-orange-600"
            >
              Explore directory
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => {
              const Icon = categoryIcons[category.slug] ?? Store;

              return (
                <Link
                  key={category.id}
                  href={`/search?category=${encodeURIComponent(category.slug)}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg sm:p-6"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                    <Icon size={24} aria-hidden="true" />
                  </span>

                  <h3 className="mt-5 font-bold">{category.name}</h3>

                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 group-hover:text-orange-600">
                    Explore
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Approved Businesses */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
                Top picks
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Top Picks for Your Next Outing
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-slate-500">
                Discover places worth exploring.
              </p>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center gap-2 font-semibold text-orange-600 hover:text-orange-700"
            >
              View all businesses
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          {businesses.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Store size={28} aria-hidden="true" />
              </span>

              <h3 className="mt-5 text-xl font-bold">
                Great places are waiting to be discovered
              </h3>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
                There are no approved business listings to feature yet. Business
                owners can submit their businesses for review.
              </p>

              <Link
                href="/dashboard/businesses"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600"
              >
                Register your business
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => {
                const categoryName = getRelatedName(business.categories);
                const cityName = getRelatedName(business.cities);

                const hasRating =
                  typeof business.average_rating === "number" &&
                  typeof business.review_count === "number" &&
                  business.review_count > 0;

                return (
                  <article
                    key={business.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Business Cover Photo */}
                    <Link
                      href={`/business/${encodeURIComponent(business.slug)}`}
                      aria-label={`View ${business.name}`}
                      className="relative block aspect-[16/10] overflow-hidden bg-slate-100"
                    >
                      {business.coverPhotoUrl ? (
                        <Image
                          src={business.coverPhotoUrl}
                          alt={business.coverPhotoAlt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#101D35] to-slate-700 text-white">
                          <Store
                            size={42}
                            className="text-[#FF6B00]"
                            aria-hidden="true"
                          />
                          <span className="mt-3 text-sm font-medium text-white/80">
                            {categoryName ?? "Local business"}
                          </span>
                        </div>
                      )}

                      {hasRating && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm">
                          <span className="text-amber-500" aria-hidden="true">
                            ★
                          </span>
                          {business.average_rating!.toFixed(1)}
                        </span>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">
                          <Link
                            href={`/business/${encodeURIComponent(business.slug)}`}
                            className="transition hover:text-orange-600"
                          >
                            {business.name}
                          </Link>
                        </h3>
                      </div>

                      {categoryName && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          {categoryName}
                        </p>
                      )}

                      {business.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                          {business.description}
                        </p>
                      )}

                      {(cityName || business.address) && (
                        <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-orange-500"
                            aria-hidden="true"
                          />

                          <span>
                            {[business.address, cityName]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </p>
                      )}

                      {hasRating && (
                        <p className="mt-2 text-xs text-slate-500">
                          Based on {business.review_count}{" "}
                          {business.review_count === 1 ? "review" : "reviews"}
                        </p>
                      )}

                      <div className="mt-auto pt-6">
                        <Link
                          href={`/business/${encodeURIComponent(business.slug)}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-800 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
                        >
                          View details
                          <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Locations */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
          Find your city
        </p>

        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Discover places across Ethiopia
        </h2>

        <p className="mt-3 max-w-xl leading-7 text-slate-500">
          Explore local businesses in the places you live, work, and visit.
        </p>

        {cities.length === 0 ? (
          <div className="mt-8">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 font-semibold text-orange-600"
            >
              Search all locations
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={`/search?city=${encodeURIComponent(city.slug)}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold transition hover:border-orange-400 hover:text-orange-600"
              >
                <MapPin
                  size={16}
                  className="text-orange-500"
                  aria-hidden="true"
                />
                {city.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Business Owners */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#101D35] p-8 text-white sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-orange-300">
              <Store size={17} aria-hidden="true" />
              For business owners
            </span>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your business deserves to be discovered.
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              Introduce your business to people searching for their next
              favorite place. Create a listing and help customers find you.
            </p>
          </div>

          <Link
            href="/dashboard/businesses"
            className="relative mt-8 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 lg:mt-0"
          >
            Add your business
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#07101F] text-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/"
                aria-label="HabeshaSpot home"
                className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight"
              >
                <span className="text-white">Habesha</span>
                <span className="text-[#FF6B00]">Spot</span>
              </Link>

              <p className="mt-2 text-sm text-slate-400">
                Discover local, love local.
              </p>
            </div>

            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap gap-6 text-sm text-slate-300"
            >
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>

              <Link href="/search" className="transition hover:text-white">
                Explore
              </Link>

              <Link
                href="/favorites"
                className="inline-flex items-center gap-2 transition hover:text-white"
              >
                <Heart size={15} aria-hidden="true" />
                Favorites
              </Link>

              <Link
                href="/dashboard/businesses"
                className="transition hover:text-white"
              >
                Add your business
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-sm text-slate-500">
            © {new Date().getFullYear()} HabeshaSpot. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
