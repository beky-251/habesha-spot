"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  Pencil,
  Save,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  name: string;
  owner_user_id: string;
};

type BusinessPhoto = {
  id: string;
  business_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  imageUrl?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const STORAGE_BUCKET = "business-photos";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function LoadingScreen() {
  return (
    <main className="flex min-h-64 items-center justify-center">
      <div className="text-center">
        <LoaderCircle
          className="mx-auto h-9 w-9 animate-spin text-orange-500"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Loading business photos...
        </p>
      </div>
    </main>
  );
}

function PhotoManager() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessId = params.id;

  // Keep the browser client stable between renders.
  const [supabase] = useState(() => createClient());

  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingAltText, setEditingAltText] = useState("");
  const [deletingPhoto, setDeletingPhoto] = useState<BusinessPhoto | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadKey] = useState(0);

  const loadPhotos = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (signal?.aborted) return;

        if (authError || !user) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent(
              `/dashboard/businesses/${businessId}/photos`,
            )}`,
          );
          return;
        }

        // Check ownership before displaying or managing photos.
        const { data: businessData, error: businessError } =
          await supabase
            .from("businesses")
            .select("id, name, owner_user_id")
            .eq("id", businessId)
            .eq("owner_user_id", user.id)
            .maybeSingle();

        if (signal?.aborted) return;

        if (businessError) {
          throw new Error("Unable to verify business ownership.");
        }

        if (!businessData) {
          setBusiness(null);
          setPhotos([]);
          setError(
            "Business not found, or you do not have permission to manage its photos.",
          );
          return;
        }

        setBusiness(businessData);

        const { data: photoData, error: photoError } = await supabase
          .from("business_photos")
          .select(
            "id, business_id, storage_path, alt_text, sort_order, is_cover",
          )
          .eq("business_id", businessId)
          .order("sort_order", { ascending: true });

        if (signal?.aborted) return;

        if (photoError) {
          throw new Error("Unable to load your saved photos.");
        }

        const photosWithUrls = await Promise.all(
          (photoData ?? []).map(async (photo: Omit<BusinessPhoto, "imageUrl">) => {
            const { data, error: signedUrlError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(photo.storage_path, 3600);

            if (signedUrlError) {
              console.error(
                "Photo preview URL error:",
                signedUrlError.message,
              );
            }

            return {
              ...photo,
              imageUrl: data?.signedUrl,
            } satisfies BusinessPhoto;
          }),
        );

        if (signal?.aborted) return;

        setPhotos(photosWithUrls);
      } catch (err: unknown) {
        if (signal?.aborted) return;

        console.error("Photo manager error:", err);
        setError(
          getErrorMessage(err, "Unable to load business photos."),
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [businessId, router, supabase],
  );

  useEffect(() => {
    const controller = new AbortController();

    // Defer loading to avoid synchronous state updates inside the effect.
    const timer = window.setTimeout(() => {
      void loadPhotos(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPhotos, reloadKey]);

  function handleFileChange(file: File | null) {
    setError("");
    setMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The image must be 5 MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile || !business) {
      setError("Please select an image to upload.");
      return;
    }

    if (uploading) return;

    setUploading(true);
    setError("");
    setMessage("");

    let uploadedPath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${businessId}/photos`,
          )}`,
        );
        return;
      }

      // Recheck ownership immediately before uploading.
      const { data: ownedBusiness, error: ownershipError } = await supabase
        .from("businesses")
        .select("id, owner_user_id, name")
        .eq("id", businessId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (ownershipError || !ownedBusiness) {
        throw new Error(
          "You do not have permission to upload photos for this business.",
        );
      }

      const safeFileName = selectedFile.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .slice(-120);

      uploadedPath = `${businessId}/${user.id}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(uploadedPath, selectedFile, {
          cacheControl: "3600",
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      const shouldBeCover = photos.length === 0;

      const { error: insertError } = await supabase
        .from("business_photos")
        .insert({
          business_id: businessId,
          storage_path: uploadedPath,
          alt_text: altText.trim() || ownedBusiness.name,
          sort_order: photos.length,
          is_cover: shouldBeCover,
        });

      if (insertError) {
        // Avoid leaving an unreferenced storage file if record creation fails.
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error(
            "Uploaded file cleanup failed:",
            cleanupError.message,
          );
        }

        uploadedPath = null;

        throw new Error(
          "The image could not be added to your business. Please try again.",
        );
      }

      uploadedPath = null;
      setSelectedFile(null);
      setAltText("");
      setMessage("Photo uploaded successfully.");

      const input = document.getElementById(
        "business-photo",
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      await loadPhotos();
    } catch (err: unknown) {
      console.error("Photo upload error:", err);

      setError(
        getErrorMessage(err, "Unable to upload this photo."),
      );
    } finally {
      setUploading(false);
    }
  }

  async function setCoverPhoto(photo: BusinessPhoto) {
    if (busyPhotoId) return;

    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${businessId}/photos`,
          )}`,
        );
        return;
      }

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!ownedBusiness) {
        throw new Error("You are not allowed to manage this business.");
      }

      // Keep both updates inside the user's existing RLS permissions.
      const { error: clearError } = await supabase
        .from("business_photos")
        .update({ is_cover: false })
        .eq("business_id", businessId);

      if (clearError) {
        throw new Error("Unable to update the cover photo.");
      }

      const { error: updateError } = await supabase
        .from("business_photos")
        .update({ is_cover: true })
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (updateError) {
        throw new Error(
          "The cover photo could not be changed. Please try again.",
        );
      }

      setMessage("Cover photo updated.");
      await loadPhotos();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Unable to update the cover photo."),
      );
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function saveDescription(photo: BusinessPhoto) {
    if (busyPhotoId) return;

    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${businessId}/photos`,
          )}`,
        );
        return;
      }

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!ownedBusiness) {
        throw new Error("You are not allowed to manage this business.");
      }

      const { error: updateError } = await supabase
        .from("business_photos")
        .update({
          alt_text: editingAltText.trim() || null,
        })
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (updateError) {
        throw new Error("Unable to save the photo description.");
      }

      setEditingPhotoId(null);
      setEditingAltText("");
      setMessage("Photo description updated.");

      await loadPhotos();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Unable to update the photo description."),
      );
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function deletePhoto(photo: BusinessPhoto) {
    if (busyPhotoId) return;

    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${businessId}/photos`,
          )}`,
        );
        return;
      }

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!ownedBusiness) {
        throw new Error("You are not allowed to manage this business.");
      }

      // Delete the database record first. RLS must permit only authorized
      // owners to remove their own business photo records.
      const { error: deleteRecordError } = await supabase
        .from("business_photos")
        .delete()
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (deleteRecordError) {
        throw new Error("Unable to delete this photo record.");
      }

      const { error: deleteFileError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([photo.storage_path]);

      if (deleteFileError) {
        console.error(
          "Storage file deletion failed:",
          deleteFileError.message,
        );

        setMessage(
          "The photo record was deleted, but its stored file could not be removed. Check your Storage policies.",
        );
      } else {
        setMessage("Photo deleted successfully.");
      }

      setDeletingPhoto(null);
      await loadPhotos();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Unable to delete this photo."),
      );
    } finally {
      setBusyPhotoId(null);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/dashboard/businesses/${encodeURIComponent(businessId)}/edit`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to edit business
        </Link>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
              <ImagePlus className="h-7 w-7" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
                HabeshaSpot Business Dashboard
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-[#0B132B] sm:text-3xl">
                Business photos
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Upload real photos of your business, choose a cover image,
                and add descriptions to help customers understand what
                they are viewing.
              </p>

              {business && (
                <p className="mt-3 font-semibold text-slate-900">
                  Managing photos for {business.name}
                </p>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />

            <p className="flex-1">{error}</p>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <p>{message}</p>
          </div>
        )}

        {business && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-[#0B132B]">
                Upload a photo
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Select an image up to 5 MB. The first uploaded photo
                automatically becomes the cover image.
              </p>

              <form onSubmit={uploadPhoto} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="business-photo"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Image file
                  </label>

                  <input
                    id="business-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploading}
                    onChange={(event) =>
                      handleFileChange(event.target.files?.[0] ?? null)
                    }
                    className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-semibold file:text-orange-700`}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Supported formats: JPEG, PNG, WebP, and GIF. Maximum size: 5 MB.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="photo-description"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Photo description
                  </label>

                  <input
                    id="photo-description"
                    type="text"
                    maxLength={250}
                    value={altText}
                    disabled={uploading}
                    onChange={(event) => setAltText(event.target.value)}
                    placeholder="Example: Front entrance of the business"
                    className={inputClass}
                  />
                </div>

                {selectedFile && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="break-all font-semibold text-slate-800">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className={`${buttonClass} bg-[#FF6B00] px-5 text-white hover:bg-orange-700`}
                >
                  {uploading ? (
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}

                  {uploading ? "Uploading photo..." : "Upload photo"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0B132B]">
                    Your photos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a cover image, edit descriptions, or delete
                    unwanted photos.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  {photos.length} {photos.length === 1 ? "photo" : "photos"}
                </span>
              </div>

              {photos.length === 0 ? (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
                  <ImagePlus
                    className="mx-auto h-10 w-10 text-slate-400"
                    aria-hidden="true"
                  />

                  <h3 className="mt-3 font-bold text-slate-900">
                    No photos yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Upload your first real business photo to help customers
                    recognize your location and services.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => (
                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="relative aspect-[4/3] bg-slate-100">
                        {photo.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.imageUrl}
                            alt={photo.alt_text || business.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                            Photo preview unavailable. Try refreshing the page.
                          </div>
                        )}

                        {photo.is_cover && (
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                            <Star
                              className="h-3.5 w-3.5 fill-current"
                              aria-hidden="true"
                            />
                            Cover photo
                          </span>
                        )}
                      </div>

                      <div className="space-y-4 p-4">
                        {editingPhotoId === photo.id ? (
                          <div className="space-y-3">
                            <label
                              htmlFor={`alt-${photo.id}`}
                              className="block text-xs font-bold uppercase tracking-wide text-slate-500"
                            >
                              Photo description
                            </label>

                            <input
                              id={`alt-${photo.id}`}
                              type="text"
                              maxLength={250}
                              value={editingAltText}
                              disabled={busyPhotoId === photo.id}
                              onChange={(event) =>
                                setEditingAltText(event.target.value)
                              }
                              className={inputClass}
                            />

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={busyPhotoId === photo.id}
                                onClick={() => void saveDescription(photo)}
                                className={`${buttonClass} flex-1 bg-[#0B132B] text-white hover:bg-slate-800`}
                              >
                                {busyPhotoId === photo.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                Save
                              </button>

                              <button
                                type="button"
                                disabled={busyPhotoId === photo.id}
                                onClick={() => {
                                  setEditingPhotoId(null);
                                  setEditingAltText("");
                                }}
                                className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="min-h-10 break-words text-sm leading-5 text-slate-600">
                              {photo.alt_text || "No description added"}
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={
                                  photo.is_cover || busyPhotoId !== null
                                }
                                onClick={() => void setCoverPhoto(photo)}
                                className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                              >
                                <Star className="h-4 w-4" aria-hidden="true" />
                                {photo.is_cover ? "Cover image" : "Set cover"}
                              </button>

                              <button
                                type="button"
                                disabled={busyPhotoId !== null}
                                onClick={() => {
                                  setEditingPhotoId(photo.id);
                                  setEditingAltText(photo.alt_text ?? "");
                                  setError("");
                                  setMessage("");
                                }}
                                className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Edit text
                              </button>

                              <button
                                type="button"
                                disabled={busyPhotoId !== null}
                                onClick={() => setDeletingPhoto(photo)}
                                className={`${buttonClass} col-span-2 border border-red-200 text-red-700 hover:bg-red-50`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Delete photo
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {deletingPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                busyPhotoId === null
              ) {
                setDeletingPhoto(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-photo-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 className="h-6 w-6" aria-hidden="true" />
              </div>

              <h2
                id="delete-photo-title"
                className="mt-4 text-xl font-extrabold text-slate-950"
              >
                Delete this photo?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                This removes the photo from your business listing. This
                action cannot be undone.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busyPhotoId !== null}
                  onClick={() => setDeletingPhoto(null)}
                  className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busyPhotoId !== null}
                  onClick={() => void deletePhoto(deletingPhoto)}
                  className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
                >
                  {busyPhotoId === deletingPhoto.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {busyPhotoId === deletingPhoto.id
                    ? "Deleting..."
                    : "Delete photo"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BusinessPhotosPage() {
  return <PhotoManager />;
}