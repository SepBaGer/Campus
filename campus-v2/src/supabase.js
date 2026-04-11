import { createClient } from '@supabase/supabase-js';
import { appConfig } from './config.js';
import { createDemoSupabaseClient } from './demo-supabase.js';

const createDisabledClient = (message) => {
  const buildError = () => new Error(message);

  return {
    auth: {
      async signInWithPassword() {
        return { data: null, error: buildError() };
      },
      async signUp() {
        return { data: null, error: buildError() };
      },
      async signOut() {
        return { error: buildError() };
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {}
            }
          }
        };
      }
    },
    from() {
      throw buildError();
    },
    functions: {
      async invoke() {
        throw buildError();
      }
    }
  };
};

export const supabaseConfig = appConfig.supabase;

export const supabase = supabaseConfig.isDemo
  ? createDemoSupabaseClient()
  : supabaseConfig.enabled
    ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : createDisabledClient(supabaseConfig.error);
