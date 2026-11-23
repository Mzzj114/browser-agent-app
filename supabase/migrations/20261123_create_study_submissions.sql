-- Study submissions: one row per completed case, insert-only for participants.
-- Applied to the study Supabase project via the Supabase MCP.
create table public.study_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  participant_code text not null,
  case_order smallint not null,
  condition text not null,
  run_id text not null,
  locale text not null,
  verdict text not null,
  explanation text not null default '',
  timing jsonb not null default '{}'::jsonb,
  app_version text,
  fixture_revision text,
  viewport jsonb,
  started_at timestamptz not null,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint study_submissions_participant_code_format
    check (participant_code ~ '^[A-Za-z0-9_-]{1,32}$'),
  constraint study_submissions_case_order_range check (case_order between 1 and 3),
  constraint study_submissions_condition_allowed
    check (condition in ('baseline', 'candidates', 'probabilities')),
  constraint study_submissions_locale_allowed check (locale in ('zh', 'en')),
  constraint study_submissions_verdict_allowed check (verdict in ('accepted', 'rejected')),
  constraint study_submissions_explanation_length check (char_length(explanation) <= 500)
);

create index study_submissions_participant_case_idx
  on public.study_submissions (participant_code, case_order);

alter table public.study_submissions enable row level security;

-- Participants may only append rows; the app never reads the table.
revoke all on table public.study_submissions from anon, authenticated;
grant insert on table public.study_submissions to anon;

create policy "study submissions insert only"
  on public.study_submissions
  for insert
  to anon
  with check (
    participant_code ~ '^[A-Za-z0-9_-]{1,32}$'
    and case_order between 1 and 3
    and condition in ('baseline', 'candidates', 'probabilities')
    and locale in ('zh', 'en')
    and verdict in ('accepted', 'rejected')
    and char_length(explanation) <= 500
  );
