import type { CourseSnapshot, PortalSnapshot } from "./platform-types";

export const OFFLINE_CACHE_NAME = "campus-offline-v1";

const OFFLINE_DB_NAME = "campus-offline-db";
const OFFLINE_DB_VERSION = 1;
const COURSE_SNAPSHOT_STORE = "course-snapshot";
const PORTAL_SNAPSHOT_STORE = "portal-snapshot";
const OFFLINE_SETTINGS_STORE = "offline-settings";
const PORTAL_SNAPSHOT_KEY = "primary";
const OFFLINE_SETTINGS_KEY = "primary";

export interface OfflineActivationState {
  supported: boolean;
  enabled: boolean;
  cachedAt: string | null;
  routesCached: number;
  courseSlug: string;
  offlineCapableBlocks: number;
}

interface PersistedOfflineState {
  courseSlug: string;
  cachedAt: string;
  routesCached: number;
}

function hasWindow() {
  return typeof window !== "undefined";
}

function dedupeRoutes(routes: string[]) {
  return [...new Set(routes.filter(Boolean))];
}

function normalizeOfflineError(error: unknown) {
  return error instanceof Error ? error : new Error("No pudimos preparar el acceso offline.");
}

function openOfflineDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(COURSE_SNAPSHOT_STORE)) {
        database.createObjectStore(COURSE_SNAPSHOT_STORE);
      }

      if (!database.objectStoreNames.contains(PORTAL_SNAPSHOT_STORE)) {
        database.createObjectStore(PORTAL_SNAPSHOT_STORE);
      }

      if (!database.objectStoreNames.contains(OFFLINE_SETTINGS_STORE)) {
        database.createObjectStore(OFFLINE_SETTINGS_STORE);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("No pudimos abrir IndexedDB."));
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T> | void
) {
  const database = await openOfflineDatabase();

  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = handler(store);

      transaction.oncomplete = () => {
        if (request) {
          resolve(request.result);
          return;
        }

        resolve(undefined);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error(`No pudimos operar ${storeName}.`));
      };

      transaction.onabort = () => {
        reject(transaction.error || new Error(`La operacion sobre ${storeName} fue abortada.`));
      };

      if (request) {
        request.onerror = () => {
          reject(request.error || new Error(`No pudimos operar ${storeName}.`));
        };
      }
    });
  } finally {
    database.close();
  }
}

async function putValue(storeName: string, key: string, value: unknown) {
  await withStore(storeName, "readwrite", (store) => store.put(value, key));
}

async function getValue<T>(storeName: string, key: string) {
  return (await withStore<T>(storeName, "readonly", (store) => store.get(key))) || null;
}

async function deleteValue(storeName: string, key: string) {
  await withStore(storeName, "readwrite", (store) => store.delete(key));
}

