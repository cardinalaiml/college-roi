import { CollegeCard } from "@/components/CollegeCard";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { EXAMPLE_COLLEGES } from "@/lib/example-colleges";

type SearchParams = { q?: string };

export default function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = (searchParams.q ?? "").trim();

  if (query) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <SearchResults query={query} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-16">
      <section className="flex flex-col items-center text-center">
        <h1 className="max-w-3xl text-3xl font-medium text-brand-black sm:text-4xl">
          Find out if your college is worth it.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-brand-gray-500 sm:text-lg">
          Compare real costs and salary outcomes for 7,000+ colleges before
          you sign anything.
        </p>
        <div className="mt-8 w-full sm:max-w-[480px]">
          <SearchBar
            size="hero"
            placeholder="Search colleges, universities, and community colleges"
          />
        </div>
      </section>

      <section className="mt-16">
        <p className="mb-4 text-xs uppercase tracking-wide text-brand-gray-400">
          See how it works
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXAMPLE_COLLEGES.map((college) => (
            <CollegeCard key={college.unitId} {...college} />
          ))}
        </div>
      </section>
    </div>
  );
}
