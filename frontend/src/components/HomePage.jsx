import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, FileCheck, Package, Users, Calendar, Bell, Building2, ArrowRight, Plus, Edit, Trash2, StickyNote, Ticket, User, Send, Clock, LayoutDashboard, CreditCard, PenLine, Settings, Handshake, Truck, Smile, FileSignature, Headphones, CalendarDays, MapPin, ClipboardList, Check, RefreshCw } from 'lucide-react';
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

  // Weekly planner states
  const [plannerTasks, setPlannerTasks] = useState([]);
  const [plannerLoading, setPlannerLoading] = useState(true);
  const [inlineAddDay, setInlineAddDay] = useState(null);
  const [inlineAddText, setInlineAddText] = useState("");
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    loadRelances();
    loadUnreadNotifications();
    loadDashboardStats();
    loadSubscriptionStats();
    loadPlannerTasks();
  }, []);

  const loadPlannerTasks = async () => {
    try {
      const response = await axios.get(`${API}/home-planner/tasks`);
      setPlannerTasks(response.data || []);
      setPlannerLoading(false);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Error loading planner tasks:", error);
      }
      setPlannerLoading(false);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      // Optimistic update
      setPlannerTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
      await axios.put(`${API}/home-planner/tasks/${task.id}`, { completed: !task.completed });
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Impossible de modifier la tâche");
      loadPlannerTasks(); // Revert
    }
  };

  const handleAddInlineTask = async (day) => {
    if (!inlineAddText.trim()) {
      setInlineAddDay(null);
      return;
    }
    try {
      const response = await axios.post(`${API}/home-planner/tasks`, {
        day: day,
        text: inlineAddText.trim()
      });
      setPlannerTasks(prev => [...prev, response.data]);
      setInlineAddText("");
      setInlineAddDay(null);
      toast.success("Tâche ajoutée");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      setPlannerTasks(prev => prev.filter(t => t.id !== id));
      await axios.delete(`${API}/home-planner/tasks/${id}`);
      toast.success("Tâche supprimée");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Erreur de suppression");
      loadPlannerTasks();
    }
  };

  const handleOpenEditTask = (task) => {
    setTaskToEdit(task);
    setEditText(task.text);
    setEditTaskDialogOpen(true);
  };

  const handleSaveEditTask = async () => {
    if (!editText.trim() || !taskToEdit) return;
    try {
      const response = await axios.put(`${API}/home-planner/tasks/${taskToEdit.id}`, {
        text: editText.trim()
      });
      setPlannerTasks(prev => prev.map(t => t.id === taskToEdit.id ? response.data : t));
      setEditTaskDialogOpen(false);
      setTaskToEdit(null);
      toast.success("Tâche modifiée");
    } catch (error) {
      console.error("Error editing task:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleResetAllTasks = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir remettre à zéro toutes les tâches de la semaine ?")) {
      try {
        await axios.post(`${API}/home-planner/tasks/reset`);
        setPlannerTasks(prev => prev.map(t => ({ ...t, completed: false })));
        toast.success("Toutes les tâches ont été remises à zéro");
      } catch (error) {
        console.error("Error resetting tasks:", error);
        toast.error("Erreur lors de la remise à zéro");
      }
    }
  };

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

      {/* Planning Hebdomadaire */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <Card className="border border-slate-200 bg-white/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-800">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                  Planning Hebdomadaire
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>Suivi des tâches de la semaine (Lundi au Vendredi)</span>
                  <span className="hidden md:inline">•</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium italic flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> Remise à zéro automatique le lundi à 01h00
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Progression globale</p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {plannerTasks.filter(t => t.completed).length} / {plannerTasks.length} tâches ({plannerTasks.length > 0 ? Math.round((plannerTasks.filter(t => t.completed).length / plannerTasks.length) * 100) : 0}%)
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetAllTasks}
                  className="gap-1.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
                  title="Tout décocher manuellement"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Barre de progression globale */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden border border-slate-200/50">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: `${plannerTasks.length > 0 ? Math.round((plannerTasks.filter(t => t.completed).length / plannerTasks.length) * 100) : 0}%` }}
              />
            </div>
          </CardHeader>

          <CardContent>
            {plannerLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                <p className="text-sm font-medium">Chargement du planning...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { key: 'lundi', label: 'Lundi', color: 'border-blue-500 bg-blue-50/10 text-blue-800' },
                  { key: 'mardi', label: 'Mardi', color: 'border-purple-500 bg-purple-50/10 text-purple-800' },
                  { key: 'mercredi', label: 'Mercredi', color: 'border-pink-500 bg-pink-50/10 text-pink-800' },
                  { key: 'jeudi', label: 'Jeudi', color: 'border-orange-500 bg-orange-50/10 text-orange-800' },
                  { key: 'vendredi', label: 'Vendredi', color: 'border-emerald-500 bg-emerald-50/10 text-emerald-800' }
                ].map(day => {
                  const dayTasks = plannerTasks.filter(t => t.day === day.key);
                  const completedDayTasks = dayTasks.filter(t => t.completed).length;
                  const isDayAllDone = dayTasks.length > 0 && completedDayTasks === dayTasks.length;

                  return (
                    <div 
                      key={day.key} 
                      className={`flex flex-col rounded-xl border border-slate-150 bg-white shadow-sm overflow-hidden border-t-4 ${day.color.split(' ')[0]}`}
                    >
                      {/* En-tête du jour */}
                      <div className="px-3.5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">{day.label}</span>
                          {isDayAllDone && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Fait
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {completedDayTasks}/{dayTasks.length}
                        </span>
                      </div>

                      {/* Liste des tâches */}
                      <div className="p-3 flex-1 flex flex-col gap-2 min-h-[140px]">
                        {dayTasks.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-6 text-center">
                            <p className="text-xs text-slate-400 italic">Aucune tâche</p>
                          </div>
                        ) : (
                          <div className="space-y-2 flex-1">
                            {dayTasks.map(task => (
                              <div 
                                key={task.id} 
                                className={`group flex items-start gap-2 p-2 rounded-lg border text-xs transition-all ${
                                  task.completed 
                                    ? 'bg-slate-50 border-slate-100 text-slate-400 line-through' 
                                    : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50/50 hover:shadow-sm'
                                }`}
                              >
                                {/* Checkbox Rond/Carré élégant */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(task)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 cursor-pointer ${
                                    task.completed
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 hover:border-emerald-500 bg-white'
                                  }`}
                                >
                                  {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </button>

                                {/* Texte de la tâche */}
                                <span className="flex-1 leading-tight break-words select-none pt-0.5">
                                  {task.text}
                                </span>

                                {/* Menu action en hover */}
                                <div className="hidden group-hover:flex items-center gap-1 opacity-80 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTask(task)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Modifier la tâche"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Supprimer la tâche"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Zone d'ajout inline */}
                        {inlineAddDay === day.key ? (
                          <div className="mt-2 space-y-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <Input
                              value={inlineAddText}
                              onChange={(e) => setInlineAddText(e.target.value)}
                              placeholder="Nouvelle tâche..."
                              className="h-7 text-xs bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddInlineTask(day.key);
                                if (e.key === 'Escape') {
                                  setInlineAddDay(null);
                                  setInlineAddText("");
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 text-[10px] px-2 text-slate-500 hover:bg-slate-200"
                                onClick={() => {
                                  setInlineAddDay(null);
                                  setInlineAddText("");
                                }}
                              >
                                Annuler
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleAddInlineTask(day.key)}
                              >
                                Ajouter
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineAddDay(day.key);
                              setInlineAddText("");
                            }}
                            className="mt-2 w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'édition de tâche */}
      <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md bg-white border border-slate-200 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              Modifier la tâche
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Mettez à jour le libellé de votre tâche hebdomadaire.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="editTaskText" className="text-slate-700 font-semibold text-xs">Texte de la tâche</Label>
              <Input
                id="editTaskText"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Ex: Ranger le matériel de sonorisation"
                className="text-sm text-slate-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEditTask();
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTaskDialogOpen(false);
                setTaskToEdit(null);
              }}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditTask}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default HomePage;