-- C:\Users\SepBa\Documents\Trabajo Agentico\workspace\campus-v2\supabase\migrations\20260404000003_xp_logic.sql

-- 1. Función RPC para procesar XP y subir de nivel
CREATE OR REPLACE FUNCTION public.add_xp_and_check_level_up(p_user_id UUID, p_xp_gained INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_level_up BOOLEAN := FALSE;
BEGIN
    -- Obtener estado actual
    SELECT total_xp, current_level INTO v_current_xp, v_current_level
    FROM public.profiles
    WHERE id = p_user_id;

    v_new_xp := v_current_xp + p_xp_gained;

    -- Buscar el nivel más alto que el usuario puede alcanzar con el nuevo XP
    SELECT orden INTO v_new_level
    FROM public.levels
    WHERE xp_required <= v_new_xp
    ORDER BY orden DESC
    LIMIT 1;

    -- Asegurar que el nivel no baje (por si acaso) y que esté dentro del rango 0-9
    IF v_new_level > v_current_level THEN
        v_level_up := TRUE;
    ELSE
        v_new_level := v_current_level;
    END IF;

    -- Actualizar perfil
    UPDATE public.profiles
    SET total_xp = v_new_xp,
        current_level = v_new_level,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN v_level_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Seed de Niveles (Data Maestra FR-02)
INSERT INTO public.levels (orden, titulo, descripcion, color_hex, xp_required)
VALUES 
(0, 'Iniciante', 'Tu primer paso en MetodologIA', '#B2BABB', 0),
(1, 'Explorador', 'Dominando las bases', '#58D68D', 500),
(2, 'Practicante', 'Aplicando herramientas core', '#5DADE2', 1200),
(3, 'Especialista', 'Profundizando en metodologías', '#AF7AC5', 2500),
(4, 'Arquitecto', 'Diseñando soluciones complejas', '#F4D03F', 5000),
(5, 'Estratega', 'Visión integral del sistema', '#EB984E', 8000),
(6, 'Experto', 'Optimización y alto rendimiento', '#E74C3C', 12000),
(7, 'Maestro', 'Liderazgo técnico y mentoría', '#2E4053', 18000),
(8, 'Leyenda', 'Referente en la industria', '#17202A', 25000),
(9, 'Visionario', 'Nivel máximo de trascendencia', '#000000', 40000)
ON CONFLICT (orden) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    xp_required = EXCLUDED.xp_required;
