-- Harden the DUA validation trigger function with an explicit search_path.

create or replace function private.validate_content_block_dua()
returns trigger
language plpgsql
set search_path = ''
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
