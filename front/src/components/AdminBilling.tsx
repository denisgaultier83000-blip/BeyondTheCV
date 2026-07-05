import React, { useState, useEffect, useMemo } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';
import { DollarSign, CheckCircle, XCircle, RefreshCcw, Filter, Calendar, Tag, ExternalLink } from 'lucide-react';

// --- Types ---
interface Payment {
  id: string;
  user_id: string;
  email: string;
  status: 'succeeded' | 'failed' | 'refunded';
  offer_name: string;
  amount_paid: number;
  currency: string;
  purchase_date: string;
  stripe_charge_id?: string;
}

const AdminBilling: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/billing`);
        if (!response.ok) throw new Error("Impossible de charger les données de facturation.");
        const data = await response.json();
        setPayments(data.payments || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingData();
  }, []);

  const filteredPayments = useMemo(() => {
    if (filterStatus === 'all') return payments;
    return payments.filter(p => p.status === filterStatus);
  }, [payments, filterStatus]);

  const stats = useMemo(() => {
    const totalRevenue = payments.filter(p => p.status === 'succeeded').reduce((acc, p) => acc + p.amount_paid, 0);
    const totalRefunds = payments.filter(p => p.status === 'refunded').reduce((acc, p) => acc + p.amount_paid, 0);
    return { totalRevenue, totalRefunds };
  }, [payments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle size={12}/> Réussi</span>;
      case 'failed': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle size={12}/> Échoué</span>;
      case 'refunded': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><RefreshCcw size={12}/> Remboursé</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement des données de facturation...">
      <div className="admin-page-header">
        <h1>Suivi de la Facturation</h1>
        <p>Consultez l'historique des paiements, les statuts et les indicateurs de revenus.</p>
      </div>


      {/* Indicateurs Clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">Revenus Totaux</h3><p className="text-3xl font-bold mt-2">{(stats.totalRevenue / 100).toFixed(2)} €</p></div>
        <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">Total Remboursé</h3><p className="text-3xl font-bold text-yellow-600 mt-2">{(stats.totalRefunds / 100).toFixed(2)} €</p></div>
      </div>

      {/* Filtres */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-gray-400" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Tous les statuts</option>
            <option value="succeeded">Réussi</option>
            <option value="failed">Échoué</option>
            <option value="refunded">Remboursé</option>
          </select>
        </div>
      </div>

      {/* Tableau des paiements */}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[800px]">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Offre</th>
              <th className="text-right">Montant</th>
              <th>Statut</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map(p => (
              <tr key={p.id}>
                <td>{p.email}</td>
                <td><span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{p.offer_name}</span></td>
                <td className="text-right font-mono font-bold">{(p.amount_paid / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                <td>{getStatusBadge(p.status)}</td>
                <td>{new Date(p.purchase_date).toLocaleString('fr-FR')}</td>
                <td className="text-right">
                  {p.stripe_charge_id && <a href={`https://dashboard.stripe.com/payments/${p.stripe_charge_id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md inline-block" title="Voir sur Stripe"><ExternalLink size={16} /></a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncBoundary>
  );
};

export default AdminBilling;