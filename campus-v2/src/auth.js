import { supabase, supabaseConfig } from './supabase.js';

const FRIENDLY_AUTH_ERRORS = {
  over_email_send_rate_limit: 'Ya enviamos un correo recientemente. Espera unos minutos antes de volver a intentarlo.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesion.',
  invalid_credentials: 'Tus credenciales no son validas. Verifica email y contrasena.',
  user_already_exists: 'Ya existe una cuenta con este correo. Intenta iniciar sesion o confirmar tu email.'
};

const GENERIC_RESEND_MESSAGE = 'Si existe una cuenta pendiente para este correo, te enviamos una nueva confirmacion. Revisa tu bandeja principal y spam.';

const normalizeAuthError = (error, fallbackMessage = 'Ocurrio un error. Intentalo de nuevo.') => {
  if (!error) return fallbackMessage;

  const errorCode = String(error.code || '').trim();
  const errorMessage = String(error.message || '').trim();

  if (errorCode && FRIENDLY_AUTH_ERRORS[errorCode]) {
    return FRIENDLY_AUTH_ERRORS[errorCode];
  }

  if (/email rate limit exceeded/i.test(errorMessage)) {
    return FRIENDLY_AUTH_ERRORS.over_email_send_rate_limit;
  }

  if (/email not confirmed/i.test(errorMessage)) {
    return FRIENDLY_AUTH_ERRORS.email_not_confirmed;
  }

  if (/invalid login credentials/i.test(errorMessage)) {
    return FRIENDLY_AUTH_ERRORS.invalid_credentials;
  }

  if (/user already registered/i.test(errorMessage) || /already exists/i.test(errorMessage)) {
    return FRIENDLY_AUTH_ERRORS.user_already_exists;
  }

  return errorMessage || fallbackMessage;
};

export const AuthService = {
  isConfigured() {
    return supabaseConfig.enabled;
  },

  getPendingMessage() {
    return 'El acceso se activara cuando conectemos el despliegue al proyecto remoto de Supabase.';
  },

  async login(email, password) {
    if (!supabaseConfig.enabled) throw new Error(this.getPendingMessage());
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(normalizeAuthError(error));
    return data;
  },

  async register(email, password, fullName) {
    if (!supabaseConfig.enabled) throw new Error(this.getPendingMessage());
    const emailRedirectTo = typeof window !== 'undefined'
      ? window.location.origin
      : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {})
      }
    });
    if (error) throw new Error(normalizeAuthError(error));

    return {
      ...data,
      requiresEmailConfirmation: !data?.session,
      friendlyMessage: !data?.session
        ? 'Cuenta creada. Si ya existia, te reenviamos la confirmacion. Revisa tu correo antes de iniciar sesion.'
        : null
    };
  },

  async resendSignupConfirmation(email) {
    if (!supabaseConfig.enabled) throw new Error(this.getPendingMessage());

    const emailRedirectTo = typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined
    });

    if (error) {
      const normalizedMessage = normalizeAuthError(error);

      if (normalizedMessage === FRIENDLY_AUTH_ERRORS.over_email_send_rate_limit) {
        throw new Error(normalizedMessage);
      }

      return {
        message: GENERIC_RESEND_MESSAGE
      };
    }

    return {
      message: GENERIC_RESEND_MESSAGE
    };
  },

  async logout() {
    if (!supabaseConfig.enabled) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async signOut() {
    return this.logout();
  },

  async getCurrentUser() {
    if (!supabaseConfig.enabled) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback) {
    if (!supabaseConfig.enabled) {
      return {
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      };
    }
    return supabase.auth.onAuthStateChange(callback);
  }
};
