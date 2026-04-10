-- ═══════ PROFILES ═══════
-- Usuarios ven su propio perfil; public para ranking
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles for ranking" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ═══════ LEVELS ═══════
-- Todos pueden ver niveles (public catalog)
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public levels" ON public.levels
  FOR SELECT USING (true);

-- ═══════ LESSONS ═══════
-- Todos los usuarios autenticados ven el catálogo completo (currículo) [F11.5]
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read all lessons" ON public.lessons
  FOR SELECT USING (auth.role() = 'authenticated');

-- ═══════ PROGRESS ═══════
-- Solo el propio usuario ve/escribe su progreso
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own progress select" ON public.progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Own progress insert" ON public.progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════ COMMENTS ═══════
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read lesson comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Insert own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
