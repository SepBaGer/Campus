# DSAR dedicated smoke

Este directorio documenta el smoke destructivo acotado de DSAR para el backend
activo de `campus-platform`.

## Contrato

- `dsar-export` debe devolver la huella del usuario autenticado en los dominios
  v3: identidad, roles, consentimientos, notificaciones, enrollment, ledger de
  checkout/payment, aprendizaje, xAPI, entregas de proyecto y credenciales.
- Cada export debe crear y cerrar un caso `identity.dsar_request` con
  `kind='access'`, `status='exported'`, `due_at`, `resolved_at` y
  `export_sha256`.
- `dsar-delete` debe archivar `identity.person`, borrar consentimientos,
  preferencias, web push, dispatches, xAPI, attempts, mastery, spaced schedule y
  project submissions, revocar badges y cancelar/inactivar enrollment.
- Cada delete debe crear y cerrar un caso `identity.dsar_request` con
  `kind='deletion'`, `status='deleted'` y `delete_confirmed_at`.
- Cada paso sensible debe registrar un evento append-only en `audit.event`
  (`dsar_export_requested`, `dsar_export_completed`,
  `dsar_delete_requested`, `dsar_delete_completed`).
- Los registros financieros (`checkout_intent` y `payment_allocation`) se
  exportan como huella personal, pero no se eliminan en este smoke porque su
  retencion depende del contrato legal/contable del producto.

## Smoke remoto

Desde la raiz del repo:

```powershell
.\scripts\smoke-dsar-dedicated.ps1 `
  -ProjectRef exyewjzckgsesrsuqueh `
  -ProjectUrl https://exyewjzckgsesrsuqueh.supabase.co
```

El script usa el Supabase CLI autenticado para leer llaves del proyecto sin
persistirlas, crea un usuario `codex-dsar-smoke-*`, siembra datos minimos,
ejecuta `dsar-export`, ejecuta `dsar-delete`, reexporta para verificar el
estado archivado, valida `identity.dsar_request` + `audit.event` y elimina el
Auth user al final por defecto.

Usa `-KeepAuthUser` solo si necesitas inspeccionar manualmente el usuario smoke
despues de la corrida.
