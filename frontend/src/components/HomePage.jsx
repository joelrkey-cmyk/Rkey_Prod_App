import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, FileCheck, Package, Users, Calendar, Bell, Building2, ArrowRight, Plus, Edit, Trash2, StickyNote, Ticket, User, Send, Clock, LayoutDashboard, CreditCard, PenLine, Settings, Handshake, Truck, Smile, FileSignature, Headphones, CalendarDays } from 'lucide-react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [upcomingRelances, setUpcomingRelances] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', shared_with_location: false });
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
    loadNotes();
    loadUnreadNotifications();
    loadDashboardStats();
    loadSubscriptionStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/home/dashboard`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/stats`);
      setSubscriptionStats(response.data);
    } catch (error) {
      console.error("Error loading subscription stats:", error);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const response = await axios.get(`${API}/dj-client/pending-alerts`);
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await axios.get(`${API}/home-notes`);
      setNotes(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      toast.error("Le titre et le contenu sont requis");
      return;
    }

    try {
      if (editingNote) {
        await axios.put(`${API}/home-notes/${editingNote.id}`, noteForm);
        toast.success("Note mise à jour !");
      } else {
        await axios.post(`${API}/home-notes`, noteForm);
        toast.success("Note créée !");
      }
      
      loadNotes();
      setShowNoteForm(false);
      setNoteForm({ title: '', content: '', shared_with_location: false });
      setEditingNote(null);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Supprimer cette note ?")) return;

    try {
      await axios.delete(`${API}/home-notes/${noteId}`);
      toast.success("Note supprimée");
      loadNotes();
      setShowNoteDialog(false);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openNoteDialog = (note) => {
    setSelectedNote(note);
    setShowNoteDialog(true);
  };

  const openNoteForm = (note = null) => {
    if (note) {
      setEditingNote(note);
      setNoteForm({ title: note.title, content: note.content, shared_with_location: note.shared_with_location || false });
    } else {
      setEditingNote(null);
      setNoteForm({ title: '', content: '', shared_with_location: false });
    }
    setShowNoteForm(true);
  };

  const loadRelances = async () => {
    try {
      setLoading(true);
      
      // Charger les relances et les entreprises
      const [relancesRes, companiesRes] = await Promise.all([
        axios.get(`${API}/crm/relances`),
        axios.get(`${API}/crm/companies`)
      ]);
      
      const allRelances = relancesRes.data;
      const allCompanies = companiesRes.data;
      
      // Filtrer les relances actives et à venir (jusqu'à 30 jours)
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);
      
      const activeRelances = allRelances
        .filter(r => r.statut === "active")
        .filter(r => {
          const relanceDate = new Date(r.date);
          return relanceDate >= today && relanceDate <= in30Days;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 10); // Max 10 relances
      
      setUpcomingRelances(activeRelances);
      setCompanies(allCompanies);
      setLoading(false);
    } catch (error) {
      console.error("Error loading relances:", error);
      setLoading(false);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.nom : "Entreprise inconnue";
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const relanceDate = new Date(dateStr);
    relanceDate.setHours(0, 0, 0, 0);
    const diffTime = relanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    if (diffDays < 7) return `Dans ${diffDays} jours`;
    return `Dans ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  };

  const getPriorityColor = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const relanceDate = new Date(dateStr);
    relanceDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((relanceDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return "bg-red-100 border-red-300 text-red-800";
    if (diffDays <= 3) return "bg-orange-100 border-orange-300 text-orange-800";
    if (diffDays <= 7) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    return "bg-blue-100 border-blue-300 text-blue-800";
  };
  
  const openNewNote = () => {
    // Déclencher l'ouverture du formulaire de nouvelle note
    const event = new CustomEvent('openNewNote');
    document.dispatchEvent(event);
    
    // Optionnel : faire défiler vers la zone des notes
    const notesElement = document.querySelector('.sticky-notes-container');
    if (notesElement) {
      notesElement.scrollIntoView({ behavior: 'smooth' });
    }
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

      {/* Dashboard - Pastilles notification style Android */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-5">
          <LayoutDashboard className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-700">En attente</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-y-6 gap-x-4 justify-items-center">
          {[
            { 
              name: 'Envoi Devis', 
              icon: <Send className="w-6 h-6" />, 
              borderColor: 'border-orange-400', 
              iconColor: 'text-orange-500',
              bgHover: 'group-hover:bg-orange-50',
              count: dashboardStats.devis_envoi_pending, 
              route: '/devis?tab=suivi' 
            },
            { 
              name: 'Contrats', 
              icon: <FileSignature className="w-6 h-6" />, 
              borderColor: 'border-amber-400', 
              iconColor: 'text-amber-500',
              bgHover: 'group-hover:bg-amber-50',
              count: dashboardStats.contracts_pending_signature, 
              route: '/contracts2?tab=list' 
            },
            { 
              name: 'À livrer', 
              icon: <Package className="w-6 h-6" />, 
              borderColor: 'border-red-400', 
              iconColor: 'text-red-500',
              bgHover: 'group-hover:bg-red-50',
              count: dashboardStats.location_to_deliver_week, 
              route: '/location?view=livraisons' 
            },
            { 
              name: 'Devis matériel', 
              icon: <FileText className="w-6 h-6" />, 
              borderColor: 'border-purple-400', 
              iconColor: 'text-purple-500',
              bgHover: 'group-hover:bg-purple-50',
              count: dashboardStats.location_pending, 
              route: '/location?view=devis' 
            },
          ].map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="flex flex-col items-center gap-2 group w-20"
              data-testid={`dashboard-${item.name.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="relative">
                <div className={`w-14 h-14 bg-transparent border-2 ${item.borderColor} ${item.bgHover} rounded-2xl flex items-center justify-center ${item.iconColor} group-hover:scale-110 transition-all duration-200`}>
                  {item.icon}
                </div>
                {item.count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-sm border-2 border-white">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-600 text-center leading-tight">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Notes - Version Compacte */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
        <Card className="shadow-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-yellow-600" />
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  Notes
                  <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white text-xs">
                    {notes.length}
                  </Badge>
                </CardTitle>
              </div>
              <Button
                onClick={() => openNoteForm()}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Nouvelle note
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-4">
            {notes.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Aucune note pour le moment
              </div>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-md border border-yellow-200 bg-white hover:bg-yellow-50 transition-all hover:shadow cursor-pointer"
                    onClick={() => openNoteDialog(note)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-semibold text-sm text-gray-800 truncate">
                            {note.title}
                          </div>
                          {note.shared_with_location && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">Location</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {note.content}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(note.created_at).toLocaleDateString('fr-FR', { 
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {notes.length > 5 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  +{notes.length - 5} autre(s) note(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Relances à Venir - Version Compacte */}
      {!loading && upcomingRelances.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
          <Card className="shadow-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    Relances à Venir
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">
                      {upcomingRelances.length}
                    </Badge>
                  </CardTitle>
                </div>
                <Button
                  onClick={() => navigate('/crm')}
                  size="sm"
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 text-xs"
                >
                  Voir tout
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-4">
              <div className="space-y-2">
                {upcomingRelances.map((relance) => (
                  <div
                    key={relance.id}
                    className={`p-2.5 rounded-md border transition-all hover:shadow cursor-pointer ${getPriorityColor(relance.date)}`}
                    onClick={() => navigate('/crm')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">
                          {getCompanyName(relance.company_id)}
                        </span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 flex-shrink-0">
                          {getDaysUntil(relance.date)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(relance.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 ml-6 truncate">
                      {relance.objet}
                    </p>
                  </div>
                ))}
              </div>
              
              {upcomingRelances.length >= 10 && (
                <div className="mt-3 text-center">
                  <Button
                    onClick={() => navigate('/crm')}
                    variant="link"
                    size="sm"
                    className="text-green-600 text-xs"
                  >
                    Voir toutes les relances →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Application Selection - Style pastilles Android */}
      <div className="max-w-4xl mx-auto px-6 pb-16 pt-8">
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-y-8 gap-x-4 justify-items-center">
          
          {[
            { name: 'Agenda Presta', icon: <CalendarDays className="w-7 h-7" />, color: 'bg-red-500', route: '/agenda-prestation', key: 'agenda-prestation' },
            { name: 'Envoi de Devis', icon: <Send className="w-7 h-7" />, color: 'bg-orange-500', route: '/devis', key: 'devis' },
            { name: 'Contrats', icon: <FileSignature className="w-7 h-7" />, color: 'bg-amber-600', route: '/contracts2', key: 'contracts2' },
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
            try {
              const u = JSON.parse(savedUser);
              if (u?.role === 'admin') return true;
              const allowed = u?.allowed_apps;
              if (!allowed || allowed.length === 0) return true;
              return allowed.includes(app.key);
            } catch { return true; }
          }).map((app) => (
            <button
              key={app.route}
              onClick={() => navigate(app.route)}
              className="flex flex-col items-center gap-2 group w-20"
              data-testid={`app-icon-${app.route.replace('/', '')}`}
            >
              <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 relative`}>
                {app.icon}
                {app.key === 'dj-client' && unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-6 min-w-6 px-1.5 bg-red-500 border-2 border-white text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-bounce transform translate-x-1 -translate-y-1">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{app.name}</span>
            </button>
          ))}

        </div>
      </div>

      {/* Dialog pour voir une note complète */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedNote?.title}</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Créée le {selectedNote && new Date(selectedNote.created_at).toLocaleDateString('fr-FR', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {selectedNote?.content}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNoteDialog(false);
                  openNoteForm(selectedNote);
                }}
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteNote(selectedNote.id)}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
            <Button onClick={() => setShowNoteDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour créer/éditer une note */}
      <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Modifier la note" : "Nouvelle note"}
            </DialogTitle>
            <DialogDescription>
              {editingNote ? "Modifiez votre note" : "Créez une nouvelle note rapide"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note_title">Titre</Label>
              <Input
                id="note_title"
                value={noteForm.title}
                onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Idée pour spectacle, À faire..."
              />
            </div>

            <div>
              <Label htmlFor="note_content">Contenu</Label>
              <Textarea
                id="note_content"
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Écrivez votre note ici..."
                rows={6}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
              <input
                type="checkbox"
                checked={noteForm.shared_with_location}
                onChange={(e) => setNoteForm(prev => ({ ...prev, shared_with_location: e.target.checked }))}
                className="rounded border-slate-300 w-4 h-4"
                data-testid="share-with-location"
              />
              <span className="text-sm text-slate-700">Partager avec l'utilisateur Location</span>
            </label>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNoteForm(false);
                setNoteForm({ title: '', content: '', shared_with_location: false });
                setEditingNote(null);
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSaveNote}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {editingNote ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;