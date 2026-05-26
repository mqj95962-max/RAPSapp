"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchServerTime } from "@/lib/time";

interface ServerTimeContextValue {
  now: Date;
  offsetMs: number;
  refresh: () => Promise<void>;
}

const ServerTimeContext = createContext<ServerTimeContextValue | null>(null);

export function ServerTimeProvider({ children }: { children: React.ReactNode }) {
  const [offsetMs, setOffsetMs] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = async () => {
    const server = await fetchServerTime();
    setOffsetMs(server.getTime() - Date.now());
  };

  useEffect(() => {
    refresh();
    const sync = setInterval(refresh, 5 * 60 * 1000);
    const clock = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => {
      clearInterval(sync);
      clearInterval(clock);
    };
  }, []);

  const now = useMemo(() => new Date(Date.now() + offsetMs), [offsetMs, tick]);

  const value = useMemo(
    () => ({ now, offsetMs, refresh }),
    [now, offsetMs]
  );

  return (
    <ServerTimeContext.Provider value={value}>
      {children}
    </ServerTimeContext.Provider>
  );
}

export function useServerTime() {
  const ctx = useContext(ServerTimeContext);
  if (!ctx) throw new Error("useServerTime must be used within ServerTimeProvider");
  return ctx;
}
