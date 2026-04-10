# Plan — Campus MetodologIA v2 Technical Specs

> Feature: campus-replatform · Fase 2 · SDD v3.5
> Context: CONSTITUTION.md (v2.0, 12 principios), spec.md (14 FR, 10 NFR), PREMISE.md (17 premisas)

---

## Arquitectura General

### Modelo de Arquitectura: SPA Estática + BaaS

```
┌─────────────────────────────────────────────────────────────┐
│                    metodologia.info                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ Sitio Estático│    │          /campus/ (SPA)           │   │
│  │ HTML/Tailwind │    │   Vite + Vanilla JS (hash-route) │   │
│  │ Components/   │    │   ┌────────┐ ┌─────┐ ┌────────┐ │   │
│  │  SiteHeader   │    │   │ Topbar │ │Store│ │ Router │ │   │
│  │  SiteFooter   │    │   └────────┘ └──┬──┘ └────────┘ │   │
│  └──────────────┘    │                 │ Supabase JS    │   │
│                      └─────────────────┼────────────────┘   │
└────────────────────────────────────────┼────────────────────┘
                                         │ HTTPS / JWT
                                         ▼
                         ┌───────────────────────────┐
                         │      Supabase (BaaS)       │
                         │  ┌────────┐ ┌───────────┐  │
                         │  │  Auth  │ │ PostgreSQL │  │
                         │  │  JWT   │ │    + RLS   │  │
                         │  └────────┘ └───────────┘  │
                         │  ┌────────┐ ┌───────────┐  │
                         │  │ Edge   │ │  Storage   │  │
                         │  │ Funcs  │ │  (media)   │  │
                         │  └────────┘ └───────────┘  │
                         └──────────┬────────────────┘
                                    │ Webhooks
                                    ▼
                         ┌─────────────────┐
                         │   Stripe API    │
                         │   (Payments)    │
                         └─────────────────┘
```

**Decisiones arquitectónicas:** `[DOC]` `[CODE]`
- SPA Vite con hash routing (`#/`) desplegada como subcarpeta estática [Principio V — Un Solo Login]
- Supabase como única fuente de verdad para auth, datos y lógica [Principio III — Backend como Fuente de Verdad]
- Stripe Checkout (hosted) para PCI compliance [Principio III, NFR-09]

---

## Modelo de Datos (PostgreSQL + Supabase)

### Esquema Relacional

```sql
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
```

### Row Level Security (RLS) Policies

```sql
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
-- Solo lecciones del nivel desbloqueado [Principio III]
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Free lessons" ON public.lessons
  FOR SELECT USING (is_free = true);

CREATE POLICY "Unlocked lessons for members" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.membership_status = 'active'
        AND (SELECT l.orden FROM public.levels l WHERE l.id = lessons.level_id) <= p.current_level
    )
  );

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
```

### Índices de Performance

```sql
CREATE INDEX idx_lessons_level_orden ON public.lessons(level_id, orden);
CREATE INDEX idx_progress_user ON public.progress(user_id);
CREATE INDEX idx_progress_lesson ON public.progress(lesson_id);
CREATE INDEX idx_events_fecha ON public.events(fecha_inicio);
CREATE INDEX idx_comments_lesson ON public.comments(lesson_id);
```

---

## API Contracts (Supabase REST + Edge Functions)

### Endpoints REST Autogenerados (PostgREST)

