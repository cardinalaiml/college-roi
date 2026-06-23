#!/usr/bin/env python3
"""
Push the three normalized CSVs at data/clean/* into Supabase.

Reads:
  data/clean/institutions.csv  → public.institutions
  data/clean/costs.csv         → public.costs
  data/clean/debt.csv          → public.debt

Talks to the PostgREST endpoint directly so no Supabase Python client
is required — only `requests`. Upserts in 500-row batches with
`Prefer: resolution=merge-duplicates`, so re-running just overwrites
existing rows by unit_id.

Load order is fixed: institutions → costs → debt. Costs and debt
both reference institutions(unit_id) via FK, so institutions has to
land first.

Run:
  python3 scripts/load-clean.py --dry-run   # preview only, no writes
  python3 scripts/load-clean.py             # real load

Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
.env.local (service-role is needed because RLS denies public writes).
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path
from typing import Iterable

import pandas as pd
import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLEAN_DIR = PROJECT_ROOT / "data" / "clean"
BATCH_SIZE = 500

TABLES: list[tuple[str, Path]] = [
    ("institutions", CLEAN_DIR / "institutions.csv"),
    ("costs",        CLEAN_DIR / "costs.csv"),
    ("debt",         CLEAN_DIR / "debt.csv"),
]

load_dotenv(PROJECT_ROOT / ".env.local")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dry-run", action="store_true",
                   help="Read + transform but don't POST to Supabase.")
    return p.parse_args()


def read_csv(path: Path) -> pd.DataFrame:
    """Load with the same nullable Int64 / Float64 dtypes the ETL wrote."""
    if not path.exists():
        sys.exit(
            f"Missing {path}. Run `python3 scripts/etl-clean.py` first.")
    df = pd.read_csv(path)
    return df


def records(df: pd.DataFrame) -> list[dict]:
    """
    Convert a DataFrame to JSON-safe dicts.
    NaN/<NA>/None all collapse to JSON null; int columns stay as ints.
    """
    # `to_dict('records')` returns numpy/pandas scalars. JSON can't
    # serialize NaN cleanly (json.dumps emits literal `NaN` which
    # PostgREST rejects). Convert via `astype(object)` so all dtypes
    # become Python scalars, then replace NaN with None.
    safe = df.astype(object).where(pd.notnull(df), None)
    rows: list[dict] = safe.to_dict(orient="records")

    # to_dict can leave numpy scalars in place — coerce to plain ints/floats
    # so the JSON encoder is happy. Whole-number floats like 1.0 also get
    # narrowed to int — Postgres smallint/integer columns reject "1.0".
    for row in rows:
        for k, v in row.items():
            if v is None:
                continue
            if isinstance(v, float) and math.isnan(v):
                row[k] = None
                continue
            if hasattr(v, "item"):
                # numpy / pandas scalars expose .item() for native types
                try:
                    v = v.item()
                    row[k] = v
                except (TypeError, ValueError):
                    continue
            if isinstance(v, float) and v.is_integer():
                row[k] = int(v)
    return rows


def upsert(
    session: requests.Session,
    base_url: str,
    table: str,
    batch: list[dict],
) -> None:
    url = f"{base_url}/rest/v1/{table}"
    headers = {
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = session.post(url, json=batch, headers=headers, timeout=60)
    if not resp.ok:
        sys.exit(
            f"\nUpsert failed for {table} (HTTP {resp.status_code}):\n"
            f"  {resp.text[:500]}"
        )


def chunks(rows: list[dict], size: int) -> Iterable[list[dict]]:
    for i in range(0, len(rows), size):
        yield rows[i:i + size]


def main() -> None:
    args = parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run:
        if not url or not key:
            sys.exit(
                "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY in .env.local.\n"
                "(Use --dry-run to preview without env vars.)"
            )

    session = requests.Session()
    if url and key:
        session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
        })

    mode = "DRY RUN (no writes)" if args.dry_run else "LIVE LOAD"
    print(f"Mode: {mode}")
    if url:
        print(f"Target: {url}\n")

    for table, csv_path in TABLES:
        df = read_csv(csv_path)
        rows = records(df)
        print(f"• {table}: {len(rows):,} rows from {csv_path.name}")

        if args.dry_run:
            sample = rows[0] if rows else {}
            preview = {k: sample[k] for k in list(sample)[:6]}
            print(f"    sample row (first 6 cols): {preview}")
            continue

        n_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE
        for i, batch in enumerate(chunks(rows, BATCH_SIZE), start=1):
            upsert(session, url, table, batch)
            print(
                f"\r    uploaded batch {i}/{n_batches} "
                f"({i * BATCH_SIZE if i * BATCH_SIZE <= len(rows) else len(rows):,}"
                f"/{len(rows):,})",
                end="", flush=True,
            )
        print()

    if not args.dry_run:
        print("\nDone.")


if __name__ == "__main__":
    main()
