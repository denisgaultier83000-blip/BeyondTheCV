import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export function AdminPage() {
  const location = useLocation();

  const getLinkStyle = (path: string) => ({
    textDecoration: 'none',
    color: location.pathname === path ? 'var(--primary)' : 'var(--text-main)',
    background: location.pathname === path ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    fontWeight: 600,
    padding: '0.5rem 1rem',
    display: 'block',
    borderRadius: '0.5rem',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex' }}>
      <nav style={{ width: '220px', background: 'var(--bg-secondary)', padding: '1.5rem', borderRight: '1px solid var(--border-color)', height: '100vh', position: 'fixed' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '1.2rem' }}>👑 Admin</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li><Link to="/admin" style={getLinkStyle('/admin')}>Vue d'ensemble</Link></li>
          <li><Link to="/admin/ai-usage" style={getLinkStyle('/admin/ai-usage')}>Coûts IA</Link></li>
          <li><Link to="/admin/feedbacks" style={getLinkStyle('/admin/feedbacks')}>Feedbacks</Link></li>
        </ul>
      </nav>
      <main style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}