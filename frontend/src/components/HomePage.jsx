import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, FileCheck, Package, Users, Calendar, Bell, Building2, ArrowRight, Plus, Edit, Trash2, StickyNote, Ticket, User, Send, Clock, LayoutDashboard, CreditCard, PenLine, Settings, Handshake, Truck, Smile, FileSignature, Headphones, CalendarDays, MapPin, ClipboardList } from 'lucide-react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [upcomingRelances, setUpcomingRelances] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({ 
    devis_envoi_pending: 0, 
    location_pending: 0,
    location_accepted_week: 0,
    location_accepted_total: 0,
    location_to_deliver_week: 0,
    contracts_pending_signature: 0
  });
  const [subscriptionStats, setSubscriptionStats] = useState({
    active_count: 0,
    total_monthly: 0,
    renewals_soon: 0
  });

  useEffect(() => {
    loadRelances();
    loadUnreadNotifications();
    loadDashboardStats();
    loadSubscriptionStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/home/dashboard`);
      setDashboardStats(response.data);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Error loading dashboard stats:", error);
      }
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/stats`);
      setSubscriptionStats(response.data);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Error loading subscription stats:", error);
      }
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const response = await axios.get(`${API}/dj-client/pending-alerts`);
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Error loading notifications:", error);
      }
    }
  };



  const loadRelances = async () => {
    try {
      const response = await axios.get(`${API}/crm/relances`);
      const allRelances = response.data || [];
      const activeRelances = allRelances.filter(r => r.statut === "active");
      setUpcomingRelances(activeRelances);
      setLoading(false);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Error loading relances:", error);
      }
      setLoading(false);
    }
  };

  const getAppBadgeCount = (key) => {
    if (key === 'contracts2') return dashboardStats.contracts_pending_signature || 0;
    if (key === 'delivery') return dashboardStats.location_to_deliver_week || 0;
    if (key === 'location') return dashboardStats.location_pending || 0;
    if (key === 'crm') return upcomingRelances.length || 0;
    if (key === 'dj-client') return unreadNotifications || 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header noir élégant */}
      <div className="bg-black border-b border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-center">
            {/* Logo centré et agrandi */}
            <img 
              src="https://customer-assets.emergentagent.com/job_dj-quote-system/artifacts/5vzuk33z_R%E2%80%99KEY%20PROD%20%284%29.png" 
              alt="R'KEY PROD" 
              className="h-24 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Application Selection - Style pastilles Android */}
      <div className="max-w-4xl mx-auto px-6 pb-16 pt-8">
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-y-8 gap-x-4 justify-items-center">
          
          {[
            { name: 'Agenda Presta', icon: <CalendarDays className="w-7 h-7" />, color: 'bg-red-500', route: '/agenda-prestation', key: 'agenda-prestation' },
            { name: 'Envoi de Devis', icon: <Send className="w-7 h-7" />, color: 'bg-orange-500', route: '/devis', key: 'devis' },
            { name: 'Contrats', icon: <FileSignature className="w-7 h-7" />, color: 'bg-amber-600', route: '/contracts2', key: 'contracts2' },
            { name: 'Lieux', icon: <MapPin className="w-7 h-7" />, color: 'bg-indigo-600', route: '/venues', key: 'venues' },
            { name: 'Location', icon: <Package className="w-7 h-7" />, color: 'bg-purple-500', route: '/location', key: 'location' },
            { name: 'Retrait / Retour', icon: <Handshake className="w-7 h-7" />, color: 'bg-slate-800', route: '/rental', key: 'rental' },
            { name: 'Livraison', icon: <Truck className="w-7 h-7" />, color: 'bg-blue-600', route: '/delivery', key: 'delivery' },
            { name: 'DJ/Client', icon: <Headphones className="w-7 h-7" />, color: 'bg-pink-600', route: '/dj-client', key: 'dj-client' },
            { name: 'Fichier Client', icon: <Building2 className="w-7 h-7" />, color: 'bg-green-500', route: '/crm', key: 'crm' },
            { name: 'Événements', icon: <Ticket className="w-7 h-7" />, color: 'bg-gray-800', route: '/billetterie', key: 'billetterie' },
            { name: 'Partenaires', icon: <Smile className="w-7 h-7" />, color: 'bg-indigo-600', route: '/partenaires', key: 'partenaires' },
            { name: 'Formulaires', icon: <FileText className="w-7 h-7" />, color: 'bg-orange-400', route: '/formulaires', key: 'formulaires' },
            { name: 'Artistes', icon: <User className="w-7 h-7" />, color: 'bg-yellow-500', route: '/dj-profiles', key: 'dj-profiles' },
            { name: 'Abonnements', icon: <CreditCard className="w-7 h-7" />, color: 'bg-teal-500', route: '/abonnements', key: 'abonnements' },
            { name: 'Paramètres', icon: <Settings className="w-7 h-7" />, color: 'bg-slate-600', route: '/parametres', key: 'parametres' },
          ].filter(app => {
            const savedUser = localStorage.getItem('user');
            if (!savedUser || savedUser === 'undefined') return true;
            try {
              const u = JSON.parse(savedUser);
              if (u?.role === 'admin') return true;
              const allowed = u?.allowed_apps;
              if (!allowed || allowed.length === 0) return true;
              return allowed.includes(app.key);
            } catch { return true; }
          }).map((app) => {
            const badgeCount = getAppBadgeCount(app.key);
            return (
              <button
                key={app.route}
                onClick={() => navigate(app.route)}
                className="flex flex-col items-center gap-2 group w-20"
                data-testid={`app-icon-${app.route.replace('/', '')}`}
              >
                <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 relative`}>
                  {app.icon}
                  {badgeCount > 0 && (
                    <span 
                      className={`absolute -top-1.5 -right-1.5 h-6 min-w-6 px-1.5 bg-red-500 border-2 border-white text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md ${app.key === 'dj-client' ? 'animate-bounce transform translate-x-1 -translate-y-1' : ''}`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{app.name}</span>
              </button>
            );
          })}

        </div>
      </div>

    </div>
  );
};

export default HomePage;