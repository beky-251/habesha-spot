"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationCount() {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setCount(0);
      return;
    }

    const { count: unreadCount, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to load notification count:", error.message);
      return;
    }

    setCount(unreadCount ?? 0);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadCount();
      }
    }, 0);

    async function subscribe() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled || error || !user) return;

      channel = supabase
        .channel(`sidebar-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!cancelled) void loadCount();
          },
        )
        .subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadCount]);

  if (count === 0) return null;

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}