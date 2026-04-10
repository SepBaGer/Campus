TRUNCATE TABLE public.lessons CASCADE;
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free) VALUES
(1, 'S1 | De Ocupado a Productivo', 'Diseña condiciones que mejoren tu enfoque y aprovechen mejor tu tiempo.', 'text', 100, 1, true),
(1, 'S2 | Del Automatismo a estar En Presencia', 'Distingue entre reaccionar y responder conscientemente.', 'text', 100, 2, true),
(2, 'S3 | De Trabajar Duro a Trabajar sin Fricción', 'Aprende a diseñar procesos que no te desgasten.', 'text', 150, 3, false),
(2, 'S4 | De Días Caóticos a Jornadas Inteligentes', 'Navegar el caos y sacarle provecho con sistemas resilientes.', 'text', 150, 4, false),
(3, 'S5 | De Hacer sin Estructura a Alto Desempeño', 'Diseña formas de trabajo sólidas a la vanguardia.', 'text', 200, 5, false),
(3, 'S6 | De Efectividad a Dinámicas de Alto Rendimiento', 'Rendimiento excepcional que (r)evoluciona tus pasiones.', 'text', 200, 6, false),
(4, 'S7 | De Entregables que Cumplen a Excelencia', 'Crea entregas que construyen tu autoridad profesional.', 'text', 250, 7, false),
(4, 'S8 | De Bocetos A Prototipos con IA', 'Construye empatía profunda con problemas reales para materializar soluciones.', 'text', 250, 8, false),
(5, 'S9 | De Productividad a Apalancamiento con Agentes', 'Pasa de ser un creador a un multiplicador de impacto.', 'text', 300, 9, false),
(5, 'S10 | De Documentos a Contenido Sorprendente con IA', 'Transforma información compleja en experiencias interactivas.', 'text', 300, 10, false),
(6, 'S11 | Productividad Aumentada con Asistentes de IA', 'Construye sistemas digitales que te trascienden.', 'text', 400, 11, false),
(6, 'S12 | De Tareas Manuales a Automatizaciones IA', 'De ejecutora a orquestador mediante automatización autónoma.', 'text', 400, 12, false),
(7, 'S13 | Entendiendo El Empoderamiento de MetodologIA', 'Consolidación de tu aprendizaje: sabiduría práctica.', 'text', 600, 13, false),
(8, 'S14 | Cierre: El fin del principio', 'Cocreación de entornos de abundancia para los demás.', 'text', 1000, 14, false);
