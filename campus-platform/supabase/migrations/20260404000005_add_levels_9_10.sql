-- Migration to add Levels 9 and 10 as per official 10-level spec v3.5
-- Add Level 9
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex)
VALUES (9, 8, 'Escalabilidad Predictiva', 'Domina la automatización de alto impacto y el escalado de ventas mediante IA predictiva.', 35000, '#E5E4E2')
ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, xp_required = EXCLUDED.xp_required;

-- Add Level 10
INSERT INTO public.levels (id, orden, titulo, descripcion, xp_required, color_hex)
VALUES (10, 9, 'Soberanía & Legado', 'Consolidación de tu imperio digital y soberanía tecnológica perpetua.', 60000, '#FFD700')
ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, xp_required = EXCLUDED.xp_required;

-- Add 2 placeholder lessons for Level 9
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free)
VALUES 
(9, 'Infraestructura de Escalamiento', 'Contenido sobre infraestructura...', 'video', 1500, 1, false),
(9, 'Modelos Predictivos de Venta', 'Contenido sobre modelos predictivos...', 'text', 1200, 2, false);

-- Add 2 placeholder lessons for Level 10
INSERT INTO public.lessons (level_id, titulo, contenido_markdown, tipo, xp_reward, orden, is_free)
VALUES 
(10, 'La Cumbre de la Soberanía', 'Contenido sobre soberanía...', 'video', 2500, 1, false),
(10, 'Arquitectura del Legado', 'Diseño del legado digital...', 'text', 3000, 2, false);
