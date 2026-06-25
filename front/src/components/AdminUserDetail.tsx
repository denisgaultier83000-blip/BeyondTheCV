import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Shield, Briefcase, FileText, Download, Trash2, DollarSign, Clock, PlusCircle, Repeat, RefreshCw, UserX } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

// --- Types ---
// [MODIFIÉ] Enrichissement du type pour correspondre aux spécifications
interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  last_login: string;
  is_premium: boolean;
  is_active: boolean;
  // Métriques de rentabilité
  offer_name: string; // Ex: 'Stratégique'
  purchase_date: string;
  expiration_date: string;
  total_ia_cost: number;
  // Métriques d'usage
  sessions_consumed: number;
  sessions_remaining: number;
  login_count: number;
  current_funnel_step: string; // Ex: 'Étape 4: Expériences'
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
  // [AJOUT] État pour les notes internes
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    const adminEmail = import.meta.env.VITE_REACT_APP_ADMIN_EMAIL;
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(userStr);
    const userEmail = user?.email;

    if (!adminEmail || !userEmail || userEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      navigate('/'); // Redirection si non-admin
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // [MODIFIÉ] Ajout de l'endpoint pour les notes
        const [userRes, appsRes, notesRes] = await Promise.all([
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}`),
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/applications`),
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/notes`) // Endpoint à créer
        ]);

        if (!userRes.ok) throw new Error("Impossible de charger les détails de l'utilisateur.");
        if (!appsRes.ok) throw new Error("Impossible de charger les dossiers de l'utilisateur.");

        setUser(await userRes.json());
        setApplications(await appsRes.json());
        if (notesRes.ok) setInternalNotes((await notesRes.json()).notes);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, navigate]);

  const handleDeleteApplication = async (appId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce dossier de candidature et tous les documents associés ?")) return;
    
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/admin/applications/${appId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur lors de la suppression.");
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // [AJOUT] Sauvegarde des notes internes
  const handleSaveNotes = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: internalNotes })
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde des notes.");
      alert("Notes sauvegardées !");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // [AJOUT] Placeholder pour les actions admin
  const handleAdminAction = (action: string) => alert(`Action non implémentée : ${action}`);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
        <ArrowLeft size={18} /> Retour au Dashboard
      </button>

      <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement du profil de l'utilisateur...">
        {user && (
          <>
            {/* --- CARTE D'IDENTITÉ UTILISATEUR --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
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
                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-2 ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><Shield size={14} /> {user.is_active ? 'Actif' : 'Bloqué'}</span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-2 ${user.is_premium ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>⭐ {user.offer_name || (user.is_premium ? 'Premium' : 'Standard')}</span>
              </div>
            </div>

            {/* --- INDICATEURS CLÉS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <div className="text-xs text-slate-500 uppercase font-semibold">Coût IA</div>
                <div className="text-2xl font-bold text-red-600">{user.total_ia_cost.toFixed(2)} €</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <div className="text-xs text-slate-500 uppercase font-semibold">Séances</div>
                <div className="text-2xl font-bold">{user.sessions_consumed} / {user.sessions_consumed + user.sessions_remaining}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <div className="text-xs text-slate-500 uppercase font-semibold">Connexions</div>
                <div className="text-2xl font-bold">{user.login_count}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <div className="text-xs text-slate-500 uppercase font-semibold">Dernière Act.</div>
                <div className="text-2xl font-bold">{new Date(user.last_login).toLocaleDateString()}</div>
              </div>
            </div>

            {/* --- ACTIONS ADMIN --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Actions Rapides</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <button onClick={() => handleAdminAction("Prolonger l'accès")} className="btn-admin-action"><Clock size={16}/> Prolonger Accès</button>
                <button onClick={() => handleAdminAction("Ajouter des séances")} className="btn-admin-action"><PlusCircle size={16}/> Ajouter Séances</button>
                <button onClick={() => handleAdminAction("Relancer l'analyse")} className="btn-admin-action"><Repeat size={16}/> Relancer Analyse</button>
                <button onClick={() => handleAdminAction("Purger le cache IA")} className="btn-admin-action"><RefreshCw size={16}/> Purger Cache IA</button>
                <button onClick={() => handleAdminAction("Rembourser")} className="btn-admin-action text-amber-600"><DollarSign size={16}/> Rembourser</button>
                <button onClick={() => handleAdminAction("Bloquer le compte")} className="btn-admin-action text-red-600"><Shield size={16}/> Bloquer Compte</button>
                <button onClick={() => handleAdminAction("Anonymiser (RGPD)")} className="btn-admin-action text-red-600"><UserX size={16}/> Anonymiser</button>
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

      {/* --- NOTES INTERNES --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Notes Internes (Support)</h2>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={5}
          placeholder="Ajouter une note sur cet utilisateur..."
          className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="text-right mt-4">
          <button onClick={handleSaveNotes} className="btn-primary">Sauvegarder la note</button>
        </div>
      </div>
    </div>
  );
}