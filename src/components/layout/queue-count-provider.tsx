"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { QUEUE_CHANGED_EVENT } from "@/lib/utils/queue-events";

/**
 * Safety net in case Realtime is unavailable — realtime already delivers
 * instant updates, so this only has to catch a broken connection.
 */
const POLL_INTERVAL_MS = 20_000;

interface QueueCountContextValue {
  /** Products still waiting to be served (drives the nav badge). */
  pendingCount: number;
  /** Bumps whenever queue data changes — use it to refresh a view. */
  changeVersion: number;
  /** Re-reads the count immediately (call after a local action). */
  refreshQueueCount: () => void;
}

const QueueCountContext = createContext<QueueCountContextValue>({
  pendingCount: 0,
  changeVersion: 0,
  refreshQueueCount: () => {},
});

export function QueueCountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Starts at 0 on the server (the badge is hidden until then) and is filled
  // in immediately after mount, then kept fresh by realtime/polling — so the
  // layout never blocks a page render on this count.
  const [pendingCount, setPendingCount] = useState(0);
  const [changeVersion, setChangeVersion] = useState(0);
  const busyRef = useRef(false);

  const bump = useCallback(() => setChangeVersion((version) => version + 1), []);

  const fetchCount = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("transaction_items")
        .select("id", { count: "exact", head: true })
        .eq("queue_status", "pending");

      if (!error && typeof count === "number") setPendingCount(count);
    } catch {
      // Not configured / offline — the next tick tries again.
    } finally {
      busyRef.current = false;
    }
  }, []);

  const refreshQueueCount = useCallback(() => {
    void fetchCount();
  }, [fetchCount]);

  // Local actions (checkout, done, cancel) refresh instantly.
  useEffect(() => {
    const handleLocalChange = () => {
      bump();
      void fetchCount();
    };

    window.addEventListener(QUEUE_CHANGED_EVENT, handleLocalChange);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handleLocalChange);
  }, [bump, fetchCount]);

  // Poll + focus refresh keep the badge honest without realtime.
  useEffect(() => {
    const run = () => {
      if (!document.hidden) void fetchCount();
    };

    // Self-correct a stale server-rendered value right after mount.
    const mountId = window.setTimeout(run, 0);

    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);

    const interval = window.setInterval(run, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(mountId);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.clearInterval(interval);
    };
  }, [fetchCount]);

  // Supabase Realtime: instant updates, even from another device.
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("queue-count")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transaction_items" },
          () => {
            if (cancelled) return;
            bump();
            void fetchCount();
          },
        )
        .subscribe();
    } catch {
      // Polling above keeps the badge fresh anyway.
    }

    return () => {
      cancelled = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [bump, fetchCount]);

  const value = useMemo(
    () => ({
      pendingCount,
      changeVersion,
      refreshQueueCount,
    }),
    [pendingCount, changeVersion, refreshQueueCount],
  );

  return (
    <QueueCountContext.Provider value={value}>
      {children}
    </QueueCountContext.Provider>
  );
}

/** Live pending-queue count shared by the sidebar and the bottom nav. */
export function useQueueCount(): QueueCountContextValue {
  return useContext(QueueCountContext);
}
