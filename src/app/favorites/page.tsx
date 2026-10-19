"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FavoriteBusiness = {
id: string;
name: string;
slug: string;
description: string | null;
address: string | null;
phone: string | null;
status: string;
};

type FavoriteRow = {
id: string;
business_id: string;
};

export default function FavoritesPage() {
const router = useRouter();

const [businesses, setBusinesses] = useState<FavoriteBusiness[]>([]);
const [loading, setLoading] = useState(true);
const [removingId, setRemovingId] = useState<string | null>(null);
const [error, setError] = useState("");
const [message, setMessage] = useState("");

const loadFavorites = useCallback(async (signal?: AbortSignal) => {
const supabase = createClient();

try {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (signal?.aborted) return;

  if (authError || !user) {
    router.replace("/login");
    return;
  }

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorites")
    .select("id, business_id")
    .eq("user_id", user.id);

  if (signal?.aborted) return;

  if (favoritesError) {
    throw new Error(favoritesError.message);
  }

  const favoriteRows = (favorites ?? []) as FavoriteRow[];
  const businessIds = [
    ...new Set(favoriteRows.map((favorite) => favorite.business_id)),
  ];

  if (businessIds.length === 0) {
    setBusinesses([]);
    setError("");
    return;
  }

  const { data: businessData, error: businessesError } = await supabase
    .from("businesses")
    .select("id, name, slug, description, address, phone, status")
    .in("id", businessIds)
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (signal?.aborted) return;

  if (businessesError) {
    throw new Error(businessesError.message);
  }

  setBusinesses((businessData ?? []) as FavoriteBusiness[]);
  setError("");
} catch (err) {
  if (signal?.aborted) return;

  setError(
    err instanceof Error
      ? err.message
      : "Unable to load your favorite businesses."
  );
} finally {
  if (!signal?.aborted) {
    setLoading(false);
  }
}

}, [router]);

useEffect(() => {
const controller = new AbortController();

const timer = window.setTimeout(() => {
  if (!controller.signal.aborted) {
    void loadFavorites(controller.signal);
  }
}, 0);

return () => {
  window.clearTimeout(timer);
  controller.abort();
};

}, [loadFavorites]);

async function removeFavorite(businessId: string) {
setRemovingId(businessId);
setError("");
setMessage("");

try {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    router.replace("/login");
    return;
  }

  const { error: deleteError } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("business_id", businessId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  setBusinesses((current) =>
    current.filter((business) => business.id !== businessId)
  );

  setMessage("Business removed from your favorites.");
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Unable to remove this favorite."
  );
} finally {
  setRemovingId(null);
}

}

return ( <main className="min-h-screen bg-gray-50"> <header className="border-b border-gray-200 bg-white"> <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"> <Link
         href="/"
         className="text-2xl font-bold tracking-tight text-orange-600"
       >
HabeshaSpot </Link>
      <Link
        href="/dashboard"
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        My Dashboard
      </Link>
    </div>
  </header>

  <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-600">
        Your collection
      </p>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        My Favorites
      </h1>

      <p className="mt-3 max-w-2xl text-gray-600">
        Keep your favorite Ethiopian restaurants, cafés, shops, and local
        businesses in one place.
      </p>
    </div>

    {error && (
      <div
        role="alert"
        className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 break-words">{error}</p>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            void loadFavorites();
          }}
          className="mt-3 font-semibold underline"
        >
          Try again
        </button>
      </div>
    )}

    {message && (
      <div
        role="status"
        className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {message}
      </div>
    )}

    {loading ? (
      <div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Loading favorites"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    ) : businesses.length === 0 && !error ? (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
          ♡
        </div>

        <h2 className="mt-5 text-xl font-semibold text-gray-900">
          No favorites yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
          When you find a business you love, save it to your favorites and
          come back to it anytime.
        </p>

        <Link
          href="/search"
          className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Explore businesses
        </Link>
      </div>
    ) : (
      <>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {businesses.length}
            </span>{" "}
            {businesses.length === 1 ? "business" : "businesses"} saved
          </p>

          <Link
            href="/search"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Discover more →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <article
              key={business.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl font-bold text-orange-600">
                  {business.name.charAt(0).toUpperCase()}
                </div>

                <button
                  type="button"
                  onClick={() => void removeFavorite(business.id)}
                  disabled={removingId === business.id}
                  aria-label={`Remove ${business.name} from favorites`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingId === business.id
                    ? "Removing..."
                    : "♥ Saved"}
                </button>
              </div>

              <h2 className="mt-5 text-lg font-bold text-gray-900">
                {business.name}
              </h2>

              {business.address && (
                <p className="mt-2 text-sm text-gray-500">
                  📍 {business.address}
                </p>
              )}

              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-gray-600">
                {business.description || "Discover more about this local business."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                <Link
                  href={`/business/${business.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  View Business
                </Link>

                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    aria-label={`Call ${business.name}`}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Call
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </>
    )}
  </section>
</main>
);
}
