"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type City = {
  id: string;
  name: string;
};

type Business = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  category_id: string | null;
  city_id: string | null;
};

type BusinessForm = {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  category_id: string;
  city_id: string;
};

type ApiResponse = {
  business?: Business;
  categories?: Category[];
  cities?: City[];
  error?: string;
  message?: string;
};

const INITIAL_FORM: BusinessForm = {
  name: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  category_id: "",
  city_id: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClassName =
  "mb-2 block text-sm font-semibold text-slate-800";

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
}

export default function EditBusinessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [form, setForm] = useState<BusinessForm>(INITIAL_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadBusiness = useCallback(
    async (signal: AbortSignal) => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const response = await fetch(
          `/api/businesses/${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        const result = await readResponse(response);

        if (signal.aborted) {
          return;
        }

        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent(
              `/dashboard/businesses/${id}/edit`,
            )}`,
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load this business.",
          );
        }

        if (!result.business) {
          throw new Error(
            "The server did not return business information.",
          );
        }

        const business = result.business;

        setForm({
          name: business.name ?? "",
          description: business.description ?? "",
          address: business.address ?? "",
          phone: business.phone ?? "",
          email: business.email ?? "",
          website: business.website ?? "",
          category_id: business.category_id ?? "",
          city_id: business.city_id ?? "",
        });

        setCategories(result.categories ?? []);
        setCities(result.cities ?? []);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        if (!signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your business. Please try again.",
          );
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [id, router],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void loadBusiness(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadBusiness, reloadKey]);

  function updateField<K extends keyof BusinessForm>(
    field: K,
    value: BusinessForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function validateForm(): string | null {
    if (form.name.trim().length < 2) {
      return "Business name must contain at least 2 characters.";
    }

    if (form.name.trim().length > 120) {
      return "Business name cannot exceed 120 characters.";
    }

    if (!form.category_id) {
      return "Please select a business category.";
    }

    if (!form.city_id) {
      return "Please select a city.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return "Please enter a valid email address.";
    }

    if (form.description.trim().length > 5000) {
      return "Description cannot exceed 5,000 characters.";
    }

    if (form.address.trim().length > 300) {
      return "Address cannot exceed 300 characters.";
    }

    if (form.phone.trim().length > 40) {
      return "Phone number cannot exceed 40 characters.";
    }

    if (form.website.trim()) {
      const website = /^https?:\/\//i.test(form.website.trim())
        ? form.website.trim()
        : `https://${form.website.trim()}`;

      try {
        const parsed = new URL(website);

        if (
          parsed.protocol !== "http:" &&
          parsed.protocol !== "https:"
        ) {
          return "Please enter a valid website address.";
        }
      } catch {
        return "Please enter a valid website address.";
      }

      if (website.length > 500) {
        return "Website address cannot exceed 500 characters.";
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const trimmedWebsite = form.website.trim();

      const website = trimmedWebsite
        ? /^https?:\/\//i.test(trimmedWebsite)
          ? trimmedWebsite
          : `https://${trimmedWebsite}`
        : "";

      const response = await fetch(
        `/api/businesses/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            website,
            category_id: form.category_id,
            city_id: form.city_id,
          }),
        },
      );

      const result = await readResponse(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${id}/edit`,
          )}`,
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to save your business changes.",
        );
      }

      setSuccess(
        result.message || "Business details updated successfully.",
      );

      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500"
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold text-slate-900">
            Loading business information
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please wait while we retrieve your business details.
          </p>
        </div>
      </main>
    );
  }

  if (error && !form.name) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
            !
          </div>

          <h1 className="text-2xl font-bold text-slate-950">
            Unable to load business
          </h1>

          <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
            {error}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Try again
            </button>

            <Link
              href="/dashboard/businesses"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to my businesses
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/businesses"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <span aria-hidden="true">←</span>
          Back to my businesses
        </Link>

        <header className="mb-8 mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            HabeshaSpot Business Dashboard
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B132B] sm:text-4xl">
            Edit your business
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Keep your information accurate so customers can discover
            your business and contact you.
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/dashboard/businesses/${encodeURIComponent(id)}/photos`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
                📷
              </span>

              <div>
                <h2 className="font-bold text-slate-950 group-hover:text-orange-600">
                  Manage photos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload photos and choose your cover image.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/businesses/${encodeURIComponent(id)}/hours`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                🕒
              </span>

              <div>
                <h2 className="font-bold text-slate-950 group-hover:text-orange-600">
                  Opening hours
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the days and times your business is open.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
            >
              {success}
            </div>
          )}

          <section>
            <h2 className="text-lg font-bold text-[#0B132B]">
              Basic information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tell customers your business name and what you offer.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="name" className={labelClassName}>
                  Business name <span className="text-red-600">*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="e.g. Addis Coffee House"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="description" className={labelClassName}>
                    Description
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.description.length}/5000
                  </span>
                </div>

                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="Describe your business, products, and services..."
                />
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-8">
            <h2 className="text-lg font-bold text-[#0B132B]">
              Category and location
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Help customers find your business in the correct category and city.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category_id" className={labelClassName}>
                  Category <span className="text-red-600">*</span>
                </label>

                <select
                  id="category_id"
                  name="category_id"
                  required
                  value={form.category_id}
                  onChange={(event) =>
                    updateField("category_id", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="">Select a category</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {categories.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No categories were returned by the server. Check your
                    categories configuration.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="city_id" className={labelClassName}>
                  City <span className="text-red-600">*</span>
                </label>

                <select
                  id="city_id"
                  name="city_id"
                  required
                  value={form.city_id}
                  onChange={(event) =>
                    updateField("city_id", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="">Select a city</option>

                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>

                {cities.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No cities were returned by the server. Check your cities
                    configuration.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClassName}>
                  Street address
                </label>

                <input
                  id="address"
                  name="address"
                  type="text"
                  maxLength={300}
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="Street, neighborhood, or building"
                />
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-8">
            <h2 className="text-lg font-bold text-[#0B132B]">
              Contact information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add public contact details that customers can use to reach you.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className={labelClassName}>
                  Phone number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClassName}>
                  Public email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="hello@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="website" className={labelClassName}>
                  Website
                </label>

                <input
                  id="website"
                  name="website"
                  type="text"
                  maxLength={500}
                  autoComplete="url"
                  value={form.website}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="https://example.com"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  You can enter a domain such as example.com or a complete
                  website URL.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard/businesses"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || categories.length === 0 || cities.length === 0}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Your changes are saved through HabeshaSpot’s existing business API.
          You can manage your photos and opening hours separately.
        </p>
      </div>
    </main>
  );
}