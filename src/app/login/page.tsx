"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
const router = useRouter();
const searchParams = useSearchParams();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");


const normalizedEmail = email.trim().toLowerCase();

if (!normalizedEmail || !password) {
  setError("Please enter your email and password.");
  return;
}

setLoading(true);

try {
  const supabase = createClient();

  const { data, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (loginError) {
    throw loginError;
  }

  if (!data.user) {
    throw new Error("We couldn't verify your account. Please try again.");
  }

  const requestedDestination = searchParams.get("redirectTo");
  const destination =
    requestedDestination?.startsWith("/") &&
    !requestedDestination.startsWith("//") &&
    !requestedDestination.startsWith("/\\")
      ? requestedDestination
      : "/dashboard";

  router.replace(destination);
  router.refresh();
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Unable to sign in. Please try again."
  );
} finally {
  setLoading(false);
}

}

return ( <main className="flex min-h-screen items-center justify-center bg-[#faf8f5] px-4 py-12"> <div className="w-full max-w-md"> <Link
       href="/"
       className="mb-8 flex items-center justify-center gap-3"
     > <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#75452e] text-xl font-black text-white">
H </span>
      <span className="text-2xl font-extrabold tracking-tight text-gray-900">
        Habesha<span className="text-orange-600">Spot</span>
      </span>
    </Link>

    <section className="rounded-3xl border border-[#eae2da] bg-white p-7 shadow-sm sm:p-9">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#477454]">
          Welcome back
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900">
          Sign in to your account
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Access your dashboard, manage your business, and save your
          favorite places.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/10"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>

            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#75452e] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#75452e] focus:ring-2 focus:ring-[#75452e]/10"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#75452e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#593321] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="my-6 border-t border-gray-100" />

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-[#75452e] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>

    <p className="mt-6 text-center text-xs leading-5 text-gray-500">
      By signing in, you agree to use HabeshaSpot responsibly.
    </p>

    <p className="mt-4 text-center">
      <Link
        href="/"
        className="text-sm font-medium text-gray-600 hover:text-[#75452e]"
      >
        ← Back to homepage
      </Link>
    </p>
  </div>
</main>

);
}

export default function LoginPage() {
return (
<Suspense
fallback={ <main className="flex min-h-screen items-center justify-center bg-[#faf8f5]"> <p className="text-sm text-gray-600">Loading sign-in page...</p> </main>
}
> <LoginForm /> </Suspense>
);
}
