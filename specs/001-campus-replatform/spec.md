# Spec — Campus MetodologIA v2 Replatform

> Feature: campus-replatform · Versión: 1.0 · Derivada del PRD v1

---

## Descripción

Migración completa del Campus MetodologIA desde WordPress/MasterStudy hacia una SPA Vite (Vanilla JS) desplegada en `metodologia.info/campus/`, con backend Supabase para auth, progreso, gating y pagos.

## User Stories

### User Story 1 — Registro y Login (Priority: P1)
**Como** estudiante nuevo  
**Quiero** registrarme y hacer login sin WordPress  
**Para** acceder al Campus con credenciales unificadas  

### User Story 2 — Ver Ruta de Niveles (Priority: P1)
**Como** estudiante  
**Quiero** ver la ruta completa de 10 niveles con mi progreso  
**Para** saber exactamente dónde estoy y qué sigue  

### User Story 3 — Acceder a Lecciones (Priority: P1)
**Como** estudiante con nivel desbloqueado  
**Quiero** acceder a las lecciones de mi nivel actual  
**Para** avanzar en el programa  

### User Story 4 — Progreso Persistente (Priority: P1)
**Como** estudiante  
**Quiero** que mi progreso se guarde automáticamente  
**Para** continuar donde lo dejé en cualquier dispositivo  

### User Story 5 — Navegación Prev/Next (Priority: P2)
**Como** estudiante en una lección  
**Quiero** navegar a la siguiente o anterior lección  
**Para** mantener un flujo de estudio continuo  

### User Story 6 — Ranking y Gamificación (Priority: P2)
**Como** estudiante social  
**Quiero** ver mi posición en el ranking de la comunidad  
**Para** mantener motivación y competitividad  

### User Story 7 — Calendario de Eventos (Priority: P2)
**Como** estudiante  
**Quiero** ver las sesiones y eventos programados  
**Para** planificar mi participación  

### User Story 8 — Comunidad y Muro Social (Priority: P2)
**Como** estudiante social  
**Quiero** acceder a un espacio de comunidad  
**Para** conectar con otros estudiantes  

### User Story 9 — Perfil y Progreso Histórico (Priority: P3)
**Como** estudiante  
**Quiero** ver mi perfil con historial de progreso  
**Para** revisar mi avance acumulado  

### User Story 10 — Gestión Editorial (Priority: P3)
**Como** administrador  
**Quiero** crear y editar lecciones sin código  
**Para** publicar actualizaciones el mismo día  

### User Story 11 — Acceso Gated por Membresía (Priority: P1)
**Como** sistema  
**Quiero** validar membresía activa para contenido premium  
**Para** proteger el modelo de negocio  

### User Story 12 — Hero de Home y Landing (Priority: P2)
**Como** visitante  
**Quiero** ver la propuesta de valor con CTA claro  
**Para** entender qué ofrece el Campus  

---

## Requisitos Funcionales

| ID | Descripción | Prioridad | SC |
|----|-------------|-----------|-----|
| **FR-01** | El usuario puede registrarse y hacer login sin depender de WordPress | Must | SC-01 |
| **FR-02** | El usuario ve la ruta completa de 10 niveles con indicador de progreso | Must | SC-02 |
| **FR-03** | El usuario puede acceder a lecciones dentro de su nivel desbloqueado | Must | SC-03 |
| **FR-04** | El sistema persiste el progreso del usuario (lección completada, nivel actual) | Must | SC-04 |
| **FR-05** | El usuario navega prev/next entre lecciones dentro de un nivel | Must | SC-05 |
| **FR-06** | El usuario ve su posición en el ranking | Should | SC-06 |
| **FR-07** | El usuario accede a un calendario de eventos/sesiones | Should | SC-07 |
| **FR-08** | El usuario accede a una comunidad | Should | SC-08 |
| **FR-09** | El usuario puede ver su perfil y progreso histórico | Should | SC-09 |
| **FR-10** | El administrador puede crear/editar/eliminar lecciones sin código | Must | SC-10 |
| **FR-11** | El sistema requiere membresía activa para acceder a cursos premium | Must | SC-11 |
| **FR-12** | El hero de home presenta propuesta de valor y CTA | Must | SC-12 |
| **FR-13** | El usuario puede comentar en lecciones | Could | SC-13 |
| **FR-14** | El sistema envía email de bienvenida y notificaciones de progreso | Should | SC-14 |

## Success Criteria

| ID | Criterio | Métrica |
|----|----------|---------|
| **SC-01** | Login funciona con Supabase Auth (email + password) | 98% success rate |
| **SC-02** | Los 10 niveles se renderizan con progreso visual actualizado | 100% render |
| **SC-03** | Solo lecciones del nivel desbloqueado son accesibles | 0 leaks via RLS |
| **SC-04** | Progreso se guarda en < 500ms y persiste entre sesiones | 100% reliability |
| **SC-05** | Botones prev/next navegan correctamente dentro del nivel | 100% accuracy |
| **SC-06** | Ranking muestra top 50 estudiantes por XP | Real-time data |
| **SC-07** | Calendario muestra eventos del mes actual | Data from Supabase |
| **SC-08** | Comunidad tiene punto de entrada funcional | Link o embed activo |
| **SC-09** | Perfil muestra nivel, XP, lecciones completadas | All fields populated |
| **SC-10** | Admin puede editar lección desde Supabase Dashboard | < 30 min publish |
| **SC-11** | Usuarios sin membresía se bloquean correctamente | 0% bypass |
| **SC-12** | Hero carga en < 2.5s LCP con CTA visible | Web Vitals pass |
| **SC-13** | Comentarios se renderizan bajo la lección | If feature enabled |
| **SC-14** | Email de bienvenida llega en < 5 min post-registro | 95% delivery |

---

## Requisitos No Funcionales

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| NFR-01 | LCP < 2.5s en conexión 4G | Must |
| NFR-02 | Sin dependencia de WordPress | Must |
| NFR-03 | Contenido editable sin deploy | Must |
| NFR-04 | Identidad visual gold/navy ±10% | Must |
| NFR-05 | Responsive desde 375px | Must |
| NFR-06 | Contenido indexable (SPA con meta tags) | Should |
| NFR-07 | Auth soporta 1000 concurrentes | Should |
| NFR-08 | Cero debug en producción | Must |
| NFR-09 | Pagos PCI-DSS compliant (Stripe) | Must |
| NFR-10 | Logs de errores desde Day 1 | Should |

---

## Arquitectura de Contenido

```
/campus/
├── /                    → Home: Hero + Ruta 10 niveles
├── /ruta                → Vista expandida de niveles
├── /nivel/:n            → Hub de nivel + lista de lecciones
├── /nivel/:n/leccion/:id → Player de lección + nav prev/next
├── /mi-progreso         → Dashboard personal
├── /ranking             → Leaderboard
├── /comunidad           → Foro / integración externa
├── /calendario          → Eventos / clases
├── /perfil              → Datos personales + progreso
├── /login               → Auth unificada
└── /planes              → Suscripción / compra
```

## Modelo de Datos Mínimo

```
Nivel (10 entidades)
├── id, titulo, descripcion, color_semantico, orden, prerequisito

Leccion
├── id, titulo, contenido, tipo (text/video/pdf), nivel_id, orden, duracion

Progreso
├── user_id, nivel_actual, lecciones_completadas[], porcentaje_nivel, xp_total

Evento
├── id, titulo, fecha, url_meeting, descripcion

Membresia
├── user_id, plan, status, stripe_customer_id, expires_at
```

---

*Campus MetodologIA v2 · Spec · SDD v3.5*
