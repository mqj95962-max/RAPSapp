import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/server/email";
import {
  getAdminAuth,
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebaseAdmin";
import {
  dispatchNotification,
  type NotificationType,
} from "@/lib/server/notifications";

const TYPES: NotificationType[] = [
  "loan_requested",
  "loan_approved",
  "loan_denied",
  "photos_submitted",
];

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Server notifications are not configured." },
      { status: 503 }
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing authorization." }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return NextResponse.json(
      { error: "Server notifications are not configured." },
      { status: 503 }
    );
  }

  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid authorization." }, { status: 401 });
  }

  let body: { type?: string; loanId?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const type = body.type as NotificationType;
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid notification type." }, { status: 400 });
  }

  try {
    await dispatchNotification(db, callerUid, type, {
      loanId: body.loanId?.trim(),
      eventId: body.eventId?.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notification failed.";
    const status =
      message.includes("Not allowed") || message.includes("required")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
