import { useState } from "react";
import { API_BASE_URL } from "../config";

interface GeneratorOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useDocumentGenerator({ onSuccess, onError }: GeneratorOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // --- NOUVEAU FLUX ASYNCHRONE (IA -> Draft -> Edit -> PDF) ---

  const startCvAnalysis = async (data: any) => {
    setLoading(true);
    setProgress(10);
    setStatusMessage("Initialisation de l'analyse...");
    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to start generation");
      return await response.json(); // Retourne { task_id: "..." }
    } catch (e: any) {
      if (onError) onError(e.message);
      setLoading(false);
      return null;
    }
  };

  const pollCvStatus = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/status/${taskId}`);
      const data = await response.json();
      
      // Simulation de progression basée sur le temps ou le statut
      if (data.status === "PENDING") {
        setProgress((prev) => (prev < 80 ? prev + 5 : prev)); // Avance doucement jusqu'à 80%
        setStatusMessage("L'IA optimise votre profil...");
      } else if (data.status === "SUCCESS") {
        setProgress(100);
        setStatusMessage("Analyse terminée !");
      }
      
      return data.status; // "PENDING", "SUCCESS", "FAILED"
    } catch (e) {
      return "FAILED";
    }
  };

  const getCvDraft = async (taskId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cv/draft/${taskId}`);
    if (!response.ok) throw new Error("Failed to fetch draft");
    setLoading(false); // Fin du loading initial
    return await response.json();
  };

  const renderFinalPdf = async (cvFinalData: any) => {
    setLoading(true);
    setStatusMessage("Génération du PDF haute qualité...");
    setProgress(90);
    // On réutilise la logique de téléchargement existante mais vers le nouvel endpoint
    await generateDocument("Render Final CV", cvFinalData, "/api/cv/render");
    setLoading(false);
    setProgress(100);
  };

  // --- ANCIEN FLUX (Compatible Legacy) ---
  const generateDocument = async (action: string, payload: any, customEndpoint?: string) => {
    setLoading(true);
    setProgress(0);

    try {
      console.log(`[useDocumentGenerator] Action: ${action}`);
      
      // 1. Préparation des données
      const requestData = action === "Print Questionnaire"
        ? { ...payload, questions_list: payload.questions_list }
        : payload;

      // 2. Appel API
      const endpoint = customEndpoint || `${API_BASE_URL}/api/generate`;
      console.log(`[useDocumentGenerator] Fetching ${endpoint}...`);
      
      const bodyPayload = customEndpoint 
        ? requestData // L'endpoint /render attend directement le JSON CVFinal
        : { action, data: requestData, renderer: "latex" }; // L'endpoint legacy attend { action, data }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
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
    statusMessage,
    generateDocument,
    generateJson,
    // Nouvelles méthodes exposées
    startCvAnalysis,
    pollCvStatus,
    getCvDraft,
    renderFinalPdf
  };
}