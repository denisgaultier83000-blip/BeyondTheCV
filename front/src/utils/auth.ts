import { API_BASE_URL } from "../config";
 export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

export const getUser = (): any | null => {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // [FIX] Construit l'URL complète en s'assurant qu'elle est correcte.
  // Si l'URL passée est relative (ex: '/auth/token'), on la préfixe avec l'URL de base de l'API.
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl, { ...options, headers });

  return response;
};