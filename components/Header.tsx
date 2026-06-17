import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-header">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-2.5">
        <Logo size="header" />
      </div>
    </header>
  );
}
