import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-5 py-16">
      <h1 className="text-3xl font-bold text-brand-green-700">
        That page does not exist.
      </h1>
      <p className="text-sm text-brand-gray-500">
        The college you are looking for may have closed or changed its name.
        Search for it above.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/"
          className="rounded-lg bg-brand-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-700"
        >
          Back to search
        </Link>
        <Link
          href="/colleges"
          className="rounded-lg border border-brand-gray-200 bg-white px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-green-300"
        >
          Browse colleges by state
        </Link>
      </div>
    </div>
  );
}
