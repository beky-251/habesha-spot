"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
MapPin,
Menu,
X,
Search,
Store,
LayoutDashboard,
UserRound,
} from "lucide-react";

const navigation = [
{ name: "Explore", href: "/search", icon: Search },
{ name: "Businesses", href: "/business", icon: Store },
{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export default function SiteHeader() {
const pathname = usePathname();
const [menuOpen, setMenuOpen] = useState(false);

function linkClass(href: string) {
const active =
pathname === href ||
(href !== "/" && pathname.startsWith(`${href}/`));

return [
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  active
    ? "bg-orange-50 text-orange-600"
    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
].join(" ");

}

function closeMenu() {
setMenuOpen(false);
}

return ( <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md"> <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
{/* Logo */} <Link
       href="/"
       onClick={closeMenu}
       className="flex shrink-0 items-center gap-2"
       aria-label="HabeshaSpot home"
     > <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-orange-400"> <MapPin size={23} strokeWidth={2.5} /> </span>
     
      <span className="flex flex-col leading-none">
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          Habesha<span className="text-orange-500">Spot</span>
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-wide text-slate-500">
          Discover local, love local.
        </span>
      </span>
    </Link>

    {/* Desktop navigation */}
    <nav
      className="hidden items-center gap-1 md:flex"
      aria-label="Main navigation"
    >
      {navigation.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(item.href)}
          >
            <Icon size={17} />
            {item.name}
          </Link>
        );
      })}
    </nav>

    {/* Desktop actions */}
    <div className="hidden items-center gap-3 md:flex">
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      >
        <UserRound size={17} />
        Sign in
      </Link>

      <Link
        href="/business/new"
        className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
      >
        Add your business
      </Link>
    </div>

    {/* Mobile menu button */}
    <button
      type="button"
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
      onClick={() => setMenuOpen((open) => !open)}
      aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={menuOpen}
      aria-controls="mobile-navigation"
    >
      {menuOpen ? <X size={23} /> : <Menu size={23} />}
    </button>
  </div>

  {/* Mobile navigation */}
  {menuOpen && (
    <div
      id="mobile-navigation"
      className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg md:hidden"
    >
      <nav
        className="mx-auto flex max-w-7xl flex-col gap-1"
        aria-label="Mobile navigation"
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className={linkClass(item.href)}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}

        <div className="my-2 border-t border-slate-200" />

        <Link
          href="/login"
          onClick={closeMenu}
          className={linkClass("/login")}
        >
          <UserRound size={18} />
          Sign in
        </Link>

        <Link
          href="/business/new"
          onClick={closeMenu}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Store size={18} />
          Add your business
        </Link>
      </nav>
    </div>
  )}
</header>
);
}
