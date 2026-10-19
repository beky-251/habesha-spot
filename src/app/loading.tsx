import Link from "next/link";

export default function Loading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 text-3xl font-extrabold tracking-tight text-gray-900"
        >
          Habesha<span className="text-orange-600">Spot</span>
        </Link>

        {/* Loading animation */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />

          <div className="h-8 w-8 animate-pulse rounded-full bg-orange-100" />
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          Finding your next favorite spot...
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Please wait while we load the places, businesses, and experiences
          waiting for you.
        </p>

        {/* Loading placeholders */}
        <div className="mt-8 w-full space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-gray-200" />

          <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-gray-200" />

          <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-gray-200" />
        </div>

        <p className="mt-8 text-xs font-medium text-gray-400">
          Discover local. Love local.
        </p>
      </div>
    </main>
  );
}
