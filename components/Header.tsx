import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { HeaderSearch } from "./HeaderSearch";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:py-3">
        <Link
          href="/"
          className="text-lg font-medium text-brand-black sm:text-base"
        >
          TassleCost
        </Link>
        <div className="w-full sm:ml-auto sm:max-w-md">
          <Suspense fallback={<SearchBar />}>
            <HeaderSearch />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
