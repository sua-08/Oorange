import { useCallback, useEffect, useRef, useState } from "react";

export type Seed = {
  finalGoal: string;
  starterAction: string;
  acquiredAt: number;
};

export function useStartSession() {
  const [startDeadline, setStartDeadline] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const [deferred, setDeferred] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);
  const seedRef = useRef<Seed | null>(null);

  useEffect(() => {
    if (startDeadline === null || seed) return;
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setClockNow(currentTime);
      if (currentTime >= startDeadline) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [startDeadline, seed]);

  const secondsLeft = startDeadline === null
    ? 60
    : Math.max(0, Math.ceil((startDeadline - clockNow) / 1000));

  function reset() {
    setStartDeadline(null);
    setDeferred(false);
    setSeed(null);
    seedRef.current = null;
  }

  const restore = useCallback((restoredSeed: Seed | null) => {
    setStartDeadline(null);
    setDeferred(false);
    setSeed(restoredSeed);
    seedRef.current = restoredSeed;
  }, []);

  function begin() {
    const currentTime = Date.now();
    setClockNow(currentTime);
    setStartDeadline(currentTime + 60_000);
    setDeferred(false);
  }

  function defer() {
    setStartDeadline(null);
    setDeferred(true);
  }

  function confirm(finalGoal: string, starterAction: string): Seed | null {
    if (seedRef.current || startDeadline === null) return null;
    const currentTime = Date.now();
    if (currentTime >= startDeadline) {
      setClockNow(currentTime);
      return null;
    }
    const acquired = { finalGoal, starterAction, acquiredAt: currentTime };
    seedRef.current = acquired;
    setSeed(acquired);
    setStartDeadline(null);
    return acquired;
  }

  return { startDeadline, deferred, seed, secondsLeft, reset, restore, begin, defer, confirm };
}
