import React, { useState } from 'react';
import { Zap, Plus, AlertTriangle, CheckCircle2, Loader2, User } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

export default function AdminQuotaManager() {
  const [email, setEmail] = useState('');
  const [quotaType, setQuotaType] = useState('qa');
  const [amount, setAmount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/admin/credit-quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, quota_type: quotaType, amount })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Erreur lors de l'opération.");
      }

      setMessage({ type: 'success', text: `Succès ! Nouveau solde pour ${quotaType} : ${data.new_balance}` });
      // Optionnel : réinitialiser le formulaire
      // setEmail('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 0, color: 'var(--text-main)' }}>
        <Zap size={24} color="#3b82f6" /> Gestion Manuelle des Quotas
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Ajoutez ou retirez (avec un nombre négatif) des simulations au compte d'un utilisateur.
      </p>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleCredit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Email de l'utilisateur</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="candidat@email.com"
              style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Module à créditer</label>
          <select 
            value={quotaType} 
            onChange={e => setQuotaType(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxSizing: 'border-box' }}
          >
            <option value="qa">Questions Classiques (qa)</option>
            <option value="mes">Mises en Situation (mes)</option>
            <option value="pitch">Pitch Vocal (pitch)</option>
            <option value="negotiation">Négociation (negotiation)</option>
            <option value="regeneration">Régénérations IA (regeneration)</option>
            <option value="update">Mises à jour Marché (update)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Quantité</label>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(parseInt(e.target.value))} 
            required 
            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !email} 
          className="btn-primary" 
          style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '40px' }}
        >
          {isLoading ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
          Appliquer
        </button>
      </form>
    </div>
  );
}