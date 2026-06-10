import { CollegeCard, type CollegeCardProps } from "@/components/CollegeCard";
import { SearchBar } from "@/components/SearchBar";

type SearchParams = { q?: string };

const EXAMPLE_COLLEGES: CollegeCardProps[] = [
  {
    name: "Massachusetts Institute of Technology",
    city: "Cambridge",
    state: "MA",
    control: 2,
    netPrice: 22230,
    salary10yr: 124200,
    unitId: 166683,
    slug: "massachusetts-institute-of-technology",
  },
  {
    name: "University of California-Los Angeles",
    city: "Los Angeles",
    state: "CA",
    control: 1,
    netPrice: 14760,
    salary10yr: 74700,
    unitId: 110662,
    slug: "university-of-california-los-angeles",
  },
  {
    name: "Northern Virginia Community College",
    city: "Annandale",
    state: "VA",
    control: 1,
    netPrice: 8930,
    salary10yr: 41600,
    unitId: 232867,
    slug: "northern-virginia-community-college",
  },
];

export default function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = (searchParams.q ?? "").trim();

  if (query) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-brand-gray-500">
          Showing results for &ldquo;{query}&rdquo;.
        </p>
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
