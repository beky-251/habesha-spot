import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify the current user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to view your businesses." },
        { status: 401 },
      );
    }

    // Load businesses owned by the signed-in user.
    const { data: businesses, error: businessesError } = await supabase
      .from("businesses")
      .select("id, name, slug, status, created_at, description")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });

    if (businessesError) {
      console.error("Failed to load businesses:", businessesError);

      return NextResponse.json(
        { error: "Unable to load your businesses." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      businesses: businesses ?? [],
    });
  } catch (error) {
    console.error("Businesses API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 },
    );
  }
}
