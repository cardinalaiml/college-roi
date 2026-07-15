"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-5 py-16">
      <h1 className="text-3xl font-bold text-brand-green-700">
        Something went wrong.
      </h1>
      <p className="text-sm text-brand-gray-500">
        This is on us. Try refreshing the page. If it keeps happening, come
        back in a few minutes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-brand-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-700"
      >
        Try again
      </button>
    </div>
  );
}
