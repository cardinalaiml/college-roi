type Control = 1 | 2 | 3;

const STYLES: Record<Control, { label: string; className: string }> = {
  1: {
    label: "Public",
    className: "bg-brand-blue-50 text-brand-blue-700",
  },
  2: {
    label: "Private",
    className: "bg-brand-gray-100 text-brand-gray-600",
  },
  3: {
    label: "For-Profit",
    className: "bg-brand-amber-50 text-brand-amber-600",
  },
};

export function Badge({ control }: { control: Control }) {
  const style = STYLES[control];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
