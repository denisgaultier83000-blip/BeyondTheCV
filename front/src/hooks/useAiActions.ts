import { useState } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface UseAiActionsProps {
  form: any;
  experiences: any[];
  educations: any[];
  successes: any[];
  failures: any[];
  cvMode: "ATS" | null;
  setCvMode: (mode: "ATS") => void;
  setView: (view: 'stepper' | 'dashboard' | 'review') => void;
  setToast: (toast: any) => void;
  setQuestionsList: (list: any[]) => void;
  setShowQuestionnaire: (show: boolean) => void;
  setPitchData: (data: any) => void;
  setShowPitch: (show: boolean) => void;
  setMissingPitchFields: (fields: string[]) => void;
  setShowPitchMissingInfo: (show: boolean) => void;
  setResearchData: (data: any) => void;
  setActiveResearch: (type: string) => void;
  setGapAnalysis: (data: any) => void;
  setShowGapAnalysisModal: (show: boolean) => void;
  setSalaryData?: (data: any) => void;
  setShowSalaryModal?: (show: boolean) => void;
  researchData: any; // Pour le cache
}

export function useAiActions({
  form, experiences, educations, successes, failures,
  cvMode, setCvMode, setView, setToast,
  setQuestionsList, setShowQuestionnaire,
  setPitchData, setShowPitch, setMissingPitchFields, setShowPitchMissingInfo,
  setResearchData, setActiveResearch, researchData,
  setGapAnalysis, setShowGapAnalysisModal,
  setSalaryData, setShowSalaryModal
}: UseAiActionsProps) {
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [cvAnalysis, setCvAnalysis] = useState<any>(null);

  const payload = { ...form, experiences, educations, successes, failures };

  const handleAction = async (action: string) => {
    setLoading(true);
    setProgress(0);
    setCurrentAction(action);

    // 1. Validation & Routing
    if (action.includes("Generate CV")) {
        setCvMode("ATS");
        setView('review');
        setLoading(false); setCurrentAction(null); return;
    }

    try {
      // 2. Actions spécifiques
      if (action === "Questionnaire") {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/generate`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "Questionnaire", data: payload }),
        });
        if (!res.ok) throw new Error("Failed to authenticatedFetch questions");
        const data = await res.json();
        setQuestionsList(data.questions);
        setShowQuestionnaire(true);
      }
      else if (action === "Pitch") {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/generate`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "Pitch", data: payload }),
        });
        if (!res.ok) throw new Error("Failed to generate pitch");
        const data = await res.json();
        if (data.pitch?.status === "missing_info") {
            setMissingPitchFields(data.pitch.missing_fields);
            setShowPitchMissingInfo(true);
        } else {
            setPitchData(data.pitch);
            setShowPitch(true);
        }
      }
      else if (action === "Market Research" || action === "Company Research") {
        const type = action === "Market Research" ? "market" : "company";
        if (researchData?.[type]) { // Cache hit
            setActiveResearch(type);
        } else {
            // --- NOUVEAU: PIPELINE ASYNCHRONE ---
            try {
                // 1. Démarrer la tâche de fond
                const startRes = await authenticatedFetch(`${API_BASE_URL}/api/research/start`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        target_company: form.target_company,
                        target_industry: form.target_industry,
                        candidate_data: payload
                    }),
                });
                if (!startRes.ok) throw new Error("Failed to start research task");
                const { task_id } = await startRes.json();

                // 2. Attendre la fin de la tâche (polling)
                const poll = async (tid: string): Promise<any> => {
                    const statusRes = await authenticatedFetch(`${API_BASE_URL}/api/tasks/status/${tid}`);
                    const data = await statusRes.json();
                    if (data.status === "SUCCESS") {
                        const resultRes = await authenticatedFetch(`${API_BASE_URL}/api/tasks/result/${tid}`);
                        return resultRes.json();
                    } else if (data.status === "FAILED") {
                        throw new Error("Research task failed on the server.");
                    } else {
                        // Attendre avant de re-vérifier
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return poll(tid);
                    }
                };
                
                const resultData = await poll(task_id);

                // 3. Mettre à jour l'état avec le rapport complet
                setResearchData(resultData);
                // Ouvrir le modal pour le type de recherche demandé
                setActiveResearch(type);

            } catch (e: any) {
                console.error(e);
                setToast({ type: "error", message: e.message || "Full research pipeline failed." });
            }
        }
      }
      else if (action === "Gap Analysis") {
        if (!form.job_description) {
            setToast({ type: "error", message: "Please enter a Job Description first." });
        } else {
            try {
                const res = await authenticatedFetch(`${API_BASE_URL}/api/generate`, { 
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "Gap Analysis", data: payload }),
                });
                if (!res.ok) throw new Error("Analysis failed");
                const data = await res.json();
                setGapAnalysis(data.gap_analysis);
                setShowGapAnalysisModal(true);
            } catch (e) {
                console.error(e);
                setToast({ type: "error", message: "Gap Analysis failed." });
            }
        }
      }
      else if (action === "Salary Estimate") {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/generate`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "Salary Estimate", data: payload }),
        });
        if (!res.ok) throw new Error("Estimation failed");
        const data = await res.json();
        if (setSalaryData) setSalaryData(data.data);
        if (setShowSalaryModal) setShowSalaryModal(true);
      }
    } catch (e: any) {
      console.error(e);
      setToast({ type: "error", message: e.message || "Action failed" });
    } finally {
      setLoading(false); setCurrentAction(null);
    }
  };

  const handleFinalGeneration = async () => {
    if (!cvMode) return;
    setLoading(true); setProgress(0);
    const action = `Generate CV (${cvMode})`;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: payload, renderer: "latex" }),
      });

      if (!response.ok) throw new Error(await response.text());

      // Gestion du téléchargement avec barre de progression simulée via reader
      const reader = response.body?.getReader();
      const chunks = [];
      let loaded = 0;
      const total = parseInt(response.headers.get('content-length') || '0', 10);

      if (reader) {
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              loaded += value.length;
              if (total > 0) setProgress(Math.round((loaded / total) * 100));
          }
      }
      
      const blob = new Blob(chunks, { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${action.replace(/\s+/g, "_").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({ type: "success", message: "Downloaded!" });
      setView('dashboard');
    } catch (e: any) {
      setToast({ type: "error", message: "Generation failed." });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!cvMode) return "";
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: `Generate CV (${cvMode})`, data: payload, renderer: "latex", preview: true }),
      });
      
      if (!res.ok) {
          console.error("Preview failed:", await res.text());
          return "";
      }

      const header = res.headers.get("X-CV-Analysis");
      if (header) setCvAnalysis(JSON.parse(header));
      
      return window.URL.createObjectURL(await res.blob());
    } catch (e) { console.error("Preview error:", e); return ""; }
  };

  return { loading, progress, currentAction, cvAnalysis, handleAction, handleFinalGeneration, handlePreview };
}