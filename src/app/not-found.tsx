import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Home,
  Search,
} from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100">
          <Compass className="h-10 w-10 text-orange-600" />
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
          Page not found
        </p>

        <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 sm:text-8xl">
          404
        </h1>

        <h2 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
          Looks like you took a wrong turn!
        </h2>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-gray-600">
          The page you are looking for may have moved, been removed, or
          never existed. Let&apos;s help you find your next favorite spot.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-100"
          >
            <Search className="h-5 w-5" />
            Explore Businesses
          </Link>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to HabeshaSpot
        </Link>
      </div>
    </main>
  );
}