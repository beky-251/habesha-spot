"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
const router = useRouter();
const [loading, setLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

async function handleSignOut() {
setLoading(true);
setErrorMessage("");

try {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    setErrorMessage(error.message);
    return;
  }

  router.replace("/login");
  router.refresh();
} catch {
  setErrorMessage("Unable to sign out. Please try again.");
} finally {
  setLoading(false);
}

}

return ( <div> <button
     type="button"
     onClick={handleSignOut}
     disabled={loading}
     className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
   >
{loading ? ( <LoaderCircle className="h-4 w-4 animate-spin" />
) : ( <LogOut className="h-4 w-4" />
)}
{loading ? "Signing out..." : "Sign out"} </button>
  {errorMessage && (
    <p role="alert" className="mt-2 max-w-52 text-xs text-red-600">
      {errorMessage}
    </p>
  )}
</div>
);
}
