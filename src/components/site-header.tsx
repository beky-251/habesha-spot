"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;

        setUser(error ? null : currentUser);
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;

        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    void loadUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function linkClass(href: string) {
    const isActive =
      pathname === href ||
      (href !== "/" && pathname.startsWith(`${href}/`));

    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-orange-50 text-orange-700"
        : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
    ].join(" ");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Unable to sign out:", error.message);
        return;
      }

      setUser(null);
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("An unexpected error occurred while signing out:", error);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center gap-2"
          aria-label="HabeshaSpot home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-lg font-bold text-white">
            H
          </span>

          <span className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-gray-950">
              HabeshaSpot
            </span>
            <span className="hidden text-xs text-gray-500 sm:block">
              Discover local, love local.
            </span>
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          <Link href="/" className={linkClass("/")}>
            Home
          </Link>

          <Link href="/search" className={linkClass("/search")}>
            Explore
          </Link>

          <Link href="/favorites" className={linkClass("/favorites")}>
            Favorites
          </Link>

          {!loading && user && (
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Sign in
              </Link>

              <Link
                href="/signup"
                className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Get started
              </Link>
            </>
          )}

          {!loading && user && (
            <>
              <Link
                href="/dashboard/businesses"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                My businesses
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
        >
          {menuOpen ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-gray-200 bg-white px-4 py-4 md:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            <Link href="/" onClick={closeMenu} className={linkClass("/")}>
              Home
            </Link>

            <Link
              href="/search"
              onClick={closeMenu}
              className={linkClass("/search")}
            >
              Explore businesses
            </Link>

            <Link
              href="/favorites"
              onClick={closeMenu}
              className={linkClass("/favorites")}
            >
              Favorites
            </Link>

            {!loading && user && (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className={linkClass("/dashboard")}
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/businesses"
                  onClick={closeMenu}
                  className={linkClass("/dashboard/businesses")}
                >
                  My businesses
                </Link>
              </>
            )}

            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className={linkClass("/login")}
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="mt-2 rounded-lg bg-orange-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  Get started
                </Link>
              </>
            )}

            {!loading && user && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-2 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
