import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, CreditCard, Bot, MessageSquare, Settings } from 'lucide-react';
import './Admin.css';

const AdminLayout: React.FC = () => {
  const navItems = [
    { to: "/admin/users", icon: <Users size={18} />, label: "Utilisateurs" },
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Facturation" },
    { to: "/admin/generations", icon: <Bot size={18} />, label: "Générations IA" },
    { to: "/admin/feedbacks", icon: <MessageSquare size={18} />, label: "Feedbacks" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Paramètres" },
  ];

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
      </aside>
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;