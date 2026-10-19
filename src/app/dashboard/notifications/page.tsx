"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
id: string;
user_id: string;
title: string;
message: string;
type: string | null;
business_id: string | null;
review_id: string | null;
is_read: boolean;
created_at: string;
};

function formatDate(dateString: string) {
const date = new Date(dateString);

if (Number.isNaN(date.getTime())) {
return "Date unavailable";
}

return new Intl.DateTimeFormat("en", {
dateStyle: "medium",
timeStyle: "short",
}).format(date);
}

function getNotificationLink(notification: Notification) {
if (
notification.type === "new_review" ||
notification.review_id
) {
return notification.review_id
? `/dashboard/reviews?reviewId=${encodeURIComponent(notification.review_id)}`
: "/dashboard/reviews";
}

if (notification.business_id) {
return `/dashboard/businesses/${encodeURIComponent(notification.business_id)}/edit`;
}

return "/dashboard";
}

export default function NotificationsPage() {
const [supabase] = useState(() => createClient());

const [notifications, setNotifications] = useState<Notification[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [updatingId, setUpdatingId] = useState<string | null>(null);
const [markingAll, setMarkingAll] = useState(false);

const unreadCount = notifications.filter(
(notification) => !notification.is_read,
).length;

const loadNotifications = useCallback(async () => {
setError(null);


const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  setError("Please sign in to view your notifications.");
  setNotifications([]);
  setLoading(false);
  return;
}

const { data, error: queryError } = await supabase
  .from("notifications")
  .select(
    "id, user_id, title, message, type, business_id, review_id, is_read, created_at",
  )
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

if (queryError) {
  console.error("Unable to load notifications:", queryError);
  setError("Unable to load notifications. Please try again.");
  setNotifications([]);
  setLoading(false);
  return;
}

setNotifications((data ?? []) as Notification[]);
setLoading(false);


}, [supabase]);

useEffect(() => {
let active = true;

async function initialize() {
  await loadNotifications();

  if (!active) {
    return;
  }
}

void initialize();

return () => {
  active = false;
};


}, [loadNotifications]);

async function markAsRead(notification: Notification) {
if (notification.is_read) {
return;
}


setUpdatingId(notification.id);
setError(null);

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  setError("Your session has expired. Please sign in again.");
  setUpdatingId(null);
  return;
}

const { error: updateError } = await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("id", notification.id)
  .eq("user_id", user.id);

if (updateError) {
  console.error("Unable to mark notification as read:", updateError);
  setError("Unable to update this notification.");
  setUpdatingId(null);
  return;
}

setNotifications((current) =>
  current.map((item) =>
    item.id === notification.id ? { ...item, is_read: true } : item,
  ),
);

setUpdatingId(null);


}

async function markAllAsRead() {
if (unreadCount === 0 || markingAll) {
return;
}


setMarkingAll(true);
setError(null);

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  setError("Your session has expired. Please sign in again.");
  setMarkingAll(false);
  return;
}

const { error: updateError } = await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("user_id", user.id)
  .eq("is_read", false);

if (updateError) {
  console.error("Unable to mark all notifications as read:", updateError);
  setError("Unable to mark all notifications as read.");
  setMarkingAll(false);
  return;
}

setNotifications((current) =>
  current.map((notification) => ({
    ...notification,
    is_read: true,
  })),
);

setMarkingAll(false);


}

if (loading) {
return ( <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"> <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-8"> <div className="h-7 w-56 rounded bg-gray-200" /> <div className="mt-6 h-20 rounded-xl bg-gray-100" /> <div className="mt-3 h-20 rounded-xl bg-gray-100" /> <div className="mt-3 h-20 rounded-xl bg-gray-100" /> </div> </main>
);
}

return ( <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12"> <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"> <div> <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
Your account </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        Notifications
      </h1>

      <p className="mt-2 text-sm text-gray-600">
        Keep up with reviews and updates about your businesses.
      </p>
    </div>

    <button
      type="button"
      onClick={markAllAsRead}
      disabled={unreadCount === 0 || markingAll}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {markingAll ? "Updating..." : "Mark all as read"}
    </button>
  </div>

  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-gray-900">
        Your activity
      </h2>

      <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
        {unreadCount} unread
      </span>
    </div>

    {error && (
      <div
        role="alert"
        className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}

        {notifications.length === 0 && (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadNotifications();
            }}
            className="ml-2 font-semibold underline"
          >
            Try again
          </button>
        )}
      </div>
    )}

    {!error && notifications.length === 0 && (
      <div className="py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
          🔔
        </div>

        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          You&apos;re all caught up
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">
          When something important happens with your account or businesses,
          your notifications will appear here.
        </p>

        <Link
          href="/dashboard"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 py-2 font-semibold text-white transition hover:bg-orange-700"
        >
          Go to dashboard
        </Link>
      </div>
    )}

    {notifications.length > 0 && (
      <div className="mt-5 divide-y divide-gray-100">
        {notifications.map((notification) => {
          const destination = getNotificationLink(notification);
          const isUpdating = updatingId === notification.id;

          return (
            <article
              key={notification.id}
              className={`py-5 first:pt-2 last:pb-1 ${
                notification.is_read ? "" : "bg-orange-50/60"
              }`}
            >
              <div className="flex gap-3 sm:gap-4">
                <div
                  className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                    notification.is_read
                      ? "bg-gray-100"
                      : "bg-orange-100"
                  }`}
                  aria-hidden="true"
                >
                  {notification.type === "new_review" ? "⭐" : "🔔"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>

                    {!notification.is_read && (
                      <span className="inline-block h-2 w-2 rounded-full bg-orange-600" aria-label="Unread" />
                    )}
                  </div>

                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(notification.created_at)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <Link
                      href={destination}
                      onClick={() => {
                        if (!notification.is_read) {
                          void markAsRead(notification);
                        }
                      }}
                      className="inline-flex min-h-10 items-center font-semibold text-orange-700 hover:text-orange-800 hover:underline"
                    >
                      {notification.type === "new_review" ||
                      notification.review_id
                        ? "View reviews →"
                        : notification.business_id
                          ? "View business →"
                          : "Open dashboard →"}
                    </Link>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification)}
                        disabled={isUpdating}
                        className="min-h-10 text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50"
                      >
                        {isUpdating ? "Updating..." : "Mark as read"}
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

  <div className="mt-6 text-center">
    <Link
      href="/dashboard"
      className="text-sm font-semibold text-gray-600 hover:text-orange-700"
    >
      ← Back to dashboard
    </Link>
  </div>
</main>
);
}
