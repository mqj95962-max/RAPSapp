import { getFirebaseAuth } from "./firebase";

export type NotificationType =
  | "loan_requested"
  | "loan_approved"
  | "loan_denied"
  | "photos_submitted";

/** Sends a notification email. Returns null on success, or an error message. */
export async function sendNotification(
  type: NotificationType,
  ids: { loanId?: string; eventId?: string }
): Promise<string | null> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return "Not signed in.";

    const token = await user.getIdToken();
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, ...ids }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return data.error ?? res.statusText;
    }

    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Notification request failed.";
  }
}
