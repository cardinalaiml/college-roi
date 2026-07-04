import Link from "next/link";
import { Logo } from "./Logo";
import { STATES } from "@/lib/states";

// Largest higher-ed states get direct footer links; the rest live one hop
// away behind /colleges.
const FEATURED_STATE_CODES = ["CA", "TX", "NY", "FL", "PA", "OH", "IL", "VA"];

const FEATURED_STATES = FEATURED_STATE_CODES.map(
  (code) => STATES.find((s) => s.code === code)!,
);

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-green-700 text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-10">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-sm">
            <Logo size="footer" />
            <p className="mt-3 text-xs text-white/75">
              Free college cost comparison and student loan calculators, built
              on official U.S. Department of Education{" "}
              <a
                href="https://collegescorecard.ed.gov/data/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold-500 underline-offset-2 hover:underline"
              >
                College Scorecard
              </a>{" "}
              data.
            </p>
          </div>

          <nav aria-label="Browse colleges by state">
            <h2 className="text-sm font-semibold text-white">
              Browse colleges by state
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-white/75">
              {FEATURED_STATES.map((state) => (
                <li key={state.code}>
                  <Link
                    href={`/colleges/${state.slug}`}
                    className="underline-offset-2 hover:text-white hover:underline"
                  >
                    Colleges in {state.name}
                  </Link>
                </li>
              ))}
              <li className="col-span-2 pt-1">
                <Link
                  href="/colleges"
                  className="font-medium text-brand-gold-500 underline-offset-2 hover:underline"
                >
                  All 50 states →
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-white/15 pt-4 text-xs text-white/60">
          © {new Date().getFullYear()} Tassel CO$T.
        </p>
      </div>
    </footer>
  );
}
