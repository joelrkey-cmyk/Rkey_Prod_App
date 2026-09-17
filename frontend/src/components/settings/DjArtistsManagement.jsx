import React, { useState, useEffect } from "react";
import { Headphones, Plus, Edit, Trash2, CheckCircle2, XCircle, Search, RefreshCw, Phone, Mail, User } from "lucide-react";
import axios from "../../services/axiosConfig";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

import API_BASE_URL from "../../utils/apiUrl";
const API = `${API_BASE_URL}/api`;

function DjArtistsManagement() {
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog Add / Edit
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDj, setEditingDj] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [nomArtistique, setNomArtistique] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [statutArtiste, setStatutArtiste] = useState("dirigeant");
  const [actif, setActif] = useState(true);

  // Alert Dialog Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [djToDelete, setDjToDelete] = useState(null);

  useEffect(() => {
    fetchDjs();
  }, []);

  const fetchDjs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/dj-fiches`);
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && typeof res.data === 'object') {
        if (Array.isArray(res.data.profiles)) {
          list = res.data.profiles;
        } else if (res.data.profiles && typeof res.data.profiles === 'object') {
          list = Object.values(res.data.profiles);
        } else {
          list = Object.values(res.data);
        }
      }
      setDjs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Erreur chargement DJ:", err);
      toast.error("Impossible de charger la liste des DJ");
      setDjs([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingDj(null);
    setNomArtistique("");
    setNomComplet("");
    setTelephone("");
    setEmail("");
    setStatutArtiste("dirigeant");
    setActif(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (dj) => {
    setEditingDj(dj);
    setNomArtistique(dj.nom_artistique || "");
    setNomComplet(dj.nom_complet || "");
    setTelephone(dj.telephone || "");
    setEmail(dj.email || "");
    setStatutArtiste(dj.statut_artiste || "dirigeant");
    setActif(dj.actif !== false);
    setOpenDialog(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!nomArtistique.trim()) {
      toast.error("Le nom d'artiste / nom de scène est obligatoire.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingDj || {}),
        nom_artistique: nomArtistique.trim(),
        nom_complet: nomComplet.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        statut_artiste: statutArtiste,
        actif: actif,
      };

      if (editingDj?.id) {
        const res = await axios.put(`${API}/dj-fiches/${editingDj.id}`, payload);
        toast.success(`DJ "${nomArtistique}" mis à jour !`);
        setDjs(prev => prev.map(d => d.id === editingDj.id ? { ...d, ...res.data } : d));
      } else {
        const res = await axios.post(`${API}/dj-fiches`, payload);
        toast.success(`DJ "${nomArtistique}" ajouté avec succès !`);
        setDjs(prev => [res.data, ...prev]);
      }
      setOpenDialog(false);
      resetForm();
    } catch (err) {
      console.error("Erreur sauvegarde DJ:", err);
      toast.error("Erreur lors de l'enregistrement du DJ");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dj) => {
    try {
      const res = await axios.patch(`${API}/dj-fiches/${dj.id}/toggle-status`);
      const newStatus = res.data?.actif;
      setDjs(prev => prev.map(d => d.id === dj.id ? { ...d, actif: newStatus } : d));
      toast.success(`Statut de ${dj.nom_artistique} : ${newStatus ? 'Actif' : 'Inactif'}`);
    } catch (err) {
      console.error("Erreur toggle status:", err);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleConfirmDelete = async () => {
    if (!djToDelete?.id) return;
    try {
      await axios.delete(`${API}/dj-fiches/${djToDelete.id}`);
      setDjs(prev => prev.filter(d => d.id !== djToDelete.id));
      toast.success(`DJ "${djToDelete.nom_artistique}" supprimé`);
      setDeleteDialogOpen(false);
      setDjToDelete(null);
    } catch (err) {
      console.error("Erreur suppression DJ:", err);
      toast.error("Erreur lors de la suppression du DJ");
    }
  };

  const safeDjs = Array.isArray(djs) ? djs : [];
  const filteredDjs = safeDjs.filter(d => {
    if (!d) return false;
    const q = searchQuery.toLowerCase();
    return (
      (d.nom_artistique || "").toLowerCase().includes(q) ||
      (d.nom_complet || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.telephone || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="border-slate-200 shadow-sm" id="dj-artists-management-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <Headphones className="w-5 h-5 text-amber-500" />
            Gestion des DJ / Artistes
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            Gérez vos DJ et artistes intervenants (synchronisés avec les Contrats, la Location et l'Agenda).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDjs}
            disabled={loading}
            className="text-slate-600 hover:text-slate-900 border-slate-300"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter un DJ
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher un DJ par nom, email, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50 border-slate-300 text-sm"
            />
          </div>
          <Badge variant="outline" className="bg-slate-100 text-slate-700 px-2.5 py-1">
            {filteredDjs.length} {filteredDjs.length > 1 ? 'DJ enregistrés' : 'DJ enregistré'}
          </Badge>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-slate-700 font-semibold">Artiste / Nom</TableHead>
                <TableHead className="text-slate-700 font-semibold">Contact</TableHead>
                <TableHead className="text-slate-700 font-semibold">Statut</TableHead>
                <TableHead className="text-slate-700 font-semibold text-center">État</TableHead>
                <TableHead className="text-slate-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Chargement des DJ...
                  </TableCell>
                </TableRow>
              ) : filteredDjs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    {searchQuery ? "Aucun DJ ne correspond à votre recherche." : "Aucun DJ enregistré pour le moment."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDjs.map((dj) => {
                  const isActif = dj.actif !== false;
                  return (
                    <TableRow key={dj.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {dj.nom_artistique ? dj.nom_artistique.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {dj.nom_artistique || "Sans nom"}
                            </div>
                            {dj.nom_complet && (
                              <div className="text-xs text-slate-500">
                                {dj.nom_complet}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {dj.telephone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{dj.telephone}</span>
                            </div>
                          )}
                          {dj.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[180px]">{dj.email}</span>
                            </div>
                          )}
                          {!dj.telephone && !dj.email && (
                            <span className="text-slate-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal capitalize bg-white text-slate-700 border-slate-200">
                          {dj.statut_artiste === 'freelance' ? 'Prestataire / Freelance' : (dj.statut_artiste || 'Dirigeant')}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dj)}
                          className="inline-flex items-center cursor-pointer transition-transform active:scale-95"
                          title={isActif ? "Désactiver ce DJ" : "Activer ce DJ"}
                        >
                          {isActif ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Inactif
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(dj)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDjToDelete(dj);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog Add / Edit DJ */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-amber-500" />
                {editingDj ? "Modifier le DJ / Artiste" : "Ajouter un DJ / Artiste"}
              </DialogTitle>
              <DialogDescription>
                Ces informations apparaîtront dans la liste des DJ pour les Contrats, la Location et l'Agenda.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="nom_artistique" className="text-xs font-semibold text-slate-700">
                  Nom d'artiste / de scène <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nom_artistique"
                  placeholder="Ex: DJ Joel, Stephane..."
                  value={nomArtistique}
                  onChange={(e) => setNomArtistique(e.target.value)}
                  required
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nom_complet" className="text-xs font-semibold text-slate-700">
                  Nom complet (Prénom et Nom légal)
                </Label>
                <Input
                  id="nom_complet"
                  placeholder="Ex: Joel R."
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dj_telephone" className="text-xs font-semibold text-slate-700">
                    Téléphone
                  </Label>
                  <Input
                    id="dj_telephone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dj_email" className="text-xs font-semibold text-slate-700">
                    Email
                  </Label>
                  <Input
                    id="dj_email"
                    type="email"
                    placeholder="dj@rkey-prod.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Statut de l'artiste
                  </Label>
                  <Select value={statutArtiste} onValueChange={setStatutArtiste}>
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dirigeant">Dirigeant</SelectItem>
                      <SelectItem value="freelance">Prestataire / Freelance</SelectItem>
                      <SelectItem value="salarie">Salarié / Intermittent</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Visibilité
                  </Label>
                  <Select value={actif ? "true" : "false"} onValueChange={(val) => setActif(val === "true")}>
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue placeholder="État" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Actif (disponible)</SelectItem>
                      <SelectItem value="false">Inactif (masqué)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={saving}
                className="border-slate-300"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? "Enregistrement..." : (editingDj ? "Enregistrer les modifications" : "Créer le DJ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer ce DJ ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{djToDelete?.nom_artistique}</strong> ?
              Cette action retirera le DJ de la liste des artistes disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDjToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default DjArtistsManagement;
