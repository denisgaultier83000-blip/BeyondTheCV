import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, CreditCard, Bot, MessageSquare, Settings, LogOut } from 'lucide-react';
import { removeAuthToken } from '../utils/auth';
import './Admin.css';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { to: "/admin/users", icon: <Users size={18} />, label: "Utilisateurs" },
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Facturation" },
    { to: "/admin/generations", icon: <Bot size={18} />, label: "Générations IA" },
    { to: "/admin/feedbacks", icon: <MessageSquare size={18} />, label: "Feedbacks" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Paramètres" },
  ];

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span>Command Center</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button 
          onClick={handleLogout} 
          className="admin-nav-link"
          style={{ 
            background: 'none', 
            border: 'none', 
            width: '100%', 
            textAlign: 'left', 
            cursor: 'pointer',
            marginTop: 'auto'
          }}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </aside>
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;