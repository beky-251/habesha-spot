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
  Clock3,
  LoaderCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

type BusinessHour = {
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
};

type ApiResponse = {
  business?: {
    id: string;
    name: string;
  };
  hours?: BusinessHour[];
  error?: string;
  message?: string;
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

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function createDefaultSchedule(): DaySchedule[] {
  return DAYS.map((day, index) => ({
    day_of_week: index,
    day,
    opens_at: "09:00",
    closes_at: "17:00",
    is_closed: index === 0,
  }));
}

function normalizeTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
}

export default function BusinessHoursPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessId = params.id;

  const [businessName, setBusinessName] = useState("");
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    createDefaultSchedule,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadHours = useCallback(
    async (signal: AbortSignal) => {
      try {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const [businessResponse, hoursResponse] = await Promise.all([
          fetch(
            `/api/businesses/${encodeURIComponent(businessId)}`,
            {
              cache: "no-store",
              signal,
            },
          ),
          fetch(
            `/api/businesses/${encodeURIComponent(businessId)}/hours`,
            {
              cache: "no-store",
              signal,
            },
          ),
        ]);

        const [businessResult, hoursResult] = await Promise.all([
          readResponse(businessResponse),
          readResponse(hoursResponse),
        ]);

        if (signal.aborted) return;

        if (
          businessResponse.status === 401 ||
          hoursResponse.status === 401
        ) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent(
              `/dashboard/businesses/${businessId}/hours`,
            )}`,
          );
          return;
        }

        if (!businessResponse.ok) {
          throw new Error(
            businessResult.error || "Unable to load your business.",
          );
        }

        if (!hoursResponse.ok) {
          throw new Error(
            hoursResult.error || "Unable to load opening hours.",
          );
        }

        if (!businessResult.business) {
          throw new Error(
            "The server did not return your business information.",
          );
        }

        setBusinessName(businessResult.business.name);

        const savedHours = hoursResult.hours ?? [];
        const defaults = createDefaultSchedule();

        const mergedSchedule = defaults.map((day) => {
          const savedDay = savedHours.find(
            (hour) => hour.day_of_week === day.day_of_week,
          );

          if (!savedDay) return day;

          return {
            ...day,
            opens_at: normalizeTime(savedDay.opens_at) || "09:00",
            closes_at: normalizeTime(savedDay.closes_at) || "17:00",
            is_closed: savedDay.is_closed,
          };
        });

        setSchedule(mergedSchedule);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        if (!signal.aborted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load opening hours.",
          );
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [businessId, router],
  );

  useEffect(() => {
    const controller = new AbortController();

    // Schedule the initial state updates outside the effect's synchronous
    // execution to avoid React's set-state-in-effect lint warning.
    const timer = window.setTimeout(() => {
      void loadHours(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadHours, reloadKey]);

  function updateDay(
    dayOfWeek: number,
    changes: Partial<DaySchedule>,
  ) {
    setSchedule((current) =>
      current.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, ...changes }
          : day,
      ),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  function validateSchedule(): string | null {
    if (schedule.length !== 7) {
      return "Please configure all seven days of the week.";
    }

    const dayNumbers = new Set(
      schedule.map((day) => day.day_of_week),
    );

    if (
      dayNumbers.size !== 7 ||
      DAYS.some(
        (_, index) => !dayNumbers.has(index),
      )
    ) {
      return "The weekly schedule is incomplete. Reload the page and try again.";
    }

    for (const day of schedule) {
      if (day.is_closed) continue;

      if (!day.opens_at || !day.closes_at) {
        return `Select opening and closing times for ${day.day}.`;
      }

      if (day.opens_at === day.closes_at) {
        return `${day.day}: opening and closing times cannot be the same.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateSchedule();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/hours`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hours: schedule.map((day) => ({
              day_of_week: day.day_of_week,
              opens_at: day.is_closed ? null : day.opens_at,
              closes_at: day.is_closed ? null : day.closes_at,
              is_closed: day.is_closed,
            })),
          }),
        },
      );

      const result = await readResponse(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(
            `/dashboard/businesses/${businessId}/hours`,
          )}`,
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to save opening hours.",
        );
      }

      setSuccessMessage(
        result.message || "Opening hours saved successfully.",
      );

      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving opening hours.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto h-9 w-9 animate-spin text-orange-500"
            aria-hidden="true"
          />
          <p className="mt-4 font-semibold text-slate-800">
            Loading opening hours...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Please wait while we retrieve your weekly schedule.
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage && !businessName) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <AlertCircle
            className="h-10 w-10 text-red-500"
            aria-hidden="true"
          />

          <h1 className="mt-4 text-2xl font-extrabold text-[#0B132B]">
            Unable to load opening hours
          </h1>

          <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
            {errorMessage}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="rounded-xl bg-[#0B132B] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try again
            </button>

            <Link
              href="/dashboard/businesses"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              My businesses
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
          href={`/dashboard/businesses/${encodeURIComponent(businessId)}/edit`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to edit business
        </Link>

        <header className="mb-8 mt-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Clock3 className="h-7 w-7" aria-hidden="true" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            HabeshaSpot Business Dashboard
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B132B] sm:text-4xl">
            Opening hours
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Set the weekly schedule for{" "}
            <span className="font-bold text-slate-900">
              {businessName}
            </span>
            . Customers can use these hours to plan their visit.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <p>{successMessage}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex items-start gap-3">
            <CalendarDays
              className="mt-1 h-5 w-5 text-orange-500"
              aria-hidden="true"
            />

            <div>
              <h2 className="text-lg font-bold text-[#0B132B]">
                Weekly schedule
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Set opening and closing times for each day. Mark a day
                as closed when your business does not operate.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {schedule.map((day) => (
              <section
                key={day.day_of_week}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        day.is_closed
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {day.day.slice(0, 2)}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        {day.day}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {day.is_closed
                          ? "Closed"
                          : `${day.opens_at} – ${day.closes_at}`}
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={day.is_closed}
                      disabled={saving}
                      onChange={(event) =>
                        updateDay(day.day_of_week, {
                          is_closed: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-orange-600 focus:ring-orange-500"
                    />
                    Closed all day
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`opens-${day.day_of_week}`}
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Opening time
                    </label>

                    <input
                      id={`opens-${day.day_of_week}`}
                      type="time"
                      value={day.opens_at}
                      disabled={saving || day.is_closed}
                      onChange={(event) =>
                        updateDay(day.day_of_week, {
                          opens_at: event.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`closes-${day.day_of_week}`}
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Closing time
                    </label>

                    <input
                      id={`closes-${day.day_of_week}`}
                      type="time"
                      value={day.closes_at}
                      disabled={saving || day.is_closed}
                      onChange={(event) =>
                        updateDay(day.day_of_week, {
                          closes_at: event.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/dashboard/businesses/${encodeURIComponent(businessId)}/edit`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}

              {saving ? "Saving hours..." : "Save opening hours"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Only enter hours that reflect your actual business schedule.
          You can update them whenever your opening times change.
        </p>
      </div>
    </main>
  );
}