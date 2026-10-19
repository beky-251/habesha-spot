"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          setValidSession(false);
        } else {
          setValidSession(Boolean(session));
        }
      } catch {
        if (active) {
          setValidSession(false);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      } else if (event === "SIGNED_OUT") {
        setValidSession(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setValidSession(Boolean(session));
      }
    });

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    if (!validSession) {
      setErrorMessage(
        "Your password reset session has expired. Request a new reset link."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "Your password has been updated successfully. Redirecting to sign in..."
      );

      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
        <div
          role="status"
          className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />
          <p className="text-sm text-gray-600">
            Checking your password reset link...
          </p>
        </div>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-2xl text-orange-700">
            !
          </div>

          <h1 className="text-2xl font-bold text-gray-950">
            Reset link unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            This password reset link may have expired or already been used.
            Request a new link to continue.
          </p>

          <Link
            href="/forgot-password"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            Request a new reset link
          </Link>

          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-orange-700"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2"
          aria-label="HabeshaSpot home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-lg font-bold text-white">
            H
          </span>
          <span className="text-lg font-bold text-gray-950">
            HabeshaSpot
          </span>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          Create a new password
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Choose a strong password for your HabeshaSpot account.
        </p>

        {searchParams.get("error_description") && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            The reset link could not be verified. Please request a new one.
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              New password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              disabled={submitting || Boolean(successMessage)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your new password again"
              disabled={submitting || Boolean(successMessage)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          <p className="text-xs leading-5 text-gray-500">
            Use at least 8 characters. Choose a password you do not use for
            other accounts.
          </p>

          <button
            type="submit"
            disabled={submitting || Boolean(successMessage)}
            className="flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Updating password..." : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-700 hover:text-orange-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
          <p className="text-sm text-gray-600">
            Loading password reset page...
          </p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
