# Constitución — Campus MetodologIA v2

> Principios de gobernanza del proyecto · v2.0
> Derivados del PRD v1 + Debate Socrático 2026-04-04
> Referencia: DEC-001 (Ampliación a 12 principios)

---

## Principio I — Continuidad Visual (Identidad)

El Campus v2 es **visualmente indistinguible** del Campus actual. Los tokens de diseño gold (#FFD700), navy (#122562 / #020617), glassmorphism (blur(16px) saturate(180%)), y las tipografías (Poppins, Montserrat, Inter) son **inmutables**. Cualquier cambio visual MUST pasar por validación de paridad contra el Campus v1.

**Implicaciones:**
- El design system CSS (~136KB) se porta a variables nativas CSS con Vite bundling
- Los Web Components (`SiteHeader.js`, `SiteFooter.js`) del repo corporativo se reutilizan sin modificación de estilo
- MUST NOT introducir verde como color de éxito; se usa Blue (#137DC5) según marca MetodologIA

---

## Principio II — Progreso Siempre Visible

En **cualquier pantalla** del Campus, el usuario conoce su posición: nivel actual, porcentaje de avance, lecciones completadas, XP total. El progreso **MUST NOT desaparecer** de la interfaz.

**Implicaciones:**
- La topbar/sidebar contiene un indicador persistente de nivel + XP
- El store.js mantiene un cache local del progreso sincronizado con Supabase
- La home muestra los 10 niveles con progreso visual por nivel

---

## Principio III — Backend como Fuente de Verdad

La lógica de negocio (auth, gating, XP, membresía) vive en **Supabase**. El frontend es un "cliente tonto" — MUST NOT tomar decisiones de acceso. La seguridad se implementa vía RLS (Row Level Security) y JWT, NEVER vía ocultamiento en JavaScript.

**Implicaciones:**
- Supabase controla qué lecciones ve cada usuario a nivel de query
- El router.js implementa guards como UX, no como seguridad real
- Los webhooks de Stripe actualizan membresía server-side
- Edge Functions manejan lógica que no puede estar en el cliente
- Cualquier CMS headless futuro MUST usar Supabase como backend — MUST NOT inyectar auth propia

---

## Principio IV — Editorial-First (Sin Deploy para Publicar)

Cualquier cambio de contenido (texto, video, estructura de módulo) es posible **sin deploy de código**. El contenido vive en la base de datos, no en archivos estáticos.

**Implicaciones:**
- Las lecciones se almacenan en tablas de Supabase, no en JSON estáticos
- El Supabase Dashboard sirve como CMS mínimo viable
- Un futuro CMS headless puede conectarse sin cambiar el frontend (sujeto a Principio III)

---

## Principio V — Un Solo Login

Auth unificada entre `metodologia.info` y el Campus. **Sin redirecciones entre subdominios** para autenticar. El token JWT es compartido.

**Implicaciones:**
- Supabase Auth maneja registro, login, recuperación de contraseña
- El Campus vive en `/campus/` dentro de `metodologia.info` (no en subdominio separado)
- El JWT se almacena en localStorage compartido por todo el dominio

---

## Principio VI — Cero Deuda Activa en Release

Ningún bloque de debug, código comentado innecesario, ni funcionalidad rota llega a producción. El pipeline SDD con gates mandatorias (G1, G2, G3) **detiene el trabajo** si hay violaciones.

**Implicaciones:**
- Cada feature pasa por BDD analysis, testificación y verificación antes de merge
- El sentinel monitorea artefactos obsoletos y archivos faltantes
- No hay "technical debt parking" — se resuelve o se documenta como decisión explícita en `decision-log.md`

---

## Principio VII — Atomicidad Multi-Agente

El desarrollo se organiza en **4 frentes independientes** que pueden avanzar en paralelo sin bloqueos:

1. **Infra & Seguridad** — Supabase (SQL, RLS, Auth, Edge Functions, Webhooks)
2. **Frontend Core & Router** — Vite, Router Guards, Supabase JS Client, Store
3. **UX & Visual Parity** — CSS, Web Components, micro-interacciones, responsive
4. **Migración & ETL** — Scripts de extracción WP → JSON → Supabase seeder

**Implicaciones:**
- Cada frente tiene su propio feature spec en `specs/`
- Las dependencias entre frentes se documentan explícitamente en tasks.md
- El dashboard ALM visualiza el avance de cada frente
- `context.json` y el Knowledge Graph son los mecanismos de sincronización entre frentes
- Cualquier decisión compartida MUST registrarse en `decision-log.md`

---

## Principio VIII — Performance como Requisito

LCP < 2.5s en 4G. Responsive desde 375px. Target: ~1000 estudiantes concurrentes [ASSUMPTION]. El Campus es una SPA Vite optimizada con code splitting, lazy loading y caching agresivo.

**Implicaciones:**
- `vite.config.js` con `base: '/campus/'` y optimización de chunks
- Imágenes optimizadas (WebP/AVIF)
- CSS tree-shaking desde el design system portado

---

## Principio IX — Generación Recursiva de Conocimiento (NON-NEGOTIABLE)

*Agregado por Debate Socrático DEC-001*

Todo agente que trabaje en el proyecto MUST contribuir al **Knowledge Graph** del proyecto. Cada artefacto generado alimenta la trazabilidad bidireccional (Principios → FR → TS → Tasks). Los metadatos generados se reintroducen recursivamente en el contexto del proyecto (NotebookLM / Gemini).

**Implicaciones:**
- Cada feature spec genera nodos FR-NNN en el grafo
- Cada test genera nodos TS-NNN vinculados a FRs
- Cada tarea genera nodos T-NNN vinculados a FRs y TSs
- El grafo se regenera (`/sdd:graph`) después de cada fase
- Los huérfanos (FR sin test, Task sin FR) se reportan como hallazgos del sentinel
- Los artefactos del proyecto se reintroducen recursivamente en la base de conocimiento del sistema

---

## Principio X — Operaciones y Logs Vivientes

*Agregado por Debate Socrático DEC-001*

El proyecto MUST mantener **4 logs operativos** como documentos vivos:

| Log | Ubicación | Propósito |
|-----|-----------|-----------|
| `tasklog.md` | Raíz del proyecto | Items de trabajo abiertos |
| `changelog.md` | Raíz del proyecto | Decisiones y completaciones |
| `decision-log.md` | Raíz del proyecto | Decisiones socráticas (DEC-NNN) |
| `session-log.json` | `.specify/` | Eventos automáticos de sesión |

**Implicaciones:**
- Todo debate socrático se registra como DEC-NNN
- Toda fase completada genera entrada en changelog
- Cada sesión inicia leyendo logs y termina actualizándolos

---

## Principio XI — Definition of Done Explícita

*Agregado por Debate Socrático DEC-001*

Cada fase del pipeline SDD tiene un DoD verificable heredado del framework. Un artefacto MUST NOT considerarse completo si no satisface su DoD.

| Fase | Done When |
|------|-----------|
| Constitution | Principios definidos, Evidence Tags policy, DoD declared |
| User Specs | FR-NNN, US-NNN, SC-NNN definidos. <30% `[ASSUMPTION]` |
| Technical Specs | Data model, API contracts, component list. Gate G1 passed |
| BDD Analysis | Checklist 100% checked |
| Test | Gherkin generado. Hash-locked. Todo FR tiene ≥1 TS |
| Task | T-NNN ordenados por dependencia. Parallel markers. Estimates |
| Organize Plan | Cross-artifact score ≥95%. Gate G2 passed |
| Deliver | Tests green. Zero regressions. Gate G3 passed |
| Ship | Issues exported. Deployed. Changelog updated |

---

## Principio XII — Evidencia Etiquetada

*Agregado por Debate Socrático DEC-001*

Toda afirmación en artefactos del proyecto MUST usar tags de evidencia:

| Tag | Significado |
|-----|-------------|
| `[CODE]` | Verificado en código fuente |
| `[CONFIG]` | Verificado en archivos de configuración |
| `[DOC]` | Verificado en documentación |
| `[INFERENCE]` | Deducción lógica desde evidencia |
| `[ASSUMPTION]` | No verificado — requiere validación |

**Regla de bloqueo:** Si >30% de un entregable es `[ASSUMPTION]`, el pipeline se detiene para clarificación antes de avanzar.

---

## Stack Tecnológico Decidido

| Capa | Tecnología | Decisión | Evidence |
|------|-----------|----------|----------|
| Frontend | Vite + Vanilla JS (SPA) | ✅ Confirmado | `[CODE]` |
| Backend | Supabase (PostgreSQL + RLS + Auth + Edge Functions) | ✅ Confirmado | `[DOC]` |
| Hosting | Hostinger — `metodologia.info/campus/` | ✅ Confirmado | `[CODE]` `[CONFIG]` |
| Pagos | Stripe → Webhooks → Supabase | ✅ Confirmado | `[ASSUMPTION]` |
| Video | [PENDIENTE] Vimeo / Mux / YouTube privado | 🟡 Por decidir | — |
| Comunidad | [PENDIENTE] Discord / Circle / Custom | 🟡 Por decidir | — |
| Email | Supabase + Resend (sugerido) | 🟡 Por decidir | `[INFERENCE]` |

---

## Usuarios Objetivo

| Segmento | JTBD |
|----------|------|
| Estudiante activo | Saber exactamente en qué nivel estoy y qué lección sigue |
| Estudiante nuevo | Entender la ruta completa en < 2 minutos |
| Fundador / PM | Actualizar contenido sin tocar código PHP |
| Estudiante social | Verme en el ranking y conectar con otros |

---

*Campus MetodologIA v2 · Constitution v2.0 · SDD v3.5*
*Derivada del PRD v1 + Debate Socrático (DEC-001) · 2026-04-04*
*12 principios · 3 quality gates · 4 logs operativos*
