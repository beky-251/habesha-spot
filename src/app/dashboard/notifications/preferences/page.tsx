"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  LoaderCircle,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NotificationPreferences = {
  new_review: boolean;
  review_approved: boolean;
  review_rejected: boolean;
  new_reply: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_review: true,
  review_approved: true,
  review_rejected: true,
  new_reply: true,
};

const PREFERENCE_OPTIONS: {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: "new_review",
    title: "New customer reviews",
    description:
      "Receive notifications when customers submit reviews for your businesses.",
  },
  {
    key: "review_approved",
    title: "Approved reviews",
    description:
      "Receive notifications when an administrator approves a review.",
  },
  {
    key: "review_rejected",
    title: "Rejected reviews",
    description:
      "Receive notifications when an administrator rejects a review.",
  },
  {
    key: "new_reply",
    title: "Replies to your reviews",
    description:
      "Receive notifications when a business owner replies to your review.",
  },
];

export default function NotificationPreferencesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage("Please sign in to manage your notification preferences.");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("notification_preferences")
        .select(
          "new_review, review_approved, review_rejected, new_reply",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load preferences:", error.message);
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        setPreferences({
          new_review: data.new_review,
          review_approved: data.review_approved,
          review_rejected: data.review_rejected,
          new_reply: data.new_reply,
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      console.error("Notification preferences error:", error);
      setErrorMessage("Unable to load your preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPreferences();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPreferences]);

  function togglePreference(key: keyof NotificationPreferences) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));

    setSuccessMessage("");
    setErrorMessage("");
  }

  async function savePreferences() {
    if (!userId) {
      setErrorMessage("Please sign in before saving your preferences.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            ...preferences,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        console.error("Failed to save preferences:", error.message);
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Your notification preferences have been saved.");
    } catch (error) {
      console.error("Save notification preferences error:", error);
      setErrorMessage("Unable to save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to notifications
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Bell className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Notification preferences
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose which activity notifications you want to receive on
              HabeshaSpot.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <Check className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-slate-950">
            Activity notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Changes are saved only when you select Save preferences.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading your preferences...
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {PREFERENCE_OPTIONS.map((option) => {
              const enabled = preferences[option.key];

              return (
                <div
                  key={option.key}
                  className="flex items-center justify-between gap-5 px-5 py-5 sm:px-6"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      {option.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {option.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={option.title}
                    onClick={() => togglePreference(option.key)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                      enabled ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs leading-5 text-slate-500">
            You can change these preferences at any time.
          </p>

          <button
            type="button"
            onClick={() => void savePreferences()}
            disabled={loading || saving || !userId}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm leading-6 text-amber-900">
          <strong>Important:</strong> This page saves your preferences.
          In the next step, we will connect these settings to the database
          notification triggers so disabled notification types are actually
          suppressed.
        </p>
      </div>
    </div>
  );
}