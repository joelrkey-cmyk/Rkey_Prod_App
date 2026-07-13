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
import { Building2, Users, Calendar, Plus, Edit, Trash2, Check, X, Search, Phone, Mail, MapPin, FileText, UserPlus } from "lucide-react";
import { toast } from "sonner";

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

// Helpers to extract year and event type from notes (for legacy data)
const parseFromNotes = (notes) => {
  if (!notes) return { year: "", type: "" };
  let year = "";
  let type = "";
  
  const dateMatch = notes.match(/Événement:\s*(\d{4}-\d{2}-\d{2})/i) || 
                    notes.match(/Événement:\s*(\d{2}\/\d{2}\/(\d{4}))/i) ||
                    notes.match(/Événement:\s*(20\d{2})/i);
  if (dateMatch) {
    if (dateMatch[2]) {
      year = dateMatch[2];
    } else {
      const yrMatch = dateMatch[1].match(/\b(20\d{2})\b/);
      if (yrMatch) year = yrMatch[1];
    }
  } else {
    const yrMatch = notes.match(/\b(20\d{2})\b/);
    if (yrMatch) year = yrMatch[1];
  }
  
  const typeMatch = notes.match(/Type:\s*([^\n]+)/i);
  if (typeMatch) {
    type = typeMatch[1].trim();
  }
  
  return { year, type };
};

const getCompanyYear = (company) => {
  if (company.annee_prestation) return String(company.annee_prestation);
  const parsed = parseFromNotes(company.notes);
  return parsed.year ? String(parsed.year) : "";
};

const getCompanyEventType = (company) => {
  if (company.type_evenement) return company.type_evenement;
  const parsed = parseFromNotes(company.notes);
  return parsed.type || "";
};

const getCompanyEventDate = (company) => {
  if (company.date_evenement) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(company.date_evenement)) {
      return company.date_evenement;
    }
  }
  if (!company.notes) return "";
  const match = company.notes.match(/Événement:\s*(\d{4}-\d{2}-\d{2})/i);
  if (match) return match[1];

  const matchFr = company.notes.match(/Événement:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (matchFr) return `${matchFr[3]}-${matchFr[2]}-${matchFr[1]}`;

  return "";
};

const getCompanyProvenance = (company) => {
  if (company.provenance) return company.provenance;
  if (company.notes) {
    if (company.notes.includes("Importé depuis l'application Matériel") || company.notes.toLowerCase().includes("location: ")) {
      return "location";
    }
    if (company.notes.includes("Importé depuis le contrat")) {
      return "contrat";
    }
  }
  return "";
};

const extractEmails = (emailStr) => {
  if (!emailStr) return [];
  return emailStr
    .split(/[\/,;]+/)
    .map(email => email.trim())
    .filter(email => email && email.includes("@"));
};

