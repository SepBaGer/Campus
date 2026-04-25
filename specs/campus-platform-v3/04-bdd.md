# Campus Platform v3 - BDD

## Escenarios nucleares

### Signup y acceso

Given una persona nueva en el catalogo
When solicita acceso desde el curso piloto
Then la plataforma crea o resuelve su identidad y le permite continuar al portal segun su entitlement

### Descubrir curso

Given una visitante en `/catalogo`
When explora el curso piloto
Then puede ver objetivos, cohortes abiertas y bloques del programa

### Checkout idempotente

Given una persona autenticada con acceso free
When inicia un upgrade premium dos veces con la misma clave de idempotencia
Then la plataforma devuelve la misma intencion y no duplica el checkout

### Acceso por entitlement

Given una persona con `free-access`
When abre un bloque gratuito
Then puede consumirlo sin requerir premium

Given una persona sin `premium-membership`
When intenta abrir un bloque premium
Then la plataforma deniega acceso y ofrece upgrade

### Consumo de leccion

Given una persona matriculada en la cohorte piloto
When completa el primer bloque
Then se registra un `learning.attempt` y se actualiza su snapshot de progreso

### Publicacion docente

Given una docente administradora
When crea un `course_run` con sesiones y bloques
Then la cohorte queda visible en el catalogo publico

### Reporteria docente y Realtime

Given una docente con rol `teacher`
When learners completan bloques y emiten xAPI
Then el backoffice muestra KPIs de cohorte y se refresca con cambios Realtime bajo RLS staff

Evidencia live: `scripts/smoke-teacher-reporting-live.ps1` valida docente y
learner desechables, `admin-catalog.teacher_reports`, RLS staff sobre progreso,
7 tablas en `supabase_realtime` y `checkout_intent=0`.

### xAPI

Given una persona completa un bloque
When el evento es emitido
Then se registra un statement xAPI trazable

### Credencial

Given una persona cumple el criterio del curso
When se emite una badge assertion
Then puede verificarse publicamente por token

### FSRS y riesgo

Given una persona acumula intentos y fechas de repaso
When corre el scheduler pedagogico
Then se recalcula `next_review_at` y la vista `v_student_risk`

Evidencia live: `scripts/smoke-pedagogy-risk-live.ps1` valida usuario Auth
desechable, RLS en `learning.v_student_risk`, transicion
`healthy -> at-risk -> healthy` y `checkout_intent=0`.

### DSAR

Given una persona autenticada
When solicita exportacion o borrado
Then la plataforma devuelve o procesa su huella de datos del dominio nuevo

### Accesibilidad

Given una persona navega landing, catalogo, curso, portal y admin
When usa teclado y lector de pantalla
Then los flujos criticos cumplen AA sin depender del hash router legado
