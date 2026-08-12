import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const normalizedPath = path.startsWith("http") ? path : `${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(`${API_URL}${normalizedPath}`, {
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
