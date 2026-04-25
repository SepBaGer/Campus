# Guia de Despliegue: Campus Platform v3

Esta guia cubre la nueva superficie `campus-platform/` y el backend Supabase v3 que ahora vive en `campus-platform/supabase/`.

## Objetivo

Desplegar la plataforma Astro + Lit con:

- frontend estatico publicado en el dominio final
- migraciones v3 aplicadas al proyecto remoto de Supabase
- Edge Functions v3 desplegadas
- secretos remotos configurados
- verificador publico operativo para tokens nuevos

## Requisitos previos

1. Supabase CLI local instalado en `campus-platform` con `npm install`.
2. Supabase CLI autenticado.
3. Un proyecto remoto de Supabase ya creado.
4. URL final del sitio, por ejemplo `https://campus.metodologia.info`.
5. Llaves publicas para `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. Variables custom para Edge Functions en un archivo local basado en [campus-platform/supabase/.env.functions.example](./supabase/.env.functions.example).

## Notas de contrato

- La base de datos y las funciones se gestionan desde `campus-platform/supabase/`, porque ahi vive `config.toml`. [CODE]
- `supabase db push` requiere que el proyecto este enlazado antes con `supabase link`. [DOC]
- El carril recomendado usa el CLI local versionado en `campus-platform/node_modules`, invocado con `npm run supabase -- <comando>` o desde la raiz con `scripts/supabase-platform.ps1|.sh`. [CODE][DOC]
- `supabase config push` publica la configuracion versionada del `config.toml`, incluyendo `verify_jwt = false` para funciones publicas como `verify-credential`, `run-open`, `ical-feed`, `stripe-webhook` y `rum-web-vitals`. [CODE][DOC]
- En este proyecto tambien se deja `verify_jwt = false` en las funciones protegidas que ya validan `Authorization` dentro del propio handler (`admin-catalog`, `attempt-complete`, `checkout-create`, `credential-issue`, `fsrs-schedule`, `xapi-emit`, `dsar-*` y legacy equivalentes). Esto evita bloqueos del gateway antes de llegar al auth check de la funcion. [CODE][INFERENCE]
- Supabase ya expone por defecto `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` dentro de Edge Functions; no deben duplicarse en el archivo de secretos custom. [DOC]

## 1. Preparar variables del frontend

Usa [campus-platform/.env.production.example](/C:/Users/SepBa/Documents/Trabajo%20Agentico/Campus/campus-platform/.env.production.example) como plantilla:

```env
PUBLIC_CAMPUS_PLATFORM_MODE=live
PUBLIC_CAMPUS_PLATFORM_SITE_URL=https://campus.metodologia.info
PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS=[]
PUBLIC_CAMPUS_RUM_ENABLED=true
PUBLIC_CAMPUS_RUM_SAMPLE_RATE=1
```

Guarda el archivo real como `campus-platform/.env.production`.

Si quieres publicar botones dedicados de SSO enterprise en `/acceso`, la
variable opcional `PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS` acepta un JSON array
como este:

```env
PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS=[{"slug":"cliente-entra","label":"Cliente | Azure AD","vendor":"azure-ad","domain":"cliente.com","hint":"Acceso interno con Microsoft Entra ID"}]
```

## 2. Enlazar y revisar el proyecto remoto

Desde [campus-platform](./README.md):

```bash
npm run supabase:login
npm run supabase:link -- --project-ref TU_PROJECT_REF
npm run supabase -- db push --dry-run
```

Si el proyecto remoto ya tenia cambios manuales previos, primero captura la deriva con `supabase db pull` y revisa el diff antes de empujar nuevas migraciones. [DOC][INFERENCE]

## 2.1. Publicar enterprise SSO en Supabase Auth

`campus-platform` ya consume enterprise SSO desde `/acceso` usando
`supabase.auth.signInWithSSO()` por `domain` o `providerId`. La provision de
proveedores sigue ocurriendo en Supabase Auth, no dentro del frontend.

Primero obten la informacion del Service Provider que debes entregar al cliente:

```bash
npm run supabase -- sso info --project-ref TU_PROJECT_REF
```

Luego registra cada proveedor enterprise. La documentacion oficial de Supabase
recomienda `metadata-url` cuando exista y `metadata-file` para casos como
Google Workspace:

```bash
# Ejemplo Azure AD / Microsoft Entra con metadata URL
npm run supabase -- sso add --type saml --project-ref TU_PROJECT_REF \
  --metadata-url https://TU-IDP/metadata \
  --domains cliente.com

