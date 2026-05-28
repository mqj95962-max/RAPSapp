import type { Firestore } from "firebase-admin/firestore";
import { emailShell, escapeHtml, getAppBaseUrl, sendEmail } from "./email";
import { getStaffEmails, isStaffUser } from "./staff";

export type NotificationType =
  | "loan_requested"
  | "loan_approved"
  | "loan_denied"
  | "photos_submitted";

interface LoanDoc {
  userId: string;
  userName: string;
  equipment: { name: string; equipmentId: string }[];
  purpose: string;
  status: string;
  pickupDate: string | null;
  returnDate: string | null;
  approvalNote: string;
  approvedBy: string | null;
}

interface EventDoc {
  userId: string;
  userName: string;
  title: string;
  eventDate: string;
  eventTime: string;
  photosSubmitted: boolean;
}

function equipmentList(equipment: LoanDoc["equipment"]): string {
  if (!equipment.length) return "No equipment listed";
  return equipment.map((e) => `${e.name} (${e.equipmentId})`).join(", ");
}

function equipmentListHtml(equipment: LoanDoc["equipment"]): string {
  return escapeHtml(equipmentList(equipment));
}

async function getMemberEmail(
  db: Firestore,
  userId: string
): Promise<{ email: string; displayName: string } | null> {
  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const email = String(data.email ?? "").trim();
  if (!email) return null;
  return {
    email,
    displayName: String(data.displayName ?? "").trim() || email,
  };
}

async function getLoan(db: Firestore, loanId: string): Promise<LoanDoc | null> {
  const snap = await db.collection("loans").doc(loanId).get();
  if (!snap.exists) return null;
  return snap.data() as LoanDoc;
}

async function getEvent(db: Firestore, eventId: string): Promise<EventDoc | null> {
  const snap = await db.collection("events").doc(eventId).get();
  if (!snap.exists) return null;
  return snap.data() as EventDoc;
}

export async function handleLoanRequested(
  db: Firestore,
  callerUid: string,
  loanId: string
): Promise<void> {
  const loan = await getLoan(db, loanId);
  if (!loan) throw new Error("Loan not found.");
  if (loan.userId !== callerUid) throw new Error("Not allowed.");
  if (loan.status !== "pending") throw new Error("Loan is not pending.");

  const staffEmails = await getStaffEmails(db);
  if (!staffEmails.length) {
    throw new Error(
      "No staff email addresses found. Each admin must sign in once and have admin/quartermaster/archivist in Firestore."
    );
  }

  const list = equipmentList(loan.equipment);
  const subject = `New loan request from ${loan.userName}`;
  const text = `${loan.userName} submitted a loan request.\n\nEquipment: ${list}\nPurpose: ${loan.purpose || "—"}\n\nReview pending loans in the club portal.`;
  const html = emailShell(
    "New loan request",
    `     <p><strong>${escapeHtml(loan.userName)}</strong> submitted a loan request.</p>
     <p><strong>Equipment:</strong> ${equipmentListHtml(loan.equipment)}</p>
     <p><strong>Purpose:</strong> ${escapeHtml(loan.purpose || "—")}</p>
     <p><a href="${getAppBaseUrl()}/equipment/admin/member-loans">Review in Member loans</a></p>`
  );

  await sendEmail({ to: staffEmails, subject, html, text });
}

export async function handleLoanApproved(
  db: Firestore,
  callerUid: string,
  loanId: string
): Promise<void> {
  const caller = await db.collection("users").doc(callerUid).get();
  if (!isStaffUser(caller.data())) throw new Error("Admin access required.");

  const loan = await getLoan(db, loanId);
  if (!loan) throw new Error("Loan not found.");
  if (loan.status !== "approved") throw new Error("Loan is not approved.");
  if (loan.approvedBy !== callerUid) throw new Error("Not allowed.");

  const member = await getMemberEmail(db, loan.userId);
  if (!member) return;

  const list = equipmentList(loan.equipment);
  const pickup = loan.pickupDate ?? "—";
  const returnDate = loan.returnDate ?? "—";
  const note = loan.approvalNote || "—";
  const subject = "Your equipment loan was approved";
  const text = `Hi ${member.displayName},\n\nYour loan request was approved and is awaiting collection.\n\nEquipment: ${list}\nPickup date: ${pickup}\nReturn by: ${returnDate}\nNote from staff: ${note}\n\nOpen the portal to view your loans.`;
  const html = emailShell(
    "Loan approved — awaiting collection",
    `     <p>Hi ${escapeHtml(member.displayName)},</p>
     <p>Your loan request was <strong>approved</strong> and is awaiting collection.</p>
     <p><strong>Equipment:</strong> ${equipmentListHtml(loan.equipment)}</p>
     <p><strong>Pickup date:</strong> ${escapeHtml(pickup)}</p>
     <p><strong>Return by:</strong> ${escapeHtml(returnDate)}</p>
     <p><strong>Note from staff:</strong> ${escapeHtml(note)}</p>
     <p><a href="${getAppBaseUrl()}/equipment/my-loans">View my loans</a></p>`
  );

  await sendEmail({ to: member.email, subject, html, text });
}