async function cacheRoute(cache: Cache, route: string) {
  try {
    const response = await fetch(route, {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      return false;
    }

    await cache.put(route, response.clone());
    return true;
  } catch {
    return false;
  }
}

export function supportsOfflineMode() {
  return hasWindow()
    && "serviceWorker" in navigator
    && "caches" in window
    && "indexedDB" in window;
}

export function buildOfflineRoutePlan(courseSlug: string) {
  return dedupeRoutes([
    "/",
    "/catalogo",
    "/acceso",
    "/portal",
    "/offline",
    "/manifest.webmanifest",
    "/favicon.svg",
    "/push-sw.js",
    "/verify",
    courseSlug ? `/curso/${courseSlug}` : "",
    courseSlug ? `/curso/${courseSlug}/preview` : ""
  ]);
}

export function summarizeOfflineReadiness(course: Pick<CourseSnapshot, "slug" | "blocks"> | null | undefined) {
  const blocks = course?.blocks || [];
  const offlineCapableBlocks = blocks.filter((block) => Boolean(block.rendererManifest.offline_capable)).length;

  return {
    courseSlug: course?.slug || "",
    totalBlocks: blocks.length,
    offlineCapableBlocks,
    canEnable: offlineCapableBlocks > 0
  };
}

export async function registerCampusServiceWorker() {
  if (!supportsOfflineMode()) {
    return null;
  }

  return navigator.serviceWorker.register("/push-sw.js");
}

export async function persistOfflineCourseSnapshot(snapshot: CourseSnapshot) {
  if (!supportsOfflineMode()) {
    return;
  }

  await putValue(COURSE_SNAPSHOT_STORE, snapshot.slug, snapshot);
}

export async function readOfflineCourseSnapshot(slug: string) {
  if (!supportsOfflineMode() || !slug) {
    return null;
  }

  return await getValue<CourseSnapshot>(COURSE_SNAPSHOT_STORE, slug);
}

export async function persistOfflinePortalSnapshot(snapshot: PortalSnapshot) {
  if (!supportsOfflineMode()) {
    return;
  }

  await putValue(PORTAL_SNAPSHOT_STORE, PORTAL_SNAPSHOT_KEY, snapshot);
}

export async function readOfflinePortalSnapshot() {
  if (!supportsOfflineMode()) {
    return null;
  }

  return await getValue<PortalSnapshot>(PORTAL_SNAPSHOT_STORE, PORTAL_SNAPSHOT_KEY);
}

async function persistOfflineState(state: PersistedOfflineState) {
  if (!supportsOfflineMode()) {
    return;
  }

  await putValue(OFFLINE_SETTINGS_STORE, OFFLINE_SETTINGS_KEY, state);
}

async function readOfflineState() {
  if (!supportsOfflineMode()) {
    return null;
  }

  return await getValue<PersistedOfflineState>(OFFLINE_SETTINGS_STORE, OFFLINE_SETTINGS_KEY);
}

export async function getOfflineActivationState(
  courseSlug: string,
  offlineCapableBlocks = 0
): Promise<OfflineActivationState> {
  if (!supportsOfflineMode()) {
    return {
      supported: false,
      enabled: false,
      cachedAt: null,
      routesCached: 0,
      courseSlug,
      offlineCapableBlocks
    };
  }

  const state = await readOfflineState();

  return {
    supported: true,
    enabled: Boolean(state?.courseSlug && state.courseSlug === courseSlug),
    cachedAt: state?.cachedAt || null,
    routesCached: Number(state?.routesCached || 0),
    courseSlug,
    offlineCapableBlocks
  };
}

export async function isOfflineAccessEnabled(courseSlug?: string) {
  if (!supportsOfflineMode()) {
    return false;
  }

  const state = await readOfflineState();
  if (!state?.courseSlug) {
    return false;
  }

  return courseSlug ? state.courseSlug === courseSlug : true;
}

export async function enableOfflineAccess(input: {
  course: CourseSnapshot;
  portal?: PortalSnapshot | null;
}) {
  if (!supportsOfflineMode()) {
    throw new Error("unsupported");
  }

  const readiness = summarizeOfflineReadiness(input.course);
  const registration = await registerCampusServiceWorker();
  if (!registration) {
    throw new Error("unsupported");
  }

  const routes = buildOfflineRoutePlan(input.course.slug);
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  let routesCached = 0;

  for (const route of routes) {
    if (await cacheRoute(cache, route)) {
      routesCached += 1;
    }
  }

  if (routesCached === 0) {
    throw new Error("No pudimos cachear la ruta mientras la conexion estaba disponible.");
  }

  await persistOfflineCourseSnapshot(input.course);
  if (input.portal) {
    await persistOfflinePortalSnapshot(input.portal);
  }

  const state = {
    courseSlug: input.course.slug,
    cachedAt: new Date().toISOString(),
    routesCached,
    offlineCapableBlocks: readiness.offlineCapableBlocks
  };

  await persistOfflineState({
    courseSlug: state.courseSlug,
    cachedAt: state.cachedAt,
    routesCached: state.routesCached
  });

  return state;
}

export async function disableOfflineAccess(courseSlug: string) {
  if (!supportsOfflineMode()) {
    return;
  }

  const routes = buildOfflineRoutePlan(courseSlug);
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await Promise.all(routes.map((route) => cache.delete(route)));
  await deleteValue(COURSE_SNAPSHOT_STORE, courseSlug);
  await deleteValue(PORTAL_SNAPSHOT_STORE, PORTAL_SNAPSHOT_KEY);
  await deleteValue(OFFLINE_SETTINGS_STORE, OFFLINE_SETTINGS_KEY);
}

export function toOfflineFallbackError(error: unknown) {
  return normalizeOfflineError(error);
}
