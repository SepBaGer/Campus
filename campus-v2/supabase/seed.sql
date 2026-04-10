-- C:\Users\SepBa\Documents\Trabajo Agentico\workspace\campus-v2\supabase\seed.sql

-- 1. Calendario de Eventos Reales (Programa de Empoderamiento)
TRUNCATE TABLE public.events RESTART IDENTITY CASCADE;
INSERT INTO public.events (titulo, descripcion, fecha_inicio, tipo)
VALUES 
('Bienvenida G7: Lanzamiento', 'Sesión de apertura del Programa de Empoderamiento G7.', NOW() + INTERVAL '1 day', 'class'),
('Workshop: Diseño de Sistemas con IA', 'Práctica intensa sobre orquestación de agentes.', NOW() + INTERVAL '4 days', 'workshop'),
('Consultoría Grupal (Office Hours)', 'Resolución de dudas técnicas y estratégicas.', NOW() + INTERVAL '7 days', 'office_hours');

-- Nota: El usuario test@test.com se recomienda crearlo vía Supabase Dashboard o CLI
-- auth.users requiere hashes específicos y extensiones pg_crypto que varían.
-- Se asume que el usuario de prueba persiste o se recrea manualmente.
