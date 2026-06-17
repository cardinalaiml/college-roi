const FEATURES = [
  { icon: "🎓", label: "Official Department of Education data" },
  { icon: "💰", label: "Free loan + ROI calculators" },
  { icon: "📚", label: "Expert guides & financial aid resources" },
  { icon: "📊", label: "Compare colleges side-by-side" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-green-700 via-brand-green-600 to-brand-green-700 px-5 py-14 text-center text-white sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #FFB300 0, transparent 35%), radial-gradient(circle at 80% 70%, #66BB6A 0, transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          Find out if your{" "}
          <span className="text-white">college</span>{" "}
          <span className="text-brand-gold-500">is worth it.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
          Compare costs from 6,500+ colleges, calculate loan payments, and see
          the real ROI of your degree. All free, all official data.
        </p>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li
              key={f.label}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm backdrop-blur-sm"
            >
              <span aria-hidden className="text-xl">
                {f.icon}
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
