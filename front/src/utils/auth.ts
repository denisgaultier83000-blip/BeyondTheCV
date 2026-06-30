import { storageManager } from './storageManager';

export const getToken = (): string | null => {
  return storageManager.local.getItem("token");
};

export const isAuthenticated = (): boolean => {
  return !!storageManager.local.getItem("token");
};

export const getUser = (): any | null => {
  const userStr = storageManager.local.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.warn("Corrupted user data in storage.");
    return null;
  }
};

export const removeToken = (): void => {
  storageManager.local.removeItem("token");
  storageManager.local.removeItem("user");
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = storageManager.local.getItem("token");

  // Create a new Headers object, preserving existing headers
  const headers = new Headers(options.headers);

  // Set Authorization header if a token exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Ensure Content-Type is set for methods that have a body, if not already set
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
};