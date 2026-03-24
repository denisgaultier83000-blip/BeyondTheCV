import { api, setToken } from "./client";

export async function login(email: string, password: string) {
  const data = await api<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}
