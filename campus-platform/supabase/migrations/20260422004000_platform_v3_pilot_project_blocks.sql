-- Promote the pilot closing blocks to project blocks with live rubric linkage.
-- This makes the manual-review flow visible in remote data, not only in schema.

do $$
declare
  v_course_id bigint;
  v_rubric_slug text;
  v_updated_count integer := 0;
  v_representation_variants jsonb := jsonb_build_object(
    'modes', jsonb_build_array('text', 'rubric', 'worked_example'),
    'contrast_ratio_min', 4.5,
    'alt_text', 'Brief accesible del proyecto',
    'transcript_url', null,
    'simplified_version_url', null,
    'reading_level', 'B1'
  );
  v_expression_variants jsonb := jsonb_build_object(
    'accepted_formats', jsonb_build_array('text', 'video_upload', 'drawing'),
    'time_extension_pct', 25,
    'assistive_tech_hints', jsonb_build_array('screen_reader_friendly', 'keyboard_only')
  );
  v_engagement_hooks jsonb := jsonb_build_object(
    'choice_points', jsonb_build_array('select_depth', 'choose_submission_format'),
    'goal_relevance_prompt', 'Que evidencia concreta demostrara el cambio logrado?',
    'feedback_cadence', 'milestone_based',
    'collaboration_mode', 'optional_peer_review'
  );
begin
  select course.id
  into v_course_id
  from catalog.course as course
  where course.slug = 'programa-empoderamiento-power-skills';

  if v_course_id is null then
    raise exception 'No se encontro el curso piloto programa-empoderamiento-power-skills';
  end if;

  select rubric.slug
  into v_rubric_slug
  from catalog.rubric as rubric
  where rubric.course_id = v_course_id
    and rubric.slug = 'rubrica-proyecto-evidencia-de-impacto'
  limit 1;

  if v_rubric_slug is null then
    raise exception 'No se encontro la rubrica publicada del piloto';
  end if;

  update catalog.content_block as block
  set kind = 'project',
      summary = case block.slug
        when 'legacy-405' then 'Real Solutions para convertir el metodo en solucion operativa.'
        when 'legacy-406' then 'Presentacion final para consolidar narrativa, resultado y evidencia.'
        when 'legacy-501' then 'Cierre y embajadores para activar continuidad, red y credencial.'
        else block.summary
      end,
      objective = case block.slug
        when 'legacy-405' then 'Llevar una mejora de punta a punta hasta un caso real.'
        when 'legacy-406' then 'Cerrar la ruta con una solucion comunicable y verificable.'
        when 'legacy-501' then 'Salir con una siguiente etapa clara y un activo verificable.'
        else block.objective
      end,
      representation_variants = v_representation_variants,
      expression_variants = v_expression_variants,
      engagement_hooks = v_engagement_hooks,
      renderer_manifest = case block.slug
        when 'legacy-405' then jsonb_build_object(
          'component', 'project-block',
          'props', jsonb_build_object(
            'brief_md', E'## Desafio\nConvierte una friccion manual en una solucion operativa apoyada por IA.\n\n## Entregable\n1. Problema y baseline.\n2. Flujo redisenado o automatizado.\n3. Evidencia concreta del cambio.\n4. Riesgos, limites y siguiente iteracion.',
            'submission_format', 'text',
            'rubric_id', v_rubric_slug
          ),
          'a11y', jsonb_build_object(
            'role', 'article',
            'aria_label', 'Bloque de proyecto',
            'keyboard_map', jsonb_build_object()
          ),
          'offline_capable', true
        )
        when 'legacy-406' then jsonb_build_object(
          'component', 'project-block',
          'props', jsonb_build_object(
            'brief_md', E'## Desafio\nPresenta la solucion final con una narrativa clara para un stakeholder real.\n\n## Entregable\n1. Contexto y oportunidad.\n2. Antes y despues del flujo.\n3. Evidencia o demo enlazada.\n4. Aprendizajes y decision de continuidad.',
            'submission_format', 'text',
            'rubric_id', v_rubric_slug
          ),
          'a11y', jsonb_build_object(
            'role', 'article',
            'aria_label', 'Bloque de proyecto',
            'keyboard_map', jsonb_build_object()
          ),
          'offline_capable', true
        )
        when 'legacy-501' then jsonb_build_object(
          'component', 'project-block',
          'props', jsonb_build_object(
            'brief_md', E'## Desafio\nCierra el programa con una evidencia verificable y un plan claro de continuidad.\n\n## Entregable\n1. Evidencia principal del resultado.\n2. Reflexion sobre el metodo aplicado.\n3. Siguiente paso de 30 dias.\n4. Activo o enlace que puedas compartir como portafolio.',
            'submission_format', 'text',
            'rubric_id', v_rubric_slug
          ),
          'a11y', jsonb_build_object(
            'role', 'article',
            'aria_label', 'Bloque de proyecto',
            'keyboard_map', jsonb_build_object()
          ),
          'offline_capable', true
        )
        else block.renderer_manifest
      end,
      bloom_level = 'crear'::catalog.bloom_level,
      updated_at = now()
  where block.course_id = v_course_id
    and block.slug in ('legacy-405', 'legacy-406', 'legacy-501');

  get diagnostics v_updated_count = row_count;

  if v_updated_count <> 3 then
    raise exception 'Se esperaban 3 bloques project del piloto y se actualizaron %', v_updated_count;
  end if;
end;
$$;
