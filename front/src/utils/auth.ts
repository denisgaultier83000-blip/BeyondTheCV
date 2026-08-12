import { API_BASE_URL } from '../config';
import { storageManager } from './storageManager';

export const isAuthenticated = (): boolean => {
  return !!storageManager.local.getItem('token');
};

export const getUser = (): any | null => {
  const userStr = storageManager.local.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const removeAuthToken = (): void => {
  storageManager.local.removeItem('token');
  storageManager.local.removeItem('user');
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
  const token = storageManager.local.getItem('token');
  const fullUrl = normalizeUrl(url);

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const response = await fetch(fullUrl, { ...options, headers });
  return response;
};
