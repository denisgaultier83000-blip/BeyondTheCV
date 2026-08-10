import { API_BASE_URL } from '../config';
import { readApiErrorMessage } from './errorParser';

/* [CORRECTIF] Définition des types directement dans le fichier pour résoudre l'erreur d'import. */
export interface LoginCredentials {
  email: string;
  password: string;
  isRegistering?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isRegistering: boolean;
}
/**
 * Gère l'inscription d'un nouvel utilisateur.
 */
const registerUser = async (payload: RegisterPayload) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
    const detail = await readApiErrorMessage(response, 'La creation du compte a echoue.');
    throw new Error(detail);
  }
};

/**
 * Gere la connexion et la recuperation du token d'acces.
 * Si `isRegistering` est vrai, il tente d'abord de creer le compte.
 */
export const loginOrRegister = async (payload: LoginCredentials & Partial<RegisterPayload>) => {
  if (payload.isRegistering) {
    await registerUser(payload as RegisterPayload);
  }

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: payload.email, password: payload.password }),
  });

  if (!response.ok) {
    const detail = await readApiErrorMessage(response, 'Identifiants incorrects');
    throw new Error(detail);
  }

  return response.json();
};