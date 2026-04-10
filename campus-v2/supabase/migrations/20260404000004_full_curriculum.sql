-- Migración F11: Carga Definitiva del Currículo (Fase 11.3)
-- Desglosado en instrucciones individuales para asegurar integridad en cada nivel.

-- 1. Limpieza de secuencias y tablas
TRUNCATE TABLE public.lessons RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.levels RESTART IDENTITY CASCADE;

-- 🏔️ 2. Niveles de la Escalera del Apalancamiento
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (1, 0, 'Claridad del Propósito', 'Definir la visión y misión que guía tu impacto.', 0, '#FFD700');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (2, 1, 'Dominio de la Mentalidad', 'Cultivar una mentalidad inquebrantable para el crecimiento.', 500, '#FFD700');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (3, 2, 'Alineación Estratégica', 'Sincronizar recursos y acciones con un camino definido.', 1200, '#FFD700');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (4, 3, 'Ejecución Amplificada', 'Operar mejor, más rápido y con mayor calidad asistida.', 2500, '#C0C0C0');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (5, 4, 'Optimización Continua', 'Analizar resultados y automatizar iteraciones.', 5000, '#C0C0C0');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (6, 5, 'Apalancamiento en Recursos', 'Multiplicar el impacto usando tiempo y tecnología.', 8000, '#E5E4E2');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (7, 6, 'Influencia Legítima', 'Liderar desde la autenticidad y autoridad digital.', 12000, '#E5E4E2');
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES (8, 7, 'Legado Trascendente', 'Crear valor duradero que beneficia a tu entorno.', 20000, '#FFD700');

-- 🏗️ 3. Masterclasses (Programa de Empoderamiento)
-- Nivel 1
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (1, 'S1 | De Ocupado a Productivo', 'Diseña condiciones que mejoren tu enfoque y aprovechen mejor tu tiempo.', 'text', 100, 1, true);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (1, 'S2 | Del Automatismo a estar En Presencia', 'Distingue entre reaccionar y responder conscientemente.', 'text', 100, 2, true);
-- Nivel 2
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (2, 'S3 | De Trabajar Duro a Trabajar sin Fricción', 'Aprende a diseñar procesos que no te desgasten.', 'text', 150, 1, false);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (2, 'S4 | De Días Caóticos a Jornadas Inteligentes', 'Navegar el caos y sacarle provecho con sistemas resilientes.', 'text', 150, 2, false);
-- Nivel 3
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (3, 'S5 | De Hacer sin Estructura a Alto Desempeño', 'Diseña formas de trabajo sólidas a la vanguardia.', 'text', 200, 1, false);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (3, 'S6 | De Efectividad a Dinámicas de Alto Rendimiento', 'Rendimiento excepcional que (r)evoluciona tus pasiones.', 'text', 200, 2, false);
-- Nivel 4
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (4, 'S7 | De Entregables que Cumplen a Excelencia', 'Crea entregas que construyen tu autoridad profesional.', 'text', 250, 1, false);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (4, 'S8 | De Bocetos A Prototipos con IA', 'Construye empatía profunda con problemas reales para materializar soluciones.', 'text', 250, 2, false);
-- Nivel 5
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (5, 'S9 | De Productividad a Apalancamiento con Agentes', 'Pasa de ser un creador a un multiplicador de impacto.', 'text', 300, 1, false);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (5, 'S10 | De Documentos a Contenido Sorprendente con IA', 'Transforma información compleja en experiencias interactivas.', 'text', 300, 2, false);
-- Nivel 6
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (6, 'S11 | Productividad Aumentada con Asistentes de IA', 'Construye sistemas digitales que te trascienden.', 'text', 400, 1, false);
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (6, 'S12 | De Tareas Manuales a Automatizaciones IA', 'De ejecutora a orquestador mediante automatización autónoma.', 'text', 400, 2, false);
-- Nivel 7
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (7, 'S13 | Entendiendo El Empoderamiento de MetodologIA', 'Consolidación de tu aprendizaje: sabiduría práctica.', 'text', 600, 1, false);
-- Nivel 8
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES (8, 'S14 | Cierre: El fin del principio', 'Cocreación de entornos de abundancia para los demás.', 'text', 1000, 1, false);
