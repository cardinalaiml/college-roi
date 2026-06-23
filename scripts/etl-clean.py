#!/usr/bin/env python3
"""
College Scorecard → three normalized CSVs.

Reads:
  data/Most-Recent-Cohorts-Institution.csv
  (or SCORECARD_CSV env var override, or the Mar-2026 Desktop snapshot)

Writes (to data/clean/):
  institutions.csv  — one row per institution: identity, location,
                      type, accreditor, size
  costs.csv         — one row per institution: tuition, fees, books,
                      housing, food, cost of attendance, net price
  debt.csv          — one row per institution: median debt, monthly
                      payment, cumulative debt percentiles, % with
                      federal loans

All three share `unit_id` (the IPEDS UNITID) as the join key.

Run:
  python3 scripts/etl-clean.py

Read-only against the raw CSV; nothing is sent to Supabase.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd

# ──────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV_NAME = "Most-Recent-Cohorts-Institution.csv"
OUT_DIR = PROJECT_ROOT / "data" / "clean"

CANDIDATE_INPUTS = [
    Path(os.environ["SCORECARD_CSV"]) if os.environ.get("SCORECARD_CSV") else None,
    PROJECT_ROOT / "data" / DEFAULT_CSV_NAME,
    Path.home()
    / "Desktop"
    / "College_Scorecard_Raw_Data_03232026"
    / DEFAULT_CSV_NAME,
]

# Scorecard sentinels meaning "no value"
NULL_TOKENS = ["NULL", "PrivacySuppressed", "NA", "PS"]

# ──────────────────────────────────────────────────────────────────────
# Column maps (raw Scorecard → snake_case output)
# Only listed columns are kept. The 3,000+ unused columns are dropped.
# ──────────────────────────────────────────────────────────────────────
INSTITUTION_COLS: dict[str, str] = {
    "UNITID":       "unit_id",
    "INSTNM":       "name",
    "CITY":         "city",
    "STABBR":       "state",
    "ZIP":          "zip",
    "CONTROL":      "control",            # 1=public, 2=private nonprofit, 3=for-profit
    "PREDDEG":      "predominant_degree", # 0..4
    "HIGHDEG":      "highest_degree",     # 0..4
    "ICLEVEL":      "institution_level",  # 1=4yr, 2=2yr, 3=<2yr
    "REGION":       "region",
    "LOCALE":       "locale",
    "ACCREDAGENCY": "accreditor",
    "INSTURL":      "url",
    "LATITUDE":     "latitude",
    "LONGITUDE":    "longitude",
    "UGDS":         "undergrad_size",
    "HBCU":         "is_hbcu",
    "HSI":          "is_hispanic_serving",
    "TRIBAL":       "is_tribal",
    "WOMENONLY":    "is_women_only",
    "MENONLY":      "is_men_only",
    "CURROPER":     "is_operating",
}

COST_COLS: dict[str, str] = {
    "UNITID":            "unit_id",
    # tuition & fees
    "TUITIONFEE_IN":     "tuition_in_state",
    "TUITIONFEE_OUT":    "tuition_out_state",
    "TUITIONFEE_PROG":   "tuition_program_year",
    "TUITFTE":           "tuition_revenue_per_fte",
    # books
    "BOOKSUPPLY":        "books_supplies",
    # housing + food (Scorecard bundles food into room/board)
    "ROOMBOARD_ON":      "room_board_on_campus",
    "ROOMBOARD_OFF":     "room_board_off_campus",
    "OTHEREXPENSE_ON":   "other_expense_on_campus",
    "OTHEREXPENSE_OFF":  "other_expense_off_campus",
    "OTHEREXPENSE_FAM":  "other_expense_with_family",
    # cost of attendance
    "COSTT4_A":          "cost_of_attendance_academic_year",
    "COSTT4_P":          "cost_of_attendance_program_year",
    # net price (after average aid)
    "NPT4_PUB":          "net_price_public",
    "NPT4_PRIV":         "net_price_private",
    "NPT4_PROG":         "net_price_program_year",
    # net price by family income (public)
    "NPT41_PUB":         "net_price_public_0_30k",
    "NPT42_PUB":         "net_price_public_30k_48k",
    "NPT43_PUB":         "net_price_public_48k_75k",
    "NPT44_PUB":         "net_price_public_75k_110k",
    "NPT45_PUB":         "net_price_public_110k_plus",
    # net price by family income (private)
    "NPT41_PRIV":        "net_price_private_0_30k",
    "NPT42_PRIV":        "net_price_private_30k_48k",
    "NPT43_PRIV":        "net_price_private_48k_75k",
    "NPT44_PRIV":        "net_price_private_75k_110k",
    "NPT45_PRIV":        "net_price_private_110k_plus",
}

OUTCOMES_COLS: dict[str, str] = {
    "UNITID":            "unit_id",
    # median earnings (working not enrolled cohort)
    "MD_EARN_WNE_P6":    "median_earnings_6yr",
    "MD_EARN_WNE_P10":   "median_earnings_10yr",
    # mean earnings (working not enrolled cohort)
    "MN_EARN_WNE_P6":    "mean_earnings_6yr",
    "MN_EARN_WNE_P10":   "mean_earnings_10yr",
    # 10-year distribution
    "PCT10_EARN_WNE_P10": "earnings_pct10_10yr",
    "PCT25_EARN_WNE_P10": "earnings_pct25_10yr",
    "PCT75_EARN_WNE_P10": "earnings_pct75_10yr",
    "PCT90_EARN_WNE_P10": "earnings_pct90_10yr",
    # thresholded outcomes
    "GT_25K_P10":        "pct_earning_above_25k_10yr",
    "GT_THRESHOLD_P10":  "pct_earning_above_threshold_10yr",
}

# MD_EARN_WNE_P10's raw string distinguishes "PrivacySuppressed" (a small
# enough graduating cohort that the figure was withheld) from missing /
# not reported. We need that distinction for the UI's null message — so
# we read it from a separate pass that *doesn't* coerce na_values.
SUPPRESSION_DRIVER = "MD_EARN_WNE_P10"


DEBT_COLS: dict[str, str] = {
    "UNITID":               "unit_id",
    # median debt
    "DEBT_MDN":             "median_debt_all",
    "GRAD_DEBT_MDN":        "median_debt_completers",
    "WDRAW_DEBT_MDN":       "median_debt_withdrawn",
    # monthly payment (10yr standard amortization)
    "GRAD_DEBT_MDN10YR":    "monthly_payment_completers_10yr",
    # by family income
    "LO_INC_DEBT_MDN":      "median_debt_low_income",
    "MD_INC_DEBT_MDN":      "median_debt_middle_income",
    "HI_INC_DEBT_MDN":      "median_debt_high_income",
    # by dependency
    "DEP_DEBT_MDN":         "median_debt_dependent",
    "IND_DEBT_MDN":         "median_debt_independent",
    # by aid
    "PELL_DEBT_MDN":        "median_debt_pell",
    "NOPELL_DEBT_MDN":      "median_debt_no_pell",
    # by sex
    "FEMALE_DEBT_MDN":      "median_debt_female",
    "MALE_DEBT_MDN":        "median_debt_male",
    # by first-gen
    "FIRSTGEN_DEBT_MDN":    "median_debt_first_gen",
    "NOTFIRSTGEN_DEBT_MDN": "median_debt_not_first_gen",
    # cumulative debt percentiles
    "CUML_DEBT_P90":        "cumulative_debt_p90",
    "CUML_DEBT_P75":        "cumulative_debt_p75",
    "CUML_DEBT_P25":        "cumulative_debt_p25",
    "CUML_DEBT_P10":        "cumulative_debt_p10",
    # PLUS loans
    "PLUS_DEBT_ALL_MD":     "median_plus_debt",
    # uptake
    "PCTFLOAN":             "pct_with_federal_loan",
    "PCTFLOAN_DCS":         "pct_with_federal_loan_degree_seeking",
    "PPLUS_PCT_LOW":        "pct_parent_plus_low",
    "PPLUS_PCT_HIGH":       "pct_parent_plus_high",
}

# Subsets that should be cast to integer dollars (Int64 = nullable int).
# Everything else stays float (percentages, lat/lon, etc.) or string
# (name, city, state, url).
MONEY_COLS_COST = {
    name for raw, name in COST_COLS.items()
    if raw not in ("UNITID", "TUITFTE")
}
MONEY_COLS_DEBT = {
    name for raw, name in DEBT_COLS.items()
    if name.startswith("median_debt")
    or name.startswith("cumulative_debt")
    or name == "monthly_payment_completers_10yr"
    or name == "median_plus_debt"
}
MONEY_COLS_OUTCOMES = {
    name for raw, name in OUTCOMES_COLS.items()
    if name.startswith("median_earnings")
    or name.startswith("mean_earnings")
    or name.startswith("earnings_pct")
}
INT_COLS_INSTITUTION = {
    "unit_id", "control", "predominant_degree", "highest_degree",
    "institution_level", "region", "locale", "undergrad_size",
    "is_hbcu", "is_hispanic_serving", "is_tribal", "is_women_only",
    "is_men_only", "is_operating",
}

OUTPUT_FLOAT_FRACTION = {
    "pct_with_federal_loan", "pct_with_federal_loan_degree_seeking",
    "pct_parent_plus_low", "pct_parent_plus_high",
    "tuition_revenue_per_fte", "latitude", "longitude",
}


def resolve_input() -> Path:
    for candidate in CANDIDATE_INPUTS:
        if candidate and candidate.is_file():
            return candidate
    print("Scorecard CSV not found. Looked in:", file=sys.stderr)
    for c in CANDIDATE_INPUTS:
        if c:
            print(f"  • {c}", file=sys.stderr)
    print(
        '\nDownload "Most Recent Data" from https://collegescorecard.ed.gov/data/',
        file=sys.stderr,
    )
    print(
        f"and place {DEFAULT_CSV_NAME} at data/, or set SCORECARD_CSV=/path/to/file.csv",
        file=sys.stderr,
    )
    sys.exit(1)


def load_raw(path: Path) -> pd.DataFrame:
    """Read the raw Scorecard, coercing all sentinels to NaN."""
    print(f"Reading {path}…")
    needed = (
        set(INSTITUTION_COLS)
        | set(COST_COLS)
        | set(DEBT_COLS)
        | set(OUTCOMES_COLS)
    )
    df = pd.read_csv(
        path,
        usecols=lambda c: c in needed,
        na_values=NULL_TOKENS,
        keep_default_na=True,
        low_memory=False,
        dtype=str,  # read everything as string, coerce later
    )
    print(f"  read {len(df):,} rows × {len(df.columns):,} cols")
    return df


def load_suppression_signal(path: Path) -> pd.DataFrame:
    """
    Second pass over just UNITID + MD_EARN_WNE_P10 that *doesn't*
    coerce na_values. Lets us tell apart "PrivacySuppressed" rows
    (suppressed for cohort size) from rows where the column is
    plain empty / NULL (not reported at all).
    """
    df = pd.read_csv(
        path,
        usecols=["UNITID", SUPPRESSION_DRIVER],
        keep_default_na=False,
        na_values=[],
        dtype=str,
    )

    def reason(raw: str) -> str | None:
        if raw == "PrivacySuppressed":
            return "suppressed"
        if raw == "" or raw in ("NULL", "NA", "PS"):
            return "not_reported"
        return None  # value present

    df["earnings_null_reason"] = df[SUPPRESSION_DRIVER].apply(reason)
    df["UNITID"] = pd.to_numeric(df["UNITID"], errors="coerce").astype("Int64")
    return df[["UNITID", "earnings_null_reason"]]


def dedupe(df: pd.DataFrame, key: str = "UNITID") -> pd.DataFrame:
    before = len(df)
    df = df.dropna(subset=[key]).copy()
    df = df.drop_duplicates(subset=[key], keep="first").copy()
    dropped = before - len(df)
    if dropped:
        print(f"  dropped {dropped:,} duplicate or unit-id-null rows")
    return df


def coerce_money(s: pd.Series) -> pd.Series:
    """String → nullable Int64 dollars."""
    return pd.to_numeric(s, errors="coerce").round().astype("Int64")


def coerce_int(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce").astype("Int64")


def coerce_float(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce").astype("Float64")


def build_table(
    raw: pd.DataFrame,
    col_map: dict[str, str],
    money_cols: set[str],
    int_cols: set[str] | None = None,
    float_cols: set[str] | None = None,
) -> pd.DataFrame:
    int_cols = int_cols or set()
    float_cols = float_cols or set()

    # 1) Project + rename
    cols_present = [c for c in col_map if c in raw.columns]
    missing = [c for c in col_map if c not in raw.columns]
    if missing:
        print(f"  warning — {len(missing)} expected columns missing in source: "
              f"{', '.join(missing[:5])}{'…' if len(missing) > 5 else ''}")
    df = raw[cols_present].rename(columns={k: col_map[k] for k in cols_present})

    # 2) Type coercion
    for col in df.columns:
        if col in money_cols:
            df[col] = coerce_money(df[col])
        elif col in int_cols:
            df[col] = coerce_int(df[col])
        elif col in float_cols:
            df[col] = coerce_float(df[col])
        # otherwise leave as string (object)

    return df


def summarize(name: str, df: pd.DataFrame) -> None:
    print(f"\n• {name}: {len(df):,} rows × {len(df.columns):,} cols")
    pct = (df.isna().sum() / len(df) * 100).round(1) if len(df) else None
    if pct is None:
        return
    populated = pct[pct < 100].sort_values()
    if len(populated) == 0:
        return
    width = max(len(c) for c in populated.index)
    for col, pct_null in populated.items():
        pct_pop = 100 - pct_null
        bar = "█" * int(round(pct_pop / 5))
        print(
            f"    {col.ljust(width)}  {pct_pop:5.1f}%  "
            f"{bar}"
        )


def main() -> None:
    src = resolve_input()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    raw = load_raw(src)
    raw = dedupe(raw)

    institutions = build_table(
        raw,
        INSTITUTION_COLS,
        money_cols=set(),
        int_cols=INT_COLS_INSTITUTION,
        float_cols={"latitude", "longitude"},
    )
    costs = build_table(
        raw,
        COST_COLS,
        money_cols=MONEY_COLS_COST,
        int_cols={"unit_id"},
        float_cols={"tuition_revenue_per_fte"},
    )
    debt = build_table(
        raw,
        DEBT_COLS,
        money_cols=MONEY_COLS_DEBT,
        int_cols={"unit_id"},
        float_cols=OUTPUT_FLOAT_FRACTION,
    )

    # outcomes: project + coerce, then merge in the suppression sentinel
    # from the un-coerced read
    outcomes = build_table(
        raw,
        OUTCOMES_COLS,
        money_cols=MONEY_COLS_OUTCOMES,
        int_cols={"unit_id"},
        float_cols={
            "pct_earning_above_25k_10yr",
            "pct_earning_above_threshold_10yr",
        },
    )
    suppression = load_suppression_signal(src)
    outcomes = outcomes.merge(
        suppression, left_on="unit_id", right_on="UNITID", how="left",
    ).drop(columns=["UNITID"])

    # institutions.csv should be the join authority — every other
    # table must point back at a row here
    assert institutions["unit_id"].is_unique, "institution unit_id not unique"
    assert costs["unit_id"].is_unique, "cost unit_id not unique"
    assert debt["unit_id"].is_unique, "debt unit_id not unique"
    assert outcomes["unit_id"].is_unique, "outcomes unit_id not unique"

    out_institutions = OUT_DIR / "institutions.csv"
    out_costs = OUT_DIR / "costs.csv"
    out_debt = OUT_DIR / "debt.csv"
    out_outcomes = OUT_DIR / "outcomes.csv"

    institutions.to_csv(out_institutions, index=False)
    costs.to_csv(out_costs, index=False)
    debt.to_csv(out_debt, index=False)
    outcomes.to_csv(out_outcomes, index=False)

    print(f"\nWrote {out_institutions.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {out_costs.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {out_debt.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {out_outcomes.relative_to(PROJECT_ROOT)}")

    summarize("institutions.csv", institutions)
    summarize("costs.csv", costs)
    summarize("debt.csv", debt)
    summarize("outcomes.csv", outcomes)


if __name__ == "__main__":
    main()
