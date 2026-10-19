import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import BusinessHoursDisplay from "@/components/business/business-hours-display";
import OpenStatusBadge from "@/components/business/open-status-badge";
import ReviewForm from "./ReviewForm";
import FavoriteButton from "./FavoriteButton";

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

type BusinessPageProps = {
params: Promise<{ slug: string }>;
};

function getWebsiteUrl(website: string | null): string | null {
if (!website) return null;

const value = website.trim();
if (!value) return null;

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
cityName: string | null,
): string | null {
const location = [address, cityName].filter(Boolean).join(", ");

if (!location) return null;

return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function formatDate(date: string): string {
const parsedDate = new Date(date);

if (Number.isNaN(parsedDate.getTime())) {
return "";
}

return new Intl.DateTimeFormat("en", {
year: "numeric",
month: "long",
day: "numeric",
}).format(parsedDate);
}

export async function generateMetadata({
params,
}: BusinessPageProps): Promise<Metadata> {
const { slug } = await params;
const supabase = await createClient();

const { data: business } = await supabase
.from("businesses")
.select("name, description")
.eq("slug", slug)
.eq("status", "approved")
.maybeSingle();

if (!business) {
return {
title: "Business Not Found | HabeshaSpot",
};
}

return {
title: `${business.name} | HabeshaSpot`,
description:
business.description ||
`Discover ${business.name} on HabeshaSpot. Explore business details, opening hours, photos, and reviews.`,
};
}

export default async function BusinessDetailsPage({
params,
}: BusinessPageProps) {
const { slug } = await params;
const supabase = await createClient();

// Fetch the approved business.
const { data: businessData, error: businessError } = await supabase
.from("businesses")
.select("*")
.eq("slug", slug)
.eq("status", "approved")
.maybeSingle();

if (businessError) {
console.error("Error loading business:", businessError.message);
throw new Error("Unable to load this business.");
}

if (!businessData) {
notFound();
}

const business = businessData as Business;

// Fetch category.
let categoryName: string | null = null;

if (business.category_id) {
const { data: category } = await supabase
.from("categories")
.select("name")
.eq("id", business.category_id)
.maybeSingle();


categoryName = category?.name ?? null;

}

// Fetch city.
let cityName: string | null = null;

if (business.city_id) {
const { data: city } = await supabase
.from("cities")
.select("name")
.eq("id", business.city_id)
.maybeSingle();


cityName = city?.name ?? null;


}

// Fetch opening hours.
const { data: hoursData, error: hoursError } = await supabase
.from("business_hours")
.select("id, business_id, day_of_week, opens_at, closes_at, is_closed")
.eq("business_id", business.id)
.order("day_of_week", { ascending: true });

if (hoursError) {
console.error("Error loading business hours:", hoursError.message);
}

const hours = (hoursData ?? []) as BusinessHour[];

// Fetch business photos.
const { data: photosData, error: photosError } = await supabase
.from("business_photos")
.select("id, storage_path, alt_text, sort_order, is_cover")
.eq("business_id", business.id)
.order("is_cover", { ascending: false })
.order("sort_order", { ascending: true });

if (photosError) {
console.error("Error loading business photos:", photosError.message);
}

const photos = (photosData ?? []) as BusinessPhoto[];

// Create temporary URLs for private storage images.
const photosWithUrls = await Promise.all(
photos.map(async (photo) => {
const { data, error } = await supabase.storage
.from("business-photos")
.createSignedUrl(photo.storage_path, 60 * 60);


  if (error || !data?.signedUrl) {
    console.error(
      "Unable to create photo URL:",
      photo.id,
      error?.message,
    );

    return null;
  }

  return {
    ...photo,
    imageUrl: data.signedUrl,
  };
}),

);

const displayPhotos = photosWithUrls.filter(
(photo): photo is NonNullable<typeof photo> => photo !== null,
);

// Fetch approved reviews.
const { data: reviewsData, error: reviewsError } = await supabase
.from("reviews")
.select("id, business_id, user_id, rating, comment, created_at")
.eq("business_id", business.id)
.eq("status", "approved")
.order("created_at", { ascending: false });

if (reviewsError) {
console.error("Error loading reviews:", reviewsError.message);
}

const reviews = (reviewsData ?? []) as Review[];

// Fetch owner replies for these reviews.
const reviewIds = reviews.map((review) => review.id);
const repliesByReviewId = new Map<string, ReviewReply>();

if (reviewIds.length > 0) {
const { data: repliesData, error: repliesError } = await supabase
.from("review_replies")
.select(
"id, review_id, business_id, owner_user_id, reply, created_at, updated_at",
)
.eq("business_id", business.id)
.in("review_id", reviewIds);

if (repliesError) {
  // Reviews can still be displayed if replies are unavailable.
  console.error("Error loading review replies:", repliesError.message);
} else {
  for (const reply of (repliesData ?? []) as ReviewReply[]) {
    repliesByReviewId.set(reply.review_id, reply);
  }
}

}

// Fetch reviewer names.
const reviewerIds = [
...new Set(reviews.map((review) => review.user_id).filter(Boolean)),
];

const reviewerNames: Record<string, string> = {};

if (reviewerIds.length > 0) {
const { data: profiles, error: profilesError } = await supabase
.from("profiles")
.select("id, full_name")
.in("id", reviewerIds);

if (profilesError) {
  console.error(
    "Error loading reviewer profiles:",
    profilesError.message,
  );
}

for (const profile of profiles ?? []) {
  reviewerNames[profile.id] = profile.full_name || "Customer";
}

}

// Calculate average rating.
const averageRating =
reviews.length > 0
? reviews.reduce((total, review) => total + review.rating, 0) /
reviews.length
: null;

const websiteUrl = getWebsiteUrl(business.website);
const mapsUrl = getMapsUrl(business.address, cityName);

return ( <main className="min-h-screen bg-gray-50"> <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
{/* Breadcrumbs */} <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500"> <Link href="/" className="hover:text-blue-600">
Home </Link>
      <span className="mx-2">/</span>

      <Link href="/business" className="hover:text-blue-600">
        Businesses
      </Link>

      <span className="mx-2">/</span>

      <span className="text-gray-900">{business.name}</span>
    </nav>

    {/* Business header */}
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="min-w-0">
          {categoryName && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
              {categoryName}
            </p>
          )}

          <h1 className="break-words text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {business.name}
          </h1>

          {cityName && (
            <p className="mt-3 text-gray-600">{cityName}</p>
          )}

          {business.address && (
            <p className="mt-1 text-gray-600">{business.address}</p>
          )}

          <div className="mt-4">
            <OpenStatusBadge hours={hours} />
          </div>

          {/* Rating */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {averageRating !== null ? (
              <>
                <span
                  className="text-lg text-amber-500"
                  aria-label={`${averageRating.toFixed(1)} out of 5 stars`}
                >
                  ★★★★★
                </span>

                <span className="font-semibold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>

                <span className="text-sm text-gray-500">
                  ({reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                No reviews yet
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <FavoriteButton businessId={business.id} />
        </div>
      </div>
    </section>

    {/* Business photos */}
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Photos</h2>

        <span className="text-sm text-gray-500">
          {displayPhotos.length}{" "}
          {displayPhotos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      {displayPhotos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayPhotos.slice(0, 6).map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.alt_text || `${business.name} photo`}
                className="h-64 w-full object-cover"
                loading="lazy"
              />

              {photo.is_cover && (
                <div className="px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Cover photo
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-gray-600">
            No photos have been added to this business yet.
          </p>
        </div>
      )}
    </section>

    {/* About and opening hours */}
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-bold text-gray-900">About</h2>

        {business.description ? (
          <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
            {business.description}
          </p>
        ) : (
          <p className="mt-4 text-gray-500">
            No description has been added yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Opening Hours</h2>

        <div className="mt-4">
          <BusinessHoursDisplay hours={hours} />
        </div>
      </section>
    </div>

    {/* Contact information */}
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900">
        Contact &amp; Location
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {business.phone && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500">Phone</h3>

            <a
              href={`tel:${business.phone}`}
              className="mt-1 inline-block break-words font-medium text-blue-600 hover:underline"
            >
              {business.phone}
            </a>
          </div>
        )}

        {business.email && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500">Email</h3>

            <a
              href={`mailto:${business.email}`}
              className="mt-1 inline-block break-words font-medium text-blue-600 hover:underline"
            >
              {business.email}
            </a>
          </div>
        )}

        {websiteUrl && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500">
              Website
            </h3>

            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-words font-medium text-blue-600 hover:underline"
            >
              Visit website
            </a>
          </div>
        )}

        {cityName && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500">City</h3>

            <p className="mt-1 font-medium text-gray-900">{cityName}</p>
          </div>
        )}
      </div>

      {mapsUrl && (
        <div className="mt-6">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Get Directions
          </a>
        </div>
      )}
    </section>

    {/* Reviews and owner replies */}
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Customer Reviews
        </h2>

        <span className="text-sm text-gray-500">
          {reviews.length}{" "}
          {reviews.length === 1 ? "review" : "reviews"}
        </span>
      </div>

      {reviews.length > 0 ? (
        <div className="mt-6 space-y-5">
          {reviews.map((review) => {
            const ownerReply = repliesByReviewId.get(review.id);

            return (
              <article
                key={review.id}
                className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {reviewerNames[review.user_id] || "Customer"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(review.created_at)}
                    </p>
                  </div>

                  <span
                    className="font-semibold text-amber-500"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {"★".repeat(
                      Math.max(0, Math.min(5, review.rating)),
                    )}

                    <span className="text-gray-300">
                      {"★".repeat(
                        5 - Math.max(0, Math.min(5, review.rating)),
                      )}
                    </span>
                  </span>
                </div>

                {review.comment && (
                  <p className="mt-3 whitespace-pre-line leading-7 text-gray-700">
                    {review.comment}
                  </p>
                )}

                {ownerReply && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:ml-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-hidden="true">💬</span>

                      <h4 className="font-semibold text-gray-900">
                        Response from {business.name}
                      </h4>
                    </div>

                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-700">
                      {ownerReply.reply}
                    </p>

                    <p className="mt-3 text-xs text-gray-500">
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
        <div className="mt-6 rounded-xl bg-gray-50 px-5 py-8 text-center">
          <p className="font-medium text-gray-700">
            Be the first to review this business.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Share your experience to help other customers.
          </p>
        </div>
      )}

      <div className="mt-8 border-t border-gray-200 pt-8">
        <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>

        <p className="mt-2 text-sm text-gray-600">
          Sign in to share your experience with this business.
        </p>

        <div className="mt-5">
          <ReviewForm businessId={business.id} />
        </div>
      </div>
    </section>

    {/* Back link */}
    <div className="mt-8">
      <Link
        href="/business"
        className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-800"
      >
        <span aria-hidden="true">←</span>
        Back to businesses
      </Link>
    </div>
  </div>
</main>
);
}
