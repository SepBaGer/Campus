import { demoSeed } from './demo-data.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createDemoState = () => ({
  tables: {
    profiles: clone(demoSeed.profiles),
    levels: clone(demoSeed.levels),
    lessons: clone(demoSeed.lessons),
    progress: clone(demoSeed.progress),
    comments: clone(demoSeed.comments),
    events: clone(demoSeed.events)
  },
  sessionUserId: demoSeed.sessionUserId,
  authListeners: []
});

const state = createDemoState();

const getProfileById = (id) => state.tables.profiles.find((profile) => profile.id === id) || null;

const getSessionUser = () => {
  const profile = getProfileById(state.sessionUserId);
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    user_metadata: {
      full_name: profile.display_name
    }
  };
};

const emitAuthEvent = (eventName) => {
  const session = { user: getSessionUser() };
  state.authListeners.forEach((listener) => listener(eventName, session));
};

const decorateLesson = (lesson, selectClause) => {
  if (!selectClause || !selectClause.includes('levels(')) return clone(lesson);

  const level = state.tables.levels.find((item) => item.id === lesson.level_id) || null;
  return {
    ...clone(lesson),
    levels: level ? { id: level.id, titulo: level.titulo, orden: level.orden } : null
  };
};

const decorateComment = (comment, selectClause) => {
  const result = clone(comment);

  if (selectClause && selectClause.includes('profiles(')) {
    const profile = getProfileById(comment.user_id);
    result.profiles = profile
      ? {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        }
      : null;
  }

  if (selectClause && selectClause.includes('lessons(')) {
    const lesson = state.tables.lessons.find((item) => item.id === comment.lesson_id) || null;
    result.lessons = lesson ? { titulo: lesson.titulo } : null;
  }

  return result;
};

const applySelectDecorations = (table, rows, selectClause) => {
  if (table === 'lessons') return rows.map((row) => decorateLesson(row, selectClause));
  if (table === 'comments') return rows.map((row) => decorateComment(row, selectClause));
  return rows.map((row) => clone(row));
};

class DemoQueryBuilder {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.selectClause = '*';
    this.filters = [];
    this.sort = null;
    this.limitValue = null;
    this.expectSingle = false;
    this.payload = null;
  }

  select(selectClause = '*') {
    this.selectClause = selectClause;
    return this;
  }

  insert(rows) {
    this.operation = 'insert';
    this.payload = clone(rows);
    return this;
  }

  update(values) {
    this.operation = 'update';
    this.payload = clone(values);
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  order(column, options = {}) {
    this.sort = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  applyFilters(rows) {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        if (filter.type === 'eq') return row[filter.column] === filter.value;
        if (filter.type === 'gt') return row[filter.column] > filter.value;
        return true;
      })
    );
  }

  applySortAndLimit(rows) {
    let result = [...rows];

    if (this.sort) {
      const { column, ascending } = this.sort;
      result.sort((a, b) => {
        if (a[column] === b[column]) return 0;
        return a[column] > b[column] ? (ascending ? 1 : -1) : (ascending ? -1 : 1);
      });
    }

    if (typeof this.limitValue === 'number') {
      result = result.slice(0, this.limitValue);
    }

    return result;
  }

  executeSelect() {
    const rows = state.tables[this.table] || [];
    const filtered = this.applySortAndLimit(this.applyFilters(rows));
    const decorated = applySelectDecorations(this.table, filtered, this.selectClause);

    if (this.expectSingle) {
      return { data: decorated[0] || null, error: decorated[0] ? null : { message: 'No se encontro el registro solicitado.' } };
    }

    return { data: decorated, error: null };
  }

  executeInsert() {
    const rows = state.tables[this.table];
    const inserted = (this.payload || []).map((row) => {
      const nextId = rows.length > 0 ? Math.max(...rows.map((item, index) => typeof item.id === 'number' ? item.id : index + 1)) + 1 : 1;
      const baseRow = {
        id: typeof row.id !== 'undefined' ? row.id : nextId,
        ...row
      };

      if (this.table === 'comments') {
        baseRow.created_at = row.created_at || new Date().toISOString();
      }

      if (this.table === 'progress') {
        baseRow.completed_at = row.completed_at || new Date().toISOString();
      }

      rows.push(baseRow);
      return baseRow;
    });

    const decorated = applySelectDecorations(this.table, inserted, this.selectClause);
    return {
      data: this.expectSingle ? decorated[0] || null : decorated,
      error: null
    };
  }

  executeUpdate() {
    const rows = state.tables[this.table];
    const targets = this.applyFilters(rows);
    const updated = targets.map((row) => {
      Object.assign(row, this.payload || {});
      return row;
    });

    const decorated = applySelectDecorations(this.table, updated, this.selectClause);
    return {
      data: this.expectSingle ? decorated[0] || null : decorated,
      error: null
    };
  }

  execute() {
    if (this.operation === 'insert') return this.executeInsert();
    if (this.operation === 'update') return this.executeUpdate();
    return this.executeSelect();
  }
}

