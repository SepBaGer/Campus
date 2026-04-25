# Campus Platform v3 - Spec

## Objetivo

Replataformizar Campus desde la SPA legacy `campus-v2/` hacia una plataforma estatica-first con Astro + Lit y Supabase, manteniendo continuidad operativa mientras el source of truth migra del esquema `public` al dominio `identity / catalog / delivery / enrollment / learning / credentials`.

## Epicas obligatorias

### M1 Foundation

- Descubrir catalogo y detalle del curso piloto.
- Autenticarse en la nueva plataforma.
- Matricularse o activar entitlement.
- Entrar al portal y consumir la primera leccion.
- Gestionar `course`, `course_run` y `content_block` desde backoffice minimo.

### M2 Interop

- Pagos idempotentes con convergencia desde `create-checkout` a `checkout-create`.
- xAPI/LRS interno.
- LTI 1.3 consumer.
- Publicacion docente medible en menos de 10 minutos.
- Realtime para progreso y operaciones docentes.

### M3 Pedagogy

- OpenBadges 3.0 verificables.
- FSRS y ritmo de repaso.
- Vista at-risk.
- Auditoria WCAG 2.2 AA.
- Go-live final y retiro del legacy.

## Journey canonico B2C

1. La persona aterriza en `/`.
2. Descubre el curso en `/catalogo`.
3. Revisa temario y cohortes en `/curso/[slug]`.
4. Activa acceso gratuito o premium segun entitlement.
5. Entra al portal `/portal`.
6. Completa la primera unidad y registra avance.

## Journey docente

1. El equipo docente crea o edita un `course`.
2. Abre un `course_run`.
3. Programa `session` y publica calendario.
4. Revisa avance, riesgo y credenciales emitidas.

## Gap matrix AS-IS -> TO-BE

| AS-IS legacy | TO-BE objetivo | Decision |
| --- | --- | --- |
| `public.profiles` | `identity.person`, `identity.person_role`, `identity.person_consent` | Migracion incremental con trigger de sincronizacion |
| `public.levels` | `catalog.track`, `catalog.course`, `catalog.content_block` | Reproyeccion del programa piloto |
| `public.lessons` | `catalog.content_block` | Backfill con `legacy_lesson_id` |
| `public.progress` | `learning.attempt`, `learning.mastery_state` | Backfill y nuevos eventos de aprendizaje |
| `public.events` | `delivery.session` | Backfill de calendario operativo |
| `membership_status/current_level` | `enrollment.entitlement` + `enrollment.enrollment` | `current_level` deja de ser fuente de gating |
| `comments/community` | Legacy no-core | Se mantienen fuera del dominio principal |

## Requisitos funcionales prioritarios

- FR-M1-01: catalogo publico navegable sin hash routing.
- FR-M1-02: detalle de curso con cohorte abierta y estructura de bloques.
- FR-M1-03: login y acceso por magic link/OIDC como destino final.
- FR-M1-04: portal estudiante con snapshot de progreso.
- FR-M1-05: admin minimo para `course`, `course_run`, `content_block`.
- FR-M2-01: checkout idempotente y conciliado.
- FR-M2-02: emision xAPI por consumo y publicacion.
- FR-M3-01: badge verificable y revocable.
- FR-M3-02: calculo de riesgo y proxima revision.

## Criterios de aceptacion macro

- H1: una persona puede pasar de matricula a primera leccion en un solo flujo.
- H2: pagos y entitlements quedan conciliados sin duplicidad.
- H3: las credenciales emitidas se verifican publicamente.
- H5: el docente publica una cohorte completa en menos de 10 minutos.
- H6: la plataforma conserva trazabilidad operativa durante el cutover.
