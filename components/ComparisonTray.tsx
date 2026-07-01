"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useComparison } from "@/lib/comparison";

export function ComparisonTray() {
  const { entries, count, remove, clear, max } = useComparison();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  async function onCompare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeIds: entries.map((e) => e.unitId),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Save failed");
      }
      const { shortId } = (await res.json()) as { shortId: string };
      router.push(`/compare/${shortId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-green-100 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      aria-label="Comparison tray"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
            Compare ({count}/{max})
          </span>
          {entries.map((e) => (
            <span
              key={e.unitId}
              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-brand-green-50 px-3 py-1 text-xs text-brand-green-700"
            >
              <Link
                href={`/college/${e.unitId}-${e.slug}`}
                className="truncate hover:underline"
                title={e.name}
              >
                {e.name}
              </Link>
              <button
                type="button"
                onClick={() => remove(e.unitId)}
                aria-label={`Remove ${e.name}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-brand-green-700 hover:bg-brand-green-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {count >= 2 && (
            <button
              type="button"
              onClick={onCompare}
              disabled={busy}
              className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Loading…" : "Compare →"}
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-brand-gray-200 px-3 py-2 text-xs text-brand-gray-600 hover:bg-brand-gray-50"
          >
            Clear
          </button>
        </div>
      </div>
      {error && (
        <p className="mx-auto max-w-5xl px-4 pb-2 text-xs text-brand-red-600" role="alert">
          Couldn’t save the comparison: {error}
        </p>
      )}
    </aside>
  );
}