function CRMApp() {
  const [companies, setCompanies] = useState([]);
  const [relances, setRelances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [anneeFilter, setAnneeFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [companyForm, setCompanyForm] = useState({
    nom: "",
    type_client: "Particulier",
    siret: "",
    secteur: "",
    adresse: "",
    telephone: "",
    email: "",
    statut: "prospect",
    contacts: [],
    notes: "",
    blacklist_tags: "",
    annee_prestation: "",
    type_evenement: "",
    date_evenement: ""
  });

  const [typeFilter, setTypeFilter] = useState("all");
  const [isImporting, setIsImporting] = useState(false);

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
      type_client: "Particulier",
      siret: "",
      secteur: "",
      adresse: "",
      telephone: "",
      email: "",
      statut: "prospect",
      contacts: [],
      notes: "",
      blacklist_tags: "",
      annee_prestation: "",
      type_evenement: "",
      date_evenement: ""
    });
    setEditingCompany(null);
  };

  const openEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyForm({
      nom: company.nom,
      type_client: company.type_client || "Entreprise",
      siret: company.siret || "",
      secteur: company.secteur || "",
      adresse: company.adresse || "",
      telephone: company.telephone || "",
      email: company.email || "",
      statut: company.statut,
      contacts: company.contacts || [],
      notes: company.notes || "",
      blacklist_tags: company.blacklist_tags || "",
      annee_prestation: company.annee_prestation || "",
      type_evenement: company.type_evenement || "",
      date_evenement: company.date_evenement || getCompanyEventDate(company) || ""
    });
    setShowCompanyDialog(true);
  };

  const handleEditFromDetail = (company) => {
    setShowDetailDialog(false);
    openEditCompany(company);
  };

  const handleSiretFetch = async () => {
    if (!companyForm.siret || companyForm.siret.trim().length < 9) {
      toast.error("Veuillez saisir un SIRET ou SIREN valide");
      return;
    }
    
    try {
      toast.info("Recherche SIRENE en cours...");
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${companyForm.siret}`);
      const data = await response.json();
      
      if (data && data.results && data.results.length > 0) {
        const result = data.results[0];
        
        const siege = result.siege || {};
        const adresseComplete = siege.adresse || `${siege.numero_voie || ''} ${siege.type_voie || ''} ${siege.libelle_voie || ''}, ${siege.code_postal || ''} ${siege.libelle_commune || ''}`.trim();

        setCompanyForm(prev => ({
          ...prev,
          nom: result.nom_complet || prev.nom,
          adresse: adresseComplete !== ',' ? adresseComplete.replace(/ {2,}/g, ' ') : prev.adresse,
          siret: siege.siren ? (siege.siret || siege.siren) : prev.siret,
          secteur: result.activite_principale || prev.secteur
        }));
        
        toast.success("Informations trouvées et appliquées !");
      } else {
        toast.error("Aucune entreprise trouvée avec ce numéro");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la recherche SIRENE");
    }
  };

  const handleImportContacts = async () => {
    setIsImporting(true);
    try {
      let newClientsAdded = 0;
      
      // 1. Fetch contracts
      let contracts = [];
      try {
        const responseContracts = await axios.get(`${API}/contracts2`);
        contracts = responseContracts.data || [];
      } catch (err) {
        console.error("Error fetching contracts:", err);
        toast.error("Erreur de chargement des contrats, l'import des contrats a été ignoré");
      }

      // 2. Fetch Location Clients
      let locationClients = [];
      try {
        const responseLoc = await axios.get(`${API}/location/clients`);
        locationClients = responseLoc.data || [];
      } catch (err) {
        console.error("Error fetching location clients:", err);
        toast.error("Erreur de chargement des clients de location, cet import a été ignoré");
      }

      // Local state copy to avoid inserting duplicates of items imported in the same execution
      let currentCompanies = [...companies];

      // Process DJ / Prestation Contracts
      for (const contract of contracts) {
        const clientInfo = contract.client_info || {};
        
        // Skip if no useful data
        if (!clientInfo.name && !clientInfo.company && !clientInfo.email) continue;
        
        const emailLower = clientInfo.email ? clientInfo.email.toLowerCase().trim() : "";
        const nameLower = clientInfo.name ? clientInfo.name.toLowerCase().trim() : "";
        const companyLower = clientInfo.company ? clientInfo.company.toLowerCase().trim() : "";

        // Check if exists
        const exists = currentCompanies.some(c => {
          const cEmail = c.email ? c.email.toLowerCase().trim() : "";
          const cNom = c.nom ? c.nom.toLowerCase().trim() : "";
          return (emailLower && cEmail === emailLower) || 
                 (nameLower && cNom === nameLower) || 
                 (companyLower && cNom === companyLower);
        });
        
        if (!exists) {
            // Add new client
            const isCompany = !!clientInfo.company;
            const eventDate = clientInfo.event_date || "";
            let eventYear = "";
            if (eventDate) {
              const yrMatch = eventDate.match(/\b(20\d{2})\b/);
              if (yrMatch) eventYear = yrMatch[1];
            }
            const eventType = clientInfo.event_type || "";

            const newClient = {
                nom: clientInfo.company || clientInfo.name || "Client Inconnu",
                type_client: isCompany ? "Entreprise" : "Particulier",
                siret: "",
                secteur: "",
                adresse: clientInfo.address || "",
                telephone: clientInfo.phone || "",
                email: clientInfo.email || "",
                statut: "client", // imported from signed/sent contracts mostly
                contacts: isCompany && clientInfo.name ? [{ nom: clientInfo.name, telephone: clientInfo.phone, email: clientInfo.email, fonction: "Contact" }] : [],
                notes: `Importé depuis le contrat "${contract.id || 'inconnu'}".\nÉvénement: ${clientInfo.event_date || 'N/A'}\nType: ${clientInfo.event_type || 'N/A'}`,
                blacklist_tags: "",
                annee_prestation: eventYear,
                type_evenement: eventType,
                date_evenement: eventDate
            };
            
            const postResponse = await axios.post(`${API}/crm/companies`, newClient);
            const addedClient = postResponse.data;
            currentCompanies.push(addedClient);
            newClientsAdded++;
        }
      }

      // Process Location Clients
      for (const locClient of locationClients) {
        const rawName = locClient.name || "";
        const rawCompany = locClient.company_name || "";
        const rawEmail = locClient.email || "";

        // Skip if no useful data
        if (!rawName && !rawCompany && !rawEmail) continue;

        const emailLower = rawEmail ? rawEmail.toLowerCase().trim() : "";
        const nameLower = rawName ? rawName.toLowerCase().trim() : "";
        const companyLower = rawCompany ? rawCompany.toLowerCase().trim() : "";

        // Check if exists
        const exists = currentCompanies.some(c => {
          const cEmail = c.email ? c.email.toLowerCase().trim() : "";
          const cNom = c.nom ? c.nom.toLowerCase().trim() : "";
          return (emailLower && cEmail === emailLower) || 
                 (nameLower && cNom === nameLower) || 
                 (companyLower && cNom === companyLower);
        });

        if (!exists) {
          // Determine type de client
          let typeClient = "Particulier";
          if (locClient.client_type === "entreprise" || locClient.client_type === "association") {
            typeClient = locClient.client_type === "entreprise" ? "Entreprise" : "Association";
          } else if (rawCompany) {
            typeClient = "Entreprise";
          }

          const hasContactName = rawName && rawCompany && rawName.toLowerCase() !== rawCompany.toLowerCase();

          const newClient = {
            nom: rawCompany || rawName || "Client Inconnu",
            type_client: typeClient,
            siret: locClient.siret || "",
            secteur: "",
            adresse: locClient.address || "",
            telephone: locClient.phone || "",
            email: rawEmail,
            statut: "client",
            contacts: hasContactName ? [{ nom: rawName, telephone: locClient.phone, email: rawEmail, fonction: "Contact principal" }] : [],
            notes: `Importé depuis l'application Matériel (Clients).\nNotes de location: ${locClient.notes || 'N/A'}`,
            blacklist_tags: "",
            annee_prestation: "",
            type_evenement: ""
          };

          const postResponse = await axios.post(`${API}/crm/companies`, newClient);
          const addedClient = postResponse.data;
          currentCompanies.push(addedClient);
          newClientsAdded++;
        }
      }
      
      if (newClientsAdded > 0) {
          toast.success(`${newClientsAdded} nouveau(x) contact(s) importé(s)`);
          loadCompanies();
      } else {
          toast.info("Aucun nouveau contact à importer.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'import des contacts");
    } finally {
      setIsImporting(false);
    }
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
    const matchesSearch = (company.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.secteur && company.secteur.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (company.blacklist_tags && company.blacklist_tags.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || company.statut === statusFilter;
    const matchesType = typeFilter === "all" || 
                        company.type_client === typeFilter || 
                        (!company.type_client && typeFilter === "Entreprise"); // Retro-compatibilité

    const matchesAnnee = anneeFilter === "all" || getCompanyYear(company) === anneeFilter;
    const matchesEvent = eventFilter === "all" || getCompanyEventType(company).toLowerCase() === eventFilter.toLowerCase();

    // Filtre par date exacte d'événement
    const evDate = getCompanyEventDate(company);
    let matchesDateRange = true;
    if (startDateFilter) {
      if (!evDate || evDate < startDateFilter) matchesDateRange = false;
    }
    if (endDateFilter) {
      if (!evDate || evDate > endDateFilter) matchesDateRange = false;
    }

    return matchesSearch && matchesStatus && matchesType && matchesAnnee && matchesEvent && matchesDateRange;
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

  const getTypeBadge = (type) => {
    if (!type) type = "Entreprise";
    const styles = {
      "Particulier": "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
      "Entreprise": "bg-slate-100 text-slate-800 hover:bg-slate-100",
      "Association": "bg-purple-100 text-purple-800 hover:bg-purple-100"
    };
    
    return (
      <Badge className={styles[type] || ""}>
        {type}
      </Badge>
    );
  };

  const filterYears = Array.from(new Set(
    companies.map(c => getCompanyYear(c)).filter(Boolean)
  )).sort().reverse();

  const filterEventTypes = Array.from(new Set(
    companies.map(c => getCompanyEventType(c)).filter(Boolean)
  )).sort();

  const handleExportEmails = () => {
    const mainEmails = filteredCompanies
      .flatMap(c => extractEmails(c.email));
    
    const contactEmails = filteredCompanies
      .flatMap(c => (c.contacts || []).flatMap(contact => extractEmails(contact.email)));

    const allEmails = Array.from(new Set([...mainEmails, ...contactEmails]));
    
    if (allEmails.length === 0) {
      toast.error("Aucune adresse email trouvée pour les clients filtrés.");
      return;
    }
    
    setShowExportDialog(true);
  };

  const handleDownloadCSV = () => {
    const headers = ["Nom du Client", "Type de Client", "Statut", "Email Principal", "Téléphone Principal", "Adresse", "Date de prestation", "Type d'événement", "Année"];
    const rows = filteredCompanies.map(c => {
      const cleanedEmails = extractEmails(c.email).join(", ");
      return [
        c.nom || "",
        c.type_client || "Particulier",
        c.statut || "prospect",
        cleanedEmails,
        c.telephone || "",
        c.adresse || "",
        getCompanyEventDate(c) || "",
        getCompanyEventType(c) || "",
        getCompanyYear(c) || ""
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_fichier_clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier CSV exporté avec succès !");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              📇 Fichier Client
            </h1>
            <p className="text-gray-600">Base de données globale : particuliers, entreprises et associations</p>
          </div>
          <Button 
            onClick={handleImportContacts}
            disabled={isImporting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isImporting ? "Importation..." : "Importer depuis contacts"}
          </Button>
        </div>

        {/* Statistiques (en lignes compactes) */}
        <div className="flex flex-wrap items-center justify-between gap-6 bg-white border border-gray-250 shadow-sm rounded-xl px-6 py-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <div>
              <span className="text-xs text-slate-500 block font-medium uppercase tracking-wider">Total Clients</span>
              <span className="text-lg font-bold text-slate-950">{companies.length}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔵</span>
            <div>
              <span className="text-xs text-slate-500 block font-medium uppercase tracking-wider">Prospects</span>
              <span className="text-lg font-bold text-slate-950">
                {companies.filter(c => c.statut === "prospect").length}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <span className="text-xs text-slate-500 block font-medium uppercase tracking-wider">Relances Aujourd'hui</span>
              <span className="text-lg font-bold text-slate-950">{getTodayRelances().length}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <span className="text-xs text-slate-500 block font-medium uppercase tracking-wider">Relances À Venir</span>
              <span className="text-lg font-bold text-slate-950">{getUpcomingRelances().length}</span>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Row 1: Search + Date Range Filters */}
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, secteur, etc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <div className="flex items-center gap-1.5 min-w-[150px] w-full sm:w-auto">
                    <span className="text-xs text-slate-500 font-medium shrink-0">Du</span>
                    <Input 
                      type="date" 
                      value={startDateFilter} 
                      onChange={(e) => setStartDateFilter(e.target.value)} 
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-[150px] w-full sm:w-auto">
                    <span className="text-xs text-slate-500 font-medium shrink-0">Au</span>
                    <Input 
                      type="date" 
                      value={endDateFilter} 
                      onChange={(e) => setEndDateFilter(e.target.value)} 
                      className="h-9 text-xs"
                    />
                  </div>
                  {(startDateFilter || endDateFilter) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setStartDateFilter(""); setEndDateFilter(""); }}
                      className="text-red-550 hover:text-red-700 h-9 font-medium"
                    >
                      Effacer dates
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Select Dropdowns & Buttons */}
              <div className="flex flex-col md:flex-row gap-4 flex-wrap items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <Select value={anneeFilter} onValueChange={setAnneeFilter}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les années</SelectItem>
                      {filterYears.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Type événement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous événements</SelectItem>
                      {filterEventTypes.map(type => (
                        <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="client">🟢 Déjà clients</SelectItem>
                      <SelectItem value="demarche">🟡 Démarchés</SelectItem>
                      <SelectItem value="prospect">Prospects</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="Type de client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="Particulier">Particuliers</SelectItem>
                      <SelectItem value="Entreprise">Entreprises</SelectItem>
                      <SelectItem value="Association">Associations</SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchTerm || anneeFilter !== "all" || eventFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || startDateFilter || endDateFilter) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setAnneeFilter("all");
                        setEventFilter("all");
                        setStatusFilter("all");
                        setTypeFilter("all");
                        setStartDateFilter("");
                        setEndDateFilter("");
                      }}
                      className="text-gray-500 hover:text-gray-800 text-xs h-9 sm:w-auto w-full"
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end flex-wrap">
                  <Button 
                    onClick={handleExportEmails}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 h-9"
                  >
                    📥 Exporter les adresses mail ({filteredCompanies.length})
                  </Button>

                  <Button 
                    onClick={() => {
                      resetCompanyForm();
                      setShowCompanyDialog(true);
                    }}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des entreprises (Lignes compactes) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {/* Header de la liste */}
          <div className="hidden md:flex items-center px-6 py-3 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="w-[35%]">Nom du Client / Secteur</div>
            <div className="w-[20%]">Date & Type d'Événement</div>
            <div className="w-[15%]">Type de Client</div>
            <div className="w-[15%]">Statut</div>
            <div className="w-[15%] text-right">Actions</div>
          </div>
          
          {filteredCompanies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            filteredCompanies.map(company => {
              const activeRelances = getActiveRelances(company.id);
              return (
                <div 
                  key={company.id} 
                  onClick={() => {
                    setSelectedCompanyForDetail(company);
                    setShowDetailDialog(true);
                  }}
                  className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  {/* Nom / Secteur */}
                  <div className="w-full md:w-[35%] flex items-center gap-3">
                    <span className="text-2xl shrink-0 select-none">
                      {company.type_client === "Particulier" ? "👤" : company.type_client === "Association" ? "🤝" : "🏢"}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800 text-base truncate flex items-center gap-2 flex-wrap">
                        {company.nom}
                        {activeRelances.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full" title={`${activeRelances.length} relance(s) active(s)`}>
                            {activeRelances.length}
                          </span>
                        )}
                        {getCompanyProvenance(company) === "location" && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] font-semibold py-0.5 px-2 border border-blue-200 uppercase tracking-tight">
                            📦 Location
                          </Badge>
                        )}
                        {getCompanyProvenance(company) === "contrat" && (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px] font-semibold py-0.5 px-2 border border-purple-200 uppercase tracking-tight">
                            🎵 Prestation
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-slate-400 truncate mt-0.5">
                        {company.secteur || "Aucun secteur"} {company.siret && `• SIRET: ${company.siret}`}
                      </p>
                    </div>
                  </div>

                  {/* Date & Type Événement */}
                  <div className="w-full md:w-[20%] flex flex-col gap-1 items-start">
                    <div className="flex flex-wrap gap-1 items-center">
                      {getCompanyEventDate(company) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs">
                          📅 {new Date(getCompanyEventDate(company)).toLocaleDateString('fr-FR')}
                        </Badge>
                      ) : getCompanyYear(company) ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-medium text-xs">
                          📅 {getCompanyYear(company)}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                    {getCompanyEventType(company) ? (
                      <Badge className="bg-amber-50 text-amber-850 hover:bg-amber-50 border border-amber-100 font-medium text-xs truncate max-w-[120px]" title={getCompanyEventType(company)}>
                        🎉 {getCompanyEventType(company)}
                      </Badge>
                    ) : null}
                  </div>

                  {/* Type */}
                  <div className="w-full md:w-[15%]">
                    {getTypeBadge(company.type_client)}
                  </div>

                  {/* Statut */}
                  <div className="w-full md:w-[15%]">
                    {getStatusBadge(company.statut)}
                  </div>

                  {/* Actions de ligne rapide */}
                  <div className="w-full md:w-[15%] flex justify-start md:justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCompanyForDetail(company);
                        setShowDetailDialog(true);
                      }}
                      className="text-slate-550 hover:text-slate-800"
                      title="Afficher les détails"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCompany(company)}
                      className="text-slate-600 hover:text-blue-600"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCompany(company.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
              {editingCompany ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type_client">Type de client</Label>
                <Select 
                  value={companyForm.type_client} 
                  onValueChange={(value) => setCompanyForm(prev => ({ ...prev, type_client: value }))}
                >
                  <SelectTrigger id="type_client">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Particulier">👤 Particulier</SelectItem>
                    <SelectItem value="Entreprise">🏢 Entreprise</SelectItem>
                    <SelectItem value="Association">🤝 Association</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="statut">Statut</Label>
                <Select 
                  value={companyForm.statut} 
                  onValueChange={(value) => setCompanyForm(prev => ({ ...prev, statut: value }))}
                >
                  <SelectTrigger id="statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">🔵 Prospect</SelectItem>
                    <SelectItem value="demarche">🟡 Démarché</SelectItem>
                    <SelectItem value="client">🟢 Déjà client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(companyForm.type_client === "Entreprise" || companyForm.type_client === "Association") && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="siret">Recherche SIRET / SIREN</Label>
                  <Input
                    id="siret"
                    value={companyForm.siret}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, siret: e.target.value }))}
                    placeholder="Entrez le SIRET ou SIREN"
                  />
                </div>
                <Button variant="secondary" onClick={handleSiretFetch}>
                  <Search className="h-4 w-4 mr-2" /> Rechercher
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="nom">Nom / Raison Sociale *</Label>
              <Input
                id="nom"
                value={companyForm.nom}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Ex: Mairie de Colmar, Jean Dupont"
              />
            </div>

            <div>
              <Label htmlFor="secteur">Secteur / Activité</Label>
              <Input
                id="secteur"
                value={companyForm.secteur}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, secteur: e.target.value }))}
                placeholder="Ex: CE, Mairie, Informatique..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date_evenement">Date précise de l'événement</Label>
                <Input
                  id="date_evenement"
                  type="date"
                  value={companyForm.date_evenement || ""}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setCompanyForm(prev => {
                      const yr = newDate ? newDate.split('-')[0] : prev.annee_prestation;
                      return { ...prev, date_evenement: newDate, annee_prestation: yr };
                    });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="annee_prestation">Année (Auto-remplie)</Label>
                <Input
                  id="annee_prestation"
                  value={companyForm.annee_prestation || ""}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, annee_prestation: e.target.value }))}
                  placeholder="Ex: 2026"
                />
              </div>
              <div>
                <Label htmlFor="type_evenement">Type d'événement</Label>
                <Input
                  id="type_evenement"
                  value={companyForm.type_evenement || ""}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, type_evenement: e.target.value }))}
                  placeholder="Ex: Mariage, Gala..."
                />
              </div>
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
                placeholder="Notes libres (Préferences, etc.)..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="blacklist_tags">Tags & Blacklist</Label>
              <Input
                id="blacklist_tags"
                value={companyForm.blacklist_tags}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, blacklist_tags: e.target.value }))}
                placeholder="Ex: mauvais payeur, VIP, ne pas relancer..."
                className="border-red-200 focus:border-red-500"
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

      {/* Dialog Détails Client */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const company = companies.find(c => c.id === selectedCompanyForDetail?.id) || selectedCompanyForDetail;
            if (!company) return null;
            
            const activeRelancesList = getActiveRelances(company.id);
            const completedRelancesList = getCompletedRelances(company.id);
            
            return (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {company.type_client === "Particulier" ? "👤" : company.type_client === "Association" ? "🤝" : "🏢"}
                    </span>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                        {company.nom}
                        {getStatusBadge(company.statut)}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-400 mt-1">
                        Créé le {new Date(company.created_at || company.id).toLocaleDateString('fr-FR')}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Meta / Badges */}
                  <div className="flex flex-wrap gap-2">
                    {getTypeBadge(company.type_client)}
                    {getCompanyProvenance(company) === "location" && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">📦 Origine: Location Matériel</Badge>
                    )}
                    {getCompanyProvenance(company) === "contrat" && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">🎵 Origine: Contrat Prestation</Badge>
                    )}
                    {company.secteur && <Badge variant="outline">Secteur: {company.secteur}</Badge>}
                    {company.siret && <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">SIRET: {company.siret}</Badge>}
                    {getCompanyEventDate(company) ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-semibold">📅 Événement le: {new Date(getCompanyEventDate(company)).toLocaleDateString('fr-FR')}</Badge>
                    ) : getCompanyYear(company) ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-semibold">📅 Année: {getCompanyYear(company)}</Badge>
                    ) : null}
                    {getCompanyEventType(company) && <Badge className="bg-amber-100 text-amber-850 font-semibold">🎉 Événement: {getCompanyEventType(company)}</Badge>}
                    {company.blacklist_tags && <Badge variant="destructive">{company.blacklist_tags}</Badge>}
                  </div>

                  {/* Coordonnées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {company.adresse && (
                      <div className="flex items-start text-sm text-gray-700">
                        <MapPin className="h-5 w-5 mr-3 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Adresse</p>
                          <p className="mt-0.5">{company.adresse}</p>
                        </div>
                      </div>
                    )}
                    {company.telephone && (
                      <div className="flex items-start text-sm text-gray-700">
                        <Phone className="h-5 w-5 mr-3 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Téléphone</p>
                          <p className="mt-0.5">{company.telephone}</p>
                        </div>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-start text-sm text-gray-700 md:col-span-2 border-t pt-3 mt-1">
                        <Mail className="h-5 w-5 mr-3 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</p>
                          <a href={`mailto:${company.email}`} className="mt-0.5 text-blue-600 hover:underline block">{company.email}</a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contacts */}
                  {company.contacts && company.contacts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" /> Contacts ({company.contacts.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {company.contacts.map((contact, idx) => (
                          <div key={idx} className="bg-white border rounded-lg p-3 shadow-xs">
                            <p className="font-semibold text-slate-800">{contact.nom}</p>
                            {contact.fonction && <p className="text-xs text-slate-400 font-medium">{contact.fonction}</p>}
                            <div className="mt-2 space-y-1 text-xs text-slate-600">
                              {contact.telephone && <p>📞 {contact.telephone}</p>}
                              {contact.email && <p>✉️ <a href={`mailto:${contact.email}`} className="hover:underline text-blue-650">{contact.email}</a></p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {company.notes && (
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-500" /> Notes & Détails
                      </h4>
                      <div className="bg-yellow-50/70 border border-yellow-105 p-4 rounded-xl">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{company.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Relances actives */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-500" /> Relances Actives ({activeRelancesList.length})
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCompany(company);
                          setRelanceForm({ date: "", objet: "", company_id: company.id });
                          setShowRelanceDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-xs h-7 px-2"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                      </Button>
                    </div>

                    {activeRelancesList.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Aucune relance active planifiée.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeRelancesList.map(relance => (
                          <div key={relance.id} className="bg-blue-50/50 hover:bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-sm font-medium text-blue-900 truncate">
                                {relance.objet}
                              </p>
                              <p className="text-xs text-blue-500 mt-0.5">
                                Planifié pour le : {new Date(relance.date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCompleteRelance(relance.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-100/50 h-8 w-8 p-0"
                                title="Terminer la relance"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRelance(relance.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100/50 h-8 w-8 p-0"
                                title="Supprimer la relance"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historique des relances */}
                  {completedRelancesList.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                        📋 Historique des relances ({completedRelancesList.length})
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {completedRelancesList.map(relance => (
                          <div key={relance.id} className="text-sm text-gray-500 pl-4 relative before:absolute before:left-1 before:top-[8px] before:w-1.5 before:h-1.5 before:bg-green-500 before:rounded-full">
                            <strong>{new Date(relance.date).toLocaleDateString('fr-FR')}</strong> : {relance.objet}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t pt-4">
                  <div className="flex justify-between items-center w-full gap-4">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailDialog(false);
                        handleDeleteCompany(company.id);
                      }}
                      className="gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                        Fermer
                      </Button>
                      <Button 
                        onClick={() => handleEditFromDetail(company)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog Exportation d'Emails */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              📥 Exporter les adresses email
            </DialogTitle>
            <DialogDescription>
              Générez une liste des adresses email pour vos newsletters ou campagnes de communication.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const mainEmails = filteredCompanies
              .flatMap(c => extractEmails(c.email));
            
            const contactEmails = filteredCompanies
              .flatMap(c => (c.contacts || []).flatMap(contact => extractEmails(contact.email)));

            const allEmails = Array.from(new Set([...mainEmails, ...contactEmails]));
            const emailStringList = allEmails.join(", ");

            return (
              <div className="space-y-4 py-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                  <p className="font-semibold">Filtres actifs :</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {startDateFilter && endDateFilter ? `Événements du ${new Date(startDateFilter).toLocaleDateString('fr-FR')} au ${new Date(endDateFilter).toLocaleDateString('fr-FR')}` : 
                     startDateFilter ? `Événements après le ${new Date(startDateFilter).toLocaleDateString('fr-FR')}` : 
                     endDateFilter ? `Événements avant le ${new Date(endDateFilter).toLocaleDateString('fr-FR')}` : "Tous les événements"}
                  </p>
                  <p className="font-medium mt-2">📊 {allEmails.length} adresse(s) email unique(s) trouvée(s)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 text-xs font-semibold uppercase tracking-wider block">Liste brute (Séparateur: Virgule)</Label>
                  <Textarea 
                    value={emailStringList}
                    readOnly
                    rows={6}
                    className="font-mono text-xs bg-slate-50 border-slate-200 focus:ring-0 focus:border-slate-300 resize-none select-all"
                  />
                  <p className="text-[10px] text-slate-450 italic">Idéal pour copier-coller dans le champ Cci/Bcc de votre client mail.</p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(emailStringList);
                      toast.success("Adresses email copiées dans le presse-papiers !");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-2"
                  >
                    📋 Copier dans le presse-papiers
                  </Button>
                  <Button 
                    onClick={handleDownloadCSV}
                    variant="outline" 
                    className="w-full gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    ⬇️ Télécharger le fichier CSV complet
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowExportDialog(false)} 
                    className="w-full text-slate-500 hover:text-slate-700"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CRMApp;
