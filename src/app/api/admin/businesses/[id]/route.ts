import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BusinessStatus = "approved" | "rejected";

type UpdateBusinessBody = {
  status?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Business ID is required." },
        { status: 400 }
      );
    }

    let body: UpdateBusinessBody;

    try {
      body = (await request.json()) as UpdateBusinessBody;
    } catch {
      return NextResponse.json(
        { error: "The request body must contain valid JSON." },
        { status: 400 }
      );
    }

    const status = body.status;

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        {
          error: "Status must be either approved or rejected.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Verify the signed-in user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must sign in to continue." },
        { status: 401 }
      );
    }

    // 2. Verify administrator permissions.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Unable to verify administrator permissions:",
        profileError
      );

      return NextResponse.json(
        { error: "Unable to verify administrator permissions." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    // 3. Update the business and retrieve its owner's user ID.
    const { data: business, error: updateError } = await supabase
      .from("businesses")
      .update({ status: status as BusinessStatus })
      .eq("id", id)
      .select("id, name, slug, status, owner_user_id")
      .maybeSingle();

    if (updateError) {
      console.error("Unable to update business status:", updateError);

      return NextResponse.json(
        {
          error:
            "Unable to update the business. Check your database permissions.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or not accessible." },
        { status: 404 }
      );
    }

    // 4. Notify the business owner after a successful status update.
    let notificationSent = false;

    if (business.owner_user_id) {
      const approved = status === "approved";

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: business.owner_user_id,
          title: approved
            ? "Your business has been approved!"
            : "Your business was not approved",
          message: approved
            ? `${business.name} has been approved and can now appear publicly on HabeshaSpot.`
            : `${business.name} was not approved. Please review your business information and contact support if you need assistance.`,
          type: approved ? "business_approved" : "business_rejected",
          business_id: business.id,
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "Business status updated, but notification creation failed:",
          notificationError
        );
      } else {
        notificationSent = true;
      }
    }

    // 5. Return the result to the admin dashboard.
    return NextResponse.json({
      message:
        status === "approved"
          ? "Business approved successfully."
          : "Business rejected successfully.",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        status: business.status,
      },
      notificationSent,
    });
  } catch (error) {
    console.error("Admin business status API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