const recalculateDemoProfile = (userId) => {
  const profile = getProfileById(userId);
  if (!profile) return;

  const completedLessons = state.tables.progress.filter((item) => item.user_id === userId);
  const completedLessonIds = new Set(completedLessons.map((item) => item.lesson_id));
  const totalXp = state.tables.lessons
    .filter((lesson) => completedLessonIds.has(lesson.id))
    .reduce((sum, lesson) => sum + (lesson.xp_reward || 0), 0);

  const highestCompletedLevel = state.tables.levels.reduce((maxLevel, level) => {
    const levelLessons = state.tables.lessons.filter((lesson) => lesson.level_id === level.id);
    const allCompleted = levelLessons.length > 0 && levelLessons.every((lesson) => completedLessonIds.has(lesson.id));
    return allCompleted ? Math.max(maxLevel, level.orden) : maxLevel;
  }, 0);

  profile.total_xp = totalXp;
  profile.current_level = Math.max(profile.current_level || 0, highestCompletedLevel || 1);
};

const invokeFunction = async (name, options = {}) => {
  if (name === 'complete-lesson') {
    const user = getSessionUser();
    if (!user) return { data: null, error: { message: 'Debes iniciar sesion.' } };

    const lessonId = options.body?.lesson_id;
    const lesson = state.tables.lessons.find((item) => item.id === lessonId);
    if (!lesson) return { data: null, error: { message: 'La leccion no existe.' } };

    const alreadyCompleted = state.tables.progress.find((item) => item.user_id === user.id && item.lesson_id === lessonId);
    if (!alreadyCompleted) {
      state.tables.progress.push({
        id: state.tables.progress.length + 1,
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString()
      });
      recalculateDemoProfile(user.id);
    }

    return { data: { ok: true, level_up: false }, error: null };
  }

  if (name === 'create-checkout') {
    const user = getProfileById(state.sessionUserId);
    if (user) {
      user.membership_plan = options.body?.plan_code || 'premium';
      user.membership_status = 'active';
    }
    return { data: { url: '#/dashboard' }, error: null };
  }

  return { data: null, error: { message: `Funcion demo no implementada: ${name}` } };
};

export const createDemoSupabaseClient = () => ({
  auth: {
    async signInWithPassword({ email }) {
      const profile = getProfileById(demoSeed.sessionUserId);
      if (profile && email) profile.email = email;
      state.sessionUserId = demoSeed.sessionUserId;
      emitAuthEvent('SIGNED_IN');
      return { data: { user: getSessionUser(), session: { user: getSessionUser() } }, error: null };
    },
    async signUp({ email, options }) {
      const profile = getProfileById(demoSeed.sessionUserId);
      if (profile) {
        profile.email = email || profile.email;
        profile.display_name = options?.data?.full_name || profile.display_name;
      }
      state.sessionUserId = demoSeed.sessionUserId;
      emitAuthEvent('SIGNED_IN');
      return { data: { user: getSessionUser(), session: { user: getSessionUser() } }, error: null };
    },
    async signOut() {
      state.sessionUserId = null;
      emitAuthEvent('SIGNED_OUT');
      return { error: null };
    },
    async getUser() {
      return { data: { user: getSessionUser() }, error: null };
    },
    onAuthStateChange(callback) {
      state.authListeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              state.authListeners = state.authListeners.filter((listener) => listener !== callback);
            }
          }
        }
      };
    }
  },
  from(table) {
    return new DemoQueryBuilder(table);
  },
  functions: {
    async invoke(name, options) {
      return invokeFunction(name, options);
    }
  }
});
