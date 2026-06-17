import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-green-700 text-white">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-5 py-8 sm:flex-row sm:items-center">
        <Logo size="footer" />
        <p className="text-xs text-white/75">
          © {new Date().getFullYear()} Tassel CO$T. Data from the U.S.
          Department of Education{" "}
          <a
            href="https://collegescorecard.ed.gov/data/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold-500 underline-offset-2 hover:underline"
          >
            College Scorecard
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
