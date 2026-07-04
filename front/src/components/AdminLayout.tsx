import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, CreditCard, Bot, MessageSquare, Settings } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navItems = [
    { to: "/admin/users", icon: <Users size={18} />, label: "Utilisateurs" },
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Facturation" },
    { to: "/admin/generations", icon: <Bot size={18} />, label: "Générations IA" },
    { to: "/admin/feedbacks", icon: <MessageSquare size={18} />, label: "Feedbacks" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Paramètres" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">Admin</h1>
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 p-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          {/* Outlet va rendre le composant de la route enfant correspondante */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;