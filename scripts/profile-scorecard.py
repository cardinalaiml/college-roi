#!/usr/bin/env python3
"""
College Scorecard profiling.
Read-only; nothing is written to Supabase or any other store.

Profiles:
  - Most-Recent-Cohorts-Institution.csv (the canonical per-institution snapshot
    we'd use for the live site)
  - MERGED2024_25_PP.csv (the latest year-cohort, for comparison)

Prints a structured report to stdout suitable for piping into a markdown file.
"""

import os
import re
import sys
from collections import Counter
from pathlib import Path

import pandas as pd
import yaml

DATA_DIR = Path("/Users/aiml/Desktop/College_Scorecard_Raw_Data_03232026")
MAIN_FILE = DATA_DIR / "Most-Recent-Cohorts-Institution.csv"
MERGED_FILE = DATA_DIR / "MERGED2024_25_PP.csv"
DICT_FILE = DATA_DIR / "data.yaml"

# Scorecard treats these as nulls in addition to empty / NaN
NULL_TOKENS = ["NULL", "PrivacySuppressed", "NA", "PS"]

# Domain bucketing rules — substring patterns matched against UPPERCASE col names
DOMAIN_RULES = [
    ("institution_info", [
        "UNITID", "INSTNM", "CITY", "STABBR", "ZIP", "ACCREDAGENCY",
        "ACCREDCODE", "INSTURL", "NPCURL", "CONTROL", "MAIN", "NUMBRANCH",
        "OPEID", "OPEFLAG", "PREDDEG", "HIGHDEG", "LATITUDE", "LONGITUDE",
        "ST_FIPS", "REGION", "LOCALE", "CCBASIC", "CCUGPROF", "CCSIZSET",
        "HBCU", "PBI", "TRIBAL", "AANAPII", "HSI", "NANTI", "MENONLY",
        "WOMENONLY", "RELAFFIL", "DISTANCEONLY", "SCH_DEG",
    ]),
    ("tuition", [
        "TUITIONFEE_IN", "TUITIONFEE_OUT", "TUITIONFEE_PROG",
        "TUITFTE", "PFTFAC", "TUITION",
    ]),
    ("fees", [
        "TUITIONFEE_IN", "TUITIONFEE_OUT", "FEE", "TUITFTE",
    ]),
    ("books", ["BOOKSUPPLY", "BOOK"]),
    ("housing", [
        "ROOMBOARD_ON", "ROOMBOARD_OFF", "OTHEREXPENSE_ON",
        "OTHEREXPENSE_OFF", "OTHEREXPENSE_FAM",
    ]),
    ("food", ["ROOMBOARD_ON", "ROOMBOARD_OFF", "FOOD", "MEAL"]),
    ("cost_of_attendance", [
        "COSTT4_A", "COSTT4_P", "NPT4_PUB", "NPT4_PRIV", "NPT4_PROG",
        "NPT4_048_PUB", "NPT4_048_PRIV", "NPT4_3075_PUB", "NPT4_3075_PRIV",
        "NPT41_", "NPT42_", "NPT43_", "NPT44_", "NPT45_",
        "NPT4_OTHER", "NUM4_", "NETPRICE",
    ]),
    ("debt", [
        "GRAD_DEBT_MDN", "WDRAW_DEBT_MDN", "LO_INC_DEBT_MDN",
        "MD_INC_DEBT_MDN", "HI_INC_DEBT_MDN", "DEP_DEBT_MDN", "IND_DEBT_MDN",
        "PELL_DEBT_MDN", "NOPELL_DEBT_MDN", "FEMALE_DEBT_MDN",
        "MALE_DEBT_MDN", "FIRSTGEN_DEBT_MDN", "NOTFIRSTGEN_DEBT_MDN",
        "DEBT_N", "CUML_DEBT_", "PLUS_DEBT_", "DEBT_MDN10YR",
        "PPLUS_PCT", "PCTFLOAN", "DEBT_",
    ]),
]


