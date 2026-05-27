import React, { useState, useEffect } from 'react';
import axios from '../../services/axiosConfig';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Key, ServerOff, CheckCircle2, XCircle } from 'lucide-react';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const AVAILABLE_APPS = [
  { id: 'locations', label: 'Matériel & Devis' },
  { id: 'devis', label: 'Suivi Devis' },
  { id: 'billetterie', label: 'Billetterie' },
  { id: 'contrats', label: 'Contrats v2' },
  { id: 'abonnements', label: 'Abonnements' },
  { id: 'agenda', label: 'Agenda & DJ' },
  { id: 'rental', label: 'Location' },
  { id: 'delivery', label: 'Livraison' },
  { id: 'crm', label: 'CRM / Admin' },
  { id: 'partners', label: 'Partenaires' }
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [interfaceType, setInterfaceType] = useState('desktop');
  const [isActive, setIsActive] = useState(true);
  const [allowedApps, setAllowedApps] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/auth/users-admin`);
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      await axios.post(`${API}/auth/users-admin`, {
        username,
        password,
        role,
        interface_type: interfaceType,
        is_active: isActive,
        allowed_apps: allowedApps
      });
      toast.success('Utilisateur créé avec succès');
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await axios.put(`${API}/auth/users-admin/${selectedUser.id}`, {
        role,
        interface_type: interfaceType,
        is_active: isActive,
        allowed_apps: allowedApps
      });
      toast.success('Utilisateur mis à jour');
      setIsEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!selectedUser || !password) {
      toast.warning('Mot de passe vide');
      return;
    }
    try {
      await axios.put(`${API}/auth/users-admin/${selectedUser.id}`, {
        password
      });
      toast.success('Mot de passe modifié avec succès');
      setIsPasswordOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${userName}" ?`)) return;
    try {
      await axios.delete(`${API}/auth/users-admin/${userId}`);
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setUsername(user.username);
    setRole(user.role || 'admin');
    setInterfaceType(user.interface_type || 'desktop');
    setIsActive(user.is_active !== false);
    setAllowedApps(user.allowed_apps || []);
    setIsEditOpen(true);
  };

  const openPassword = (user) => {
    setSelectedUser(user);
    setPassword('');
    setIsPasswordOpen(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    setRole('admin');
    setInterfaceType('desktop');
    setIsActive(true);
    setAllowedApps([]);
  };

  const toggleApp = (appId) => {
    setAllowedApps(prev => 
      prev.includes(appId)
        ? prev.filter(x => x !== appId)
        : [...prev, appId]
    );
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
        <div>
          <CardTitle className="text-xl font-bold text-slate-900">Collaborateurs & Permissions</CardTitle>
          <CardDescription>Gérez les comptes utilisateurs, leurs accès applicatifs et leurs rôles</CardDescription>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 self-start sm:self-auto h-9"
        >
          <Plus className="h-4 w-4" />
          Nouveau collaborateur
        </Button>
      </CardHeader>
      
      <CardContent className="pt-6">
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Chargement des collaborateurs...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <ServerOff className="h-8 w-8 text-slate-400" />
            Aucun utilisateur configuré
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Utilisateur / Identifiant</TableHead>
                  <TableHead className="font-semibold text-slate-700">Rôle</TableHead>
                  <TableHead className="font-semibold text-slate-700">Interface</TableHead>
                  <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                  <TableHead className="font-semibold text-slate-700">Applications autorisées</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-slate-600">{user.interface_type || 'desktop'}</TableCell>
                    <TableCell>
                      {user.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-550" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                          <XCircle className="h-3.5 w-3.5 text-slate-400" />
                          Inactif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="flex flex-wrap gap-1">
                        {user.allowed_apps && user.allowed_apps.length > 0 ? (
                          user.allowed_apps.map(appId => {
                            const found = AVAILABLE_APPS.find(a => a.id === appId);
                            return (
                              <Badge key={appId} variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 bg-slate-50/50 text-slate-600">
                                {found ? found.label : appId}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aucun accès</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          onClick={() => openPassword(user)}
                          variant="ghost" 
                          size="icon"
                          title="Modifier le mot de passe"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => openEdit(user)}
                          variant="ghost" 
                          size="icon"
                          title="Modifier les détails"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(user.id, user.username)}
                          variant="ghost" 
                          size="icon"
                          title="Supprimer le collaborateur"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Nouveau collaborateur</DialogTitle>
              <DialogDescription>Créez un compte avec des restrictions d'accès précises</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-username">Identifiant (Nom d'utilisateur)</Label>
                  <Input 
                    id="create-username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="ex: dj_samuel"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-password">Mot de passe</Label>
                  <Input 
                    id="create-password" 
                    type="password"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="dj">Animateur / DJ</SelectItem>
                      <SelectItem value="employee">Collaborateur standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Interface par défaut</Label>
                  <Select value={interfaceType} onValueChange={setInterfaceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type d'interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Ordinateur / Bureau</SelectItem>
                      <SelectItem value="mobile">Téléphone / Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox 
                  id="create-active" 
                  checked={isActive} 
                  onCheckedChange={setIsActive} 
                />
                <Label htmlFor="create-active" className="cursor-pointer">Le compte est actif dès sa création</Label>
              </div>

              <div className="border-t pt-4 mt-2">
                <Label className="block mb-3 text-slate-700 font-semibold">Autorisations d'applications</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_APPS.map(app => (
                    <div key={app.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded">
                      <Checkbox 
                        id={`create-app-${app.id}`} 
                        checked={allowedApps.includes(app.id)} 
                        onCheckedChange={() => toggleApp(app.id)} 
                      />
                      <Label htmlFor={`create-app-${app.id}`} className="text-xs font-normal cursor-pointer text-slate-700 select-none">
                        {app.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Créer le compte</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DETAILS DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Éditer le collaborateur</DialogTitle>
              <DialogDescription>Mettre à jour le rôle et les autorisations de {username}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="dj">Animateur / DJ</SelectItem>
                      <SelectItem value="employee">Collaborateur standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Interface par défaut</Label>
                  <Select value={interfaceType} onValueChange={setInterfaceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type d'interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Ordinateur / Bureau</SelectItem>
                      <SelectItem value="mobile">Téléphone / Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox 
                  id="edit-active" 
                  checked={isActive} 
                  onCheckedChange={setIsActive} 
                />
                <Label htmlFor="edit-active" className="cursor-pointer">Le compte est actif</Label>
              </div>

              <div className="border-t pt-4 mt-2">
                <Label className="block mb-3 text-slate-700 font-semibold">Autorisations d'applications</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_APPS.map(app => (
                    <div key={app.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded bg-white">
                      <Checkbox 
                        id={`edit-app-${app.id}`} 
                        checked={allowedApps.includes(app.id)} 
                        onCheckedChange={() => toggleApp(app.id)} 
                      />
                      <Label htmlFor={`edit-app-${app.id}`} className="text-xs font-normal cursor-pointer text-slate-700 select-none">
                        {app.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PASSWORD MOIFICATION DIALOG */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handlePasswordChange}>
            <DialogHeader>
              <DialogTitle>Modifier le mot de passe</DialogTitle>
              <DialogDescription>Définir un nouveau mot de passe pour {selectedUser?.username}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pwd-change">Nouveau mot de passe</Label>
                <Input 
                  id="pwd-change" 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Minimum 6 caractères"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Mettre à jour le mot de passe</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
