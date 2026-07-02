/**
 * @file storageManager.ts
 * @description Wrapper sécurisé pour le localStorage/sessionStorage.
 * Gère les cas où l'accès au stockage est bloqué par le navigateur (ex: Tracking Prevention).
 * Expose un état pour permettre à l'UI de réagir et conserve une mémoire de secours.
 */

const createStorageWrapper = (storageFactory: () => Storage | null) => {
  let isAccessible: boolean | null = null;
  const fallbackStore = new Map<string, string>();
  let cachedStorage: Storage | null | undefined;

  const getStorage = (): Storage | null => {
    if (cachedStorage !== undefined) {
      return cachedStorage;
    }

    try {
      cachedStorage = storageFactory();
    } catch (e) {
      cachedStorage = null;
    }

    return cachedStorage;
  };

  const ensureAccessible = (): boolean => {
    if (isAccessible !== null) return isAccessible;

    const storage = getStorage();
    if (!storage) {
      isAccessible = false;
      console.warn('Web Storage is not available in this environment.');
      return isAccessible;
    }

    try {
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      isAccessible = true;
    } catch (e) {
      isAccessible = false;
      console.warn('Web Storage access is denied by the browser.', e);
    }

    return isAccessible;
  };

  return {
    get isAccessible() {
      return ensureAccessible();
    },

    getItem: (key: string): string | null => {
      if (!ensureAccessible()) {
        return fallbackStore.get(key) ?? null;
      }

      const storage = getStorage();
      if (!storage) {
        return fallbackStore.get(key) ?? null;
      }

      try {
        return storage.getItem(key);
      } catch (e) {
        console.warn(`Failed to read from storage for key ${key}:`, e);
        return fallbackStore.get(key) ?? null;
      }
    },

    setItem: (key: string, value: string): void => {
      if (!ensureAccessible()) {
        fallbackStore.set(key, value);
        return;
      }

      const storage = getStorage();
      if (!storage) {
        fallbackStore.set(key, value);
        return;
      }

      try {
        storage.setItem(key, value);
      } catch (e) {
        console.warn(`Failed to write to storage for key ${key}:`, e);
        fallbackStore.set(key, value);
      }
    },

    removeItem: (key: string): void => {
      if (!ensureAccessible()) {
        fallbackStore.delete(key);
        return;
      }

      const storage = getStorage();
      if (storage) {
        try {
          storage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove storage entry for key ${key}:`, e);
        }
      }

      fallbackStore.delete(key);
    },
  };
};

const getBrowserStorage = (type: 'local' | 'session'): Storage | null => {
  if (typeof globalThis === 'undefined') return null;
  try {
    return type === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch (e) {
    return null;
  }
};

export const storageManager = {
  local: createStorageWrapper(() => getBrowserStorage('local')),
  session: createStorageWrapper(() => getBrowserStorage('session')),
};
