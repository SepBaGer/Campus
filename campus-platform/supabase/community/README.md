# Community / peer-review readiness

Este directorio documenta el cierre operacional de `G-09` para comunidad de
cohorte y peer-review sobre el carril LTI 1.3 ya existente.

## Estado esperado

- La cohorte vive en `delivery.course_run.community_manifest`.
- La proyeccion publica vive en `public.platform_course_community_v`.
- `lti-launch?action=initiate-community` genera el login initiation para la
  comunidad asociada al `course_run`.
- `lti-mock-tool` permite validar el contrato tecnico sin registrar un tenant
  externo falso.

El piloto `power-skills-pilot-open` puede permanecer en `tool_mode=mock` para
smoke tecnico. Para declarar comunidad live, el manifest debe cambiar a
`tool_mode=custom` con URLs HTTPS reales del proveedor Discourse/LTI.

## Verificacion remota

Desde la raiz del repo:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -PrintActivationHints
```

Para exigir tenant real:

```powershell
.\scripts\check-community-readiness.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -RunSlug power-skills-pilot-open `
  -RequireLiveCommunity
```

Ese modo debe fallar mientras el manifest siga en `mock`, falten URLs reales o
no existan los secretos LTI requeridos.

## Activacion live

1. Registra Campus como plataforma en la herramienta externa usando:
   - issuer: `LTI_PLATFORM_ISSUER` o `SITE_URL`
   - OIDC authorize endpoint: `https://PROJECT_REF.supabase.co/functions/v1/lti-launch?action=authorize`
   - JWKS endpoint: `https://PROJECT_REF.supabase.co/functions/v1/lti-launch?action=jwks`
   - public authorize bridge: `https://campus.metodologia.info/lti/authorize`
2. Publica secretos LTI remotos desde un archivo local, nunca desde una plantilla
   versionada.
3. Actualiza `delivery.course_run.community_manifest` con un manifest tipo
   [manifest.enterprise.example.json](./manifest.enterprise.example.json).
4. Ejecuta `check-community-readiness.ps1 -RequireLiveCommunity`.
5. Haz un smoke manual autenticado desde el portal: abrir comunidad debe pasar
   por `/lti/authorize` y terminar en la herramienta real.

## Seguridad

- No guardes `LTI_PLATFORM_SHARED_SECRET` ni `LTI_PLATFORM_PRIVATE_JWK` reales
  en el repo.
- Usa URLs HTTPS reales; no declares live si apuntan a `lti-mock-tool`.
- No uses email ni claims editables de usuario como autoridad de permisos. Los
  roles efectivos siguen resolviendose server-side desde `identity.person_role`.
- Si cambia `config.toml`, revisa que Auth siga apuntando a produccion antes de
  ejecutar `supabase config push`.
