-- platform v3 notification policy consolidation
-- Collapse overlapping permissive RLS policies introduced by the cohort
-- notification slice so Advisors stops flagging duplicate SELECT evaluation.

drop policy if exists notification_template_staff_select on delivery.notification_template;
drop policy if exists notification_template_staff_write on delivery.notification_template;

create policy notification_template_staff_all on delivery.notification_template
for all to authenticated
using (
  exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
)
with check (
  exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists notification_dispatch_self_select on delivery.notification_dispatch;
drop policy if exists notification_dispatch_staff_select on delivery.notification_dispatch;

create policy notification_dispatch_reader_select on delivery.notification_dispatch
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
