import Link from "next/link";
import {
ArrowRight,
Coffee,
Heart,
HeartPulse,
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
title: "Discover Local Businesses in Ethiopia",
description:
"Discover restaurants, cafés, hotels, shops, and other local businesses across Ethiopia with HabeshaSpot.",
};

const categoryIcons: Record<string, typeof Store> = {
restaurants: Utensils,
"coffee-houses": Coffee,
hotels: Hotel,
shopping: ShoppingBag,
bakeries: Store,
"beauty-salons": Sparkles,
healthcare: HeartPulse,
entertainment: Store,
};

type Category = {
id: string;
name: string;
name_am: string | null;
slug: string;
};

type City = {
id: string;
name: string;
name_am: string | null;
slug: string;
region: string | null;
};

export default async function HomePage() {
let categories: Category[] = [];
let cities: City[] = [];
let databaseAvailable = true;

try {
const supabase = await createClient();

const [categoriesResult, citiesResult] = await Promise.all([
  supabase
    .from("categories")
    .select("id, name, name_am, slug")
    .eq("is_active", true)
    .order("name"),

  supabase
    .from("cities")
    .select("id, name, name_am, slug, region")
    .eq("is_active", true)
    .order("name"),
]);

if (categoriesResult.error || citiesResult.error) {
  databaseAvailable = false;

  console.error("Homepage database query failed:", {
    categories: categoriesResult.error?.message,
    cities: citiesResult.error?.message,
  });
} else {
  categories = categoriesResult.data ?? [];
  cities = citiesResult.data ?? [];
}

} catch (error) {
databaseAvailable = false;
console.error("Unable to load homepage data:", error);
}

return ( <main className="min-h-screen bg-[#faf8f5] text-[#29231f]"> <SiteHeader />

  {/* Hero */}
  <section className="relative overflow-hidden bg-[#75452e] text-white">
    <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
    <div className="absolute -bottom-36 -left-16 h-96 w-96 rounded-full bg-white/5" />

    <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90">
          <MapPin size={16} />
          Discover Ethiopia, one spot at a time
        </span>

        <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Find your next
          <span className="block text-[#f0d5b8]">
            favorite spot.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
          Discover local restaurants, coffee houses, hotels, shops, and
          amazing businesses across Ethiopia.
        </p>

        <form
          action="/search"
          method="GET"
          className="mt-9 flex max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search
              className="shrink-0 text-[#75452e]"
              size={21}
            />

            <input
              type="search"
              name="q"
              placeholder="What are you looking for?"
              aria-label="Search businesses"
              className="w-full min-w-0 border-0 bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-gray-100 px-3 sm:border-l sm:border-t-0">
            <MapPin
              className="shrink-0 text-[#75452e]"
              size={20}
            />

            <select
              name="city"
              aria-label="Choose a city"
              defaultValue=""
              className="w-full min-w-0 bg-transparent py-3 text-sm text-gray-700 outline-none sm:max-w-44"
            >
              <option value="">All cities</option>

              {cities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#477454] px-6 py-3 font-semibold text-white transition hover:bg-[#365c40]"
          >
            Search
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="mt-4 text-sm text-white/65">
          Explore local favorites and discover somewhere new.
        </p>
      </div>
    </div>
  </section>

  {/* Categories */}
  <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#477454]">
          Explore by category
        </p>

        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          What are you in the mood for?
        </h2>

        <p className="mt-3 max-w-xl leading-7 text-gray-600">
          Find the right place for your next meal, coffee break, shopping
          trip, or adventure.
        </p>
      </div>

      <Link
        href="/search"
        className="inline-flex items-center gap-2 font-semibold text-[#75452e] hover:underline"
      >
        Explore all
        <ArrowRight size={18} />
      </Link>
    </div>

    {!databaseAvailable ? (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
        We couldn&apos;t load categories right now. Please check your
        Supabase connection and try again.
      </div>
    ) : categories.length === 0 ? (
      <div className="mt-8 rounded-2xl border border-[#eae2da] bg-white p-8 text-center">
        <Store className="mx-auto text-[#75452e]" size={32} />

        <h3 className="mt-4 text-lg font-bold">
          Categories are coming soon
        </h3>

        <p className="mt-2 text-sm text-gray-600">
          Add active categories in Supabase to display them here.
        </p>
      </div>
    ) : (
      <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => {
          const Icon = categoryIcons[category.slug] ?? Store;

          return (
            <Link
              key={category.id}
              href={`/search?category=${encodeURIComponent(category.slug)}`}
              className="group rounded-2xl border border-[#eae2da] bg-white p-5 transition hover:-translate-y-1 hover:border-[#75452e]/30 hover:shadow-lg sm:p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#efe3d9] text-[#75452e] transition group-hover:bg-[#75452e] group-hover:text-white">
                <Icon size={24} />
              </span>

              <h3 className="mt-5 font-bold">{category.name}</h3>

              {category.name_am && (
                <p className="mt-1 text-sm text-gray-500">
                  {category.name_am}
                </p>
              )}

              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#75452e]">
                Explore
                <ArrowRight
                  size={15}
                  className="transition group-hover:translate-x-1"
                />
              </span>
            </Link>
          );
        })}
      </div>
    )}
  </section>

  {/* Cities */}
  <section className="border-y border-[#eae2da] bg-white">
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#477454]">
        Explore by location
      </p>

      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Discover places near you
      </h2>

      <p className="mt-3 max-w-xl leading-7 text-gray-600">
        Start exploring local businesses in cities across Ethiopia.
      </p>

      {!databaseAvailable ? (
        <p className="mt-6 text-sm text-gray-600">
          City information is temporarily unavailable.
        </p>
      ) : cities.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">
          Cities will appear here when they are available in the database.
        </p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/search?city=${encodeURIComponent(city.slug)}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#eae2da] px-5 py-3 text-sm font-semibold transition hover:border-[#75452e] hover:bg-[#faf8f5]"
            >
              <MapPin size={16} className="text-[#75452e]" />
              {city.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>

  {/* Business Owner Call to Action */}
  <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
    <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-[#e9eee6] p-7 sm:p-12 lg:flex-row lg:items-center">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#477454]">
          <Store size={17} />
          For local business owners
        </span>

        <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Put your business on the map.
        </h2>

        <p className="mt-4 leading-7 text-gray-600">
          Help more people discover your business. Create a listing and
          introduce your services to customers looking for their next
          favorite spot.
        </p>
      </div>

      <Link
        href="/business"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#477454] px-6 py-4 font-semibold text-white transition hover:bg-[#365c40]"
      >
        Add your business
        <ArrowRight size={19} />
      </Link>
    </div>
  </section>

  {/* Footer */}
  <footer className="bg-[#29231f] text-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div>
        <Link href="/" className="text-xl font-extrabold">
          HabeshaSpot
        </Link>

        <p className="mt-2 text-sm text-white/65">
          Discover local, love local.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-white/75">
        <Link href="/" className="hover:text-white">
          Home
        </Link>

        <Link href="/search" className="hover:text-white">
          Explore
        </Link>

        <Link
          href="/favorites"
          className="inline-flex items-center gap-1.5 hover:text-white"
        >
          <Heart size={15} />
          Favorites
        </Link>

        <Link href="/business" className="hover:text-white">
          Add your business
        </Link>
      </div>

      <p className="text-sm text-white/55">
        © {new Date().getFullYear()} HabeshaSpot
      </p>
    </div>
  </footer>
</main>
);
}
