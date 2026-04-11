const campusMode = (import.meta.env.VITE_CAMPUS_MODE || 'remote').trim().toLowerCase();
const isDemoMode = campusMode === 'demo';
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isHttpsUrl = (value) => /^https:\/\//i.test(value);

const getSupabaseConfigError = () => {
  if (isDemoMode) return null;

  if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
    return 'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para conectar el Campus a Supabase remoto.';
  }

  if (!isHttpsUrl(rawSupabaseUrl)) {
    return 'VITE_SUPABASE_URL debe apuntar a un endpoint remoto con HTTPS.';
  }

  return null;
};

const supabaseError = getSupabaseConfigError();

export const appConfig = {
  mode: campusMode,
  isDemoMode,
  supabase: {
    mode: campusMode,
    isDemo: isDemoMode,
    url: rawSupabaseUrl,
    anonKey: rawSupabaseAnonKey,
    enabled: !supabaseError,
    error: supabaseError
  }
};
