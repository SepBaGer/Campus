-- platform v3 gamification view invoker hardening
-- Replace public security-definer views with security-invoker views backed by
-- private security-definer functions, keeping the materialized view private
-- while removing the public lint error for SECURITY DEFINER views.

grant usage on schema private to authenticated;

create or replace function private.get_platform_portal_gamification()
returns table (
  person_id uuid,
  course_run_id bigint,
  completed_attempts integer,
  total_xp integer,
  current_streak_days integer,
  longest_streak_days integer,
  last_activity_on date,
  leaderboard_opt_in boolean,
  rank_position integer,
  participant_count integer,
  refreshed_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
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
$$;

create or replace function private.get_platform_course_leaderboard()
returns table (
  person_id uuid,
  learner_name text,
  completed_attempts integer,
  total_xp integer,
  current_streak_days integer,
  longest_streak_days integer,
  last_activity_on date,
  rank_position integer,
  participant_count integer,
  is_current_learner boolean
)
language sql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function private.get_platform_portal_gamification() to authenticated;
grant execute on function private.get_platform_course_leaderboard() to authenticated;

create or replace view public.platform_portal_gamification_v
with (security_invoker = true) as
select * from private.get_platform_portal_gamification();

create or replace view public.platform_course_leaderboard_v
with (security_invoker = true) as
select * from private.get_platform_course_leaderboard();

grant select on public.platform_portal_gamification_v to authenticated;
grant select on public.platform_course_leaderboard_v to authenticated;
