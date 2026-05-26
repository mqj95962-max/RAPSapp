"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  getUserProfile,
  subscribeUserProfile,
  upsertUserProfile,
} from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (name: string, phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await getUserProfile(user.uid);
    if (!p && user.email) {
      await upsertUserProfile(user.uid, user.email, {});
      setProfile(await getUserProfile(user.uid));
    } else {
      setProfile(p);
    }
  }, [user]);

  useEffect(() => {
    let authUnsub: (() => void) | undefined;
    let profileUnsub: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();
      authUnsub = onAuthStateChanged(auth, async (u) => {
        profileUnsub?.();
        profileUnsub = undefined;
        setUser(u);

        if (!u) {
          setProfile(null);
          setInitError(null);
          setLoading(false);
          return;
        }

        profileUnsub = subscribeUserProfile(
          u.uid,
          (p) => {
            if (!p && u.email) {
              void upsertUserProfile(u.uid, u.email, {});
              return;
            }
            setProfile(p);
            setInitError(null);
            setLoading(false);
          },
          (err) => {
            setInitError(err.message);
            setLoading(false);
          }
        );
      });
    } catch (e) {
      setUser(null);
      setProfile(null);
      setInitError(
        e instanceof Error ? e.message : "Failed to initialize Firebase."
      );
      setLoading(false);
    }

    return () => {
      authUnsub?.();
      profileUnsub?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setInitError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Sign-in failed.");
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
    setProfile(null);
  }, []);

  const saveProfile = useCallback(
    async (name: string, phone: string) => {
      if (!user?.email) return;
      await upsertUserProfile(user.uid, user.email, {
        displayName: name,
        phone,
        profileComplete: true,
      });
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      initError,
      signInWithGoogle,
      signOut,
      refreshProfile,
      saveProfile,
    }),
    [
      user,
      profile,
      loading,
      initError,
      signInWithGoogle,
      signOut,
      refreshProfile,
      saveProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
