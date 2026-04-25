# campus-platform/supabase

Backend activo del repositorio para Campus Platform.

## Rol actual

- Este directorio es la fuente de verdad de migraciones, seeds, Edge Functions
  y `config.toml` de Supabase para el producto activo.
- `campus-platform/` sigue siendo la superficie principal del producto, y su
  backend ahora vive aqui mismo para reducir friccion operativa.
- `catalog.content_block` ya versiona el contrato DUA persistido
  (`representation_variants`, `expression_variants`, `engagement_hooks`) con
  trigger validador en Postgres.
- La migracion
  `20260422232727_platform_v3_voice_expression_variants.sql` ya backfillea
  `expression_variants.assistive_tech_hints` con `voice_dictation` para bloques
  que aceptan texto, y `admin-catalog` version `11` deja ese default alineado
  para bloques nuevos o reeditados.
- `catalog.content_block` tambien versiona `renderer_manifest jsonb` y
  `bloom_level`, reflejados en `public.platform_course_blocks_v` y consumidos
  por `campus-platform`.
- `catalog.competency`, `catalog.course_competency`,
  `catalog.content_block_competency`, `learning.mastery_state` por
  `competency_id`, `learning.spaced_schedule`, `catalog.rubric` y
  `learning.project_submission` ya viven aqui como contrato persistido de la
  plataforma v3.
- `identity.person_notification_preference`, `identity.web_push_subscription`,
  `delivery.notification_template` y `delivery.notification_dispatch` ahora
  modelan notificaciones secuenciadas por cohorte con email/web push y
  trazabilidad operativa desde el backoffice principal.
- El carril de acceso `G-01` ya usa enterprise SSO desde el frontend principal
  a traves de `supabase.auth.signInWithSSO()` por `domain` o `providerId`; la
  provision real de tenants Azure AD / Google Workspace ocurre con
  `supabase sso add|list|info` sobre este proyecto remoto.
- `G-02` SAML estricto se opera desde [sso/](./sso/): ahi vive el mapping de
  atributos ejemplo para `supabase sso add --attribute-mapping-file`, mientras
  [../../scripts/check-enterprise-sso.ps1](../../scripts/check-enterprise-sso.ps1)
  verifica metadata SP y presencia real de proveedores en Supabase.
- `identity.person_gamification_preference` ahora modela el opt-in del
  leaderboard, mientras `private.platform_gamification_mv` materializa XP y
  streaks por `course_run`; `public.platform_portal_gamification_v` y
  `public.platform_course_leaderboard_v` exponen solo la proyeccion filtrada
  que consume el portal nuevo, endurecidas luego con
  `20260423000444_platform_v3_gamification_view_invoker_hardening.sql` para
  mantener las vistas publicas en `security_invoker`.
- `20260423013714_platform_v3_revenue_share_connect.sql` agrega
  `delivery.course_run.revenue_share_manifest jsonb not null`, extiende
  `enrollment.checkout_intent` con metadata Stripe/teacher y crea
  `enrollment.payment_allocation` para reconocer revenue share por pago con
  snapshot del split, fees, invoice, charge y transfer.
- `20260423033503_platform_v3_oneroster_roster_sync.sql` agrega
  `delivery.course_run.oneroster_manifest jsonb not null`,
  `delivery.course_run_roster_sync` y `delivery.course_run_roster_seat` para
  sincronizacion OneRoster 1.2 por cohorte, con auditoria de corridas y staging
  persistido de seats antes de tocar matriculas reales.
- `functions/oneroster-sync/` ya consume ese contrato en modo `pull`:
  consulta clases/usuarios del proveedor, matchea por email, puede invitar
  usuarios faltantes via Supabase Auth cuando `provision_mode=invite_missing`,
  asegura `identity.person` + `identity.person_role` y upsertea
  `enrollment.enrollment` para learners detectados.
- `oneroster/` contiene el runbook operativo y una plantilla segura de
  `oneroster_manifest` enterprise; desde la raiz,
  `scripts/check-oneroster-readiness.ps1` valida `G-07` contra el proyecto
  remoto sin ejecutar un sync ni persistir secretos en el repo.
- `20260423035301_platform_v3_oneroster_hardening.sql` endurece el slice con
  indice en `delivery.course_run_roster_seat.enrollment_id` y politicas
  explicitas de lectura para `admin`, `teacher` y `owner` sobre las tablas de
  sync/seat.
