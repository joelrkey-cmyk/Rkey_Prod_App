import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Home, FileSignature, FileCheck, Package, Users, Ticket, User, Send, LogOut, FileText, Handshake, Truck, CreditCard, Settings, ChevronDown, Building2, Smile, Headphones, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { key: 'home', path: '/', icon: Home, label: 'Accueil', activeClass: 'bg-gray-800 text-white hover:bg-gray-900', inactiveClass: 'text-gray-600 hover:bg-gray-100' },
  { key: 'devis', path: '/devis', icon: Send, label: 'Envoi de Devis', activeClass: 'bg-orange-600 text-white hover:bg-orange-700', inactiveClass: 'text-orange-600 hover:bg-orange-50' },
  { key: 'contracts2', path: '/contracts2', icon: FileSignature, label: 'Contrats', activeClass: 'bg-amber-600 text-white hover:bg-amber-700', inactiveClass: 'text-amber-600 hover:bg-amber-50' },
  { key: 'location', path: '/location', icon: Package, label: 'Location', activeClass: 'bg-purple-600 text-white hover:bg-purple-700', inactiveClass: 'text-purple-600 hover:bg-purple-50' },
  { key: 'rental', path: '/rental', icon: Handshake, label: 'Retrait / Retour', activeClass: 'bg-slate-800 text-white hover:bg-slate-900', inactiveClass: 'text-slate-700 hover:bg-slate-100' },
  { key: 'delivery', path: '/delivery', icon: Truck, label: 'Livraison', activeClass: 'bg-blue-600 text-white hover:bg-blue-700', inactiveClass: 'text-blue-600 hover:bg-blue-50' },
  { key: 'dj-client', path: '/dj-client', icon: Headphones, label: 'DJ / Client', activeClass: 'bg-pink-600 text-white hover:bg-pink-700', inactiveClass: 'text-pink-600 hover:bg-pink-50' },
  { key: 'agenda-prestation', path: '/agenda-prestation', icon: Calendar, label: 'Agenda Presta', activeClass: 'bg-rose-600 text-white hover:bg-rose-700', inactiveClass: 'text-rose-600 hover:bg-rose-50' },
  { key: 'crm', path: '/crm', icon: Building2, label: 'CRM', activeClass: 'bg-green-600 text-white hover:bg-green-700', inactiveClass: 'text-green-600 hover:bg-green-50' },
  { key: 'billetterie', path: '/billetterie', icon: Ticket, label: 'Événements', activeClass: 'bg-gray-800 text-white hover:bg-gray-900', inactiveClass: 'text-gray-800 hover:bg-gray-100' },
  { key: 'formulaires', path: '/formulaires', icon: FileText, label: 'Formulaires', activeClass: 'bg-orange-500 text-white hover:bg-orange-600', inactiveClass: 'text-orange-500 hover:bg-orange-50' },
  { key: 'dj-profiles', path: '/dj-profiles', icon: User, label: 'Profils Artistes', activeClass: 'bg-yellow-500 text-white hover:bg-yellow-600', inactiveClass: 'text-yellow-600 hover:bg-yellow-50' },
  { key: 'abonnements', path: '/abonnements', icon: CreditCard, label: 'Abonnements', activeClass: 'bg-teal-500 text-white hover:bg-teal-600', inactiveClass: 'text-teal-600 hover:bg-teal-50' },
  { key: 'partenaires', path: '/partenaires', icon: Smile, label: 'Partenaires', activeClass: 'bg-indigo-600 text-white hover:bg-indigo-700', inactiveClass: 'text-indigo-600 hover:bg-indigo-50' },
  { key: 'parametres', path: '/parametres', icon: Settings, label: 'Paramètres', activeClass: 'bg-slate-600 text-white hover:bg-slate-700', inactiveClass: 'text-slate-500 hover:bg-slate-50' },
];

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, login } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [switching, setSwitching] = useState(false);
  const [djClientNotifications, setDjClientNotifications] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch(`${BACKEND_URL}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setAvailableUsers(data); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const fetchNotifsCount = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDjClientNotifications(data.count || 0);
        }
      } catch (err) {
        console.error("Error loading notification count in Nav:", err);
      }
    };
    fetchNotifsCount();
    const interval = setInterval(fetchNotifsCount, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('client_pwa_slug');
    logout();
    navigate('/login');
  };

  const handleSwitchUser = async (targetUsername) => {
    if (switching || targetUsername === user?.username) return;
    setSwitching(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/api/auth/switch-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_username: targetUsername }),
      });
      if (!res.ok) throw new Error('Switch failed');
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowUserMenu(false);
      window.location.href = '/';
    } catch {
      setSwitching(false);
    }
  };

  const getCurrentApp = () => {
    if (location.pathname.startsWith('/contracts2')) return 'contracts2';
    if (location.pathname.startsWith('/location')) return 'location';
    if (location.pathname.startsWith('/rental')) return 'rental';
    if (location.pathname.startsWith('/delivery')) return 'delivery';
    if (location.pathname.startsWith('/crm')) return 'crm';
    if (location.pathname.startsWith('/billetterie')) return 'billetterie';
    if (location.pathname.startsWith('/dj-profiles')) return 'dj-profiles';
    if (location.pathname.startsWith('/devis')) return 'devis';
    if (location.pathname.startsWith('/agenda-prestation')) return 'agenda-prestation';
    if (location.pathname.startsWith('/formulaires')) return 'formulaires';
    if (location.pathname.startsWith('/abonnements')) return 'abonnements';
    if (location.pathname.startsWith('/parametres')) return 'parametres';
    return 'home';
  };

  const currentApp = getCurrentApp();
  const otherUsers = availableUsers.filter(u => u.username !== user?.username);
  const userAllowedApps = user?.allowed_apps || [];
  const filteredNavItems = (user?.role === 'admin' || userAllowedApps.length === 0)
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => item.key === 'home' || userAllowedApps.includes(item.key));

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="w-full mx-auto px-4">
        <div className="flex justify-between items-center h-14">

          {/* Navigation icons */}
          <div className="flex items-center gap-1 overflow-x-auto nav-no-scrollbar">
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentApp === item.key;
              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(item.path)}
                  className={`relative w-9 h-9 rounded-xl transition-all flex-shrink-0 ${isActive ? item.activeClass : item.inactiveClass} group`}
                  title={item.label}
                  data-testid={`nav-${item.key}`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.key === 'dj-client' && djClientNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-sm animate-bounce z-15 border border-white">
                      {djClientNotifications}
                    </span>
                  )}
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* User + switch + logout */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2" ref={menuRef}>
            {user && (
              <>
                {/* User switch dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    data-testid="user-switch-btn"
                  >
                    <span className="text-xs font-medium text-gray-700 hidden md:inline">
                      {user.full_name || user.username}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 hidden md:inline">
                      {user.role || 'admin'}
                    </span>
                    {otherUsers.length > 0 && (
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {showUserMenu && otherUsers.length > 0 && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]" data-testid="user-switch-menu">
                      <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase font-semibold">Changer d'utilisateur</div>
                      {otherUsers.map(u => (
                        <button
                          key={u.username}
                          onClick={() => handleSwitchUser(u.username)}
                          disabled={switching}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          data-testid={`switch-to-${u.username}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {u.full_name?.charAt(0)?.toUpperCase() || u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{u.full_name || u.username}</div>
                            <div className="text-[10px] text-gray-400">{u.role || 'admin'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-9 h-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700"
                  title="Se déconnecter"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </Button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navigation;