# Ejemplo Google Workspace con metadata XML exportado
npm run supabase -- sso add --type saml --project-ref TU_PROJECT_REF \
  --metadata-file ./google-workspace-metadata.xml \
  --domains cliente.edu
```

Valida el estado publicado:

```bash
npm run supabase -- sso list --project-ref TU_PROJECT_REF -o json
```

Cuando quieras mostrar botones dedicados en la UI, copia los dominios o
`providerId` resultantes dentro de `PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS`.

Para validar el estado `G-02` sin crear proveedores falsos, usa desde la raiz:

```powershell
.\scripts\check-enterprise-sso.ps1 -ProjectRef TU_PROJECT_REF
```

Para registrar un IdP SAML estricto con mapping de atributos controlado:

```powershell
.\scripts\supabase-platform.ps1 sso add `
  --type saml `
  --project-ref TU_PROJECT_REF `
  --metadata-url "https://CLIENTE-IDP/metadata" `
  --domains cliente.com `
  --attribute-mapping-file "campus-platform\supabase\sso\attribute-mapping.enterprise.example.json"
```

Luego exige el proveedor y genera el snippet publico:

```powershell
.\scripts\check-enterprise-sso.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -ExpectedDomain cliente.com `
  -RequireProvider `
  -PrintFrontendEnv
```

Notas de seguridad:

- Supabase SAML requiere que el proyecto tenga SAML habilitado y un plan compatible. [DOC]
- Usa metadata URL cuando el IdP la ofrezca; evita guardar XML o llaves privadas en el repo. [DOC][INFERENCE]
- Las cuentas SSO no se enlazan automaticamente con cuentas existentes; el dominio Campus debe seguir referenciando usuarios por UUID y roles server-side, no por email ni por `raw_user_meta_data`. [DOC][CODE]

## 3. Aplicar base de datos y configuracion remota

Desde [campus-platform](./README.md):

```bash
npm run supabase -- db push --include-seed
npm run supabase -- config push --project-ref TU_PROJECT_REF
```

Esto aplica:

