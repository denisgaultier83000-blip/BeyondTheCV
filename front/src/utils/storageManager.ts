/**
 * @file storageManager.ts
 * @description Wrapper sécurisé pour le localStorage.
 * Gère les cas où l'accès au stockage est bloqué par le navigateur (ex: Tracking Prevention).
 * Expose un état pour permettre à l'UI de réagir.
 */

let isStorageAccessible: boolean | null = null;

const checkStorageAccess = (storage: Storage): boolean => {
  if (isStorageAccessible !== null) return isStorageAccessible;
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    isStorageAccessible = true;
    return true;
  } catch (e) {
    isStorageAccessible = false;
    console.warn("Web Storage access is denied by the browser.");
    return false;
  }
};

const createStorageWrapper = (storage: Storage) => {
  const isAccessible = checkStorageAccess(storage);
  return {
    isAccessible,
    getItem: (key: string): string | null => {
      if (!isAccessible) return null;
      try {
        return storage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      if (!isAccessible) return;
      try {
        storage.setItem(key, value);
      } catch (e) {
        console.error(`Failed to write to storage: ${e}`);
      }
    },
    removeItem: (key: string): void => {
      if (!isAccessible) return;
      try {
        storage.removeItem(key);
      } catch (e) { /* ignore */ }
    },
  };
};

export const storageManager = {
  local: createStorageWrapper(localStorage),
  session: createStorageWrapper(sessionStorage),
};