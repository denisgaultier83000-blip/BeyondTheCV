import { API_BASE_URL } from '../config';
import { storageManager } from '../utils/storageManager';
import type { LoginCredentials, RegisterPayload } from '../types/auth';

/**
 * Gère l'inscription d'un nouvel utilisateur.
 */
const registerUser = async (payload: RegisterPayload) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      first_name: payload.firstName,
      last_name: payload.lastName,
    }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'La création du compte a échoué.');
  }
};

/**
 * Gère la connexion et la récupération du token d'accès.
 * Si `isRegistering` est vrai, il tente d'abord de créer le compte.
 */
export const loginOrRegister = async (payload: LoginCredentials & Partial<RegisterPayload>) => {
  if (payload.isRegistering) {
    await registerUser(payload as RegisterPayload);
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: payload.email, password: payload.password }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Identifiants incorrects');
  }

  return response.json();
};