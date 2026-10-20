import type { ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Search,
  Home,
  Bell,
  ArrowRight,
  Compass,
} from "lucide-react";

import NotificationCount from "@/components/notifications/NotificationCount";
import NotificationBell from "@/components/notifications/NotificationBell";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Your dashboard",
  },
  {
    name: "My Businesses",
    href: "/dashboard/businesses",
    icon: Building2,
    description: "Manage your listings",
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    description: "Updates and activity",
  },
];

const discoveryLinks = [
  {
    name: "Explore Businesses",
    href: "/search",
    icon: Search,
  },
  {
    name: "Visit Homepage",
    href: "/",
    icon: Home,
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      {/* Dashboard header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B132B] text-white shadow-lg">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="HabeshaSpot homepage"
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFB300] text-[#0B132B] shadow-md transition-transform group-hover:scale-105">
              <Compass className="h-6 w-6" strokeWidth={2.5} />
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                HabeshaSpot
                <span className="text-[#FFB300]">.</span>
              </span>

              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:block">
                Discover. Eat. Explore.
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#FFB300]/50 hover:bg-white/5 hover:text-[#FFB300] sm:flex"
            >
              <Search className="h-4 w-4" />
              Explore
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard body */}
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">
        {/* Sidebar */}
        <aside className="h-fit space-y-5">
          <div className="rounded-2xl border border-[#DCE3ED] bg-white p-4 shadow-sm">
            <div className="mb-5 px-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
                Workspace
              </p>

              <p className="mt-1 text-sm text-[#64748B]">
                Manage your HabeshaSpot account.
              </p>
            </div>

            <nav aria-label="Dashboard navigation" className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[#FFB300]/30 hover:bg-[#FFF8E5]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B] transition group-hover:bg-[#FFB300]/20 group-hover:text-[#0B132B]">
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="block text-sm font-bold text-[#0B132B]">
                          {item.name}
                        </span>

                        {item.href === "/dashboard/notifications" && (
                          <NotificationCount />
                        )}
                      </span>

                      <span className="mt-0.5 block text-xs text-[#64748B]">
                        {item.description}
                      </span>
                    </span>

                    <ArrowRight className="h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#0B132B]" />
                  </Link>
                );
              })}
            </nav>

            <div className="my-5 border-t border-[#DCE3ED]" />

            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
              Discover
            </p>

            <nav aria-label="Discovery navigation" className="space-y-1.5">
              {discoveryLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F1F5F9]"
                  >
                    <Icon className="h-5 w-5 text-[#64748B] transition group-hover:text-[#0B132B]" />

                    <span className="text-sm font-semibold text-[#475569] group-hover:text-[#0B132B]">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Business promotion card */}
          <div className="relative overflow-hidden rounded-2xl bg-[#101D35] p-5 text-white shadow-sm">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#FFB300]/10" />
            <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-[#FF6B00]/10" />

            <div className="relative">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFB300] text-[#0B132B]">
                <Building2 className="h-5 w-5" />
              </div>

              <h2 className="text-base font-extrabold">Grow your business</h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Help more people discover your business on HabeshaSpot.
              </p>

              <Link
                href="/dashboard/businesses"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#FFB300] transition hover:text-white"
              >
                Manage listings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="min-w-0">
          <div className="min-h-[480px]">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-[#DCE3ED] bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="text-sm text-[#64748B]">
            © {new Date().getFullYear()} HabeshaSpot. All rights reserved.
          </p>

          <p className="text-sm font-medium text-[#64748B]">
            Discover Ethiopia, one spot at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
