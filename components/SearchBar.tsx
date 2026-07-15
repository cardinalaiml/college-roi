"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Size = "header" | "hero";

type Props = {
  defaultValue?: string;
  size?: Size;
  placeholder?: string;
  autoFocus?: boolean;
};

const SIZES: Record<Size, string> = {
  header: "h-10 text-sm",
  hero: "h-12 text-base",
};

export function SearchBar({
  defaultValue = "",
  size = "header",
  placeholder = "Search colleges, universities, and community colleges",
  autoFocus = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const lastPushed = useRef(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
    lastPushed.current = defaultValue;
  }, [defaultValue]);

  function pushQuery(next: string) {
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    // Carry active filter params (state/type/price) along with the query.
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("q", next);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    const target = qs ? `/?${qs}` : "/";
    // On the homepage, typing refines in place; from any other page the
    // search navigates home, so keep that page in history for Back.
    if (pathname === "/") {
      router.replace(target, { scroll: false });
    } else {
      router.push(target, { scroll: false });
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    pushQuery(next);
  }

  return (
    <label
      className={`relative flex w-full items-center rounded-lg border bg-white transition-colors ${
        focused ? "border-brand-blue-600" : "border-brand-gray-200"
      } ${SIZES[size]}`}
    >
      <SearchIcon
        className={`pointer-events-none absolute left-4 h-[18px] w-[18px] ${
          focused ? "text-brand-blue-600" : "text-brand-gray-400"
        }`}
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-full w-full rounded-lg bg-transparent pl-11 pr-4 text-brand-black placeholder:text-brand-gray-400 focus:outline-none"
        aria-label="Search colleges"
      />
    </label>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
