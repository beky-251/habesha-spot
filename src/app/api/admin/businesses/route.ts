import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify the signed-in user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must sign in to access this resource." },
        { status: 401 }
      );
    }

    // Verify the user's administrator role.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Unable to verify administrator role:", profileError);

      return NextResponse.json(
        { error: "Unable to verify permissions." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    // Load businesses after authorization succeeds.
    const { data: businesses, error: businessesError } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (businessesError) {
      console.error("Unable to load businesses:", businessesError);

      return NextResponse.json(
        { error: "Unable to load businesses." },
        { status: 500 }
      );
    }

    return NextResponse.json({ businesses: businesses ?? [] });
  } catch (error) {
    console.error("Admin businesses API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
