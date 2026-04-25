-- Align catalog.content_block.kind with the functional spec.
-- Canonical families: video | quiz | reading | interactive | project

alter table catalog.content_block
  drop constraint if exists content_block_kind_check;

update catalog.content_block as block
set kind = case
  when lesson.tipo = 'video' then 'video'
  when lesson.tipo = 'mixed' then 'quiz'
  when lesson.tipo = 'pdf' then 'reading'
  else 'reading'
end
from public.lessons as lesson
where block.legacy_lesson_id = lesson.id
  and block.kind in ('lesson', 'practice', 'resource');

update catalog.content_block
set kind = case kind
  when 'lesson' then 'reading'
  when 'resource' then 'reading'
  when 'workshop' then 'interactive'
  when 'practice' then 'quiz'
  when 'milestone' then 'project'
  else kind
end
where kind not in ('video', 'quiz', 'reading', 'interactive', 'project');

alter table catalog.content_block
  alter column kind set default 'reading';

alter table catalog.content_block
  add constraint content_block_kind_check
  check (kind in ('video', 'quiz', 'reading', 'interactive', 'project'));
