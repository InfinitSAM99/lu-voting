-- LU VOTING — Stage 5A: Tier 1+2+3 schema + LUSA seeds

-- =========================================================
-- Schema additions
-- =========================================================

create table if not exists vote_faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists vote_faculties_touch on vote_faculties;
create trigger vote_faculties_touch
  before update on vote_faculties
  for each row execute function vote_touch_updated_at();

create table if not exists vote_position_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scope text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, title)
);

drop trigger if exists vote_position_templates_touch on vote_position_templates;
create trigger vote_position_templates_touch
  before update on vote_position_templates
  for each row execute function vote_touch_updated_at();

alter table vote_elections
  add column if not exists turnout_visible_during_voting boolean not null default true,
  add column if not exists results_publish_cooldown_hours int not null default 48,
  add column if not exists final_chain_hash text,
  add column if not exists final_chain_hash_at timestamptz,
  add column if not exists external_anchor_url text;

alter table vote_profiles
  add column if not exists registration_photo_url text,
  add column if not exists photo_locked boolean not null default false,
  add column if not exists claimed_at timestamptz;

create table if not exists vote_device_bindings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references vote_profiles(id) on delete cascade,
  device_fingerprint_hash text not null,
  device_label text,
  platform text,
  is_primary boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  unique (profile_id, device_fingerprint_hash)
);

create index if not exists vote_device_profile_idx
  on vote_device_bindings (profile_id) where revoked_at is null;
create index if not exists vote_device_fp_idx
  on vote_device_bindings (device_fingerprint_hash);

alter table vote_ballots
  add column if not exists prev_hash text,
  add column if not exists self_hash text;

create index if not exists vote_ballots_chain_idx
  on vote_ballots (election_id, cast_at);

create table if not exists vote_results_published (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete restrict,
  position_id uuid not null references vote_positions(id) on delete restrict,
  candidate_id uuid not null references vote_candidates(id) on delete restrict,
  vote_count_at_publish int not null,
  total_votes_for_position int not null,
  published_by uuid references vote_profiles(id),
  published_at timestamptz not null default now(),
  deletable_after timestamptz not null,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid references vote_profiles(id),
  deletion_reason text,
  unique (election_id, position_id)
);

create index if not exists vote_results_published_election_idx
  on vote_results_published (election_id) where is_active = true;

create table if not exists vote_action_approvals (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references vote_elections(id) on delete cascade,
  action text not null,
  payload jsonb,
  required_signatures int not null default 2,
  collected_signatures int not null default 0,
  status text not null default 'pending',
  created_by uuid references vote_profiles(id),
  created_at timestamptz not null default now(),
  executed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text
);

create index if not exists vote_action_election_idx
  on vote_action_approvals (election_id, status);

create table if not exists vote_action_signatures (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references vote_action_approvals(id) on delete cascade,
  signer_profile_id uuid not null references vote_profiles(id) on delete restrict,
  signed_at timestamptz not null default now(),
  comment text,
  unique (approval_id, signer_profile_id)
);

create or replace view vote_receipt_lookup as
select
  p.receipt_token_hash,
  p.election_id,
  e.title as election_title,
  p.cast_at,
  p.biometrically_verified
from vote_participation p
join vote_elections e on e.id = p.election_id
where p.receipt_token_hash is not null;

grant select on vote_receipt_lookup to anon, authenticated;

-- =========================================================
-- Seeds — LUSA structure
-- =========================================================

insert into vote_faculties (name, sort_order, is_active) values
  ('School of Education', 1, true),
  ('School of Humanities & Development Studies', 2, true),
  ('School of Science & Applied Technology', 3, true),
  ('School of Business & Economics', 4, true),
  ('Graduate School', 5, true),
  ('TVET Institute', 6, true)
on conflict (name) do nothing;

insert into vote_position_templates (title, scope, description, sort_order) values
  ('Chairperson', 'lusa_executive', 'President of LUSA', 1),
  ('Vice Chairperson', 'lusa_executive', 'Must be of a different gender from the Chairperson', 2),
  ('Secretary General', 'lusa_executive', 'Records and communications', 3),
  ('Treasurer', 'lusa_executive', 'Finance Director', 4),
  ('Director, Academics', 'lusa_executive', 'Council Secretary, Academics', 5),
  ('Director, Welfare', 'lusa_executive', 'Council Secretary, Welfare', 6),
  ('Director, Special Interest', 'lusa_executive', 'Council Secretary, Special Interest', 7),
  ('Speaker of Parliament', 'parliamentary', 'Elected by the student congress', 10),
  ('Deputy Speaker of Parliament', 'parliamentary', 'Deputy to the Speaker', 11),
  ('Editor General', 'parliamentary', 'Parliamentary publications', 12),
  ('Representative – School of Education', 'school_rep', 'Delegate to the House of Congress', 20),
  ('Representative – School of Business and Economics', 'school_rep', 'Delegate to the House of Congress', 21),
  ('Representative – School of Science and Applied Technology', 'school_rep', 'Delegate to the House of Congress', 22),
  ('Representative – School of Humanities and Development Studies', 'school_rep', 'Delegate to the House of Congress', 23),
  ('Representative – Institute of Technical and Vocational Education and Training (TVET)', 'school_rep', 'Delegate to the House of Congress', 24),
  ('LUSA Electoral Commissioner', 'special', 'Student election board member', 30),
  ('Student Representative to the University Senate', 'special', 'Elected member, 2 seats available', 31)
on conflict (scope, title) do nothing;