def categorize(col: str) -> list[str]:
    """Return all matching domain buckets for a column name."""
    up = col.upper()
    hits = []
    for domain, patterns in DOMAIN_RULES:
        if any(p in up for p in patterns):
            hits.append(domain)
    return hits


def section(title: str) -> None:
    print(f"\n## {title}\n")


def load_dictionary() -> dict[str, dict]:
    """Map Scorecard column source -> dictionary entry."""
    with DICT_FILE.open() as f:
        spec = yaml.safe_load(f)
    by_source: dict[str, dict] = {}
    for api_path, meta in (spec.get("dictionary") or {}).items():
        if not isinstance(meta, dict):
            continue
        src = meta.get("source")
        if isinstance(src, str):
            by_source[src.upper()] = {"api_path": api_path, **meta}
    return by_source


def profile(path: Path, label: str, dictionary: dict[str, dict]) -> None:
    section(f"{label} — `{path.name}`")
    print(f"- Path: `{path}`")
    print(f"- File size: {path.stat().st_size / 1024 / 1024:.1f} MB")

    # Lightweight first pass just to count columns + rows without holding all in memory
    header = pd.read_csv(path, nrows=0).columns.tolist()
    print(f"- Total columns: **{len(header):,}**")

    # Full load — uses ~1.5–2× file size in RAM
    df = pd.read_csv(
        path,
        low_memory=False,
        na_values=NULL_TOKENS,
        keep_default_na=True,
        dtype=str,  # load as strings so we can analyze the raw token shape
    )
    print(f"- Total records: **{len(df):,}**")

    # ---- Dtypes ----
    section("Inferred data types (after coercing the Scorecard null tokens)")

    # Re-infer dtypes the way pandas would on a normal read
    inferred = pd.read_csv(
        path,
        low_memory=False,
        na_values=NULL_TOKENS,
        keep_default_na=True,
    )
    dtype_counts = Counter(str(t) for t in inferred.dtypes)
    print("| Dtype | Column count |")
    print("|---|---|")
    for dt, n in sorted(dtype_counts.items(), key=lambda x: -x[1]):
        print(f"| `{dt}` | {n:,} |")

    # ---- UNITID uniqueness ----
    section("UNITID uniqueness")
    if "UNITID" in df.columns:
        n_total = len(df)
        n_unique = df["UNITID"].nunique(dropna=True)
        n_null = df["UNITID"].isna().sum()
        dups = df[df.duplicated(subset=["UNITID"], keep=False) & df["UNITID"].notna()]
        n_dup_rows = len(dups)
        n_dup_ids = dups["UNITID"].nunique()
        print(f"- Rows: **{n_total:,}**")
        print(f"- Unique UNITID values: **{n_unique:,}**")
        print(f"- Rows with null UNITID: **{n_null:,}**")
        print(f"- Duplicate UNITID rows: **{n_dup_rows:,}** "
              f"({n_dup_ids:,} distinct duplicated ids)")
        if n_dup_rows > 0:
            print("\nFirst 5 duplicate examples:")
            sample = dups.sort_values("UNITID").head(10)
            cols = [c for c in ("UNITID", "INSTNM", "CITY", "STABBR")
                    if c in sample.columns]
            for _, row in sample.iterrows():
                print("  - " + " | ".join(f"{c}={row[c]}" for c in cols))
    else:
        print("- UNITID column not present.")

    # ---- Missingness ----
    section("Missing values — overall & worst offenders")
    nulls = inferred.isna().sum()
    null_pct = (nulls / len(inferred) * 100).round(1)
    total_cells = inferred.shape[0] * inferred.shape[1]
    overall_pct = nulls.sum() / total_cells * 100
    print(f"- Overall null rate across all cells: **{overall_pct:.1f}%**")
    print(f"- Fully empty columns "
          f"(100% null): **{(null_pct == 100).sum():,}**")
    print(f"- Columns ≥80% null: **{(null_pct >= 80).sum():,}**")
    print(f"- Columns ≥50% null: **{(null_pct >= 50).sum():,}**")
    print(f"- Columns ≤10% null: **{(null_pct <= 10).sum():,}**")
    print(f"- Columns with zero nulls: **{(null_pct == 0).sum():,}**")

    print("\nTop 15 most-populated columns (lowest null %):")
    print("| Column | Null % | API path | Description |")
    print("|---|---|---|---|")
    for col, pct in null_pct.nsmallest(15).items():
        d = dictionary.get(col.upper(), {})
        desc = (d.get("description") or "").replace("|", "\\|")[:80]
        print(f"| `{col}` | {pct}% | `{d.get('api_path', '')}` | {desc} |")

    print("\nWorst 15 most-suppressed columns (highest null %, excluding 100%):")
    print("| Column | Null % | API path | Description |")
    print("|---|---|---|---|")
    worst = null_pct[null_pct < 100].nlargest(15)
    for col, pct in worst.items():
        d = dictionary.get(col.upper(), {})
        desc = (d.get("description") or "").replace("|", "\\|")[:80]
        print(f"| `{col}` | {pct}% | `{d.get('api_path', '')}` | {desc} |")

    # ---- Domain bucketing ----
    section("Domain column buckets")
    buckets: dict[str, list[str]] = {d: [] for d, _ in DOMAIN_RULES}
    for col in inferred.columns:
        for dom in categorize(col):
            buckets[dom].append(col)

    for dom, cols in buckets.items():
        print(f"\n### {dom} — {len(cols)} columns")
        if not cols:
            print("_(no matches)_")
            continue
        # Sort: most populated first
        cols_sorted = sorted(cols, key=lambda c: null_pct.get(c, 100))
        print("| Column | Null % | Dtype | Description |")
        print("|---|---|---|---|")
        for col in cols_sorted[:40]:
            d = dictionary.get(col.upper(), {})
            desc = (d.get("description") or "").replace("|", "\\|")[:90]
            dt = str(inferred[col].dtype)
            print(f"| `{col}` | {null_pct[col]}% | `{dt}` | {desc} |")
        if len(cols_sorted) > 40:
            print(f"\n_…and {len(cols_sorted) - 40} more, omitted for brevity._")


