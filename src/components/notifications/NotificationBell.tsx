"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Failed to load unread notification count:",
          error.message,
        );
        setLoading(false);
        return;
      }

      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error("Notification bell error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadUnreadCount();
      }
    }, 0);

    async function subscribeToNotifications() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled || error || !user) {
        return;
      }

      channel = supabase
        .channel(`notification-bell-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!cancelled) {
              void loadUnreadCount();
            }
          },
        )
        .subscribe((status: string) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Notification bell could not subscribe to Supabase Realtime.",
            );
          }
        });
    }

    void subscribeToNotifications();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadUnreadCount]);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      title={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-[#FFB300]/40 hover:bg-white/10"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />

      {!loading && unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0B132B]">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      <span className="sr-only">
        {loading
          ? "Loading notification count"
          : `${unreadCount} unread notifications`}
      </span>
    </Link>
  );
}