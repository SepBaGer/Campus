# Guía de Despliegue: Campus MetodologIA v2

Esta documentación detalla los pasos para desplegar el campus en producción sobre el dominio `metodologia.info/campus/`.

## 📦 Requisitos Previos

1. **Node.js & NPM**: Instalados en el entorno de build (GitHub Actions o Local).
2. **Supabase Project**: Un proyecto de producción en `supabase.com`.
3. **Stripe Account**: Llaves de API (Secret & Webhook) configuradas.

## 🚀 Pasos para el Despliegue

### 1. Configuración de Producción

Crea un archivo `.env.production` en la raíz de `campus-v2/`:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_DE_PRODUCCIÓN
```

### 2. Generar el Build

Ejecuta el siguiente comando para compilar el proyecto optimizado para la subcarpeta `/campus/`:

```bash
npm run build
```

Esto generará una carpeta `dist/`.

### 3. Subida de Archivos

Sube el contenido de la carpeta `dist/` a tu servidor (Hostinger o VPS) mediante FTP/SSH en la ruta:
`/var/www/metodologia/campus/`

### 4. Configuración del Servidor (Nginx/Apache)

Si usas Nginx, aplica la configuración adjunta en `nginx.conf`. Si usas Hostinger (Compartido o VPS), asegúrate de que el archivo `.htaccess` permita la redirección al `index.html`.

### 5. Edge Functions de Supabase

Despliega las funciones a tu proyecto de producción:

```bash
supabase functions deploy complete-lesson --project-ref TU_REF
supabase functions deploy create-checkout --project-ref TU_REF
supabase functions deploy stripe-webhook --project-ref TU_REF
```

**Importante:** Configura los secretos en Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🔐 Seguridad y Mantenimiento

- **RLS**: Asegúrate de que las políticas de Row Level Security estén habilitadas en producción.
- **Backups**: Configura backups automáticos en Supabase para las tablas `profiles` y `progress`.

## 📈 SEO y Analytics

Los títulos dinámicos están configurados en `src/router.js`. Puedes añadir el tag de Google Analytics en `index.html` antes del build final.