def main() -> None:
    dictionary = load_dictionary()
    print("# College Scorecard — Data Profiling Report\n")
    print(f"_Generated by `scripts/profile-scorecard.py` against the snapshot in_")
    print(f"_`{DATA_DIR}`._\n")
    print(f"_Read-only — nothing was written to Supabase._\n")

    # Directory summary
    section("Directory inventory")
    files = sorted(DATA_DIR.glob("*"))
    print(f"- Total files in root: **{sum(1 for f in files if f.is_file()):,}**")
    csvs = [f for f in files if f.suffix == ".csv"]
    total_csv_bytes = sum(f.stat().st_size for f in csvs)
    print(f"- CSV files: **{len(csvs):,}** — "
          f"**{total_csv_bytes / 1024**3:.2f} GB** total")
    crosswalks = list((DATA_DIR / "Crosswalks").glob("*"))
    print(f"- Crosswalk files (xlsx): **{len(crosswalks):,}** "
          f"(IPEDS/OPEID year crosswalks, not profiled here)")
    print(f"- Data dictionary: `data.yaml` "
          f"({DICT_FILE.stat().st_size / 1024:.0f} KB, "
          f"{len(dictionary):,} columns documented)")

    merged_files = sorted(f for f in csvs if f.name.startswith("MERGED"))
    fos_files = sorted(f for f in csvs if f.name.startswith("FieldOfStudy")
                       or "Field-of-Study" in f.name)
    print(f"- MERGED institution-year files: **{len(merged_files)}** "
          f"({merged_files[0].name.split('_')[0][6:]}"
          f"–{merged_files[-1].name.split('_')[1]})")
    print(f"- Field-of-Study files: **{len(fos_files)}**")

    profile(MAIN_FILE, "Canonical snapshot", dictionary)
    profile(MERGED_FILE, "Latest cohort year", dictionary)


if __name__ == "__main__":
    main()
