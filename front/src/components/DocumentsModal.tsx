import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authenticatedFetch } from "../utils/auth";
import { API_ROUTES } from "../api/routes";
import { Briefcase, Calendar, ChevronRight, ArrowLeft, FileText, Mic, MessageSquare, Building, BrainCircuit, Download, Trash2, FolderOpen } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  type: string;
  created_at: string;
}

interface ApplicationSession {
  id: string;
  target_company: string;
  target_job: string;
  created_at: string;
  documents: Document[];
}

interface DocumentsModalProps {
  onClose: () => void;
}

export default function DocumentsModal({ onClose }: DocumentsModalProps) {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<ApplicationSession[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await authenticatedFetch(API_ROUTES.DOCUMENTS.LIST);
      if (!response.ok) throw new Error(t('error_fetch_documents', "Failed to fetch documents"));
      const data = await response.json();
      
      // Filtrer les documents des 3 derniers mois
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentDocs = data.filter((doc: Document) => new Date(doc.created_at) >= threeMonthsAgo);
      
      // [FIX EXPERT] Groupement intelligent à la volée via le nom du fichier (Smart Filename)
      // Permet d'avoir le rendu CRM immédiatement avant même la migration de la BDD.
      const grouped = recentDocs.reduce((acc: any, doc: Document) => {
        const parts = doc.filename.split('_');
        let company = "Général";
        let job = "Poste non spécifié";
        
        if (parts.length >= 4) {
          job = parts[2].replace(/-/g, ' ');
          company = parts[3].replace(/-/g, ' ').replace(/\.[^/.]+$/, "");
        }

        const dateKey = new Date(doc.created_at).toLocaleDateString();
        const groupKey = `${company}-${job}-${dateKey}`;

        if (!acc[groupKey]) {
          acc[groupKey] = { id: groupKey, target_company: company, target_job: job, created_at: doc.created_at, documents: [] };
        }
        acc[groupKey].documents.push(doc);
        return acc;
      }, {});

      setApplications(Object.values(grouped).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const response = await authenticatedFetch(API_ROUTES.DOCUMENTS.DOWNLOAD(docId));
      if (!response.ok) throw new Error(t('error_download_failed', "Download failed"));
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert(t('error_download', "Erreur lors du téléchargement"));
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm(t('confirm_delete_doc', "Êtes-vous sûr de vouloir supprimer ce document ?"))) return;

    try {
      const response = await authenticatedFetch(API_ROUTES.DOCUMENTS.DELETE(docId), {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(t('error_delete_failed', "Delete failed"));
      
      // Mise à jour de l'état groupé
      setApplications(prev => prev.map(app => ({
        ...app,
        documents: app.documents.filter(d => d.id !== docId)
      })).filter(app => app.documents.length > 0)); // Supprime le dossier si vide
      
      if (selectedApp) {
        const updatedDocs = selectedApp.documents.filter(d => d.id !== docId);
        if (updatedDocs.length === 0) setSelectedApp(null);
        else setSelectedApp({ ...selectedApp, documents: updatedDocs });
      }
    } catch (e) {
      console.error(e);
      alert(t('error_delete', "Erreur lors de la suppression"));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Définition visuelle des types de documents
  const getTypeDisplay = (type: string) => {
    if (type.includes("CV")) return { icon: <FileText size={16}/>, label: "CV Optimisé", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" };
    if (type.includes("PITCH")) return { icon: <Mic size={16}/>, label: "Pitch", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" };
    if (type.includes("QUESTIONNAIRE")) return { icon: <MessageSquare size={16}/>, label: "Questions Entretien", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
    if (type.includes("REPORT") || type.includes("MARKET")) return { icon: <Building size={16}/>, label: "Dossier Entreprise", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    if (type.includes("TRAINING") || type.includes("MES")) return { icon: <BrainCircuit size={16}/>, label: "Entraînement", color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" };
    return { icon: <FolderOpen size={16}/>, label: type, color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" };
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1100,
      display: "flex", justifyContent: "center", alignItems: "center",
      backdropFilter: "blur(4px)"
    }}>
      <div className="card" style={{ width: "90%", maxWidth: "800px", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "var(--bleu-fonce)" }}>{t('my_documents_title', '📂 Mes Documents (3 derniers mois)')}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>{t('loading', 'Chargement...')}</p>
          ) : error ? (
            <p style={{ textAlign: "center", color: "var(--danger-text)" }}>{error}</p>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
              <p>{t('no_documents_found', 'Aucun document récent trouvé.')}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "15px", border: "1px solid var(--border-color)", borderRadius: "8px",
                  background: "var(--bg-body)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <div style={{ fontSize: "24px" }}>{getIcon(doc.type)}</div>
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{doc.filename}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(doc.created_at)} • {doc.type}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="btn-secondary"
                        style={{ padding: "5px 10px", fontSize: "16px" }}
                        title={t('download', 'Télécharger')}
                    >
                        ⬇️
                    </button>
                    <button 
                        onClick={() => handleDelete(doc.id)}
                        className="btn-danger"
                        style={{ padding: "5px 10px", fontSize: "16px" }}
                        title={t('delete', 'Supprimer')}
                    >
                        🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}