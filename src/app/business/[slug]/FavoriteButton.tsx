"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
  businessId: string;
};

export default function FavoriteButton({
  businessId,
}: FavoriteButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteStatus() {
      try {
        const supabase = createClient();

        // Read the current session first. A signed-out visitor is normal.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          if (isMounted) {
            setIsLoggedIn(false);
            setIsFavorite(false);
            setIsLoading(false);
          }
          return;
        }

        const user = session.user;

        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("business_id", businessId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (isMounted) {
          setIsLoggedIn(true);
          setIsFavorite(Boolean(data));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Unable to load favorite status:", error);

        if (isMounted) {
          setMessage("Unable to load favorite status. Please refresh.");
          setIsLoading(false);
        }
      }
    }

    void loadFavoriteStatus();

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  async function toggleFavorite() {
    if (!isLoggedIn || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        setIsLoggedIn(false);
        setIsFavorite(false);
        setMessage("Please sign in to save your favorite businesses.");
        return;
      }

      const user = session.user;

      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("business_id", businessId);

        if (error) {
          throw error;
        }

        setIsFavorite(false);
        setMessage("Removed from your favorites.");
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          business_id: businessId,
        });

        if (error) {
          throw error;
        }

        setIsFavorite(true);
        setMessage("Added to your favorites!");
      }
    } catch (error) {
      console.error("Unable to update favorite:", error);

      setMessage("Could not update favorites. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="h-12 w-full animate-pulse rounded-xl bg-slate-200"
        aria-label="Loading favorite button"
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-center font-semibold text-orange-700 transition hover:bg-orange-50"
        >
          <span aria-hidden="true">♡</span>
          Sign in to save favorites
        </Link>

        {message && (
          <p role="status" className="text-sm text-red-600">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={isSaving}
        aria-pressed={isFavorite}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isFavorite
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
        }`}
      >
        <span aria-hidden="true">
          {isSaving ? "⏳" : isFavorite ? "♥" : "♡"}
        </span>

        {isSaving
          ? "Saving..."
          : isFavorite
            ? "Saved to Favorites"
            : "Add to Favorites"}
      </button>

      {message && (
        <p
          role="status"
          className={`text-sm ${
            message.startsWith("Could not")
              ? "text-red-600"
              : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}