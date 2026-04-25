# Campus Platform v3 - Analysis

## Tensiones cerradas

### Legacy -> nuevo dominio

La migracion foundation usa backfill y sincronizacion desde `public.profiles` para poblar `identity.person` y `enrollment.entitlement`. `levels`, `lessons`, `progress` y `events` se reproyectan al nuevo dominio del curso piloto.

### Free/premium -> enrollment

La politica queda simplificada asi:

- toda persona sincronizada recibe `free-access`
- una `membership_status = active` agrega `premium-membership`
- el gating del contenido queda definido por `is_public` del bloque o por existencia de entitlement premium

### Convivencia `campus-v2` + `campus-platform`

`campus-v2` conserva rutas hash y build estable.
`campus-platform` nace como nueva superficie primaria.
Las dos comparten el mismo backend, pero el dominio nuevo pasa a ser la direccion de evolucion.

## Decision de implementacion

La presente oleada implementa M0 real y una base material de M1. No pretende cerrar M2/M3 de forma productiva en una sola pasada, pero deja el repositorio alineado para continuar sin rediseñar las bases.
