// src/api/pdf.ts
import { getToken, clearToken } from "./client";

const API_URL = import.meta.env.VITE_API_URL;

export async function createCvPdf(payload: any): Promise<Blob> {
  const token = getToken();

  const res = await fetch(`${API_URL}/cv/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP_${res.status}`);
  }

  return await res.blob(); // <- PDF binaire
}
