"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type SearchFilterValues = {
  state: string;
  type: string;
  price: string;
};

export const EMPTY_FILTERS: SearchFilterValues = {
  state: "",
  type: "",
  price: "",
};

const STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"],
  ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as const;

const TYPES = [
  ["public", "Public"],
  ["private", "Private nonprofit"],
  ["forprofit", "For-profit"],
] as const;

const PRICES = [
  ["under10", "Under $10k/yr"],
  ["10to20", "$10k–$20k/yr"],
  ["20to30", "$20k–$30k/yr"],
  ["over30", "Over $30k/yr"],
] as const;

export function SearchFilters({ values }: { values: SearchFilterValues }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: keyof SearchFilterValues, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("state");
    params.delete("type");
    params.delete("price");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  const hasActive = Boolean(values.state || values.type || values.price);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="State"
        value={values.state}
        allLabel="All states"
        options={STATES}
        onChange={(v) => setParam("state", v)}
      />
      <FilterSelect
        label="Type"
        value={values.type}
        allLabel="All types"
        options={TYPES}
        onChange={(v) => setParam("type", v)}
      />
      <FilterSelect
        label="Net price"
        value={values.price}
        allLabel="Any net price"
        options={PRICES}
        onChange={(v) => setParam("price", v)}
      />
      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="h-10 rounded-lg px-3 text-sm font-medium text-brand-blue-600 hover:bg-brand-blue-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Filter by ${label.toLowerCase()}`}
      className={`h-10 rounded-lg border bg-white px-3 text-sm focus:border-brand-blue-600 focus:outline-none ${
        value
          ? "border-brand-green-300 text-brand-black"
          : "border-brand-gray-200 text-brand-gray-500"
      }`}
    >
      <option value="">{allLabel}</option>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}
