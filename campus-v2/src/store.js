import { supabase } from './supabase.js';

export const store = {
  state: { user: null, levels: [], lessons: [], progress: [], loading: true, errors: null },
  listeners: [],

  async init() {
    this.state = { ...this.state, loading: true };

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        this.state = { user: null, levels: [], lessons: [], progress: [], loading: false, errors: null };
        this.notify();
        return;
      }

      const [levels, lessons, progress, profile] = await Promise.all([
        supabase.from('levels').select('*').order('orden'),
        supabase.from('lessons').select('*').order('orden'),
        supabase.from('progress').select('*').eq('user_id', authUser.id),
        supabase.from('profiles').select('*').eq('id', authUser.id).single()
      ]);

      if (levels.error || lessons.error || progress.error || profile.error) {
        console.error('[store] Error loading initial state:', {
          levels: levels.error?.message,
          lessons: lessons.error?.message,
          progress: progress.error?.message,
          profile: profile.error?.message
        });
      }

      this.state = {
        user: profile.data
          ? { ...profile.data, email: authUser.email }
          : {
              id: authUser.id,
              email: authUser.email,
              display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Estudiante',
              membership_plan: 'free',
              membership_status: 'inactive',
              current_level: 0,
              total_xp: 0,
              bio: ''
            },
        levels: levels.data || [],
        lessons: lessons.data || [],
        progress: progress.data || [],
        loading: false,
        errors: {
          levels: levels.error?.message || null,
          lessons: lessons.error?.message || null,
          progress: progress.error?.message || null,
          profile: profile.error?.message || null
        }
      };
    } catch (error) {
      console.error('[store] Unexpected init error:', error);
      this.state = {
        user: null,
        levels: [],
        lessons: [],
        progress: [],
        loading: false,
        errors: { global: error.message }
      };
    }

    this.notify();
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify() {
    this.listeners.forEach((listener) => listener());
  },

  isMembershipActive(user = this.state.user) {
    return user?.membership_status === 'active';
  },

  getLevel(levelId) {
    return this.state.levels.find((level) => level.id === levelId) || null;
  },

  isLevelUnlocked(levelId, user = this.state.user) {
    const level = this.getLevel(levelId);
    if (!level) return false;
    return (user?.current_level ?? -1) >= level.orden;
  },

  canAccessLesson(lesson, user = this.state.user) {
    if (!lesson) return false;
    if (lesson.is_free) return true;
    return this.isMembershipActive(user) && this.isLevelUnlocked(lesson.level_id, user);
  },

  async completeLesson(lessonId) {
    try {
      const { data, error } = await supabase.functions.invoke('complete-lesson', {
        body: { lesson_id: lessonId }
      });

      if (error) throw new Error(error.message);
      if (data?.level_up) console.info('[store] Level up alcanzado.');
      return data;
    } catch (error) {
      console.error('[store] Lesson completion failed:', error.message);
      throw error;
    } finally {
      await this.init();
    }
  },

  getProgressStats() {
    const levels = this.state.levels || [];
    const lessons = this.state.lessons || [];
    const progress = this.state.progress || [];

    if (levels.length === 0 && lessons.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const completed = progress.length;
    const total = lessons.length > 0 ? lessons.length : 0;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
};
