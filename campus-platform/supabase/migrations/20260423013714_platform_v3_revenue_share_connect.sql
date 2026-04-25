alter table delivery.course_run
add column if not exists revenue_share_manifest jsonb;

alter table enrollment.checkout_intent
  add column if not exists stripe_price_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists teacher_person_id uuid references identity.person(id) on delete set null,
  add column if not exists stripe_connected_account_id text,
  add column if not exists revenue_share_snapshot jsonb;

create or replace function private.default_course_run_revenue_share_manifest()
returns jsonb
language sql
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'enabled', false,
    'settlement_mode', 'manual_monthly',
    'currency', 'usd',
    'teacher', jsonb_build_object(
      'person_id', null,
      'display_name', 'Docente invitado',
      'stripe_account_id', null
    ),
    'split', jsonb_build_object(
      'platform_percent', 30,
      'teacher_percent', 70
    ),
    'settlement_window_days', 15,
    'minimum_amount_minor', 0,
    'stripe_connect', jsonb_build_object(
      'charge_type', 'destination',
      'on_behalf_of', false
    )
  );
$$;

create or replace function private.normalize_course_run_revenue_share_manifest(
  p_manifest jsonb
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_defaults jsonb := private.default_course_run_revenue_share_manifest();
  v_manifest jsonb := case
    when p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then '{}'::jsonb
    else p_manifest
  end;
  v_teacher jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'teacher', '{}'::jsonb)) = 'object' then v_manifest -> 'teacher'
    else '{}'::jsonb
  end;
  v_split jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'split', '{}'::jsonb)) = 'object' then v_manifest -> 'split'
    else '{}'::jsonb
  end;
  v_connect jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'stripe_connect', '{}'::jsonb)) = 'object' then v_manifest -> 'stripe_connect'
    else '{}'::jsonb
  end;
  v_platform_percent numeric := coalesce(
    nullif(btrim(v_split ->> 'platform_percent'), '')::numeric,
    30
  );
  v_teacher_percent numeric := coalesce(
    nullif(btrim(v_split ->> 'teacher_percent'), '')::numeric,
    70
  );
