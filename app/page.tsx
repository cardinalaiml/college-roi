import { CollegeCard } from "@/components/CollegeCard";
import { Hero } from "@/components/Hero";
import { LoanCalculator } from "@/components/LoanCalculator";
import { ROICalculator } from "@/components/ROICalculator";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { Sidebar } from "@/components/Sidebar";
import { EXAMPLE_COLLEGES } from "@/lib/example-colleges";

type SearchParams = { q?: string };

export default function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = (searchParams.q ?? "").trim();

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <SearchSection initialQuery={query} />

            {query ? (
              <SearchResults query={query} />
            ) : (
              <>
                <ExampleCollegesSection />
                <LoanCalculator />
                <section id="roi" className="scroll-mt-20">
                  <ROICalculator defaultCost={null} defaultSalary={null} />
                </section>
              </>
            )}
          </div>
          <Sidebar />
        </div>
      </div>
    </>
  );
}

function SearchSection({ initialQuery }: { initialQuery: string }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-card">
      <h2 className="text-xl font-bold text-brand-green-700">
        🔍 Find Your Colleges
      </h2>
      <p className="mt-1 text-sm text-brand-gray-500">
        Start typing a school name, city, or state to search 6,500+ U.S.
        institutions.
      </p>
      <div className="mt-4">
        <SearchBar
          defaultValue={initialQuery}
          size="hero"
          placeholder="Type a college name (e.g., University of Virginia)..."
        />
      </div>
    </section>
  );
}

function ExampleCollegesSection() {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-bold text-brand-green-700">
          🏛️ See how it works
        </h2>
        <span className="text-xs uppercase tracking-wide text-brand-gray-500">
          3 example colleges
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {EXAMPLE_COLLEGES.map((college) => (
          <CollegeCard key={college.unitId} {...college} />
        ))}
      </div>
    </section>
  );
}
