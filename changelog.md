# Changelog

## 2026-04-05 — [Alpha Release] Fase 07: Entrega Final

- **[T-020]** Edge Function `send-welcome` implementada con API real Resend + fallback mock Alpha-safe. Template HTML gold/navy. Trigger SQL `plpgsql` corregido y validado.
- **[T-021]** Suite de verificación SDD ejecutada: `ALL CHECKS PASSED`. Gate G1: PASS. 4 archivos `.feature` con hashes SHA-256 bloqueados.
- **[T-022]** Build de producción generado: 64 módulos, 272 KB JS (gzip 67 KB). `.htaccess` con `RewriteBase /campus/` listo para Hostinger.
- **[SDD]** Reproceso completo de Fases 00-07 capitalizado. 14 FR trazados al plan técnico. 22 tareas registradas en pipeline.

## 2026-04-04

- **[decision]**: Constitución ampliada de 8 a 12 principios tras Debate Socrático — agregados IX (Knowledge Graph), X (Logs), XI (DoD), XII (Evidence Tags) [DEC-001] [Principles I-XII]
- **[decision]**: 17 premisas documentadas; 5 pendientes de validación (29.4% < 30% threshold) — pipeline no bloqueado [DEC-002] [Principle XII]
- **[completion]**: SDD Phase 0 (Constitution) v2.0 completada — 12 principios, Evidence Tags, DoD por fase [Principle XI]
- **[completion]**: SDD Phase 1 (Specify) completada — 14 FR, 10 NFR, 12 US, 14 SC para feature `campus-replatform` [Principle IV]
- **[completion]**: ALM Command Center desplegado — 13 páginas HTML en `.specify/` [Principle X]
- **[discovery]**: Gap en constitución: 5 requisitos SDD no cubiertos por principios originales del PRD [Principle IX]
- [insight]: Assumption rate 29.4% permite proceder pero Frente 4 (ETL) bloqueado en P-06 y P-10 [Principle XII]
- **[completion]**: SDD Phase 2 (Plan) completada — Especificaciones técnicas, Data Model, API Contracts generados.
- **[completion]**: Gate G1 superada (100% FR mapped, Architecture + Data Model OK).
- **[completion]**: SDD Phase 3 (Checklist) completada — Checklist de análisis BDD y casos borde generado.
- **[completion]**: SDD Phase 4 (Testify) completada — 9 BDD Scenarios (Gherkin) mapeados a todos los FR críticos y caclulados assertion-hashes para Gate G3.
- **[completion]**: SDD Phase 5 (Tasks) completada — Desglose de 22 tareas atómicas con dependencias y estimaciones distribuidas en los 4 frentes de desarrollo.
- **[completion]**: SDD Phase 2 (Technical Spec) finalizada — `/specify` consolidada con contratos de API detallados y matriz de componentes [Gate G1 Re-verified] [Principle XI]
