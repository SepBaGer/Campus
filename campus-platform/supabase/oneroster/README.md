# OneRoster 1.2

This directory keeps operator-safe helpers for the Campus OneRoster consumer.

Campus acts as a OneRoster 1.2 pull consumer per `delivery.course_run`. The
sync reads enrollments and users from the customer SIS, stages every seat in
`delivery.course_run_roster_seat`, and only changes Campus identity/enrollment
records through the deployed `oneroster-sync` Edge Function.

Use the readiness check before enabling a live tenant:

```powershell
.\scripts\check-oneroster-readiness.ps1 -ProjectRef exyewjzckgsesrsuqueh -RunSlug power-skills-pilot-open -PrintActivationSql
```

Load the real bearer token as a Supabase secret. Never store it in this
directory:

```powershell
.\scripts\supabase-platform.ps1 secrets set ONEROSTER_POWER_SKILLS_TOKEN="REDACTED_REAL_BEARER_TOKEN" --project-ref exyewjzckgsesrsuqueh
```

Then update the course run manifest from `manifest.enterprise.example.json`
through the admin UI or a reviewed SQL update. Keep `provision_mode` as
`match_only` until the customer explicitly approves invite-based provisioning.

The strict live gate is:

```powershell
.\scripts\check-oneroster-readiness.ps1 -ProjectRef exyewjzckgsesrsuqueh -RunSlug power-skills-pilot-open -RequireLiveConfig
```

After a first real sync, add `-RequireSyncHistory` to verify that at least one
remote run was audited.
