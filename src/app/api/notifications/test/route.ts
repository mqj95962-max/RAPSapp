import { NextRequest, NextResponse } from "next/server";
import {
  emailShell,
  isEmailConfigured,
  sendEmail,
  verifySmtpConnection,
} from "@/lib/server/email";
import {
  getAdminAuth,
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebaseAdmin";
import { getStaffEmails } from "@/lib/server/staff";
import { getBearerToken, requireStaff, verifyIdToken } from "@/lib/server/verifyCaller";

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)." },
      { status: 503 }
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail SMTP is not configured (SMTP_USER, SMTP_PASS)." },
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
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  try {
    const uid = await verifyIdToken(adminAuth, token);
    await requireStaff(db, uid);

    await verifySmtpConnection();

    const staffEmails = await getStaffEmails(db);
    if (!staffEmails.length) {
      return NextResponse.json(
        {
          error:
            "No staff emails found. Add NOTIFY_STAFF_EMAILS in Vercel, or sign in as admin and set roles in Firestore.",
        },
        { status: 400 }
      );
    }

    await sendEmail({
      to: staffEmails,
      subject: "RAPS Club — test notification",
      text: "If you received this, Gmail SMTP and staff notification routing are working.",
      html: emailShell(
        "Test notification",
        "<p>If you received this, <strong>Gmail SMTP</strong> and <strong>staff notification routing</strong> are working.</p>"
      ),
    });

    return NextResponse.json({
      ok: true,
      sentTo: staffEmails.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
