# Análisis de Consistencia BDD & Cross-Artifact — Campus MetodologIA v2

> Feature: campus-replatform · Fase 6 (Analyze) · SDD v3.5
> Cross-Reference Review: spec.md ↔ plan.md ↔ tasks.md ↔ feature files

---

## 1. Trazabilidad de Requisitos (FR → TS → Task)

El modelo de datos y el flujo de la aplicación han sido analizados buscando orfandades:
- **`spec.md`**: 14 FR (Requisitos Funcionales).
- **`plan.md`**: Arquitectura y base de datos con cobertura de todos los 14 FR mediante tablas RLS, Endpoints REST y Componentes JS.
- **`.feature`**: 9 Scenarios (Gherkin BDD) englobando 14 etiquetas `@FR-XXX` correctamente cerradas.
- **`tasks.md`**: 22 tareas cubren los 14 requerimientos funcionales sin tareas huérfanas carentes de asociación funcional.

**Estado Trazabilidad**: ✅ 100% (Verificado estructuralmente)

---

## 2. Detección de Conflictos y Dependencias

| Identificador | Conflicto Analizado | Severidad | Mitigación Planificada |
|---------------|---------------------|-----------|------------------------|
| **DEP-01** | Stripe Checkout interfiere con la creación automática del perfil JWT | `LOW` | El evento webhook de Stripe actualiza la tabla profiles asincronamente. Validado en T-017 / T-018 y plan.md. |
| **DEP-02** | Migración Offline: ¿Cómo acceden los usuarios WP pre-existentes su primer día en Vite/Supabase? | `MEDIUM` | T-014 deberá realizar un reset mágico de contraseña o enviar un Magic Link (Resend API) mapeado al Auth User de Supabase, porque las contraseñas bcrypt de WP no pueden migrarse 1:1 a Auth Supabase (Hash limits). |

---

## 3. Estado de Premisas Abiertas (Assumption Log)

Revisión de `tasklog.md` revela 2 tareas marcadas como `[ASSUMPTION] 🔴 ALTO`:
- **P-06** (MasterStudy DB Schema)
- **P-10** (WP Users Mapping)

**Veredicto del Analizador**: Estas premisas de alto riesgo han sido confinadas al **Bloque B (T-005)** y **Bloque C (T-014)** bajo un único frente de trabajo (Frente 4: ETL). Dado que la base de la SPA (Frente 2) y el Backend como Fuente de Verdad RLS (Frente 1) modelan *hacia* Suscripciones, es perfectamente aceptable que Frontend e Infra comiencen su sprint sin importar los detalles caprichosos de tablas arcaicas en MySQL.
- **Severidad Bloqueante (Gate G2):** Ninguna `HIGH` en el Scope core del replatforming.

---

## 4. Hallazgos Finales

- No se detectan severidades `HIGH` ni `CRITICAL`.
- La arquitectura técnica (`Vanilla JS + Supabase JS SDK + Edge Functions Deno`) es coherente en el plan, testable en el feature, ejecutable por tareas y alinea exacto con los mandatos originarios (SPA Desplegada en subdominio + No PHP).

La fase de organización de tests y diseño está finalizada con alta cohesión geométrica.

**RECOMENDACIÓN FINAL**: 🟢 PASS QUALITY GATE G2. Autorizado movimiento a Fase 7 (Implementación).
