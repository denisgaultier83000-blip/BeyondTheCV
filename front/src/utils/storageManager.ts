/**
 * @file storageManager.ts
 * @description Wrapper sécurisé pour le localStorage/sessionStorage.
 * Gère les cas où l'accès au stockage est bloqué par le navigateur (ex: Tracking Prevention).
 * Expose un état pour permettre à l'UI de réagir et conserve une mémoire de secours.
 */

const createStorageWrapper = (storage: Storage) => {
  let isAccessible: boolean | null = null;
  const fallbackStore = new Map<string, string>();

  const ensureAccessible = (): boolean => {
    if (isAccessible !== null) return isAccessible;

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
      try {
        storage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove storage entry for key ${key}:`, e);
      }
      fallbackStore.delete(key);
    },
  };
};

export const storageManager = {
  local: createStorageWrapper(localStorage),
  session: createStorageWrapper(sessionStorage),
};
