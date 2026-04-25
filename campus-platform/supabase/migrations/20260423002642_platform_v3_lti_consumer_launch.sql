-- Align interactive renderer manifests with the LTI 1.3 consumer contract and
-- seed mock-launch defaults for interactive pilot blocks.

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
        "lti_tool_mode": null,
        "lti_login_initiation_url": null,
        "lti_target_link_uri": null,
        "lti_launch_url": null,
        "lti_client_id": null,
        "lti_deployment_id": null,
        "lti_resource_link_id": null,
        "lti_launch_presentation": "window",
        "lti_custom_parameters": {},
        "lti_title": null,
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

with interactive_contract as (
  select
    block.id,
    jsonb_set(
      private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest),
      '{props}',
      (
        coalesce(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) -> 'props', '{}'::jsonb)
        ||
        jsonb_build_object(
          'lti_tool_mode',
          case
            when nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_tool_mode}', '') is not null
              then private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_tool_mode}'
            when coalesce(
              nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_login_initiation_url}', ''),
              nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_target_link_uri}', ''),
              nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_launch_url}', '')
            ) is not null
              then 'custom'
            else 'mock'
          end,
          'lti_login_initiation_url',
          nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_login_initiation_url}', ''),
          'lti_target_link_uri',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_target_link_uri}', ''),
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_launch_url}', '')
          ),
          'lti_launch_url',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_launch_url}', ''),
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_target_link_uri}', '')
          ),
          'lti_client_id',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_client_id}', ''),
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,client_id}', ''),
            'campus-platform-v3'
          ),
          'lti_deployment_id',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_deployment_id}', ''),
            format('deployment-block-%s', block.id)
          ),
          'lti_resource_link_id',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_resource_link_id}', ''),
            format('resource-block-%s', block.id)
          ),
          'lti_launch_presentation',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_launch_presentation}', ''),
            'window'
          ),
          'lti_custom_parameters',
          case
            when jsonb_typeof(
              coalesce(
                private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #> '{props,lti_custom_parameters}',
                '{}'::jsonb
              )
            ) = 'object'
              then coalesce(
                private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #> '{props,lti_custom_parameters}',
                '{}'::jsonb
              )
            else '{}'::jsonb
          end,
          'lti_title',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_title}', ''),
            nullif(block.title, '')
          ),
          'client_id',
          coalesce(
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,client_id}', ''),
            nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,lti_client_id}', ''),
            'campus-platform-v3'
          ),
          'h5p_content_id',
          nullif(private.normalize_content_block_renderer_manifest(block.kind, block.renderer_manifest) #>> '{props,h5p_content_id}', '')
        )
      ),
      true
    ) as next_manifest
  from catalog.content_block as block
  where block.kind = 'interactive'
)
update catalog.content_block as block
set renderer_manifest = interactive_contract.next_manifest,
    updated_at = now()
from interactive_contract
where block.id = interactive_contract.id;
