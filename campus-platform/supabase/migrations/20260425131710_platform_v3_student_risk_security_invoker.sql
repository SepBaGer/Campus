create or replace view learning.v_student_risk
with (security_invoker = true) as
select
  schedule.person_id,
  count(*) filter (
    where schedule.next_review_at is not null
      and schedule.next_review_at < now()
  )::integer as overdue_reviews,
  min(schedule.next_review_at) filter (
    where schedule.next_review_at is not null
  ) as next_review_at,
  case
    when count(*) filter (
      where schedule.next_review_at is not null
        and schedule.next_review_at < now()
    ) > 0 then 'at-risk'
    else 'healthy'
  end as risk_label
from learning.spaced_schedule as schedule
group by schedule.person_id;

comment on view learning.v_student_risk is
  'Authenticated student risk projection over learning.spaced_schedule; security_invoker keeps RLS enforced for Data API callers.';

revoke all on learning.v_student_risk from anon;
grant select on learning.v_student_risk to authenticated;
grant select on learning.v_student_risk to service_role;
