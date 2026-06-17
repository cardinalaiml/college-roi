import Link from "next/link";
import { Logo } from "./Logo";

type Column = {
  heading: string;
  links: { href: string; label: string }[];
};

const COLUMNS: Column[] = [
  {
    heading: "College Costs",
    links: [
      { href: "/college-costs-guide", label: "Complete Guide to College Costs" },
      { href: "/in-state-vs-out-state", label: "In-State vs Out-of-State Tuition" },
      { href: "/hidden-college-costs", label: "Hidden College Costs" },
      { href: "/college-cost-trends", label: "Cost Trends by State" },
      { href: "/community-vs-university", label: "Community vs University" },
    ],
  },
  {
    heading: "Financial Aid",
    links: [
      { href: "/financial-aid-guide", label: "Financial Aid Guide" },
      { href: "/student-loan-types", label: "Student Loan Types" },
      { href: "/scholarship-strategies", label: "Scholarship Strategies" },
      { href: "/reduce-college-expenses", label: "Reduce Expenses" },
    ],
  },
  {
    heading: "Planning Tools",
    links: [
      { href: "/", label: "Compare Colleges" },
      { href: "/#calculator", label: "Loan Calculator" },
      { href: "/#roi", label: "ROI Calculator" },
      { href: "/college-budgeting", label: "College Budgeting" },
      { href: "/degree-roi", label: "Degree ROI Analysis" },
    ],
  },
  {
    heading: "About Tassel CO$T",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact Us" },
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-green-700 text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gold-500">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/85 transition-colors hover:text-brand-gold-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center">
          <Logo size="footer" />
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} Tassel CO$T. Data from the U.S.
            Department of Education College Scorecard.
          </p>
        </div>
      </div>
    </footer>
  );
}
