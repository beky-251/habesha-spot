"use client";

import Link from "next/link";
import {
ArrowRight,
Coffee,
Heart,
HeartPulse,
Hotel,
MapPin,
ShoppingBag,
Sparkles,
Store,
Utensils,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";

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

type HomeContentProps = {
categories: Category[];
cities: City[];
categoryError: boolean;
cityError: boolean;
};

const categoryIcons: Record<string, typeof Store> = {
restaurants: Utensils,
"coffee-houses": Coffee,
cafes: Coffee,
hotels: Hotel,
shopping: ShoppingBag,
bakeries: Store,
"cake-houses": Store,
attractions: Sparkles,
nightlife: Store,
"beauty-salons": Sparkles,
healthcare: HeartPulse,
entertainment: Store,
};

export default function HomeContent({
categories,
cities,
categoryError,
cityError,
}: HomeContentProps) {
const { language, t } = useLanguage();

const displayName = (
item: { name: string; name_am: string | null }
) => {
return language === "am" && item.name_am
? item.name_am
: item.name;
};

return (
<>
{/* Explore by category */} <section
     id="categories"
     className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20"
   > <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"> <div> <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#10B981]">
{t("exploreCategories")} </p>

        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("categoryHeading")}
        </h2>

        <p className="mt-3 max-w-xl leading-7 text-[#64748B]">
          {t("categoryDescription")}
        </p>
      </div>

      <Link
        href="/search"
        className="inline-flex items-center gap-2 font-semibold text-[#FF6B00] hover:underline"
      >
        {t("exploreAll")}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>

    {categoryError ? (
      <div
        role="alert"
        className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900"
      >
        {t("categoriesUnavailable")}
      </div>
    ) : categories.length === 0 ? (
      <div className="mt-8 rounded-2xl border border-[#DCE3ED] bg-white p-8 text-center">
        <Store
          className="mx-auto text-[#FF6B00]"
          size={32}
          aria-hidden="true"
        />

        <h3 className="mt-4 text-lg font-bold">
          {t("categoriesComingSoon")}
        </h3>

        <p className="mt-2 text-sm text-[#64748B]">
          {t("categoriesEmpty")}
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
              className="group rounded-2xl border border-[#DCE3ED] bg-white p-5 transition hover:-translate-y-1 hover:border-[#FF6B00]/40 hover:shadow-lg sm:p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B00] transition group-hover:bg-[#FF6B00] group-hover:text-white">
                <Icon size={24} aria-hidden="true" />
              </span>

              <h3 className="mt-5 font-bold text-[#0B132B]">
                {displayName(category)}
              </h3>

              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B00]">
                {t("exploreAll")}
                <ArrowRight
                  size={15}
                  className="transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>
    )}
  </section>

  {/* Explore by city */}
  <section
    id="cities"
    className="border-y border-[#DCE3ED] bg-white"
  >
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#10B981]">
        {t("exploreLocation")}
      </p>

      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {t("discoverNearby")}
      </h2>

      <p className="mt-3 max-w-xl leading-7 text-[#64748B]">
        {t("cityDescription")}
      </p>

      {cityError ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {t("citiesUnavailable")}
        </p>
      ) : cities.length === 0 ? (
        <p className="mt-6 text-sm text-[#64748B]">
          {t("citiesEmpty")}
        </p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/search?city=${encodeURIComponent(city.slug)}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#DCE3ED] px-5 py-3 text-sm font-semibold transition hover:border-[#FF6B00] hover:bg-[#F8FAFC]"
            >
              <MapPin
                size={16}
                className="text-[#FF6B00]"
                aria-hidden="true"
              />

              {displayName(city)}
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>

  {/* Business owner promotion */}
  <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
    <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-[#0B132B] p-7 text-white sm:p-12 lg:flex-row lg:items-center">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#FFB300]">
          <Store size={17} aria-hidden="true" />
          {t("businessOwners")}
        </span>

        <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("businessHeading")}
        </h2>

        <p className="mt-4 leading-7 text-slate-300">
          {t("businessDescription")}
        </p>
      </div>

      <Link
        href="/dashboard/businesses"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#FFB300] px-6 py-4 font-bold text-[#0B132B] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {t("addBusiness")}
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
    </div>
  </section>

  {/* Footer */}
  <footer className="bg-[#07101F] text-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div>
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight"
        >
          HabeshaSpot
        </Link>

        <p className="mt-2 text-sm text-white/65">
          {t("discoverLocal")}
        </p>
      </div>

      <nav
        aria-label="Footer navigation"
        className="flex flex-wrap gap-6 text-sm text-white/75"
      >
        <Link href="/" className="hover:text-white">
          {t("home")}
        </Link>

        <Link href="/search" className="hover:text-white">
          {t("explore")}
        </Link>

        <Link
          href="/favorites"
          className="inline-flex items-center gap-1.5 hover:text-white"
        >
          <Heart size={15} aria-hidden="true" />
          {t("favoritesLabel")}
        </Link>

        <Link
          href="/business"
          className="hover:text-white"
        >
          {t("listBusiness")}
        </Link>
      </nav>

      <p className="text-sm text-white/55">
        © {new Date().getFullYear()} HabeshaSpot
      </p>
    </div>
  </footer>
</>
);
}
