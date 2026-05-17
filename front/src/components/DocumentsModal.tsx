import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authenticatedFetch } from "../utils/auth";
import { API_ROUTES } from "../api/routes";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { Briefcase, Calendar, ChevronRight, Trash2, FolderOpen } from 'lucide-react';

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
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Utilisation du nouvel endpoint qui lit la table job_applications en base de données
      const response = await authenticatedFetch(`${API_BASE_URL}/api/applications`);
      if (!response.ok) throw new Error(t('error_fetch_documents', "Failed to fetch applications"));
      
      const data = await response.json();
      setApplications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      
    } catch (e) {
      console.error(e);
      alert(t('error_delete', "Erreur lors de la suppression"));
    }
  };

  // [FIX EXPERT] Fonction pour supprimer un dossier complet (Application)
  const handleDeleteApplication = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation(); // Évite de cliquer sur la carte et de l'ouvrir
    if (!window.confirm(t('confirm_delete_app', "Voulez-vous vraiment supprimer tout ce dossier et son contenu ?"))) return;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/applications/${appId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (e) {
      console.error(e);
      alert(t('error_delete', "Erreur lors de la suppression"));
    }
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {applications.map((app) => (
                    <div 
                      key={app.id} 
                      onClick={() => {
                        onClose();
                        navigate(`/app/recherches/${app.id}`);
                      }}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', color: 'var(--primary)' }}>
                          <Briefcase size={24} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '12px' }}>
                            <Calendar size={12} /> {new Date(app.created_at).toLocaleDateString()}
                          </span>
                          <button onClick={(e) => handleDeleteApplication(e, app.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Supprimer le dossier"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{app.target_company}</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{app.target_job}</p>
                      
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                          {app.documents.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)' }}>Dossier créé (En attente de documents)</span>
                          ) : (
                            <>{app.documents.length} document{app.documents.length > 1 ? 's' : ''} généré{app.documents.length > 1 ? 's' : ''}</>
                          )}
                        </span>
                        <ChevronRight size={18} color="var(--text-muted)" />
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