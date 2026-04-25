# Scripts

These scripts validate the repo-level runtime contract. They are intentionally
small and repo-specific.

## Entry points

- `doctor.ps1` / `doctor.sh`: default repo validation path centered on `campus-platform`
- `check-capabilities.ps1` / `check-capabilities.sh`: fast contract checks
- `prepare-platform-remote.ps1` / `prepare-platform-remote.sh`: printable runbook with exact commands for remote Supabase desde `campus-platform/supabase` + deploy de `campus-platform`
- `campus-platform/scripts/run-a11y.mjs`: package-local WCAG2AA gate used by `npm run test:a11y`
- `campus-platform/scripts/run-lhci.mjs`: package-local Lighthouse CI performance budget used by `npm run test:perf`
- `smoke-platform-live.ps1`: authenticated smoke for the live `campus-platform` + Supabase v3 journey on Windows
- `smoke-m1-live-no-stripe.ps1`: smoke live dedicado para M1 con Auth user desechable, portal, progreso, review/badge y asercion `checkout_intent=0`
- `smoke-pedagogy-risk-live.ps1`: smoke live dedicado para FSRS/riesgo con Auth user desechable, RLS sobre `learning.v_student_risk`, portal y asercion `checkout_intent=0`
- `smoke-teacher-reporting-live.ps1`: smoke live dedicado para reporteria docente/Realtime con docente + learner desechables, RLS staff, `teacher_reports` y asercion `checkout_intent=0`
- `supabase-platform.ps1` / `supabase-platform.sh`: wrapper repo-local para ejecutar el Supabase CLI instalado en `campus-platform` siempre desde `campus-platform/supabase`
- `check-enterprise-sso.ps1`: verifica readiness SAML/SSO del proyecto remoto, imprime metadata SP y puede fallar si se exige un proveedor real que aun no existe
- `check-oneroster-readiness.ps1`: verifica readiness OneRoster `G-07`, revisando manifest de cohorte, funcion desplegada, secretos y sync history sin disparar una sincronizacion live
- `check-notifications-readiness.ps1`: verifica readiness de notificaciones `G-13`, revisando schema, templates, funciones, secretos Resend/VAPID y dispatch history sin enviar mensajes
- `check-community-readiness.ps1`: verifica readiness de comunidad/peer-review `G-09`, revisando manifest de cohorte, vista publica, funciones LTI, endpoints mock/config y secretos LTI sin abrir launches reales
- `check-cutover-readiness.ps1`: verifica cutover reversible `campus-v2` -> `campus-platform`, construyendo la plataforma activa, revisando artefactos/rewrites y validando `campus-v2` solo como rollback previo
- `smoke-dsar-dedicated.ps1`: crea un usuario desechable dedicado, siembra huella v3, ejecuta `dsar-export` + `dsar-delete` y verifica archivado/redaccion antes de limpiar el Auth user

## Supabase CLI local

- Instala el CLI con `npm install` dentro de `campus-platform`.
- Desde la raiz del repo puedes ejecutar:
  - Windows: `& '.\\scripts\\supabase-platform.ps1' status`
  - POSIX: `sh scripts/supabase-platform.sh status`
- El comando `link` usa por defecto el project ref canonico `exyewjzckgsesrsuqueh`, salvo que pases `--project-ref` explicito o definas `CAMPUS_SUPABASE_PROJECT_REF`.

## Enterprise SSO / SAML

Para revisar `G-02` sin registrar un IdP falso:

```powershell
.\scripts\check-enterprise-sso.ps1 -ProjectRef exyewjzckgsesrsuqueh
```

Para exigir un proveedor real por dominio y obtener el snippet publico del
frontend:

```powershell
.\scripts\check-enterprise-sso.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ExpectedDomain cliente.com `
  -RequireProvider `
  -PrintFrontendEnv
```

## OneRoster G-07

Para revisar el estado remoto sin tocar matriculas ni contactar un SIS externo:

```powershell
.\scripts\check-oneroster-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -PrintActivationSql
```

Para exigir que el tenant live ya tenga manifest completo, secreto publicado y
funcion activa:

