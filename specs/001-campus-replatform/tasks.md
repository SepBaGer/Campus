# Desglose de Tareas — Campus MetodologIA v2

> Feature: campus-replatform · Fase 5 (Tasks) · SDD v3.5

---

## Bloque A: Fundamentos e Infraestructura Backend

- [x] T001 [US1] Configurar proyecto Supabase y provisionar DB [FR-01]
- [x] T002 [US1] Ejecutar schema SQL (profiles, levels, lessons, progress, events, comments) [FR-01] [FR-04]
- [x] T003 [US1] Habilitar Auth provider e integrar con profiles (Trigger post-signup) [FR-01]
- [x] T004 [US1] Aplicar políticas de RLS para restricción de acceso según membresía [FR-11]

---

## Bloque B: Migración y Desarrollo Core

- [ ] T005 [US2] Extraer esquema DB MasterStudy y crear script exportador
- [x] T006 [US2] Inicializar cliente supabase-js en Vite y testear connection
- [x] T007 [US2] Implementar auth.js completo (login, registro)
- [x] T008 [US2] Portar design system glassmorphism a style.css y asegurar paridad
- [ ] T014 [US2] Mapear tabla wp_users a estructura profiles Supabase

---

## Bloque C: Desarrollo de Funcionalidades BDD

- [x] T009 [US3] Refactorizar store.js para mapear estado a Supabase
- [x] T010 [US3] Implementar componentes UI Base: Sidebar, Topbar con progreso persistente
- [x] T011 [US3] Desarrollar Edge Function complete-lesson (XP + Level Up logic) [FR-04]
- [x] T012 [US3] Implementar vista Aula.js: Renderizar niveles y validar guards del router [FR-03]
- [x] T013 [US3] Implementar vista Leccion.js: Player de video y navegación prev/next [FR-03] [FR-05]

---

## Bloque D: Gamificación e Integraciones

- [x] T015 [US4] Implementar vista Ranking.js (top 50) [FR-06]
- [x] T016 [US4] Implementar vista Calendario.js y obtener records [FR-07]
- [ ] T017 [US4] Desarrollar integración Stripe vista Planes.js y create-checkout
- [ ] T018 [US4] Implementar stripe-webhook para membresía distribuida
- [x] T019 [US4] Configurar Comunidad.js con muro de posts interactivo [FR-08]

---

## Bloque E: Revisión Final y QA

- [x] T020 [US5] Edge Function send-welcome con trigger DB Alpha-safe con Mailpit [FR-14]
- [x] T021 [US5] Ejecutar suite de verificación SDD sdd-verify all checks passed
- [x] T022 [US5] Deploy build a Hostinger campus .htaccess SPA fallback configurado

---

*Campus MetodologIA v2 · Tasks Breakdown · SDD v3.5 updated 2026-04-05*
