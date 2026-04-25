-- Remove new project_submission advisor warnings introduced by G-12.

create index if not exists idx_learning_project_submission_attempt
  on learning.project_submission(attempt_id);

create index if not exists idx_learning_project_submission_rubric
  on learning.project_submission(rubric_id);

create index if not exists idx_learning_project_submission_reviewer
  on learning.project_submission(reviewer_person_id);

drop policy if exists project_submission_self_select on learning.project_submission;
drop policy if exists project_submission_reviewer_select on learning.project_submission;

create policy project_submission_select on learning.project_submission
for select to authenticated
using (
  (select auth.uid()) = person_id
  or exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists project_submission_self_update on learning.project_submission;
drop policy if exists project_submission_reviewer_update on learning.project_submission;

create policy project_submission_update on learning.project_submission
for update to authenticated
using (
  (select auth.uid()) = person_id
  or exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
)
with check (
  (select auth.uid()) = person_id
  or exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);
