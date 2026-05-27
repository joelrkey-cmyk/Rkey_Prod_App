import React, { useState, useEffect } from "react";
import { UserPlus, Edit, Trash2, Shield, Mail, CheckCircle2, XCircle, Search, RefreshCw, Eye, EyeOff } from "lucide-react";
import axios from "../../services/axiosConfig";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

import API_BASE_URL from "../../utils/apiUrl";
const API = `${API_BASE_URL}/api`;

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [isActive, setIsActive] = useState(true);
  
  // Password visible toggle
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/auth/users-admin`);
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setUsername("");
    setPassword("");
    setName("");
    setEmail("");
    setRole("user");
    setIsActive(true);
    setShowPassword(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setUsername(user.username || "");
    setPassword(""); // Leave blank unless changing
    setName(user.name || "");
    setEmail(user.email || "");
    setRole(user.role || "user");
    setIsActive(user.is_active !== false);
    setShowPassword(false);
    setOpenDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username || !name) {
      toast.error("Le nom d'utilisateur et le nom complet sont obligatoires");
      return;
    }

    const payload = {
      username,
      name,
      email,
      role,
      is_active: isActive
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (editingUser) {
        await axios.put(`${API}/auth/users-admin/${editingUser.id || editingUser._id}`, payload);
        toast.success("Utilisateur mis à jour avec succès");
      } else {
        if (!password) {
          toast.error("Le mot de passe est requis pour un nouvel utilisateur");
          return;
        }
        await axios.post(`${API}/auth/users-admin`, payload);
        toast.success("Utilisateur créé avec succès");
      }
      setOpenDialog(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette opération est irréversible.")) {
      return;
    }

    try {
      await axios.delete(`${API}/auth/users-admin/${userId}`);
      toast.success("Utilisateur supprimé");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    return (
      (user.name || "").toLowerCase().includes(q) ||
      (user.username || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" data-testid="user-management">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gérez les comptes d'utilisateurs de la plateforme, attribuez des rôles et réinitialisez les mots de passe.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={fetchUsers}
            variant="outline"
            size="icon"
            className="h-10 w-10 border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          
          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* Searchbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, nom d'utilisateur, email..."
            className="pl-10 h-10 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Users List Table */}
      {loading ? (
        <div className="flex justify-center items-center py-16 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-800">Nom Complet</TableHead>
                <TableHead className="font-semibold text-slate-800">Identifiant</TableHead>
                <TableHead className="font-semibold text-slate-800">Email</TableHead>
                <TableHead className="font-semibold text-slate-800">Rôle</TableHead>
                <TableHead className="font-semibold text-slate-800">Statut</TableHead>
                <TableHead className="text-right font-semibold text-slate-800">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id || user._id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-900">{user.name}</TableCell>
                    <TableCell className="text-slate-600">{user.username}</TableCell>
                    <TableCell className="text-slate-650 flex items-center gap-1.5 py-4">
                      {user.email ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{user.email}</span>
                        </>
                      ) : (
                        <span className="text-slate-350 italic">Aucun email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        user.role === "admin" 
                          ? "bg-red-100 text-red-900" 
                          : "bg-blue-100 text-blue-900"
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.is_active !== false ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-max">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full w-max">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenEdit(user)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(user.id || user._id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* User Create/Edit Dialog */}
      {openDialog && (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingUser ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                {editingUser 
                  ? "Modifiez les informations de l'utilisateur. Laissez le mot de passe vide pour le conserver." 
                  : "Renseignez les informations de connexion de l'utilisateur."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Identifiant de connexion *</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: jsmith"
                  className="h-10 border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nom Complet *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: John Smith"
                  className="h-10 border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Adresse Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: john@rkeyprod.com"
                  className="h-10 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Mot de passe {editingUser ? "(optionnel)" : "*"}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Laisser vide" : "Saisir un mot de passe"}
                    className="h-10 border-slate-200 rounded-xl pr-10"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Rôle</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="user">Utilisateur standard</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Statut de connexion</label>
                  <Select value={isActive ? "active" : "inactive"} onValueChange={(val) => setIsActive(val === "active")}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  onClick={() => setOpenDialog(false)}
                  variant="outline"
                  className="rounded-xl h-10 border-slate-200"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default UserManagement;
