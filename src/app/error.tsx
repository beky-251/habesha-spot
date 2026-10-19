"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("HabeshaSpot application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-red-600">
          Something went wrong
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          We hit a little problem
        </h1>

        <p className="mt-4 text-base leading-7 text-gray-600">
          Sorry! We couldn&apos;t complete your request. You can try again or
          return to HabeshaSpot and continue discovering local businesses.
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-gray-400">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-100"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>
        </div>

        <p className="mt-8 text-sm font-medium text-gray-400">
          Discover local. Love local.
        </p>
      </div>
    </main>
  );
}
