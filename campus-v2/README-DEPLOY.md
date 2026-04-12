# Guia de Despliegue: Campus MetodologIA v2

Esta documentacion prepara el Campus para ejecutarse con frontend estatico en Hostinger o Firebase Hosting y base de datos remota en Supabase.

## Requisitos previos

1. Node.js y NPM disponibles en el entorno de build.
2. Un proyecto remoto de Supabase con HTTPS.
3. Llaves publicas del frontend listas para `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Stripe y webhooks listos solo cuando se active monetizacion.

## Regla principal de arquitectura

- El frontend se despliega en Hostinger o Firebase Hosting.
- La base de datos, Auth y Edge Functions viven en Supabase remoto.
- `SUPABASE_SERVICE_ROLE_KEY` no debe existir en archivos `.env` del frontend.

## Configuracion de entorno

Usa [campus-v2/.env.example](/C:/Users/SepBa/Documents/Trabajo%20Agentico/Campus/campus-v2/.env.example) como plantilla para desarrollo con backend remoto y [campus-v2/.env.production.example](/C:/Users/SepBa/Documents/Trabajo%20Agentico/Campus/campus-v2/.env.production.example) para el build final.

Ejemplo de `.env.production`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_PUBLICA
```

## Build

Compila el proyecto con assets relativos para que funcione tanto en raiz como en una subcarpeta:

```bash
npm run build
```

Esto genera `dist/`.

## Despliegue del frontend

Sube el contenido de `dist/` a la carpeta publica donde vivira el Campus en Hostinger o Firebase Hosting.

Notas importantes:

- Si publicas en `https://tu-dominio.com/`, sube `dist/` a la raiz publica del sitio.
- Si publicas en `https://tu-dominio.com/campus/`, sube `dist/` dentro de esa carpeta.
- El build ya no depende de una base fija `/campus/`; usa rutas relativas para evitar fallos de assets al cambiar la ubicacion.
- Conserva el `.htaccess` generado dentro de `dist/` para el fallback de la SPA.

## Despliegue de Edge Functions

Cuando llegue la fase de login y pagos, despliega las funciones al proyecto remoto:

```bash
supabase functions deploy complete-lesson --project-ref TU_REF
supabase functions deploy create-checkout --project-ref TU_REF
supabase functions deploy stripe-webhook --project-ref TU_REF
```

Luego configura secretos solo dentro de Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

## Verificacion minima

- El build termina sin errores.
- `VITE_SUPABASE_URL` apunta a HTTPS remoto.
- RLS esta habilitado en produccion.
- El login puede quedar pendiente hasta el despliegue, pero la app ya no debe depender de `localhost`.