- la migracion [20260420000100_platform_v3_foundation.sql](./supabase/migrations/20260420000100_platform_v3_foundation.sql)
- la migracion [20260421230000_platform_v3_service_role_grants.sql](./supabase/migrations/20260421230000_platform_v3_service_role_grants.sql), necesaria para que las Edge Functions que operan sobre schemas custom (`identity`, `catalog`, `delivery`, `enrollment`, `learning`, `credentials`) puedan leer y escribir con `service_role`
- la migracion [20260421233000_platform_v3_postgrest_schemas.sql](./supabase/migrations/20260421233000_platform_v3_postgrest_schemas.sql), necesaria para que PostgREST exponga los schemas v3 y las Edge Functions puedan usar `supabase-js` con `.schema(...)` sin caer en `Invalid schema`
- la migracion [20260424172700_platform_v3_service_role_grants_refresh.sql](./supabase/migrations/20260424172700_platform_v3_service_role_grants_refresh.sql), que refresca permisos `service_role` para tablas v3 agregadas despues de la base inicial
- la migracion [20260424224824_platform_v3_dsar_request_audit.sql](./supabase/migrations/20260424224824_platform_v3_dsar_request_audit.sql), que agrega `identity.dsar_request`, `audit.event` append-only y expone `audit` para escritura controlada desde Edge Functions con `service_role`
- la migracion [20260424233024_platform_v3_legacy_function_search_path_hardening.sql](./supabase/migrations/20260424233024_platform_v3_legacy_function_search_path_hardening.sql), que fija `search_path` vacio en funciones legacy reportadas por Supabase Security Advisors
- la migracion [20260424233711_platform_v3_rls_performance_advisors.sql](./supabase/migrations/20260424233711_platform_v3_rls_performance_advisors.sql), que optimiza policies RLS legacy y consolida SELECT duplicados reportados por Supabase Performance Advisors
- la migracion [20260425035000_platform_v3_web_vitals_rum.sql](./supabase/migrations/20260425035000_platform_v3_web_vitals_rum.sql), que crea `observability.web_vital_event`, `observability.web_vital_daily_p75_v` y el RPC `public.ingest_web_vital_events(jsonb)` para ingesta RUM desde Edge Functions con `service_role`
- la migracion [20260425131710_platform_v3_student_risk_security_invoker.sql](./supabase/migrations/20260425131710_platform_v3_student_risk_security_invoker.sql), que recrea `learning.v_student_risk` con `security_invoker = true`, revoca `anon` y permite lectura autenticada filtrada por RLS de `learning.spaced_schedule`
- la migracion [20260425134314_platform_v3_teacher_reporting_realtime.sql](./supabase/migrations/20260425134314_platform_v3_teacher_reporting_realtime.sql), que consolida RLS self/staff para reportería docente, publica tablas de progreso en `supabase_realtime` y crea indices de soporte para snapshots de cohorte
- seeds base del proyecto
- reglas de `config.toml` para funciones publicas y privadas

## 4. Cargar secretos de Edge Functions

Crea un archivo real `campus-platform/supabase/.env.functions` a partir de [campus-platform/supabase/.env.functions.example](./supabase/.env.functions.example) y luego ejecuta:

```bash
npm run supabase -- secrets set --env-file .env.functions --project-ref TU_PROJECT_REF
npm run supabase -- secrets list --project-ref TU_PROJECT_REF
```

Variables custom esperadas:

- `SITE_URL`
- `PLATFORM_BOOTSTRAP_ADMIN_EMAILS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ONEROSTER_POWER_SKILLS_TOKEN`
- `LTI_PLATFORM_SHARED_SECRET`
- `LTI_PLATFORM_PRIVATE_JWK`
- `LTI_PLATFORM_ISSUER`
- `LTI_PLATFORM_KEY_ID`
- `LTI_PLATFORM_GUID`
- `LTI_PLATFORM_NAME`
- `LTI_PLATFORM_PRODUCT_FAMILY_CODE`
- `LTI_PLATFORM_SUPPORT_EMAIL`

Importante para pagos:

- `checkout-create` y `stripe-webhook` ya soportan revenue share/Connect, pero
  sin `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` el loop live queda
  incompleto aunque la migracion y las funciones esten desplegadas.
- Si vas a operar payout automatico, la cohorte tambien debe llevar
  `revenue_share_manifest.teacher.stripe_account_id` y
  `settlement_mode=stripe_connect_destination_charge`.

Importante para notificaciones:

- `cohort-notify` usa `RESEND_API_KEY` para email y
  `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` para web push. `VAPID_SUBJECT` es
  opcional porque la funcion tiene default, pero se recomienda versionarlo como
  secreto remoto.
- Antes de disparar envios reales, ejecuta el check no destructivo:

```powershell
.\scripts\check-notifications-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -PrintActivationHints
```

- Cuando los secretos esten publicados y los templates sigan activos, exige el
  gate live:

```powershell
.\scripts\check-notifications-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -RequireLiveChannels
```

- Despues del primer envio admin real, agrega `-RequireDispatchHistory` para
  confirmar que `delivery.notification_dispatch` audito el resultado.

Importante para OneRoster:

- `oneroster-sync` toma el bearer token desde el secreto cuyo nombre viva en
  `delivery.course_run.oneroster_manifest.auth.token_secret_name`; el ejemplo
  seed/documentado usa `ONEROSTER_POWER_SKILLS_TOKEN`, pero puedes publicar
  otro nombre si la cohorte lo referencia explicitamente.
