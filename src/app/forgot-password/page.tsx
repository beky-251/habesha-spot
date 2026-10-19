"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setError("");
setSuccess("");

const normalizedEmail = email.trim().toLowerCase();

if (!normalizedEmail) {
  setError("Please enter your email address.");
  return;
}

setLoading(true);

try {
  const supabase = createClient();

  const { error: resetError } =
    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

  if (resetError) {
    setError(resetError.message);
    return;
  }

  setSuccess(
    "If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder."
  );
} catch {
  setError("Unable to send the reset email. Please try again.");
} finally {
  setLoading(false);
}

}

return ( <main className="flex min-h-screen items-center justify-center bg-[#f8f7f3] px-4 py-12 text-[#25372b]"> <div className="w-full max-w-md"> <Link
       href="/login"
       className="text-sm font-semibold text-[#47664f] hover:text-[#263e2e]"
     >
← Back to sign in </Link>
    <div className="mt-8 rounded-3xl border border-[#e8e6dd] bg-white p-6 shadow-sm sm:p-9">
      <Link href="/" className="text-2xl font-black tracking-tight text-[#294d37]">
        HabeshaSpot
      </Link>

      <h1 className="mt-8 text-3xl font-bold tracking-tight">
        Forgot your password?
      </h1>

      <p className="mt-3 text-sm leading-6 text-[#68746b]">
        Enter the email address associated with your account. We will
        send you instructions to reset your password.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#31583d] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#25462f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending instructions..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#68746b]">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#31583d] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  </div>
</main>
);
}
