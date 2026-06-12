import React from 'react';
import { X, Zap, CreditCard } from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center', position: 'relative', animation: 'fadeIn 0.3s ease-out' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}>
          <Zap size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', marginTop: 0 }}>Plus de séances</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
          Vous avez épuisé vos séances d'entraînement incluses. Rechargez votre compte pour continuer à vous préparer avec l'IA.
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>9 €</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Pack de 10 séances IA</div>
        </div>
        <button 
          onClick={() => window.location.href = '/payment?plan=recharge_10'}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <CreditCard size={20} /> Acheter via Stripe
        </button>
      </div>
    </div>
  );
}