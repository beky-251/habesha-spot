"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  LoaderCircle,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BusinessHours = {
  id?: string;
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type DaySchedule = {
  day_of_week: number;
  day: string;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
  existingId?: string;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function createDefaultSchedule(): DaySchedule[] {
  return DAYS.map((day, index) => ({
    day_of_week: index,
    day,
    opens_at: "09:00",
    closes_at: "17:00",
    is_closed: index === 0,
  }));
}

function normalizeTime(value: string | null): string {
  if (!value) return "";

  return value.slice(0, 5);
}

export default function BusinessHoursPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessId = params.id;

  const [businessName, setBusinessName] = useState("");
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    createDefaultSchedule
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: business, error: businessError } =
          await supabase
            .from("businesses")
            .select("id, name")
            .eq("id", businessId)
            .eq("owner_user_id", user.id)
            .maybeSingle();

        if (businessError) throw businessError;

        if (!business) {
          throw new Error(
            "Business not found, or you do not have permission to manage it."
          );
        }

        const { data: hours, error: hoursError } =
          await supabase
            .from("business_hours")
            .select(
              "id, business_id, day_of_week, opens_at, closes_at, is_closed"
            )
            .eq("business_id", businessId)
            .order("day_of_week");

        if (hoursError) throw hoursError;

        if (cancelled) return;

        setBusinessName(business.name);

        const existingHours = (hours ?? []) as BusinessHours[];
        const defaults = createDefaultSchedule();

        const updatedSchedule = defaults.map((day) => {
          const existing = existingHours.find(
            (item) => item.day_of_week === day.day_of_week
          );

          if (!existing) return day;

          return {
            ...day,
            existingId: existing.id,
            opens_at:
              normalizeTime(existing.opens_at) || "09:00",
            closes_at:
              normalizeTime(existing.closes_at) || "17:00",
            is_closed: existing.is_closed,
          };
        });

        setSchedule(updatedSchedule);
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load business hours:", error);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load business hours."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [businessId, router]);

  function updateDay(
    dayOfWeek: number,
    changes: Partial<DaySchedule>
  ) {
    setSchedule((current) =>
      current.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, ...changes }
          : day
      )
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    for (const day of schedule) {
      if (day.is_closed) continue;

      if (!day.opens_at || !day.closes_at) {
        setErrorMessage(
          `Please select opening and closing times for ${day.day}.`
        );
        return;
      }

      if (day.opens_at === day.closes_at) {
        setErrorMessage(
          `${day.day}: opening and closing times cannot be the same.`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      // Confirm ownership before writing any opening hours.
      const { data: business, error: businessError } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .eq("owner_user_id", user.id)
          .maybeSingle();

      if (businessError) throw businessError;

      if (!business) {
        throw new Error(
          "You do not have permission to update this business."
        );
      }

      // Save each day separately so this does not depend on a
      // composite upsert constraint being present.
      for (const day of schedule) {
        const values = {
          business_id: businessId,
          day_of_week: day.day_of_week,
          opens_at: day.is_closed ? null : day.opens_at,
          closes_at: day.is_closed ? null : day.closes_at,
          is_closed: day.is_closed,
        };

        if (day.existingId) {
          const { error } = await supabase
            .from("business_hours")
            .update(values)
            .eq("id", day.existingId)
            .eq("business_id", businessId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("business_hours")
            .insert(values);

          if (error) throw error;
        }
      }

      setSuccessMessage("Your business hours have been saved.");

      // Refresh the page data and retrieve any newly created row IDs.
      router.refresh();

      const { data: savedHours, error: reloadError } =
        await supabase
          .from("business_hours")
          .select(
            "id, business_id, day_of_week, opens_at, closes_at, is_closed"
          )
          .eq("business_id", businessId)
          .order("day_of_week");

      if (reloadError) throw reloadError;

      const saved = (savedHours ?? []) as BusinessHours[];

      setSchedule((current) =>
        current.map((day) => {
          const record = saved.find(
            (item) => item.day_of_week === day.day_of_week
          );

          return record
            ? { ...day, existingId: record.id }
            : day;
        })
      );
    } catch (error) {
      console.error("Unable to save business hours:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save business hours."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
        Loading business hours...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#75452e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe3d9] text-[#75452e]">
            <Clock3 className="h-7 w-7" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Business opening hours
          </h1>

          <p className="mt-3 text-stone-600">
            Set the weekly opening schedule for{" "}
            <span className="font-bold text-stone-900">
              {businessName}
            </span>
            .
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-stone-900">
              Weekly schedule
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Choose the opening and closing time for each day.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {schedule.map((day) => (
              <div
                key={day.day_of_week}
                className="grid gap-4 py-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="font-semibold text-stone-900">
                    {day.day}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {day.is_closed ? "Closed" : "Open"}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`open-${day.day_of_week}`}
                    className="mb-1 block text-xs font-semibold text-stone-500"
                  >
                    Opens
                  </label>

                  <input
                    id={`open-${day.day_of_week}`}
                    type="time"
                    value={day.opens_at}
                    disabled={day.is_closed || saving}
                    onChange={(event) =>
                      updateDay(day.day_of_week, {
                        opens_at: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`close-${day.day_of_week}`}
                    className="mb-1 block text-xs font-semibold text-stone-500"
                  >
                    Closes
                  </label>

                  <input
                    id={`close-${day.day_of_week}`}
                    type="time"
                    value={day.closes_at}
                    disabled={day.is_closed || saving}
                    onChange={(event) =>
                      updateDay(day.day_of_week, {
                        closes_at: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    disabled={saving}
                    onChange={(event) =>
                      updateDay(day.day_of_week, {
                        is_closed: event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-stone-300 accent-[#75452e]"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-100 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#75452e] px-6 py-3 font-bold text-white transition hover:bg-[#593321] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Saving hours..." : "Save opening hours"}
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}