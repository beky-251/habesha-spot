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

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(
          "id, title, message, type, business_id, is_read, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (queryError) throw queryError;

      setNotifications((data ?? []) as Notification[]);
      setError(null);
    } catch (err) {
      console.error("Unable to load dashboard notifications:", err);
      setError("Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please sign in to update notifications.");
      return;
    }

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (updateError) {
      setError("Could not mark the notification as read.");
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Recent notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Updates about your business listings.
          </p>
        </div>

        {unreadCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {unreadCount} unread
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Loading notifications...
        </p>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadNotifications();
            }}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
          <p className="text-2xl" aria-hidden="true">
            🔔
          </p>
          <p className="mt-2 font-medium text-slate-800">
            No notifications yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Updates about your business will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`py-4 first:pt-0 last:pb-0 ${
                !notification.is_read ? "bg-emerald-50/50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 text-xl"
                  aria-hidden="true"
                >
                  {notification.type === "business_approved"
                    ? "✅"
                    : notification.type === "business_rejected"
                      ? "⚠️"
                      : notification.type === "review_received"
                        ? "⭐"
                        : "🔔"}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {notification.title}
                    </h3>

                    {!notification.is_read && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        New
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {notification.business_id && (
                      <Link
                        href="/dashboard/businesses"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        View my businesses
                      </Link>
                    )}

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification.id)}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          href="/notifications"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          View all notifications →
        </Link>
      </div>
    </section>
  );
}