export async function handleLoanDenied(
  db: Firestore,
  callerUid: string,
  loanId: string
): Promise<void> {
  const caller = await db.collection("users").doc(callerUid).get();
  if (!isStaffUser(caller.data())) throw new Error("Admin access required.");

  const loan = await getLoan(db, loanId);
  if (!loan) throw new Error("Loan not found.");
  if (loan.status !== "denied") throw new Error("Loan is not denied.");
  if (loan.approvedBy !== callerUid) throw new Error("Not allowed.");

  const member = await getMemberEmail(db, loan.userId);
  if (!member) return;

  const list = equipmentList(loan.equipment);
  const note = loan.approvalNote || "—";
  const subject = "Your equipment loan request was not approved";
  const text = `Hi ${member.displayName},\n\nYour loan request was not approved.\n\nEquipment: ${list}\nNote from staff: ${note}\n\nYou can submit a new request in the club portal if needed.`;
  const html = emailShell(
    "Loan request not approved",
    `     <p>Hi ${escapeHtml(member.displayName)},</p>
     <p>Your loan request was <strong>not approved</strong>.</p>
     <p><strong>Equipment:</strong> ${equipmentListHtml(loan.equipment)}</p>
     <p><strong>Note from staff:</strong> ${escapeHtml(note)}</p>
     <p><a href="${getAppBaseUrl()}/equipment/borrow">Borrow equipment</a></p>`
  );

  await sendEmail({ to: member.email, subject, html, text });
}

export async function handlePhotosSubmitted(
  db: Firestore,
  callerUid: string,
  eventId: string
): Promise<void> {
  const event = await getEvent(db, eventId);
  if (!event) throw new Error("Event not found.");
  if (event.userId !== callerUid) throw new Error("Not allowed.");
  if (!event.photosSubmitted) throw new Error("Photos are not marked submitted.");

  const staffEmails = await getStaffEmails(db);
  if (!staffEmails.length) {
    throw new Error(
      "No staff email addresses found. Each admin must sign in once and have admin/quartermaster/archivist in Firestore."
    );
  }

  const subject = `Photos submitted: ${event.title}`;
  const text = `${event.userName} marked photos as submitted for "${event.title}" (${event.eventDate} ${event.eventTime}).\n\nReview in Member events coverage.`;
  const html = emailShell(
    "Event photos submitted",
    `     <p><strong>${escapeHtml(event.userName)}</strong> marked photos as submitted.</p>
     <p><strong>Event:</strong> ${escapeHtml(event.title)}</p>
     <p><strong>Date:</strong> ${escapeHtml(event.eventDate)} at ${escapeHtml(event.eventTime)}</p>
     <p><a href="${getAppBaseUrl()}/events/admin/coverage">Review in Member events coverage</a></p>`
  );

  await sendEmail({ to: staffEmails, subject, html, text });
}

export async function dispatchNotification(
  db: Firestore,
  callerUid: string,
  type: NotificationType,
  ids: { loanId?: string; eventId?: string }
): Promise<void> {
  switch (type) {
    case "loan_requested":
      if (!ids.loanId) throw new Error("Missing loanId.");
      await handleLoanRequested(db, callerUid, ids.loanId);
      break;
    case "loan_approved":
      if (!ids.loanId) throw new Error("Missing loanId.");
      await handleLoanApproved(db, callerUid, ids.loanId);
      break;
    case "loan_denied":
      if (!ids.loanId) throw new Error("Missing loanId.");
      await handleLoanDenied(db, callerUid, ids.loanId);
      break;
    case "photos_submitted":
      if (!ids.eventId) throw new Error("Missing eventId.");
      await handlePhotosSubmitted(db, callerUid, ids.eventId);
      break;
    default:
      throw new Error("Unknown notification type.");
  }
}
