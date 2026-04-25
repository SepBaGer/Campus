-- G-PERF: close non-Stripe Supabase Performance Advisor RLS warnings.
-- Wrap stable auth helpers in scalar selects so Postgres can cache them per statement,
-- and consolidate overlapping permissive SELECT policies in identity tables.

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Own progress select" on public.progress;
create policy "Own progress select"
on public.progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Own progress insert" on public.progress;
create policy "Own progress insert"
on public.progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Insert own comments" on public.comments;
create policy "Insert own comments"
on public.comments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users read only accessible lessons" on public.lessons;
create policy "Users read only accessible lessons"
on public.lessons
for select
to authenticated
using (public.can_access_lesson(level_id, is_free, (select auth.uid())));

drop policy if exists "Authenticated users read events" on public.events;
create policy "Authenticated users read events"
on public.events
for select
to authenticated
using (true);

drop policy if exists dsar_request_self_select on identity.dsar_request;
drop policy if exists dsar_request_staff_select on identity.dsar_request;
drop policy if exists dsar_request_authenticated_select on identity.dsar_request;
create policy dsar_request_authenticated_select
on identity.dsar_request
for select
to authenticated
using (
  ((select auth.uid()) = person_id)
  or exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code = any (array['teacher'::text, 'admin'::text, 'owner'::text])
  )
);

drop policy if exists person_consent_self_write on identity.person_consent;
drop policy if exists person_consent_self_select on identity.person_consent;
drop policy if exists person_consent_self_insert on identity.person_consent;
drop policy if exists person_consent_self_update on identity.person_consent;
drop policy if exists person_consent_self_delete on identity.person_consent;

create policy person_consent_self_select
on identity.person_consent
for select
to authenticated
using ((select auth.uid()) = person_id);

create policy person_consent_self_insert
on identity.person_consent
for insert
to authenticated
with check ((select auth.uid()) = person_id);

create policy person_consent_self_update
on identity.person_consent
for update
to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

create policy person_consent_self_delete
on identity.person_consent
for delete
to authenticated
using ((select auth.uid()) = person_id);
