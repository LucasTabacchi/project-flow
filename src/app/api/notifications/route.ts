import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  await markAllNotificationsRead(user.id);

  return new Response(null, { status: 204 });
}
