-- Backfill the DUA expression contract so blocks that already accept textual
-- responses advertise voice dictation as an assistive hint.
with normalized as (
  select
    cb.id,
    jsonb_set(
      cb.expression_variants,
      '{assistive_tech_hints}',
      to_jsonb(
        (
          select coalesce(array_agg(distinct hint order by hint), array[]::text[])
          from unnest(
            array_cat(
              coalesce(
                array(
                  select jsonb_array_elements_text(
                    coalesce(cb.expression_variants -> 'assistive_tech_hints', '[]'::jsonb)
                  )
                ),
                array[]::text[]
              ),
              case
                when coalesce(cb.expression_variants -> 'accepted_formats', '[]'::jsonb) ? 'text'
                  then array['voice_dictation']::text[]
                else array[]::text[]
              end
            )
          ) as hint
        )
      ),
      true
    ) as next_expression_variants
  from catalog.content_block as cb
)
update catalog.content_block as cb
set expression_variants = normalized.next_expression_variants
from normalized
where cb.id = normalized.id
  and cb.expression_variants is distinct from normalized.next_expression_variants;