```powershell
.\scripts\check-oneroster-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -RequireLiveConfig
```

## Notifications G-13

Para revisar el estado remoto sin enviar emails ni web push:

```powershell
.\scripts\check-notifications-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -PrintActivationHints
```

Para exigir que los canales live ya tengan secrets y templates activos:

```powershell
.\scripts\check-notifications-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -RequireLiveChannels
```

## Community / peer-review G-09

Para revisar el estado remoto sin abrir launches reales ni registrar un tenant
externo falso:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -PrintActivationHints
```

Para exigir comunidad live con herramienta externa real:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -RequireLiveCommunity
```

## DSAR dedicated smoke

Para ejecutar un smoke destructivo acotado a un usuario generado por el script:

```powershell
.\scripts\smoke-dsar-dedicated.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co
```

El script obtiene llaves via Supabase CLI autenticado sin imprimir secretos,
crea un usuario `codex-dsar-smoke-*`, valida export/delete/export, comprueba
`identity.dsar_request` + `audit.event` y elimina el Auth user al final salvo
que se pase `-KeepAuthUser`.

## M1 no-Stripe smoke

Para validar el journey M1 live sin tocar checkout/Stripe:

```powershell
.\scripts\smoke-m1-live-no-stripe.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co
```

El script obtiene llaves via Supabase CLI autenticado sin imprimir secretos,
crea un usuario `codex-m1-smoke-*`, valida `run-open`, `ical-feed`, portal,
completa todos los bloques con `attempt-complete`, cubre entregas `project`,
verifica `next_review_at`, badge emitido + `verify-credential`, exige
`enrollment.checkout_intent=0` y elimina el Auth user al final salvo que se
pase `-KeepAuthUser`.

## FSRS risk smoke

Para validar riesgo pedagogico live sin tocar checkout/Stripe:

```powershell
.\scripts\smoke-pedagogy-risk-live.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co
```

El script obtiene llaves via Supabase CLI autenticado sin imprimir secretos,
crea un usuario `codex-risk-smoke-*`, valida que `learning.v_student_risk`
rechace `anon`, completa un bloque, fuerza un repaso vencido, confirma
`at-risk` + `Atencion requerida`, vuelve a correr `fsrs-schedule`, exige
`healthy` + `Ritmo saludable`, comprueba `enrollment.checkout_intent=0` y
elimina el Auth user al final salvo que se pase `-KeepAuthUser`.

## Teacher reporting Realtime smoke

Para validar reporteria docente y Realtime live sin tocar checkout/Stripe:

```powershell
.\scripts\smoke-teacher-reporting-live.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co
```

El script obtiene llaves via Supabase CLI autenticado sin imprimir secretos,
crea docente y learner `codex-teacher-report-smoke-*`, completa todos los
bloques con `attempt-complete`, valida `admin-catalog.teacher_reports`,
comprueba lectura staff por RLS en progreso, confirma 7 tablas en
`supabase_realtime`, exige `enrollment.checkout_intent=0` y elimina Auth users
y filas `identity.person` creadas por el propio script salvo que se pase
`-KeepAuthUsers`.

## Example

From a PowerShell session already opened at the repo root:

```powershell
& '.\scripts\smoke-platform-live.ps1' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co' `
  -PublishableKey 'TU_PUBLISHABLE_KEY' `
  -Email 'tu.usuario@example.com' `
  -Password 'tu-password' `
  -CompleteAllBlocks
```

## Legacy Backup Validation

- Windows: `powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Environment codex -IncludeVestigialBackup`
- POSIX: `JM_ENV_TARGET=codex JM_INCLUDE_VESTIGIAL_BACKUP=1 sh scripts/doctor.sh`

## Reversible Cutover Validation

- Windows rapido: `powershell -ExecutionPolicy Bypass -File scripts/check-cutover-readiness.ps1`
- Windows completo antes de publicar: `powershell -ExecutionPolicy Bypass -File scripts/check-cutover-readiness.ps1 -IncludeQualityGates -SiteUrl https://campus.metodologia.info`
- El check trata `campus-platform` como producto activo y `campus-v2` como version previa de rollback; no toca `campus-v2/supabase`.
