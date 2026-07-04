import React, { useEffect } from 'react';
import { X, Zap, BatteryCharging, Package, Box, Archive, ShoppingCart } from 'lucide-react';
import { useDashboard } from '../hooks/DashboardContext';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  const dashboard = useDashboard();

  // [FIX] Actualisation automatique des quotas quand l'utilisateur revient sur l'onglet
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen && dashboard?.fetchQuotas) {
        dashboard.fetchQuotas();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, dashboard]);

  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '700px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center', position: 'relative', animation: 'fadeIn 0.3s ease-out' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'var(--primary)' }}>
          <Zap size={32} />
        </div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', marginTop: 0 }}>Recharger vos séances d'entraînement</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
          Vous avez utilisé toutes vos séances d'entraînement IA. Choisissez une recharge pour continuer à vous perfectionner.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { plan: 'recharge_5', icon: BatteryCharging, sessions: 5, price: 15, pricePerSession: 3.00, popular: false },
            { plan: 'recharge_10', icon: Package, sessions: 10, price: 25, pricePerSession: 2.50, popular: false },
            { plan: 'recharge_20', icon: Box, sessions: 20, price: 45, pricePerSession: 2.25, popular: true },
            { plan: 'recharge_30', icon: Archive, sessions: 30, price: 60, pricePerSession: 2.00, popular: false },
            { plan: 'recharge_60', icon: ShoppingCart, sessions: 60, price: 99, pricePerSession: 1.65, popular: false },
          ].map((pack) => {
            const Icon = pack.icon;
            return (
              <div 
                key={pack.plan}
                // [FIX] Ouvre le paiement dans un nouvel onglet pour préserver la réponse
                onClick={() => window.open(`/payment?plan=${pack.plan}`, '_blank')} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '1.5rem', 
                  borderRadius: '0.75rem', 
                  border: pack.popular ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  transform: pack.popular ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: pack.popular ? '0 10px 15px -3px rgba(59, 130, 246, 0.1)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <Icon size={28} color={pack.popular ? "var(--primary)" : "var(--text-muted)"} style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {pack.sessions} Séances
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: pack.popular ? 'var(--primary)' : 'var(--text-main)', margin: '0.5rem 0' }}>
                  {pack.price} €
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                  {pack.pricePerSession.toFixed(2)} € / séance
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onClose} className="btn-outline">
            Plus tard
          </button>
          </div>
      </div>
    </div>
  );
}