/**
 * @file storageManager.ts
 * @description Wrapper sécurisé pour le localStorage.
 * Gère les cas où l'accès au stockage est bloqué par le navigateur (ex: Tracking Prevention).
 * Expose un état pour permettre à l'UI de réagir.
 */

let isStorageAccessible: boolean | null = null;

const checkStorageAccess = (): boolean => {
  if (isStorageAccessible !== null) return isStorageAccessible;
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    isStorageAccessible = true;
    return true;
  } catch (e) {
    isStorageAccessible = false;
    console.warn("LocalStorage access is denied by the browser.");
    return false;
  }
};

export const storageManager = {
  isAccessible: checkStorageAccess(),

  getItem: (key: string): string | null => {
    if (!storageManager.isAccessible) return null;
    return localStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    if (!storageManager.isAccessible) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to write to localStorage: ${e}`);
    }
  },

  removeItem: (key: string): void => {
    if (!storageManager.isAccessible) return;
    localStorage.removeItem(key);
  },

  clear: (): void => {
    if (!storageManager.isAccessible) return;
    localStorage.clear();
  }
};