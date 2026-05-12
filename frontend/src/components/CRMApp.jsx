import React, { useState, useEffect } from "react";
import axios from "../services/axiosConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Building2, Users, Calendar, Plus, Edit, Trash2, Check, X, Search, Phone, Mail, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

function CRMApp() {
  const [companies, setCompanies] = useState([]);
  const [relances, setRelances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [companyForm, setCompanyForm] = useState({
    nom: "",
    secteur: "",
    adresse: "",
    telephone: "",
    email: "",
    statut: "prospect",
    contacts: [],
    notes: ""
  });

  const [newContact, setNewContact] = useState({
    nom: "",
    fonction: "",
    telephone: "",
    email: ""
  });

  const [relanceForm, setRelanceForm] = useState({
    date: "",
    objet: "",
    company_id: ""
  });

  useEffect(() => {
    loadCompanies();
    loadRelances();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await axios.get(`${API}/crm/companies`);
      setCompanies(response.data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Erreur lors du chargement des entreprises");
    }
  };

  const loadRelances = async () => {
    try {
      const response = await axios.get(`${API}/crm/relances`);
      setRelances(response.data);
    } catch (error) {
      console.error("Error loading relances:", error);
      toast.error("Erreur lors du chargement des relances");
    }
  };

  const handleSaveCompany = async () => {
    if (!companyForm.nom.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    try {
      if (editingCompany) {
        await axios.put(`${API}/crm/companies/${editingCompany.id}`, {
          ...editingCompany,
          ...companyForm
        });
        toast.success("Entreprise mise à jour !");
      } else {
        await axios.post(`${API}/crm/companies`, companyForm);
        toast.success("Entreprise créée !");
      }
      
      loadCompanies();
      setShowCompanyDialog(false);
      resetCompanyForm();
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) {
      return;
    }

    try {
      await axios.delete(`${API}/crm/companies/${companyId}`);
      toast.success("Entreprise supprimée");
      loadCompanies();
      loadRelances();
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddContact = () => {
    if (!newContact.nom.trim()) {
      toast.error("Le nom du contact est requis");
      return;
    }

    setCompanyForm(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...newContact }]
    }));

    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
    toast.success("Contact ajouté");
  };

  const handleRemoveContact = (index) => {
    setCompanyForm(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSaveRelance = async () => {
    if (!relanceForm.date || !relanceForm.objet.trim()) {
      toast.error("La date et l'objet sont requis");
      return;
    }

    try {
      await axios.post(`${API}/crm/relances`, {
        ...relanceForm,
        company_id: selectedCompany.id
      });
      
      toast.success("Relance créée !");
      loadRelances();
      setShowRelanceDialog(false);
      setRelanceForm({ date: "", objet: "", company_id: "" });
    } catch (error) {
      console.error("Error saving relance:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleCompleteRelance = async (relanceId) => {
    try {
      await axios.patch(`${API}/crm/relances/${relanceId}/complete`);
      toast.success("Relance marquée comme terminée");
      loadRelances();
    } catch (error) {
      console.error("Error completing relance:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteRelance = async (relanceId) => {
    if (!window.confirm("Supprimer cette relance ?")) return;

    try {
      await axios.delete(`${API}/crm/relances/${relanceId}`);
      toast.success("Relance supprimée");
      loadRelances();
    } catch (error) {
      console.error("Error deleting relance:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      nom: "",
      secteur: "",
      adresse: "",
      telephone: "",
      email: "",
      statut: "prospect",
      contacts: [],
      notes: ""
    });
    setEditingCompany(null);
  };

  const openEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyForm({
      nom: company.nom,
      secteur: company.secteur || "",
      adresse: company.adresse || "",
      telephone: company.telephone || "",
      email: company.email || "",
      statut: company.statut,
      contacts: company.contacts || [],
      notes: company.notes || ""
    });
    setShowCompanyDialog(true);
  };

  const getCompanyRelances = (companyId) => {
    return relances.filter(r => r.company_id === companyId);
  };

  const getActiveRelances = (companyId) => {
    return getCompanyRelances(companyId).filter(r => r.statut === "active");
  };

  const getCompletedRelances = (companyId) => {
    return getCompanyRelances(companyId).filter(r => r.statut === "terminee");
  };

  const getTodayRelances = () => {
    const today = new Date().toISOString().split('T')[0];
    return relances.filter(r => r.statut === "active" && r.date === today);
  };

  const getUpcomingRelances = () => {
    const today = new Date().toISOString().split('T')[0];
    return relances.filter(r => r.statut === "active" && r.date >= today);
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (company.secteur && company.secteur.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || company.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (statut) => {
    const styles = {
      client: "bg-green-100 text-green-800 hover:bg-green-100",
      demarche: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      prospect: "bg-blue-100 text-blue-800 hover:bg-blue-100"
    };
    
    const labels = {
      client: "🟢 Déjà client",
      demarche: "🟡 Démarché",
      prospect: "🔵 Prospect"
    };

    return (
      <Badge className={styles[statut] || ""}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            📇 CRM Entreprises
          </h1>
          <p className="text-gray-600">Gérez vos contacts entreprises et relances commerciales</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Entreprises</p>
                  <p className="text-3xl font-bold">{companies.length}</p>
                </div>
                <Building2 className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Prospects</p>
                  <p className="text-3xl font-bold">
                    {companies.filter(c => c.statut === "prospect").length}
                  </p>
                </div>
                <Users className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Relances Aujourd'hui</p>
                  <p className="text-3xl font-bold">{getTodayRelances().length}</p>
                </div>
                <Calendar className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Relances À Venir</p>
                  <p className="text-3xl font-bold">{getUpcomingRelances().length}</p>
                </div>
                <FileText className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche et filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="client">Déjà clients</SelectItem>
                  <SelectItem value="demarche">Démarchés</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => {
                  resetCompanyForm();
                  setShowCompanyDialog(true);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Entreprise
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des entreprises */}
        <div className="grid grid-cols-1 gap-4">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune entreprise trouvée</p>
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map(company => {
              const activeRelances = getActiveRelances(company.id);
              const completedRelances = getCompletedRelances(company.id);
              
              return (
                <Card key={company.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                              🏢 {company.nom}
                              {getStatusBadge(company.statut)}
                            </h3>
                            {company.secteur && (
                              <p className="text-sm text-gray-600 mb-2">
                                <Badge variant="outline">{company.secteur}</Badge>
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCompany(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCompany(company.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          {company.adresse && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {company.adresse}
                            </div>
                          )}
                          {company.telephone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.telephone}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                        </div>

                        {company.contacts && company.contacts.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">👥 Contacts ({company.contacts.length}) :</p>
                            <div className="space-y-1">
                              {company.contacts.map((contact, idx) => (
                                <div key={idx} className="text-sm text-gray-600 pl-4">
                                  <strong>{contact.nom}</strong>
                                  {contact.fonction && ` - ${contact.fonction}`}
                                  {contact.telephone && ` • ${contact.telephone}`}
                                  {contact.email && ` • ${contact.email}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {company.notes && (
                          <div className="bg-yellow-50 p-3 rounded-lg mb-3">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.notes}</p>
                          </div>
                        )}

                        {/* Relances actives */}
                        {activeRelances.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">📅 Relances actives ({activeRelances.length}) :</p>
                            <div className="space-y-2">
                              {activeRelances.map(relance => (
                                <div key={relance.id} className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">
                                      {new Date(relance.date).toLocaleDateString('fr-FR')} - {relance.objet}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCompleteRelance(relance.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteRelance(relance.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Historique des relances */}
                        {completedRelances.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">📋 Historique ({completedRelances.length} terminées) :</p>
                            <div className="space-y-1">
                              {completedRelances.slice(0, 3).map(relance => (
                                <div key={relance.id} className="text-sm text-gray-500 pl-4">
                                  ✅ {new Date(relance.date).toLocaleDateString('fr-FR')} - {relance.objet}
                                </div>
                              ))}
                              {completedRelances.length > 3 && (
                                <p className="text-xs text-gray-400 pl-4">
                                  ...et {completedRelances.length - 3} autre(s)
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCompany(company);
                              setRelanceForm({ date: "", objet: "", company_id: company.id });
                              setShowRelanceDialog(true);
                            }}
                            className="border-green-500 text-green-600 hover:bg-green-50"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une relance
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog Entreprise */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Modifier l'entreprise" : "Nouvelle entreprise"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l'entreprise
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom de l'entreprise *</Label>
              <Input
                id="nom"
                value={companyForm.nom}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Ex: Mairie de Colmar"
              />
            </div>

            <div>
              <Label htmlFor="secteur">Secteur</Label>
              <Input
                id="secteur"
                value={companyForm.secteur}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, secteur: e.target.value }))}
                placeholder="Ex: CE, Mairie, Association..."
              />
            </div>

            <div>
              <Label htmlFor="statut">Statut</Label>
              <Select 
                value={companyForm.statut} 
                onValueChange={(value) => setCompanyForm(prev => ({ ...prev, statut: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">🔵 Prospect</SelectItem>
                  <SelectItem value="demarche">🟡 Démarché</SelectItem>
                  <SelectItem value="client">🟢 Déjà client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={companyForm.adresse}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, adresse: e.target.value }))}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={companyForm.telephone}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, telephone: e.target.value }))}
                  placeholder="03 89 XX XX XX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@entreprise.fr"
                />
              </div>
            </div>

            {/* Contacts */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">👥 Contacts</Label>
              
              {companyForm.contacts.length > 0 && (
                <div className="space-y-2 mb-4">
                  {companyForm.contacts.map((contact, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{contact.nom}</p>
                        <p className="text-sm text-gray-600">
                          {contact.fonction && `${contact.fonction} • `}
                          {contact.telephone && `${contact.telephone} • `}
                          {contact.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveContact(idx)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium">Ajouter un contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nom *"
                    value={newContact.nom}
                    onChange={(e) => setNewContact(prev => ({ ...prev, nom: e.target.value }))}
                  />
                  <Input
                    placeholder="Fonction"
                    value={newContact.fonction}
                    onChange={(e) => setNewContact(prev => ({ ...prev, fonction: e.target.value }))}
                  />
                  <Input
                    placeholder="Téléphone"
                    value={newContact.telephone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, telephone: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddContact} size="sm" variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter ce contact
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={companyForm.notes}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes libres sur l'entreprise..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveCompany}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {editingCompany ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Relance */}
      <Dialog open={showRelanceDialog} onOpenChange={setShowRelanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle relance</DialogTitle>
            <DialogDescription>
              Pour : {selectedCompany?.nom}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="relance_date">Date prévue *</Label>
              <Input
                id="relance_date"
                type="date"
                value={relanceForm.date}
                onChange={(e) => setRelanceForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="relance_objet">Objet de la relance *</Label>
              <Input
                id="relance_objet"
                value={relanceForm.objet}
                onChange={(e) => setRelanceForm(prev => ({ ...prev, objet: e.target.value }))}
                placeholder="Ex: Proposition Noël 2025"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelanceDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveRelance}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              Créer la relance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CRMApp;
