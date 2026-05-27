import { permanentlyDeleteUserData } from "./firestore";

/** Removes all Firestore data for a member. Their Google account is unchanged. */
export async function deleteUserAccount(targetUid: string): Promise<void> {
  await permanentlyDeleteUserData(targetUid);
}
