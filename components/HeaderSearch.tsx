"use client";

import { useSearchParams } from "next/navigation";
import { SearchBar } from "./SearchBar";

export function HeaderSearch() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  return <SearchBar defaultValue={q} size="header" />;
}
