"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  business_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(
          "id,title,message,type,business_id,is_read,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setNotifications((data ?? []) as Notification[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load your notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadNotifications();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function markAsRead(notificationId: string) {
    if (!userId || busyId !== null) return;

    setBusyId(notificationId);
    setError("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .eq("is_read", false);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark the notification as read."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function formatDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  }

  function notificationIcon(type: string) {
    switch (type) {
      case "business_approved":
        return "✅";
      case "business_rejected":
        return "❌";
      case "review_received":
        return "⭐";
      default:
        return "🔔";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              ← Back to HabeshaSpot
            </Link>

            <h1 className="mt-4 text-3xl font-bold">
              Notifications
            </h1>

            <p className="mt-2 text-slate-600">
              Stay updated on your businesses and account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              {unreadCount} unread
            </span>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={
                unreadCount === 0 || markingAll || loading
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? "Updating..." : "Mark all read"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading your notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-5xl" aria-hidden="true">
              🔔
            </div>

            <h2 className="mt-4 text-xl font-bold">
              You&apos;re all caught up
            </h2>

            <p className="mt-2 text-slate-600">
              New updates about your businesses will appear here.
            </p>

            <Link
              href="/business"
              className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              Explore businesses
            </Link>
          </div>
        ) : (
          <section
            aria-label="Your notifications"
            className="space-y-4"
          >
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 transition ${
                  notification.is_read
                    ? "border-slate-200 bg-white"
                    : "border-emerald-200 bg-emerald-50/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm"
                    aria-hidden="true"
                  >
                    {notificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">
                        {notification.title}
                      </h2>

                      {!notification.is_read && (
                        <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatDate(notification.created_at)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4">
                      {notification.business_id && (
                        <Link
                          href="/dashboard/businesses"
                          className="text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          View my businesses
                        </Link>
                      )}

                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() =>
                            void markAsRead(notification.id)
                          }
                          disabled={busyId !== null}
                          className="text-sm font-semibold text-slate-700 hover:underline disabled:opacity-50"
                        >
                          {busyId === notification.id
                            ? "Updating..."
                            : "Mark as read"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="mt-10 text-center text-sm text-slate-500">
          HabeshaSpot · Discover local, love local.
        </footer>
      </div>
    </main>
  );
}
