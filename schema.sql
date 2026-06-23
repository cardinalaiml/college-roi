-- TassleCost schema
-- Apply in Supabase: SQL Editor → paste → Run.
-- Safe to re-run: drops and recreates the three tables.

set local statement_timeout = '60s';

create extension if not exists pg_trgm;

drop table if exists roi_cache cascade;
drop table if exists comparisons cascade;
drop table if exists colleges cascade;
drop table if exists debt cascade;
drop table if exists costs cascade;
drop table if exists institutions cascade;

-- ============================================================
-- colleges: one row per IPEDS institution
-- Populated by scripts/etl-scorecard.ts from
-- Most-Recent-Cohorts-Institution.csv (the Dept of Ed composite
-- of the latest reported value for each metric across cohort
-- years). See docs/scorecard-profiling-report.md for the source
-- column survey and per-field populated rates.
-- ============================================================
create table colleges (
  id bigserial primary key,
  unit_id integer not null unique,                  -- IPEDS UNITID
  name text not null,                               -- INSTNM
  city text,                                        -- CITY
  state text,                                       -- STABBR (2-letter postal abbreviation)
  zip text,                                         -- ZIP
  control smallint,                                 -- CONTROL: 1=public, 2=private nonprofit, 3=private for-profit

  -- Cost (top-line)
  net_price integer,                                -- NPT4_PUB / NPT4_PRIV (avg net price after aid)
  cost_of_attendance integer,                       -- COSTT4_A (annual COA, academic-year institutions)

  -- Cost components (so we can show the breakdown on detail page)
  tuition_in_state integer,                         -- TUITIONFEE_IN (57.9% populated)
  tuition_out_state integer,                        -- TUITIONFEE_OUT (57.9%)
  books_supplies integer,                           -- BOOKSUPPLY (52.2%)
  room_board_on integer,                            -- ROOMBOARD_ON  (30.9%)
  room_board_off integer,                           -- ROOMBOARD_OFF (52.5%)
  other_expense_on integer,                         -- OTHEREXPENSE_ON  (30.9%)
  other_expense_off integer,                        -- OTHEREXPENSE_OFF (52.5%)
  other_expense_fam integer,                        -- OTHEREXPENSE_FAM (52.5%)

  -- Debt
  median_debt integer,                              -- GRAD_DEBT_MDN (76.2% populated)
  monthly_payment integer,                          -- GRAD_DEBT_MDN10YR (76.2% — monthly @ 10yr standard)
  pct_with_loan real,                               -- PCTFLOAN (87.7% — % of UGs with federal loan)

  -- Outcomes
  salary_6yr integer,                               -- MD_EARN_WNE_P6
  salary_10yr integer,                              -- MD_EARN_WNE_P10
  salary_null_reason text                           -- 'suppressed' | 'not_reported' | null when present
    check (salary_null_reason in ('suppressed', 'not_reported') or salary_null_reason is null),

  -- Performance
  graduation_rate real,                             -- 0..1, 150% of normal time (C150_4 / C150_L4)
  retention_rate real,                              -- 0..1, full-time first-year (RET_FT4 / RET_FTL4)

  -- Profile
  undergrad_size integer,                           -- UGDS
  pred_degree smallint,                             -- 0..4, PREDDEG
  accreditor text,                                  -- ACCREDAGENCY
  url text,                                         -- INSTURL

  -- Full-text index source
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')), 'C')
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index colleges_search_vector_idx on colleges using gin (search_vector);
create index colleges_name_trgm_idx on colleges using gin (name gin_trgm_ops);
create index colleges_state_idx on colleges (state);
create index colleges_control_idx on colleges (control);
create index colleges_net_price_idx on colleges (net_price);

-- ============================================================
-- comparisons: a shareable side-by-side of up to 3 colleges
-- ============================================================
create table comparisons (
  id bigserial primary key,
  short_id text not null unique,                    -- 8-char nanoid in the URL
  college_ids integer[] not null,                   -- IPEDS unit_ids
  calc_inputs jsonb,                                -- snapshot of calculator inputs
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (cardinality(college_ids) between 1 and 3)
);

create index comparisons_short_id_idx on comparisons (short_id);
create index comparisons_created_idx on comparisons (created_at desc);

-- ============================================================
-- roi_cache: Claude-written summaries keyed by college + inputs
-- Server-only — RLS denies all anon access; service_role bypasses
-- ============================================================
create table roi_cache (
  id bigserial primary key,
  college_id integer not null,                      -- IPEDS unit_id
  input_hash text not null,                         -- sha256 of inputs JSON
  summary text not null,
  model text not null,
  prompt_tokens integer,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  unique (college_id, input_hash)
);

create index roi_cache_lookup_idx on roi_cache (college_id, input_hash, expires_at);

-- ============================================================
-- institutions / costs / debt — normalized 3-table model loaded by
-- scripts/etl-clean.py + scripts/load-clean.py. Mirrors the CSVs at
-- data/clean/{institutions,costs,debt}.csv and shares unit_id as
-- the join key. Lives alongside the flat colleges table so the
-- existing /api/search keeps working until it's migrated.
-- ============================================================

create table institutions (
  unit_id integer primary key,                      -- IPEDS UNITID
  name text not null,                               -- INSTNM
  city text,                                        -- CITY
  state text,                                       -- STABBR
  zip text,                                         -- ZIP
  control smallint,                                 -- 1=public, 2=private nonprofit, 3=for-profit
  predominant_degree smallint,                      -- 0..4 (PREDDEG)
  highest_degree smallint,                          -- 0..4 (HIGHDEG)
  institution_level smallint,                       -- 1=4yr, 2=2yr, 3=<2yr (ICLEVEL)
  region smallint,                                  -- IPEDS region
  locale smallint,                                  -- urbanicity code
  accreditor text,                                  -- ACCREDAGENCY
  url text,                                         -- INSTURL
  latitude double precision,
  longitude double precision,
  undergrad_size integer,                           -- UGDS
  is_hbcu smallint,                                 -- 0/1
  is_hispanic_serving smallint,                     -- 0/1
  is_tribal smallint,                               -- 0/1
  is_women_only smallint,                           -- 0/1
  is_men_only smallint,                             -- 0/1
  is_operating smallint,                            -- 0=closed, 1=operating
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')), 'C')
  ) stored,
  updated_at timestamptz not null default now()
);