- El primer smoke real tambien requiere dejar
  `delivery.course_run.oneroster_manifest.enabled=true`, `base_url`,
  `sourced_ids.school`, `sourced_ids.class` y el `provision_mode` deseado
  (`match_only` o `invite_missing`).
- Antes de activar un tenant real, ejecuta el check no destructivo:

```powershell
.\scripts\check-oneroster-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -PrintActivationSql
```

- Cuando ya exista manifest completo y secreto remoto, exige el gate live:

```powershell
.\scripts\check-oneroster-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -RequireLiveConfig
```

- Despues del primer sync real, agrega `-RequireSyncHistory` para confirmar que
  `delivery.course_run_roster_sync` audito al menos una corrida.

Importante para comunidad / peer-review:

- `delivery.course_run.community_manifest` gobierna la comunidad por cohorte.
  El piloto puede usar `tool_mode=mock` para smoke tecnico con
  `lti-mock-tool`, pero un tenant live debe usar `tool_mode=custom`.
- La herramienta externa debe registrar los endpoints de plataforma publicados
  por `lti-launch?action=platform-config` y el puente publico
  `/lti/authorize`.
- Antes de declarar live, ejecuta el check no destructivo:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -PrintActivationHints
```

- Cuando ya existan manifest custom, URLs HTTPS reales y secretos LTI, exige el
  gate live:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef TU_PROJECT_REF `
  -RunSlug power-skills-pilot-open `
  -RequireLiveCommunity
```

## 5. Desplegar Edge Functions

Desde [campus-platform](./README.md):

```bash
npm run supabase -- functions deploy --project-ref TU_PROJECT_REF
```

La configuracion versionada del repo ya deja publicas via `verify_jwt = false` estas funciones:

- `verify-credential`
- `run-open`
- `ical-feed`
- `stripe-webhook`
- `rum-web-vitals`

`rum-web-vitals` queda publica en gateway porque el navegador reporta Core Web
Vitals sin sesion; el handler valida `apikey`/`Authorization` contra la llave
publica/anon del proyecto y solo inserta mediante `service_role` via RPC.

Y deja con auth delegada al propio handler estas funciones privadas:

- `admin-catalog`
- `attempt-complete`
- `cohort-notify`
- `checkout-create`
- `complete-lesson`
- `create-checkout`
- `credential-issue`
- `dsar-delete`
- `dsar-export`
- `fsrs-schedule`
- `notification-preferences`
- `oneroster-sync`
- `xapi-emit`

Si quieres redeployar solo el slice financiero sin tocar el resto:

```bash
npm run supabase -- functions deploy admin-catalog --project-ref TU_PROJECT_REF --use-api
npm run supabase -- functions deploy checkout-create --project-ref TU_PROJECT_REF --use-api
npm run supabase -- functions deploy stripe-webhook --project-ref TU_PROJECT_REF --use-api
npm run supabase -- functions deploy dsar-export --project-ref TU_PROJECT_REF --use-api
npm run supabase -- functions deploy dsar-delete --project-ref TU_PROJECT_REF --use-api
```

Si quieres redeployar solo RUM:

```bash
npm run supabase -- functions deploy rum-web-vitals --project-ref TU_PROJECT_REF --use-api --no-verify-jwt
```

Tambien publica como endpoints sin JWT de gateway, pero con controles propios
en el handler o trafico machine-to-machine, estas funciones del carril LTI:

- `lti-launch`
- `lti-mock-tool`

El resto sigue exigiendo JWT o checks de rol desde el propio codigo.

## 6. Build y publicacion del frontend

Desde [campus-platform](/C:/Users/SepBa/Documents/Trabajo%20Agentico/Campus/campus-platform):

```bash
npm run test:a11y
npm run test:perf
npm run build
```

Publica el contenido de `dist/` en tu hosting estatico.

