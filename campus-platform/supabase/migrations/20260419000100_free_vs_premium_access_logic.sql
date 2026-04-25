-- Ajusta la lectura del catalogo para separar acceso free y premium.
-- El progreso (`current_level`) se conserva para gamificacion, no para bloquear lectura.

CREATE OR REPLACE FUNCTION public.can_access_lesson(
  p_level_id INTEGER,
  p_is_free BOOLEAN,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p_is_free, false)
    OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = p_user_id
        AND profile.membership_status = 'active'
    );
$$;
