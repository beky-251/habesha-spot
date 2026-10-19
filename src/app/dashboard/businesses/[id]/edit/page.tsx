"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

type FormData = {
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
};

const INITIAL_FORM: FormData = {
name: "",
description: "",
address: "",
phone: "",
email: "",
website: "",
category_id: "",
city_id: "",
};

export default function EditBusinessPage() {
const params = useParams<{ id: string }>();
const router = useRouter();
const id = params.id;

const [form, setForm] = useState<FormData>(INITIAL_FORM);
const [categories, setCategories] = useState<Category[]>([]);
const [cities, setCities] = useState<City[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const loadBusiness = useCallback(async (signal: AbortSignal) => {
try {
const response = await fetch(
`/api/businesses/${encodeURIComponent(id)}`,
{
method: "GET",
cache: "no-store",
signal,
},
);

  const result: ApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Unable to load this business.");
  }

  if (!result.business) {
    throw new Error("The server did not return business information.");
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
  setError("");
} catch (err: unknown) {
  if (err instanceof Error && err.name === "AbortError") {
    return;
  }

  setError(
    err instanceof Error
      ? err.message
      : "An unexpected error occurred while loading the business.",
  );
} finally {
  if (!signal.aborted) {
    setLoading(false);
  }
}

}, [id]);

useEffect(() => {
const controller = new AbortController();


queueMicrotask(() => {
  if (!controller.signal.aborted) {
    void loadBusiness(controller.signal);
  }
});

return () => {
  controller.abort();
};


}, [loadBusiness]);

function updateField<K extends keyof FormData>(
field: K,
value: FormData[K],
) {
setForm((current) => ({
...current,
[field]: value,
}));


setSuccess("");


}

function validateForm(): string | null {
if (!form.name.trim()) {
return "Business name is required.";
}

if (form.name.trim().length < 2) {
  return "Business name must contain at least 2 characters.";
}

if (
  form.email.trim() &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
) {
  return "Please enter a valid email address.";
}

if (form.website.trim()) {
  try {
    const websiteToCheck = /^https?:\/\//i.test(form.website.trim())
      ? form.website.trim()
      : `https://${form.website.trim()}`;

    new URL(websiteToCheck);
  } catch {
    return "Please enter a valid website address.";
  }
}

return null;

}

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        category_id: form.category_id || null,
        city_id: form.city_id || null,
      }),
    },
  );

  const result: ApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Unable to save business changes.");
  }

  setSuccess("Business details updated successfully.");
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
return ( <main className="mx-auto max-w-4xl px-4 py-12"> <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"> <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" /> <p className="text-sm text-gray-600">
Loading business information... </p> </div> </main>
);
}

if (error && !form.name) {
return ( <main className="mx-auto max-w-4xl px-4 py-12"> <div className="rounded-2xl border border-red-200 bg-red-50 p-6"> <h1 className="text-xl font-bold text-red-900">
Unable to load business </h1>
      <p className="mt-2 text-sm text-red-700">{error}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Try Again
        </button>

        <Link
          href="/dashboard/businesses"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to My Businesses
        </Link>
      </div>
    </div>
  </main>
);

}

return ( <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"> <div className="mb-8"> <Link
       href="/dashboard/businesses"
       className="text-sm font-medium text-gray-600 hover:text-gray-950"
     >
← Back to My Businesses </Link>
    <div className="mt-5">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Business Dashboard
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
        Edit Business
      </h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Update your business information so customers can find and contact
        you.
      </p>
    </div>
  </div>

  <div className="mb-6 grid gap-3 sm:grid-cols-2">
    <Link
      href={`/dashboard/businesses/${encodeURIComponent(id)}/photos`}
      className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-400 hover:shadow-sm"
    >
      <span className="block font-semibold text-gray-950">
        Manage Photos
      </span>
      <span className="mt-1 block text-sm text-gray-600">
        Upload photos and choose your cover image.
      </span>
    </Link>

    <Link
      href={`/dashboard/businesses/${encodeURIComponent(id)}/hours`}
      className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-400 hover:shadow-sm"
    >
      <span className="block font-semibold text-gray-950">
        Opening Hours
      </span>
      <span className="mt-1 block text-sm text-gray-600">
        Set your weekly business hours.
      </span>
    </Link>
  </div>

  <form
    onSubmit={handleSubmit}
    className="space-y-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
  >
    {error && (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
      </div>
    )}

    {success && (
      <div
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {success}
      </div>
    )}

    <section>
      <h2 className="text-lg font-bold text-gray-950">
        Basic Information
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Tell customers what your business is called and what you offer.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Business Name <span className="text-red-600">*</span>
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={150}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Addis Coffee House"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={5000}
            value={form.description}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
            placeholder="Describe your business, products, and services..."
            className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />

          <p className="mt-1 text-right text-xs text-gray-500">
            {form.description.length}/5000
          </p>
        </div>
      </div>
    </section>

    <section className="border-t border-gray-100 pt-8">
      <h2 className="text-lg font-bold text-gray-950">
        Category and Location
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Help customers find your business in the right category and city.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category_id"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Category
          </label>

          <select
            id="category_id"
            name="category_id"
            value={form.category_id}
            onChange={(event) =>
              updateField("category_id", event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Select a category</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="city_id"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            City
          </label>

          <select
            id="city_id"
            name="city_id"
            value={form.city_id}
            onChange={(event) =>
              updateField("city_id", event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Select a city</option>

            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Street Address
          </label>

          <input
            id="address"
            name="address"
            type="text"
            maxLength={300}
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Street, neighborhood, or building"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>
    </section>

    <section className="border-t border-gray-100 pt-8">
      <h2 className="text-lg font-bold text-gray-950">
        Contact Information
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Provide contact details so customers can reach your business.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Phone Number
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={50}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+251 9XX XXX XXX"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Email Address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="hello@example.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="website"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Website
          </label>

          <input
            id="website"
            name="website"
            type="text"
            maxLength={500}
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter a domain such as example.com or a full website URL.
          </p>
        </div>
      </div>
    </section>

    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-between">
      <Link
        href="/dashboard/businesses"
        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        Cancel
      </Link>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving Changes..." : "Save Changes"}
      </button>
    </div>
  </form>
</main>
);
}
