import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useTranslation } from "react-i18next";

interface Document {
  id: string;
  filename: string;
  type: string;
  created_at: string;
}

interface DocumentsModalProps {
  onClose: () => void;
}

export default function DocumentsModal({ onClose }: DocumentsModalProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/documents`);
      if (!response.ok) throw new Error(t('error_fetch_documents', "Failed to fetch documents"));
      const data = await response.json();
      
      // Filtrer les documents des 3 derniers mois
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentDocs = data.filter((doc: Document) => new Date(doc.created_at) >= threeMonthsAgo);
      setDocuments(recentDocs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/download/${docId}`);
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
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(t('error_delete_failed', "Delete failed"));
      
      setDocuments(prev => prev.filter(d => d.id !== docId));
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

  const getIcon = (type: string) => {
    if (type.includes("PDF")) return "📄";
    if (type.includes("WORD")) return "📝";
    return "📁";
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