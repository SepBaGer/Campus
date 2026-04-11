import { supabase, supabaseConfig } from './supabase.js';

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
    if (error) throw error;
    return data;
  },

  async register(email, password, fullName) {
    if (!supabaseConfig.enabled) throw new Error(this.getPendingMessage());
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
    return data;
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
