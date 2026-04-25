# Campus V2

Frontend vestigial de respaldo del Campus, construido con Vite. Se conserva
como fallback/rollback mientras `../campus-platform/` actua como superficie
principal del producto.

## Contenido

- `src/`: interfaz, rutas, estado y logica cliente
- `public/`: assets publicos y ajustes de hosting
- `supabase/`: referencia de compatibilidad hacia `../campus-platform/supabase/`
  y posible estado local del CLI heredado
- `README-DEPLOY.md`: guia de despliegue del frontend legado solo para fallback

## Uso

- Toma como base `./.env.example` para desarrollo
- Usa `./.env.production.example` como referencia para despliegue
- Mantiene `dist/` y `dist-hostinger-deploy.zip` como artefactos generados, no
  como fuente de verdad
- No debe recibir net-new product features salvo que la tarea explicite un
  rollback, un hotfix del respaldo o un ejercicio de preservacion
