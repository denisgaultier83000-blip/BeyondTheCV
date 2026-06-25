import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Users, CreditCard, Cpu, MessageSquare } from 'lucide-react';

export function AdminPage() {
  const location = useLocation();

  // [EXPERT] Amélioration de la logique pour gérer la surbrillance des routes parentes.
  // Par exemple, /admin/user/123 doit aussi activer le lien /admin/users.
  const getLinkStyle = (path: string) => {
    const isActive = path === '/admin' 
      ? location.pathname === path 
      : location.pathname.startsWith(path);

    return {
      textDecoration: 'none',
      color: isActive ? 'var(--primary)' : 'var(--text-main)',
      background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      fontWeight: 600,
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      borderRadius: '0.5rem',
      transition: 'all 0.2s'
    };
  };

  return (
    <div style={{ display: 'flex' }}>
      <nav style={{ width: '220px', background: 'var(--bg-secondary)', padding: '1.5rem', borderRight: '1px solid var(--border-color)', height: '100vh', position: 'fixed' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '1.2rem' }}>👑 Admin</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li><Link to="/admin" style={getLinkStyle('/admin')}><BarChart3 size={18} /> Vue d'ensemble</Link></li>
          <li><Link to="/admin/users" style={getLinkStyle('/admin/users')}><Users size={18} /> Utilisateurs</Link></li>
          <li><Link to="/admin/billing" style={getLinkStyle('/admin/billing')}><CreditCard size={18} /> Facturation</Link></li>
          <li><Link to="/admin/generations" style={getLinkStyle('/admin/generations')}><Cpu size={18} /> Générations IA</Link></li>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
          <li><Link to="/admin/ai-usage" style={getLinkStyle('/admin/ai-usage')}>Coûts IA (Ancien)</Link></li>
          <li><Link to="/admin/feedbacks" style={getLinkStyle('/admin/feedbacks')}><MessageSquare size={18} /> Feedbacks</Link></li>
        </ul>
      </nav>
      <main style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}