Para validar el cutover reversible antes de publicar, ejecuta desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-cutover-readiness.ps1 `
  -IncludeQualityGates `
  -SiteUrl https://campus.metodologia.info
```

Este check trata `campus-platform` como superficie activa y `campus-v2` solo
como version previa de rollback: construye la plataforma principal, revisa los
artefactos criticos de `dist/`, valida `.htaccess` para `/verify/<token>` y
confirma que el build legacy todavia puede generarse sin tocar
`campus-v2/supabase`. [CODE][DOC]

`npm run test:a11y` ejecuta el build y luego audita WCAG2AA con Pa11y/axe
contra las rutas criticas del sitio estatico. El gate falla en errores
confirmados; los casos `needs review` de contraste que axe no puede calcular
por fondos compuestos se degradan a warning despues de validar la paleta base.

`npm run test:perf` ejecuta el build y luego corre Lighthouse CI sobre las 11
rutas criticas del sitio estatico. El budget falla si alguna ruta baja de
`performance >= 0.70`, `LCP <= 2500ms`, `CLS <= 0.1` o `TBT <= 300ms`; TBT se
usa como proxy de laboratorio para INP, mientras `rum-web-vitals` captura INP
real en produccion cuando `PUBLIC_CAMPUS_RUM_ENABLED=true`. Los reportes
HTML/JSON quedan en
`workspace/2026-04-10-remote-db-campus/artifacts/lhci`. [CODE][DOC]

Para verificar RUM despues del deploy, publica el frontend con:

```bash
PUBLIC_CAMPUS_RUM_ENABLED=true
PUBLIC_CAMPUS_RUM_SAMPLE_RATE=1
```

Luego confirma ingesta por SQL operativo:

```sql
select report_date, page_path, metric_name, p75_value, sample_count
from observability.web_vital_daily_p75_v
order by report_date desc, sample_count desc
limit 20;
```

Importante para LTI:

- el build debe incluir `/lti/authorize/index.html`, porque `lti-launch`
  publica `authorize_url=https://campus.metodologia.info/lti/authorize`
  y ese puente estatico es el que realiza el `form_post` final hacia la tool.
- el 2026-04-24 se verifico `200 OK` en
  `https://campus.metodologia.info/lti/authorize`; si una publicacion futura
  vuelve a servir `404` en esa ruta, el backend LTI quedara desplegado pero el
  roundtrip OIDC no cerrara desde el dominio publico.

## 7. Rewrite para credenciales dinamicas

`campus-platform` sigue siendo `output: "static"`, asi que `/verify/<token>` requiere apoyo del hosting. [DOC][CODE]

### Apache / Hostinger

El repo ya incluye [campus-platform/public/.htaccess](/C:/Users/SepBa/Documents/Trabajo%20Agentico/Campus/campus-platform/public/.htaccess), que se copiara al build y reescribe:

- `/verify/<token>` -> `/verify/index.html`

### Firebase Hosting

Agrega una regla equivalente en `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/verify/**", "destination": "/verify/index.html" }
    ]
  }
}
```

Tambien puedes usar la ruta explicita:

- `/verify/?token=<token>`

## 8. Smoke test obligatorio

Para validar M1 sin tocar checkout/Stripe, ejecuta primero el smoke dedicado
desde la raiz del repo:

```powershell
& '.\scripts\smoke-m1-live-no-stripe.ps1' `
  -ProjectRef 'TU_PROJECT_REF' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co'
```

Este smoke crea un Auth user `codex-m1-smoke-*`, lo matricula en la cohorte
indicada sin pasar por checkout, obtiene token con password, abre portal,
completa todos los bloques, registra evidencia en bloques `project`, valida
`next_review_at`, emite/verifica badge y exige que
`enrollment.checkout_intent=0`. El Auth user se elimina al final salvo que se
pase `-KeepAuthUser`. [CODE][CONFIG]

Para validar especificamente FSRS/riesgo sin tocar checkout/Stripe:

```powershell
& '.\scripts\smoke-pedagogy-risk-live.ps1' `
  -ProjectRef 'TU_PROJECT_REF' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co'
```

