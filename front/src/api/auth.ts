import { api, setToken } from "./client";
import { API_ROUTES } from "./routes"; // Supposons que routes.ts exporte les chemins relatifs

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    first_name: string;
    email: string;
    is_admin: boolean;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  // On utilise la constante centralisée au lieu d'une chaîne de caractères en dur.
  const data = await api<LoginResponse>(API_ROUTES.AUTH.LOGIN, {
    method: "POST",
    // Le client 'api' gère la conversion en FormData pour OAuth2PasswordRequestForm
    body: { username: email, password: password },
  });
  setToken(data.access_token);
  return data;
}
