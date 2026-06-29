import { storageManager } from './storageManager';

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

export const removeAuthToken = (): void => {
  storageManager.local.removeItem("token");
  storageManager.local.removeItem("user");
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = storageManager.local.getItem("token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  return response;
};