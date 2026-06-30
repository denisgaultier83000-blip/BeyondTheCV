import { api, setToken } from "./client";
import { API_ROUTES } from "./routes"; // Supposons que routes.ts exporte les chemins relatifs

export async function login(email: string, password: string) {
  // On utilise la constante centralisée au lieu d'une chaîne de caractères en dur.
  const data = await api<{ token: string }>(API_ROUTES.AUTH.LOGIN, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}
