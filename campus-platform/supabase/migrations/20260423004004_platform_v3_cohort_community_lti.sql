alter table delivery.course_run
add column if not exists community_manifest jsonb;

create or replace function private.default_course_run_community_manifest(p_run_title text)
returns jsonb
language sql
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'enabled', false,
    'provider', 'discourse',
    'title', trim(both from concat('Comunidad ', coalesce(nullif(btrim(p_run_title), ''), 'Cohorte abierta'))),
    'summary', 'Foro privado de cohorte para preguntas, avances y peer-review con evidencia.',
    'entry_label', 'Abrir comunidad de cohorte',
    'discussion_prompt', 'Comparte un avance aplicable esta semana y pide una retroalimentacion concreta.',
    'peer_review_enabled', true,
    'surface_modes', jsonb_build_array('forum', 'peer_review'),
    'expectations', jsonb_build_array(
      'Comparte un avance real con contexto y evidencia cada semana.',
      'Pide feedback con una pregunta concreta y un siguiente paso visible.',
      'Devuelve revision accionable a por lo menos dos pares de la cohorte.'
    ),
    'lti', jsonb_build_object(
      'tool_mode', null,
      'title', 'Discourse de cohorte',
      'login_initiation_url', null,
      'target_link_uri', null,
      'client_id', null,
      'deployment_id', null,
      'resource_link_id', null,
      'launch_presentation', 'window',
      'custom_parameters', jsonb_build_object(
        'provider', 'discourse',
        'surface', 'community'
      )
    )
  );
$$;

