import { useState } from "react";
import { API_BASE_URL } from "../config";

interface GeneratorOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useDocumentGenerator({ onSuccess, onError }: GeneratorOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateDocument = async (action: string, payload: any) => {
    setLoading(true);
    setProgress(0);

    try {
      console.log(`[useDocumentGenerator] Action: ${action}`);
      
      // 1. Préparation des données
      const requestData = action === "Print Questionnaire"
        ? { ...payload, questions_list: payload.questions_list }
        : payload;

      // 2. Appel API
      console.log(`[useDocumentGenerator] Fetching ${API_BASE_URL}/api/generate...`);
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: requestData, renderer: "latex" }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Generation failed: ${errText}`);
      }

      // 3. Gestion du Stream (Barre de progression)
      const reader = response.body?.getReader();
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let receivedLength = 0;
      const chunks = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedLength += value.length;
            if (total > 0) {
              setProgress(Math.round((receivedLength / total) * 100));
            }
          }
        }
      }

      // 4. Création du Blob et Téléchargement
      const isWord = action.includes("Word");
      const extension = isWord ? "docx" : "pdf";
      const mimeType = isWord 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : 'application/pdf';

      const blob = new Blob(chunks, { type: mimeType });
      
      if (blob.size === 0) throw new Error("Generated file is empty.");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${action.replace(/\s+/g, "_").toLowerCase()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onSuccess) onSuccess(`${action} downloaded successfully!`);

    } catch (e: any) {
      console.error("[useDocumentGenerator] Error:", e);
      if (onError) onError(e.message || "Generation failed.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const generateJson = async (action: string, payload: any) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, data: payload }),
        });
        if (!response.ok) throw new Error("Failed to generate data");
        return await response.json();
      } catch (e: any) {
          if (onError) onError(e.message);
          return null;
      } finally {
          setLoading(false);
      }
  };

  return {
    loading,
    progress,
    generateDocument,
    generateJson
  };
}