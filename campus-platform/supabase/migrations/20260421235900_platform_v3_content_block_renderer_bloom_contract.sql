-- Persist renderer manifest and Bloom taxonomy on catalog.content_block.
-- Keep the DUA validation trigger as the single write-time contract gate.

do $$
begin
  if not exists (
    select 1
    from pg_type as type_row
    join pg_namespace as namespace_row
      on namespace_row.oid = type_row.typnamespace
    where namespace_row.nspname = 'catalog'
      and type_row.typname = 'bloom_level'
  ) then
    create type catalog.bloom_level as enum (
      'recordar',
      'comprender',
      'aplicar',
      'analizar',
      'evaluar',
      'crear'
    );
  end if;
end
$$;

create or replace function private.default_content_block_renderer_manifest(p_kind text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_kind, ''))
    when 'video' then '{
      "component": "video-block",
      "props": {
        "src": null,
        "captions": [],
        "transcript_url": null,
        "duration_s": 900
      },
      "a11y": {
        "role": "document",
        "aria_label": "Bloque de video",
        "keyboard_map": {}
      },
      "offline_capable": false
    }'::jsonb
    when 'quiz' then '{
      "component": "quiz-block",
      "props": {
        "questions": [],
        "passing_score": 80,
        "time_limit_s": 900
      },
      "a11y": {
        "role": "form",
        "aria_label": "Bloque de quiz",
        "keyboard_map": {}
      },
      "offline_capable": false
    }'::jsonb
    when 'interactive' then '{
      "component": "interactive-block",
      "props": {
        "lti_launch_url": null,
        "client_id": null,
        "h5p_content_id": null
      },
      "a11y": {
        "role": "application",
        "aria_label": "Bloque interactivo",
        "keyboard_map": {}
      },
      "offline_capable": false
    }'::jsonb
    when 'project' then '{
      "component": "project-block",
      "props": {
        "brief_md": null,
        "submission_format": "text",
        "rubric_id": null
      },
      "a11y": {
        "role": "article",
        "aria_label": "Bloque de proyecto",
        "keyboard_map": {}
      },
      "offline_capable": true
    }'::jsonb
    else '{
      "component": "reading-block",
      "props": {
        "markdown": null,
        "estimated_minutes": 15,
        "reading_level": "B1"
      },
      "a11y": {
        "role": "article",
        "aria_label": "Bloque de lectura",
        "keyboard_map": {}
      },
      "offline_capable": true
    }'::jsonb
  end;
$$;

create or replace function private.default_content_block_bloom_level(p_kind text)
returns catalog.bloom_level
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_kind, ''))
    when 'video' then 'comprender'::catalog.bloom_level
    when 'quiz' then 'aplicar'::catalog.bloom_level
    when 'interactive' then 'analizar'::catalog.bloom_level
    when 'project' then 'crear'::catalog.bloom_level
    else 'comprender'::catalog.bloom_level
  end;
$$;

create or replace function private.normalize_content_block_renderer_manifest(p_kind text, p_manifest jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with defaults as (
    select private.default_content_block_renderer_manifest(p_kind) as manifest
  )
  select jsonb_build_object(
    'component',
    coalesce(
      nullif(btrim(coalesce(p_manifest ->> 'component', '')), ''),
      defaults.manifest ->> 'component'
    ),
    'props',
    case
      when jsonb_typeof(coalesce(p_manifest -> 'props', '{}'::jsonb)) = 'object'
        then (defaults.manifest -> 'props') || (p_manifest -> 'props')
      else defaults.manifest -> 'props'
    end,
    'a11y',
    jsonb_build_object(
      'role',
      coalesce(
        nullif(btrim(coalesce(p_manifest -> 'a11y' ->> 'role', '')), ''),
        defaults.manifest -> 'a11y' ->> 'role'
      ),
      'aria_label',
      coalesce(
        nullif(btrim(coalesce(p_manifest -> 'a11y' ->> 'aria_label', '')), ''),
        defaults.manifest -> 'a11y' ->> 'aria_label'
      ),
      'keyboard_map',
      case
        when jsonb_typeof(coalesce(p_manifest -> 'a11y' -> 'keyboard_map', '{}'::jsonb)) = 'object'
          then (defaults.manifest -> 'a11y' -> 'keyboard_map') || (p_manifest -> 'a11y' -> 'keyboard_map')
        else defaults.manifest -> 'a11y' -> 'keyboard_map'
      end
    ),
    'offline_capable',
    case
      when jsonb_typeof(p_manifest -> 'offline_capable') = 'boolean' then p_manifest -> 'offline_capable'
      else defaults.manifest -> 'offline_capable'
    end
  )
  from defaults;
$$;

create or replace function private.normalize_content_block_bloom_level(p_kind text, p_value text)
returns catalog.bloom_level
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(nullif(btrim(p_value), ''), ''))
    when 'recordar' then 'recordar'::catalog.bloom_level
    when 'comprender' then 'comprender'::catalog.bloom_level
    when 'aplicar' then 'aplicar'::catalog.bloom_level
    when 'analizar' then 'analizar'::catalog.bloom_level
    when 'evaluar' then 'evaluar'::catalog.bloom_level
    when 'crear' then 'crear'::catalog.bloom_level
    else private.default_content_block_bloom_level(p_kind)
  end;
