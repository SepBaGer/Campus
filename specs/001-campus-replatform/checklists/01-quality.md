# Checklist de Análisis BDD — Campus MetodologIA v2

> Feature: campus-replatform · Fase 3 · SDD v3.5
> Gate G1: ✅ PASSED (Alineación FR→Plan: 100% mapeado, Data Model: OK, Architecture: OK)

---

## Calidad y Completitud de Requisitos

- [x] **CQ-01**: ¿Existen requisitos funcionales claros para todos los User Stories críticos?
  > Sí. 14 FR mapean directamente a los 12 US.
- [x] **CQ-02**: ¿Están cubiertos los flujos de "Unhappy Path" en los escenarios?
  > Requiere BDD scenarios en la próxima fase. Por ahora, los guards de router y RLS están especificados.
- [x] **CQ-03**: ¿Hay métricas de éxito (SC) cuantificables?
  > Sí, 14 Criterios de Éxito definidos.
- [x] **CQ-04**: ¿La regla de < 30% `[ASSUMPTION]` se cumple?
  > Sí, la tasa es del 29.4%.

---

## Validación de Requisitos No Funcionales (NFRs)

- [x] **NFR-01 (Performance)**: LCP < 2.5s. ¿Está previsto en el plan técnico?
  > Sí, Vite code splitting y static hosting en Hostinger garantizan esto.
- [x] **NFR-02 (Escalabilidad)**: 1000 estudiantes concurrentes.
  > Target definido, dependerá del tier y configuración de Supabase.
- [x] **NFR-03 (Seguridad)**: Auth unificada, JWT.
  > Contemplado en la arquitectura; Stripe webhook firmado.

---

## Análisis de Casos Borde (Edge Cases a testear en P4)

1. **Pagos:** ¿Qué pasa si el webhook de Stripe se retrasa y el estudiante intenta acceder a la lección de pago?
2. **Offline/Caching:** ¿Qué nivel de progreso se almacena localmente si falla la conexión con Supabase?
3. **Roles:** Usuario admin (fundador) contra usuario estudiante standard en la misma base de datos.
4. **Navegación Hash:** Recargas directas sobre URLs como `#/aula/5`, ¿procesan bien el guard del router?

---

*Phase 3 - Checklist generado. Listo para proceder a generación de escenarios Gherkin (Phase 4: Test).*