- `functions/admin-catalog/` ya serializa `revenue_share_manifest` desde
  `upsert-run`, `functions/checkout-create/` prepara `subscription_data` con
  metadata de reparto y `transfer_data.destination` cuando el run queda listo
  para Stripe Connect, y `functions/stripe-webhook/` consolida el allocation
  real al recibir `checkout.session.completed`, `invoice.paid` y eventos de
  suscripcion.
- `functions/dsar-export/` ahora incluye tambien `enrollment.checkout_intent`
  y `enrollment.payment_allocation`, de modo que el slice financiero quede
  cubierto por el mismo carril de exportacion de datos personales.
- `functions/dsar-export/` y `functions/dsar-delete/` tambien cubren
  consentimientos, preferencias/suscripciones/dispatches de notificacion, xAPI
  y entregas de proyecto; [dsar/](./dsar/) documenta el smoke dedicado que crea
  un usuario desechable, valida export/delete/export y limpia el Auth user.
- Desde la raiz, `scripts/smoke-m1-live-no-stripe.ps1` valida el journey M1
  live sin checkout: crea un Auth user desechable, asegura `identity.person` +
  `enrollment.enrollment` para la cohorte piloto, completa bloques via
  `attempt-complete`, cubre `learning.project_submission`, emite/verifica badge
  y exige `enrollment.checkout_intent=0` antes de limpiar el usuario.
- `20260425131710_platform_v3_student_risk_security_invoker.sql` endurece
  `learning.v_student_risk` con `security_invoker = true`, revoca acceso
  `anon` y permite lectura `authenticated` bajo las politicas RLS de
  `learning.spaced_schedule`; desde la raiz,
  `scripts/smoke-pedagogy-risk-live.ps1` valida el ciclo
  `healthy -> at-risk -> healthy` con `fsrs-schedule` y sin checkout.
- `20260425134314_platform_v3_teacher_reporting_realtime.sql` consolida
  politicas RLS self/staff para `enrollment.enrollment`, `learning.attempt`,
  `learning.mastery_state`, `learning.spaced_schedule`,
  `learning.xapi_statement` y `credentials.badge_assertion`, publica esas
  tablas mas `learning.project_submission` en `supabase_realtime` y soporta
  `admin-catalog.teacher_reports` sin exponer `service_role` al browser.
- Desde la raiz, `scripts/smoke-teacher-reporting-live.ps1` valida reporteria
  docente y Realtime sin checkout: crea docente + learner desechables, completa
  progreso, lee `teacher_reports` con token docente, prueba RLS staff sobre
  progreso y exige `enrollment.checkout_intent=0`.
- `identity.dsar_request` y `audit.event` dejan el carril DSAR auditable:
  exports y deletes crean casos con SLA/evidencia/hash y registran eventos
  append-only para requested/completed/failed.
- `20260424172700_platform_v3_service_role_grants_refresh.sql` refresca grants
  de `service_role` sobre schemas v3 para que las Edge Functions puedan operar
  tablas creadas despues de la base inicial, incluyendo notificaciones y
  entregas de proyecto.
- `audit` esta incluido en `config.toml` para que Edge Functions puedan escribir
  via PostgREST con `service_role`; no se otorgan grants a `anon` ni
  `authenticated` sobre `audit.event`.
- `20260424233024_platform_v3_legacy_function_search_path_hardening.sql`
  recrea las funciones legacy `private.touch_updated_at`,
  `public.handle_new_user` y `public.add_xp_and_check_level_up` con
  `set search_path = ''`, cerrando los warnings
  `function_search_path_mutable` sin cambiar firmas ni triggers.
- `20260424233711_platform_v3_rls_performance_advisors.sql` recrea policies
  RLS legacy con `(select auth.uid())` / `to authenticated` y consolida los
  SELECT permisivos duplicados de `identity.dsar_request` e
  `identity.person_consent`, dejando Supabase Performance Advisors sin warnings
  no-Stripe.
- `20260425035000_platform_v3_web_vitals_rum.sql` crea el schema privado
  `observability`, la tabla `web_vital_event`, la vista
  `web_vital_daily_p75_v` y el RPC `public.ingest_web_vital_events(jsonb)`.
  `functions/rum-web-vitals/` recibe Core Web Vitals del navegador, valida la
  llave publica/anon y persiste mediante `service_role`; `anon` y
  `authenticated` no reciben grants sobre la tabla ni sobre el RPC.
- Supabase Auth leaked-password protection queda como control de plataforma:
  el Management API rechaza `password_hibp_enabled=true` mientras el proyecto no
  este en plan Pro o superior, asi que ese advisor debe quedar bloqueado por
  plan y revalidarse despues del upgrade.
