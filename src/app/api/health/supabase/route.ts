import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
try {
const supabase = await createClient();

const [categoriesResult, citiesResult] = await Promise.all([
  supabase
    .from("categories")
    .select("id, name, name_am, slug")
    .eq("is_active", true)
    .order("name"),
  supabase
    .from("cities")
    .select("id, name, name_am, slug, region")
    .eq("is_active", true)
    .order("name"),
]);

if (categoriesResult.error || citiesResult.error) {
  console.error("Supabase data query failed:", {
    categories: categoriesResult.error?.message,
    cities: citiesResult.error?.message,
  });

  return NextResponse.json(
    {
      success: false,
      message:
        "The database connection was reached, but loading categories or cities failed.",
    },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  message: "HabeshaSpot is connected to Supabase.",
  data: {
    categories: categoriesResult.data,
    cities: citiesResult.data,
  },
  counts: {
    categories: categoriesResult.data.length,
    cities: citiesResult.data.length,
  },
});

} catch (error) {
console.error("Supabase connection test failed:", error);

return NextResponse.json(
  {
    success: false,
    message:
      "Unable to initialize the Supabase connection. Check your environment variables and server configuration.",
  },
  { status: 500 }
);

}
}
