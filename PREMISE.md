# Premisas — Campus MetodologIA v2

> Premisas fundacionales del proyecto · Derivadas del Debate Socrático 2026-04-04
> Referencia: DEC-002

---

## Premisas Técnicas (Validadas)

| # | Premisa | Evidence |
|---|---------|----------|
| P-01 | WordPress ya no es viable como plataforma del Campus — deuda técnica documentada: debug en producción, CSS sin build, acoplamiento a MasterStudy | `[DOC]` `[CODE]` |
| P-02 | El sitio `metodologia.info` es estático (HTML/TailwindCSS/Apache) sin auth ni backend | `[CODE]` |
| P-03 | Supabase puede manejar auth, RLS y Edge Functions para el Campus con ~1000 concurrentes | `[DOC]` `[INFERENCE]` |
| P-04 | Vite genera SPA deployable como subcarpeta estática (`/campus/`). Proyecto `Campus_MetodologIA` ya existe con router hash-based y store con 14 módulos | `[CODE]` `[DOC]` |
| P-05 | Los Web Components del sitio corporativo (`SiteHeader.js`, `SiteFooter.js`) son Custom Elements estándar reutilizables sin dependencias | `[CODE]` |
| P-08 | El CSP del sitio destino (`connect-src: api.metodologia.info`) indica que ya se planificó una API | `[CODE]` `[INFERENCE]` |

## Premisas de Negocio (Validadas)

| # | Premisa | Evidence |
|---|---------|----------|
| P-12 | La identidad visual (gold #FFD700, navy #020617, glassmorphism) NO se rediseña | `[DOC]` |
| P-13 | El desarrollo se ejecuta primariamente por agentes AI (Pristino/Antigravity/Opus) con supervisión humana | `[DOC]` |
| P-14 | El pipeline SDD (9 fases + 3 gates) gobierna todo el ciclo de desarrollo | `[DOC]` |
| P-16 | El Knowledge Graph del proyecto se alimenta recursivamente con metadatos generados en cada fase | `[DOC]` |
| P-17 | NotebookLM / Gemini sirve como base de conocimiento del sistema donde los artefactos se reintroducen recursivamente | `[DOC]` |

---

## Premisas Pendientes de Validación

> ⚠️ **Assumption Rate: 29.4% (5/17) — bajo threshold 30%.** Pipeline NO bloqueado.

| # | Premisa | Evidence | Riesgo | Acción Requerida | Responsable |
|---|---------|----------|--------|-----------------|-------------|
| P-06 | El contenido de MasterStudy (lecciones, niveles) es exportable vía dump de DB o API | `[ASSUMPTION]` | 🔴 ALTO | Auditar schema de DB WP, intentar export | Frente 4: ETL |
| P-07 | Hostinger soporta deploy de SPA como subcarpeta de sitio estático existente | `[INFERENCE]` | 🟡 MEDIO | Test de deploy real en subcarpeta | Frente 2: Frontend |
| P-09 | El Campus debe soportar ~1000 estudiantes concurrentes | `[ASSUMPTION]` | 🟡 MEDIO | Confirmar si es target v1 o futuro | Stakeholder |
| P-10 | Los estudiantes actuales del Campus WP pueden ser migrados sin pérdida de progreso | `[ASSUMPTION]` | 🔴 ALTO | Mapear tabla `wp_users` → schema Supabase | Frente 4: ETL |
| P-11 | Stripe es el gateway de pagos elegido | `[ASSUMPTION]` | 🟢 BAJO | Confirmar con equipo de finanzas | Stakeholder |

---

## Modelo de Dominio Premisado

```
Dominio: Campus de Aprendizaje Gamificado
├── 10 Niveles de Maestría (progresivos, con colores semánticos)
├── N Lecciones por nivel (texto, video, PDF)
├── Progreso por usuario (XP, nivel actual, % avance)
├── Membresía (planes de pago, acceso gated)
├── Ranking (leaderboard por XP)
├── Calendario (eventos y sesiones)
└── Comunidad (integración externa)

Stack de Ejecución:
├── Frontend: Vite + Vanilla JS (SPA hash-routing)
├── Backend: Supabase (PostgreSQL + RLS + Auth)
├── Hosting: Hostinger (metodologia.info/campus/)
├── Pagos: Stripe → Webhooks → Supabase
└── Desarrollo: SDD v3.5 con agentes AI
```

---

## Referencia Cruzada: PRD v1

El PRD v1 completo (33KB, 497 líneas) está preservado además como fuente primaria en el mismo archivo. Las premisas de arriba son una **destilación clasificada por evidencia** del PRD, no un reemplazo.

### Secciones del PRD incorporadas:
- §2 Resumen ejecutivo → P-01, P-02
- §3 Inventario del Campus → P-01, P-04, P-06
- §4 Hallazgos del sitio destino → P-02, P-05, P-07, P-08
- §5 Gap Analysis → P-03, P-09, P-10, P-11, P-12
- §6.4 JTBD → Usuarios Objetivo (en CONSTITUTION.md)
- §8 Plan Multi-Agente → P-13, P-14, P-15

---

*Campus MetodologIA v2 · Premisas · SDD v3.5*
*Debate Socrático DEC-002 · 2026-04-04*
*12 validadas · 5 pendientes · Threshold: 29.4% < 30% ✅*
