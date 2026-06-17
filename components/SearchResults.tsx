"use client";

import { useEffect, useRef, useState } from "react";
import { CollegeCard, type CollegeCardProps } from "./CollegeCard";

type SearchHit = {
  id: number;
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  net_price: number | null;
  salary_10yr: number | null;
  salary_null_reason: string | null;
  slug: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; hits: SearchHit[] }
  | { status: "error" };

const DEBOUNCE_MS = 300;

export function SearchResults({ query }: { query: string }) {
  const [state, setState] = useState<FetchState>(
    query ? { status: "loading" } : { status: "idle" },
  );
  const lastRequestId = useRef(0);

  useEffect(() => {
    if (!query) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    const requestId = ++lastRequestId.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (requestId !== lastRequestId.current) return;
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const body = (await res.json()) as { results?: SearchHit[] };
        setState({ status: "success", hits: body.results ?? [] });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (requestId !== lastRequestId.current) return;
        setState({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className="grid gap-3" aria-busy aria-live="polite">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-lg border border-brand-red-100 bg-brand-red-50 p-4 text-sm text-brand-red-600"
      >
        Search is unavailable right now. Try again in a moment.
      </p>
    );
  }

  if (state.hits.length === 0) {
    return (
      <p className="rounded-lg border border-brand-gray-200 bg-white p-4 text-sm text-brand-gray-500">
        No colleges matched &ldquo;{query}&rdquo;. Try a partial name, city
        name, or two-letter state abbreviation.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {state.hits.map((hit) => (
        <CollegeCard key={hit.unit_id} {...toCardProps(hit)} />
      ))}
    </div>
  );
}

function toCardProps(hit: SearchHit): CollegeCardProps {
  return {
    name: hit.name,
    city: hit.city ?? "",
    state: hit.state ?? "",
    control: (hit.control ?? 2) as 1 | 2 | 3,
    netPrice: hit.net_price,
    salary10yr: hit.salary_10yr,
    salaryNullReason: hit.salary_null_reason,
    unitId: hit.unit_id,
    slug: hit.slug,
  };
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-lg border border-brand-gray-200 bg-white p-4"
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-brand-gray-100" />
        <div className="h-4 w-16 rounded bg-brand-gray-100" />
      </div>
      <div className="mt-2 h-3 w-1/3 rounded bg-brand-gray-100" />
      <div className="mt-3 h-3 w-5/6 rounded bg-brand-gray-100" />
    </div>
  );
}
