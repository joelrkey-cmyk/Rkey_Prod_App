import React, { useState, useEffect, useRef } from "react";
import axios from "../services/axiosConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Building2, Users, Calendar, Plus, Edit, Trash2, Check, X, Search, Phone, Mail, MapPin, FileText, UserPlus, Upload, FileSignature, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, FileCheck, RefreshCw, Layers, ArrowLeft, Loader2, FileUp, Paperclip, GitMerge, CopyCheck, ChevronLeft, ChevronRight, ArrowRightLeft, ShieldAlert, CheckCircle, FolderUp, FileSpreadsheet, Folder, Headphones, Download, DownloadCloud, Smartphone, Database, Copy } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

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

const hasCompanyEmail = (company) => {
  if (!company) return false;
  const mainEmails = extractEmails(company.email);
  if (mainEmails.length > 0) return true;
  if (company.contacts && Array.isArray(company.contacts)) {
    for (const c of company.contacts) {
      if (c && extractEmails(c.email).length > 0) return true;
    }
  }
  return false;
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
    date_evenement: "",
    dj_id: "",
    dj_name: ""
  });

  const [typeFilter, setTypeFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("all"); // 'all' | 'missing' | 'has_email'
  const [djFilter, setDjFilter] = useState("all"); // 'all' | <dj_id> | 'none'
  const [djs, setDjs] = useState([]);
  const [contractsList, setContractsList] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // ══════════ ÉTAT SECTIONS ET CLASSIFICATION CLIENTS ══════════
  const [clientSectionFilter, setClientSectionFilter] = useState("all"); // 'all' | 'Entreprise' | 'Particulier' | 'Association' | 'needs_completion'

  // ══════════ ÉTAT IMPORTATION DIRECTE CSV & EXCEL ══════════
  const [showCsvExcelModal, setShowCsvExcelModal] = useState(false);
  const [csvExcelStep, setCsvExcelStep] = useState('upload'); // 'upload' | 'preview'
  const [csvImportTab, setCsvImportTab] = useState('file'); // 'file' | 'paste'
  const [csvPastedText, setCsvPastedText] = useState("");
  const [csvExcelParsedClients, setCsvExcelParsedClients] = useState([]);
  const [csvExcelRawFilename, setCsvExcelRawFilename] = useState("");
  const [isImportingCsvExcel, setIsImportingCsvExcel] = useState(false);
  const [updateExistingInCsv, setUpdateExistingInCsv] = useState(true);
  const [detectedHeadersList, setDetectedHeadersList] = useState([]);
  const [rawGridData, setRawGridData] = useState([]);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    nom: "",
    prenom: "",
    type: "",
    email: "",
    tel: "",
    adresse: "",
    date: "",
    notes: ""
  });

  // ══════════ ÉTAT IMPORTATION DEPUIS L'APP CONTRAT ══════════
  const [showImportContractsAppDialog, setShowImportContractsAppDialog] = useState(false);
  const [isImportingFromContractsApp, setIsImportingFromContractsApp] = useState(false);
  const [includeArchivedContracts, setIncludeArchivedContracts] = useState(true);
  const [updateExistingFromContracts, setUpdateExistingFromContracts] = useState(true);
  const [lastImportResult, setLastImportResult] = useState(null);

  // ══════════ ÉTAT EXPORT COMPLET DES CONTACTS ══════════
  const [showFullExportModal, setShowFullExportModal] = useState(false);
  const [exportScope, setExportScope] = useState("all"); // 'all' | 'filtered'

  // ══════════ ÉTAT IMPORTATION CONTRATS (IA) ══════════
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractFiles, setContractFiles] = useState([]);
  const [isAnalyzingContracts, setIsAnalyzingContracts] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [extractedClients, setExtractedClients] = useState([]);
  const [selectedExtractedIds, setSelectedExtractedIds] = useState(new Set());
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [contractModalStep, setContractModalStep] = useState('upload'); // 'upload' | 'review'

  // ══════════ ÉTAT GESTION DES DOUBLONS ══════════
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [isSearchingDuplicates, setIsSearchingDuplicates] = useState(false);
  const [isMergingOrDeleting, setIsMergingOrDeleting] = useState(false);
  const [confirmDeleteBoth, setConfirmDeleteBoth] = useState(false);
  const [editMergeDraft, setEditMergeDraft] = useState(null);
  const [isCustomizingMerge, setIsCustomizingMerge] = useState(false);
  const [dismissedPairKeys, setDismissedPairKeys] = useState(new Set());

  const [newContact, setNewContact] = useState({
    nom: "",
    fonction: "",
    telephone: "",
    email: ""
  });
  const [editingContactIndex, setEditingContactIndex] = useState(null);

  const [relanceForm, setRelanceForm] = useState({
    date: "",
    objet: "",
    company_id: ""
  });

  // ══════════ ÉTAT RECHERCHE SIRENE / INSEE ══════════
  const [sireneSearchQuery, setSireneSearchQuery] = useState("");
  const [sireneResults, setSireneResults] = useState([]);
  const [isSearchingSirene, setIsSearchingSirene] = useState(false);
  const [showSireneDropdown, setShowSireneDropdown] = useState(false);
  const sireneDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sireneDropdownRef.current && !sireneDropdownRef.current.contains(event.target)) {
        setShowSireneDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadCompanies();
    loadRelances();
    loadDjs();
    loadContracts();
  }, []);

  const loadDjs = async () => {
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
    } catch (error) {
      console.error("Error loading DJs:", error);
    }
  };

  const loadContracts = async () => {
    try {
      const res = await axios.get(`${API}/contracts2`);
      setContractsList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading contracts:", error);
    }
  };

  // Associe un client CRM à ses contrats dans contracts2
  const getCompanyContracts = (company) => {
    if (!company || !contractsList || contractsList.length === 0) return [];
    const compEmail = (company.email || "").toLowerCase().trim();
    const compNom = (company.nom || "").toLowerCase().trim();
    const compNotes = company.notes || "";
    const compTel = (company.telephone || "").replace(/\D/g, "");

    return contractsList.filter(c => {
      // 1. Correspondance par ID de contrat (noté dans les notes ou source_contrat)
      if (c.id && (compNotes.includes(c.id) || company.source_contrat === c.id)) return true;
      
      const cEmail = (c.client_info?.email || c.client_email || "").toLowerCase().trim();
      const cName = (c.client_info?.name || c.client_name || "").toLowerCase().trim();
      const cCompany = (c.client_info?.company || "").toLowerCase().trim();
      const cTel = (c.client_info?.phone || c.client_phone || "").replace(/\D/g, "");

      // 2. Correspondance par email principal
      if (compEmail && cEmail && (compEmail === cEmail || compEmail.includes(cEmail) || cEmail.includes(compEmail))) return true;

      // 3. Correspondance par nom complet ou entreprise
      if (compNom && (compNom === cName || (cCompany && compNom === cCompany))) return true;

      // 4. Correspondance avec les contacts enregistrés du client
      if (Array.isArray(company.contacts)) {
        for (const ct of company.contacts) {
          const ctEmail = (ct.email || "").toLowerCase().trim();
          const ctNom = (ct.nom || "").toLowerCase().trim();
          if (ctEmail && cEmail && (ctEmail === cEmail || ctEmail.includes(cEmail) || cEmail.includes(ctEmail))) return true;
          if (ctNom && (ctNom === cName || (cCompany && ctNom === cCompany))) return true;
        }
      }

      // 5. Correspondance par numéro de téléphone (8 derniers chiffres)
      if (compTel && compTel.length >= 8 && cTel && cTel.includes(compTel.slice(-8))) return true;

      return false;
    });
  };

  // Récupère tous les identifiants ou noms de DJ associés à un client
  const getCompanyDjs = (company) => {
    const djKeys = new Set();
    
    // Champs directs sur l'entreprise
    if (company.dj_id) djKeys.add(String(company.dj_id));
    if (company.dj_name) djKeys.add(company.dj_name.toLowerCase().trim());
    if (company.dj_profile) djKeys.add(String(company.dj_profile));

    // Depuis les contrats associés
    const matched = getCompanyContracts(company);
    matched.forEach(c => {
      if (c.dj_profile) {
        djKeys.add(String(c.dj_profile));
      }
      if (c.dj_profile_data?.nom_artistique) {
        djKeys.add(c.dj_profile_data.nom_artistique.toLowerCase().trim());
      }
      if (c.dj_profile_data?.name) {
        djKeys.add(c.dj_profile_data.name.toLowerCase().trim());
      }
      if (c.dj_profile_data?.nom_complet) {
        djKeys.add(c.dj_profile_data.nom_complet.toLowerCase().trim());
      }
    });

    return djKeys;
  };

  // Récupère le nom d'affichage principal du DJ pour un client
  const getCompanyMainDjName = (company) => {
    if (company.dj_name) return company.dj_name;
    if (company.dj_id) {
      const found = djs.find(d => String(d.id) === String(company.dj_id));
      if (found) return found.nom_artistique || found.nom_complet;
    }
    const matched = getCompanyContracts(company);
    for (const c of matched) {
      if (c.dj_profile_data?.nom_artistique) return c.dj_profile_data.nom_artistique;
      if (c.dj_profile_data?.name) return c.dj_profile_data.name;
      if (c.dj_profile_data?.nom_complet) return c.dj_profile_data.nom_complet;
      if (c.dj_profile) {
        const found = djs.find(d => String(d.id) === String(c.dj_profile));
        if (found) return found.nom_artistique || found.nom_complet;
        return c.dj_profile;
      }
    }
    return null;
  };

  // Liste des options de DJ disponibles pour le filtre
  const availableDjOptions = React.useMemo(() => {
    const options = [];
    const seenNames = new Set();

    // 1. DJ issus des paramètres généraux (/api/dj-fiches)
    (djs || []).forEach(dj => {
      const label = dj.nom_artistique || dj.nom_complet || dj.id;
      if (label && !seenNames.has(label.toLowerCase())) {
        seenNames.add(label.toLowerCase());
        options.push({
          id: String(dj.id),
          name: label,
          subtext: dj.nom_complet && dj.nom_artistique && dj.nom_artistique !== dj.nom_complet ? dj.nom_complet : null,
          actif: dj.actif !== false
        });
      }
    });

    // 2. Compléter éventuellement avec les DJ présents dans les contrats
    (contractsList || []).forEach(c => {
      const djName = c.dj_profile_data?.nom_artistique || c.dj_profile_data?.name || c.dj_profile_data?.nom_complet;
      if (djName && !seenNames.has(djName.toLowerCase())) {
        seenNames.add(djName.toLowerCase());
        options.push({
          id: String(c.dj_profile || djName),
          name: djName,
          subtext: "Contrats",
          actif: true
        });
      }
    });

    return options;
  }, [djs, contractsList]);

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
    if (!companyForm.nom || !companyForm.nom.trim()) {
      toast.error(
        companyForm.type_client === "Particulier"
          ? "Le nom du client est requis"
          : "Le nom de l'entreprise ou association est requis"
      );
      return;
    }

    try {
      let currentContacts = Array.isArray(companyForm.contacts) 
        ? companyForm.contacts.map(c => ({ ...c })) 
        : [];

      // Auto-commit newContact if user typed a name in contact form and didn't click "Ajouter / Valider"
      if (newContact.nom && newContact.nom.trim()) {
        const contactPayload = {
          nom: newContact.nom.trim(),
          fonction: (newContact.fonction || "").trim(),
          telephone: (newContact.telephone || "").trim(),
          email: (newContact.email || "").trim()
        };

        if (editingContactIndex !== null && editingContactIndex >= 0 && editingContactIndex < currentContacts.length) {
          currentContacts[editingContactIndex] = contactPayload;
        } else {
          currentContacts.push(contactPayload);
        }
      }

      const payload = {
        ...companyForm,
        nom: companyForm.nom.trim(),
        contacts: currentContacts
      };

      if (editingCompany) {
        await axios.put(`${API}/crm/companies/${editingCompany.id}`, payload);
        toast.success("Fiche client mise à jour !");
      } else {
        await axios.post(`${API}/crm/companies`, payload);
        toast.success("Fiche client créée !");
      }
      
      await loadCompanies();
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
    if (!newContact.nom || !newContact.nom.trim()) {
      toast.error("Le nom du contact est requis");
      return;
    }

    const contactPayload = {
      nom: newContact.nom.trim(),
      fonction: (newContact.fonction || "").trim(),
      telephone: (newContact.telephone || "").trim(),
      email: (newContact.email || "").trim()
    };

    if (editingContactIndex !== null) {
      setCompanyForm(prev => {
        const updated = Array.isArray(prev.contacts) ? [...prev.contacts] : [];
        updated[editingContactIndex] = contactPayload;
        return { ...prev, contacts: updated };
      });
      setEditingContactIndex(null);
      setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
      toast.success("Contact mis à jour");
      return;
    }

    setCompanyForm(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), contactPayload]
    }));

    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
    toast.success("Contact ajouté");
  };

  const handleEditContact = (index) => {
    const contactToEdit = (companyForm.contacts || [])[index];
    if (contactToEdit) {
      setEditingContactIndex(index);
      setNewContact({
        nom: contactToEdit.nom || "",
        fonction: contactToEdit.fonction || "",
        telephone: contactToEdit.telephone || "",
        email: contactToEdit.email || ""
      });
    }
  };

  const handleCancelEditContact = () => {
    setEditingContactIndex(null);
    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
  };

  const handleRemoveContact = (index) => {
    if (editingContactIndex === index) {
      handleCancelEditContact();
    }
    setCompanyForm(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index)
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
      date_evenement: "",
      dj_id: "",
      dj_name: ""
    });
    setEditingCompany(null);
    setEditingContactIndex(null);
    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
    setSireneSearchQuery("");
    setSireneResults([]);
    setShowSireneDropdown(false);
  };

  const openEditCompany = (company) => {
    setEditingCompany(company);
    setEditingContactIndex(null);
    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
    setCompanyForm({
      nom: company.nom || "",
      type_client: company.type_client || "Entreprise",
      siret: company.siret || "",
      secteur: company.secteur || "",
      adresse: company.adresse || "",
      telephone: company.telephone || "",
      email: company.email || "",
      statut: company.statut || "prospect",
      contacts: Array.isArray(company.contacts) ? company.contacts.map(c => ({ ...c })) : [],
      notes: company.notes || "",
      blacklist_tags: company.blacklist_tags || "",
      annee_prestation: company.annee_prestation || "",
      type_evenement: company.type_evenement || "",
      date_evenement: company.date_evenement || getCompanyEventDate(company) || "",
      dj_id: company.dj_id || "",
      dj_name: company.dj_name || ""
    });
    setSireneSearchQuery("");
    setSireneResults([]);
    setShowSireneDropdown(false);
    setShowCompanyDialog(true);
  };

  const handleEditFromDetail = (company) => {
    setShowDetailDialog(false);
    openEditCompany(company);
  };

  const handleSireneSearch = async (forcedQuery = null) => {
    const query = (forcedQuery !== null ? forcedQuery : sireneSearchQuery).trim();
    if (!query || query.length < 2) {
      toast.error("Veuillez saisir au moins 2 caractères (Nom, Enseigne, SIRET ou SIREN)");
      return;
    }
    
    setIsSearchingSirene(true);
    setShowSireneDropdown(true);
    try {
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=15`);
      const data = await response.json().catch(() => ({}));
      
      if (data && data.results && data.results.length > 0) {
        setSireneResults(data.results);
        setShowSireneDropdown(true);
        if (forcedQuery === null) {
          toast.success(`${data.results.length} entreprise(s) trouvée(s) dans l'annuaire officiel`);
        }
      } else {
        setSireneResults([]);
        if (forcedQuery === null) {
          toast.info("Aucune entreprise trouvée avec ce nom ou ce numéro");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la recherche SIRENE");
      setSireneResults([]);
    } finally {
      setIsSearchingSirene(false);
    }
  };

  const handleSelectSireneCompany = (result, specificEtablissement = null) => {
    const targetEtab = specificEtablissement || result.siege || (result.matching_etablissements && result.matching_etablissements[0]) || {};
    
    let adresseComplete = targetEtab.adresse || "";
    if (!adresseComplete || adresseComplete.trim() === "") {
      const parts = [
        targetEtab.numero_voie,
        targetEtab.type_voie,
        targetEtab.libelle_voie,
        targetEtab.code_postal ? `${targetEtab.code_postal} ${targetEtab.libelle_commune || ''}` : targetEtab.libelle_commune
      ].filter(Boolean);
      adresseComplete = parts.join(" ");
    }
    
    const siretValue = targetEtab.siret || result.siren || "";
    const nomValue = result.nom_complet || result.nom_raison_sociale || result.enseigne_1 || "";
    const secteurValue = result.activite_principale || targetEtab.activite_principale || "";

    setCompanyForm(prev => ({
      ...prev,
      nom: nomValue || prev.nom,
      siret: siretValue || prev.siret,
      secteur: secteurValue || prev.secteur,
      adresse: adresseComplete ? adresseComplete.replace(/ {2,}/g, ' ').trim() : prev.adresse
    }));

    setShowSireneDropdown(false);
    setSireneSearchQuery("");
    toast.success(`Entreprise sélectionnée : ${nomValue} (SIRET: ${siretValue})`);
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
        const existingIdx = currentCompanies.findIndex(c => {
          const cEmail = c.email ? c.email.toLowerCase().trim() : "";
          const cNom = c.nom ? c.nom.toLowerCase().trim() : "";
          return (emailLower && cEmail === emailLower) || 
                 (nameLower && cNom === nameLower) || 
                 (companyLower && cNom === companyLower);
        });
        
        const contractDjId = contract.dj_profile || "";
        const contractDjName = contract.dj_profile_data?.nom_artistique || contract.dj_profile_data?.name || contract.dj_profile_data?.nom_complet || "";

        if (existingIdx === -1) {
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
                date_evenement: eventDate,
                dj_id: contractDjId,
                dj_name: contractDjName,
                source_contrat: contract.id || ""
            };
            
            const postResponse = await axios.post(`${API}/crm/companies`, newClient);
            const addedClient = postResponse.data;
            currentCompanies.push(addedClient);
            newClientsAdded++;
        } else {
            // If existing client lacks DJ, enrich it with this contract's DJ
            const existing = currentCompanies[existingIdx];
            if (!existing.dj_id && (contractDjId || contractDjName)) {
              try {
                const updatedObj = { ...existing, dj_id: contractDjId, dj_name: contractDjName };
                await axios.put(`${API}/crm/companies/${existing.id}`, updatedObj);
                currentCompanies[existingIdx] = updatedObj;
              } catch (updateErr) {
                console.error("Error backfilling DJ on company:", updateErr);
              }
            }
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

  // ══════════ HANDLERS IMPORTATION CONTRATS, WORD, EXCEL & DOSSIERS (IA) ══════════
  const isFicheDeVisite = (filename) => {
    if (!filename) return false;
    const baseName = filename.split(/[/\\]/).pop().replace(/\.[^/.]+$/, "");
    const normalized = baseName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.includes('fiche de visite') || normalized.includes('fiche visite')) return true;
    const compact = normalized.replace(/\s+/g, '');
    return compact.includes('fichedevisite') || compact.includes('fichevisite');
  };

  const scanEntry = (entry, path = "") => {
    return new Promise((resolve) => {
      if (!entry) return resolve([]);
      if (entry.isFile) {
        entry.file((file) => {
          file.relativePath = path ? `${path}/${file.name}` : file.name;
          resolve([file]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const allFiles = [];
        const readEntries = () => {
          reader.readEntries(async (entries) => {
            if (!entries || entries.length === 0) {
              resolve(allFiles);
            } else {
              const promises = entries.map(e => scanEntry(e, path ? `${path}/${entry.name}` : entry.name));
              const results = await Promise.all(promises);
              allFiles.push(...results.flat());
              readEntries();
            }
          }, () => resolve(allFiles));
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleFilesSelected = (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    // Keep relative path if available from webkitRelativePath
    rawFiles.forEach(f => {
      if (f.webkitRelativePath) f.relativePath = f.webkitRelativePath;
    });

    const validFiles = rawFiles.filter(f => !isFicheDeVisite(f.relativePath || f.name));
    const ignoredCount = rawFiles.length - validFiles.length;

    if (ignoredCount > 0) {
      toast.info(`${ignoredCount} fiche(s) de visite manuscrite(s) ignorée(s) automatiquement.`);
    }

    if (validFiles.length > 0) {
      setContractFiles(prev => [...prev, ...validFiles]);
    }
    // Reset file input value to allow selecting same files/folder again
    if (e.target) e.target.value = '';
  };

  const handleDropFiles = async (e) => {
    e.preventDefault();
    let files = [];
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const scanPromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            scanPromises.push(scanEntry(entry));
          }
        }
      }
      if (scanPromises.length > 0) {
        files = (await Promise.all(scanPromises)).flat();
      }
    }
    if (files.length === 0) {
      files = Array.from(e.dataTransfer.files || []);
    }
    if (files.length === 0) return;

    const validFiles = files.filter(f => !isFicheDeVisite(f.relativePath || f.name));
    const ignoredCount = files.length - validFiles.length;

    if (ignoredCount > 0) {
      toast.info(`${ignoredCount} fiche(s) de visite manuscrite(s) ignorée(s) automatiquement.`);
    }

    if (validFiles.length > 0) {
      setContractFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index) => {
    setContractFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileBadgeInfo = (file) => {
    const name = file.relativePath || file.name || "";
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return { icon: '📄', label: 'PDF', bg: 'bg-red-50 text-red-700 border-red-200' };
    } else if (['docx', 'doc'].includes(ext)) {
      return { icon: '📝', label: 'Word (DOCX/DOC)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return { icon: '📊', label: 'Excel (XLSX/CSV)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (ext === 'zip') {
      return { icon: '🗜️', label: 'Archive ZIP (Dossiers inclus)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return { icon: '🖼️', label: 'Image / Scan', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    return { icon: '📄', label: 'Document', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const uploadFileWithChunking = async (file, onProgress) => {
    const filename = file.relativePath || file.name || 'document';
    const fileSize = file.size || 0;
    const mimeType = file.type || 'application/octet-stream';

    // Strategy 1: Try Direct GCS Signed Upload URL
    try {
      const signRes = await axios.post(`${API}/crm/get-signed-upload-url`, {
        filename,
        contentType: mimeType
      }, { timeout: 10000 });

      if (signRes.data && signRes.data.directUploadAvailable && signRes.data.signedUrl) {
        onProgress && onProgress(30, "Téléversement direct...");
        await axios.put(signRes.data.signedUrl, file, {
          headers: { 'Content-Type': mimeType },
          timeout: 120000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress && onProgress(pct, `Téléversement direct (${pct}%)...`);
            }
          }
        });
        return {
          filename,
          mimetype: mimeType,
          size: fileSize,
          gcs_path: signRes.data.gcs_path,
          gcs_url: signRes.data.gcs_url
        };
      }
    } catch (directErr) {
      console.warn("Direct GCS upload fallback to chunked upload:", directErr.message);
    }

    // Strategy 2: Reliable Chunked Upload (< 400KB chunks to completely bypass reverse proxy 413 limits)
    const CHUNK_SIZE = 400 * 1024; // 400 Ko par bloc (toujours accepté par les proxys HTTP)
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE) || 1;
    const uploadId = `crm_up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkBlob = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append('chunk', chunkBlob, filename);
      chunkFormData.append('uploadId', uploadId);
      chunkFormData.append('chunkIndex', String(i));
      chunkFormData.append('totalChunks', String(totalChunks));
      chunkFormData.append('filename', filename);
      chunkFormData.append('mimeType', mimeType);

      const pct = Math.round(((i + 1) * 100) / totalChunks);
      onProgress && onProgress(pct, `Envoi par blocs (${i + 1}/${totalChunks})...`);

      const chunkRes = await axios.post(`${API}/crm/upload-chunk`, chunkFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (chunkRes.data && chunkRes.data.completed) {
        return {
          filename,
          mimetype: mimeType,
          size: fileSize,
          gcs_path: chunkRes.data.gcs_path,
          gcs_url: chunkRes.data.gcs_url
        };
      }
    }

    throw new Error(`Échec de l'envoi en morceaux pour "${filename}"`);
  };

  const handleStartAnalysis = async () => {
    if (contractFiles.length === 0) {
      toast.error("Veuillez sélectionner au moins un contrat, document, tableau Excel ou dossier.");
      return;
    }

    setIsAnalyzingContracts(true);
    setAnalysisProgress("Préparation et téléversement des documents...");

    try {
      const uploadedGcsFiles = [];
      const totalCount = contractFiles.length;

      // 1. Upload all files safely via chunking/direct GCS to prevent 413 errors
      for (let i = 0; i < totalCount; i++) {
        const file = contractFiles[i];
        const displayLabel = file.relativePath || file.name;
        setAnalysisProgress(`Téléversement (${i + 1}/${totalCount}) : "${displayLabel}"...`);

        try {
          const uploadedInfo = await uploadFileWithChunking(file, (pct, status) => {
            setAnalysisProgress(`Fichier ${i + 1}/${totalCount} : ${status}`);
          });
          if (uploadedInfo) {
            uploadedGcsFiles.push(uploadedInfo);
          }
        } catch (uploadErr) {
          console.error(`Error uploading file ${displayLabel}:`, uploadErr);
          toast.error(`Erreur d'envoi pour "${displayLabel}": ${uploadErr.message}`);
        }
      }

      if (uploadedGcsFiles.length === 0) {
        toast.error("Aucun fichier n'a pu être téléversé pour l'analyse.");
        setIsAnalyzingContracts(false);
        setAnalysisProgress("");
        return;
      }

      // 2. Batch AI extraction (1 file per AI call for ultra-fast response, highest accuracy & individual resilience)
      const AI_BATCH_SIZE = 1;
      const aiBatches = [];
      for (let i = 0; i < uploadedGcsFiles.length; i += AI_BATCH_SIZE) {
        aiBatches.push(uploadedGcsFiles.slice(i, i + AI_BATCH_SIZE));
      }

      let allExtracted = [];
      let totalFilesProcessed = 0;
      let failedBatches = 0;

      for (let batchIdx = 0; batchIdx < aiBatches.length; batchIdx++) {
        const currentBatch = aiBatches[batchIdx];
        const docNames = currentBatch.map(f => f.filename).join(', ');
        const progressLabel = aiBatches.length > 1 
          ? `Analyse IA (${batchIdx + 1}/${aiBatches.length}) : "${docNames}"...` 
          : `Extraction des données clients par l'IA : "${docNames}"...`;
        setAnalysisProgress(progressLabel);

        try {
          const response = await axios.post(`${API}/crm/extract-contract-clients`, {
            gcs_files: currentBatch
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000 // 5 minutes max pour les gros volumes / archives Zip
          });

          if (response.data && response.data.success) {
            if (Array.isArray(response.data.clients)) {
              allExtracted.push(...response.data.clients);
            }
            totalFilesProcessed += response.data.filesCount || currentBatch.length;
          }
        } catch (batchErr) {
          console.error(`Contract extraction error for file ${docNames}:`, batchErr);
          failedBatches++;
          const errMsg = batchErr.response?.data?.error || batchErr.message || "Erreur réseau";
          toast.error(`Document "${docNames}" : ${errMsg}`);
        }
      }

      if (allExtracted.length > 0) {
        // Réassigner des IDs uniques pour la sélection
        const formattedList = allExtracted.map((c, i) => ({
          ...c,
          id: `extracted_${Date.now()}_${i}`
        }));
        setExtractedClients(formattedList);
        setSelectedExtractedIds(new Set(formattedList.map(c => c.id)));
        setContractModalStep('review');
        toast.success(`✨ ${formattedList.length} client(s) extrait(s) des ${totalFilesProcessed} document(s) analysé(s) !`);
      } else {
        if (failedBatches === 0) {
          toast.warning("Aucun client n'a pu être extrait des documents fournis.");
        }
      }
    } catch (err) {
      console.error("Contract extraction general error:", err);
      toast.error("Erreur lors de l'analyse : " + (err.response?.data?.error || err.message));
    } finally {
      setIsAnalyzingContracts(false);
      setAnalysisProgress("");
    }
  };

  const handleToggleExtractedClient = (id) => {
    setSelectedExtractedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllExtracted = (selectAll) => {
    if (selectAll) {
      setSelectedExtractedIds(new Set(extractedClients.map(c => c.id)));
    } else {
      setSelectedExtractedIds(new Set());
    }
  };

  const handleUpdateExtractedField = (id, field, value) => {
    setExtractedClients(prev => prev.map(client => {
      if (client.id === id) {
        return { ...client, [field]: value };
      }
      return client;
    }));
  };

  const handleDeleteExtractedClient = (id) => {
    setExtractedClients(prev => prev.filter(c => c.id !== id));
    setSelectedExtractedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveValidatedClients = async () => {
    const clientsToSave = extractedClients.filter(c => selectedExtractedIds.has(c.id));
    if (clientsToSave.length === 0) {
      toast.error("Veuillez sélectionner au moins un client à valider et importer.");
      return;
    }

    setIsSavingBatch(true);
    try {
      const res = await axios.post(`${API}/crm/companies/batch`, { clients: clientsToSave });
      if (res.data.success) {
        toast.success(`🎉 ${res.data.count} client(s) importé(s) dans le Fichier Client !`);
        setShowContractModal(false);
        setContractFiles([]);
        setExtractedClients([]);
        setSelectedExtractedIds(new Set());
        setContractModalStep('upload');
        loadCompanies();
      }
    } catch (err) {
      console.error("Batch save error:", err);
      toast.error("Erreur lors de l'enregistrement : " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingBatch(false);
    }
  };

  const checkExistingDuplicate = (client) => {
    const clientEmail = (client.email || "").toLowerCase().trim();
    const clientNom = (client.nom || "").toLowerCase().trim();
    if (!clientEmail && !clientNom) return null;

    return companies.find(c => {
      const cEmail = (c.email || "").toLowerCase().trim();
      const cNom = (c.nom || "").toLowerCase().trim();
      return (clientEmail && cEmail.includes(clientEmail)) || (clientNom && cNom === clientNom);
    });
  };

  // ══════════ MOTEUR D'ANALYSE & GESTION DES DOUBLONS ══════════
  const normalizeText = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const cleanPhoneDigits = (phone) => {
    if (!phone) return "";
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length >= 9) {
      return digits.slice(-9);
    }
    return digits;
  };

  const detectDuplicates = (list, ignoredSet = new Set()) => {
    const pairs = [];
    const visited = new Set();

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b || !a.id || !b.id || a.id === b.id) continue;

        const pairKey = [a.id, b.id].sort().join('___');
        if (visited.has(pairKey) || ignoredSet.has(pairKey)) continue;

        const reasons = [];
        let score = 0;

        // 1. Email matching
        const emailA = (a.email || "").trim().toLowerCase();
        const emailB = (b.email || "").trim().toLowerCase();
        if (emailA && emailB && emailA === emailB) {
          reasons.push(`Adresse email identique (${emailA})`);
          score += 60;
        }

        // 2. Phone matching
        const phoneA = cleanPhoneDigits(a.telephone);
        const phoneB = cleanPhoneDigits(b.telephone);
        if (phoneA && phoneB && phoneA.length >= 9 && phoneA === phoneB) {
          reasons.push(`Numéro de téléphone identique (${a.telephone || b.telephone})`);
          score += 50;
        }

        // 3. SIRET matching
        const siretA = (a.siret || "").replace(/[^0-9]/g, "");
        const siretB = (b.siret || "").replace(/[^0-9]/g, "");
        if (siretA && siretB && siretA.length >= 9 && siretA === siretB) {
          reasons.push(`Numéro SIRET identique (${siretA})`);
          score += 70;
        }

        // 4. Name matching
        const normA = normalizeText(a.nom);
        const normB = normalizeText(b.nom);
        if (normA && normB) {
          if (normA === normB) {
            reasons.push(`Nom identique ("${a.nom}")`);
            score += 50;
          } else if (normA.length > 5 && normB.length > 5 && (normA.includes(normB) || normB.includes(normA))) {
            reasons.push(`Noms très similaires ("${a.nom}" et "${b.nom}")`);
            score += 35;
          } else {
            const wordsA = (a.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[\s,&+]+/).filter(w => w.length > 2);
            const wordsB = (b.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[\s,&+]+/).filter(w => w.length > 2);
            const commonWords = wordsA.filter(w => wordsB.includes(w));
            if (commonWords.length >= 2 || (wordsA.length === 1 && wordsB.length === 1 && commonWords.length === 1)) {
              reasons.push(`Noms partageant des mots-clés ("${commonWords.join(' ')}")`);
              score += 25;
            }
          }
        }

        if (score >= 40 || (reasons.length > 0 && (emailA === emailB || (phoneA && phoneA === phoneB) || normA === normB))) {
          visited.add(pairKey);

          const pickLonger = (valA, valB) => {
            if (!valA && valB) return valB;
            if (!valB && valA) return valA;
            if (valA && valB) {
              return String(valA).length >= String(valB).length ? valA : valB;
            }
            return "";
          };

          const notesParts = [];
          if (a.notes && a.notes.trim()) notesParts.push(a.notes.trim());
          if (b.notes && b.notes.trim() && (!a.notes || !a.notes.includes(b.notes.trim()))) {
            notesParts.push(b.notes.trim());
          }

          const mergedContacts = [...(Array.isArray(a.contacts) ? a.contacts : []), ...(Array.isArray(b.contacts) ? b.contacts : [])];
          const uniqueContacts = [];
          const contactSeen = new Set();
          for (const c of mergedContacts) {
            const cKey = `${c.nom || ''}_${c.email || ''}_${c.telephone || ''}`;
            if (!contactSeen.has(cKey)) {
              contactSeen.add(cKey);
              uniqueContacts.push(c);
            }
          }

          const mergedDraft = {
            nom: pickLonger(a.nom, b.nom),
            type_client: a.type_client || b.type_client || "Particulier",
            siret: pickLonger(a.siret, b.siret),
            secteur: pickLonger(a.secteur, b.secteur),
            adresse: pickLonger(a.adresse, b.adresse),
            telephone: pickLonger(a.telephone, b.telephone),
            email: pickLonger(a.email, b.email),
            statut: a.statut || b.statut || "client",
            contacts: uniqueContacts,
            date_evenement: pickLonger(a.date_evenement, b.date_evenement),
            annee_prestation: pickLonger(a.annee_prestation, b.annee_prestation),
            type_evenement: pickLonger(a.type_evenement, b.type_evenement),
            lieu_evenement: pickLonger(a.lieu_evenement, b.lieu_evenement),
            notes: notesParts.join("\n---\n"),
            blacklist_tags: pickLonger(a.blacklist_tags, b.blacklist_tags),
            source_contrat: pickLonger(a.source_contrat, b.source_contrat),
            gcs_url: a.gcs_url || b.gcs_url || ""
          };

          pairs.push({
            id: pairKey,
            companyA: a,
            companyB: b,
            reasons,
            score,
            mergedDraft
          });
        }
      }
    }

    return pairs.sort((p1, p2) => p2.score - p1.score);
  };

  const handleSearchDuplicates = () => {
    setIsSearchingDuplicates(true);
    const found = detectDuplicates(companies, dismissedPairKeys);
    setIsSearchingDuplicates(false);

    if (found.length === 0) {
      toast.success("✅ Aucun doublon détecté parmi vos clients !");
    } else {
      setDuplicatePairs(found);
      setCurrentPairIndex(0);
      setEditMergeDraft({ ...found[0].mergedDraft });
      setIsCustomizingMerge(false);
      setShowDuplicatesModal(true);
      toast.info(`🔍 ${found.length} doublon(s) potentiel(s) détecté(s).`);
    }
  };

  const handleApplyMerge = async () => {
    const pair = duplicatePairs[currentPairIndex];
    if (!pair || !editMergeDraft) return;

    setIsMergingOrDeleting(true);
    try {
      const res = await axios.post(`${API}/crm/companies/merge`, {
        primaryId: pair.companyA.id,
        secondaryId: pair.companyB.id,
        mergedData: editMergeDraft
      });

      if (res.data.success) {
        toast.success(`✨ Fusion réussie pour "${editMergeDraft.nom}" !`);
        
        // Update local companies list
        setCompanies(prev => prev.map(c => c.id === pair.companyA.id ? res.data.company : c).filter(c => c.id !== pair.companyB.id));

        // Filter out handled pair and any other pairs referencing either company
        const remaining = duplicatePairs.filter(p => 
          p.id !== pair.id && 
          p.companyA.id !== pair.companyA.id && 
          p.companyB.id !== pair.companyA.id &&
          p.companyA.id !== pair.companyB.id && 
          p.companyB.id !== pair.companyB.id
        );

        setDuplicatePairs(remaining);
        if (remaining.length > 0) {
          const nextIndex = Math.min(currentPairIndex, remaining.length - 1);
          setCurrentPairIndex(nextIndex);
          setEditMergeDraft({ ...remaining[nextIndex].mergedDraft });
          setIsCustomizingMerge(false);
        } else {
          setShowDuplicatesModal(false);
          toast.success("🎉 Tous les doublons ont été traités !");
        }
      }
    } catch (err) {
      console.error("Merge error:", err);
      toast.error("Erreur lors de la fusion : " + (err.response?.data?.error || err.message));
    } finally {
      setIsMergingOrDeleting(false);
    }
  };

  const handleDeleteOneDuplicate = async (companyToDelete, companyToKeep) => {
    const pair = duplicatePairs[currentPairIndex];
    if (!pair) return;

    setIsMergingOrDeleting(true);
    setConfirmDeleteBoth(false);
    try {
      await axios.delete(`${API}/crm/companies/${companyToDelete.id}`);
      toast.success(`🗑️ Dossier "${companyToDelete.nom}" supprimé. Dossier "${companyToKeep.nom}" conservé.`);

      // Update companies list
      setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));

      // Remove handled pairs referencing the deleted company
      const remaining = duplicatePairs.filter(p => 
        p.companyA.id !== companyToDelete.id && 
        p.companyB.id !== companyToDelete.id
      );

      setDuplicatePairs(remaining);
      if (remaining.length > 0) {
        const nextIndex = Math.min(currentPairIndex, remaining.length - 1);
        setCurrentPairIndex(nextIndex);
        setEditMergeDraft({ ...remaining[nextIndex].mergedDraft });
        setIsCustomizingMerge(false);
      } else {
        setShowDuplicatesModal(false);
        toast.success("🎉 Tous les doublons ont été traités !");
      }
    } catch (err) {
      console.error("Delete duplicate error:", err);
      toast.error("Erreur lors de la suppression : " + (err.response?.data?.error || err.message));
    } finally {
      setIsMergingOrDeleting(false);
    }
  };

  const handleDeleteBothDuplicates = async () => {
    const pair = duplicatePairs[currentPairIndex];
    if (!pair) return;

    setIsMergingOrDeleting(true);
    setConfirmDeleteBoth(false);
    try {
      const nomA = pair.companyA.nom || "Fiche A";
      const nomB = pair.companyB.nom || "Fiche B";

      await Promise.all([
        axios.delete(`${API}/crm/companies/${pair.companyA.id}`),
        axios.delete(`${API}/crm/companies/${pair.companyB.id}`)
      ]);
      toast.success(`🗑️ Les 2 fiches ("${nomA}" et "${nomB}") ont été supprimées définitivement.`);

      // Update companies list
      const deletedIds = new Set([pair.companyA.id, pair.companyB.id]);
      setCompanies(prev => prev.filter(c => !deletedIds.has(c.id)));

      // Remove handled pairs referencing either company
      const remaining = duplicatePairs.filter(p => 
        !deletedIds.has(p.companyA.id) && 
        !deletedIds.has(p.companyB.id)
      );

      setDuplicatePairs(remaining);
      if (remaining.length > 0) {
        const nextIndex = Math.min(currentPairIndex, remaining.length - 1);
        setCurrentPairIndex(nextIndex);
        setEditMergeDraft({ ...remaining[nextIndex].mergedDraft });
        setIsCustomizingMerge(false);
      } else {
        setShowDuplicatesModal(false);
        toast.success("🎉 Tous les doublons ont été traités !");
      }
    } catch (err) {
      console.error("Delete both duplicates error:", err);
      toast.error("Erreur lors de la suppression des 2 fiches : " + (err.response?.data?.error || err.message));
    } finally {
      setIsMergingOrDeleting(false);
    }
  };

  const handleDismissPair = () => {
    const pair = duplicatePairs[currentPairIndex];
    if (!pair) return;

    setConfirmDeleteBoth(false);
    setDismissedPairKeys(prev => new Set(prev).add(pair.id));
    const remaining = duplicatePairs.filter(p => p.id !== pair.id);
    setDuplicatePairs(remaining);
    
    if (remaining.length > 0) {
      const nextIndex = Math.min(currentPairIndex, remaining.length - 1);
      setCurrentPairIndex(nextIndex);
      setEditMergeDraft({ ...remaining[nextIndex].mergedDraft });
      setIsCustomizingMerge(false);
      toast.info("Doublon ignoré.");
    } else {
      setShowDuplicatesModal(false);
      toast.info("Fin de l'analyse des doublons.");
    }
  };

  const handleMergeAllRemaining = async () => {
    if (duplicatePairs.length === 0) return;
    setIsMergingOrDeleting(true);

    let count = 0;
    try {
      let currentCompanies = [...companies];
      for (const pair of duplicatePairs) {
        const aExists = currentCompanies.some(c => c.id === pair.companyA.id);
        const bExists = currentCompanies.some(c => c.id === pair.companyB.id);
        if (!aExists || !bExists) continue;

        const res = await axios.post(`${API}/crm/companies/merge`, {
          primaryId: pair.companyA.id,
          secondaryId: pair.companyB.id,
          mergedData: pair.mergedDraft
        });

        if (res.data.success) {
          currentCompanies = currentCompanies.map(c => c.id === pair.companyA.id ? res.data.company : c).filter(c => c.id !== pair.companyB.id);
          count++;
        }
      }

      setCompanies(currentCompanies);
      setDuplicatePairs([]);
      setShowDuplicatesModal(false);
      toast.success(`🎉 ${count} doublon(s) fusionné(s) automatiquement avec succès !`);
    } catch (err) {
      console.error("Merge all error:", err);
      toast.error("Erreur lors de la fusion groupée : " + (err.response?.data?.error || err.message));
    } finally {
      setIsMergingOrDeleting(false);
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

  const isCompanyIncomplete = (company) => {
    if (!company) return false;
    const missingEmail = !hasCompanyEmail(company);
    const rawType = (company.type_client || "").trim().toLowerCase();
    const missingType = !rawType || rawType === "à compléter" || rawType === "a completer" || rawType === "inconnu" || rawType === "none";
    return missingEmail || missingType;
  };

  const filteredCompanies = companies.filter(company => {
    // Filtre par section principale (Entreprise, Particulier, Association, ou À compléter)
    if (clientSectionFilter === "needs_completion") {
      if (!isCompanyIncomplete(company)) return false;
    } else if (clientSectionFilter === "Entreprise") {
      if (company.type_client !== "Entreprise") return false;
    } else if (clientSectionFilter === "Particulier") {
      if (company.type_client !== "Particulier") return false;
    } else if (clientSectionFilter === "Association") {
      if (company.type_client !== "Association") return false;
    }

    const matchesSearch = (company.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.secteur && company.secteur.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (company.blacklist_tags && company.blacklist_tags.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || company.statut === statusFilter;
    
    const isTypeIncomplete = !company.type_client || company.type_client === "À compléter" || company.type_client === "A completer" || company.type_client.trim() === "";
    const matchesType = typeFilter === "all" ? true :
                        (typeFilter === "À compléter") ? isTypeIncomplete :
                        (company.type_client === typeFilter);

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

    // Filtre par présence ou absence d'email / statut à compléter
    const matchesEmail = emailFilter === "all" || 
                         (emailFilter === "needs_completion" && isCompanyIncomplete(company)) ||
                         (emailFilter === "missing" && !hasCompanyEmail(company)) || 
                         (emailFilter === "missing_type" && isTypeIncomplete) ||
                         (emailFilter === "has_email" && hasCompanyEmail(company));

    // Filtre par DJ / Artiste titulaire des contrats
    let matchesDj = true;
    if (djFilter !== "all") {
      const companyDjs = getCompanyDjs(company);
      if (djFilter === "none") {
        matchesDj = companyDjs.size === 0;
      } else {
        const selectedOpt = availableDjOptions.find(opt => String(opt.id) === String(djFilter));
        const keysToCheck = [
          String(djFilter),
          selectedOpt?.name?.toLowerCase()?.trim(),
          selectedOpt?.subtext?.toLowerCase()?.trim(),
        ].filter(Boolean);

        matchesDj = keysToCheck.some(k => companyDjs.has(k));
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesAnnee && matchesEvent && matchesDateRange && matchesEmail && matchesDj;
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
    if (!type || type === "À compléter" || type === "A completer" || type === "none" || type === "Inconnu") {
      return (
        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 font-medium">
          ⚠️ À compléter
        </Badge>
      );
    }
    const styles = {
      "Particulier": "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border border-indigo-200",
      "Entreprise": "bg-slate-100 text-slate-800 hover:bg-slate-100 border border-slate-200",
      "Association": "bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-200"
    };
    
    return (
      <Badge className={styles[type] || "bg-amber-100 text-amber-900 border border-amber-300"}>
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

  // ══════════ IMPORTATION DIRECTE DEPUIS L'APP CONTRAT ══════════
  const handleImportFromContracts = async () => {
    setIsImportingFromContractsApp(true);
    setLastImportResult(null);
    try {
      const response = await axios.post(`${API}/crm/import-from-contracts`, {
        includeArchived: includeArchivedContracts,
        updateExisting: updateExistingFromContracts
      });

      if (response.data && response.data.success) {
        setLastImportResult(response.data);
        toast.success(`🎉 ${response.data.message || "Importation terminée avec succès !"}`);
        await loadCompanies();
        await loadContracts();
      } else {
        toast.error("Erreur lors de l'importation des contrats.");
      }
    } catch (err) {
      console.error("Error importing from contracts app:", err);
      const errMsg = err.response?.data?.error || err.message || "Erreur de connexion";
      toast.error(`Échec de l'import : ${errMsg}`);
    } finally {
      setIsImportingFromContractsApp(false);
    }
  };

  // ══════════ IMPORTATION DIRECTE CSV & EXCEL HAUTE RÉSILIENCE ══════════
  const processRawGrid = (validRows, sourceFilename = "", overrideMapping = null) => {
    if (!validRows || !Array.isArray(validRows) || validRows.length === 0) {
      toast.error("Le fichier sélectionné semble vide ou illisible.");
      return;
    }

    // Garder une copie des lignes brutes pour le re-mapping éventuel
    setRawGridData(validRows);

    // Mots-clés de notation des lignes d'en-tête
    const headerKeywords = [
      "nom", "prenom", "client", "entreprise", "societe", "raison", "contact",
      "mail", "email", "courriel", "tel", "phone", "portable", "mobile",
      "adresse", "rue", "ville", "cp", "code", "postal", "type", "secteur",
      "statut", "date", "event", "evenement", "prestation", "dj", "siret", "note",
      "organisme", "structure", "designation", "intitule", "interlocuteur"
    ];

    let bestHeaderIndex = -1;
    let maxScore = 0;

    for (let r = 0; r < Math.min(validRows.length, 15); r++) {
      const row = validRows[r];
      if (!Array.isArray(row)) continue;
      let score = 0;
      for (const cell of row) {
        const str = String(cell || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (headerKeywords.some(k => str.includes(k))) score++;
      }
      if (score > maxScore) {
        maxScore = score;
        bestHeaderIndex = r;
      }
    }

    let detectedHeaders = [];
    let dataRows = [];

    if (bestHeaderIndex >= 0 && maxScore >= 1) {
      const headerRow = validRows[bestHeaderIndex] || [];
      detectedHeaders = headerRow.map((h, i) => {
        const s = String(h || "").trim();
        return s || `Colonne_${i + 1}`;
      });
      dataRows = validRows.slice(bestHeaderIndex + 1);
    } else {
      const maxCols = Math.max(...validRows.map(r => r ? r.length : 0), 1);
      for (let i = 0; i < maxCols; i++) detectedHeaders.push(`Colonne_${i + 1}`);
      dataRows = validRows;
    }

    setDetectedHeadersList(detectedHeaders);

    const normHeaders = detectedHeaders.map(h => 
      h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
    );

    // Détection automatique de la meilleure colonne pour chaque champ
    const findColName = (keywords) => {
      for (let i = 0; i < normHeaders.length; i++) {
        const nh = normHeaders[i];
        if (keywords.some(k => nh.includes(k))) return detectedHeaders[i];
      }
      return "";
    };

    const currentMapping = overrideMapping || {
      nom: columnMapping.nom || findColName(["raisonsoc", "nomdelentreprise", "societe", "entreprise", "nomclient", "nomduclient", "client", "denomination", "intitule", "organisme", "structure", "contact", "nom"]),
      prenom: findColName(["prenom"]),
      type: columnMapping.type || findColName(["typeclient", "type", "secteur", "categorie", "statutclient", "nature"]),
      email: columnMapping.email || findColName(["email", "mail", "courriel", "adressemail", "adresseemail"]),
      tel: columnMapping.tel || findColName(["telephone", "tel", "phone", "portable", "mobile", "gsm", "num"]),
      adresse: columnMapping.adresse || findColName(["adressepostale", "adresse", "rue", "voie", "domicile", "siege"]),
      cp: findColName(["codepostal", "cp", "zip"]),
      ville: findColName(["ville", "city", "commune", "localite"]),
      date: columnMapping.date || findColName(["dateevenement", "dateprestation", "dateevent", "datecontrat", "date"]),
      type_event: findColName(["typeevenement", "evenement", "event", "prestation", "formule"]),
      lieu: findColName(["lieuevenement", "lieu", "salle", "endroit"]),
      dj: findColName(["djname", "dj", "artiste", "animateur"]),
      siret: findColName(["siret", "siren"]),
      notes: columnMapping.notes || findColName(["notes", "note", "remarques", "commentaires", "info", "description", "divers"])
    };

    setColumnMapping(currentMapping);

    const cleanStr = (val) => {
      if (val === null || val === undefined) return "";
      return String(val).trim();
    };

    const isBanned = (name) => {
      if (!name) return false;
      return /marie\s*dupont|jo[eë]l\s*ruttkay/i.test(name);
    };

    const parsed = [];
    let bannedFound = 0;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.every(c => !c || String(c).trim() === "")) continue;

      const valByHeader = {};
      detectedHeaders.forEach((dh, idx) => {
        valByHeader[dh] = cleanStr(row[idx]);
        valByHeader[normHeaders[idx]] = cleanStr(row[idx]);
      });

      // 1. Extraction Nom
      let nom = "";
      if (currentMapping.nom && valByHeader[currentMapping.nom]) {
        nom = valByHeader[currentMapping.nom];
      }
      if (currentMapping.prenom && valByHeader[currentMapping.prenom]) {
        const p = valByHeader[currentMapping.prenom];
        nom = nom ? (p.toLowerCase() === nom.toLowerCase() ? nom : `${p} ${nom}`.trim()) : p;
      }
      // Fallback si pas de nom trouvé
      if (!nom) {
        for (const [k, v] of Object.entries(valByHeader)) {
          if (!v) continue;
          if (k.includes("nom") || k.includes("client") || k.includes("societe") || k.includes("entrep") || k.includes("raison") || k.includes("contact") || k.includes("structure") || k.includes("organisme")) {
            nom = v;
            break;
          }
        }
      }
      // Dernier recours : première cellule texte valide
      if (!nom) {
        for (const cell of row) {
          const s = cleanStr(cell);
          if (s && !s.includes("@") && !/^\d{9,14}$/.test(s.replace(/\D/g, "")) && !/^\d{4}-\d{2}-\d{2}$/.test(s) && isNaN(Number(s)) && s.length >= 2) {
            nom = s;
            break;
          }
        }
      }

      if (!nom || isBanned(nom)) {
        if (isBanned(nom)) bannedFound++;
        continue;
      }

      // 2. Extraction Type client
      let rawType = "";
      if (currentMapping.type && valByHeader[currentMapping.type]) {
        rawType = valByHeader[currentMapping.type];
      } else {
        rawType = valByHeader["type"] || valByHeader["typeclient"] || valByHeader["secteur"] || valByHeader["categorie"] || "";
      }
      const rawTypeLower = rawType.toLowerCase();
      let typeClient = "À compléter";
      if (rawTypeLower.includes('entrep') || rawTypeLower.includes('societ') || rawTypeLower.includes('pro') || rawTypeLower.includes('sarl') || rawTypeLower.includes('sas') || rawTypeLower.includes('sa ') || rawTypeLower.includes('eurl') || rawTypeLower.includes('siren')) {
        typeClient = "Entreprise";
      } else if (rawTypeLower.includes('partic') || rawTypeLower.includes('priv') || rawTypeLower.includes('indiv') || rawTypeLower.includes('famill') || rawTypeLower.includes('mariage')) {
        typeClient = "Particulier";
      } else if (rawTypeLower.includes('assoc') || rawTypeLower.includes('club') || rawTypeLower.includes('feder') || rawTypeLower.includes('fondation') || rawTypeLower.includes('ong')) {
        typeClient = "Association";
      }

      // 3. Extraction Email
      let email = "";
      if (currentMapping.email && valByHeader[currentMapping.email]) {
        email = valByHeader[currentMapping.email];
      }
      if (!email) {
        for (const cell of row) {
          const s = cleanStr(cell);
          if (s.includes("@") && !s.includes(" ")) {
            email = s;
            break;
          }
        }
      }

      // 4. Extraction Téléphone
      let tel = "";
      if (currentMapping.tel && valByHeader[currentMapping.tel]) {
        tel = valByHeader[currentMapping.tel];
      }
      if (!tel) {
        for (const cell of row) {
          const s = cleanStr(cell);
          const digits = s.replace(/\D/g, "");
          if (digits.length >= 9 && digits.length <= 14 && (s.startsWith("0") || s.startsWith("+") || s.startsWith("33"))) {
            tel = s;
            break;
          }
        }
      }

      // 5. Extraction Adresse
      let adresse = "";
      if (currentMapping.adresse && valByHeader[currentMapping.adresse]) {
        adresse = valByHeader[currentMapping.adresse];
      }
      const cp = currentMapping.cp && valByHeader[currentMapping.cp] ? valByHeader[currentMapping.cp] : (valByHeader["cp"] || valByHeader["codepostal"] || "");
      const ville = currentMapping.ville && valByHeader[currentMapping.ville] ? valByHeader[currentMapping.ville] : (valByHeader["ville"] || valByHeader["city"] || "");
      if (cp || ville) {
        const cpVille = [cp, ville].filter(Boolean).join(" ");
        if (!adresse.includes(cpVille)) {
          adresse = adresse ? `${adresse}, ${cpVille}` : cpVille;
        }
      }

      // 6. Prestation & Événement
      const dateEv = currentMapping.date && valByHeader[currentMapping.date] ? valByHeader[currentMapping.date] : (valByHeader["date"] || valByHeader["dateevenement"] || "");
      const typeEv = currentMapping.type_event && valByHeader[currentMapping.type_event] ? valByHeader[currentMapping.type_event] : (valByHeader["evenement"] || valByHeader["event"] || valByHeader["prestation"] || "");
      const lieuEv = currentMapping.lieu && valByHeader[currentMapping.lieu] ? valByHeader[currentMapping.lieu] : (valByHeader["lieu"] || valByHeader["salle"] || "");
      const dj = currentMapping.dj && valByHeader[currentMapping.dj] ? valByHeader[currentMapping.dj] : (valByHeader["dj"] || valByHeader["artiste"] || "");
      const siret = currentMapping.siret && valByHeader[currentMapping.siret] ? valByHeader[currentMapping.siret] : (valByHeader["siret"] || "");
      const notes = currentMapping.notes && valByHeader[currentMapping.notes] ? valByHeader[currentMapping.notes] : (valByHeader["notes"] || valByHeader["remarques"] || "");

      // Dédoublonnage instantané avec les clients existants
      const normNomStr = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const cleanPhoneDigits = tel.replace(/\D/g, "");
      const cleanEmailStr = email.toLowerCase().trim();

      const existingMatch = companies.find(c => {
        if (cleanEmailStr && c.email && c.email.toLowerCase().trim() === cleanEmailStr) return true;
        if (cleanPhoneDigits && cleanPhoneDigits.length >= 9 && c.telephone) {
          const cDigits = c.telephone.replace(/\D/g, "");
          if (cDigits && cDigits.slice(-9) === cleanPhoneDigits.slice(-9)) return true;
        }
        if (normNomStr && normNomStr.length >= 3 && c.nom) {
          const cNorm = c.nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cNorm === normNomStr) return true;
        }
        return false;
      });

      const isIncomplete = !cleanEmailStr || typeClient === "À compléter";

      parsed.push({
        id: `csv_${Date.now()}_${parsed.length}`,
        nom,
        type_client: typeClient,
        email,
        telephone: tel,
        adresse,
        siret,
        secteur: "",
        date_evenement: dateEv,
        type_evenement: typeEv,
        lieu_evenement: lieuEv,
        dj_name: dj,
        notes,
        statut: "client",
        isExisting: !!existingMatch,
        existingNom: existingMatch ? existingMatch.nom : null,
        isIncomplete
      });
    }

    if (bannedFound > 0) {
      toast.info(`🛡️ ${bannedFound} contact(s) exclu(s) automatiquement selon votre consigne (Marie Dupont / Joël Ruttkay).`);
    }

    if (parsed.length === 0) {
      setShowColumnMapper(true);
      toast.warning("Aucun nom de client n'a été reconnu automatiquement. Sélectionnez la colonne du Nom ci-dessous pour lancer l'analyse.");
      return;
    }

    setCsvExcelParsedClients(parsed);
    setCsvExcelRawFilename(sourceFilename);
    setCsvExcelStep('preview');
    toast.success(`📊 ${parsed.length} contacts chargés et analysés avec succès !`);
  };

  const handleCsvExcelFileSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Sélectionner la feuille avec le plus de lignes
        let bestSheetName = wb.SheetNames[0];
        let maxRowCount = 0;
        for (const name of wb.SheetNames) {
          const s = wb.Sheets[name];
          const g = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
          if (g.length > maxRowCount) {
            maxRowCount = g.length;
            bestSheetName = name;
          }
        }

        const ws = wb.Sheets[bestSheetName];
        const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        processRawGrid(rawGrid, file.name);
      } catch (err) {
        console.error("Error reading CSV/Excel file as array:", err);
        // Fallback texte pour CSV (Windows-1252 / UTF-8)
        try {
          const textReader = new FileReader();
          textReader.onload = (te) => {
            const text = te.target.result;
            const wbText = XLSX.read(text, { type: 'string' });
            const wsText = wbText.Sheets[wbText.SheetNames[0]];
            const rawGridText = XLSX.utils.sheet_to_json(wsText, { header: 1, defval: "" });
            processRawGrid(rawGridText, file.name);
          };
          textReader.readAsText(file, 'utf-8');
        } catch (fallbackErr) {
          toast.error("Erreur de lecture du fichier : " + err.message);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCsvPasteSubmit = () => {
    if (!csvPastedText || !csvPastedText.trim()) {
      toast.error("Veuillez coller le texte de votre fichier CSV.");
      return;
    }
    try {
      const wb = XLSX.read(csvPastedText, { type: 'string', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rawGrid.length > 0) {
        processRawGrid(rawGrid, "texte_colle.csv");
        return;
      }
    } catch (e) {}

    // Fallback split manuel par délimiteur
    const lines = csvPastedText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';
      const rawGrid = lines.map(line => {
        return line.split(sep).map(c => c.replace(/^["']|["']$/g, '').trim());
      });
      processRawGrid(rawGrid, "texte_colle.csv");
    }
  };

  const handleConfirmCsvExcelImport = async () => {
    if (csvExcelParsedClients.length === 0) {
      toast.error("Aucun contact à importer.");
      return;
    }

    setIsImportingCsvExcel(true);
    try {
      const CHUNK_SIZE = 100;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      for (let i = 0; i < csvExcelParsedClients.length; i += CHUNK_SIZE) {
        const batch = csvExcelParsedClients.slice(i, i + CHUNK_SIZE);
        const res = await axios.post(`${API}/crm/import-csv-excel`, {
          clients: batch,
          updateExisting: updateExistingInCsv
        });
        if (res.data) {
          totalAdded += res.data.addedCount || 0;
          totalUpdated += res.data.updatedCount || 0;
          totalSkipped += res.data.skippedCount || 0;
        }
      }

      toast.success(`✨ Importation réussie ! ${totalAdded} nouveau(x) contact(s) ajouté(s), ${totalUpdated} client(s) existant(s) mis à jour.`);
      setShowCsvExcelModal(false);
      setCsvExcelParsedClients([]);
      setCsvExcelStep('upload');
      await loadCompanies();
    } catch (err) {
      console.error("CSV/Excel import error:", err);
      toast.error("Erreur lors de l'import : " + (err.response?.data?.error || err.message));
    } finally {
      setIsImportingCsvExcel(false);
    }
  };

  // ══════════ EXPORTATIONS MULTI-FORMATS DU FICHIER CLIENT ══════════
  const downloadFullCSV = (targetCompanies) => {
    if (!targetCompanies || targetCompanies.length === 0) {
      toast.warning("Aucun contact à exporter.");
      return;
    }

    const headers = [
      "ID",
      "Nom du Client / Raison Sociale",
      "Type de Client",
      "Statut",
      "Email Principal",
      "Téléphone",
      "Adresse Complète",
      "Date de Prestation",
      "Type d'Événement",
      "Lieu de Réception",
      "Année Prestation",
      "DJ Titulaire",
      "SIRET",
      "Secteur",
      "Contacts Secondaires",
      "Notes & Historique Contrats",
      "Date de Création"
    ];

    const rows = targetCompanies.map(c => {
      const secondaryStr = (c.contacts || [])
        .map(ct => `${ct.nom || ''} (${ct.fonction || 'Contact'}: ${ct.telephone || ''} ${ct.email || ''})`.trim())
        .join(" | ");

      return [
        c.id || "",
        c.nom || "",
        c.type_client || "Particulier",
        c.statut || "client",
        extractEmails(c.email).join(", ") || c.email || "",
        c.telephone || "",
        c.adresse || "",
        getCompanyEventDate(c) || "",
        getCompanyEventType(c) || "",
        c.lieu_evenement || "",
        getCompanyYear(c) || "",
        getCompanyMainDjName(c) || "",
        c.siret || "",
        c.secteur || "",
        secondaryStr,
        (c.notes || "").replace(/[\r\n]+/g, " / "),
        c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : ""
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts_fichier_clients_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Fichier CSV de ${targetCompanies.length} contact(s) exporté avec succès !`);
  };

  const downloadVCard = (targetCompanies) => {
    if (!targetCompanies || targetCompanies.length === 0) {
      toast.warning("Aucun contact à exporter.");
      return;
    }

    let vcardContent = "";
    for (const c of targetCompanies) {
      const displayName = c.nom || "Contact";
      const isCompany = c.type_client === "Entreprise";
      const email = (c.email || "").trim();
      const phone = (c.telephone || "").trim();
      const address = (c.adresse || "").trim();
      const dj = getCompanyMainDjName(c);
      const eventDate = getCompanyEventDate(c);
      const eventType = getCompanyEventType(c);

      const noteLines = [];
      if (eventType) noteLines.push(`Événement : ${eventType}`);
      if (eventDate) noteLines.push(`Date : ${eventDate}`);
      if (c.lieu_evenement) noteLines.push(`Lieu : ${c.lieu_evenement}`);
      if (dj) noteLines.push(`DJ : ${dj}`);
      if (c.notes) noteLines.push(c.notes.replace(/[\r\n]+/g, ' '));

      vcardContent += "BEGIN:VCARD\r\n";
      vcardContent += "VERSION:3.0\r\n";
      vcardContent += `FN:${displayName}\r\n`;
      vcardContent += `N:${displayName};;;;\r\n`;
      if (isCompany) {
        vcardContent += `ORG:${displayName}\r\n`;
      }
      if (email) {
        vcardContent += `EMAIL;TYPE=INTERNET,PREF:${email}\r\n`;
      }
      if (phone) {
        vcardContent += `TEL;TYPE=CELL,VOICE:${phone}\r\n`;
      }
      if (address) {
        vcardContent += `ADR;TYPE=WORK:;;${address.replace(/[\r\n,;]+/g, ' ')};;;;\r\n`;
      }
      if (noteLines.length > 0) {
        vcardContent += `NOTE:${noteLines.join(' - ')}\r\n`;
      }
      vcardContent += "END:VCARD\r\n";
    }

    const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carnet_contacts_vcard_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Carnet vCard (.vcf) de ${targetCompanies.length} contact(s) téléchargé !`);
  };

  const downloadJSON = (targetCompanies) => {
    if (!targetCompanies || targetCompanies.length === 0) {
      toast.warning("Aucun contact à exporter.");
      return;
    }

    const jsonStr = JSON.stringify(targetCompanies, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sauvegarde_fichier_clients_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Export JSON de ${targetCompanies.length} contact(s) téléchargé !`);
  };

  const copyAllEmails = (targetCompanies) => {
    const emails = (targetCompanies || [])
      .flatMap(c => [
        ...extractEmails(c.email),
        ...(c.contacts || []).flatMap(ct => extractEmails(ct.email))
      ]);
    const unique = Array.from(new Set(emails.filter(Boolean)));
    if (unique.length === 0) {
      toast.error("Aucune adresse email trouvée parmi les contacts sélectionnés.");
      return;
    }
    navigator.clipboard.writeText(unique.join(", "));
    toast.success(`📋 ${unique.length} adresse(s) email copiée(s) dans le presse-papier !`);
  };

  const handleExportEmails = () => {
    setExportScope('filtered');
    setShowFullExportModal(true);
  };

  const handleDownloadCSV = () => {
    const target = exportScope === 'all' ? companies : filteredCompanies;
    downloadFullCSV(target);
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bouton Importation directe Contrats */}
            <Button 
              onClick={() => setShowImportContractsAppDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold flex items-center gap-2"
            >
              <FileSignature className="h-4 w-4 text-emerald-200" />
              <span>Importer depuis Contrats</span>
            </Button>

            {/* Bouton Importation directe CSV / Excel */}
            <Button 
              onClick={() => {
                setCsvExcelStep('upload');
                setCsvExcelParsedClients([]);
                setShowCsvExcelModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-200" />
              <span>Importer CSV / Excel</span>
            </Button>

            {/* Bouton Exportation Tous Contacts */}
            <Button 
              onClick={() => {
                setExportScope('all');
                setShowFullExportModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold flex items-center gap-2"
            >
              <Download className="h-4 w-4 text-blue-200" />
              <span>Exporter mes contacts</span>
            </Button>

            {/* Bouton Dédoublonnage */}
            <Button 
              onClick={handleSearchDuplicates}
              disabled={isSearchingDuplicates}
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-sm font-semibold flex items-center gap-2 bg-white"
            >
              {isSearchingDuplicates ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 text-indigo-600" />
              )}
              <span>Dédoublonnage</span>
            </Button>

            {/* Bouton Importation Fichiers IA */}
            <Button 
              onClick={() => {
                setContractModalStep('upload');
                setShowContractModal(true);
              }}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-sm font-semibold flex items-center gap-2 bg-white"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Importer des fichiers (IA)</span>
            </Button>

            {/* Bouton Importation Clients Location Matériel */}
            <Button 
              onClick={handleImportContacts}
              disabled={isImporting}
              variant="ghost"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Importer également les clients de l'application Matériel (Location)"
            >
              <UserPlus className="mr-1.5 h-4 w-4 text-slate-500" />
              {isImporting ? "Importation..." : "Importer Location"}
            </Button>
          </div>
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
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div 
            onClick={() => {
              setClientSectionFilter(prev => prev === "needs_completion" ? "all" : "needs_completion");
              setEmailFilter(prev => prev === "needs_completion" ? "all" : "needs_completion");
            }}
            className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl transition-all select-none border ${clientSectionFilter === "needs_completion" || emailFilter === "needs_completion" ? "bg-amber-100 border-amber-400 ring-2 ring-amber-400 shadow-xs" : "bg-amber-50/60 border-amber-200/80 hover:bg-amber-100/70"}`}
            title="Cliquer pour afficher la section À compléter (sans email ou sans type de client)"
          >
            <span className="text-xl">⚠️</span>
            <div>
              <span className="text-xs text-amber-900 block font-bold uppercase tracking-wider">À compléter</span>
              <span className={`text-lg font-bold ${companies.filter(isCompanyIncomplete).length > 0 ? "text-amber-700" : "text-slate-700"}`}>
                {companies.filter(isCompanyIncomplete).length}
              </span>
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

                  <Select value={djFilter} onValueChange={setDjFilter}>
                    <SelectTrigger className={`w-full sm:w-48 ${djFilter !== "all" ? "border-amber-400 bg-amber-50/80 text-amber-950 font-medium" : ""}`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Headphones className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <SelectValue placeholder="DJ / Artiste" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎧 Tous les DJ / Artistes</SelectItem>
                      {availableDjOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>
                          🎧 {opt.name} {opt.subtext && opt.subtext !== "Contrats" ? `(${opt.subtext})` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="none" className="text-slate-500 italic">
                        Sans DJ / Non assigné
                      </SelectItem>
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
                      <SelectItem value="À compléter" className="text-amber-700 font-medium">
                        ⚠️ À compléter ({companies.filter(c => !c.type_client || c.type_client === "À compléter" || c.type_client.trim() === "").length})
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={emailFilter} onValueChange={setEmailFilter}>
                    <SelectTrigger className={`w-full sm:w-44 ${emailFilter === "needs_completion" ? "border-amber-400 bg-amber-50 text-amber-900 font-semibold" : emailFilter === "missing" ? "border-red-400 bg-red-50 text-red-900 font-semibold" : ""}`}>
                      <SelectValue placeholder="Complétude / Email" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les clients</SelectItem>
                      <SelectItem value="needs_completion" className="text-amber-800 font-semibold">
                        ⚠️ À compléter (email ou type) ({companies.filter(isCompanyIncomplete).length})
                      </SelectItem>
                      <SelectItem value="missing" className="text-red-700 font-medium">
                        ✉️ Email manquant uniquement ({companies.filter(c => !hasCompanyEmail(c)).length})
                      </SelectItem>
                      <SelectItem value="missing_type" className="text-orange-700 font-medium">
                        🏷️ Type de client manquant ({companies.filter(c => !c.type_client || c.type_client === "À compléter" || c.type_client.trim() === "").length})
                      </SelectItem>
                      <SelectItem value="has_email" className="text-green-700">
                        ✅ Avec adresse email
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchTerm || anneeFilter !== "all" || eventFilter !== "all" || djFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || emailFilter !== "all" || startDateFilter || endDateFilter) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setAnneeFilter("all");
                        setEventFilter("all");
                        setDjFilter("all");
                        setStatusFilter("all");
                        setTypeFilter("all");
                        setEmailFilter("all");
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
                    onClick={() => {
                      setExportScope('filtered');
                      setShowFullExportModal(true);
                    }}
                    variant="outline"
                    className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 h-9 font-medium shadow-sm flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Exporter contacts filtrés ({filteredCompanies.length})</span>
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

        {/* Message d'information lorsque le filtre "À compléter" ou "Email manquant" est actif */}
        {(emailFilter === "needs_completion" || emailFilter === "missing" || emailFilter === "missing_type" || typeFilter === "À compléter") && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">!</span>
              <span>
                Filtre actif : <strong>{filteredCompanies.length}</strong> fiche(s) à compléter (email manquant et/ou type de client non renseigné). Cliquez sur modifier (✏️) pour compléter leurs coordonnées.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEmailFilter("all");
                setTypeFilter("all");
              }}
              className="text-xs text-amber-800 hover:text-amber-950 hover:bg-amber-100 h-7 px-2 font-semibold shrink-0"
            >
              Afficher tous les clients
            </Button>
          </div>
        )}

        {/* Barre de sections : Entreprise, Particulier, Association, À compléter */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Secteur / Catégorie :</span>
          <Button
            variant={clientSectionFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setClientSectionFilter("all");
              setEmailFilter("all");
            }}
            className={`h-8 text-xs font-semibold ${clientSectionFilter === "all" ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
          >
            👥 Tous les contacts ({companies.length})
          </Button>

          <Button
            variant={clientSectionFilter === "Entreprise" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setClientSectionFilter("Entreprise");
              setEmailFilter("all");
            }}
            className={`h-8 text-xs font-semibold ${clientSectionFilter === "Entreprise" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-blue-700 hover:text-blue-900 hover:bg-blue-50"}`}
          >
            🏢 Entreprises ({companies.filter(c => c.type_client === "Entreprise").length})
          </Button>

          <Button
            variant={clientSectionFilter === "Particulier" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setClientSectionFilter("Particulier");
              setEmailFilter("all");
            }}
            className={`h-8 text-xs font-semibold ${clientSectionFilter === "Particulier" ? "bg-purple-600 text-white hover:bg-purple-700" : "text-purple-700 hover:text-purple-900 hover:bg-purple-50"}`}
          >
            👤 Particuliers ({companies.filter(c => c.type_client === "Particulier").length})
          </Button>

          <Button
            variant={clientSectionFilter === "Association" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setClientSectionFilter("Association");
              setEmailFilter("all");
            }}
            className={`h-8 text-xs font-semibold ${clientSectionFilter === "Association" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"}`}
          >
            🤝 Associations ({companies.filter(c => c.type_client === "Association").length})
          </Button>

          <Button
            variant={clientSectionFilter === "needs_completion" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setClientSectionFilter(prev => prev === "needs_completion" ? "all" : "needs_completion");
              setEmailFilter(prev => prev === "needs_completion" ? "all" : "needs_completion");
            }}
            className={`h-8 text-xs font-bold transition-all ${
              clientSectionFilter === "needs_completion" 
                ? "bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400" 
                : "border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
            }`}
          >
            ⚠️ Section À compléter ({companies.filter(isCompanyIncomplete).length})
          </Button>
        </div>

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
              const hasEmail = hasCompanyEmail(company);
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
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800 text-base truncate flex items-center gap-2 flex-wrap">
                        {company.nom}
                        {!hasEmail && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-250 hover:bg-red-200 transition-colors shrink-0 shadow-2xs select-none"
                            title="⚠️ Adresse email manquante : recherche à effectuer dans votre boîte mail pour retrouver le contact"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[9px] leading-none">!</span>
                            <span className="uppercase tracking-tight font-semibold">Email à chercher</span>
                          </span>
                        )}
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
                        {getCompanyMainDjName(company) && (
                          <Badge className="bg-amber-50 text-amber-900 hover:bg-amber-100 text-[10px] font-semibold py-0.5 px-2 border border-amber-300 uppercase tracking-tight flex items-center gap-1">
                            <Headphones className="w-3 h-3 text-amber-600" />
                            <span>DJ: {getCompanyMainDjName(company)}</span>
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-slate-400 truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {company.type_client !== "Particulier" && company.contacts && company.contacts.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            👤 Contact : {company.contacts[0].nom}
                            {company.contacts[0].fonction ? ` (${company.contacts[0].fonction})` : ''}
                            {company.contacts.length > 1 ? ` +${company.contacts.length - 1}` : ''}
                          </span>
                        )}
                        <span>{company.secteur || "Aucun secteur"} {company.siret && `• SIRET: ${company.siret}`}</span>
                        {!hasEmail ? (
                          <span className="inline-flex items-center text-red-500 font-medium text-xs">
                            • ✉️ <span className="ml-0.5">Aucun email</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">
                            • ✉️ {extractEmails(company.email)[0] || (company.contacts && company.contacts.find(c => c.email)?.email)}
                          </span>
                        )}
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
      <Dialog open={showCompanyDialog} onOpenChange={(open) => {
        setShowCompanyDialog(open);
        if (!open) resetCompanyForm();
      }}>
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
                    <SelectItem value="À compléter">⚠️ À compléter (Non défini)</SelectItem>
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
              <div ref={sireneDropdownRef} className="relative bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sirene-search" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    Recherche automatique SIRENE / INSEE (Nom, Enseigne ou SIRET/SIREN)
                  </Label>
                  {sireneResults.length > 0 && (
                    <span className="text-[11px] text-blue-600 font-medium">
                      {sireneResults.length} résultat{sireneResults.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="sirene-search"
                      value={sireneSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSireneSearchQuery(val);
                        if (val.trim().length >= 3) {
                          handleSireneSearch(val);
                        } else if (val.trim().length === 0) {
                          setSireneResults([]);
                          setShowSireneDropdown(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSireneSearch();
                        }
                      }}
                      onFocus={() => {
                        if (sireneResults.length > 0) setShowSireneDropdown(true);
                      }}
                      placeholder="Tapez un nom (ex: Le coin d'Hortense) ou un SIRET / SIREN..."
                      className="bg-white border-slate-300 pr-8 text-sm"
                    />
                    {isSearchingSirene && (
                      <Loader2 className="h-4 w-4 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600" />
                    )}
                    {sireneSearchQuery && !isSearchingSirene && (
                      <button
                        type="button"
                        onClick={() => {
                          setSireneSearchQuery("");
                          setSireneResults([]);
                          setShowSireneDropdown(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => handleSireneSearch()}
                    disabled={isSearchingSirene}
                    className="bg-slate-800 hover:bg-slate-900 text-white shrink-0 shadow-sm text-xs px-3 font-medium"
                  >
                    {isSearchingSirene ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                    Rechercher
                  </Button>
                </div>

                {/* Menu déroulant des résultats d'entreprises */}
                {showSireneDropdown && sireneResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-blue-200 shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 sticky top-0 z-10 backdrop-blur-xs">
                      <span>Cliquez sur l'entreprise pour remplir automatiquement la fiche ({sireneResults.length}) :</span>
                      <button 
                        type="button" 
                        onClick={() => setShowSireneDropdown(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sireneResults.map((result, idx) => {
                        const siege = result.siege || {};
                        const siren = result.siren || "";
                        const siret = siege.siret || (result.matching_etablissements && result.matching_etablissements[0]?.siret) || siren;
                        const adresse = siege.adresse || `${siege.code_postal || ''} ${siege.libelle_commune || ''}`.trim();
                        const isActif = result.etat_administratif !== 'C' && siege.etat_administratif !== 'F';

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectSireneCompany(result)}
                            className="p-3 hover:bg-blue-50/80 cursor-pointer transition-colors space-y-1.5 group text-left"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 flex items-center gap-1.5">
                                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                                  {result.nom_complet || result.nom_raison_sociale || "Entreprise"}
                                </div>
                                {result.enseigne_1 && (
                                  <div className="text-xs text-slate-500 italic pl-5.5">
                                    Enseigne : {result.enseigne_1}
                                  </div>
                                )}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] shrink-0 font-medium ${isActif ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}
                              >
                                {isActif ? 'En activité' : 'Fermé'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pl-5.5 text-xs">
                              {siret && (
                                <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded font-semibold text-[11px] flex items-center gap-1">
                                  SIRET : {siret}
                                </span>
                              )}
                              {siren && !siret && (
                                <span className="font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                                  SIREN : {siren}
                                </span>
                              )}
                              {result.activite_principale && (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                  NAF : {result.activite_principale}
                                </span>
                              )}
                              {adresse && (
                                <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                  {adresse}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="nom">
                {companyForm.type_client === "Particulier" 
                  ? "Nom complet du client (Particulier) *" 
                  : companyForm.type_client === "Association" 
                    ? "Nom de l'association *" 
                    : "Nom de l'entreprise / Raison Sociale *"}
              </Label>
              <Input
                id="nom"
                value={companyForm.nom}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, nom: e.target.value }))}
                placeholder={companyForm.type_client === "Particulier" ? "Ex: Jean Dupont, Céline & Marc" : "Ex: Peugeot Colmar, Super U, Mairie..."}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siret" className="flex items-center justify-between">
                  <span>Numéro SIRET / SIREN</span>
                  {companyForm.siret && companyForm.siret.replace(/\s+/g, '').length >= 9 && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {companyForm.siret.replace(/\s+/g, '').length === 14 ? 'SIRET (14 chiffres)' : 'SIREN (9 chiffres)'}
                    </span>
                  )}
                </Label>
                <Input
                  id="siret"
                  value={companyForm.siret || ""}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, siret: e.target.value }))}
                  placeholder="Ex: 988 051 850 00010"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="secteur">Secteur / Activité</Label>
                <Input
                  id="secteur"
                  value={companyForm.secteur || ""}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, secteur: e.target.value }))}
                  placeholder="Ex: 47.59B, Commerce, Mairie..."
                />
              </div>
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
              <Label htmlFor="dj_profile_select">DJ / Artiste titulaire (contrats / prestation)</Label>
              <Select
                value={companyForm.dj_id || (companyForm.dj_name ? `name:${companyForm.dj_name}` : "none")}
                onValueChange={(val) => {
                  if (val === "none") {
                    setCompanyForm(prev => ({ ...prev, dj_id: "", dj_name: "" }));
                  } else if (val.startsWith("name:")) {
                    const djName = val.replace("name:", "");
                    setCompanyForm(prev => ({ ...prev, dj_id: "", dj_name: djName }));
                  } else {
                    const found = availableDjOptions.find(opt => String(opt.id) === String(val));
                    setCompanyForm(prev => ({
                      ...prev,
                      dj_id: val,
                      dj_name: found ? found.name : ""
                    }));
                  }
                }}
              >
                <SelectTrigger id="dj_profile_select" className="w-full">
                  <SelectValue placeholder="Choisir un DJ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun DJ assigné</SelectItem>
                  {availableDjOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      🎧 {opt.name} {opt.subtext && opt.subtext !== "Contrats" ? `(${opt.subtext})` : ''}
                    </SelectItem>
                  ))}
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
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold block">👥 Personnes de contact</Label>
                {companyForm.type_client === "Particulier" ? (
                  <span className="text-xs text-slate-500">Optionnel pour un particulier</span>
                ) : (
                  <span className="text-xs text-slate-500">Interlocuteurs (CSE, Responsable, etc.)</span>
                )}
              </div>

              {companyForm.type_client === "Particulier" && (!companyForm.contacts || companyForm.contacts.length === 0) && editingContactIndex === null && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-3 flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <span>Pour une fiche individuelle (Particulier), les coordonnées ci-dessus (Nom, Téléphone, Email) correspondent directement au client. Vous pouvez toutefois ajouter un contact secondaire ci-dessous si nécessaire.</span>
                </div>
              )}
              
              {companyForm.contacts && companyForm.contacts.length > 0 && (
                <div className="space-y-2 mb-4">
                  {companyForm.contacts.map((contact, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg flex justify-between items-start transition-all border ${
                        editingContactIndex === idx 
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{contact.nom}</p>
                          {editingContactIndex === idx && (
                            <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded">
                              En cours d'édition
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {contact.fonction && <span className="font-medium text-slate-700">{contact.fonction} • </span>}
                          {contact.telephone && <span>📞 {contact.telephone} • </span>}
                          {contact.email && <span>✉️ {contact.email}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => handleEditContact(idx)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 h-8 w-8 p-0"
                          title="Modifier ce contact"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-100/60 h-8 w-8 p-0"
                          title="Supprimer ce contact"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`space-y-3 p-4 rounded-lg border transition-all ${
                editingContactIndex !== null 
                  ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200' 
                  : 'bg-blue-50/70 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    {editingContactIndex !== null ? (
                      <>
                        <Edit className="w-4 h-4 text-amber-600" />
                        <span>Modifier le contact</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>Ajouter un contact {companyForm.type_client !== "Particulier" ? "à cette organisation" : "secondaire"}</span>
                      </>
                    )}
                  </p>
                  {editingContactIndex !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditContact}
                      className="text-xs text-slate-500 hover:text-slate-800 h-6 px-2"
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nom du contact *"
                    value={newContact.nom}
                    onChange={(e) => setNewContact(prev => ({ ...prev, nom: e.target.value }))}
                  />
                  <Input
                    placeholder="Fonction (ex: Membre CSE, RH, Direction)"
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
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    onClick={handleAddContact} 
                    size="sm" 
                    className={`w-full font-medium ${
                      editingContactIndex !== null 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {editingContactIndex !== null ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Valider la modification du contact
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter ce contact
                      </>
                    )}
                  </Button>
                  {editingContactIndex !== null && (
                    <Button 
                      type="button"
                      onClick={handleCancelEditContact} 
                      size="sm" 
                      variant="outline"
                      className="shrink-0"
                    >
                      Annuler
                    </Button>
                  )}
                </div>
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
            <Button variant="outline" onClick={() => { setShowCompanyDialog(false); resetCompanyForm(); }}>
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
      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        setShowDetailDialog(open);
        if (!open) setSelectedCompanyForDetail(null);
      }}>
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
                  {/* Alerte si email manquant */}
                  {!hasCompanyEmail(company) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                          !
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-900">Adresse email non renseignée</p>
                          <p className="text-xs text-red-700 mt-0.5">
                            Recherchez <strong>« {company.nom} »</strong> dans votre boîte mail pour retrouver ses coordonnées et compléter sa fiche.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleEditFromDetail(company)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs shrink-0 font-semibold h-8"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Renseigner l'email
                      </Button>
                    </div>
                  )}

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
                    {getCompanyMainDjName(company) && (
                      <Badge className="bg-amber-50 text-amber-900 border-amber-300 font-semibold flex items-center gap-1">
                        <Headphones className="w-3.5 h-3.5 text-amber-600" />
                        <span>DJ Titulaire : {getCompanyMainDjName(company)}</span>
                      </Badge>
                    )}
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
                    {company.email ? (
                      <div className="flex items-start text-sm text-gray-700 md:col-span-2 border-t pt-3 mt-1">
                        <Mail className="h-5 w-5 mr-3 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</p>
                          <a href={`mailto:${company.email}`} className="mt-0.5 text-blue-600 hover:underline block font-medium">{company.email}</a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start text-sm text-gray-700 md:col-span-2 border-t pt-3 mt-1">
                        <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs mr-3 shrink-0">!</div>
                        <div>
                          <p className="font-semibold text-red-800 text-xs uppercase tracking-wider">Email</p>
                          <p className="mt-0.5 text-red-600 text-xs font-medium">Aucune adresse email renseignée</p>
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

                  {/* Contrats & Prestations associées avec le DJ */}
                  {getCompanyContracts(company).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-amber-500" /> Contrats & Prestations ({getCompanyContracts(company).length})
                      </h4>
                      <div className="space-y-2">
                        {getCompanyContracts(company).map((contract, idx) => {
                          const cDjName = contract.dj_profile_data?.nom_artistique || contract.dj_profile_data?.name || contract.dj_profile_data?.nom_complet || (djs.find(d => String(d.id) === String(contract.dj_profile))?.nom_artistique) || contract.dj_profile || "Non assigné";
                          const cDate = contract.client_info?.event_date || contract.event_date || "";
                          const cType = contract.client_info?.event_type || contract.event_type || "Prestation musicale";
                          return (
                            <div key={contract.id || idx} className="bg-amber-50/50 border border-amber-200/70 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-800 text-sm">{cType}</span>
                                  {cDate && (
                                    <span className="text-xs bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                      📅 {new Date(cDate).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  Contrat : <span className="font-mono">{contract.id ? contract.id.slice(0, 10) : '—'}</span> {contract.status ? `• Statut : ${contract.status}` : ''}
                                </p>
                              </div>
                              <div className="shrink-0">
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs flex items-center gap-1">
                                  <Headphones className="w-3 h-3 text-amber-700" />
                                  <span>DJ : {cDjName}</span>
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
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

      {/* ══════════ DIALOG IMPORTATION DEPUIS L'APPLICATION CONTRAT ══════════ */}
      <Dialog open={showImportContractsAppDialog} onOpenChange={setShowImportContractsAppDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Importer les contrats (App Contrats)
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Synchronisez directement toutes les coordonnées de vos clients depuis l'ensemble des contrats enregistrés dans votre application Contrat.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ce qui est extrait automatiquement :</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 pl-6 list-disc text-slate-700">
                <li>Nom / Prénom ou Société</li>
                <li>Email principal & conjoint</li>
                <li>Téléphone principal & conjoint</li>
                <li>Adresse postale complète</li>
                <li>Date & Type d'événement</li>
                <li>Lieu de réception</li>
                <li>DJ attribué</li>
                <li>Rattachement du contrat aux notes</li>
              </ul>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeArchivedContracts}
                  onChange={(e) => setIncludeArchivedContracts(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Inclure également les contrats archivés et finalisés</span>
                  <p className="text-xs text-slate-500">Permet de récupérer l'historique de tous vos anciens contrats passés.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateExistingFromContracts}
                  onChange={(e) => setUpdateExistingFromContracts(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Enrichir automatiquement les fiches existantes</span>
                  <p className="text-xs text-slate-500">Complète automatiquement les numéros, adresses ou DJ manquants sans écraser vos notes personnalisées.</p>
                </div>
              </label>
            </div>

            {lastImportResult && (
              <div className="p-3 bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-xl text-xs space-y-1 animate-fadeIn">
                <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-950">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  Rapport de la dernière synchronisation :
                </p>
                <p>• {lastImportResult.totalContractsAnalyzed} contrat(s) analysé(s)</p>
                <p>• <strong>{lastImportResult.addedCount}</strong> nouveau(x) client(s) importé(s)</p>
                <p>• <strong>{lastImportResult.updatedCount}</strong> client(s) existant(s) mis à jour / enrichi(s)</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setShowImportContractsAppDialog(false)}
              disabled={isImportingFromContractsApp}
              className="sm:w-auto w-full"
            >
              Fermer
            </Button>
            <Button
              onClick={handleImportFromContracts}
              disabled={isImportingFromContractsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 sm:w-auto w-full"
            >
              {isImportingFromContractsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importation en cours...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Lancer l'importation des contrats</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG IMPORTATION DIRECTE CSV & EXCEL ══════════ */}
      <Dialog open={showCsvExcelModal} onOpenChange={setShowCsvExcelModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {csvExcelStep === 'upload' ? "Importer un fichier CSV ou Excel" : "Aperçu et validation de l'import"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  {csvExcelStep === 'upload' 
                    ? "Importez votre fichier de contacts (400+ clients). Dédoublonnage automatique, enrichissement des coordonnées existantes et catégorisation instantanée."
                    : `Vérifiez les ${csvExcelParsedClients.length} contacts détectés avant de confirmer leur intégration dans votre fichier client.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {csvExcelStep === 'upload' ? (
            <div className="space-y-5 py-4">
              {/* Onglets Choix Fichier vs Copier-Coller */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setCsvImportTab('file')}
                  className={`py-2.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
                    csvImportTab === 'file'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Déposer un fichier (.csv ou .xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCsvImportTab('paste')}
                  className={`py-2.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
                    csvImportTab === 'paste'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  <span>Coller le texte CSV directement</span>
                </button>
              </div>

              {csvImportTab === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleCsvExcelFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-indigo-250 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 relative shadow-2xs"
                >
                  <input
                    id="csv-excel-input"
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvExcelFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600 border border-indigo-100 flex items-center gap-3">
                    <span className="text-3xl">📊</span>
                    <span className="text-3xl">📑</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Glissez et déposez votre fichier CSV ou Excel ici
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Formats acceptés : <strong>.CSV</strong>, <strong>.XLSX</strong> ou <strong>.XLS</strong>.
                      Analyse instantanée et détection de vos colonnes (Nom, Type, Email, Téléphone, Adresse, etc.).
                    </p>
                  </div>
                  <label
                    htmlFor="csv-excel-input"
                    className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Parcourir mes documents</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="csv-paste-area" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Collez le contenu de votre fichier CSV :
                  </Label>
                  <Textarea
                    id="csv-paste-area"
                    rows={10}
                    placeholder="Nom;Type;Email;Telephone;Adresse;Date;Lieu;DJ;Notes&#10;Société Exemple;Entreprise;contact@exemple.fr;0612345678;12 rue Principale 68000 Colmar;2025-06-14;Hôtel Europe;Joël R'Key;Soirée DJ..."
                    value={csvPastedText}
                    onChange={(e) => setCsvPastedText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleCsvPasteSubmit}
                      disabled={!csvPastedText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Analyser le texte CSV</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Guide de mapping des colonnes et ajustement manuel */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>💡</span> Colonnes reconnues automatiquement :
                  </p>
                  {detectedHeadersList.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowColumnMapper(!showColumnMapper)}
                      className="text-xs text-indigo-700 hover:text-indigo-900 h-7 px-2 font-semibold"
                    >
                      {showColumnMapper ? "Masquer les colonnes" : "Ajuster les colonnes manuellement ⚙️"}
                    </Button>
                  )}
                </div>

                {showColumnMapper && detectedHeadersList.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3">
                    <p className="text-xs text-indigo-950 font-medium">
                      Sélectionnez la colonne de votre fichier correspondant à chaque information :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Nom du client / Entreprise *</Label>
                        <select
                          value={columnMapping.nom || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, nom: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">-- Choisir la colonne Nom --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Type de client</Label>
                        <select
                          value={columnMapping.type || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, type: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Détection auto (ou À compléter) --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Adresse Email</Label>
                        <select
                          value={columnMapping.email || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, email: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Détection auto (présence @) --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Téléphone</Label>
                        <select
                          value={columnMapping.tel || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, tel: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Détection auto (chiffres) --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Adresse / Ville</Label>
                        <select
                          value={columnMapping.adresse || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, adresse: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Détection auto adresse --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Notes & Prestation</Label>
                        <select
                          value={columnMapping.notes || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, notes: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, csvExcelRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Détection auto notes --</option>
                          {detectedHeadersList.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>• <strong>Nom :</strong> Nom, Nom client, Entreprise, Raison Sociale, Prénom</div>
                  <div>• <strong>Type :</strong> Type, Secteur (Entreprise, Particulier, Association)</div>
                  <div>• <strong>Coordonnées :</strong> Email / Courriel, Téléphone / Portable, Adresse</div>
                  <div>• <strong>Prestation :</strong> Date, Événement, Lieu, DJ / Artiste, SIRET, Notes</div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Les contacts sans adresse email ou sans type de client seront automatiquement classés dans la section <strong>« À compléter »</strong>.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {/* Stats de l'aperçu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total contacts</span>
                  <span className="text-xl font-bold text-slate-900">{csvExcelParsedClients.length}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Nouveaux clients</span>
                  <span className="text-xl font-bold text-emerald-800">{csvExcelParsedClients.filter(c => !c.isExisting).length}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Clients à enrichir</span>
                  <span className="text-xl font-bold text-blue-800">{csvExcelParsedClients.filter(c => c.isExisting).length}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">À compléter</span>
                  <span className="text-xl font-bold text-amber-800">{csvExcelParsedClients.filter(c => c.isIncomplete).length}</span>
                </div>
              </div>

              {/* Option de mise à jour */}
              <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-indigo-950">
                <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={updateExistingInCsv}
                    onChange={(e) => setUpdateExistingInCsv(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Enrichir les fiches des clients existants avec les nouvelles coordonnées trouvées (sans écraser les données déjà renseignées)</span>
                </label>
              </div>

              {/* Table d'aperçu */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <div className="col-span-4">Nom du Client</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-3">Statut Import</div>
                  </div>
                  {csvExcelParsedClients.slice(0, 50).map((c, idx) => (
                    <div key={idx} className="px-4 py-2 grid grid-cols-12 gap-2 items-center hover:bg-slate-50">
                      <div className="col-span-4 font-semibold text-slate-800 truncate" title={c.nom}>
                        {c.nom}
                      </div>
                      <div className="col-span-2 truncate">
                        {c.type_client === "À compléter" ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">⚠️ À compléter</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal">{c.type_client}</Badge>
                        )}
                      </div>
                      <div className="col-span-3 truncate text-slate-600">
                        {c.email ? (
                          <span>{c.email}</span>
                        ) : (
                          <span className="text-red-500 italic text-[11px]">⚠️ Email manquant</span>
                        )}
                      </div>
                      <div className="col-span-3 truncate">
                        {c.isExisting ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">🔄 Mise à jour existant</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">✨ Nouveau</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {csvExcelParsedClients.length > 50 && (
                  <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                    ... et {csvExcelParsedClients.length - 50} autres contacts détectés
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            {csvExcelStep === 'preview' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCsvExcelStep('upload')}
                  disabled={isImportingCsvExcel}
                  className="sm:w-auto w-full text-xs"
                >
                  ← Choisir un autre fichier
                </Button>
                <Button
                  onClick={handleConfirmCsvExcelImport}
                  disabled={isImportingCsvExcel}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 sm:w-auto w-full"
                >
                  {isImportingCsvExcel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Intégration en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmer et Importer ces {csvExcelParsedClients.length} contacts</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowCsvExcelModal(false)}
                className="sm:w-auto w-full text-xs"
              >
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG EXPORTATION COMPLÈTE DES CONTACTS ══════════ */}
      <Dialog open={showFullExportModal} onOpenChange={setShowFullExportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Exporter mes contacts
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Téléchargez vos coordonnées clients sous différents formats selon vos besoins (Excel, iPhone/Android, Sauvegarde ou Mailing).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Choix du périmètre */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Périmètre des contacts à exporter :
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                    exportScope === "all"
                      ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="block text-sm">Tous les contacts</span>
                    <span className="text-xs text-slate-500 font-normal">Base complète du CRM</span>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {companies.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                    exportScope === "filtered"
                      ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="block text-sm">Contacts filtrés</span>
                    <span className="text-xs text-slate-500 font-normal">Selon vos filtres actifs</span>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {filteredCompanies.length}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Formats de téléchargement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Excel CSV */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 transition-all flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Tableau Excel / CSV Complet</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Idéal pour Excel, LibreOffice et Google Sheets. Inclut toutes les colonnes : nom, téléphone, adresse, date d'événement, DJ, notes...
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const target = exportScope === "all" ? companies : filteredCompanies;
                    downloadFullCSV(target);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger en Excel (.csv)</span>
                </Button>
              </div>

              {/* Option 2: vCard .vcf */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 transition-all flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold">
                    <Smartphone className="w-5 h-5" />
                    <span>Carnet Téléphonique vCard (.vcf)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Idéal pour importer directement dans vos contacts sur iPhone, Android, Mac Contacts, Google Contacts ou Outlook.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const target = exportScope === "all" ? companies : filteredCompanies;
                    downloadVCard(target);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger le carnet (.vcf)</span>
                </Button>
              </div>

              {/* Option 3: Sauvegarde JSON */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 transition-all flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-amber-700 font-bold">
                    <Database className="w-5 h-5" />
                    <span>Sauvegarde Brute JSON</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Export technique complet de l'ensemble des fiches et structures de données pour sauvegarde ou archivage.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const target = exportScope === "all" ? companies : filteredCompanies;
                    downloadJSON(target);
                  }}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sauvegarde JSON (.json)</span>
                </Button>
              </div>

              {/* Option 4: Copie emails */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 transition-all flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold">
                    <Mail className="w-5 h-5" />
                    <span>Mailing / Liste des Emails</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Copie instantanée de toutes les adresses email uniques pour vos envois groupés (champ Cci/Bcc de votre boîte mail).
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const target = exportScope === "all" ? companies : filteredCompanies;
                    copyAllEmails(target);
                  }}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-800 hover:bg-blue-50 font-semibold text-xs gap-1.5"
                >
                  <CopyCheck className="w-3.5 h-3.5" />
                  <span>Copier les adresses email</span>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowFullExportModal(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG IMPORTATION ET VALIDATION DE CONTRATS (IA) ══════════ */}
      <Dialog open={showContractModal} onOpenChange={(open) => {
        if (!open && isAnalyzingContracts) return;
        setShowContractModal(open);
        if (!open) {
          setContractFiles([]);
          setExtractedClients([]);
          setSelectedExtractedIds(new Set());
          setContractModalStep('upload');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <FileSignature className="h-6 w-6 text-emerald-200" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  {contractModalStep === 'upload' ? "Importer des contrats (IA)" : "Validation des coordonnées clients"}
                </DialogTitle>
                <DialogDescription className="text-emerald-100/90 text-xs mt-0.5">
                  {contractModalStep === 'upload' 
                    ? "Glissez vos contrats ou sélectionnez vos fichiers." 
                    : "Vérifiez, ajustez et validez les coordonnées extraites avant de créer les fiches clients."}
                </DialogDescription>
              </div>
            </div>
            {contractModalStep === 'review' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setContractModalStep('upload')}
                className="text-white hover:bg-white/20 text-xs gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Ajouter d'autres fichiers
              </Button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {contractModalStep === 'upload' ? (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFiles}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 relative shadow-sm"
                >
                  {/* Hidden file inputs */}
                  <input 
                    id="contract-file-input"
                    type="file" 
                    multiple 
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,image/png,image/jpeg,image/jpg,image/webp,text/plain" 
                    onChange={handleFilesSelected} 
                    className="hidden" 
                  />
                  <input 
                    id="contract-folder-input"
                    type="file" 
                    webkitdirectory="" 
                    directory="" 
                    multiple 
                    onChange={handleFilesSelected} 
                    className="hidden" 
                  />

                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-inner">
                    <FileUp className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800 text-base">
                      Glissez vos contrats ici
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Formats acceptés : PDF, Word, Excel, Tableaux & Images.<br />
                      <span className="text-emerald-700 font-medium">ℹ️ Les fiches de visite manuscrites sont automatiquement ignorées pour se concentrer sur les contrats.</span>
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); document.getElementById('contract-file-input')?.click(); }}
                      className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold gap-1.5 shadow-sm px-4 py-2 h-9"
                    >
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Importer des fichiers
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); document.getElementById('contract-folder-input')?.click(); }}
                      className="bg-white border-teal-300 text-teal-800 hover:bg-teal-50 text-xs font-semibold gap-1.5 shadow-sm px-4 py-2 h-9"
                    >
                      <FolderUp className="h-4 w-4 text-teal-600" />
                      Sélectionner un dossier complet
                    </Button>
                  </div>
                </div>

                {/* Selected Files List */}
                {contractFiles.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                        Fichiers prêts pour l'analyse ({contractFiles.length})
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setContractFiles([])}
                        className="text-xs text-red-600 hover:text-red-700 h-7"
                      >
                        Tout retirer
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {contractFiles.map((file, idx) => {
                        const badgeInfo = getFileBadgeInfo(file);
                        const displayName = file.relativePath || file.name;
                        return (
                          <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs gap-2">
                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                              <span className="text-lg shrink-0">{badgeInfo.icon}</span>
                              <div className="truncate flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate" title={displayName}>{displayName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${badgeInfo.bg}`}>
                                    {badgeInfo.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} Ko</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                              className="h-6 w-6 text-slate-400 hover:text-red-600 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Review Step */
              <div className="space-y-4">
                {/* Control bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-semibold">
                      {selectedExtractedIds.size} / {extractedClients.length} sélectionné(s)
                    </Badge>
                    <span className="text-xs text-emerald-900 font-medium">
                      Cochez les clients que vous souhaitez enregistrer dans le CRM.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectAllExtracted(true)}
                      className="h-7 text-xs bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                    >
                      Tout sélectionner
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectAllExtracted(false)}
                      className="h-7 text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Tout désélectionner
                    </Button>
                  </div>
                </div>

                {/* List of Extracted Clients */}
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                  {extractedClients.map((client) => {
                    const isSelected = selectedExtractedIds.has(client.id);
                    const duplicate = checkExistingDuplicate(client);

                    return (
                      <div 
                        key={client.id} 
                        className={`border rounded-xl p-4 transition-all duration-150 ${
                          isSelected 
                            ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-200' 
                            : 'bg-slate-50/80 border-slate-200 opacity-70'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleExtractedClient(client.id)}
                              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base text-slate-900">
                                  {client.nom || "Client sans nom"}
                                </span>
                                <Badge className={
                                  client.type_client === "Entreprise" ? "bg-slate-100 text-slate-800" :
                                  client.type_client === "Association" ? "bg-purple-100 text-purple-800" :
                                  "bg-indigo-100 text-indigo-800"
                                }>
                                  {client.type_client || "Particulier"}
                                </Badge>
                                {duplicate ? (
                                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300 gap-1 text-[10px]">
                                    <AlertCircle className="h-3 w-3 text-amber-600" />
                                    Existe déjà : {duplicate.nom}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1 text-[10px]">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    Nouveau dossier
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 mt-0.5 block flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                Source : {client.source_file}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteExtractedClient(client.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            title="Retirer ce client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Editable Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Nom / Raison Sociale</Label>
                            <Input 
                              value={client.nom}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'nom', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="Nom du client"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Type de client</Label>
                            <Select 
                              value={client.type_client || "Particulier"}
                              onValueChange={(val) => handleUpdateExtractedField(client.id, 'type_client', val)}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Particulier">Particulier</SelectItem>
                                <SelectItem value="Entreprise">Entreprise</SelectItem>
                                <SelectItem value="Association">Association</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Téléphone</Label>
                            <Input 
                              value={client.telephone}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'telephone', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="06 12 34 56 78"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Email</Label>
                            <Input 
                              value={client.email}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'email', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="client@domaine.fr"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Adresse postale</Label>
                            <Input 
                              value={client.adresse}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'adresse', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="Numéro, rue, code postal, ville"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Date de prestation</Label>
                            <Input 
                              type="date"
                              value={client.date_evenement || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateExtractedField(client.id, 'date_evenement', val);
                                if (val) {
                                  handleUpdateExtractedField(client.id, 'annee_prestation', val.split('-')[0]);
                                }
                              }}
                              className="h-8 text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Type d'événement</Label>
                            <Input 
                              value={client.type_evenement || ""}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'type_evenement', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="ex: Mariage, Anniversaire..."
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Lieu / Salle</Label>
                            <Input 
                              value={client.lieu_evenement || ""}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'lieu_evenement', e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder="ex: Château de X, Salle des Fêtes..."
                            />
                          </div>

                          {client.type_client === "Entreprise" && (
                            <div>
                              <Label className="text-[11px] text-slate-500 uppercase font-semibold">SIRET / SIREN</Label>
                              <Input 
                                value={client.siret || ""}
                                onChange={(e) => handleUpdateExtractedField(client.id, 'siret', e.target.value)}
                                className="h-8 text-xs mt-1"
                                placeholder="Numéro SIRET"
                              />
                            </div>
                          )}

                          <div className={client.type_client === "Entreprise" ? "md:col-span-2" : "md:col-span-3"}>
                            <Label className="text-[11px] text-slate-500 uppercase font-semibold">Notes / Détails du contrat</Label>
                            <Textarea 
                              value={client.notes || ""}
                              onChange={(e) => handleUpdateExtractedField(client.id, 'notes', e.target.value)}
                              rows={2}
                              className="text-xs mt-1 resize-none"
                              placeholder="Formule choisie, matériel, options..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowContractModal(false)}
              disabled={isAnalyzingContracts || isSavingBatch}
            >
              Annuler
            </Button>

            {contractModalStep === 'upload' ? (
              <Button
                onClick={handleStartAnalysis}
                disabled={contractFiles.length === 0 || isAnalyzingContracts}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
              >
                {isAnalyzingContracts ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>{analysisProgress || "Analyse IA en cours..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-emerald-200" />
                    <span>Lancer l'analyse IA ({contractFiles.length} doc{contractFiles.length > 1 ? 's' : ''})</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSaveValidatedClients}
                disabled={selectedExtractedIds.size === 0 || isSavingBatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
              >
                {isSavingBatch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-200" />
                    <span>Valider et importer ({selectedExtractedIds.size}) dossier{selectedExtractedIds.size > 1 ? 's' : ''}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG GESTION & FUSION DES DOUBLONS ══════════ */}
      <Dialog open={showDuplicatesModal} onOpenChange={(open) => {
        if (!open && isMergingOrDeleting) return;
        setConfirmDeleteBoth(false);
        setShowDuplicatesModal(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          {(() => {
            const pair = duplicatePairs[currentPairIndex];
            if (!pair) {
              return (
                <div className="p-12 text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-800">Aucun doublon restant</h3>
                  <p className="text-sm text-slate-500">Tous les doublons ont été traités ou ignorés.</p>
                  <Button onClick={() => setShowDuplicatesModal(false)}>Fermer</Button>
                </div>
              );
            }

            const { companyA, companyB, reasons, score } = pair;
            const relancesA = getCompanyRelances(companyA.id);
            const relancesB = getCompanyRelances(companyB.id);

            return (
              <>
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                      <GitMerge className="h-6 w-6 text-indigo-300" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        Résolution des doublons
                        <Badge className="bg-indigo-500/40 text-indigo-100 border border-indigo-400/30 text-[11px] font-normal">
                          Paire {currentPairIndex + 1} / {duplicatePairs.length}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-indigo-100/90 text-xs mt-0.5">
                        Comparez les deux fiches, fusionnez leurs données sans perte ou supprimez le doublon inutile.
                      </DialogDescription>
                    </div>
                  </div>

                  {duplicatePairs.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMergeAllRemaining}
                      disabled={isMergingOrDeleting}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs gap-1.5 hidden sm:flex"
                      title="Fusionne automatiquement tous les doublons détectés"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Tout fusionner automatiquement ({duplicatePairs.length})
                    </Button>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                  {/* Stepper / Reasons bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5 text-indigo-600" />
                        Critères détectés :
                      </span>
                      {reasons.map((r, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white text-indigo-900 border-indigo-300 text-[11px] font-medium shadow-2xs">
                          {r}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={currentPairIndex === 0 || isMergingOrDeleting}
                        onClick={() => {
                          const prevIdx = currentPairIndex - 1;
                          setConfirmDeleteBoth(false);
                          setCurrentPairIndex(prevIdx);
                          setEditMergeDraft({ ...duplicatePairs[prevIdx].mergedDraft });
                          setIsCustomizingMerge(false);
                        }}
                        className="h-7 w-7 bg-white"
                        title="Paire précédente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-semibold text-indigo-900 px-1">
                        {currentPairIndex + 1} / {duplicatePairs.length}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={currentPairIndex === duplicatePairs.length - 1 || isMergingOrDeleting}
                        onClick={() => {
                          const nextIdx = currentPairIndex + 1;
                          setConfirmDeleteBoth(false);
                          setCurrentPairIndex(nextIdx);
                          setEditMergeDraft({ ...duplicatePairs[nextIdx].mergedDraft });
                          setIsCustomizingMerge(false);
                        }}
                        className="h-7 w-7 bg-white"
                        title="Paire suivante"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CARD A */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] uppercase tracking-wider mb-1 font-bold">
                              Fiche A (Enregistrement #1)
                            </Badge>
                            <h3 className="text-lg font-bold text-slate-900">{companyA.nom || "Sans nom"}</h3>
                            <p className="text-[11px] text-slate-400">
                              Créé le {companyA.created_at ? new Date(companyA.created_at).toLocaleDateString("fr-FR") : "Date inconnue"}
                            </p>
                          </div>
                          <Badge className={
                            companyA.type_client === "Entreprise" ? "bg-slate-200 text-slate-800" :
                            companyA.type_client === "Association" ? "bg-purple-100 text-purple-800" :
                            "bg-blue-100 text-blue-800"
                          }>
                            {companyA.type_client || "Particulier"}
                          </Badge>
                        </div>

                        {/* Fields List */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Téléphone : </span>
                              <span className={companyA.telephone ? "text-slate-900 font-medium" : "text-slate-400 italic"}>
                                {companyA.telephone || "Non renseigné"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="truncate">
                              <span className="font-semibold text-slate-600">Email : </span>
                              <span className={companyA.email ? "text-slate-900 font-medium" : "text-slate-400 italic"}>
                                {companyA.email || "Non renseigné"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Adresse : </span>
                              <span className={companyA.adresse ? "text-slate-900" : "text-slate-400 italic"}>
                                {companyA.adresse || "Non renseignée"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Événement : </span>
                              <span>
                                {companyA.date_evenement ? `${companyA.date_evenement} ` : ""}
                                {companyA.type_evenement ? `(${companyA.type_evenement}) ` : ""}
                                {companyA.lieu_evenement ? `à ${companyA.lieu_evenement}` : ""}
                                {!companyA.date_evenement && !companyA.type_evenement && !companyA.lieu_evenement && (
                                  <span className="text-slate-400 italic">Aucun renseigné</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {companyA.siret && (
                            <div className="flex items-start gap-2">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-slate-600">SIRET : </span>
                                <span>{companyA.siret}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-[10px] text-slate-600">
                              👥 {Array.isArray(companyA.contacts) ? companyA.contacts.length : 0} contact(s)
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-slate-600">
                              ⏰ {relancesA.length} relance(s)
                            </Badge>
                          </div>

                          {companyA.notes && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-2 text-[11px] text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                              <span className="font-semibold text-slate-500 block mb-0.5">Notes :</span>
                              {companyA.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Single Keep Button */}
                      <div className="pt-4 border-t border-slate-100 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOneDuplicate(companyB, companyA)}
                          disabled={isMergingOrDeleting}
                          className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Conserver Fiche A & Supprimer Fiche B
                        </Button>
                      </div>
                    </div>

                    {/* CARD B */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-[10px] uppercase tracking-wider mb-1 font-bold">
                              Fiche B (Enregistrement #2)
                            </Badge>
                            <h3 className="text-lg font-bold text-slate-900">{companyB.nom || "Sans nom"}</h3>
                            <p className="text-[11px] text-slate-400">
                              Créé le {companyB.created_at ? new Date(companyB.created_at).toLocaleDateString("fr-FR") : "Date inconnue"}
                            </p>
                          </div>
                          <Badge className={
                            companyB.type_client === "Entreprise" ? "bg-slate-200 text-slate-800" :
                            companyB.type_client === "Association" ? "bg-purple-100 text-purple-800" :
                            "bg-blue-100 text-blue-800"
                          }>
                            {companyB.type_client || "Particulier"}
                          </Badge>
                        </div>

                        {/* Fields List */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Téléphone : </span>
                              <span className={companyB.telephone ? "text-slate-900 font-medium" : "text-slate-400 italic"}>
                                {companyB.telephone || "Non renseigné"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="truncate">
                              <span className="font-semibold text-slate-600">Email : </span>
                              <span className={companyB.email ? "text-slate-900 font-medium" : "text-slate-400 italic"}>
                                {companyB.email || "Non renseigné"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Adresse : </span>
                              <span className={companyB.adresse ? "text-slate-900" : "text-slate-400 italic"}>
                                {companyB.adresse || "Non renseignée"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">Événement : </span>
                              <span>
                                {companyB.date_evenement ? `${companyB.date_evenement} ` : ""}
                                {companyB.type_evenement ? `(${companyB.type_evenement}) ` : ""}
                                {companyB.lieu_evenement ? `à ${companyB.lieu_evenement}` : ""}
                                {!companyB.date_evenement && !companyB.type_evenement && !companyB.lieu_evenement && (
                                  <span className="text-slate-400 italic">Aucun renseigné</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {companyB.siret && (
                            <div className="flex items-start gap-2">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-slate-600">SIRET : </span>
                                <span>{companyB.siret}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-[10px] text-slate-600">
                              👥 {Array.isArray(companyB.contacts) ? companyB.contacts.length : 0} contact(s)
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-slate-600">
                              ⏰ {relancesB.length} relance(s)
                            </Badge>
                          </div>

                          {companyB.notes && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-2 text-[11px] text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                              <span className="font-semibold text-slate-500 block mb-0.5">Notes :</span>
                              {companyB.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Single Keep Button */}
                      <div className="pt-4 border-t border-slate-100 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOneDuplicate(companyA, companyB)}
                          disabled={isMergingOrDeleting}
                          className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Conserver Fiche B & Supprimer Fiche A
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ══════════ PROPOSITION DE FUSION INTELLIGENTE ══════════ */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                          <Sparkles className="h-5 w-5 text-emerald-100" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">
                            Fusion intelligente recommandée (1 seul dossier complet)
                          </h4>
                          <p className="text-xs text-slate-600">
                            Combine automatiquement les meilleures coordonnées, concatène les notes et conserve toutes les relances.
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsCustomizingMerge(!isCustomizingMerge)}
                        className="text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60"
                      >
                        {isCustomizingMerge ? "Masquer le formulaire détaillé" : "✏️ Personnaliser les champs fusionnés"}
                      </Button>
                    </div>

                    {/* Preview / Editable Form */}
                    {editMergeDraft && (
                      <div className="space-y-4">
                        {isCustomizingMerge ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-emerald-200 text-xs">
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Nom final</Label>
                              <Input 
                                value={editMergeDraft.nom || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, nom: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Type de client</Label>
                              <Select
                                value={editMergeDraft.type_client || "Particulier"}
                                onValueChange={(val) => setEditMergeDraft({ ...editMergeDraft, type_client: val })}
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Particulier">Particulier</SelectItem>
                                  <SelectItem value="Entreprise">Entreprise</SelectItem>
                                  <SelectItem value="Association">Association</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Téléphone</Label>
                              <Input 
                                value={editMergeDraft.telephone || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, telephone: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Email</Label>
                              <Input 
                                value={editMergeDraft.email || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, email: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-[11px] font-semibold text-slate-600">Adresse postale</Label>
                              <Input 
                                value={editMergeDraft.adresse || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, adresse: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Date événement</Label>
                              <Input 
                                type="date"
                                value={editMergeDraft.date_evenement || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, date_evenement: e.target.value, annee_prestation: e.target.value ? e.target.value.split('-')[0] : "" })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Type d'événement</Label>
                              <Input 
                                value={editMergeDraft.type_evenement || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, type_evenement: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Lieu événement</Label>
                              <Input 
                                value={editMergeDraft.lieu_evenement || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, lieu_evenement: e.target.value })}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-[11px] font-semibold text-slate-600">Notes combinées</Label>
                              <Textarea 
                                value={editMergeDraft.notes || ""}
                                onChange={(e) => setEditMergeDraft({ ...editMergeDraft, notes: e.target.value })}
                                rows={3}
                                className="text-xs mt-1"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-white/80 p-3.5 rounded-xl border border-emerald-200/80">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Nom</span>
                              <span className="font-bold text-slate-800 truncate block">{editMergeDraft.nom}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Téléphone</span>
                              <span className="text-slate-800 truncate block">{editMergeDraft.telephone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Email</span>
                              <span className="text-slate-800 truncate block">{editMergeDraft.email || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Type & Événement</span>
                              <span className="text-slate-800 truncate block">
                                {editMergeDraft.type_client} {editMergeDraft.date_evenement ? `• ${editMergeDraft.date_evenement}` : ""}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDismissPair}
                              disabled={isMergingOrDeleting}
                              className="text-xs text-slate-600 hover:text-slate-900"
                            >
                              <X className="mr-1.5 h-3.5 w-3.5" />
                              Ignorer (Garder les 2 fiches séparées)
                            </Button>

                            {/* Suppression des 2 fiches */}
                            {confirmDeleteBoth ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg p-1 animate-in fade-in">
                                <span className="text-xs font-semibold text-red-800 px-1.5">
                                  ⚠️ Supprimer définitivement les 2 fiches ?
                                </span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={handleDeleteBothDuplicates}
                                  disabled={isMergingOrDeleting}
                                  className="h-7 text-xs bg-red-600 hover:bg-red-700 font-bold px-2.5 gap-1"
                                >
                                  {isMergingOrDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                  Oui, supprimer les 2
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDeleteBoth(false)}
                                  disabled={isMergingOrDeleting}
                                  className="h-7 text-xs text-slate-600 hover:text-slate-800 px-2"
                                >
                                  Annuler
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteBoth(true)}
                                disabled={isMergingOrDeleting}
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
                                title="Supprimer les deux fiches si rien n'est à conserver"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Supprimer les 2 fiches
                              </Button>
                            )}
                          </div>

                          <Button
                            onClick={handleApplyMerge}
                            disabled={isMergingOrDeleting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm gap-2 text-xs sm:text-sm"
                          >
                            {isMergingOrDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Fusion en cours...
                              </>
                            ) : (
                              <>
                                <GitMerge className="h-4 w-4 text-emerald-200" />
                                Valider la fusion en 1 dossier
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setShowDuplicatesModal(false)}
                    disabled={isMergingOrDeleting}
                  >
                    Fermer
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={currentPairIndex === 0 || isMergingOrDeleting}
                      onClick={() => {
                        const prevIdx = currentPairIndex - 1;
                        setConfirmDeleteBoth(false);
                        setCurrentPairIndex(prevIdx);
                        setEditMergeDraft({ ...duplicatePairs[prevIdx].mergedDraft });
                        setIsCustomizingMerge(false);
                      }}
                      className="gap-1 text-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPairIndex === duplicatePairs.length - 1 || isMergingOrDeleting}
                      onClick={() => {
                        const nextIdx = currentPairIndex + 1;
                        setConfirmDeleteBoth(false);
                        setCurrentPairIndex(nextIdx);
                        setEditMergeDraft({ ...duplicatePairs[nextIdx].mergedDraft });
                        setIsCustomizingMerge(false);
                      }}
                      className="gap-1 text-xs"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CRMApp;