Este smoke crea un Auth user `codex-risk-smoke-*`, valida que
`learning.v_student_risk` rechace `anon`, completa un bloque, fuerza
`next_review_at` al pasado, confirma `at-risk` en la vista y
`Atencion requerida` en el portal, vuelve a correr `fsrs-schedule` y exige
`healthy` + `Ritmo saludable` con `enrollment.checkout_intent=0`. [CODE][CONFIG]

Para validar reporteria docente y Realtime sin tocar checkout/Stripe:

```powershell
& '.\scripts\smoke-teacher-reporting-live.ps1' `
  -ProjectRef 'TU_PROJECT_REF' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co'
```

Este smoke crea docente y estudiante desechables, completa la ruta como
learner, lee `admin-catalog.teacher_reports` con token docente, verifica que
RLS permita lectura staff de `attempt`, `xapi_statement`, `spaced_schedule` y
`enrollment`, exige 7 tablas en `supabase_realtime` y comprueba
`checkout_intent=0`. Al final elimina Auth users y filas `identity.person`
generadas por el propio script. [CODE][CONFIG]

Para una publicacion que tambien habilite pagos, el smoke historico autenticado
del journey completo incluye `checkout-create`:

```powershell
& '.\scripts\smoke-platform-live.ps1' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co' `
  -PublishableKey 'TU_PUBLISHABLE_KEY' `
  -Email 'usuario-smoke@example.com' `
  -Password 'tu-password' `
  -CompleteAllBlocks
```

1. Abrir `/acceso` y solicitar magic link.
2. Si existe al menos un proveedor SSO publicado, probar tambien el carril
   enterprise con correo corporativo o dominio valido.
3. Entrar a `/portal`.
4. Completar un bloque y verificar que cambie el progreso.
5. Confirmar que exista `next_review_at`.
6. Emitir o recuperar el badge cuando el progreso llegue al 100%.
7. Abrir `/verify/<token>` y `/verify/?token=<token>`.
8. Validar que `run-open` e `ical-feed` respondan sin sesion de usuario.
9. Abrir un bloque `interactive`, confirmar que el launch pasa por
   `/lti/authorize` y termina en la `Mock LTI Tool` con firma verificada.

Para el smoke destructivo de DSAR, usa un usuario dedicado generado por script
en vez de reutilizar el usuario del journey principal:

```powershell
& '.\scripts\smoke-dsar-dedicated.ps1' `
  -ProjectRef 'TU_PROJECT_REF' `
  -ProjectUrl 'https://TU-PROYECTO.supabase.co'
```

El script crea `codex-dsar-smoke-*`, siembra datos v3, valida
`dsar-export`, ejecuta `dsar-delete`, reexporta para confirmar archivado y
redaccion, valida `identity.dsar_request` + `audit.event`, y elimina el Auth
user al final salvo que se pase `-KeepAuthUser`.

Nota de configuracion:

- `audit` debe permanecer en `api.schemas` para que `dsar-export` y
  `dsar-delete` puedan registrar eventos con `service_role`.
- Antes de usar `config push`, confirma que `auth.site_url`,
  `additional_redirect_urls`, MFA TOTP y confirmacion de email siguen apuntando
  a produccion, no a `localhost`.
- `auth_leaked_password_protection` no se representa hoy en el `config.toml`
  generado por Supabase CLI. Si el proyecto esta en plan Pro o superior,
  activa HaveIBeenPwned desde Auth settings o Management API con
  `password_hibp_enabled=true`, y vuelve a correr Security Advisors.
- En plan Free, el Management API devuelve que leaked-password protection esta
  disponible solo en Pro o superior; ese warning queda bloqueado por plan, no
  por falta de migracion.

## 9. Release sin Stripe

