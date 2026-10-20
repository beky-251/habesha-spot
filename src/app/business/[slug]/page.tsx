import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";

import SiteHeader from "@/components/site-header";
import BusinessHoursDisplay from "@/components/business/business-hours-display";
import OpenStatusBadge from "@/components/business/open-status-badge";
import { createClient } from "@/lib/supabase/server";

import ReviewForm from "./ReviewForm";
import FavoriteButton from "./FavoriteButton";

const PHOTO_BUCKET = "business-photos";
const SIGNED_URL_LIFETIME = 60 * 60;
const MAX_DISPLAY_PHOTOS = 8;

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
};

type BusinessHour = {
  id?: string;
  business_id?: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type BusinessPhoto = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number | null;
  is_cover: boolean;
};

type DisplayPhoto = BusinessPhoto & {
  imageUrl: string;
};

type Review = {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type ReviewReply = {
  id: string;
  review_id: string;
  business_id: string;
  owner_user_id: string;
  reply: string;
  created_at: string;
  updated_at: string;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string;
  category_id: string | null;
  city_id: string | null;
  created_at: string;
};

function getWebsiteUrl(website: string | null): string | null {
  if (!website) {
    return null;
  }

  const value = website.trim();

  if (!value) {
    return null;
  }

  const normalized = /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getMapsUrl(
  address: string | null,
  cityName: string | null
): string | null {
  const location = [address, cityName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");

  if (!location) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
  )}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getRatingAverage(reviews: Review[]): number | null {
  if (reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  return total / reviews.length;
}

function getValidRating(rating: number): number {
  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.max(0, Math.min(5, Math.round(rating)));
}

export async function generateMetadata({
  params,
}: BusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !business) {
    return {
      title: "Business Not Found | HabeshaSpot",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    business.description?.trim() ||
    `Discover ${business.name} on HabeshaSpot. Explore business information, photos, opening hours, and customer reviews.`;

  return {
    title: `${business.name} | HabeshaSpot`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${business.name} | HabeshaSpot`,
      description: description.slice(0, 160),
      type: "website",
    },
  };
}

export default async function BusinessDetailsPage({
  params,
}: BusinessPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Only public, approved businesses may be viewed.
  const {
    data: businessData,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      [
        "id",
        "name",
        "slug",
        "description",
        "address",
        "phone",
        "email",
        "website",
        "status",
        "category_id",
        "city_id",
        "created_at",
      ].join(", ")
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (businessError) {
    console.error(
      "Unable to load business details:",
      businessError.message
    );

    throw new Error("Unable to load this business right now.");
  }

  if (!businessData) {
    notFound();
  }

  const business = businessData as unknown as Business;

  // Load category and city from the existing relationships.
  const [categoryResult, cityResult] = await Promise.all([
    business.category_id
      ? supabase
          .from("categories")
          .select("name")
          .eq("id", business.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    business.city_id
      ? supabase
          .from("cities")
          .select("name")
          .eq("id", business.city_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (categoryResult.error) {
    console.error(
      "Unable to load business category:",
      categoryResult.error.message
    );
  }

  if (cityResult.error) {
    console.error(
      "Unable to load business city:",
      cityResult.error.message
    );
  }

  const categoryName = categoryResult.data?.name ?? null;
  const cityName = cityResult.data?.name ?? null;

  // Load actual opening hours.
  const { data: hoursData, error: hoursError } = await supabase
    .from("business_hours")
    .select(
      "id, business_id, day_of_week, opens_at, closes_at, is_closed"
    )
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true });

  if (hoursError) {
    console.error(
      "Unable to load opening hours:",
      hoursError.message
    );
  }

  const hours = (hoursData ?? []) as BusinessHour[];

  // Load actual photos from the existing business_photos table.
  const { data: photosData, error: photosError } = await supabase
    .from("business_photos")
    .select(
      "id, storage_path, alt_text, sort_order, is_cover"
    )
    .eq("business_id", business.id)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  if (photosError) {
    console.error(
      "Unable to load business photos:",
      photosError.message
    );
  }

  const photos = (photosData ?? []) as BusinessPhoto[];

  // The bucket is private, so create temporary signed URLs.
  const signedPhotos = await Promise.all(
    photos.slice(0, MAX_DISPLAY_PHOTOS).map(
      async (photo): Promise<DisplayPhoto | null> => {
        if (!photo.storage_path) {
          return null;
        }

        const { data, error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(
            photo.storage_path,
            SIGNED_URL_LIFETIME
          );

        if (error || !data?.signedUrl) {
          console.error(
            "Unable to create signed photo URL:",
            photo.id,
            error?.message
          );

          return null;
        }

        return {
          ...photo,
          imageUrl: data.signedUrl,
        };
      }
    )
  );

  const displayPhotos = signedPhotos.filter(
    (photo): photo is DisplayPhoto => photo !== null
  );

  // Load only approved reviews.
  const { data: reviewsData, error: reviewsError } = await supabase
    .from("reviews")
    .select("id, business_id, user_id, rating, comment, created_at")
    .eq("business_id", business.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (reviewsError) {
    console.error(
      "Unable to load customer reviews:",
      reviewsError.message
    );
  }

  const reviews = (reviewsData ?? []) as Review[];
  const averageRating = getRatingAverage(reviews);

  // Load replies belonging to the reviews shown on this page.
  const reviewIds = reviews.map((review) => review.id);
  const repliesByReviewId = new Map<string, ReviewReply>();

  if (reviewIds.length > 0) {
    const {
      data: repliesData,
      error: repliesError,
    } = await supabase
      .from("review_replies")
      .select(
        "id, review_id, business_id, owner_user_id, reply, created_at, updated_at"
      )
      .eq("business_id", business.id)
      .in("review_id", reviewIds);

    if (repliesError) {
      console.error(
        "Unable to load owner replies:",
        repliesError.message
      );
    } else {
      for (const reply of (repliesData ?? []) as ReviewReply[]) {
        repliesByReviewId.set(reply.review_id, reply);
      }
    }
  }

  // Load reviewer names from existing profile records.
  const reviewerIds = [
    ...new Set(
      reviews
        .map((review) => review.user_id)
        .filter((id) => Boolean(id))
    ),
  ];

  const reviewerNames: Record<string, string> = {};

  if (reviewerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", reviewerIds);

    if (profilesError) {
      console.error(
        "Unable to load reviewer names:",
        profilesError.message
      );
    } else {
      for (const profile of profiles ?? []) {
        reviewerNames[profile.id] =
          profile.full_name?.trim() || "Customer";
      }
    }
  }

  const websiteUrl = getWebsiteUrl(business.website);
  const mapsUrl = getMapsUrl(business.address, cityName);

  const locationText = [business.address, cityName]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      <SiteHeader />

      {/* Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-[#64748B]"
        >
          <Link href="/" className="hover:text-[#FF6B00]">
            Home
          </Link>

          <span aria-hidden="true">/</span>

          <Link href="/search" className="hover:text-[#FF6B00]">
            Explore
          </Link>

          <span aria-hidden="true">/</span>

          <span className="font-medium text-[#0B132B]">
            {business.name}
          </span>
        </nav>
      </div>

      {/* Business heading */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#DCE3ED] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0">
              {categoryName && (
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[#FF6B00]">
                  {categoryName}
                </p>
              )}

              <h1 className="break-words text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {business.name}
              </h1>

              {locationText && (
                <p className="mt-4 flex items-start gap-2 text-[#64748B]">
                  <MapPin
                    size={19}
                    className="mt-0.5 shrink-0 text-[#FF6B00]"
                  />

                  <span>{locationText}</span>
                </p>
              )}

              <div className="mt-5">
                <OpenStatusBadge hours={hours} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {averageRating !== null ? (
                  <>
                    <span
                      aria-label={`${averageRating.toFixed(1)} out of 5 stars`}
                      className="inline-flex items-center gap-1 font-bold text-[#0B132B]"
                    >
                      <Star
                        size={20}
                        className="fill-[#FFB300] text-[#FFB300]"
                      />

                      {averageRating.toFixed(1)}
                    </span>

                    <span className="text-sm text-[#64748B]">
                      {reviews.length}{" "}
                      {reviews.length === 1 ? "review" : "reviews"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-[#64748B]">
                    No approved reviews yet
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <FavoriteButton businessId={business.id} />

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3 font-semibold text-white transition hover:bg-[#E65D00]"
                >
                  <MapPin size={18} />
                  Get directions
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Business photos */}
      <section
        aria-labelledby="photos-heading"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#FF6B00]">
              A closer look
            </p>

            <h2
              id="photos-heading"
              className="mt-2 text-2xl font-extrabold sm:text-3xl"
            >
              Photos
            </h2>
          </div>

          <p className="text-sm text-[#64748B]">
            {displayPhotos.length}{" "}
            {displayPhotos.length === 1 ? "photo" : "photos"} available
          </p>
        </div>

        {displayPhotos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayPhotos.map((photo, index) => (
              <figure
                key={photo.id}
                className={`group relative overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white ${
                  index === 0
                    ? "sm:col-span-2 sm:row-span-2"
                    : ""
                }`}
              >
                {/* Signed URLs are used because the storage bucket is private. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={
                    photo.alt_text?.trim() ||
                    `${business.name} photo ${index + 1}`
                  }
                  loading={index === 0 ? "eager" : "lazy"}
                  className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${
                    index === 0 ? "h-72 sm:h-full sm:min-h-[420px]" : "h-64"
                  }`}
                />

                {photo.is_cover && (
                  <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0B132B] shadow-sm">
                    Cover photo
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#DCE3ED] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B00]">
              <ImageIcon size={28} />
            </div>

            <h3 className="mt-4 text-lg font-bold">
              No photos available yet
            </h3>

            <p className="mt-2 text-sm text-[#64748B]">
              Photos will appear here when they have been added to this
              business.
            </p>
          </div>
        )}
      </section>

      {/* About, opening hours, and contact */}
      <section className="mx-auto mt-10 grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <article className="rounded-2xl border border-[#DCE3ED] bg-white p-6 sm:p-8 lg:col-span-2">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6B00]">
            About this business
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Get to know {business.name}
          </h2>

          {business.description ? (
            <p className="mt-5 whitespace-pre-line text-base leading-8 text-[#475569]">
              {business.description}
            </p>
          ) : (
            <p className="mt-5 leading-7 text-[#64748B]">
              A description has not been added to this business yet.
            </p>
          )}

          {categoryName && (
            <div className="mt-6 border-t border-[#DCE3ED] pt-5">
              <p className="text-sm text-[#64748B]">Category</p>

              <p className="mt-1 font-semibold">{categoryName}</p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#DCE3ED] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B00]">
              <Clock3 size={22} />
            </div>

            <div>
              <p className="text-sm text-[#64748B]">Plan your visit</p>

              <h2 className="text-xl font-extrabold">
                Opening hours
              </h2>
            </div>
          </div>

          <div className="mt-6">
            {hours.length > 0 ? (
              <BusinessHoursDisplay hours={hours} />
            ) : (
              <p className="text-sm leading-6 text-[#64748B]">
                Opening hours have not been provided for this business.
              </p>
            )}
          </div>
        </article>
      </section>

      {/* Contact and location */}
      <section
        aria-labelledby="contact-heading"
        className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-[#DCE3ED] bg-white p-6 sm:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6B00]">
              Get in touch
            </p>

            <h2
              id="contact-heading"
              className="mt-2 text-2xl font-extrabold"
            >
              Contact &amp; location
            </h2>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {business.phone && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Phone size={18} className="text-[#FF6B00]" />

                  <h3 className="text-sm font-semibold">Phone</h3>
                </div>

                <a
                  href={`tel:${business.phone}`}
                  className="mt-2 inline-block break-words font-semibold hover:text-[#FF6B00]"
                >
                  {business.phone}
                </a>
              </div>
            )}

            {business.email && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Mail size={18} className="text-[#FF6B00]" />

                  <h3 className="text-sm font-semibold">Email</h3>
                </div>

                <a
                  href={`mailto:${business.email}`}
                  className="mt-2 inline-block break-words font-semibold hover:text-[#FF6B00]"
                >
                  {business.email}
                </a>
              </div>
            )}

            {websiteUrl && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Globe size={18} className="text-[#FF6B00]" />

                  <h3 className="text-sm font-semibold">Website</h3>
                </div>

                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 break-words font-semibold hover:text-[#FF6B00]"
                >
                  Visit website
                  <ArrowUpRight size={16} />
                </a>
              </div>
            )}

            {cityName && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <MapPin size={18} className="text-[#FF6B00]" />

                  <h3 className="text-sm font-semibold">City</h3>
                </div>

                <p className="mt-2 break-words font-semibold">
                  {cityName}
                </p>
              </div>
            )}
          </div>

          {mapsUrl && (
            <div className="mt-7 border-t border-[#DCE3ED] pt-6">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 font-semibold text-white transition hover:bg-[#101D35]"
              >
                <MapPin size={18} />
                Open in Google Maps
                <ArrowUpRight size={17} />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Customer reviews */}
      <section
        id="reviews"
        aria-labelledby="reviews-heading"
        className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-[#DCE3ED] bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6B00]">
                Community feedback
              </p>

              <h2
                id="reviews-heading"
                className="mt-2 text-2xl font-extrabold"
              >
                Customer reviews
              </h2>
            </div>

            <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
              {averageRating !== null ? (
                <div className="flex items-center gap-2">
                  <Star
                    size={21}
                    className="fill-[#FFB300] text-[#FFB300]"
                  />

                  <span className="text-xl font-extrabold">
                    {averageRating.toFixed(1)}
                  </span>

                  <span className="text-sm text-[#64748B]">
                    / 5
                  </span>
                </div>
              ) : (
                <p className="text-sm font-medium text-[#64748B]">
                  Not rated yet
                </p>
              )}

              <p className="mt-1 text-xs text-[#64748B]">
                {reviews.length} approved{" "}
                {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="mt-7 divide-y divide-[#DCE3ED]">
              {reviews.map((review) => {
                const ownerReply = repliesByReviewId.get(review.id);
                const rating = getValidRating(review.rating);

                return (
                  <article key={review.id} className="py-6 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {reviewerNames[review.user_id] || "Customer"}
                        </h3>

                        <p className="mt-1 text-sm text-[#64748B]">
                          {formatDate(review.created_at)}
                        </p>
                      </div>

                      <span
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#0B132B]"
                        aria-label={`${rating} out of 5 stars`}
                      >
                        <Star
                          size={17}
                          className="fill-[#FFB300] text-[#FFB300]"
                        />

                        {rating}/5
                      </span>
                    </div>

                    <div
                      className="mt-3 flex items-center gap-0.5 text-[#FFB300]"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={16}
                          className={
                            index < rating
                              ? "fill-[#FFB300] text-[#FFB300]"
                              : "text-[#DCE3ED]"
                          }
                        />
                      ))}
                    </div>

                    {review.comment && (
                      <p className="mt-3 whitespace-pre-line leading-7 text-[#475569]">
                        {review.comment}
                      </p>
                    )}

                    {ownerReply && (
                      <div className="mt-5 rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] p-4 sm:ml-5">
                        <div className="flex items-center gap-2">
                          <MessageCircle
                            size={18}
                            className="text-[#FF6B00]"
                          />

                          <h4 className="font-bold">
                            Response from {business.name}
                          </h4>
                        </div>

                        <p className="mt-3 whitespace-pre-line leading-7 text-[#475569]">
                          {ownerReply.reply}
                        </p>

                        <p className="mt-3 text-xs text-[#64748B]">
                          {ownerReply.updated_at &&
                          ownerReply.updated_at !== ownerReply.created_at
                            ? "Updated "
                            : "Replied "}
                          {formatDate(ownerReply.updated_at)}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-[#DCE3ED] bg-[#F8FAFC] px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B00]">
                <MessageCircle size={24} />
              </div>

              <h3 className="mt-4 font-bold">
                No approved reviews yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Share your experience to help other customers discover
                this business.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-[#DCE3ED] pt-8">
            <h3 className="text-xl font-extrabold">
              Write a review
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Sign in to share your experience. Submitted reviews may need
              approval before they appear publicly.
            </p>

            <div className="mt-5">
              <ReviewForm businessId={business.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Return navigation */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 font-semibold text-[#FF6B00] transition hover:text-[#E65D00]"
        >
          <ArrowLeft size={18} />
          Back to explore
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-[#07101F] px-4 py-8 text-center text-sm text-slate-400">
        <Link
          href="/"
          className="font-bold text-white transition hover:text-[#FFB300]"
        >
          HabeshaSpot
        </Link>

        <p className="mt-2">Discover Ethiopia, one spot at a time.</p>

        <p className="mt-3">
          © {new Date().getFullYear()} HabeshaSpot. Discover local, love local.
        </p>
      </footer>
    </main>
  );
}