| Method | Endpoint | FR | Auth | Description |
|--------|----------|-----|------|-------------|
| `GET` | `/rest/v1/levels?order=orden.asc` | FR-02 | Public | Lista de 10 niveles |
| `GET` | `/rest/v1/lessons?level_id=eq.{n}&order=orden.asc` | FR-03 | JWT | Lecciones por nivel (RLS filtra) |
| `GET` | `/rest/v1/lessons?id=eq.{id}` | FR-03 | JWT | Lección individual |
| `GET` | `/rest/v1/progress?user_id=eq.{uid}` | FR-04 | JWT | Progreso del usuario |
| `POST` | `/rest/v1/progress` | FR-04 | JWT | Marcar lección completada |
| `GET` | `/rest/v1/profiles?order=total_xp.desc&limit=50` | FR-06 | Public | Ranking top 50 |
| `GET` | `/rest/v1/profiles?id=eq.{uid}` | FR-09 | JWT | Perfil propio |
| `PATCH` | `/rest/v1/profiles?id=eq.{uid}` | FR-09 | JWT | Actualizar perfil |
| `GET` | `/rest/v1/events?fecha_inicio=gte.{date}&order=fecha_inicio.asc` | FR-07 | JWT | Eventos futuros |
| `GET` | `/rest/v1/comments?lesson_id=eq.{id}&order=created_at.asc` | FR-13 | JWT | Comentarios de lección |
| `POST` | `/rest/v1/comments` | FR-13 | JWT | Agregar comentario |

### Edge Functions

```
supabase/functions/
├── complete-lesson/        # FR-04: Marcar lección + calcular XP + level up
│   └── index.ts            # Validación server-side de progreso
├── stripe-webhook/         # FR-11: Procesar pagos → actualizar membresía
│   └── index.ts            # Verificar signature, actualizar profiles
├── create-checkout/        # FR-11: Crear Stripe Checkout Session
│   └── index.ts            # Stripe API → return session URL
└── send-welcome/           # FR-14: Email de bienvenida post-registro
    └── index.ts            # Trigger Supabase Auth → Resend API
```

#### Edge Function: `complete-lesson`
```
POST /functions/v1/complete-lesson
Body: { lesson_id: number }
Auth: Bearer JWT

Logic:
1. Verify user has access to lesson (membership + level check)
2. Check if already completed (idempotent)
3. Insert progress record
4. Add XP to profiles.total_xp
5. Check if level_up triggered (xp >= next_level.xp_required)
6. If level_up → update profiles.current_level
7. Return { xp_earned, new_total_xp, level_up: boolean, new_level? }
```

#### Edge Function: `stripe-webhook`
```
POST /functions/v1/stripe-webhook
Headers: stripe-signature
Body: Stripe Event payload

Events handled:
- checkout.session.completed → activate membership
- customer.subscription.updated → update plan/status
- customer.subscription.deleted → deactivate membership
- invoice.payment_failed → set status = 'past_due'
```

---

## Componentes Frontend (Vite + Vanilla JS)

### Arquitectura de Componentes

```
Campus_MetodologIA/
├── index.html                  # Shell SPA + #router-view
├── main.js                     # Init: store, router, supabase client
├── vite.config.js              # base: '/campus/'
├── style.css                   # Design system tokens + components
├── src/
│   ├── supabase.js             # [NEW] Supabase client init
│   ├── auth.js                 # [NEW] Auth state management
│   ├── router.js               # [MODIFY] Add route guards
│   ├── store.js                # [MODIFY] Replace mock → Supabase fetch
│   ├── components/
│   │   ├── Topbar.js           # [MODIFY] Add level+XP indicator
│   │   ├── Sidebar.js          # [MODIFY] Add active route highlighting  
│   │   ├── Logo.js             # Existing — no changes
│   │   ├── ProgressBar.js      # [NEW] Reusable progress component
│   │   └── LessonCard.js       # [NEW] Card component for lesson list
│   └── pages/
│       ├── Dashboard.js        # [MODIFY] Real data from store
│       ├── Aula.js             # [MODIFY] Fetch lessons from Supabase
│       ├── Leccion.js          # [NEW] Lesson player page
│       ├── Ranking.js          # [MODIFY] Fetch from profiles
│       ├── Calendario.js       # [MODIFY] Fetch from events
│       ├── Comunidad.js        # [MODIFY] External embed/link
│       ├── Configuracion.js    # [MODIFY] Edit profile via Supabase
│       ├── Login.js            # [NEW] Auth page (register + login)
│       └── Planes.js           # [NEW] Pricing + Stripe checkout
```

### Router Guards [Principio III — No Security via JS]

