-- Seed de agenda para el Programa de Empoderamiento en Power Skills

TRUNCATE TABLE public.events RESTART IDENTITY CASCADE;

INSERT INTO public.events (titulo, descripcion, fecha_inicio, tipo)
VALUES
  ('Sesion en vivo - Brujula MetodologIA', 'Alineacion de expectativas, estructura y foco de las primeras semanas.', NOW() + INTERVAL '1 day', 'class'),
  ('Workshop - Deep Research aplicado', 'Practica guiada para investigar, sintetizar y convertir hallazgos en accion.', NOW() + INTERVAL '4 days', 'workshop'),
  ('Office Hours - Real Solutions', 'Espacio de acompanamiento para destrabar la solucion real que cada estudiante esta construyendo.', NOW() + INTERVAL '7 days', 'office_hours'),
  ('Cierre de cohorte - Presentacion final', 'Sesion de presentacion de soluciones, reflexiones de cierre y camino de embajadores.', NOW() + INTERVAL '12 days', 'class');

-- Nota: los usuarios de prueba deben crearse en Supabase Dashboard o via CLI.
-- auth.users requiere hashes y metadata gestionados por Supabase Auth.
