"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";

const NAV_PRIMARY = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/about", label: "About", icon: "ℹ️" },
  { href: "/contact", label: "Contact", icon: "📞" },
];

const MOBILE_NAV = [
  { href: "/", label: "🏠 Home" },
  { href: "/college-costs-guide", label: "📚 Complete College Costs Guide" },
  { href: "/financial-aid-guide", label: "💰 Financial Aid Guide" },
  { href: "/in-state-vs-out-state", label: "📍 In-State vs Out-of-State" },
  { href: "/scholarship-strategies", label: "🏆 Scholarship Strategies" },
  { href: "/student-loan-types", label: "🏦 Student Loan Types" },
  { href: "/community-vs-university", label: "🏫 Community College vs University" },
  { href: "/hidden-college-costs", label: "👁️ Hidden College Costs" },
  { href: "/college-budgeting", label: "📋 How to Budget for College" },
  { href: "/college-cost-trends", label: "📈 College Cost Trends by State" },
  { href: "/degree-roi", label: "💹 ROI: Which Degrees Pay Off" },
  { href: "/reduce-college-expenses", label: "💡 Tips to Reduce College Expenses" },
  { href: "/about", label: "ℹ️ About Us" },
  { href: "/contact", label: "📞 Contact Us" },
  { href: "/privacy-policy", label: "🔒 Privacy Policy" },
  { href: "/terms-of-service", label: "📋 Terms of Service" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-header">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-2.5">
          <Logo size="header" />

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV_PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-brand-gray-700 transition-colors hover:text-brand-green-600"
              >
                <span aria-hidden className="mr-1">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-brand-green-700 transition-colors hover:bg-brand-green-50 md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] transform overflow-y-auto bg-white shadow-xl transition-transform md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-brand-gray-200 px-4 py-3">
          <Logo size="header" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-brand-gray-700 hover:bg-brand-gray-100"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="px-2 py-3" aria-label="Mobile">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-brand-gray-700 transition-colors hover:bg-brand-green-50 hover:text-brand-green-700"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
