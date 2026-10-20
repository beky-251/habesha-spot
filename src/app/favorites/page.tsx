"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Phone,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import SiteHeader from "@/components/site-header";
import { createClient } from "@/lib/supabase/client";

const PHOTO_BUCKET = "business-photos";

type FavoriteBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  average_rating: number | null;
  review_count: number | null;
  photo_url: string | null;
};

type FavoriteRow = {
  id: string;
  business_id: string;
};

type BusinessPhoto = {
  id: string;
  business_id: string;
  storage_path: string;
  sort_order: number | null;
  is_cover: boolean;
};

export default function FavoritesPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<FavoriteBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadFavorites = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setError("");

        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (signal?.aborted) return;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        // Read only the signed-in user's saved businesses.
        const {
          data: favoriteData,
          error: favoritesError,
        } = await supabase
          .from("favorites")
          .select("id, business_id")
          .eq("user_id", user.id);

        if (signal?.aborted) return;

        if (favoritesError) {
          throw new Error(favoritesError.message);
        }

        const favoriteRows = (favoriteData ?? []) as FavoriteRow[];

        const businessIds = [
          ...new Set(
            favoriteRows.map((favorite) => favorite.business_id)
          ),
        ];

        if (businessIds.length === 0) {
          setBusinesses([]);
          return;
        }

        // Public favorites should only display approved businesses.
        const {
          data: businessData,
          error: businessesError,
        } = await supabase
          .from("businesses")
          .select(
            "id, name, slug, description, address, phone, status, average_rating, review_count"
          )
          .in("id", businessIds)
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (signal?.aborted) return;

        if (businessesError) {
          throw new Error(businessesError.message);
        }

        const businessRows = (businessData ?? []) as Omit<
          FavoriteBusiness,
          "photo_url"
        >[];

        // Load photos belonging only to the displayed businesses.
        const {
          data: photoData,
          error: photosError,
        } = await supabase
          .from("business_photos")
          .select(
            "id, business_id, storage_path, sort_order, is_cover"
          )
          .in(
            "business_id",
            businessRows.map((business) => business.id)
          )
          .order("sort_order", { ascending: true });

        if (signal?.aborted) return;

        if (photosError) {
          console.error(
            "Unable to load favorite business photos:",
            photosError.message
          );
        }

        const photosByBusiness = new Map<
          string,
          BusinessPhoto[]
        >();

        for (const photo of (photoData ?? []) as BusinessPhoto[]) {
          const existing =
            photosByBusiness.get(photo.business_id) ?? [];

          existing.push(photo);
          photosByBusiness.set(photo.business_id, existing);
        }

        // Generate temporary URLs for the private storage bucket.
        const enrichedBusinesses = await Promise.all(
          businessRows.map(
            async (business): Promise<FavoriteBusiness> => {
              const photos = [
                ...(photosByBusiness.get(business.id) ?? []),
              ].sort((a, b) => {
                if (a.is_cover !== b.is_cover) {
                  return a.is_cover ? -1 : 1;
                }

                return (
                  (a.sort_order ?? 0) - (b.sort_order ?? 0)
                );
              });

              let photoUrl: string | null = null;

              for (const photo of photos) {
                if (!photo.storage_path) continue;

                const { data, error: signedUrlError } =
                  await supabase.storage
                    .from(PHOTO_BUCKET)
                    .createSignedUrl(photo.storage_path, 3600);

                if (signedUrlError || !data?.signedUrl) {
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

        if (signal?.aborted) return;

        setBusinesses(enrichedBusinesses);
      } catch (err) {
        if (signal?.aborted) return;

        console.error("Unable to load favorites:", err);

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
    },
    [router]
  );

  useEffect(() => {
    const controller = new AbortController();

    // Schedule loading after the current effect finishes.
    const timer = window.setTimeout(() => {
      void loadFavorites(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadFavorites]);

  async function removeFavorite(businessId: string) {
    if (removingId) return;

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

      // The database RLS policy must enforce ownership.
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
      console.error("Unable to remove favorite:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove this favorite."
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      <SiteHeader />

      {/* Page heading */}
      <section className="bg-[#0B132B] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#FFB300]">
              <Heart size={26} />
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FFB300]">
              Your collection
            </p>
          </div>

          <h1 className="mt-5 text-3xl font-extrabold sm:text-5xl">
            My Favorites
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            Keep the places you love in one place. Revisit your favorite
            restaurants, coffee houses, hotels, bakeries, and local
            businesses across Ethiopia.
          </p>

          {!loading && (
            <p className="mt-5 text-sm text-slate-300">
              {businesses.length}{" "}
              {businesses.length === 1 ? "business" : "businesses"} saved
            </p>
          )}
        </div>
      </section>

      {/* Favorites list */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Saved businesses
            </h2>

            <p className="mt-2 text-sm text-[#64748B]">
              Your personal list of places to explore.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3ED] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-50"
          >
            <Search size={17} />
            Discover more
          </Link>
        </div>

        {/* Status messages */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-1 break-words">{error}</p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);

                const timer = window.setTimeout(() => {
                  void loadFavorites();
                }, 0);

                // The retry runs independently of the initial effect.
                window.setTimeout(() => {
                  window.clearTimeout(timer);
                }, 1000);
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
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading favorites"
            aria-busy="true"
          >
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white"
              >
                <div className="h-52 animate-pulse bg-slate-200" />

                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : businesses.length === 0 && !error ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-[#DCE3ED] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B00]">
              <Heart size={30} />
            </div>

            <h2 className="mt-5 text-xl font-extrabold">
              No favorites yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#64748B]">
              When you find a business you love, save it to your favorites
              and come back to it anytime.
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3 font-semibold text-white transition hover:bg-[#E65D00]"
            >
              Explore businesses
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          /* Business cards */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <article
                key={business.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Link
                  href={`/business/${encodeURIComponent(business.slug)}`}
                  aria-label={`View ${business.name}`}
                  className="relative block h-52 overflow-hidden bg-slate-100"
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
                      <ImageIcon size={36} strokeWidth={1.5} />

                      <span className="text-sm">
                        No photo available
                      </span>
                    </div>
                  )}

                  <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-sm">
                    <Heart size={19} className="fill-current" />
                  </span>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-extrabold">
                    <Link
                      href={`/business/${encodeURIComponent(business.slug)}`}
                      className="transition hover:text-[#FF6B00]"
                    >
                      {business.name}
                    </Link>
                  </h3>

                  {business.address && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-[#64748B]">
                      <MapPin size={16} className="mt-0.5 shrink-0" />

                      <span>{business.address}</span>
                    </p>
                  )}

                  {business.description && (
                    <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-[#64748B]">
                      {business.description}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-[#DCE3ED] pt-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Star
                        size={17}
                        className="fill-[#FFB300] text-[#FFB300]"
                      />

                      {Number(business.review_count ?? 0) > 0
                        ? Number(business.average_rating ?? 0).toFixed(1)
                        : "New"}

                      {Number(business.review_count ?? 0) > 0 && (
                        <span className="font-normal text-[#64748B]">
                          ({business.review_count})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeFavorite(business.id)}
                      disabled={removingId !== null}
                      aria-label={`Remove ${business.name} from favorites`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingId === business.id ? (
                        <LoaderCircle
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}

                      {removingId === business.id
                        ? "Removing"
                        : "Remove"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                    <Link
                      href={`/business/${encodeURIComponent(business.slug)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#101D35]"
                    >
                      View business
                      <ArrowRight size={16} />
                    </Link>

                    {business.phone ? (
                      <a
                        href={`tel:${business.phone}`}
                        aria-label={`Call ${business.name}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[#DCE3ED] px-4 py-3 text-[#0B132B] transition hover:bg-slate-50"
                      >
                        <Phone size={18} />
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center justify-center rounded-xl border border-[#DCE3ED] px-4 py-3 text-slate-300"
                      >
                        <Phone size={18} />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="bg-[#07101F] px-4 py-8 text-center text-sm text-slate-400">
        <Link
          href="/"
          className="font-bold text-white hover:text-[#FFB300]"
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