create index institutions_search_vector_idx on institutions using gin (search_vector);
create index institutions_name_trgm_idx     on institutions using gin (name gin_trgm_ops);
create index institutions_state_idx         on institutions (state);
create index institutions_control_idx       on institutions (control);

create table costs (
  unit_id integer primary key references institutions(unit_id) on delete cascade,
  tuition_in_state integer,
  tuition_out_state integer,
  tuition_program_year integer,
  tuition_revenue_per_fte real,
  books_supplies integer,
  room_board_on_campus integer,
  room_board_off_campus integer,
  other_expense_on_campus integer,
  other_expense_off_campus integer,
  other_expense_with_family integer,
  cost_of_attendance_academic_year integer,
  cost_of_attendance_program_year integer,
  net_price_public integer,
  net_price_private integer,
  net_price_program_year integer,
  net_price_public_0_30k integer,
  net_price_public_30k_48k integer,
  net_price_public_48k_75k integer,
  net_price_public_75k_110k integer,
  net_price_public_110k_plus integer,
  net_price_private_0_30k integer,
  net_price_private_30k_48k integer,
  net_price_private_48k_75k integer,
  net_price_private_75k_110k integer,
  net_price_private_110k_plus integer,
  updated_at timestamptz not null default now()
);

create index costs_net_price_public_idx  on costs (net_price_public);
create index costs_net_price_private_idx on costs (net_price_private);

create table debt (
  unit_id integer primary key references institutions(unit_id) on delete cascade,
  median_debt_all integer,
  median_debt_completers integer,
  median_debt_withdrawn integer,
  monthly_payment_completers_10yr integer,
  median_debt_low_income integer,
  median_debt_middle_income integer,
  median_debt_high_income integer,
  median_debt_dependent integer,
  median_debt_independent integer,
  median_debt_pell integer,
  median_debt_no_pell integer,
  median_debt_female integer,
  median_debt_male integer,
  median_debt_first_gen integer,
  median_debt_not_first_gen integer,
  cumulative_debt_p90 integer,
  cumulative_debt_p75 integer,
  cumulative_debt_p25 integer,
  cumulative_debt_p10 integer,
  median_plus_debt integer,
  pct_with_federal_loan real,
  pct_with_federal_loan_degree_seeking real,
  pct_parent_plus_low real,
  pct_parent_plus_high real,
  updated_at timestamptz not null default now()
);

create index debt_median_completers_idx on debt (median_debt_completers);

-- ============================================================
-- Row-level security
-- ============================================================
alter table colleges enable row level security;
create policy "colleges public read" on colleges
  for select to anon, authenticated using (true);

alter table institutions enable row level security;
create policy "institutions public read" on institutions
  for select to anon, authenticated using (true);

alter table costs enable row level security;
create policy "costs public read" on costs
  for select to anon, authenticated using (true);

alter table debt enable row level security;
create policy "debt public read" on debt
  for select to anon, authenticated using (true);

alter table comparisons enable row level security;
create policy "comparisons public read" on comparisons
  for select to anon, authenticated using (true);
create policy "comparisons public insert" on comparisons
  for insert to anon, authenticated with check (
    cardinality(college_ids) between 1 and 3
  );
-- Allow incrementing view_count from the public client
create policy "comparisons view increment" on comparisons
  for update to anon, authenticated
  using (true)
  with check (true);

alter table roi_cache enable row level security;
-- No anon policies. Only service_role (which bypasses RLS) can read or write.
