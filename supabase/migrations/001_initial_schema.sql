-- LU VOTING — Initial schema
-- Stage 2A-2G. Run in this order in a fresh Supabase project.

-- =========================================================
-- 2A: Extensions + enums + trigger fn
-- =========================================================
create extension if not exists "pgcrypto";
create extension if not exists "citext";

do $$ begin
  create type vote_election_status as enum (
    'draft','candidate_registration','scheduled','open','paused',
    'closed','results_published','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type vote_application_status as enum (
    'draft','submitted','under_review','approved','rejected','withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type vote_role as enum (
    'voter','candidate','officer','admin','super_admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type vote_security_event_type as enum (
    'login_attempt','login_success','login_failure',
    'claim_attempt','claim_success','claim_failure',
    'biometric_enroll','biometric_challenge',
    'biometric_verify_success','biometric_verify_failure',
    'vote_attempt','vote_success','vote_rejected',
    'suspicious_activity','rate_limit_hit'
  );
exception when duplicate_object then null; end $$;

create or replace function vote_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

-- =========================================================
-- 2B: Identity tables
-- =========================================================
create table if not exists vote_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  admission_number citext not null unique,
  faculty text,
  course text,
  year_of_study int,
  phone text,
  avatar_url text,
  role vote_role not null default 'voter',
  is_active boolean not null default true,
  is_verified boolean not null default false,
  approval_status text not null default 'approved',
  source_profile_id uuid,
  last_sync_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vote_profiles_email_idx on vote_profiles (email);
create index if not exists vote_profiles_admission_idx on vote_profiles (admission_number);
create index if not exists vote_profiles_role_idx on vote_profiles (role);
create index if not exists vote_profiles_source_idx on vote_profiles (source_profile_id);

drop trigger if exists vote_profiles_touch on vote_profiles;
create trigger vote_profiles_touch
  before update on vote_profiles
  for each row execute function vote_touch_updated_at();

-- =========================================================
-- 2C: Elections, positions, applications, candidates
-- =========================================================
create table if not exists vote_elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  election_type text not null default 'student_union',
  academic_year text,
  status vote_election_status not null default 'draft',
  candidate_registration_start timestamptz,
  candidate_registration_end timestamptz,
  voting_start timestamptz,
  voting_end timestamptz,
  results_visible_during_voting boolean not null default false,
  results_published_at timestamptz,
  results_published_by uuid references vote_profiles(id),
  eligibility_notes text,
  created_by uuid references vote_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists vote_elections_status_idx on vote_elections (status);
create index if not exists vote_elections_voting_window_idx
  on vote_elections (voting_start, voting_end);

drop trigger if exists vote_elections_touch on vote_elections;
create trigger vote_elections_touch
  before update on vote_elections
  for each row execute function vote_touch_updated_at();

create table if not exists vote_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  max_selections int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, title)
);

create index if not exists vote_positions_election_idx
  on vote_positions (election_id, sort_order);

drop trigger if exists vote_positions_touch on vote_positions;
create trigger vote_positions_touch
  before update on vote_positions
  for each row execute function vote_touch_updated_at();

create table if not exists vote_candidate_applications (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  position_id uuid not null references vote_positions(id) on delete cascade,
  applicant_profile_id uuid not null references vote_profiles(id) on delete cascade,
  display_name text not null,
  photo_url text,
  manifesto text,
  statement text,
  faculty text,
  year_of_study int,
  status vote_application_status not null default 'draft',
  reviewed_by uuid references vote_profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, position_id, applicant_profile_id)
);

create index if not exists vote_applications_election_idx
  on vote_candidate_applications (election_id);
create index if not exists vote_applications_status_idx
  on vote_candidate_applications (status);
create index if not exists vote_applications_applicant_idx
  on vote_candidate_applications (applicant_profile_id);

drop trigger if exists vote_applications_touch on vote_candidate_applications;
create trigger vote_applications_touch
  before update on vote_candidate_applications
  for each row execute function vote_touch_updated_at();

create table if not exists vote_candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  position_id uuid not null references vote_positions(id) on delete cascade,
  profile_id uuid not null references vote_profiles(id) on delete restrict,
  application_id uuid references vote_candidate_applications(id) on delete set null,
  display_name text not null,
  photo_url text,
  manifesto text,
  statement text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  approved_by uuid references vote_profiles(id),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, position_id, profile_id)
);

