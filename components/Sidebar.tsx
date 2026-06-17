import Link from "next/link";

const RESOURCES = [
  { href: "/college-costs-guide", label: "📚 Complete College Costs Guide" },
  { href: "/financial-aid-guide", label: "💰 Financial Aid Application Help" },
  { href: "/in-state-vs-out-state", label: "📍 In-State vs Out-of-State Guide" },
  { href: "/scholarship-strategies", label: "🏆 Scholarship Search Strategies" },
  { href: "/student-loan-types", label: "🏦 Student Loan Types Explained" },
  { href: "/college-budgeting", label: "📋 College Budgeting Tips" },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-5">
      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-base font-semibold text-brand-green-700">
          Popular Resources
        </h3>
        <ul className="space-y-1.5">
          {RESOURCES.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="block rounded-md px-2 py-1.5 text-sm text-brand-gray-700 transition-colors hover:bg-brand-green-50 hover:text-brand-green-700"
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-brand-green-700 p-5 text-white shadow-card">
        <h3 className="mb-2 text-base font-semibold text-brand-gold-500">
          Need Help Planning?
        </h3>
        <p className="text-sm text-white/90">
          Our guides cover everything from hidden costs to financial aid
          strategies. Start making informed decisions about your education
          investment.
        </p>
        <Link
          href="/college-costs-guide"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand-gold-500 px-4 py-2 text-sm font-semibold text-brand-green-700 transition-colors hover:bg-brand-gold-600 hover:text-white"
        >
          Explore Guides →
        </Link>
      </section>
    </aside>
  );
}
