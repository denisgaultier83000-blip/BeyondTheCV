import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, Shield, Briefcase, FileText, Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

// --- Types ---
interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_premium: boolean;
  is_active: boolean;
  credits: number;
}

interface Document {
  id: string;
  filename: string;
  type: string;
  created_at: string;
}

interface Application {
  id: string;
  target_company: string;
  target_job: string;
  created_at: string;
  documents: Document[];
}

export function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Note : Ces endpoints sont à créer côté backend
        const [userRes, appsRes] = await Promise.all([
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}`),
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/applications`)
        ]);

        if (!userRes.ok) throw new Error("Impossible de charger les détails de l'utilisateur.");
        if (!appsRes.ok) throw new Error("Impossible de charger les dossiers de l'utilisateur.");

        setUser(await userRes.json());
        setApplications(await appsRes.json());

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleDeleteApplication = async (appId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce dossier de candidature et tous les documents associés ?")) return;
    
    try { // Note: Endpoint à créer côté backend
      // Note: Endpoint à créer côté backend
      const res = await authenticatedFetch(`${API_BASE_URL}/api/admin/applications/${appId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur lors de la suppression.");
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
        <ArrowLeft size={18} /> Retour au Dashboard
      </button>

      <AsyncBoundary loading={loading} error={error} loadingText="Chargement du profil de l'utilisateur...">
        {user && (
          <>
            {/* --- CARTE D'IDENTITÉ UTILISATEUR --- */}
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--primary)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>{user.first_name} {user.last_name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> {user.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> Inscrit le {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', background: user.is_active ? '#d1fae5' : '#fee2e2', color: user.is_active ? '#065f46' : '#991b1b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={14} /> {user.is_active ? 'Compte Actif' : 'Compte Banni'}</span>
                <span style={{ padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', background: user.is_premium ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-secondary)', color: user.is_premium ? '#b45309' : 'var(--text-muted)', fontWeight: 600 }}>{user.is_premium ? '⭐ Premium' : 'Standard'}</span>
              </div>
            </div>

            {/* --- LISTE DES DOSSIERS DE CANDIDATURE --- */}
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Dossiers de Candidature</h2>
            {applications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {applications.map(app => (
                  <div key={app.id} style={{ background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} /> {app.target_company}</h3>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>{app.target_job}</p>
                      </div>
                      <button onClick={() => handleDeleteApplication(app.id)} title="Supprimer ce dossier" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', background: 'transparent', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {app.documents.length > 0 ? app.documents.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)', padding: '1rem', borderRadius: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FileText size={18} color="var(--primary)" />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.filename}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type: {doc.type}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Note: Endpoint à créer */}
                            <button title="Télécharger" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', background: 'transparent', color: 'var(--text-main)' }}><Download size={16} /></button>
                          </div>
                        </div>
                      )) : (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Aucun document généré pour ce dossier.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                Cet utilisateur n'a encore créé aucun dossier de candidature.
              </div>
            )}
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

```

### Intégration

Pour que cette page soit accessible, vous devez ajouter la route correspondante dans votre fichier de routage principal (probablement `App.tsx`).

Voici la ligne à ajouter dans votre `Routes` :

```typescriptreact
// Dans votre fichier App.tsx, à l'intérieur du composant <Routes>

import { AdminUserDetail } from './components/AdminUserDetail'; // Ajoutez cet import

// ...

<Route path="/admin/user/:userId" element={
  <ProtectedRoute>
    <AdminUserDetail />
  </ProtectedRoute>
} />
```

### Prochaines étapes

Pour que cette page soit pleinement fonctionnelle, les routes API suivantes devront être créées côté backend :

*   `GET /api/admin/users/:userId` : Pour récupérer les informations détaillées d'un utilisateur.
*   `GET /api/admin/users/:userId/applications` : Pour lister tous les dossiers de candidature d'un utilisateur.
*   `DELETE /api/admin/applications/:appId` : Pour permettre à un admin de supprimer un dossier de candidature.

Cette nouvelle page vous donne une vue complète et centralisée de l'activité de chaque utilisateur.

<!--
[PROMPT_SUGGESTION]Peux-tu maintenant créer l'endpoint backend `GET /api/admin/users/:userId` ?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Ajoute une fonction de recherche par email dans le tableau des utilisateurs du dashboard admin.[/PROMPT_SUGGESTION]
-->