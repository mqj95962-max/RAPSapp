import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

export const firebase =
  typeof window !== "undefined" ? createFirebase() : null;

export function getDb(): Firestore {
  if (!firebase) throw new Error("Firebase is only available in the browser");
  return firebase.db;
}

export function getFirebaseAuth(): Auth {
  if (!firebase) throw new Error("Firebase is only available in the browser");
  return firebase.auth;
}
