-- Promote a pilot practice block to the interactive LTI contract so the
-- LTI 1.3 consumer capability is visible in the live course, not only in demo.

update catalog.content_block as block
set kind = 'interactive',
    representation_variants = jsonb_build_object(
      'modes', jsonb_build_array('text', 'guided_demo', 'keyboard_navigation'),
      'contrast_ratio_min', 4.5,
      'alt_text', 'Guia accesible de la practica ' || coalesce(nullif(block.title, ''), 'sin titulo'),
      'transcript_url', null,
      'simplified_version_url', null,
      'reading_level', 'B1'
    ),
    expression_variants = jsonb_build_object(
      'accepted_formats', jsonb_build_array('text', 'drawing'),
      'time_extension_pct', 25,
      'assistive_tech_hints', jsonb_build_array('keyboard_only', 'step_by_step_prompting', 'voice_dictation')
    ),
    engagement_hooks = jsonb_build_object(
      'choice_points', jsonb_build_array('pick_scenario', 'select_depth'),
      'goal_relevance_prompt', 'Que ruta refleja mejor tu contexto real de trabajo?',
      'feedback_cadence', 'guided_steps',
      'collaboration_mode', 'optional_peer_review'
    ),
    renderer_manifest = jsonb_build_object(
      'component', 'interactive-block',
      'props', jsonb_build_object(
        'lti_tool_mode', 'mock',
        'lti_login_initiation_url', null,
        'lti_target_link_uri', null,
        'lti_launch_url', null,
        'lti_client_id', 'campus-platform-v3',
        'lti_deployment_id', format('deployment-block-%s', block.id),
        'lti_resource_link_id', format('resource-block-%s', block.id),
        'lti_launch_presentation', 'window',
        'lti_custom_parameters', jsonb_build_object(
          'course_slug', 'programa-empoderamiento-power-skills',
          'experience', 'guided-demo'
        ),
        'lti_title', block.title,
        'client_id', 'campus-platform-v3',
        'h5p_content_id', null
      ),
      'a11y', jsonb_build_object(
        'role', 'application',
        'aria_label', 'Bloque interactivo',
        'keyboard_map', jsonb_build_object()
      ),
      'offline_capable', false
    ),
    bloom_level = 'analizar'::catalog.bloom_level,
    updated_at = now()
where block.slug = 'legacy-201'
  and block.course_id = (
    select course.id
    from catalog.course as course
    where course.slug = 'programa-empoderamiento-power-skills'
    limit 1
  );
