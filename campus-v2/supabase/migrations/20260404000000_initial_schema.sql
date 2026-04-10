-- ═══════════════════════════════════════════
-- Tabla: profiles (extiende auth.users)
-- FR-01, FR-09
-- ═══════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 9),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  membership_plan TEXT NOT NULL DEFAULT 'free' CHECK (membership_plan IN ('free', 'basic', 'premium', 'enterprise')),
  membership_status TEXT NOT NULL DEFAULT 'inactive' CHECK (membership_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  stripe_customer_id TEXT UNIQUE,
  membership_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- Tabla: levels (10 niveles de maestría)
-- FR-02
-- ═══════════════════════════════════════════
CREATE TABLE public.levels (
  id SERIAL PRIMARY KEY,
  orden INTEGER NOT NULL UNIQUE CHECK (orden BETWEEN 0 AND 9),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  color_hex TEXT NOT NULL DEFAULT '#FFD700',
  icono TEXT,
  xp_required INTEGER NOT NULL DEFAULT 0,
  prerequisite_level INTEGER REFERENCES public.levels(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- Tabla: lessons (lecciones por nivel)
-- FR-03, FR-05
-- ═══════════════════════════════════════════
CREATE TABLE public.lessons (
  id SERIAL PRIMARY KEY,
  level_id INTEGER NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  contenido_markdown TEXT,
  tipo TEXT NOT NULL DEFAULT 'text' CHECK (tipo IN ('text', 'video', 'pdf', 'mixed')),
  video_url TEXT,
  pdf_url TEXT,
  orden INTEGER NOT NULL,
  duracion_minutos INTEGER DEFAULT 15,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(level_id, orden)
);

-- ═══════════════════════════════════════════
-- Tabla: progress (progreso por usuario)
-- FR-04
-- ═══════════════════════════════════════════
CREATE TABLE public.progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

-- ═══════════════════════════════════════════
-- Tabla: events (calendario)
-- FR-07
-- ═══════════════════════════════════════════
CREATE TABLE public.events (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  url_meeting TEXT,
  tipo TEXT NOT NULL DEFAULT 'class' CHECK (tipo IN ('class', 'workshop', 'webinar', 'office_hours')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- Tabla: comments (comentarios en lecciones)
-- FR-13
-- ═══════════════════════════════════════════
CREATE TABLE public.comments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX idx_lessons_level_orden ON public.lessons(level_id, orden);
CREATE INDEX idx_progress_user ON public.progress(user_id);
CREATE INDEX idx_progress_lesson ON public.progress(lesson_id);
CREATE INDEX idx_events_fecha ON public.events(fecha_inicio);
CREATE INDEX idx_comments_lesson ON public.comments(lesson_id);
