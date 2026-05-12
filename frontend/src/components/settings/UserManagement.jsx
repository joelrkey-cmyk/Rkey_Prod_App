import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, Monitor, Smartphone, Eye, EyeOff } from 'lucide-react';

import API_BASE_URL from '../../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const AVAILABLE_APPS = [
  { key: 'devis', label: 'Envoi de Devis' },
  { key: 'contracts', label: 'Contrats Artistiques' },
  { key: 'location', label: 'Location' },
  { key: 'rental', label: 'Retrait / Retour' },
  { key: 'delivery', label: 'Livraison' },
  { key: 'crm', label: 'CRM' },
  { key: 'billetterie', label: 'Événements' },
  { key: 'formulaires', label: 'Formulaires' },
  { key: 'dj-profiles', label: 'Profils Artistes' },
  { key: 'abonnements', label: 'Abonnements' },
  { key: 'parametres', label: 'Paramètres' },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    password: '',
    allowed_apps: [],
    interface_type: 'desktop',
  });

  const token = localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/users-admin`, { headers });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', full_name: '', password: '', allowed_apps: [...AVAILABLE_APPS.map(a => a.key)], interface_type: 'desktop' });
    setShowPassword(false);
    setShowDialog(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      full_name: user.full_name,
      password: '',
      allowed_apps: [...(user.allowed_apps || [])],
      interface_type: user.interface_type || 'desktop',
    });
    setShowPassword(false);
    setShowDialog(true);
  };

  const toggleApp = (appKey) => {
    setForm(prev => ({
      ...prev,
      allowed_apps: prev.allowed_apps.includes(appKey)
        ? prev.allowed_apps.filter(a => a !== appKey)
        : [...prev.allowed_apps, appKey],
    }));
  };

  const selectAll = () => setForm(prev => ({ ...prev, allowed_apps: AVAILABLE_APPS.map(a => a.key) }));
  const selectNone = () => setForm(prev => ({ ...prev, allowed_apps: [] }));

  const handleSave = async () => {
    if (!editingUser && (!form.username.trim() || !form.password.trim())) {
      toast.error("Nom d'utilisateur et mot de passe requis");
      return;
    }
    try {
      let res;
      if (editingUser) {
        const body = {
          full_name: form.full_name,
          allowed_apps: form.allowed_apps,
          interface_type: form.interface_type,
        };
        if (form.password.trim()) body.password = form.password;
        res = await fetch(`${BACKEND_URL}/api/auth/users-admin/${editingUser.id}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${BACKEND_URL}/api/auth/users-admin`, {
          method: 'POST', headers, body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erreur');
      }
      toast.success(editingUser ? 'Utilisateur modifié' : 'Utilisateur créé');
      setShowDialog(false);
      loadUsers();
    } catch (e) {
      toast.error(e.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users-admin/${user.id}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erreur');
      }
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (e) {
      toast.error(e.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <>
      <Card className="border-slate-200" data-testid="users-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Gestion des utilisateurs
              </CardTitle>
              <CardDescription>Créez et gérez les comptes utilisateurs et leurs accès</CardDescription>
            </div>
            <Button onClick={openCreate} size="sm" className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-user-btn">
              <Plus className="w-4 h-4 mr-1" /> Nouvel utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun utilisateur</div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border" data-testid={`user-row-${user.username}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-indigo-700">
                        {(user.full_name || user.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{user.full_name || user.username}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{user.username}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {user.interface_type === 'mobile' ? (
                          <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Smartphone className="w-3 h-3" /> Mobile</span>
                        ) : (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Monitor className="w-3 h-3" /> Desktop</span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {(user.allowed_apps || []).length}/{AVAILABLE_APPS.length} apps
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500 hover:text-indigo-600" onClick={() => openEdit(user)} data-testid={`edit-user-${user.username}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-red-600" onClick={() => handleDelete(user)} data-testid={`delete-user-${user.username}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" aria-describedby="user-dialog-desc">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
            <DialogDescription id="user-dialog-desc">
              {editingUser ? 'Modifiez les informations et les accès' : 'Créez un nouveau compte utilisateur'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Username */}
            <div>
              <Label className="text-xs text-gray-500">Nom d'utilisateur</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                disabled={!!editingUser}
                placeholder="ex: technicien1"
                data-testid="user-username-input"
              />
            </div>

            {/* Full Name */}
            <div>
              <Label className="text-xs text-gray-500">Nom complet</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="ex: Jean Dupont"
                data-testid="user-fullname-input"
              />
            </div>

            {/* Password */}
            <div>
              <Label className="text-xs text-gray-500">
                {editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? '••••••••' : 'Mot de passe'}
                  data-testid="user-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Interface Type */}
            <div>
              <Label className="text-xs text-gray-500">Type d'interface</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, interface_type: 'desktop' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.interface_type === 'desktop'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  data-testid="interface-desktop"
                >
                  <Monitor className="w-4 h-4" /> Ordinateur
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, interface_type: 'mobile' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.interface_type === 'mobile'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  data-testid="interface-mobile"
                >
                  <Smartphone className="w-4 h-4" /> Mobile
                </button>
              </div>
            </div>

            {/* Allowed Apps */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-gray-500">Applications autorisées</Label>
                <div className="flex gap-1">
                  <button type="button" onClick={selectAll} className="text-[10px] text-indigo-600 hover:underline">Tout</button>
                  <span className="text-[10px] text-gray-300">/</span>
                  <button type="button" onClick={selectNone} className="text-[10px] text-gray-400 hover:underline">Aucun</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                {AVAILABLE_APPS.map(app => {
                  const checked = form.allowed_apps.includes(app.key);
                  return (
                    <label
                      key={app.key}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                        checked ? 'bg-indigo-50 text-indigo-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                      data-testid={`app-toggle-${app.key}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleApp(app.key)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                      <span className="truncate text-xs">{app.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-user-btn">
              {editingUser ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;
