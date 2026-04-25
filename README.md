# Campus

Aplicacion web del nuevo Campus MetodologIA, preparada para despliegue como frontend estatico con Supabase remoto.

## Contenido del repositorio

- `campus-platform/`: nueva plataforma Astro + Lit para el roadmap M1-M3
- `campus-platform/supabase/`: migraciones, funciones, semilla y configuracion
  activa de Supabase para `campus-platform`
- `campus-v2/`: frontend vestigial de respaldo
- `specs/`: artefactos SDD versionados para la evolucion del producto
- `tools/jm-adk/`: framework operativo que gobierna la forma de trabajar en este repo
- `workspace/`: planes, bitacoras y artefactos locales de trabajo
- `mao-sdd/`: material adyacente; no forma parte del producto Campus por defecto
- `profiles/`: plantillas de runtime para Codex y Claude Desktop
- `contracts/`: limites de sincronizacion y superficies portables del repo
- `scripts/`: validaciones operativas del repo
- `tests/`: checks ligeros de contrato del repositorio

## Contratos de operacion

- `AGENTS.md`: contrato operativo de Codex para este repositorio
- `CLAUDE.md`: contrato de runtime de escritorio para este repositorio
- `tools/jm-adk/`: fuente de verdad metodologica y de gobernanza

## Despliegue

La superficie principal se documenta en [campus-platform/README.md](./campus-platform/README.md) y su despliegue remoto en [campus-platform/README-DEPLOY.md](./campus-platform/README-DEPLOY.md).
El backend activo sigue versionado en [campus-platform/supabase/README.md](./campus-platform/supabase/README.md).
El cierre entregable sin Stripe vive en [campus-platform/RELEASE-NO-STRIPE.md](./campus-platform/RELEASE-NO-STRIPE.md): declara GO para operacion no financiera y deja T-009/Stripe como unico NO-GO financiero.
La guia de [campus-v2/README-DEPLOY.md](./campus-v2/README-DEPLOY.md) se conserva solo como fallback/rollback del frontend legado.

## Variables de entorno

Usa estos archivos como base:

- `campus-platform/.env.example`
- `campus-platform/supabase/.env.functions.example`
- `campus-v2/.env.example`
- `campus-v2/.env.production.example`

## Limites importantes

- `campus-platform/` es la nueva superficie principal del producto.
- `campus-platform/supabase/` es el source of truth backend actual.
- `campus-v2/` se conserva como vestigio de respaldo, no como target primario
  de desarrollo.
- `campus-v2/supabase/` solo conserva una referencia de compatibilidad y posible
  estado local del CLI; no debe recibir net-new backend work.
- `specs/` contiene el source of truth versionado del workflow SDD.
- `workspace/` no es superficie de producto ni de despliegue.
- `tools/jm-adk/` no debe editarse salvo que la tarea sea actualizar el framework.

## Validacion operativa

- Windows: `powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Environment codex`
- Windows con respaldo legacy: `powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Environment codex -IncludeVestigialBackup`
- Windows cutover reversible: `powershell -ExecutionPolicy Bypass -File scripts/check-cutover-readiness.ps1 -IncludeQualityGates`
- Windows M1 live sin Stripe: `powershell -ExecutionPolicy Bypass -File scripts/smoke-m1-live-no-stripe.ps1 -ProjectRef exyewjzckgsesrsuqueh -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co`
- Windows FSRS/riesgo live sin Stripe: `powershell -ExecutionPolicy Bypass -File scripts/smoke-pedagogy-risk-live.ps1 -ProjectRef exyewjzckgsesrsuqueh -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co`
- Windows reporteria docente/Realtime live sin Stripe: `powershell -ExecutionPolicy Bypass -File scripts/smoke-teacher-reporting-live.ps1 -ProjectRef exyewjzckgsesrsuqueh -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co`
- POSIX: `JM_ENV_TARGET=codex sh scripts/doctor.sh`
- POSIX con respaldo legacy: `JM_ENV_TARGET=codex JM_INCLUDE_VESTIGIAL_BACKUP=1 sh scripts/doctor.sh`