```javascript
// router.js — Route guard pattern
const PROTECTED_ROUTES = ['#/aula', '#/ranking', '#/calendario', '#/configuracion', '#/comunidad'];
const AUTH_ROUTES = ['#/login', '#/planes'];

handleRoute() {
  const hash = window.location.hash || '#/dashboard';
  const isProtected = PROTECTED_ROUTES.some(r => hash.startsWith(r));
  const isAuth = AUTH_ROUTES.some(r => hash.startsWith(r));
  const user = supabase.auth.getUser();

  if (isProtected && !user) {
    return this.navigate('#/login');  // UX guard, not security
  }
  if (isAuth && user) {
    return this.navigate('#/dashboard');
  }
  // ... render route
}
```

> ⚠️ **[Principio III]:** Los route guards son UX, no seguridad. La protección real es RLS en Supabase. Un usuario que manipule el hash no verá datos protegidos porque PostgREST rechazará el query.

### Store: Mock → Supabase [MODIFY]

```javascript
// store.js — New pattern
import { supabase } from './supabase.js';

export const store = {
  state: { user: null, levels: [], progress: [], loading: true },
  
  async init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [levels, progress, profile] = await Promise.all([
        supabase.from('levels').select('*').order('orden'),
        supabase.from('progress').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);
      this.state = { user: profile.data, levels: levels.data, progress: progress.data, loading: false };
    }
    this.notify();
  },

  async completeLesson(lessonId) {
    const { data } = await supabase.functions.invoke('complete-lesson', { body: { lesson_id: lessonId } });
    if (data.level_up) { /* XP animation + level up toast */ }
    await this.init(); // Refresh from source of truth
  }
};
```

---

## Estrategia de Deploy

### Build + Deploy Pipeline

```
1. npm run build           → dist/ con chunks optimizados
2. scp dist/* hostinger:/campus/   → Subir a Hostinger
3. .htaccess en /campus/:
   RewriteEngine On
   RewriteBase /campus/
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /campus/index.html [L]
```

### Compatibilidad con .htaccess existente

El `.htaccess` del sitio raíz ya tiene reglas de rewrite, CSP y caching. El `/campus/` necesita su propio `.htaccess` porque Vite SPA requiere fallback a `index.html` para rutas client-side.

**[Principio V]:** El JWT de Supabase se almacena en `localStorage` bajo el dominio `metodologia.info`, compartido entre el sitio principal y `/campus/`.

---

## Trazabilidad FR → Componente → Tabla

| FR | Componente Frontend | Tabla(s) | Edge Function |
|----|-------------------|----------|---------------|
| FR-01 | Login.js, auth.js | auth.users, profiles | — |
| FR-02 | Dashboard.js, Aula.js | levels | — |
| FR-03 | Aula.js, Leccion.js | lessons (RLS) | — |
| FR-04 | Leccion.js, store.js | progress, profiles | complete-lesson |
| FR-05 | Leccion.js | lessons | — |
| FR-06 | Ranking.js | profiles | — |
| FR-07 | Calendario.js | events | — |
| FR-08 | Comunidad.js | — (external) | — |
| FR-09 | Configuracion.js | profiles | — |
| FR-10 | Supabase Dashboard | all tables | — |
| FR-11 | Planes.js | profiles | stripe-webhook, create-checkout |
| FR-12 | Dashboard.js | levels | — |
| FR-13 | Leccion.js | comments | — |
| FR-14 | — (automated) | — | send-welcome |

---

## Dependencias Externas

| Dependencia | Versión | Propósito | Evidence |
|------------|---------|-----------|----------|
| `vite` | ^6.x | Build tool + dev server | `[CODE]` — ya en package.json |
| `@supabase/supabase-js` | ^2.x | Cliente JS para Supabase | `[DOC]` — SDK oficial |
| `lucide` | latest | Iconografía | `[CODE]` — ya en uso |
| Poppins, Montserrat | — | Tipografías (Google Fonts) | `[CODE]` — ya en CSS |
| Stripe.js | v3 | Payment form | `[DOC]` — Stripe Checkout hosted |

**Sin framework JS adicional** — Vanilla JS puro [Principio I, Principio VIII]

---

*Campus MetodologIA v2 · Plan · SDD v3.5*
*Fase 2 — Technical Specs · 2026-04-04*
