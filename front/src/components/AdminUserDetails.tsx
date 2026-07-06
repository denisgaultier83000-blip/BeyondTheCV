import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../utils/auth';
import { LucideUser, LucideClock, LucideShieldCheck, LucideGanttChartSquare, LucideTrash2, LucidePlusCircle, LucidePower, LucidePowerOff } from 'lucide-react';

// --- ANALYSE DE L'EXPERT ---
// Ce composant est une "War Room" pour un utilisateur spécifique.
//
// 1.  **Récupération de Données Multiples :** Il utilise `Promise.all` pour lancer en parallèle
//     les appels API afin de récupérer les détails de l'utilisateur et son historique de
//     générations, optimisant ainsi le temps de chargement.
//
// 2.  **État Local Granulaire :** Chaque action (bannir, créditer, etc.) possède son propre
//     état de chargement (`isToggling`, `isCrediting`). Cela permet de donner un retour
//     visuel précis à l'admin sans bloquer toute l'interface.
//
// 3.  **Actions Sécurisées :** Toutes les fonctions d'action (handleToggleActive, handleCredit)
//     sont des fonctions `async` qui appellent le backend via `authenticatedFetch`. Elles
//     gèrent les erreurs et mettent à jour l'état local pour refléter les changements.
//
// 4.  **Composants Réutilisables :** La page est découpée en sous-composants logiques
//     (`InfoCard`, `ActionCard`, etc.) pour une meilleure lisibilité et maintenabilité.
//
// 5.  **Robustesse :** Le composant gère élégamment les états de chargement initiaux
//     et les erreurs, affichant des messages clairs plutôt qu'une page blanche.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UserDetails {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  total_ia_cost: number;
  status: 'active' | 'expired' | 'extended' | null;
  expiration_date: string | null;
  sessions_remaining: number;
  cgu_cgv_acceptance_date: string | null;
  privacy_policy_acceptance_date: string | null;
}

interface Generation {
  id: string;
  status: string;
  created_at: string;
  module: string;
  estimated_cost: number | null;
  duration_ms: number | null;
  model_used: string | null;
  error_message: string | null;
}

const AdminUserDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isToggling, setIsToggling] = useState(false);
  const [isCrediting, setIsCrediting] = useState(false);
  const [creditAmount, setCreditAmount] = useState(10);
  const [creditType, setCreditType] = useState('qa');
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingApplications, setIsDeletingApplications] = useState(false);
  const [isDeletingGenerations, setIsDeletingGenerations] = useState(false);
  const [isDebiting, setIsDebiting] = useState(false);


  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [userRes, generationsRes] = await Promise.all([
        authenticatedFetch(`${API_URL}/api/admin/users/${userId}`),
        authenticatedFetch(`${API_URL}/api/admin/users/${userId}/generations?limit=5`)
      ]);

      if (!userRes.ok) throw new Error("Impossible de charger les détails de l'utilisateur.");
      
      const userData = await userRes.json();
      setUser(userData);

      if (generationsRes.ok) {
        const generationsData = await generationsRes.json();
        setGenerations(generationsData.generations);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleActive = async () => {
    if (!user) return;
    setIsToggling(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/toggle-active`, { method: 'POST' });
      if (!response.ok) throw new Error('Échec de la modification du statut.');
      const data = await response.json();
      setUser(prev => prev ? { ...prev, is_active: data.is_active } : null);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCredit = async () => {
    if (!user) return;
    setIsCrediting(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/credit-quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, quota_type: creditType, amount: creditAmount })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Échec de l\'ajout de crédits.');
      }
      alert('Crédits ajoutés avec succès !');
      // Re-fetch user data to show updated credit balance, if that data is available
      fetchData();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsCrediting(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!user || !window.confirm("Êtes-vous sûr de vouloir purger le cache de cet utilisateur ? Cette action est irréversible.")) return;
    setIsPurgingCache(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/cache`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Échec de la purge du cache.');
      alert('Cache utilisateur purgé avec succès.');
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handleExtendSubscription = async (days: number) => {
    if (!user || !window.confirm(`Êtes-vous sûr de vouloir prolonger l'abonnement de ${days} jours ?`)) return;
    setIsExtending(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', days })
      });
      if (!response.ok) throw new Error('Échec de la prolongation de l\'abonnement.');
      alert(`Abonnement prolongé de ${days} jours.`);
      fetchData(); // Refresh user data
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsExtending(false);
    }
  };

  const handleAnonymize = async () => {
    if (!user || !window.confirm(`ATTENTION : Vous êtes sur le point d'anonymiser cet utilisateur. Toutes ses données personnelles (CV, documents, générations) seront DÉFINITIVEMENT supprimées. Cette action est IRREVERSIBLE. Confirmez-vous ?`)) return;
    setIsAnonymizing(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/anonymize`, { method: 'POST' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Échec de l\'anonymisation.');
      }
      alert('Utilisateur anonymisé avec succès. La page va être rechargée.');
      navigate('/admin/users');
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsAnonymizing(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    alert("Cette fonctionnalité n'est pas encore entièrement implémentée. Action journalisée.");
    // Placeholder for backend call
    // The backend should generate a zip file and return a URL or the file directly.
    console.log(`Demande d'export pour l'utilisateur ${user.id}`);
  };

  const handleDeleteAccount = async () => {
    if (!user || !window.confirm(`ATTENTION : Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT cet utilisateur et toutes ses données. Cette action est IRREVERSIBLE. Confirmez-vous ?`)) return;
    setIsDeleting(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Échec de la suppression du compte.');
      }
      alert('Utilisateur supprimé avec succès.');
      navigate('/admin/users');
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteApplications = async () => {
    if (!user || !window.confirm(`Confirmez-vous la suppression de tous les dossiers de candidature de cet utilisateur ? Cette action est irréversible.`)) return;
    setIsDeletingApplications(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/applications`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Échec de la suppression des dossiers.');
      alert('Dossiers de candidature supprimés.');
      // Optionally re-fetch data if there's a visual representation of applications
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsDeletingApplications(false);
    }
  };

  const handleDeleteGenerations = async () => {
    if (!user || !window.confirm(`Confirmez-vous la suppression de toutes les générations IA de cet utilisateur ? Cette action est irréversible.`)) return;
    setIsDeletingGenerations(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users/${user.id}/generations`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Échec de la suppression des générations.');
      alert('Générations IA supprimées.');
      fetchData(); // Refresh generations list
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsDeletingGenerations(false);
    }
  };

  const handleDebit = async () => {
    if (!user) return;
    const amountToDebit = Math.abs(creditAmount);
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer ${amountToDebit} crédit(s) de type '${creditType}' ?`)) return;

    setIsDebiting(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/credit-quotas`, { // Assuming the same endpoint with negative value
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, quota_type: creditType, amount: -amountToDebit })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Échec du retrait de crédits.');
      }
      alert('Crédits retirés avec succès !');
      fetchData();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsDebiting(false);
    }
  };


  if (loading) return <div style={styles.center}>Chargement des détails...</div>;
  if (error) return <div style={{...styles.center, color: 'red'}}>Erreur: {error}</div>;
  if (!user) return <div style={styles.center}>Utilisateur non trouvé.</div>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/admin/users')} style={styles.backButton}>&larr; Retour à la liste</button>
      
      <div style={styles.header}>
        <LucideUser size={32} />
        <div>
          <h2 style={styles.headerTitle}>{user.first_name} {user.last_name}</h2>
          <p style={styles.headerSubtitle}>{user.email}</p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Carte d'informations */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Informations</h3>
          <InfoRow label="Inscrit le" value={new Date(user.created_at).toLocaleDateString()} />
          <InfoRow label="Dernier login" value={user.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais'} />
          <InfoRow label="Statut du compte" value={user.is_active ? 'Actif' : 'Inactif'} badge={user.is_active ? 'active' : 'inactive'} />
          <InfoRow label="Statut abonnement" value={user.status || 'N/A'} badge={user.status || 'inactive'} />
          <InfoRow label="Expiration" value={user.expiration_date ? new Date(user.expiration_date).toLocaleDateString() : 'N/A'} />
          <InfoRow label="Coût IA total" value={`${user.total_ia_cost.toFixed(2)} €`} />
          <InfoRow label="Séances restantes" value={`${user.sessions_remaining}`} />
          <InfoRow label="Acceptation CGU/CGV" value={user.cgu_cgv_acceptance_date ? new Date(user.cgu_cgv_acceptance_date).toLocaleString() : 'Non enregistré'} />
          <InfoRow label="Acceptation Politique Conf." value={user.privacy_policy_acceptance_date ? new Date(user.privacy_policy_acceptance_date).toLocaleString() : 'Non enregistré'} />
        </div>

        {/* Carte d'actions */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Actions Administrateur</h3>
          <button onClick={handleToggleActive} disabled={isToggling} style={styles.actionButton}>
            {user.is_active ? <LucidePowerOff size={16}/> : <LucidePower size={16}/>}
            {isToggling ? '...' : (user.is_active ? 'Désactiver le compte' : 'Activer le compte')}
          </button>
          <button onClick={handlePurgeCache} disabled={isPurgingCache} style={{...styles.actionButton, background: '#fef2f2', color: '#b91c1c'}}>
            <LucideTrash2 size={16}/> {isPurgingCache ? 'Purge en cours...' : 'Purger le cache IA'}
          </button>
        </div>

        {/* Carte de crédits */}
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>Gestion des Quotas</h3>
            <div style={styles.creditForm}>
                <input type="number" value={creditAmount} onChange={e => setCreditAmount(parseInt(e.target.value))} style={styles.creditInput} />
                <select value={creditType} onChange={e => setCreditType(e.target.value)} style={styles.creditSelect}>
                    <option value="qa">Questions Classiques</option>
                    <option value="mes">Mises en Situation</option>
                    <option value="pitch">Pitch</option>
                    <option value="negotiation">Négociation</option>
                    <option value="regeneration">Régénérations</option>
                    <option value="update">Mises à jour Marché</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleCredit} disabled={isCrediting || isDebiting} style={styles.creditButton}>
                    <LucidePlusCircle size={16}/> {isCrediting ? '...' : 'Créditer'}
                </button>
                <button onClick={handleDebit} disabled={isDebiting || isCrediting} style={{...styles.creditButton, background: '#ef4444'}}>
                    <LucideMinusCircle size={16}/> {isDebiting ? '...' : 'Débiter'}
                </button>
            </div>
        </div>
        
        {/* Carte d'abonnement */}
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>Abonnement</h3>
            <p>Actions rapides pour gérer l'accès de l'utilisateur.</p>
            <button onClick={() => handleExtendSubscription(30)} disabled={isExtending} style={{...styles.actionButton, background: '#eff6ff', color: '#2563eb'}}>
                <LucidePlusCircle size={16}/> {isExtending ? '...' : 'Prolonger de 30 jours'}
            </button>
        </div>

        {/* Bloc RGPD / Données personnelles */}
        <div style={{...styles.card, gridColumn: '1 / -1', background: '#fffbeb', borderColor: '#fef3c7'}}>
            <h3 style={{...styles.cardTitle, color: '#b45309'}}>Bloc RGPD / Données personnelles</h3>
            <div style={styles.rgpdGrid}>
                <div style={styles.rgpdAction}>
                    <div>
                        <p style={styles.rgpdActionTitle}>Exporter les données utilisateur</p>
                        <p style={styles.rgpdActionDescription}>Générer une archive ZIP avec toutes les données de l'utilisateur.</p>
                    </div>
                    <button onClick={handleExportData} style={{...styles.actionButton, width: 'auto', background: '#f0f9ff', color: '#0284c7'}}>
                        <LucideDownload size={16}/> Exporter
                    </button>
                </div>
                <div style={styles.rgpdAction}>
                    <div>
                        <p style={styles.rgpdActionTitle}>Supprimer les dossiers de candidature</p>
                        <p style={styles.rgpdActionDescription}>Efface tous les dossiers, CV et documents générés. Action irréversible.</p>
                    </div>
                    <button onClick={handleDeleteApplications} disabled={isDeletingApplications} style={{...styles.actionButton, width: 'auto', background: '#fef2f2', color: '#b91c1c'}}>
                        <LucideTrash2 size={16}/> {isDeletingApplications ? 'Suppression...' : 'Supprimer les dossiers'}
                    </button>
                </div>
                <div style={styles.rgpdAction}>
                    <div>
                        <p style={styles.rgpdActionTitle}>Supprimer les générations IA</p>
                        <p style={styles.rgpdActionDescription}>Efface l'historique des générations IA pour cet utilisateur. Action irréversible.</p>
                    </div>
                    <button onClick={handleDeleteGenerations} disabled={isDeletingGenerations} style={{...styles.actionButton, width: 'auto', background: '#fef2f2', color: '#b91c1c'}}>
                        <LucideTrash2 size={16}/> {isDeletingGenerations ? 'Suppression...' : 'Supprimer les générations'}
                    </button>
                </div>
            </div>
            <div style={{...styles.rgpdAction, borderTop: '1px solid #fde68a', paddingTop: '1rem', marginTop: '1rem'}}>
                <div>
                    <p style={{...styles.rgpdActionTitle, color: '#92400e'}}>Anonymiser l'utilisateur</p>
                    <p style={styles.rgpdActionDescription}>Remplace les informations personnelles par des données anonymes. Garde les métriques. Irréversible.</p>
                </div>
                <button onClick={handleAnonymize} disabled={isAnonymizing} style={{...styles.actionButton, width: 'auto', background: '#fbbf24', color: '#92400e'}}>
                    <LucideShieldCheck size={16}/> {isAnonymizing ? 'Anonymisation...' : 'Anonymiser'}
                </button>
            </div>
            <div style={{...styles.rgpdAction, borderTop: '1px solid #fde68a', paddingTop: '1rem', marginTop: '0.5rem'}}>
                <div>
                    <p style={{...styles.rgpdActionTitle, color: '#991b1b'}}>Supprimer le compte</p>
                    <p style={styles.rgpdActionDescription}>Supprime DÉFINITIVEMENT le compte et toutes les données associées. Action irréversible.</p>
                </div>
                <button onClick={handleDeleteAccount} disabled={isDeleting} style={{...styles.actionButton, width: 'auto', background: '#dc2626', color: 'white'}}>
                    <LucideTrash2 size={16}/> {isDeleting ? 'Suppression...' : 'Supprimer le compte'}
                </button>
            </div>
        </div>

        {/* Carte des générations */}
        <div style={{...styles.card, gridColumn: '1 / -1'}}>
          <h3 style={styles.cardTitle}>Dernières Générations IA</h3>
          <ul style={styles.generationList}>
            {generations.length > 0 ? generations.map(gen => (
              <li key={gen.id} style={styles.generationItem}>
                <LucideGanttChartSquare size={18} style={{color: '#64748b'}}/>
                <div>
                  <span style={{fontWeight: 600}}>{gen.module}</span>
                  <span style={{fontSize: '0.8rem', color: '#64748b', marginLeft: '1rem'}}>Statut: {gen.status}</span>
                   {gen.estimated_cost ? (
                    <span style={{fontSize: '0.8rem', color: '#4ade80', marginLeft: '1rem', fontWeight: 600}}>
                      Coût: {gen.estimated_cost.toFixed(5)} €
                    </span>
                  ) : null}
                </div>
                <span style={{marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b'}}>{new Date(gen.created_at).toLocaleString()}</span>
              </li>
            )) : (
              <p style={{color: '#64748b', fontSize: '0.9rem'}}>Aucune génération enregistrée pour cet utilisateur.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, badge }: { label: string, value: string | number, badge?: string }) => (
  <div style={styles.infoRow}>
    <span style={styles.infoLabel}>{label}</span>
    {badge ? <span style={{...styles.badge, ...styles.badgeColors[badge]}}>{value}</span> : <span style={styles.infoValue}>{value}</span>}
  </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '2rem', fontFamily: 'sans-serif' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', fontSize: '1.2rem' },
  backButton: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '1rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  headerTitle: { margin: 0, fontSize: '1.8rem', color: '#1e293b' },
  headerSubtitle: { margin: 0, color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem' },
  cardTitle: { marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' },
  infoLabel: { color: '#475569', fontSize: '0.9rem' },
  infoValue: { fontWeight: 600, color: '#1e293b' },
  badge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
  badgeColors: {
    active: { color: '#166534', backgroundColor: '#dcfce7' },
    inactive: { color: '#991b1b', backgroundColor: '#fee2e2' },
    expired: { color: '#713f12', backgroundColor: '#fef3c7' },
    extended: { color: '#1d4ed8', backgroundColor: '#dbeafe' },
  },
  actionButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc', cursor: 'pointer', marginBottom: '0.5rem' },
  creditForm: { display: 'flex', gap: '0.5rem' },
  creditInput: { flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' },
  creditSelect: { flex: 2, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' },
  creditButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' },
  generationList: { listStyle: 'none', padding: 0, margin: 0 },
  generationItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' },
  rgpdGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' },
  rgpdAction: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  rgpdActionTitle: { margin: 0, fontWeight: 600, color: '#92400e' },
  rgpdActionDescription: { margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#b45309' },
};

export default AdminUserDetails;