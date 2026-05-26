import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseBundle = { app: FirebaseApp; auth: Auth; db: Firestore };

let cached: FirebaseBundle | null = null;

function getFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.storageBucket ||
    !config.messagingSenderId ||
    !config.appId
  ) {
    return null;
  }

  return config;
}

function createFirebase(): FirebaseBundle {
  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables on Vercel."
    );
  }

  const app =
    getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

function getFirebase(): FirebaseBundle {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized in the browser.");
  }
  if (cached) return cached;
  cached = createFirebase();
  return cached;
}

export function getDb(): Firestore {
  return getFirebase().db;
}

export function getFirebaseAuth(): Auth {
  return getFirebase().auth;
}
