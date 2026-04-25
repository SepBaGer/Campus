# Notifications

This directory keeps operator-safe helpers for cohort notifications.

Campus sends sequenced notifications through the `cohort-notify` Edge Function
and stores every attempt in `delivery.notification_dispatch`. Learners manage
email/web opt-in through `notification-preferences`; web push subscriptions are
stored in `identity.web_push_subscription`.

Use the readiness check before trying a live send:

```powershell
.\scripts\check-notifications-readiness.ps1 -ProjectRef exyewjzckgsesrsuqueh -RunSlug power-skills-pilot-open -PrintActivationHints
```

Load real channel secrets through Supabase. Never store them in this directory:

```powershell
.\scripts\supabase-platform.ps1 secrets set RESEND_API_KEY="REDACTED_RESEND_API_KEY" --project-ref exyewjzckgsesrsuqueh
.\scripts\supabase-platform.ps1 secrets set VAPID_PUBLIC_KEY="REDACTED_VAPID_PUBLIC_KEY" VAPID_PRIVATE_KEY="REDACTED_VAPID_PRIVATE_KEY" VAPID_SUBJECT="mailto:campus@metodologia.info" --project-ref exyewjzckgsesrsuqueh
```

The strict live gate is:

```powershell
.\scripts\check-notifications-readiness.ps1 -ProjectRef exyewjzckgsesrsuqueh -RunSlug power-skills-pilot-open -RequireLiveChannels
```

After the first admin-triggered send, add `-RequireDispatchHistory` to verify
that `delivery.notification_dispatch` has persisted an auditable result.
