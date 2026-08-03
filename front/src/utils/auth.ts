import { API_BASE_URL } from '../config';

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const getUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const normalizeUrl = (url: string): string => {
  if (url.startsWith('http')) return url;

  const base = API_BASE_URL.replace(/\/+$/, '');
  let path = url.startsWith('/') ? url : `/${url}`;

  if (base.endsWith('/api') && path.startsWith('/api/')) {
    path = path.replace(/^\/api/, '');
  }

  return `${base}${path}`;
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  const fullUrl = normalizeUrl(url);

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const response = await fetch(fullUrl, { ...options, headers });
  return response;
};
