import React, { useState, useEffect, useMemo } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';
import { DollarSign, CheckCircle, XCircle, RefreshCcw, Filter, Calendar, Tag, ExternalLink } from 'lucide-react';

// --- Types ---
interface Payment {
  id: string;
  user_email: string;
  status: 'succeeded' | 'failed' | 'refunded';
  offer_name: string;
  amount_paid: number;
  currency: string;
  purchase_date: string;
  stripe_invoice_url?: string;
  promo_code?: string;
}

interface BillingStats {
  total_revenue: number;
  revenue_last_30d: number;
  total_refunds: number;
  arpu: number; // Average Revenue Per User
}

const AdminBilling: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
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
        setStats(data.stats || null);
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
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">Revenus Totaux</h3><p className="text-3xl font-bold mt-2">{stats.total_revenue.toFixed(2)} €</p></div>
          <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">Revenus (30j)</h3><p className="text-3xl font-bold mt-2">{stats.revenue_last_30d.toFixed(2)} €</p></div>
          <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">Total Remboursé</h3><p className="text-3xl font-bold text-yellow-600 mt-2">{stats.total_refunds.toFixed(2)} €</p></div>
          <div className="admin-card"><h3 className="text-sm font-semibold text-gray-500">ARPU</h3><p className="text-3xl font-bold mt-2">{stats.arpu.toFixed(2)} €</p></div>
        </div>
      )}

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
                <td>{p.user_email}</td>
                <td><span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{p.offer_name}</span></td>
                <td className="text-right font-mono font-bold">{p.amount_paid.toFixed(2)} {p.currency.toUpperCase()}</td>
                <td>{getStatusBadge(p.status)}</td>
                <td>{new Date(p.purchase_date).toLocaleString('fr-FR')}</td>
                <td className="text-right">
                  {p.stripe_invoice_url && <a href={p.stripe_invoice_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md inline-block" title="Voir la facture Stripe"><ExternalLink size={16} /></a>}
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