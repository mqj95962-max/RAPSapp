import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/server/email";
import {
  getAdminAuth,
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebaseAdmin";
import { getStaffEmails, maskEmail } from "@/lib/server/staff";
import { getBearerToken, requireStaff, verifyIdToken } from "@/lib/server/verifyCaller";

export async function GET(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured on the server." },
      { status: 503 }
    );
  }

  const token = getBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Missing authorization." }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const uid = await verifyIdToken(adminAuth, token);
    await requireStaff(db, uid);

    const staffEmails = await getStaffEmails(db);
    return NextResponse.json({
      firebaseAdmin: true,
      emailConfigured: isEmailConfigured(),
      smtpUser: process.env.SMTP_USER?.trim()
        ? maskEmail(process.env.SMTP_USER.trim())
        : null,
      staffEmailCount: staffEmails.length,
      staffEmails: staffEmails.map(maskEmail),
      notifyStaffEmailsEnv: Boolean(process.env.NOTIFY_STAFF_EMAILS?.trim()),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Forbidden.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
