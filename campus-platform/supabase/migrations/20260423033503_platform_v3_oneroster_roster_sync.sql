alter table delivery.course_run
add column if not exists oneroster_manifest jsonb;

create or replace function private.default_course_run_oneroster_manifest()
returns jsonb
language sql
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'enabled', false,
    'provider', 'oneroster',
    'version', '1.2',
    'base_url', null,
    'auth', jsonb_build_object(
      'method', 'bearer',
      'token_secret_name', null
    ),
    'sourced_ids', jsonb_build_object(
      'school', null,
      'class', null
    ),
    'sync_direction', 'pull',
    'provision_mode', 'match_only',
    'invite_redirect_path', '/portal',
    'sync_teacher_roles', false,
    'request_options', jsonb_build_object(
      'limit', 100,
      'timeout_ms', 15000
    )
  );
$$;

create or replace function private.normalize_course_run_oneroster_manifest(
  p_manifest jsonb
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_defaults jsonb := private.default_course_run_oneroster_manifest();
  v_manifest jsonb := case
    when p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then '{}'::jsonb
    else p_manifest
  end;
  v_auth jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'auth', '{}'::jsonb)) = 'object' then v_manifest -> 'auth'
    else '{}'::jsonb
  end;
  v_sourced_ids jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'sourced_ids', '{}'::jsonb)) = 'object' then v_manifest -> 'sourced_ids'
    else '{}'::jsonb
  end;
  v_request_options jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'request_options', '{}'::jsonb)) = 'object' then v_manifest -> 'request_options'
    else '{}'::jsonb
  end;
begin
  return jsonb_build_object(
    'enabled', coalesce((v_manifest ->> 'enabled')::boolean, false),
    'provider', 'oneroster',
    'version', '1.2',
    'base_url', nullif(btrim(v_manifest ->> 'base_url'), ''),
    'auth', jsonb_build_object(
      'method', 'bearer',
      'token_secret_name', nullif(btrim(v_auth ->> 'token_secret_name'), '')
    ),
    'sourced_ids', jsonb_build_object(
      'school', nullif(btrim(v_sourced_ids ->> 'school'), ''),
      'class', nullif(btrim(v_sourced_ids ->> 'class'), '')
    ),
    'sync_direction', 'pull',
    'provision_mode',
      case
        when lower(coalesce(v_manifest ->> 'provision_mode', 'match_only')) = 'invite_missing'
          then 'invite_missing'
        else 'match_only'
      end,
    'invite_redirect_path',
      case
        when left(coalesce(nullif(btrim(v_manifest ->> 'invite_redirect_path'), ''), '/portal'), 1) = '/'
          then coalesce(nullif(btrim(v_manifest ->> 'invite_redirect_path'), ''), '/portal')
        else '/portal'
      end,
    'sync_teacher_roles', coalesce((v_manifest ->> 'sync_teacher_roles')::boolean, false),
    'request_options', jsonb_build_object(
      'limit', greatest(1, least(500, coalesce((v_request_options ->> 'limit')::integer, 100))),
      'timeout_ms', greatest(1000, least(60000, coalesce((v_request_options ->> 'timeout_ms')::integer, 15000)))
    )
  );
end;
$$;

update delivery.course_run
set oneroster_manifest = private.normalize_course_run_oneroster_manifest(oneroster_manifest);

alter table delivery.course_run
  alter column oneroster_manifest set default private.default_course_run_oneroster_manifest(),
  alter column oneroster_manifest set not null;

create or replace function private.validate_course_run_oneroster_manifest()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_enabled boolean;
  v_base_url text;
  v_school_sourced_id text;
  v_class_sourced_id text;
  v_token_secret_name text;