begin
  if round(v_platform_percent + v_teacher_percent, 2) <> 100 then
    v_platform_percent := 30;
    v_teacher_percent := 70;
  end if;

  return jsonb_build_object(
    'enabled', coalesce((v_manifest ->> 'enabled')::boolean, false),
    'settlement_mode',
      case
        when lower(coalesce(v_manifest ->> 'settlement_mode', 'manual_monthly')) = 'stripe_connect_destination_charge'
          then 'stripe_connect_destination_charge'
        else 'manual_monthly'
      end,
    'currency', lower(coalesce(nullif(btrim(v_manifest ->> 'currency'), ''), 'usd')),
    'teacher', jsonb_build_object(
      'person_id', nullif(btrim(v_teacher ->> 'person_id'), ''),
      'display_name', coalesce(nullif(btrim(v_teacher ->> 'display_name'), ''), v_defaults #>> '{teacher,display_name}'),
      'stripe_account_id', nullif(btrim(v_teacher ->> 'stripe_account_id'), '')
    ),
    'split', jsonb_build_object(
      'platform_percent', round(v_platform_percent, 2),
      'teacher_percent', round(v_teacher_percent, 2)
    ),
    'settlement_window_days', greatest(0, coalesce((v_manifest ->> 'settlement_window_days')::integer, 15)),
    'minimum_amount_minor', greatest(0, coalesce((v_manifest ->> 'minimum_amount_minor')::integer, 0)),
    'stripe_connect', jsonb_build_object(
      'charge_type', 'destination',
      'on_behalf_of', coalesce((v_connect ->> 'on_behalf_of')::boolean, false)
    )
  );
end;
$$;

update delivery.course_run
set revenue_share_manifest = private.normalize_course_run_revenue_share_manifest(revenue_share_manifest);

update delivery.course_run
set revenue_share_manifest = private.normalize_course_run_revenue_share_manifest(
  jsonb_build_object(
    'enabled', true,
    'settlement_mode', 'manual_monthly',
    'currency', 'usd',
    'teacher', jsonb_build_object(
      'person_id', null,
      'display_name', 'Docente invitado',
      'stripe_account_id', null
    ),
    'split', jsonb_build_object(
      'platform_percent', 30,
      'teacher_percent', 70
    ),
    'settlement_window_days', 15,
    'minimum_amount_minor', 0,
    'stripe_connect', jsonb_build_object(
      'charge_type', 'destination',
      'on_behalf_of', false
    )
  )
)
where slug = 'power-skills-pilot-open';

alter table delivery.course_run
  alter column revenue_share_manifest set default private.default_course_run_revenue_share_manifest(),
  alter column revenue_share_manifest set not null;

create or replace function private.validate_course_run_revenue_share_manifest()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_enabled boolean;
  v_settlement_mode text;
  v_currency text;
  v_platform_percent numeric;
  v_teacher_percent numeric;
begin
  new.revenue_share_manifest := private.normalize_course_run_revenue_share_manifest(new.revenue_share_manifest);

  if new.revenue_share_manifest is null or jsonb_typeof(new.revenue_share_manifest) <> 'object' then
    raise exception 'Revenue share: revenue_share_manifest must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.revenue_share_manifest -> 'teacher', '{}'::jsonb)) <> 'object' then
    raise exception 'Revenue share: teacher must be an object';
  end if;

  if jsonb_typeof(coalesce(new.revenue_share_manifest -> 'split', '{}'::jsonb)) <> 'object' then
    raise exception 'Revenue share: split must be an object';
  end if;

  if jsonb_typeof(coalesce(new.revenue_share_manifest -> 'stripe_connect', '{}'::jsonb)) <> 'object' then
    raise exception 'Revenue share: stripe_connect must be an object';
  end if;

  v_enabled := coalesce((new.revenue_share_manifest ->> 'enabled')::boolean, false);
  v_settlement_mode := coalesce(new.revenue_share_manifest ->> 'settlement_mode', 'manual_monthly');
  v_currency := coalesce(new.revenue_share_manifest ->> 'currency', 'usd');
  v_platform_percent := coalesce((new.revenue_share_manifest #>> '{split,platform_percent}')::numeric, 0);
  v_teacher_percent := coalesce((new.revenue_share_manifest #>> '{split,teacher_percent}')::numeric, 0);

  if v_currency !~ '^[a-z]{3}$' then
    raise exception 'Revenue share: currency must be a lowercase ISO-4217 code';
  end if;

  if round(v_platform_percent + v_teacher_percent, 2) <> 100 then
    raise exception 'Revenue share: platform_percent + teacher_percent must equal 100';
  end if;

  if not v_enabled then
    return new;
  end if;

  if v_settlement_mode not in ('manual_monthly', 'stripe_connect_destination_charge') then
    raise exception 'Revenue share: unsupported settlement_mode %', v_settlement_mode;
  end if;

  if btrim(coalesce(new.revenue_share_manifest #>> '{teacher,display_name}', '')) = '' then
    raise exception 'Revenue share: enabled contracts require teacher.display_name';
  end if;

  if v_settlement_mode = 'stripe_connect_destination_charge'
    and btrim(coalesce(new.revenue_share_manifest #>> '{teacher,stripe_account_id}', '')) = '' then
    raise exception 'Revenue share: Stripe Connect mode requires teacher.stripe_account_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_course_run_revenue_share_manifest on delivery.course_run;
create trigger trg_validate_course_run_revenue_share_manifest
before insert or update on delivery.course_run
for each row execute function private.validate_course_run_revenue_share_manifest();

update enrollment.checkout_intent as checkout_intent
set revenue_share_snapshot = private.normalize_course_run_revenue_share_manifest(
  coalesce(checkout_intent.revenue_share_snapshot, course_run.revenue_share_manifest)
)
from delivery.course_run as course_run
where checkout_intent.course_run_id = course_run.id
  and (
    checkout_intent.revenue_share_snapshot is null
    or jsonb_typeof(checkout_intent.revenue_share_snapshot) <> 'object'
  );

update enrollment.checkout_intent
set revenue_share_snapshot = private.default_course_run_revenue_share_manifest()
where revenue_share_snapshot is null
  or jsonb_typeof(revenue_share_snapshot) <> 'object';

alter table enrollment.checkout_intent
  alter column revenue_share_snapshot set default private.default_course_run_revenue_share_manifest();

create table if not exists enrollment.payment_allocation (
  id bigint generated by default as identity primary key,
  checkout_intent_id bigint references enrollment.checkout_intent(id) on delete set null,
  person_id uuid not null references identity.person(id) on delete cascade,
  course_run_id bigint not null references delivery.course_run(id) on delete cascade,
  teacher_person_id uuid references identity.person(id) on delete set null,
  settlement_mode text not null
    check (settlement_mode in ('manual_monthly', 'stripe_connect_destination_charge')),
  allocation_status text not null default 'recognized'
    check (allocation_status in ('pending', 'recognized', 'paid_out', 'reversed', 'failed')),
  plan_code text not null check (plan_code in ('basic', 'premium', 'enterprise')),
  currency text not null default 'usd',
  gross_amount_minor integer not null default 0,
  tax_amount_minor integer not null default 0,
  stripe_fee_minor integer not null default 0,
  net_amount_minor integer not null default 0,
  teacher_amount_minor integer not null default 0,
  platform_amount_minor integer not null default 0,
  teacher_share_percent numeric(5,2) not null default 70,
  platform_share_percent numeric(5,2) not null default 30,
  stripe_session_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  stripe_connected_account_id text,
  revenue_share_snapshot jsonb not null default private.default_course_run_revenue_share_manifest(),
  recognized_at timestamptz,
  paid_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checkout_intent_subscription on enrollment.checkout_intent(stripe_subscription_id)
where stripe_subscription_id is not null;
create index if not exists idx_checkout_intent_invoice on enrollment.checkout_intent(stripe_invoice_id)
where stripe_invoice_id is not null;
create index if not exists idx_checkout_intent_charge on enrollment.checkout_intent(stripe_charge_id)
where stripe_charge_id is not null;

create unique index if not exists idx_payment_allocation_invoice on enrollment.payment_allocation(stripe_invoice_id)
where stripe_invoice_id is not null;
create unique index if not exists idx_payment_allocation_charge on enrollment.payment_allocation(stripe_charge_id)
where stripe_charge_id is not null;
create index if not exists idx_payment_allocation_person on enrollment.payment_allocation(person_id, created_at desc);
create index if not exists idx_payment_allocation_run_status on enrollment.payment_allocation(course_run_id, allocation_status, created_at desc);
create index if not exists idx_payment_allocation_transfer on enrollment.payment_allocation(stripe_transfer_id)
where stripe_transfer_id is not null;

grant usage, select on all sequences in schema enrollment to authenticated;
grant select on enrollment.payment_allocation to authenticated;

alter table enrollment.payment_allocation enable row level security;

drop policy if exists payment_allocation_self_select on enrollment.payment_allocation;
create policy payment_allocation_self_select on enrollment.payment_allocation
for select to authenticated
using ((select auth.uid()) = person_id);

drop trigger if exists tr_enrollment_payment_allocation_updated_at on enrollment.payment_allocation;
create trigger tr_enrollment_payment_allocation_updated_at before update on enrollment.payment_allocation
for each row execute function private.touch_updated_at();