El corte entregable no financiero esta versionado en
[RELEASE-NO-STRIPE.md](./RELEASE-NO-STRIPE.md). Ese documento declara GO para
sitio publico, Auth, portal, progreso, revision, badges, DSAR, FSRS/riesgo,
reporteria docente, Realtime, a11y, performance, RUM y cutover reversible.

T-009 queda explicitamente fuera del release: no se habilita checkout
productivo, webhook Stripe convergente, reconciliacion financiera ni payout
automatico. Los smokes no-Stripe deben conservar `checkout_intent=0` incluso
cuando el codigo preparatorio de Stripe exista en el repositorio.

Referencia operacional Realtime: Supabase Postgres Changes exige publicar las
tablas en `supabase_realtime` antes de suscribir cambios desde el cliente:
https://supabase.com/docs/guides/realtime/postgres-changes [DOC][CONFIG]

## 10. Riesgos que hay que revisar en remoto

- Confirmar `Site URL` y `Redirect URLs` en Supabase Auth para magic links y portal.
- Confirmar `Site URL` y `Redirect URLs` en Supabase Auth tambien para el
  retorno de enterprise SSO hacia `/acceso` o `/portal`.
- Confirmar que `supabase sso list --project-ref TU_PROJECT_REF` muestre al
  menos un proveedor antes de esperar que el carril enterprise funcione en live.
- Confirmar que `check-community-readiness.ps1 -RequireLiveCommunity` pase antes
  de anunciar comunidad/peer-review contra un tenant externo real; el modo
  `mock` solo cubre el smoke tecnico.
- Confirmar que Supabase Security Advisors no reporte
  `function_search_path_mutable`; si queda `auth_leaked_password_protection`,
  validar si el proyecto ya esta en plan Pro para activar HIBP.
- Confirmar que Supabase Performance Advisors no reporte warnings no-Stripe
  despues de aplicar `20260424233711_platform_v3_rls_performance_advisors.sql`.
- Confirmar que `learning.v_student_risk` conserva `security_invoker=true` y
  que `scripts/smoke-pedagogy-risk-live.ps1` pasa despues de cambios en FSRS,
  `learning.spaced_schedule`, portal o grants de schemas expuestos.
- Confirmar que `scripts/smoke-teacher-reporting-live.ps1` pasa despues de
  cambios en `admin-catalog`, `admin-console`, RLS staff, Realtime o tablas de
  progreso docente; el gate debe conservar `checkout_intent=0`.
- Confirmar que `npm run test:a11y` pase antes de publicar `dist/`; si falla,
  corregir contraste, semantica o foco antes de subir al hosting.
- Confirmar que `npm run test:perf` pase antes de publicar `dist/`; si falla,
  corregir CLS/LCP/TBT o documentar una calibracion explicita del budget.
- Confirmar que `rum-web-vitals` este desplegada y que
  `observability.web_vital_daily_p75_v` reciba muestras reales tras publicar el
  frontend live con `PUBLIC_CAMPUS_RUM_ENABLED=true`.
- Confirmar que `scripts/check-cutover-readiness.ps1 -IncludeQualityGates`
  pase antes de reemplazar el frontend publicado; `campus-v2` solo se conserva
  como version previa de rollback, no como destino activo.
- Confirmar que [RELEASE-NO-STRIPE.md](./RELEASE-NO-STRIPE.md) siga vigente
  antes de anunciar el proyecto como listo sin Stripe; si se toca T-009, crear
  un corte financiero separado y preservar los smokes no-Stripe con
  `checkout_intent=0`.
- Confirmar SMTP/confirmacion de correo si el onboarding seguira siendo por email.
- Confirmar que el proyecto remoto no tenga drift previo incompatible antes de `db push`.
- Confirmar que el hosting no sobrescriba `.htaccess` o las rewrites del verificador.
- Confirmar que `supabase config push` o el equivalente remoto mantenga expuestos los schemas `identity`, `catalog`, `delivery`, `enrollment`, `learning` y `credentials`; si PostgREST responde `Invalid schema`, reaplicar la migracion `20260421233000_platform_v3_postgrest_schemas.sql`. [DOC][CODE]
