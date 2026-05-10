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

      setApplications(Object.values(grouped).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as ApplicationSession[]);
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
      <div className="card" style={{ width: "90%", maxWidth: "900px", height: "85vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", background: "var(--bg-body)" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "var(--text-main)", display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={24} color="var(--primary)" /> {t('my_documents_title', 'Mon Espace Candidature')}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <p style={{ color: "var(--text-muted)" }}>{t('loading', 'Chargement de vos dossiers...')}</p>
            </div>
          ) : error ? (
            <p style={{ textAlign: "center", color: "var(--danger-text)" }}>{error}</p>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <FolderOpen size={64} style={{ opacity: 0.2, margin: '0 auto 20px auto' }} />
              <p>{t('no_documents_found', 'Aucune candidature récente trouvée.')}</p>
            </div>
          ) : (
            <>
              {!selectedApp ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {applications.map((app) => (
                    <div 
                      key={app.id} 
                      onClick={() => setSelectedApp(app)}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', color: 'var(--primary)' }}>
                          <Briefcase size={24} />
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '12px' }}>
                          <Calendar size={12} /> {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{app.target_company}</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{app.target_job}</p>
                      
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                          {app.documents.length} document{app.documents.length > 1 ? 's' : ''}
                        </span>
                        <ChevronRight size={18} color="var(--text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="fade-in">
                <button 
                  onClick={() => setSelectedApp(null)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: '20px', fontWeight: 600 }}
                >
                  <ArrowLeft size={18} /> Retour aux dossiers
                </button>
                
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: 'var(--text-main)' }}>Candidature : {selectedApp.target_company}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Poste visé : {selectedApp.target_job}</p>
                </div>

                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Document</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Fichier</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', width: '120px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApp.documents.map((doc) => {
                        const typeDisplay = getTypeDisplay(doc.type);
                        return (
                          <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: typeDisplay.bg, color: typeDisplay.color, padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                {typeDisplay.icon} {typeDisplay.label}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>{doc.filename}</td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => handleDownload(doc.id, doc.filename)} style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--text-main)' }} title="Télécharger"><Download size={16} /></button>
                                <button onClick={() => handleDelete(doc.id)} style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--danger-text)' }} title="Supprimer"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}