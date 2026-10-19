import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BusinessHourInput = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

const validTime = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function isValidHours(value: unknown): value is BusinessHourInput[] {
  if (!Array.isArray(value) || value.length !== 7) {
    return false;
  }

  const days = new Set<number>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("day_of_week" in item) ||
      !("is_closed" in item) ||
      !("opens_at" in item) ||
      !("closes_at" in item)
    ) {
      return false;
    }

    const hour = item as Record<string, unknown>;

    if (
      typeof hour.day_of_week !== "number" ||
      !Number.isInteger(hour.day_of_week) ||
      hour.day_of_week < 0 ||
      hour.day_of_week > 6 ||
      days.has(hour.day_of_week) ||
      typeof hour.is_closed !== "boolean"
    ) {
      return false;
    }

    days.add(hour.day_of_week);

    if (hour.is_closed) {
      continue;
    }

    if (
      typeof hour.opens_at !== "string" ||
      typeof hour.closes_at !== "string" ||
      !validTime.test(hour.opens_at) ||
      !validTime.test(hour.closes_at) ||
      hour.opens_at === hour.closes_at
    ) {
      return false;
    }
  }

  return days.size === 7;
}

async function verifyBusinessOwner(
  businessId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: "Please sign in to manage business hours." },
        { status: 401 },
      ),
    };
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    console.error("Business lookup failed:", businessError.message);

    return {
      response: NextResponse.json(
        { error: "Unable to verify business ownership." },
        { status: 500 },
      ),
    };
  }

  if (!business) {
    return {
      response: NextResponse.json(
        { error: "Business not found." },
        { status: 404 },
      ),
    };
  }

  if (business.owner_user_id !== user.id) {
    return {
      response: NextResponse.json(
        { error: "You do not have permission to manage this business." },
        { status: 403 },
      ),
    };
  }

  return { supabase };
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const result = await verifyBusinessOwner(id);

    if ("response" in result) {
      return result.response;
    }

    const { data, error } = await result.supabase
      .from("business_hours")
      .select("id, business_id, day_of_week, opens_at, closes_at, is_closed")
      .eq("business_id", id)
      .order("day_of_week", { ascending: true });

    if (error) {
      console.error("Loading business hours failed:", error.message);

      return NextResponse.json(
        { error: "Unable to load business hours." },
        { status: 500 },
      );
    }

    return NextResponse.json({ hours: data ?? [] });
  } catch (error: unknown) {
    console.error("Business hours GET error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const result = await verifyBusinessOwner(id);

    if ("response" in result) {
      return result.response;
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("hours" in body) ||
      !isValidHours(body.hours)
    ) {
      return NextResponse.json(
        { error: "Please provide valid opening hours for all seven days." },
        { status: 400 },
      );
    }

    const rows = body.hours.map((hour) => ({
      business_id: id,
      day_of_week: hour.day_of_week,
      opens_at: hour.is_closed ? null : hour.opens_at,
      closes_at: hour.is_closed ? null : hour.closes_at,
      is_closed: hour.is_closed,
    }));

    // Replace the existing schedule only after the new schedule has been
    // validated. The database policies must permit owners to manage their
    // own business_hours rows.
    const { error: deleteError } = await result.supabase
      .from("business_hours")
      .delete()
      .eq("business_id", id);

    if (deleteError) {
      console.error("Deleting old business hours failed:", deleteError.message);

      return NextResponse.json(
        { error: "Unable to update opening hours." },
        { status: 500 },
      );
    }

    const { data, error: insertError } = await result.supabase
      .from("business_hours")
      .insert(rows)
      .select("id, business_id, day_of_week, opens_at, closes_at, is_closed");

    if (insertError) {
      console.error("Saving business hours failed:", insertError.message);

      return NextResponse.json(
        {
          error:
            "The hours could not be saved. Check the business_hours table permissions and try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Business hours saved successfully.",
      hours: data,
    });
  } catch (error: unknown) {
    console.error("Business hours PUT error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
