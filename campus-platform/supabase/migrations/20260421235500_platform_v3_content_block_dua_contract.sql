-- Persist DUA/UDL contract data on catalog.content_block and validate minimum completeness.

alter table catalog.content_block
  add column if not exists representation_variants jsonb,
  add column if not exists expression_variants jsonb,
  add column if not exists engagement_hooks jsonb;

alter table catalog.content_block
  alter column representation_variants set default '{}'::jsonb,
  alter column expression_variants set default '{}'::jsonb,
  alter column engagement_hooks set default '{}'::jsonb;

update catalog.content_block
set representation_variants = case kind
  when 'video' then jsonb_build_object(
    'modes', jsonb_build_array('text', 'audio', 'video_caption'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Resumen accesible del bloque ' || coalesce(nullif(title, ''), 'sin titulo'),
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  )
  when 'quiz' then jsonb_build_object(
    'modes', jsonb_build_array('text', 'audio', 'diagram'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Mapa accesible del quiz ' || coalesce(nullif(title, ''), 'sin titulo'),
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  )
  when 'interactive' then jsonb_build_object(
    'modes', jsonb_build_array('text', 'guided_demo', 'keyboard_navigation'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Guia accesible de la practica ' || coalesce(nullif(title, ''), 'sin titulo'),
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  )
  when 'project' then jsonb_build_object(
    'modes', jsonb_build_array('text', 'rubric', 'worked_example'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Brief accesible del proyecto ' || coalesce(nullif(title, ''), 'sin titulo'),
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  )
  else jsonb_build_object(
    'modes', jsonb_build_array('text', 'audio', 'simplified_text'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Resumen accesible de la lectura ' || coalesce(nullif(title, ''), 'sin titulo'),
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  )
end
where representation_variants is null
   or jsonb_typeof(representation_variants) <> 'object'
   or representation_variants = '{}'::jsonb;

update catalog.content_block
set expression_variants = case kind
  when 'video' then jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'audio_upload'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('screen_reader_friendly', 'keyboard_only')
  )
  when 'quiz' then jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'audio_upload'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('screen_reader_friendly', 'keyboard_only')
  )
  when 'interactive' then jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'drawing'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('keyboard_only', 'step_by_step_prompting')
  )
  when 'project' then jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'video_upload', 'drawing'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('screen_reader_friendly', 'keyboard_only')
  )
  else jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'audio_upload'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('screen_reader_friendly', 'keyboard_only')
  )
end
where expression_variants is null
   or jsonb_typeof(expression_variants) <> 'object'
   or expression_variants = '{}'::jsonb;

update catalog.content_block
set engagement_hooks = case kind
  when 'video' then jsonb_build_object(
    'choice_points', jsonb_build_array('pick_scenario', 'select_depth'),
    'goal_relevance_prompt', 'Como aplicaras este video en tu operacion esta semana?',
    'feedback_cadence', 'per_attempt',
    'collaboration_mode', 'optional_peer_review'
  )
  when 'quiz' then jsonb_build_object(
    'choice_points', jsonb_build_array('pick_scenario', 'choose_retry_path'),
    'goal_relevance_prompt', 'Que decision concreta quieres validar con este quiz?',
    'feedback_cadence', 'per_attempt',
    'collaboration_mode', 'solo_reflection'
  )
  when 'interactive' then jsonb_build_object(
    'choice_points', jsonb_build_array('pick_scenario', 'select_depth'),
    'goal_relevance_prompt', 'Que ruta refleja mejor tu contexto real de trabajo?',
    'feedback_cadence', 'guided_steps',
    'collaboration_mode', 'optional_peer_review'
  )
  when 'project' then jsonb_build_object(
    'choice_points', jsonb_build_array('select_depth', 'choose_submission_format'),
    'goal_relevance_prompt', 'Que evidencia concreta demostrara el cambio logrado?',
    'feedback_cadence', 'milestone_based',
    'collaboration_mode', 'optional_peer_review'
  )
  else jsonb_build_object(
    'choice_points', jsonb_build_array('pick_scenario', 'select_depth'),
    'goal_relevance_prompt', 'Como conectas esta lectura con tu rol actual?',
    'feedback_cadence', 'reflection_prompt',
    'collaboration_mode', 'solo_reflection'
  )
end
where engagement_hooks is null
   or jsonb_typeof(engagement_hooks) <> 'object'
   or engagement_hooks = '{}'::jsonb;

alter table catalog.content_block
  alter column representation_variants set not null,
  alter column expression_variants set not null,
  alter column engagement_hooks set not null;

create or replace function private.validate_content_block_dua()
returns trigger
language plpgsql
as $$
begin
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

  return new;
end;
$$;

drop trigger if exists trg_validate_content_block_dua on catalog.content_block;
create trigger trg_validate_content_block_dua
before insert or update on catalog.content_block
for each row execute function private.validate_content_block_dua();

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
  block.engagement_hooks
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