$$;

alter table catalog.content_block
  add column if not exists renderer_manifest jsonb,
  add column if not exists bloom_level catalog.bloom_level;

update catalog.content_block
set renderer_manifest = private.normalize_content_block_renderer_manifest(kind, renderer_manifest),
    bloom_level = private.normalize_content_block_bloom_level(kind, bloom_level::text);

alter table catalog.content_block
  alter column renderer_manifest set not null,
  alter column bloom_level set not null;

create or replace function private.validate_content_block_dua()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.renderer_manifest := private.normalize_content_block_renderer_manifest(new.kind, new.renderer_manifest);
  new.bloom_level := private.normalize_content_block_bloom_level(new.kind, new.bloom_level::text);

  if new.representation_variants is null or jsonb_typeof(new.representation_variants) <> 'object' then
    raise exception 'DUA: representation_variants must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.representation_variants -> 'modes', '[]'::jsonb)) <> 'array' then
    raise exception 'DUA: representation_variants.modes must be an array';
  end if;

  if jsonb_array_length(coalesce(new.representation_variants -> 'modes', '[]'::jsonb)) < 2 then
    raise exception 'DUA: requires >= 2 representation modes';
  end if;

  if btrim(coalesce(new.representation_variants ->> 'alt_text', '')) = '' then
    raise exception 'DUA: requires non-empty alt_text';
  end if;

  if new.expression_variants is null or jsonb_typeof(new.expression_variants) <> 'object' then
    raise exception 'DUA: expression_variants must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.expression_variants -> 'accepted_formats', '[]'::jsonb)) <> 'array' then
    raise exception 'DUA: expression_variants.accepted_formats must be an array';
  end if;

  if jsonb_array_length(coalesce(new.expression_variants -> 'accepted_formats', '[]'::jsonb)) < 1 then
    raise exception 'DUA: requires >= 1 accepted format';
  end if;

  if new.engagement_hooks is null or jsonb_typeof(new.engagement_hooks) <> 'object' then
    raise exception 'DUA: engagement_hooks must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.engagement_hooks -> 'choice_points', '[]'::jsonb)) <> 'array' then
    raise exception 'DUA: engagement_hooks.choice_points must be an array';
  end if;

  if jsonb_array_length(coalesce(new.engagement_hooks -> 'choice_points', '[]'::jsonb)) < 1 then
    raise exception 'DUA: requires >= 1 choice point';
  end if;

  if new.renderer_manifest is null or jsonb_typeof(new.renderer_manifest) <> 'object' then
    raise exception 'Renderer: renderer_manifest must be a json object';
  end if;

  if btrim(coalesce(new.renderer_manifest ->> 'component', '')) = '' then
    raise exception 'Renderer: requires non-empty component';
  end if;

  if (new.renderer_manifest ->> 'component') !~ '^[a-z]+-block$' then
    raise exception 'Renderer: component must match ^[a-z]+-block$';
  end if;

  if jsonb_typeof(coalesce(new.renderer_manifest -> 'props', '{}'::jsonb)) <> 'object' then
    raise exception 'Renderer: props must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.renderer_manifest -> 'a11y', '{}'::jsonb)) <> 'object' then
    raise exception 'Renderer: a11y must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.renderer_manifest -> 'a11y' -> 'keyboard_map', '{}'::jsonb)) <> 'object' then
    raise exception 'Renderer: a11y.keyboard_map must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.renderer_manifest -> 'offline_capable', 'false'::jsonb)) <> 'boolean' then
    raise exception 'Renderer: offline_capable must be boolean';
  end if;

  if new.bloom_level is null then
    raise exception 'Bloom: bloom_level is required';
  end if;

  return new;
end;
$$;

create or replace view public.platform_course_blocks_v
with (security_invoker = true) as
select
  course.slug as course_slug,
  course.title as course_title,
  course.summary as course_summary,
  track.title as track_title,
  course.transformation_promise,
  course.duration_label,
  course.audience_label,
  course.access_model,
  course.price_label,
  course.delivery_label,
  coalesce(run.title, 'Sin cohorte abierta') as run_label,
  block.id as block_id,
  block.slug as block_slug,
  block.title as block_title,
  block.summary as block_summary,
  block.objective as block_objective,
  block.kind as block_kind,
  block.position as block_order,
  block.duration_minutes,
  block.is_public as is_free,
  block.representation_variants,
  block.expression_variants,
  block.engagement_hooks,
  block.renderer_manifest,
  block.bloom_level
from catalog.content_block as block
join catalog.course as course
  on course.id = block.course_id
join catalog.track as track
  on track.id = course.track_id
left join lateral (
  select course_run.title
  from delivery.course_run as course_run
  where course_run.course_id = course.id
    and course_run.status in ('open', 'closed')
  order by course_run.starts_at nulls last
  limit 1
) as run on true
where track.is_published
  and course.status = 'published';
