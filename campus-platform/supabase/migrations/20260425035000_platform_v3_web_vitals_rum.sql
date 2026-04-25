create schema if not exists observability;

revoke all on schema observability from anon, authenticated;
grant usage on schema observability to service_role;

create table if not exists observability.web_vital_event (
  id bigserial primary key,
  event_id text not null,
  page_load_id uuid not null,
  client_session_id uuid not null,
  metric_name text not null check (metric_name in ('CLS', 'FCP', 'INP', 'LCP', 'TTFB')),
  metric_value numeric(12, 4) not null check (metric_value >= 0),
  metric_delta numeric(12, 4) not null default 0 check (metric_delta >= 0),
  metric_rating text not null check (metric_rating in ('good', 'needs-improvement', 'poor')),
  navigation_type text not null default 'navigate',
  page_path text not null check (page_path like '/%' and char_length(page_path) <= 512),
  page_origin text not null default '',
  viewport_width integer check (viewport_width is null or viewport_width between 0 and 10000),
  viewport_height integer check (viewport_height is null or viewport_height between 0 and 10000),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  effective_connection_type text,
  visibility_state text,
  sample_rate numeric(6, 5) not null default 1 check (sample_rate > 0 and sample_rate <= 1),
  attribution jsonb not null default '{}'::jsonb,
  source text not null default 'web-vitals',
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, metric_name, page_load_id)
);

alter table observability.web_vital_event enable row level security;

revoke all on observability.web_vital_event from anon, authenticated;
grant select, insert on observability.web_vital_event to service_role;
grant usage, select on sequence observability.web_vital_event_id_seq to service_role;

create index if not exists web_vital_event_created_at_idx
  on observability.web_vital_event (created_at desc);

create index if not exists web_vital_event_metric_created_at_idx
  on observability.web_vital_event (metric_name, created_at desc);

create index if not exists web_vital_event_path_metric_created_at_idx
  on observability.web_vital_event (page_path, metric_name, created_at desc);

create or replace view observability.web_vital_daily_p75_v
with (security_invoker = true) as
select
  date_trunc('day', reported_at)::date as report_date,
  page_path,
  metric_name,
  percentile_cont(0.75) within group (order by metric_value::double precision) as p75_value,
  count(*)::integer as sample_count,
  max(created_at) as last_seen_at
from observability.web_vital_event
group by 1, 2, 3;

grant select on observability.web_vital_daily_p75_v to service_role;

create or replace function public.ingest_web_vital_events(payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = observability, public
as $$
declare
  inserted_count integer := 0;
begin
  if payload is null or jsonb_typeof(payload) <> 'array' then
    raise exception 'invalid web vitals payload';
  end if;

  if jsonb_array_length(payload) > 10 then
    raise exception 'too many web vitals events';
  end if;

  insert into observability.web_vital_event (
    event_id,
    page_load_id,
    client_session_id,
    metric_name,
    metric_value,
    metric_delta,
    metric_rating,
    navigation_type,
    page_path,
    page_origin,
    viewport_width,
    viewport_height,
    device_type,
    effective_connection_type,
    visibility_state,
    sample_rate,
    attribution,
    source,
    reported_at
  )
  select
    event.event_id,
    event.page_load_id,
    event.client_session_id,
    event.metric_name,
    event.metric_value,
    event.metric_delta,
    event.metric_rating,
    event.navigation_type,
    event.page_path,
    event.page_origin,
    event.viewport_width,
    event.viewport_height,
    event.device_type,
    event.effective_connection_type,
    event.visibility_state,
    event.sample_rate,
    coalesce(event.attribution, '{}'::jsonb),
    coalesce(event.source, 'web-vitals'),
    event.reported_at
  from jsonb_to_recordset(payload) as event(
    event_id text,
    page_load_id uuid,
    client_session_id uuid,
    metric_name text,
    metric_value numeric,
    metric_delta numeric,
    metric_rating text,
    navigation_type text,
    page_path text,
    page_origin text,
    viewport_width integer,
    viewport_height integer,
    device_type text,
    effective_connection_type text,
    visibility_state text,
    sample_rate numeric,
    attribution jsonb,
    source text,
    reported_at timestamptz
  )
  on conflict (event_id, metric_name, page_load_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.ingest_web_vital_events(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_web_vital_events(jsonb) to service_role;
