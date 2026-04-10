import { supabase } from './supabase.js'

export const AuthService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  
  async register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    if (error) throw error
    return data
  },
  
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async signOut() {
    return this.logout()
  },
  
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
