"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setSignedIn(false);
        setUnreadCount(0);
        return;
      }

      setSignedIn(true);

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Unable to load unread notifications:", error);
        return;
      }

      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error("Notification bell error:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadUnreadCount();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void loadUnreadCount();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notification-bell-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          void loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadUnreadCount]);

  if (!signedIn) {
    return null;
  }

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications, ${unreadCount} unread`}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl transition hover:bg-slate-50"
    >
      <span aria-hidden="true">🔔</span>

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}