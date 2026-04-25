create index if not exists idx_course_run_roster_seat_enrollment
  on delivery.course_run_roster_seat(enrollment_id)
  where enrollment_id is not null;

drop policy if exists course_run_roster_sync_staff_select on delivery.course_run_roster_sync;
create policy course_run_roster_sync_staff_select on delivery.course_run_roster_sync
for select to authenticated
using (
  exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists course_run_roster_seat_staff_select on delivery.course_run_roster_seat;
create policy course_run_roster_seat_staff_select on delivery.course_run_roster_seat
for select to authenticated
using (
  exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);
