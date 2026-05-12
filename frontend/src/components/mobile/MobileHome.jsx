import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, Truck, LogOut, StickyNote, Plus, ArrowLeft, Edit, Trash2, Send, FileCheck, Package, Users as UsersIcon, Ticket, FileText, User, CreditCard, Settings } from 'lucide-react';
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
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`${API}/home-notes`);
      setNotes(res.data);
    } catch (e) { /* ignore */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const saveNote = async () => {
    if (!noteForm.title.trim()) return;
    try {
      if (editingNote) {
        await axios.put(`${API}/home-notes/${editingNote.id}`, {
          ...noteForm,
          shared_with_location: true
        });
        toast.success('Note modifiée');
      } else {
        await axios.post(`${API}/home-notes`, {
          ...noteForm,
          shared_with_location: true
        });
        toast.success('Note créée');
      }
      setShowForm(false);
      setNoteForm({ title: '', content: '' });
      setEditingNote(null);
      fetchNotes();
    } catch (e) {
      toast.error('Erreur sauvegarde note');
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/home-notes/${noteId}`);
      toast.success('Note supprimée');
      fetchNotes();
    } catch (e) {
      toast.error('Erreur suppression');
    }
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, content: note.content });
    setShowForm(true);
  };

  // ==================
  // Notes full view
  // ==================
  if (showNotes) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="mobile-notes-view">
        <Toaster position="top-center" />
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => { setShowNotes(false); setShowForm(false); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100"
            data-testid="notes-back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-base font-semibold text-slate-900 flex-1">Notes</h1>
          <button
            onClick={() => { setEditingNote(null); setNoteForm({ title: '', content: '' }); setShowForm(true); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 text-white"
            data-testid="new-note-btn"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 max-w-lg mx-auto space-y-3">
          {showForm && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre..."
                className="h-10 text-sm font-medium"
                data-testid="note-title-input"
                autoFocus
              />
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Contenu de la note..."
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                data-testid="note-content-input"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowForm(false); setEditingNote(null); }}
                  className="flex-1 h-10 text-sm rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveNote}
                  disabled={!noteForm.title.trim()}
                  className="flex-1 h-10 text-sm bg-slate-800 hover:bg-slate-900 rounded-xl"
                  data-testid="save-note-btn"
                >
                  {editingNote ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          )}

          {notes.length === 0 && !showForm ? (
            <div className="text-center py-12 text-slate-400 text-sm">Aucune note partagée</div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className="bg-white border border-amber-200 rounded-xl p-4"
                data-testid={`note-${note.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{note.title}</p>
                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(note)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"
                      data-testid={`edit-note-${note.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"
                      data-testid={`delete-note-${note.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 mt-2">
                  {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))
          )}
        </main>
      </div>
    );
  }

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
            { key: 'crm', route: '/crm', label: 'CRM', desc: 'Gestion des clients', icon: UsersIcon, bg: 'bg-green-500 hover:bg-green-600' },
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

        {/* Notes shortcut */}
        <button
          onClick={() => setShowNotes(true)}
          className="w-full bg-white hover:bg-amber-50 border border-amber-200 text-slate-900 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98]"
          data-testid="mobile-notes"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <StickyNote className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-left flex-1">
            <span className="text-base font-semibold block">Notes</span>
            <span className="text-xs text-slate-400">
              {notes.length > 0 ? `${notes.length} note${notes.length > 1 ? 's' : ''}` : 'Aucune note'}
            </span>
          </div>
        </button>
      </main>
    </div>
  );
};

export default MobileHome;
