"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
businessId: string;
className?: string;
};

export default function FavoriteButton({
businessId,
className = "",
}: FavoriteButtonProps) {
const router = useRouter();

const [isFavorite, setIsFavorite] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [userId, setUserId] = useState<string | null>(null);
const [errorMessage, setErrorMessage] = useState("");

const loadFavorite = useCallback(async () => {
const supabase = createClient();

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  setUserId(null);
  setIsFavorite(false);
  setIsLoading(false);
  return;
}

setUserId(user.id);

const { data, error } = await supabase
  .from("favorites")
  .select("id")
  .eq("user_id", user.id)
  .eq("business_id", businessId)
  .maybeSingle();

if (error) {
  console.error("Could not load favorite:", error.message);
  setErrorMessage("Could not load favorite status.");
} else {
  setIsFavorite(Boolean(data));
}

setIsLoading(false);


}, [businessId]);

useEffect(() => {
let active = true;

async function load() {
  await loadFavorite();
}

void load().finally(() => {
  if (!active) return;
});

return () => {
  active = false;
};

}, [loadFavorite]);

async function handleFavoriteClick() {
if (isLoading || isSaving) return;

setErrorMessage("");

if (!userId) {
  const currentPath = window.location.pathname + window.location.search;

  router.push(
    `/login?redirectTo=${encodeURIComponent(currentPath)}`
  );

  return;
}

setIsSaving(true);

try {
  const supabase = createClient();

  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("business_id", businessId);

    if (error) throw error;

    setIsFavorite(false);
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      business_id: businessId,
    });

    if (error) throw error;

    setIsFavorite(true);
  }
} catch (error) {
  console.error("Could not update favorite:", error);

  setErrorMessage("Could not update favorite. Please try again.");
} finally {
  setIsSaving(false);
}


}

return ( <div className={className}>
<button
type="button"
onClick={handleFavoriteClick}
disabled={isLoading || isSaving}
aria-label={
isFavorite ? "Remove from favorites" : "Add to favorites"
}
aria-pressed={isFavorite}
title={
isFavorite ? "Remove from favorites" : "Add to favorites"
}
className={`inline-flex items-center justify-center gap-2 rounded-full border p-3 transition ${
          isFavorite
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-500"
        } ${
          isLoading || isSaving
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }`}
>
<Heart
size={20}
fill={isFavorite ? "currentColor" : "none"}
aria-hidden="true"
/>

    <span className="sr-only">
      {isFavorite ? "Saved to favorites" : "Add to favorites"}
    </span>
  </button>

  {errorMessage && (
    <p role="alert" className="mt-2 text-sm text-red-600">
      {errorMessage}
    </p>
  )}
</div>

);
}
