-- Alinea el curriculum del Campus con la nomenclatura exacta de la cartilla del Programa de Empoderamiento en Power Skills.

TRUNCATE TABLE public.lessons RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.levels RESTART IDENTITY CASCADE;

INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex) VALUES
  (1, 0, 'M1 - S1 - Sin costo', 'De Ocupado a Productivo. 2 versiones: Metodo o IA.', 0, '#C9A227'),
  (2, 1, 'S2 - Operativa', 'Bienvenida y Nivelacion. No es modulo; semana operativa.', 250, '#137DC5'),
  (3, 2, 'Parte 1 - Metodo', 'Semanas 3 a 8. Ruta de M2 a M7.', 700, '#C9A227'),
  (4, 3, 'Parte 2 - IA Aplicada', 'Semanas 9 a 15. Ruta de M8 a M13.', 1600, '#D3A00F'),
  (5, 4, 'M14 - S16', 'Empoderamiento. Cierre y Embajadores.', 2800, '#1F2937');

INSERT INTO public.lessons (id, level_id, titulo, contenido_markdown, tipo, orden, duracion_minutos, xp_reward, is_free) VALUES
  (101, 1, 'M1 - S1 - De Ocupado a Productivo', '2 versiones: Metodo o IA. Best Practices y Trabajo Agentico.', 'video', 1, 18, 120, true),

  (201, 2, 'S2 - Operativa - Bienvenida y Nivelacion', 'No es modulo - semana operativa. Configuras entorno, completas Brujula y recibes primeros aceleradores.', 'mixed', 1, 20, 140, false),

  (301, 3, 'M2 - S3 - Del Automatismo a la Presencia', 'Proposito & ROI', 'video', 1, 24, 160, false),
  (302, 3, 'M3 - S4 - De Cumplir a Sorprender', 'Pensamiento Estructurado', 'video', 2, 28, 170, false),
  (303, 3, 'M4 - S5 - De Trabajar Duro a Sin Friccion', 'Deep Research', 'mixed', 3, 30, 180, false),
  (304, 3, 'M5 - S6 - De Caoticos a Estrategicos', 'Systemic Copywriting', 'text', 4, 26, 180, false),
  (305, 3, 'M6 - S7 - De sin Estructura a Alto Desempeno', 'Data Intelligence', 'video', 5, 27, 190, false),
  (306, 3, 'M7 - S8 - De Efectivas a Alto Rendimiento', 'Visual Engine', 'mixed', 6, 29, 190, false),

  (401, 4, 'M8 - S9 - De Bocetos a Prototipos con IA', 'Autonomous Agents', 'video', 1, 31, 210, false),
  (402, 4, 'M9 - S10 - De Convencional a Sorprendente', 'Stack Optimization', 'text', 2, 23, 200, false),
  (403, 4, 'M10 - S11 - Productividad Aumentada', 'No-Code Systems', 'mixed', 3, 25, 210, false),
  (404, 4, 'M11 - S12 - Trabajo Amplificado', 'Custom Engines', 'video', 4, 33, 220, false),
  (405, 4, 'M12 - S13-14 - De Manual a Automatizado', 'Real Solutions', 'mixed', 5, 45, 260, false),
  (406, 4, 'M13 - S15 - Revolucion Digital', 'Presentacion Final', 'video', 6, 20, 240, false),

  (501, 5, 'M14 - S16 - Empoderamiento', 'Cierre & Embajadores', 'video', 1, 19, 220, false);
