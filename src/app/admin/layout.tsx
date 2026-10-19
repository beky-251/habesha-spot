import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-guard";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  await requireAdmin();

  return <>{children}</>;
}
