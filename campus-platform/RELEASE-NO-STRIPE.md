# Campus Platform - Release sin Stripe

Fecha de corte: 2026-04-25

## Estado

Este release deja `campus-platform` entregable para operacion no financiera:
sitio publico, acceso, portal, progreso, revision, badges, DSAR,
reporteria docente, Realtime, observabilidad, accesibilidad, performance y
cutover reversible. [CODE][CONFIG]

El release no habilita cobro real, checkout productivo, conciliacion de pagos
ni payouts docentes. Todo eso queda aislado en T-009/Stripe. [DOC][INFERENCE]

## Alcance incluido

- `campus-platform/` es la superficie activa; `campus-v2/` queda solo como
  version previa de rollback. [DOC]
- Auth nueva, portal estudiante y journey M1 live sin checkout estan cubiertos
  por `scripts/smoke-m1-live-no-stripe.ps1`. [CODE]
- Backoffice, authoring, rubricas, entregas manuales, revision y badge
  verificable operan sin depender de checkout. [CODE]
- DSAR export/delete, consentimientos, auditoria y limpieza de usuarios
  desechables tienen smoke dedicado. [CODE]
- FSRS/riesgo pedagogico esta endurecido con `security_invoker` y smoke live
  `healthy -> at-risk -> healthy` sin `checkout_intent`. [CODE][CONFIG]
- Reporteria docente y Realtime de progreso estan cerrados con
  `admin-catalog.teacher_reports`, RLS self/staff consolidado y 7 tablas en
  `supabase_realtime`. La referencia operacional es Supabase Realtime Postgres
  Changes: https://supabase.com/docs/guides/realtime/postgres-changes [DOC]
- A11y, Lighthouse CI, RUM Core Web Vitals y Performance Advisor remoto estan
  cubiertos como gates operativos no-Stripe. [CODE][CONFIG]

## Exclusion explicita: T-009 / Stripe

T-009 queda fuera de este release. No se debe vender como produccion financiera
hasta cerrar al menos estos puntos: [DOC][INFERENCE]

- Checkout idempotente integrado a produccion.
- Secretos live de Stripe validados en Supabase Functions.
- Webhook Stripe convergente validado con eventos live/sandbox controlados.
- Reconciliacion de `enrollment.checkout_intent` y `payment_allocation`.
- Revenue share automatico o procedimiento firmado de settlement.

Los smokes de este release exigen `checkout_intent=0` para demostrar que el
carril no financiero no crea deuda de pagos ni activa Stripe de forma lateral.
[CODE][CONFIG]

## Readiness

Resultado: GO para piloto y operacion no financiera; NO-GO para cobro real.
[INFERENCE]

Evidencia remota principal:

- `scripts/smoke-m1-live-no-stripe.ps1`: journey acceso -> portal -> progreso
  -> revision/badge con `checkout_intent=0`. [CONFIG]
- `scripts/smoke-pedagogy-risk-live.ps1`: riesgo pedagogico y FSRS sin
  checkout. [CONFIG]
- `scripts/smoke-teacher-reporting-live.ps1`: `supabase_realtime` con 7 tablas,
  RLS staff operativo, `completion_percent=100`, `badges_issued=2` y
  `checkout_intent=0`. [CONFIG]
- Supabase Performance Advisors: `No issues found`. [CONFIG]
- Supabase Security Advisors: solo queda `auth_leaked_password_protection`, que
  depende de configuracion/plan del proyecto y no del codigo del release. [CONFIG]

Gates locales finales:

```powershell
python -m unittest discover -s tests
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-capabilities.ps1 -Environment codex
npm --prefix campus-platform run test
npm --prefix campus-platform run test:a11y
npm --prefix campus-platform run test:perf
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1 -Environment codex
git diff --check
npm --prefix campus-platform audit --audit-level=high
```

## Condiciones de operacion

- Para publicar el frontend, correr `scripts/check-cutover-readiness.ps1
  -IncludeQualityGates` y mantener `campus-v2` solo como rollback vestigial.
  [CODE]
- Para anunciar Realtime docente, mantener en la publicacion
  `supabase_realtime` las tablas de progreso versionadas por la migracion
  `20260425134314_platform_v3_teacher_reporting_realtime.sql`. [CONFIG][DOC]
- Para activar notificaciones live, publicar secretos `RESEND_API_KEY` y
  `VAPID_*`; sin ellos el release conserva readiness, no envio real. [CONFIG]
- Para activar OneRoster/Comunidad contra proveedores externos, cambiar los
  manifests desde modo sandbox/mock a configuracion live y rerunear sus checks
  con flags `-RequireLiveConfig` / `-RequireLiveCommunity`. [CONFIG]
- Para cerrar el warning de seguridad restante, activar leaked password
  protection/HIBP cuando el plan Supabase lo permita. [CONFIG]

## Decision

Se puede entregar como release no-Stripe con T-009 excluido y visible. El primer
release financiero debe partir de este corte, no modificar sus smokes no-Stripe,
y agregar un gate nuevo que valide checkout/webhook/reconciliacion sin romper
`checkout_intent=0` en los smokes no financieros. [INFERENCE]