create index if not exists vote_candidates_election_idx
  on vote_candidates (election_id, position_id, sort_order);
create index if not exists vote_candidates_profile_idx
  on vote_candidates (profile_id);

drop trigger if exists vote_candidates_touch on vote_candidates;
create trigger vote_candidates_touch
  before update on vote_candidates
  for each row execute function vote_touch_updated_at();

-- =========================================================
-- 2D: Participation + ballots
-- =========================================================
create table if not exists vote_participation (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  profile_id uuid not null references vote_profiles(id) on delete restrict,
  receipt_token_hash text not null unique,
  cast_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  biometrically_verified boolean not null default false,
  unique (election_id, profile_id)
);

create index if not exists vote_participation_election_idx
  on vote_participation (election_id);
create index if not exists vote_participation_profile_idx
  on vote_participation (profile_id);

create table if not exists vote_ballots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete restrict,
  receipt_token_hash text not null unique,
  cast_at timestamptz not null default now(),
  election_snapshot jsonb not null
);

create index if not exists vote_ballots_election_idx
  on vote_ballots (election_id);

create table if not exists vote_ballot_selections (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references vote_ballots(id) on delete restrict,
  position_id uuid not null references vote_positions(id) on delete restrict,
  candidate_id uuid not null references vote_candidates(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (ballot_id, position_id)
);

create index if not exists vote_selections_ballot_idx
  on vote_ballot_selections (ballot_id);
create index if not exists vote_selections_candidate_idx
  on vote_ballot_selections (candidate_id);
create index if not exists vote_selections_position_idx
  on vote_ballot_selections (position_id);

create table if not exists vote_results (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  position_id uuid not null references vote_positions(id) on delete cascade,
  candidate_id uuid not null references vote_candidates(id) on delete cascade,
  vote_count int not null default 0,
  is_winner boolean not null default false,
  computed_at timestamptz not null default now(),
  unique (election_id, position_id, candidate_id)
);

create index if not exists vote_results_election_idx
  on vote_results (election_id);

-- =========================================================
-- 2E: Biometric, officers, audit, security
-- =========================================================
create table if not exists vote_biometric_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references vote_profiles(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  sign_count bigint not null default 0,
  device_label text,
  transports text[],
  aaguid text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);

create index if not exists vote_bio_profile_idx
  on vote_biometric_credentials (profile_id) where is_active = true;
create index if not exists vote_bio_cred_idx
  on vote_biometric_credentials (credential_id);

create table if not exists vote_biometric_challenges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references vote_profiles(id) on delete cascade,
  nonce text not null unique,
  purpose text not null default 'vote',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vote_challenges_profile_idx
  on vote_biometric_challenges (profile_id);
create index if not exists vote_challenges_expires_idx
  on vote_biometric_challenges (expires_at)
  where consumed_at is null;

create table if not exists vote_officers (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references vote_profiles(id) on delete set null,
  can_manage_candidates boolean not null default true,
  can_open_close boolean not null default false,
  can_publish_results boolean not null default false,
  can_view_ballots boolean not null default false,
  is_active boolean not null default true,
  assigned_by uuid references vote_profiles(id),
  assigned_at timestamptz not null default now(),
  unique (election_id, user_id)
);

create index if not exists vote_officers_election_idx
  on vote_officers (election_id);
create index if not exists vote_officers_user_idx
  on vote_officers (user_id);

create table if not exists vote_eligibility (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  profile_id uuid not null references vote_profiles(id) on delete cascade,
  is_eligible boolean not null default true,
  reason text,
  added_by uuid references vote_profiles(id),
  added_at timestamptz not null default now(),
  unique (election_id, profile_id)
);

create index if not exists vote_eligibility_election_idx
  on vote_eligibility (election_id);
create index if not exists vote_eligibility_profile_idx
  on vote_eligibility (profile_id);

create table if not exists vote_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references vote_profiles(id) on delete set null,
  actor_email citext,
  action text not null,
  target_type text,
  target_id uuid,
  election_id uuid references vote_elections(id) on delete set null,
  details jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists vote_audit_election_idx
  on vote_audit_logs (election_id, created_at desc);
create index if not exists vote_audit_actor_idx
  on vote_audit_logs (actor_profile_id, created_at desc);
create index if not exists vote_audit_action_idx
  on vote_audit_logs (action, created_at desc);

create table if not exists vote_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type vote_security_event_type not null,
  profile_id uuid references vote_profiles(id) on delete set null,
  email_attempted citext,
  admission_attempted citext,
  election_id uuid references vote_elections(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vote_sec_type_idx
  on vote_security_events (event_type, created_at desc);
create index if not exists vote_sec_profile_idx
  on vote_security_events (profile_id, created_at desc);
create index if not exists vote_sec_email_idx
  on vote_security_events (email_attempted, created_at desc);

create table if not exists vote_rate_limits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references vote_profiles(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null default now(),
  attempt_count int not null default 1,
  unique (profile_id, action, window_started_at)
);

create index if not exists vote_rate_profile_idx
  on vote_rate_limits (profile_id, action, window_started_at desc);

-- =========================================================
-- 2F: RLS
-- =========================================================
create or replace function vote_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $body$
  select id from vote_profiles
  where user_id = auth.uid() and is_active = true
  limit 1;
$body$;

create or replace function vote_current_role()
returns vote_role
language sql
stable
security definer
set search_path = public
as $body$
  select role from vote_profiles
  where user_id = auth.uid() and is_active = true
  limit 1;
$body$;

create or replace function vote_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select coalesce(vote_current_role() = 'super_admin', false);
$body$;

create or replace function vote_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select coalesce(vote_current_role() in ('admin','super_admin'), false);
$body$;

create or replace function vote_is_officer_for(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select exists (
    select 1 from vote_officers
    where election_id = p_election_id
      and user_id = auth.uid()
      and is_active = true
  );
$body$;

create or replace function vote_can_manage_election(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select vote_is_admin() or vote_is_officer_for(p_election_id);
$body$;

alter table vote_profiles enable row level security;
alter table vote_elections enable row level security;
alter table vote_positions enable row level security;
alter table vote_candidate_applications enable row level security;
alter table vote_candidates enable row level security;
alter table vote_participation enable row level security;
alter table vote_ballots enable row level security;
alter table vote_ballot_selections enable row level security;
alter table vote_results enable row level security;
alter table vote_biometric_credentials enable row level security;
alter table vote_biometric_challenges enable row level security;
alter table vote_officers enable row level security;
alter table vote_eligibility enable row level security;
alter table vote_audit_logs enable row level security;
alter table vote_security_events enable row level security;
alter table vote_rate_limits enable row level security;

create policy vote_profiles_self_read on vote_profiles
  for select to authenticated
  using (user_id = auth.uid() or vote_is_admin());
create policy vote_profiles_self_update on vote_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy vote_profiles_admin_all on vote_profiles
  for all to authenticated
  using (vote_is_admin())
  with check (vote_is_admin());

create policy vote_elections_public_read on vote_elections
  for select to authenticated
  using (status <> 'draft' or vote_can_manage_election(id));
create policy vote_elections_admin_all on vote_elections
  for all to authenticated
  using (vote_is_admin())
  with check (vote_is_admin());
create policy vote_elections_officer_write on vote_elections
  for update to authenticated
  using (vote_is_officer_for(id))
  with check (vote_is_officer_for(id));

create policy vote_positions_read on vote_positions
  for select to authenticated
  using (exists (
    select 1 from vote_elections e
    where e.id = vote_positions.election_id
      and (e.status <> 'draft' or vote_can_manage_election(e.id))
  ));
create policy vote_positions_manage on vote_positions
  for all to authenticated
  using (vote_can_manage_election(election_id))
  with check (vote_can_manage_election(election_id));

create policy vote_apps_self_read on vote_candidate_applications
  for select to authenticated
  using (applicant_profile_id = vote_current_profile_id()
    or vote_can_manage_election(election_id));
create policy vote_apps_self_insert on vote_candidate_applications
  for insert to authenticated
  with check (applicant_profile_id = vote_current_profile_id());
create policy vote_apps_self_update on vote_candidate_applications
  for update to authenticated
  using (applicant_profile_id = vote_current_profile_id()
    and status in ('draft','submitted'))
  with check (applicant_profile_id = vote_current_profile_id());
create policy vote_apps_officer_manage on vote_candidate_applications
  for all to authenticated
  using (vote_can_manage_election(election_id))
  with check (vote_can_manage_election(election_id));

create policy vote_candidates_read on vote_candidates
  for select to authenticated
  using (is_active = true and exists (
    select 1 from vote_elections e
    where e.id = vote_candidates.election_id
      and e.status in ('candidate_registration','scheduled','open','paused','closed','results_published','archived')
  ));
create policy vote_candidates_manage on vote_candidates
  for all to authenticated
  using (vote_can_manage_election(election_id))
  with check (vote_can_manage_election(election_id));

create policy vote_participation_self_read on vote_participation
  for select to authenticated
  using (profile_id = vote_current_profile_id());
create policy vote_participation_admin_read on vote_participation
  for select to authenticated
  using (vote_is_admin());

create policy vote_ballots_none on vote_ballots
  for select to authenticated using (false);
create policy vote_selections_none on vote_ballot_selections
  for select to authenticated using (false);

create policy vote_results_read on vote_results
  for select to authenticated
  using (exists (
    select 1 from vote_elections e
    where e.id = vote_results.election_id
      and (e.status = 'results_published'
        or (e.results_visible_during_voting = true and e.status in ('open','paused','closed'))
        or vote_can_manage_election(e.id))
  ));

create policy vote_bio_self_read on vote_biometric_credentials
  for select to authenticated
  using (profile_id = vote_current_profile_id());
create policy vote_bio_self_revoke on vote_biometric_credentials
  for update to authenticated
  using (profile_id = vote_current_profile_id())
  with check (profile_id = vote_current_profile_id());

create policy vote_challenges_none on vote_biometric_challenges
  for select to authenticated using (false);

create policy vote_officers_self_read on vote_officers
  for select to authenticated
  using (user_id = auth.uid() or vote_is_admin());
create policy vote_officers_admin_manage on vote_officers
  for all to authenticated
  using (vote_is_admin())
  with check (vote_is_admin());

create policy vote_eligibility_self_read on vote_eligibility
  for select to authenticated
  using (profile_id = vote_current_profile_id());
create policy vote_eligibility_manage on vote_eligibility
  for all to authenticated
  using (vote_can_manage_election(election_id))
  with check (vote_can_manage_election(election_id));

create policy vote_audit_read on vote_audit_logs
  for select to authenticated using (vote_is_admin());

create policy vote_sec_read on vote_security_events
  for select to authenticated using (vote_is_admin());

create policy vote_rate_none on vote_rate_limits
  for select to authenticated using (false);

-- =========================================================
-- 2G: Indexes + permissions
-- =========================================================
create index if not exists vote_elections_live_idx
  on vote_elections (status, voting_start, voting_end)
  where status in ('open','paused','scheduled');

create index if not exists vote_candidates_active_idx
  on vote_candidates (election_id, position_id)
  where is_active = true;

create index if not exists vote_applications_pending_idx
  on vote_candidate_applications (election_id, submitted_at desc)
  where status in ('submitted','under_review');

create index if not exists vote_participation_recent_idx
  on vote_participation (election_id, cast_at desc);

revoke execute on function vote_is_super_admin() from public, anon;
revoke execute on function vote_is_admin() from public, anon;
revoke execute on function vote_is_officer_for(uuid) from public, anon;
revoke execute on function vote_can_manage_election(uuid) from public, anon;
revoke execute on function vote_current_profile_id() from public, anon;
revoke execute on function vote_current_role() from public, anon;

grant execute on function vote_is_super_admin() to authenticated;
grant execute on function vote_is_admin() to authenticated;
grant execute on function vote_is_officer_for(uuid) to authenticated;
grant execute on function vote_can_manage_election(uuid) to authenticated;
grant execute on function vote_current_profile_id() to authenticated;
grant execute on function vote_current_role() to authenticated;

-- =========================================================
-- 2H: Table grants (required for service_role + authenticated access)
-- =========================================================
grant usage on schema public to service_role, authenticated, anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
