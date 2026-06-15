import React from 'react';
import { X, Zap, CreditCard, Shield, Star, Rocket } from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '700px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center', position: 'relative', animation: 'fadeIn 0.3s ease-out' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}>
          <Zap size={32} />
        </div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', marginTop: 0 }}>Simulations Épuisées</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
          Vous avez utilisé toutes les simulations notées incluses dans votre pack pour ce module. Choisissez une recharge pour continuer à bénéficier du feedback de l'IA.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {/* Pack Express */}
          <div onClick={() => window.location.href = '/payment?plan=recharge_express'} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Shield size={24} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>39 €</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Pack Express</div>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '1rem', marginTop: '0.75rem' }}>
              <li>+5 Pitchs notés</li>
              <li>+10 Q&A corrigées</li>
            </ul>
          </div>
          {/* Pack Stratégique */}
          <div onClick={() => window.location.href = '/payment?plan=recharge_strategique'} style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '2px solid var(--primary)', cursor: 'pointer', transform: 'scale(1.05)', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)' }}>
            <Star size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>69 €</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Pack Stratégique</div>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '1rem', marginTop: '0.75rem' }}>
              <li>+15 Pitchs notés</li>
              <li>+40 Q&A corrigées</li>
              <li>+10 MES notées</li>
            </ul>
          </div>
          {/* Pack Intensif */}
          <div onClick={() => window.location.href = '/payment?plan=recharge_intensif'} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Rocket size={24} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>99 €</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Pack Intensif</div>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '1rem', marginTop: '0.75rem' }}>
              <li>+30 Pitchs notés</li>
              <li>+100 Q&A corrigées</li>
              <li>+25 MES notées</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}