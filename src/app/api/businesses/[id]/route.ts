import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to edit your business." },
        { status: 401 },
      );
    }

    const { data: business, error } = await supabase
      .from("businesses")
      .select(
        "id, owner_user_id, name, slug, description, address, phone, email, website, category_id, city_id, status",
      )
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Business lookup failed:", error.message);

      return NextResponse.json(
        { error: "Unable to load your business." },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or you do not have permission to edit it." },
        { status: 404 },
      );
    }

    const [{ data: categories, error: categoriesError }, { data: cities, error: citiesError }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("cities")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

    if (categoriesError || citiesError) {
      console.error(
        "Unable to load business options:",
        categoriesError?.message,
        citiesError?.message,
      );

      return NextResponse.json(
        { error: "Unable to load categories or cities." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      business,
      categories: categories ?? [],
      cities: cities ?? [],
    });
  } catch (error: unknown) {
    console.error("Business GET API error:", getErrorMessage(error));

    return NextResponse.json(
      { error: "Unable to load your business." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to update your business." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid business information." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const allowedFields = [
      "name",
      "description",
      "address",
      "phone",
      "email",
      "website",
      "category_id",
      "city_id",
    ];

    const hasEditableField = allowedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(input, field),
    );

    if (!hasEditableField) {
      return NextResponse.json(
        { error: "No business information was provided." },
        { status: 400 },
      );
    }

    // Verify ownership before making changes.
    const { data: existingBusiness, error: lookupError } = await supabase
      .from("businesses")
      .select("id, owner_user_id, status")
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Business ownership check failed:", lookupError.message);

      return NextResponse.json(
        { error: "Unable to verify business ownership." },
        { status: 500 },
      );
    }

    if (!existingBusiness) {
      return NextResponse.json(
        { error: "Business not found or you do not have permission to edit it." },
        { status: 404 },
      );
    }

    const updates: Record<string, string | null> = {};

    if (Object.prototype.hasOwnProperty.call(input, "name")) {
      const name = cleanText(input.name);

      if (!name || name.length < 2 || name.length > 120) {
        return NextResponse.json(
          { error: "Business name must be between 2 and 120 characters." },
          { status: 400 },
        );
      }

      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(input, "description")) {
      const description =
        typeof input.description === "string"
          ? input.description.trim()
          : input.description === null
            ? null
            : undefined;

      if (description === undefined) {
        return NextResponse.json(
          { error: "Description must be text." },
          { status: 400 },
        );
      }

      if (description && description.length > 5000) {
        return NextResponse.json(
          { error: "Description cannot exceed 5000 characters." },
          { status: 400 },
        );
      }

      updates.description = description || null;
    }

    if (Object.prototype.hasOwnProperty.call(input, "address")) {
      const address = cleanText(input.address);

      if (address && address.length > 300) {
        return NextResponse.json(
          { error: "Address cannot exceed 300 characters." },
          { status: 400 },
        );
      }

      updates.address = address;
    }

    if (Object.prototype.hasOwnProperty.call(input, "phone")) {
      const phone = cleanText(input.phone);

      if (phone && phone.length > 40) {
        return NextResponse.json(
          { error: "Phone number cannot exceed 40 characters." },
          { status: 400 },
        );
      }

      updates.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(input, "email")) {
      const email = cleanText(input.email);

      if (email && email.length > 254) {
        return NextResponse.json(
          { error: "Email address is too long." },
          { status: 400 },
        );
      }

      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return NextResponse.json(
          { error: "Enter a valid email address." },
          { status: 400 },
        );
      }

      updates.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(input, "website")) {
      const website = cleanText(input.website);

      if (website && website.length > 500) {
        return NextResponse.json(
          { error: "Website URL cannot exceed 500 characters." },
          { status: 400 },
        );
      }

      if (website) {
        const normalizedWebsite = /^https?:\/\//i.test(website)
          ? website
          : `https://${website}`;

        try {
          const url = new URL(normalizedWebsite);

          if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new Error("Invalid protocol");
          }

          updates.website = url.toString();
        } catch {
          return NextResponse.json(
            { error: "Enter a valid website URL." },
            { status: 400 },
          );
        }
      } else {
        updates.website = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(input, "category_id")) {
      const categoryId = cleanText(input.category_id);

      if (!categoryId) {
        return NextResponse.json(
          { error: "Please select a category." },
          { status: 400 },
        );
      }

      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("is_active", true)
        .maybeSingle();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: "The selected category is not available." },
          { status: 400 },
        );
      }

      updates.category_id = categoryId;
    }

    if (Object.prototype.hasOwnProperty.call(input, "city_id")) {
      const cityId = cleanText(input.city_id);

      if (!cityId) {
        return NextResponse.json(
          { error: "Please select a city." },
          { status: 400 },
        );
      }

      const { data: city, error: cityError } = await supabase
        .from("cities")
        .select("id")
        .eq("id", cityId)
        .eq("is_active", true)
        .maybeSingle();

      if (cityError || !city) {
        return NextResponse.json(
          { error: "The selected city is not available." },
          { status: 400 },
        );
      }

      updates.city_id = cityId;
    }

    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .select(
        "id, name, slug, description, address, phone, email, website, category_id, city_id, status",
      )
      .maybeSingle();

    if (updateError) {
      console.error("Business update failed:", updateError.message);

      return NextResponse.json(
        { error: "Unable to save your business changes." },
        { status: 500 },
      );
    }

    if (!updatedBusiness) {
      return NextResponse.json(
        { error: "Business could not be updated." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      message: "Business details updated successfully.",
      business: updatedBusiness,
    });
  } catch (error: unknown) {
    console.error("Business PATCH API error:", getErrorMessage(error));

    return NextResponse.json(
      { error: "An unexpected error occurred while updating your business." },
      { status: 500 },
    );
  }
}