"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = {
id: string;
name: string;
};

type City = {
id: string;
name: string;
};

export default function CreateBusinessPage() {
const router = useRouter();

const [categories, setCategories] = useState<Category[]>([]);
const [cities, setCities] = useState<City[]>([]);
const [loadingOptions, setLoadingOptions] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [errorMessage, setErrorMessage] = useState("");
const [successMessage, setSuccessMessage] = useState("");

const [form, setForm] = useState({
name: "",
category_id: "",
city_id: "",
description: "",
address: "",
phone: "",
email: "",
website: "",
});

useEffect(() => {
let cancelled = false;

async function loadOptions() {
  try {
    const supabase = createClient();

    const [categoryResult, cityResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cities")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (cancelled) return;

    if (categoryResult.error) throw categoryResult.error;
    if (cityResult.error) throw cityResult.error;

    setCategories(categoryResult.data ?? []);
    setCities(cityResult.data ?? []);
  } catch (error) {
    if (!cancelled) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load categories and cities.",
      );
    }
  } finally {
    if (!cancelled) setLoadingOptions(false);
  }
}

void loadOptions();

return () => {
  cancelled = true;
};

}, []);

function updateField(
event: React.ChangeEvent<
HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>,
) {
const { name, value } = event.target;
setForm((current) => ({ ...current, [name]: value }));
}

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setErrorMessage("");
setSuccessMessage("");

const businessName = form.name.trim();

if (!businessName || !form.category_id || !form.city_id) {
  setErrorMessage("Business name, category, and city are required.");
  return;
}

setSubmitting(true);

try {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    router.push("/login?next=/business");
    return;
  }

  const { data: business, error: insertError } = await supabase
    .from("businesses")
    .insert({
      owner_user_id: user.id,
      name: businessName,
      category_id: form.category_id,
      city_id: form.city_id,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      slug: `${businessName
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45)}-${crypto.randomUUID().slice(0, 8)}`,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  if (!business) {
    throw new Error("The business was not created. Please try again.");
  }

  setSuccessMessage(
    "Your business has been submitted successfully for review.",
  );

  router.push("/dashboard");
  router.refresh();
} catch (error) {
  setErrorMessage(
    error instanceof Error
      ? error.message
      : "Unable to submit your business. Please try again.",
  );
} finally {
  setSubmitting(false);
}

}

return ( <main className="min-h-screen bg-[#faf8f5] px-4 py-10 sm:px-6"> <div className="mx-auto max-w-3xl"> <Link
       href="/dashboard"
       className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#75452e]"
     > <ArrowLeft className="h-4 w-4" />
Back to dashboard </Link>
    <div className="mb-8">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe3d9] text-[#75452e]">
        <Store className="h-7 w-7" />
      </div>

      <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#75452e]">
        Grow with HabeshaSpot
      </p>

      <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
        Add your business
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
        Introduce your business to customers searching for great local
        places in Ethiopia. Your listing will be reviewed before it becomes
        publicly visible.
      </p>
    </div>

    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-stone-800"
        >
          Business name *
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          value={form.name}
          onChange={updateField}
          placeholder="e.g. Buna House"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category_id"
            className="mb-2 block text-sm font-semibold text-stone-800"
          >
            Category *
          </label>
          <select
            id="category_id"
            name="category_id"
            required
            value={form.category_id}
            onChange={updateField}
            disabled={loadingOptions}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-[#75452e] disabled:opacity-60"
          >
            <option value="">
              {loadingOptions ? "Loading categories..." : "Choose category"}
            </option>
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
            className="mb-2 block text-sm font-semibold text-stone-800"
          >
            City *
          </label>
          <select
            id="city_id"
            name="city_id"
            required
            value={form.city_id}
            onChange={updateField}
            disabled={loadingOptions}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-[#75452e] disabled:opacity-60"
          >
            <option value="">
              {loadingOptions ? "Loading cities..." : "Choose city"}
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-semibold text-stone-800"
        >
          Business description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={3000}
          value={form.description}
          onChange={updateField}
          placeholder="Tell customers what makes your business special..."
          className="w-full resize-y rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
        />
      </div>

      <div>
        <label
          htmlFor="address"
          className="mb-2 block text-sm font-semibold text-stone-800"
        >
          Street address
        </label>
        <input
          id="address"
          name="address"
          maxLength={300}
          value={form.address}
          onChange={updateField}
          placeholder="Building, street, or neighborhood"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-semibold text-stone-800"
          >
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={40}
            value={form.phone}
            onChange={updateField}
            placeholder="+251..."
            className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-stone-800"
          >
            Business email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            value={form.email}
            onChange={updateField}
            placeholder="hello@example.com"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="website"
          className="mb-2 block text-sm font-semibold text-stone-800"
        >
          Website
        </label>
        <input
          id="website"
          name="website"
          type="url"
          maxLength={500}
          value={form.website}
          onChange={updateField}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/15"
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      <div className="border-t border-stone-100 pt-5">
        <button
          type="submit"
          disabled={submitting || loadingOptions}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#75452e] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#593321] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting && (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          )}
          {submitting ? "Submitting..." : "Submit business for review"}
        </button>

        <p className="mt-3 text-xs leading-5 text-stone-500">
          Fields marked * are required. Your business should only become
          public after approval.
        </p>
      </div>
    </form>
  </div>
</main>
);
}
