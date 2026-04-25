-- G-OBJ/T-010: teacher reporting needs live progress signals without Stripe.

create index if not exists idx_enrollment_run_status_person
  on enrollment.enrollment(course_run_id, status, person_id);

create index if not exists idx_learning_attempt_block_person_completed
  on learning.attempt(content_block_id, person_id, completed_at desc);

create index if not exists idx_learning_xapi_course_emitted
  on learning.xapi_statement((payload ->> 'course_id'), emitted_at desc);

drop index if exists learning.idx_learning_mastery_person_next_review;

create index if not exists idx_learning_spaced_schedule_source_person_next
  on learning.spaced_schedule(source_content_block_id, person_id, next_review_at);

drop policy if exists enrollment_self_select on enrollment.enrollment;
drop policy if exists enrollment_staff_select on enrollment.enrollment;
drop policy if exists enrollment_select on enrollment.enrollment;
create policy enrollment_select on enrollment.enrollment
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

drop policy if exists attempt_self_all on learning.attempt;
drop policy if exists attempt_staff_select on learning.attempt;
drop policy if exists attempt_select on learning.attempt;
drop policy if exists attempt_self_insert on learning.attempt;
drop policy if exists attempt_self_update on learning.attempt;
drop policy if exists attempt_self_delete on learning.attempt;
create policy attempt_select on learning.attempt
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

create policy attempt_self_insert on learning.attempt
for insert to authenticated
with check ((select auth.uid()) = person_id);

create policy attempt_self_update on learning.attempt
for update to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

create policy attempt_self_delete on learning.attempt
for delete to authenticated
using ((select auth.uid()) = person_id);

drop policy if exists mastery_self_all on learning.mastery_state;
drop policy if exists mastery_staff_select on learning.mastery_state;
drop policy if exists mastery_select on learning.mastery_state;
drop policy if exists mastery_self_insert on learning.mastery_state;
drop policy if exists mastery_self_update on learning.mastery_state;
drop policy if exists mastery_self_delete on learning.mastery_state;
create policy mastery_select on learning.mastery_state
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

create policy mastery_self_insert on learning.mastery_state
for insert to authenticated
with check ((select auth.uid()) = person_id);

create policy mastery_self_update on learning.mastery_state
for update to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

create policy mastery_self_delete on learning.mastery_state
for delete to authenticated
using ((select auth.uid()) = person_id);

drop policy if exists spaced_schedule_self_all on learning.spaced_schedule;
drop policy if exists spaced_schedule_staff_select on learning.spaced_schedule;
drop policy if exists spaced_schedule_select on learning.spaced_schedule;
drop policy if exists spaced_schedule_self_insert on learning.spaced_schedule;
drop policy if exists spaced_schedule_self_update on learning.spaced_schedule;
drop policy if exists spaced_schedule_self_delete on learning.spaced_schedule;
create policy spaced_schedule_select on learning.spaced_schedule
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

create policy spaced_schedule_self_insert on learning.spaced_schedule
for insert to authenticated
with check ((select auth.uid()) = person_id);

create policy spaced_schedule_self_update on learning.spaced_schedule
for update to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

create policy spaced_schedule_self_delete on learning.spaced_schedule
for delete to authenticated
using ((select auth.uid()) = person_id);

drop policy if exists xapi_self_all on learning.xapi_statement;
drop policy if exists xapi_staff_select on learning.xapi_statement;
drop policy if exists xapi_select on learning.xapi_statement;
drop policy if exists xapi_self_insert on learning.xapi_statement;
drop policy if exists xapi_self_update on learning.xapi_statement;
drop policy if exists xapi_self_delete on learning.xapi_statement;
create policy xapi_select on learning.xapi_statement
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

create policy xapi_self_insert on learning.xapi_statement
for insert to authenticated
with check ((select auth.uid()) = person_id);

create policy xapi_self_update on learning.xapi_statement
for update to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

create policy xapi_self_delete on learning.xapi_statement
for delete to authenticated
using ((select auth.uid()) = person_id);

drop policy if exists badge_assertion_public_or_self_select on credentials.badge_assertion;
drop policy if exists badge_assertion_staff_select on credentials.badge_assertion;
drop policy if exists badge_assertion_public_select_anon on credentials.badge_assertion;
drop policy if exists badge_assertion_authenticated_select on credentials.badge_assertion;
create policy badge_assertion_public_select_anon on credentials.badge_assertion
for select to anon
using (status = 'issued');

create policy badge_assertion_authenticated_select on credentials.badge_assertion
for select to authenticated
using (
  status = 'issued'
  or (select auth.uid()) = person_id
  or exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

do $$
declare
  realtime_schema text;
  realtime_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  for realtime_schema, realtime_table in
    select *
    from (
      values
        ('enrollment', 'enrollment'),
        ('learning', 'attempt'),
        ('learning', 'mastery_state'),
        ('learning', 'spaced_schedule'),
        ('learning', 'xapi_statement'),
        ('learning', 'project_submission'),
        ('credentials', 'badge_assertion')
    ) as tracked_tables(schema_name, table_name)
  loop
    if to_regclass(format('%I.%I', realtime_schema, realtime_table)) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = realtime_schema
          and tablename = realtime_table
      )
    then
      execute format(
        'alter publication supabase_realtime add table %I.%I',
        realtime_schema,
        realtime_table
      );
    end if;
  end loop;
end $$;
