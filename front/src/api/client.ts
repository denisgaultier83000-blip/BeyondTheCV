import { storageManager } from '../utils/storageManager';

const API_URL = import.meta.env.VITE_API_URL;

export function getToken() {
  return storageManager.local.getItem("token");
}

export function setToken(token: string) {
  storageManager.local.setItem("token", token);
}

export function clearToken() {
  storageManager.local.removeItem("token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP_${res.status}`);
  }

  return (await res.json()) as T;
}
