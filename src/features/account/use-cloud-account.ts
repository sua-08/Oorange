"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { CLOUD_OWNER_KEY, queueGoalSync } from "@/infrastructure/supabase/sync-goals";

export function useCloudAccount(onMerged: (goals: SavedGoal[]) => void) {
  const onMergedRef = useRef(onMerged);
  useEffect(() => { onMergedRef.current = onMerged; }, [onMerged]);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const configured = !!getSupabaseClient();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    async function refresh() {
      try {
        const { data, error: authError } = await supabase!.auth.getUser();
        if (cancelled) return;
        if (authError || !data.user || data.user.is_anonymous) {
          setConnected(false);
          return;
        }
        const owner = localStorage.getItem(CLOUD_OWNER_KEY);
        if (owner && owner !== data.user.id) {
          setConnected(false);
          setError("이 브라우저에는 다른 계정의 기록이 있어요. 계정을 확인해주세요.");
          return;
        }
        setConnected(true);
        setSyncing(true);
        const goals = await queueGoalSync();
        if (cancelled) return;
        localStorage.setItem(CLOUD_OWNER_KEY, data.user.id);
        onMergedRef.current(goals);
        setError("");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "동기화에 실패했어요. 브라우저 기록은 남아 있어요.");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }
    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") window.setTimeout(() => void refresh(), 0);
      if (event === "SIGNED_OUT") setConnected(false);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  async function connect() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError("Google 계정을 연결하지 못했어요. 다시 시도해주세요.");
  }

  async function syncAfterWrite() {
    if (!connected || localStorage.getItem(CLOUD_OWNER_KEY) === null) return;
    try {
      setSyncing(true);
      const goals = await queueGoalSync();
      onMergedRef.current(goals);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "동기화에 실패했어요. 브라우저 기록은 남아 있어요.");
    } finally {
      setSyncing(false);
    }
  }

  return { configured, connected, syncing, error, connect, syncAfterWrite };
}