- El contrato live ya soporta dos modos de settlement:
  `manual_monthly` como fallback operativo y
  `stripe_connect_destination_charge` para payout automatico; este ultimo
  requiere `teacher.stripe_account_id` por cohorte y secretos remotos
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- `notifications/` contiene el runbook operativo y una plantilla segura de
  secretos de canal; desde la raiz, `scripts/check-notifications-readiness.ps1`
  valida `G-13` contra el proyecto remoto sin enviar emails ni web push.
- `20260423002642_platform_v3_lti_consumer_launch.sql` alinea
  `catalog.content_block.renderer_manifest` al contrato LTI 1.3 consumer
  (`lti_tool_mode`, `lti_login_initiation_url`, `lti_target_link_uri`,
  `lti_client_id`, `lti_deployment_id`, `lti_resource_link_id`,
  `lti_launch_presentation`, `lti_custom_parameters`, `lti_title`) y deja
  defaults mock listos para bloques `interactive`.
- `20260423003125_platform_v3_pilot_interactive_blocks.sql` promueve
  `legacy-201` a `interactive` en el piloto live para que el slice LTI quede
  visible en producto y no solo en datos demo.
- `functions/lti-launch/` y `functions/lti-mock-tool/` ya exponen
  `platform-config`, `jwks`, `initiate`, `authorize` y una herramienta mock
  para smoke end-to-end del carril LTI 1.3 consumer.
- `20260423004004_platform_v3_cohort_community_lti.sql` agrega
  `delivery.course_run.community_manifest jsonb not null`, defaults/trigger de
  validacion y la vista `public.platform_course_community_v` para proyectar la
  capa de comunidad por cohorte.
- `functions/admin-catalog/` ya serializa `community_manifest` dentro del
  `upsert-run`, y `functions/lti-launch/` expone `action=initiate-community`
  para reutilizar el mismo carril OIDC de LTI 1.3 sobre comunidad `Discourse`
  o herramientas compatibles.
- El piloto remoto `power-skills-pilot-open` queda seeded con
  `provider=discourse` y `tool_mode=mock`, de forma que el contrato live sea
  verificable aun antes de registrar credenciales reales del tenant externo.
- `community/` contiene el runbook operativo y plantillas seguras de manifest y
  secretos LTI; desde la raiz,
  `scripts/check-community-readiness.ps1` valida `G-09` contra el proyecto
  remoto sin abrir launches reales ni registrar un tenant externo falso.
- `20260423010224_platform_v3_authoring_media_storage.sql` crea el bucket
  publico-controlado `authoring-media` y politicas `authoring_media_staff_*`
  sobre `storage.objects`, restringiendo upload/list/update/delete a roles
  `teacher`, `admin` u `owner`.
- Ese bucket soporta el nuevo editor rico del backoffice para bloques
  `reading` y `project`: Tiptap sigue persistiendo markdown dentro de
  `renderer_manifest`, pero ya puede insertar imagenes y adjuntos subidos a
  Storage sin abrir otro dominio de datos.
- El piloto live ya expone tres bloques `project` reales con la rubrica
  `rubrica-proyecto-evidencia-de-impacto`, authoring guiado, entrega learner y
  revision manual persistida.
- `campus-v2/` se conserva solo como frontend vestigial de respaldo.

## Regla operativa

- Si la tarea toca base de datos, RLS, Edge Functions, secretos o despliegue
  remoto de Supabase, trabaja desde este directorio.
- Ejecuta aqui los comandos de `supabase link`, `supabase db push`,
  `supabase config push`, `supabase secrets set` y `supabase functions deploy`.
- Cuando la tarea toque enterprise SSO, usa tambien
  `npm run supabase -- sso info|list|add|update|remove --project-ref ...` para
  operar proveedores de Auth sin salir del carril repo-versionado.
- Cuando la tarea toque pagos o revenue share, valida tambien el estado remoto
  de `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`; sin esos secretos el
  contrato queda desplegado, pero `checkout-create` y `stripe-webhook` no
  pueden cerrar el loop live de Stripe.
- Cuando la tarea toque notificaciones, valida tambien
  `RESEND_API_KEY`, `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` con
  `scripts/check-notifications-readiness.ps1 -RequireLiveChannels`; despues del
  primer envio real, suma `-RequireDispatchHistory`.
