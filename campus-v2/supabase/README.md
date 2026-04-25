# campus-v2/supabase

Ruta de compatibilidad tras la extraccion del backend activo hacia
`campus-platform/supabase/`.

## Estado actual

- El source of truth backend ya no vive aqui.
- La nueva ubicacion canonica es
  [../../campus-platform/supabase/README.md](../../campus-platform/supabase/README.md).
- Esta carpeta puede seguir conteniendo `.temp/` y `.branches/` del CLI local
  heredado; no los trates como contrato del producto.

## Regla operativa

- No agregues migraciones, funciones ni `config.toml` nuevos aqui.
- Si la tarea toca Supabase, trabaja desde `campus-platform/supabase/`.
- Usa este archivo solo como redirect documental para tooling o agentes viejos
  que todavia recuerden la ruta anterior.
