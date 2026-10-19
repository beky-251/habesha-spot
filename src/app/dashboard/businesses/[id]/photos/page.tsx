"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
  Upload,
  X,
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

function LoadingScreen() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error ? error.message : fallback;
}

function PhotoManager() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessId = params.id;

  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: businessData, error: businessError } =
        await supabase
          .from("businesses")
          .select("id, name, owner_user_id")
          .eq("id", businessId)
          .eq("owner_user_id", user.id)
          .maybeSingle();

      if (businessError) {
        throw new Error(businessError.message);
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

      if (photoError) {
        throw new Error(photoError.message);
      }

      const photosWithUrls = await Promise.all(
        (photoData ?? []).map(
          async (photo: {
            id: string;
            business_id: string;
            storage_path: string;
            alt_text: string | null;
            sort_order: number;
            is_cover: boolean;
          }) => {
            const { data, error: signedUrlError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(photo.storage_path, 3600);

            if (signedUrlError) {
              console.error(
                "Unable to create photo preview URL:",
                signedUrlError.message,
              );
            }

            return {
              ...photo,
              imageUrl: data?.signedUrl,
            } satisfies BusinessPhoto;
          },
        ),
      );

      setPhotos(photosWithUrls);
    } catch (err: unknown) {
      console.error("Photo manager error:", err);
      setError(
        getErrorMessage(err, "Unable to load business photos."),
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhotos();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPhotos]);

  function handleFileChange(file: File | null) {
    setError("");
    setMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
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
        router.replace("/login");
        return;
      }

      const safeFileName = selectedFile.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-")
        .replace(/-+/g, "-");

      uploadedPath = `${business.id}/${user.id}/${crypto.randomUUID()}-${safeFileName}`;

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
          business_id: business.id,
          storage_path: uploadedPath,
          alt_text: altText.trim() || business.name,
          sort_order: photos.length,
          is_cover: shouldBeCover,
        });

      if (insertError) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error(
            "Could not remove the uploaded file after a database error:",
            cleanupError.message,
          );
        }

        throw new Error(
          `The image uploaded, but its photo record could not be saved: ${insertError.message}`,
        );
      }

      setSelectedFile(null);
      setAltText("");
      setMessage("Photo uploaded successfully.");

      const input = document.getElementById(
        "business-photo",
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadPhotos();
    } catch (err: unknown) {
      console.error("Photo upload error:", err);
      setError(getErrorMessage(err, "Unable to upload this photo."));
    } finally {
      setUploading(false);
    }
  }

  async function setCoverPhoto(photo: BusinessPhoto) {
    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const { error: clearError } = await supabase
        .from("business_photos")
        .update({ is_cover: false })
        .eq("business_id", businessId);

      if (clearError) {
        throw new Error(clearError.message);
      }

      const { error: updateError } = await supabase
        .from("business_photos")
        .update({ is_cover: true })
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setMessage("Cover photo updated.");
      await loadPhotos();
    } catch (err: unknown) {
      console.error("Cover photo error:", err);
      setError(getErrorMessage(err, "Unable to update the cover photo."));
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function saveDescription(photo: BusinessPhoto) {
    const newAltText = window.prompt(
      "Enter a description for this photo:",
      photo.alt_text ?? "",
    );

    if (newAltText === null) {
      return;
    }

    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("business_photos")
        .update({ alt_text: newAltText.trim() || null })
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setMessage("Photo description updated.");
      await loadPhotos();
    } catch (err: unknown) {
      console.error("Photo description error:", err);
      setError(
        getErrorMessage(err, "Unable to update the photo description."),
      );
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function deletePhoto(photo: BusinessPhoto) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this photo? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setBusyPhotoId(photo.id);
    setError("");
    setMessage("");

    try {
      const { error: deleteRecordError } = await supabase
        .from("business_photos")
        .delete()
        .eq("id", photo.id)
        .eq("business_id", businessId);

      if (deleteRecordError) {
        throw new Error(deleteRecordError.message);
      }

      const { error: deleteFileError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([photo.storage_path]);

      if (deleteFileError) {
        console.error(
          "Photo record deleted, but the storage file could not be removed:",
          deleteFileError.message,
        );

        setMessage(
          "Photo record deleted, but the storage file could not be removed. Check your Storage policies.",
        );
      } else {
        setMessage("Photo deleted successfully.");
      }

      await loadPhotos();
    } catch (err: unknown) {
      console.error("Photo deletion error:", err);
      setError(getErrorMessage(err, "Unable to delete this photo."));
    } finally {
      setBusyPhotoId(null);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/businesses"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Businesses
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <ImagePlus className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Business Photos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload and manage photos for your business listing.
            </p>
          </div>
        </div>

        {business && (
          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Managing photos for
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {business.name}
            </p>
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {business && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Upload a Photo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose an image up to 5 MB. Your first uploaded photo
              will automatically become the cover photo.
            </p>

            <form onSubmit={uploadPhoto} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="business-photo"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Image file
                </label>

                <input
                  id="business-photo"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                  className="block w-full rounded-xl border border-gray-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-semibold file:text-emerald-700"
                />
              </div>

              <div>
                <label
                  htmlFor="photo-description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Photo description
                </label>

                <input
                  id="photo-description"
                  type="text"
                  maxLength={250}
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Example: Front entrance of the business"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {selectedFile && (
                <p className="text-sm text-gray-600">
                  Selected: {selectedFile.name} (
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Your Photos
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a cover photo, edit descriptions, or remove
                  images.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="mt-6 rounded-xl border-2 border-dashed border-gray-200 px-6 py-12 text-center">
                <ImagePlus className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 font-semibold text-gray-900">
                  No photos yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your first photo to make your listing more
                  attractive.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {photos.map((photo) => (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-gray-200"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {photo.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.imageUrl}
                          alt={photo.alt_text || business.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                          Preview unavailable
                        </div>
                      )}

                      {photo.is_cover && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Cover Photo
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <p className="break-words text-sm text-gray-600">
                        {photo.alt_text || "No description added"}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            photo.is_cover ||
                            busyPhotoId === photo.id
                          }
                          onClick={() => void setCoverPhoto(photo)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                          {photo.is_cover ? "Cover Photo" : "Set Cover"}
                        </button>

                        <button
                          type="button"
                          disabled={busyPhotoId === photo.id}
                          onClick={() => void saveDescription(photo)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Edit Description
                        </button>

                        <button
                          type="button"
                          disabled={busyPhotoId === photo.id}
                          onClick={() => void deletePhoto(photo)}
                          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyPhotoId === photo.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete Photo
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function BusinessPhotosPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PhotoManager />
    </Suspense>
  );
}
