import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
const requestUrl = new URL(request.url);
const code = requestUrl.searchParams.get("code");
const next = requestUrl.searchParams.get("next");

const safeNext =
next && next.startsWith("/") && !next.startsWith("//")
? next
: "/dashboard";

if (code) {
const supabase = await createClient();

const { error } = await supabase.auth.exchangeCodeForSession(code);

if (!error) {
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}

console.error("Authentication callback failed:", error.message);

}

return NextResponse.redirect(
new URL("/login?error=confirmation_failed", requestUrl.origin),
);
}