- Cuando la tarea toque OneRoster, actualiza tambien
  `delivery.course_run.oneroster_manifest` y el secreto custom nombrado en
  `auth.token_secret_name` (por ejemplo `ONEROSTER_POWER_SKILLS_TOKEN`); sin
  `enabled=true`, `base_url`, `school/class sourced_id` y ese token publicado,
  `functions/oneroster-sync` seguira listo pero no podra ejecutar un smoke real.
- Para distinguir contrato listo de tenant incompleto, usa
  `scripts/check-oneroster-readiness.ps1 -RequireLiveConfig` antes de disparar
  `oneroster-sync`; despues del primer sync real, suma `-RequireSyncHistory`.
- Cuando la tarea toque comunidad/peer-review, valida
  `delivery.course_run.community_manifest`, `lti-launch`, `lti-mock-tool` y los
  secretos `LTI_PLATFORM_*` con `scripts/check-community-readiness.ps1`. Para
  declarar tenant real, `community_manifest.lti.tool_mode` debe ser `custom` y
  sus URLs deben apuntar por HTTPS a la herramienta externa, no al mock.
- Cuando la tarea toque DSAR, ejecuta
  `scripts/smoke-dsar-dedicated.ps1 -ProjectRef exyewjzckgsesrsuqueh` despues
  de desplegar `dsar-export` y `dsar-delete`; el script genera su propio usuario
  desechable y no debe reutilizar usuarios smoke de journeys no destructivos.
- Cuando la tarea toque el journey learner M1 sin pagos, ejecuta
  `scripts/smoke-m1-live-no-stripe.ps1 -ProjectRef exyewjzckgsesrsuqueh`
  despues de desplegar funciones de aprendizaje/credenciales; el gate debe
  conservar `checkout_intent=0` para no mezclar el cierre no-Stripe con pagos.
- Cuando la tarea toque FSRS, `learning.spaced_schedule`, riesgo pedagogico,
  portal de reviews o grants de schemas expuestos, ejecuta
  `scripts/smoke-pedagogy-risk-live.ps1 -ProjectRef exyewjzckgsesrsuqueh`
  despues de aplicar migraciones; el gate debe mantener `v_student_risk`
  inaccesible para `anon`, filtrada para `authenticated` y con
  `checkout_intent=0`.
- Cuando la tarea toque reporteria docente, `admin-catalog`, `admin-console`,
  RLS staff o Realtime de progreso, ejecuta
  `scripts/smoke-teacher-reporting-live.ps1 -ProjectRef exyewjzckgsesrsuqueh`
  despues de aplicar migraciones y desplegar `admin-catalog`; el gate debe
  mantener `checkout_intent=0`.
- Cuando la tarea toque hardening de Supabase, ejecuta
  `npm run supabase -- db advisors --linked --type security --level warn --fail-on none -o json`
  y
  `npm run supabase -- db advisors --linked --type performance --level warn --fail-on none -o json`
  desde `campus-platform/`. Los warnings de funciones/RLS deben cerrarse por
  migracion SQL; `auth_leaked_password_protection` requiere activar
  `password_hibp_enabled` via Auth settings/Management API en plan compatible.
- Cuando la tarea toque performance real/RUM, despliega `rum-web-vitals` con
  `--no-verify-jwt`, publica el frontend con `PUBLIC_CAMPUS_RUM_ENABLED=true`
  y valida ingesta en `observability.web_vital_event` o p75 diario en
  `observability.web_vital_daily_p75_v`; las pruebas sinteticas deben usar
  eventos `codex-rum-smoke-*`.
- El carril canonico ya no depende de un binario global en `PATH`: instala el
  CLI con `npm install` en `campus-platform/` y usalo mediante
  `npm run supabase -- <comando>` o desde la raiz con
  `scripts/supabase-platform.ps1|.sh`.
- El wrapper repo-local ejecuta siempre desde este directorio y `link` usa por
  defecto el project ref activo `exyewjzckgsesrsuqueh`, salvo override explicito
  con `--project-ref` o `CAMPUS_SUPABASE_PROJECT_REF`.
- Usa [../README-DEPLOY.md](../README-DEPLOY.md) como runbook de despliegue de
  la plataforma completa.
- No reintroduzcas backend activo dentro de `campus-v2/`; si necesitas
  compatibilidad legacy, documentala desde el stub de `../../campus-v2/supabase/`.

## Bootstrap rapido

Desde `campus-platform/`:

```bash
npm install
npm run supabase:login
npm run supabase:link
npm run supabase:status
```

Desde la raiz del repo en Windows:

```powershell
& '.\scripts\supabase-platform.ps1' login
& '.\scripts\supabase-platform.ps1' link
& '.\scripts\supabase-platform.ps1' status
```
