# Campus Platform v3 - Task Breakdown

## Orden obligatorio

1. Dominio y datos
2. Adapters y proyecciones de compatibilidad
3. Nueva app publica
4. Portal estudiante
5. Backoffice
6. Interop y pagos
7. Inteligencia pedagogica
8. Retiro legacy

## Tareas activadas en esta oleada

- T-001: crear artefactos SDD versionados.
- T-002: crear `campus-platform/` con Astro + Lit y rutas canonicas base.
- T-003: crear migracion foundation para los 6 bounded contexts.
- T-004: crear vistas publicas seguras para catalogo, portal y verificacion.
- T-005: crear funciones edge iniciales para checkout, run-open, iCal, xAPI, credenciales, FSRS y DSAR.
- T-006: extender doctor y checks de contrato para ambas apps.

## Tareas siguientes

- T-007: conectar auth nueva y portal con datos reales.
- T-008: CRUD admin real para `course`, `course_run`, `content_block`.
- T-009: integrar pagos reales con Stripe y webhook convergente.
- T-010: cerrar reporteria docente y realtime. Estado: cerrado sin Stripe con `admin-catalog.teacher_reports`, RLS staff, `supabase_realtime` y `scripts/smoke-teacher-reporting-live.ps1`.
- T-011: cerrar credenciales verificables y riesgo pedagogico end-to-end. Estado: cerrado para badges + FSRS/riesgo live; queda separado de T-009/Stripe.

## Corte de release

- Release sin Stripe: documentado en `campus-platform/RELEASE-NO-STRIPE.md` con GO para operacion no financiera y NO-GO para checkout productivo, webhook Stripe convergente, reconciliacion financiera y payouts hasta cerrar T-009.
