"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "tasselcost:comparison";
const MAX_COLLEGES = 3;
const CHANGE_EVENT = "tasselcost:comparison:change";

export type ComparisonEntry = {
  unitId: number;
  name: string;
  slug: string;
};

function read(): ComparisonEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is ComparisonEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof e.unitId === "number" &&
          typeof e.name === "string" &&
          typeof e.slug === "string",
      )
      .slice(0, MAX_COLLEGES);
  } catch {
    return [];
  }
}

function write(entries: ComparisonEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Hook: live-tracking the localStorage comparison list across the tab and
 * across tabs. Re-renders any caller when add / remove / clear happens.
 */
export function useComparison() {
  const [entries, setEntries] = useState<ComparisonEntry[]>([]);

  useEffect(() => {
    setEntries(read());
    const onChange = () => setEntries(read());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((entry: ComparisonEntry): boolean => {
    const current = read();
    if (current.some((e) => e.unitId === entry.unitId)) return true;
    if (current.length >= MAX_COLLEGES) return false;
    write([...current, entry]);
    return true;
  }, []);

  const remove = useCallback((unitId: number): void => {
    const next = read().filter((e) => e.unitId !== unitId);
    write(next);
  }, []);

  const clear = useCallback((): void => {
    write([]);
  }, []);

  const has = useCallback(
    (unitId: number): boolean => entries.some((e) => e.unitId === unitId),
    [entries],
  );

  return {
    entries,
    add,
    remove,
    clear,
    has,
    count: entries.length,
    isFull: entries.length >= MAX_COLLEGES,
    max: MAX_COLLEGES,
  };
}