create or replace function private.normalize_course_run_community_manifest(
  p_run_title text,
  p_manifest jsonb
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_defaults jsonb := private.default_course_run_community_manifest(p_run_title);
  v_manifest jsonb := case
    when p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then '{}'::jsonb
    else p_manifest
  end;
  v_peer_review boolean := coalesce(
    (v_manifest ->> 'peer_review_enabled')::boolean,
    jsonb_path_exists(coalesce(v_manifest -> 'surface_modes', '[]'::jsonb), '$[*] ? (@ == "peer_review")'),
    true
  );
  v_lti jsonb := case
    when jsonb_typeof(coalesce(v_manifest -> 'lti', '{}'::jsonb)) = 'object' then v_manifest -> 'lti'
    else '{}'::jsonb
  end;
  v_tool_mode text := lower(coalesce(nullif(btrim(v_lti ->> 'tool_mode'), ''), 'none'));
begin
  return jsonb_build_object(
    'enabled', coalesce((v_manifest ->> 'enabled')::boolean, false),
    'provider', 'discourse',
    'title', coalesce(nullif(btrim(v_manifest ->> 'title'), ''), v_defaults ->> 'title'),
    'summary', coalesce(nullif(btrim(v_manifest ->> 'summary'), ''), v_defaults ->> 'summary'),
    'entry_label', coalesce(nullif(btrim(v_manifest ->> 'entry_label'), ''), v_defaults ->> 'entry_label'),
    'discussion_prompt', coalesce(nullif(btrim(v_manifest ->> 'discussion_prompt'), ''), v_defaults ->> 'discussion_prompt'),
    'peer_review_enabled', v_peer_review,
    'surface_modes',
      case
        when v_peer_review then jsonb_build_array('forum', 'peer_review')
        else jsonb_build_array('forum')
      end,
    'expectations',
      case
        when jsonb_typeof(coalesce(v_manifest -> 'expectations', '[]'::jsonb)) = 'array'
          and jsonb_array_length(coalesce(v_manifest -> 'expectations', '[]'::jsonb)) > 0
          then v_manifest -> 'expectations'
        else v_defaults -> 'expectations'
      end,
    'lti', jsonb_build_object(
      'tool_mode', case when v_tool_mode in ('mock', 'custom') then v_tool_mode else null end,
      'title', coalesce(nullif(btrim(v_lti ->> 'title'), ''), v_defaults #>> '{lti,title}'),
      'login_initiation_url',
        case
          when v_tool_mode = 'custom' then nullif(btrim(v_lti ->> 'login_initiation_url'), '')
          else null
        end,
      'target_link_uri',
        case
          when v_tool_mode = 'custom' then nullif(btrim(v_lti ->> 'target_link_uri'), '')
          else null
        end,
      'client_id', nullif(btrim(v_lti ->> 'client_id'), ''),
      'deployment_id', nullif(btrim(v_lti ->> 'deployment_id'), ''),
      'resource_link_id', nullif(btrim(v_lti ->> 'resource_link_id'), ''),
      'launch_presentation',
        case
          when lower(coalesce(v_lti ->> 'launch_presentation', 'window')) = 'iframe' then 'iframe'
          else 'window'
        end,
      'custom_parameters',
        case
          when jsonb_typeof(coalesce(v_lti -> 'custom_parameters', '{}'::jsonb)) = 'object'
            then (v_defaults #> '{lti,custom_parameters}') || (v_lti -> 'custom_parameters')
          else v_defaults #> '{lti,custom_parameters}'
        end
    )
  );
end;
$$;

update delivery.course_run
set community_manifest = private.normalize_course_run_community_manifest(title, community_manifest);

update delivery.course_run
set community_manifest = private.normalize_course_run_community_manifest(
  title,
  jsonb_build_object(
    'enabled', true,
    'provider', 'discourse',
    'title', 'Comunidad de cohorte Power Skills',
    'summary', 'Foro guiado para preguntas, avances con evidencia y peer-review entre profesionales de la cohorte.',
    'entry_label', 'Abrir comunidad',
    'discussion_prompt', 'Presentate con un reto real de trabajo y comparte la evidencia que quieres producir durante esta cohorte.',
    'peer_review_enabled', true,
    'surface_modes', jsonb_build_array('forum', 'peer_review'),
    'expectations', jsonb_build_array(
      'Publica una actualizacion semanal con contexto y una decision visible.',
      'Pide feedback con una pregunta concreta y una evidencia adjunta.',
      'Responde a dos companeros con sugerencias accionables.'
    ),
    'lti', jsonb_build_object(
      'tool_mode', 'mock',
      'title', 'Discourse sandbox de cohorte',
      'client_id', 'campus-platform-v3',
      'deployment_id', 'deployment-community-pilot',
      'resource_link_id', 'resource-community-pilot',
      'launch_presentation', 'window',
      'custom_parameters', jsonb_build_object(
        'provider', 'discourse',
        'surface', 'community',
        'channel', 'power-skills-pilot'
      )
    )
  )
)
where slug = 'power-skills-pilot-open';

alter table delivery.course_run
  alter column community_manifest set default private.default_course_run_community_manifest('Cohorte abierta'),
  alter column community_manifest set not null;

create or replace function private.validate_course_run_community_manifest()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_enabled boolean;
  v_tool_mode text;
begin
  new.community_manifest := private.normalize_course_run_community_manifest(new.title, new.community_manifest);

  if new.community_manifest is null or jsonb_typeof(new.community_manifest) <> 'object' then
    raise exception 'Community: community_manifest must be a json object';
  end if;

  if jsonb_typeof(coalesce(new.community_manifest -> 'expectations', '[]'::jsonb)) <> 'array' then
    raise exception 'Community: expectations must be an array';
  end if;

  if jsonb_typeof(coalesce(new.community_manifest -> 'surface_modes', '[]'::jsonb)) <> 'array' then
    raise exception 'Community: surface_modes must be an array';
  end if;

  if jsonb_typeof(coalesce(new.community_manifest -> 'lti', '{}'::jsonb)) <> 'object' then
    raise exception 'Community: lti must be an object';
  end if;

  v_enabled := coalesce((new.community_manifest ->> 'enabled')::boolean, false);
  if not v_enabled then
    return new;
  end if;

  v_tool_mode := coalesce(new.community_manifest #>> '{lti,tool_mode}', '');
  if v_tool_mode not in ('mock', 'custom') then
    raise exception 'Community: enabled cohorts require lti.tool_mode mock or custom';
  end if;

  if btrim(coalesce(new.community_manifest #>> '{lti,client_id}', '')) = ''
    or btrim(coalesce(new.community_manifest #>> '{lti,deployment_id}', '')) = ''
    or btrim(coalesce(new.community_manifest #>> '{lti,resource_link_id}', '')) = '' then
    raise exception 'Community: enabled cohorts require client_id, deployment_id and resource_link_id';
  end if;

  if v_tool_mode = 'custom' and (
    btrim(coalesce(new.community_manifest #>> '{lti,login_initiation_url}', '')) = ''
    or btrim(coalesce(new.community_manifest #>> '{lti,target_link_uri}', '')) = ''
  ) then
    raise exception 'Community: custom LTI mode requires login_initiation_url and target_link_uri';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_course_run_community_manifest on delivery.course_run;
create trigger trg_validate_course_run_community_manifest
before insert or update on delivery.course_run
for each row execute function private.validate_course_run_community_manifest();

create or replace view public.platform_course_community_v
with (security_invoker = true) as
select distinct on (course.id)
  course.slug as course_slug,
  course.title as course_title,
  course_run.id as run_id,
  course_run.slug as run_slug,
  course_run.title as run_title,
  course_run.community_manifest
from catalog.course as course
join delivery.course_run as course_run
  on course_run.course_id = course.id
where course.status = 'published'
  and course_run.status in ('open', 'closed')
  and coalesce((course_run.community_manifest ->> 'enabled')::boolean, false)
order by course.id, course_run.starts_at desc nulls last, course_run.id desc;

grant select on public.platform_course_community_v to anon, authenticated;