begin
  new.oneroster_manifest := private.normalize_course_run_oneroster_manifest(new.oneroster_manifest);

  if new.oneroster_manifest is null or jsonb_typeof(new.oneroster_manifest) <> 'object' then
    raise exception 'OneRoster: oneroster_manifest must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.oneroster_manifest -> 'auth', '{}'::jsonb)) <> 'object' then
    raise exception 'OneRoster: auth must be an object';
  end if;

  if jsonb_typeof(coalesce(new.oneroster_manifest -> 'sourced_ids', '{}'::jsonb)) <> 'object' then
    raise exception 'OneRoster: sourced_ids must be an object';
  end if;

  if jsonb_typeof(coalesce(new.oneroster_manifest -> 'request_options', '{}'::jsonb)) <> 'object' then
    raise exception 'OneRoster: request_options must be an object';
  end if;

  v_enabled := coalesce((new.oneroster_manifest ->> 'enabled')::boolean, false);
  if not v_enabled then
    return new;
  end if;

  v_base_url := coalesce(new.oneroster_manifest ->> 'base_url', '');
  v_school_sourced_id := coalesce(new.oneroster_manifest #>> '{sourced_ids,school}', '');
  v_class_sourced_id := coalesce(new.oneroster_manifest #>> '{sourced_ids,class}', '');
  v_token_secret_name := coalesce(new.oneroster_manifest #>> '{auth,token_secret_name}', '');

  if v_base_url !~ '^https?://.+' then
    raise exception 'OneRoster: enabled sync requires a valid base_url';
  end if;

  if btrim(v_school_sourced_id) = '' or btrim(v_class_sourced_id) = '' then
    raise exception 'OneRoster: enabled sync requires sourced_ids.school and sourced_ids.class';
  end if;

  if btrim(v_token_secret_name) = '' then
    raise exception 'OneRoster: enabled sync requires auth.token_secret_name';
  end if;

  if coalesce(new.oneroster_manifest ->> 'sync_direction', 'pull') <> 'pull' then
    raise exception 'OneRoster: unsupported sync_direction %, only pull is supported in this consumer slice',
      new.oneroster_manifest ->> 'sync_direction';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_course_run_oneroster_manifest on delivery.course_run;
create trigger trg_validate_course_run_oneroster_manifest
before insert or update on delivery.course_run
for each row execute function private.validate_course_run_oneroster_manifest();

create table if not exists delivery.course_run_roster_sync (
  id bigint generated by default as identity primary key,
  course_run_id bigint not null references delivery.course_run(id) on delete cascade,
  actor_person_id uuid references identity.person(id) on delete set null,
  provider text not null default 'oneroster',
  version text not null default '1.2',
  direction text not null default 'pull'
    check (direction in ('pull')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'partial', 'failed')),
  processed_seats integer not null default 0,
  matched_seats integer not null default 0,
  invited_seats integer not null default 0,
  enrolled_seats integer not null default 0,
  teacher_role_seats integer not null default 0,
  skipped_seats integer not null default 0,
  failed_seats integer not null default 0,
  request_snapshot jsonb not null default '{}'::jsonb,
  response_snapshot jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delivery.course_run_roster_seat (
  id bigint generated by default as identity primary key,
  course_run_id bigint not null references delivery.course_run(id) on delete cascade,
  latest_sync_id bigint references delivery.course_run_roster_sync(id) on delete set null,
  school_sourced_id text,
  class_sourced_id text,
  enrollment_sourced_id text not null,
  user_sourced_id text not null,
  role_code text not null
    check (role_code in ('student', 'teacher', 'admin', 'unknown')),
  external_status text not null default 'active',
  user_email text,
  user_name text not null default '',
  user_username text,
  user_identifier text,
  person_id uuid references identity.person(id) on delete set null,
  enrollment_id bigint references enrollment.enrollment(id) on delete set null,
  sync_state text not null default 'staged'
    check (sync_state in ('staged', 'matched', 'invited', 'enrolled', 'skipped', 'error')),
  sync_note text,
  raw_user jsonb not null default '{}'::jsonb,
  raw_enrollment jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  matched_at timestamptz,
  invited_at timestamptz,
  enrolled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_run_id, enrollment_sourced_id)
);

create index if not exists idx_course_run_roster_sync_run_started
  on delivery.course_run_roster_sync(course_run_id, started_at desc);
create index if not exists idx_course_run_roster_sync_status
  on delivery.course_run_roster_sync(status, started_at desc);
create index if not exists idx_course_run_roster_sync_actor
  on delivery.course_run_roster_sync(actor_person_id, created_at desc)
  where actor_person_id is not null;

create index if not exists idx_course_run_roster_seat_run_state
  on delivery.course_run_roster_seat(course_run_id, sync_state, last_seen_at desc);
create index if not exists idx_course_run_roster_seat_email
  on delivery.course_run_roster_seat(course_run_id, user_email)
  where user_email is not null;
create index if not exists idx_course_run_roster_seat_user
  on delivery.course_run_roster_seat(course_run_id, user_sourced_id);
create index if not exists idx_course_run_roster_seat_person
  on delivery.course_run_roster_seat(person_id, updated_at desc)
  where person_id is not null;
create index if not exists idx_course_run_roster_seat_sync
  on delivery.course_run_roster_seat(latest_sync_id, updated_at desc)
  where latest_sync_id is not null;

grant select on delivery.course_run_roster_sync, delivery.course_run_roster_seat to authenticated;

alter table delivery.course_run_roster_sync enable row level security;
alter table delivery.course_run_roster_seat enable row level security;

drop trigger if exists tr_delivery_course_run_roster_sync_updated_at on delivery.course_run_roster_sync;
create trigger tr_delivery_course_run_roster_sync_updated_at
before update on delivery.course_run_roster_sync
for each row execute function private.touch_updated_at();

drop trigger if exists tr_delivery_course_run_roster_seat_updated_at on delivery.course_run_roster_seat;
create trigger tr_delivery_course_run_roster_seat_updated_at
before update on delivery.course_run_roster_seat
for each row execute function private.touch_updated_at();
