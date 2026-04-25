-- platform v3 gamification streaks and leaderboard
-- Introduce learner-controlled leaderboard opt-in plus a materialized view
-- that projects streak and XP signals per active/completed cohort enrollment.

create table if not exists identity.person_gamification_preference (
  person_id uuid primary key references identity.person(id) on delete cascade,
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_identity_person_gamification_opt_in
  on identity.person_gamification_preference(leaderboard_opt_in, person_id);

grant select, insert, update on identity.person_gamification_preference to authenticated;

alter table identity.person_gamification_preference enable row level security;

drop trigger if exists tr_identity_person_gamification_preference_updated_at on identity.person_gamification_preference;
create trigger tr_identity_person_gamification_preference_updated_at
before update on identity.person_gamification_preference
for each row execute function private.touch_updated_at();

drop policy if exists gamification_preference_self_all on identity.person_gamification_preference;
create policy gamification_preference_self_all on identity.person_gamification_preference
for all to authenticated
using ((select auth.uid()) = person_id)
with check ((select auth.uid()) = person_id);

insert into identity.person_gamification_preference (
  person_id,
  leaderboard_opt_in
)
select
  person.id,
  false
from identity.person as person
on conflict (person_id) do nothing;

drop view if exists public.platform_course_leaderboard_v;
drop view if exists public.platform_portal_gamification_v;
drop trigger if exists tr_refresh_platform_gamification_mv_from_attempt on learning.attempt;
drop trigger if exists tr_refresh_platform_gamification_mv_from_enrollment on enrollment.enrollment;
drop function if exists private.refresh_platform_gamification_mv();
drop materialized view if exists private.platform_gamification_mv;

create materialized view private.platform_gamification_mv as
with enrolled as (
  select
    enrollment_row.person_id,
    enrollment_row.course_run_id,
    course_run.course_id
  from enrollment.enrollment as enrollment_row
  join delivery.course_run as course_run
    on course_run.id = enrollment_row.course_run_id
  where enrollment_row.status in ('active', 'completed')
),
attempt_rollup as (
  select
    enrolled.person_id,
    enrolled.course_run_id,
    count(distinct attempt.content_block_id)::integer as completed_attempts,
    coalesce(sum(attempt.xp_earned), 0)::integer as total_xp,
    max(timezone('America/Bogota', attempt.completed_at)::date) as last_activity_on
  from enrolled
  left join catalog.content_block as block
    on block.course_id = enrolled.course_id
  left join learning.attempt as attempt
    on attempt.person_id = enrolled.person_id
   and attempt.content_block_id = block.id
   and attempt.status in ('completed', 'reviewed')
  group by enrolled.person_id, enrolled.course_run_id
),
attempt_days as (
  select distinct
    enrolled.person_id,
    enrolled.course_run_id,
    timezone('America/Bogota', attempt.completed_at)::date as activity_on
  from enrolled
  join catalog.content_block as block
    on block.course_id = enrolled.course_id
  join learning.attempt as attempt
    on attempt.person_id = enrolled.person_id
   and attempt.content_block_id = block.id
   and attempt.status in ('completed', 'reviewed')
),
streak_groups as (
  select
    attempt_days.person_id,
    attempt_days.course_run_id,
    attempt_days.activity_on,
    attempt_days.activity_on
      - row_number() over (
          partition by attempt_days.person_id, attempt_days.course_run_id
          order by attempt_days.activity_on
        )::integer as streak_anchor
  from attempt_days
),
streak_spans as (
  select
    streak_groups.person_id,
    streak_groups.course_run_id,
    min(streak_groups.activity_on) as streak_start_on,
    max(streak_groups.activity_on) as streak_end_on,
    count(*)::integer as streak_days
  from streak_groups
  group by
    streak_groups.person_id,
    streak_groups.course_run_id,
    streak_groups.streak_anchor
),
streak_summary as (
  select
    enrolled.person_id,
    enrolled.course_run_id,
    coalesce(max(streak_spans.streak_days), 0)::integer as longest_streak_days,
    coalesce(
      max(streak_spans.streak_days) filter (
        where streak_spans.streak_end_on >= timezone('America/Bogota', now())::date - 1
      ),
      0
    )::integer as current_streak_days
  from enrolled
  left join streak_spans
    on streak_spans.person_id = enrolled.person_id
   and streak_spans.course_run_id = enrolled.course_run_id
  group by enrolled.person_id, enrolled.course_run_id
)
select
  enrolled.person_id,
  enrolled.course_run_id,
  coalesce(attempt_rollup.completed_attempts, 0) as completed_attempts,
  coalesce(attempt_rollup.total_xp, 0) as total_xp,
  coalesce(streak_summary.current_streak_days, 0) as current_streak_days,
  coalesce(streak_summary.longest_streak_days, 0) as longest_streak_days,
  attempt_rollup.last_activity_on,
  now() as refreshed_at
from enrolled
left join attempt_rollup
  on attempt_rollup.person_id = enrolled.person_id
 and attempt_rollup.course_run_id = enrolled.course_run_id
left join streak_summary
  on streak_summary.person_id = enrolled.person_id
 and streak_summary.course_run_id = enrolled.course_run_id;

create unique index idx_private_platform_gamification_mv_person_run
  on private.platform_gamification_mv(person_id, course_run_id);

create index idx_private_platform_gamification_mv_run_rank
  on private.platform_gamification_mv(
    course_run_id,
    total_xp desc,
    current_streak_days desc,
    longest_streak_days desc,
    last_activity_on desc
  );

create or replace function private.refresh_platform_gamification_mv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view private.platform_gamification_mv;
  return null;
end;
$$;

create trigger tr_refresh_platform_gamification_mv_from_attempt
after insert or update or delete or truncate on learning.attempt
for each statement execute function private.refresh_platform_gamification_mv();

create trigger tr_refresh_platform_gamification_mv_from_enrollment
after insert or update or delete or truncate on enrollment.enrollment
for each statement execute function private.refresh_platform_gamification_mv();

refresh materialized view private.platform_gamification_mv;

create view public.platform_portal_gamification_v as
with current_enrollment as (
  select
    enrollment_row.person_id,
    enrollment_row.course_run_id
  from enrollment.enrollment as enrollment_row
  where enrollment_row.person_id = (select auth.uid())
    and enrollment_row.status in ('active', 'completed')
  order by enrollment_row.updated_at desc, enrollment_row.created_at desc
  limit 1
),
leaderboard_rankings as (
  select
    metric.course_run_id,
    metric.person_id,
    dense_rank() over (
      partition by metric.course_run_id
      order by
        metric.total_xp desc,
        metric.current_streak_days desc,
        metric.longest_streak_days desc,
        metric.last_activity_on desc nulls last
    )::integer as rank_position,
    count(*) over (partition by metric.course_run_id)::integer as participant_count
  from private.platform_gamification_mv as metric
  join identity.person_gamification_preference as preference
    on preference.person_id = metric.person_id
   and preference.leaderboard_opt_in
)
select
  metric.person_id,
  metric.course_run_id,
  metric.completed_attempts,
  metric.total_xp,
  metric.current_streak_days,
  metric.longest_streak_days,
  metric.last_activity_on,
  coalesce(preference.leaderboard_opt_in, false) as leaderboard_opt_in,
  ranking.rank_position,
  coalesce(peer_counts.participant_count, 0) as participant_count,
  metric.refreshed_at
from current_enrollment
join private.platform_gamification_mv as metric
  on metric.person_id = current_enrollment.person_id
 and metric.course_run_id = current_enrollment.course_run_id
left join identity.person_gamification_preference as preference
  on preference.person_id = metric.person_id
left join leaderboard_rankings as ranking
  on ranking.person_id = metric.person_id
 and ranking.course_run_id = metric.course_run_id
left join (
  select
    leaderboard_rankings.course_run_id,
    max(leaderboard_rankings.participant_count)::integer as participant_count
  from leaderboard_rankings
  group by leaderboard_rankings.course_run_id
) as peer_counts
  on peer_counts.course_run_id = metric.course_run_id;

create view public.platform_course_leaderboard_v as
with current_enrollment as (
  select
    enrollment_row.person_id,
    enrollment_row.course_run_id
  from enrollment.enrollment as enrollment_row
  where enrollment_row.person_id = (select auth.uid())
    and enrollment_row.status in ('active', 'completed')
  order by enrollment_row.updated_at desc, enrollment_row.created_at desc
  limit 1
),
leaderboard_rankings as (
  select
    metric.course_run_id,
    metric.person_id,
    person.full_name as learner_name,
    metric.completed_attempts,
    metric.total_xp,
    metric.current_streak_days,
    metric.longest_streak_days,
    metric.last_activity_on,
    dense_rank() over (
      partition by metric.course_run_id
      order by
        metric.total_xp desc,
        metric.current_streak_days desc,
        metric.longest_streak_days desc,
        metric.last_activity_on desc nulls last
    )::integer as rank_position,
    count(*) over (partition by metric.course_run_id)::integer as participant_count
  from current_enrollment
  join private.platform_gamification_mv as metric
    on metric.course_run_id = current_enrollment.course_run_id
  join identity.person_gamification_preference as preference
    on preference.person_id = metric.person_id
   and preference.leaderboard_opt_in
  join identity.person as person
    on person.id = metric.person_id
)
select
  leaderboard_rankings.person_id,
  leaderboard_rankings.learner_name,
  leaderboard_rankings.completed_attempts,
  leaderboard_rankings.total_xp,
  leaderboard_rankings.current_streak_days,
  leaderboard_rankings.longest_streak_days,
  leaderboard_rankings.last_activity_on,
  leaderboard_rankings.rank_position,
  leaderboard_rankings.participant_count,
  leaderboard_rankings.person_id = (select auth.uid()) as is_current_learner
from leaderboard_rankings
order by
  leaderboard_rankings.rank_position,
  leaderboard_rankings.total_xp desc,
  leaderboard_rankings.current_streak_days desc,
  leaderboard_rankings.learner_name;

grant select on public.platform_portal_gamification_v to authenticated;
grant select on public.platform_course_leaderboard_v to authenticated;
