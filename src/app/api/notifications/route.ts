import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to view your notifications." },
        { status: 401 }
      );
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, title, message, type, business_id, is_read, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Unable to load notifications:", error);

      return NextResponse.json(
        { error: "Unable to load notifications." },
        { status: 500 }
      );
    }

    const unreadCount = (notifications ?? []).filter(
      (notification) => !notification.is_read
    ).length;

    return NextResponse.json({
      notifications: notifications ?? [],
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    let body: { id?: unknown; markAllAsRead?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (body.markAllAsRead === true) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Unable to mark notifications as read:", error);

        return NextResponse.json(
          { error: "Unable to mark notifications as read." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "All notifications marked as read.",
      });
    }

    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json(
        { error: "A notification ID is required." },
        { status: 400 }
      );
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id, is_read")
      .maybeSingle();

    if (error) {
      console.error("Unable to update notification:", error);

      return NextResponse.json(
        { error: "Unable to update the notification." },
        { status: 500 }
      );
    }

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("Notification update API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}