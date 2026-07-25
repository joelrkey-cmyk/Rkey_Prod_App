import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, Truck, LogOut, Plus, ArrowLeft, Edit, Trash2, Send, FileCheck, Package, Users as UsersIcon, Ticket, FileText, User, CreditCard, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../services/axiosConfig';
import { toast } from 'sonner';
import { Toaster } from '../ui/sonner';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const MobileHome = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



  // ==================
  // Main mobile home
  // ==================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="mobile-home">
      <Toaster position="top-center" />
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">R'KEY PROD</h1>
          <p className="text-xs text-slate-400 mt-0.5">{user?.full_name || 'Location'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
          data-testid="mobile-logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 gap-5 max-w-md mx-auto w-full">
        {(() => {
          const allowedApps = user?.allowed_apps || ['rental', 'delivery'];
          const MOBILE_APPS = [
            { key: 'devis', route: '/devis', label: 'Envoi de Devis', desc: 'Envoyer des devis', icon: Send, bg: 'bg-orange-500 hover:bg-orange-600' },
            { key: 'contracts', route: '/contracts2', label: 'Contrats' , desc: 'Contrats artistiques', icon: FileCheck, bg: 'bg-blue-500 hover:bg-blue-600' },
            { key: 'location', route: '/location', label: 'Location', desc: 'Gestion du matériel', icon: Package, bg: 'bg-purple-500 hover:bg-purple-600' },
            { key: 'rental', route: '/rental', label: 'Retrait / Retour', desc: 'Retrait et retour du matériel', icon: Handshake, bg: 'bg-slate-900 hover:bg-slate-800' },
            { key: 'delivery', route: '/delivery', label: 'Livraison', desc: 'Livrer le matériel au client', icon: Truck, bg: 'bg-blue-600 hover:bg-blue-700' },
            { key: 'crm', route: '/crm', label: 'Fichier Client', desc: 'Gestion des clients', icon: UsersIcon, bg: 'bg-green-500 hover:bg-green-600' },
            { key: 'billetterie', route: '/billetterie', label: 'Événements', desc: 'Billetterie et événements', icon: Ticket, bg: 'bg-gray-800 hover:bg-gray-700' },
            { key: 'formulaires', route: '/formulaires', label: 'Formulaires', desc: 'Formulaires personnalisés', icon: FileText, bg: 'bg-orange-400 hover:bg-orange-500' },
            { key: 'dj-profiles', route: '/dj-profiles', label: 'Artistes', desc: 'Profils artistes', icon: User, bg: 'bg-yellow-500 hover:bg-yellow-600' },
            { key: 'abonnements', route: '/abonnements', label: 'Abonnements', desc: 'Gestion des abonnements', icon: CreditCard, bg: 'bg-teal-500 hover:bg-teal-600' },
            { key: 'parametres', route: '/parametres', label: 'Paramètres', desc: 'Configuration', icon: Settings, bg: 'bg-slate-600 hover:bg-slate-700' },
          ];
          return MOBILE_APPS.filter(a => allowedApps.includes(a.key)).map(app => {
            const Icon = app.icon;
            return (
              <button
                key={app.key}
                onClick={() => navigate(app.route)}
                className={`w-full ${app.bg} text-white rounded-2xl p-6 flex items-center gap-5 transition-all active:scale-[0.98] shadow-lg`}
                data-testid={`mobile-${app.key}`}
              >
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <span className="text-base font-semibold block">{app.label}</span>
                  <span className="text-sm text-white/60 mt-0.5 block">{app.desc}</span>
                </div>
              </button>
            );
          });
        })()}


      </main>
    </div>
  );
};

export default MobileHome;
