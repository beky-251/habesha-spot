"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
const router = useRouter();

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

async function handleSignup(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setError("");
setSuccess("");

const trimmedName = fullName.trim();
const normalizedEmail = email.trim().toLowerCase();

if (!trimmedName) {
  setError("Please enter your full name.");
  return;
}

if (!normalizedEmail) {
  setError("Please enter your email address.");
  return;
}

if (password.length < 8) {
  setError("Your password must contain at least 8 characters.");
  return;
}

if (password !== confirmPassword) {
  setError("Your passwords do not match.");
  return;
}

setLoading(true);

try {
  const supabase = createClient();

  const { data, error: signupError } =
    await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
      },
    });

  if (signupError) {
    setError(signupError.message);
    return;
  }

  if (data.session) {
    router.replace("/dashboard");
    router.refresh();
    return;
  }

  setSuccess(
    "Your account was created. Check your email for a confirmation link before signing in."
  );
} catch {
  setError(
    "Something went wrong while creating your account. Please try again."
  );
} finally {
  setLoading(false);
}

}

return ( <main className="min-h-screen bg-[#f8f7f3] px-4 py-12 text-[#25372b] sm:py-16"> <div className="mx-auto max-w-md"> <Link
       href="/"
       className="inline-flex items-center gap-2 text-sm font-semibold text-[#47664f] transition hover:text-[#263e2e]"
     > <span aria-hidden="true">←</span>
Back to HabeshaSpot </Link>
    <div className="mt-8 rounded-3xl border border-[#e8e6dd] bg-white p-6 shadow-sm sm:p-9">
      <div className="mb-7">
        <Link href="/" className="inline-block">
          <span className="text-2xl font-black tracking-tight text-[#294d37]">
            HabeshaSpot
          </span>
        </Link>

        <p className="mt-2 text-sm text-[#758075]">
          Discover local, love local.
        </p>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">
          Create your account
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#68746b]">
          Join HabeshaSpot to discover local businesses and manage your
          own business listing.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
        >
          {success}
          <div className="mt-3">
            <Link
              href="/login"
              className="font-semibold underline underline-offset-4"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-semibold"
          >
            Full name
          </label>

          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-xl border border-[#dedfd6] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a0a69f] focus:border-[#52765b] focus:ring-2 focus:ring-[#52765b]/15"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#dedfd6] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a0a69f] focus:border-[#52765b] focus:ring-2 focus:ring-[#52765b]/15"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-[#dedfd6] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a0a69f] focus:border-[#52765b] focus:ring-2 focus:ring-[#52765b]/15"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold"
          >
            Confirm password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="Enter your password again"
            className="w-full rounded-xl border border-[#dedfd6] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a0a69f] focus:border-[#52765b] focus:ring-2 focus:ring-[#52765b]/15"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#31583d] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#25462f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[#68746b]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#31583d] hover:underline"
        >
          Sign in
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-[#8a9289]">
        By creating an account, you agree to use HabeshaSpot responsibly.
      </p>
    </div>

    <p className="mt-6 text-center text-xs text-[#8a9289]">
      © HabeshaSpot · Discover local, love local.
    </p>
  </div>
</main>

);
}
