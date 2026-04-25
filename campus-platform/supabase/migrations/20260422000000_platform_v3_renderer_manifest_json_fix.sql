-- Fix renderer manifest defaults after the initial bloom/renderer rollout.
-- The original backfill serialized nested props/keyboard_map as null instead of empty objects.

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

update catalog.content_block
set renderer_manifest = private.normalize_content_block_renderer_manifest(kind, renderer_manifest);
