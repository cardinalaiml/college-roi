"use client";

import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";

// The homepage has the hero search box; everywhere else gets a compact
// search in the sticky header.
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <div className="w-full max-w-sm">
      <SearchBar placeholder="Search colleges..." />
    </div>
  );
}
