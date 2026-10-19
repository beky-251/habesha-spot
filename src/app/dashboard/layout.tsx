import type { ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Search,
  Home,
  Bell,
} from "lucide-react";
import NotificationBell from "@/components/dashboard/notification-bell";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Businesses",
    href: "/dashboard/businesses",
    icon: Building2,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    name: "Search Businesses",
    href: "/search",
    icon: Search,
  },
  {
    name: "Visit Homepage",
    href: "/",
    icon: Home,
  },
];

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-emerald-700"
          >
            HabeshaSpot
          </Link>

          {/* Notification bell appears only once in the header */}
          <NotificationBell />
        </div>
      </header>

      {/* Dashboard layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Dashboard Menu
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-5 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} HabeshaSpot. Discover local, love local.
      </footer>
    </div>
  );
}
