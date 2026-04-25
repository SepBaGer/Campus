# Campus Platform v3 - Technical Plan

## Arquitectura objetivo

- Frontend principal: `campus-platform/` con Astro + Lit.
- Backend: Supabase con bounded contexts `identity`, `catalog`, `delivery`, `enrollment`, `learning`, `credentials`.
- Integracion: Edge Functions como BFF y contratos de automatizacion.
- Legacy temporal: `campus-v2/` permanece operativa durante el strangler.

## Estrategia de migracion

1. Crear nuevo dominio y backfill desde `public`.
2. Exponer vistas publicas seguras para catalogo, portal y verificacion.
3. Construir la nueva app paralela contra esas vistas y funciones edge.
4. Mantener `campus-v2/` estable mientras el source of truth pasa al nuevo dominio.
5. Convergir checkout legacy al nuevo contrato `checkout-create`.

## Decisiones cerradas

- La plataforma nueva vive en carpeta paralela, no in-place.
- El nuevo dominio vive fuera de `public`; `public` queda para compatibilidad y proyecciones.
- Las vistas en `public` usan `security_invoker` para respetar RLS.
- La politica free/premium se modela en `enrollment.entitlement`.
- La emision de badges y el riesgo pedagogico se preparan desde M0 con tablas y funciones iniciales.

## Superficies tecnicas creadas en esta oleada

- `specs/campus-platform-v3/`
- `campus-platform/`
- nueva migracion Supabase de foundation v3
- nuevas Edge Functions: `checkout-create`, `run-open`, `ical-feed`, `xapi-emit`, `fsrs-schedule`, `credential-issue`, `verify-credential`, `dsar-export`, `dsar-delete`

## Riesgos controlados

- Exposicion de schemas custom: se evita dependencia inmediata via vistas `public.*`.
- Doble verdad prolongada: el nuevo dominio recibe backfill y sincronizacion desde `public.profiles`.
- Ruptura del legacy: la SPA actual no cambia su contrato funcional en esta oleada.
