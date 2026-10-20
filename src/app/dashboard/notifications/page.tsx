"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type NotificationType =
  | "general"
  | "new_review"
  | "review_approved"
  | "review_rejected"
  | "new_reply";

type Notification = {
  id: string;
  user_id: string;
  business_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const PAGE_SIZE = 100;

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "new_review":
      return Star;
    case "review_approved":
      return ShieldCheck;
    case "review_rejected":
      return XCircle;
    case "new_reply":
      return MessageSquare;
    default:
      return Bell;
  }
}

function getNotificationStyle(type: NotificationType) {
  switch (type) {
    case "new_review":
      return "bg-amber-50 text-amber-700";
    case "review_approved":
      return "bg-emerald-50 text-emerald-700";
    case "review_rejected":
      return "bg-red-50 text-red-700";
    case "new_reply":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getSafeNotificationLink(link: string | null) {
  if (!link || !link.startsWith("/") || link.startsWith("//")) {
    return null;
  }

  return link;
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const supabase = createClient();

  const loadNotifications = useCallback(async () => {
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

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(
          "id, user_id, business_id, title, message, type, link, is_read, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (queryError) {
        console.error(
          "Notifications Supabase error:",
          JSON.stringify(queryError, Object.getOwnPropertyNames(queryError), 2),
        );

        console.error("Notifications error message:", queryError.message);
        console.error("Notifications error code:", queryError.code);
        console.error("Notifications error details:", queryError.details);
        console.error("Notifications error hint:", queryError.hint);

        setError(
          queryError.message ||
            "Unable to load notifications. Please try again.",
        );

        setNotifications([]);
        return;
      }

      setNotifications((data ?? []) as Notification[]);
    } catch (err) {
      console.error("Failed to load notifications:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  async function markAsRead(notification: Notification) {
    if (notification.is_read || updatingId) {
      return;
    }

    setUpdatingId(notification.id);
    setError("");

    const previousNotifications = notifications;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      setNotifications(previousNotifications);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notification as read.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    setMarkingAll(true);
    setError("");

    const previousNotifications = notifications;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      })),
    );

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      setNotifications(previousNotifications);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: Notification) {
    if (!notification.is_read) {
      await markAsRead(notification);
    }

    const destination = getSafeNotificationLink(notification.link);

    if (destination) {
      router.push(destination);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#FF6B00]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Back to dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#0B132B] to-[#172554] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Bell size={27} aria-hidden="true" />
                </div>

                <div>
                  <h1 className="text-2xl font-extrabold sm:text-3xl">
                    Notifications
                  </h1>

                  <p className="mt-2 text-sm text-slate-300">
                    Stay updated on your business activity.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/notifications/preferences"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                Notification settings
              </Link>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || markingAll || loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0B132B] transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCheck size={17} aria-hidden="true" />
                )}
                Mark all as read
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[#E2E8F0] p-5 sm:p-7">
            <div className="rounded-2xl bg-[#F8FAFC] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#64748B]">
                <Bell size={17} aria-hidden="true" />
                Total notifications
              </div>

              <p className="mt-3 text-3xl font-extrabold text-[#0B132B]">
                {notifications.length}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <Clock size={17} aria-hidden="true" />
                Unread notifications
              </div>

              <p className="mt-3 text-3xl font-extrabold text-amber-700">
                {unreadCount}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-6 sm:px-7">
            <div>
              <h2 className="text-lg font-bold text-[#0B132B]">
                Recent activity
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                Your latest 100 notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadNotifications()}
              disabled={loading}
              aria-label="Refresh notifications"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition hover:border-amber-400 hover:text-[#FF6B00] disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
                aria-hidden="true"
              />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-7"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="mt-2 font-bold underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <LoaderCircle
                  size={34}
                  className="animate-spin text-[#FF6B00]"
                  aria-hidden="true"
                />

                <p className="mt-4 font-semibold text-[#0B132B]">
                  Loading notifications...
                </p>

                <p className="mt-2 text-sm text-[#64748B]">
                  Please wait a moment.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FAFBFD] px-5 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Inbox size={31} aria-hidden="true" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#0B132B]">
                  You&apos;re all caught up!
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-[#64748B]">
                  When customers submit reviews or an administrator updates
                  their status, your notifications will appear here.
                </p>

                <Link
                  href="/dashboard/reviews"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E85F00]"
                >
                  <Star size={17} aria-hidden="true" />
                  View customer reviews
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconStyle = getNotificationStyle(notification.type);
                  const destination = getSafeNotificationLink(
                    notification.link,
                  );

                  return (
                    <article
                      key={notification.id}
                      className={`rounded-2xl border p-4 transition sm:p-5 ${
                        notification.is_read
                          ? "border-[#E2E8F0] bg-white"
                          : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                        >
                          <Icon size={21} aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-[#0B132B]">
                              {notification.title}
                            </h3>

                            {!notification.is_read && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                New
                              </span>
                            )}
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#475569]">
                            {notification.message}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-[#64748B]">
                            <Clock size={14} aria-hidden="true" />
                            <time dateTime={notification.created_at}>
                              {formatDate(notification.created_at)}
                            </time>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {destination && (
                              <button
                                type="button"
                                onClick={() =>
                                  void openNotification(notification)
                                }
                                disabled={updatingId === notification.id}
                                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0B132B] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#172554] disabled:opacity-50"
                              >
                                Open notification
                              </button>
                            )}

                            {!notification.is_read && (
                              <button
                                type="button"
                                onClick={() => void markAsRead(notification)}
                                disabled={updatingId === notification.id}
                                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#475569] transition hover:border-amber-400 hover:text-[#B45309] disabled:opacity-50"
                              >
                                {updatingId === notification.id ? (
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Check size={14} aria-hidden="true" />
                                )}
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] bg-[#FAFBFD] px-5 py-4 sm:px-7">
            <p className="text-xs leading-5 text-[#64748B]">
              Notifications are private to your account. Only notifications
              permitted by your Supabase security policies can be viewed or
              updated.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
