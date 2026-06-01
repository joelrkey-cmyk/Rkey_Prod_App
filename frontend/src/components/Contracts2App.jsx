import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../services/axiosConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { X, Search, Users, FileSignature, FileText, Euro, Calendar, MapPin, User, Phone, Mail, Building, Download, Printer, Edit, Trash2, Plus, FileCheck, Archive, RotateCcw, Send, Settings, Save, XCircle, Copy, ArrowLeft, Utensils, Coffee, Soup, Minus, Paperclip, Upload, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import apiService from "../services/api";
import FormSubmissionsSelector from "./FormSubmissionsSelector";

// Modules extraits pour la maintenabilité
import { fallbackPredefinedNotes, musicStyles, eventCategories, defaultHypnosisProgram, defaultCompanySettings } from "./contracts2/constants";
import { generateContractHTML } from "./contracts2/htmlGenerator";
import { generatePDFFromHTML as generatePDFFromHTMLImported, printContractWithSignature, generateContractAndGuide, getCompiledGuideBlob, previewContractPdf, getFormattedEventDate } from "./contracts2/pdfGenerator";
import { ConfigurationPage } from "./contracts2/ConfigurationPage";
import { ContractPreview } from "./contracts2/ContractPreview";
import { ContractHistory } from "./contracts2/ContractHistory";
import { SignaturePadModal } from "./contracts2/SignaturePadModal";
import ErrorBoundary from "./ErrorBoundary";
import { generateMandatHTML, generateArtisteHTML, generateEntrepriseHTML } from "./contracts2/mandatHtmlGenerator";

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const defaultArtistCgv = `Article 1 - Objet
Le présent contrat définit les conditions d'engagement de l'Artiste DJ pour la prestation artistique musicale décrite ci-dessus.

Article 2 - Obligations de l'Artiste
L'Artiste s'engage à assurer la prestation d'animation musicale incluant l'infrastructure technique (son et lumière festif) et la performance musicale, pour la durée et aux conditions décrites dans le présent contrat.

Article 3 - Obligations du Client
Le Client s'engage à mettre à disposition les installations électriques nécessaires, à faciliter l'accès au lieu de prestation et à régler le montant convenu selon les modalités définies.

Article 4 - Annulation
En cas d'annulation par le client moins de 30 jours avant l'événement, le montant total reste dû à l'Artiste.

Article 5 - Clause de sous-traitance
Le présent contrat lie le Client directement à l'Artiste DJ pour la prestation musicale. R'KEY PROD n'intervient qu'en tant que mandataire pour la recherche de l'artiste et ne saurait être tenu responsable de l'exécution de la prestation artistique.`;

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

function Contracts2App() {
  const navigate = useNavigate();
  
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath && !currentPath.includes('/contracts2')) {
      console.warn('Unexpected path change detected:', currentPath);
    }
    const handlePopState = (event) => { console.log('PopState event:', event); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const safeSetState = (setter, value) => {
    try { setter(value); } catch (err) {
      console.error('State update error:', err);
      setError(err);
      toast.error('Erreur dans l\'application - rafraîchir si nécessaire');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader><CardTitle className="text-red-600">Erreur de l'application</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Une erreur s'est produite. Essayez de rafraîchir la page.</p>
            <Button onClick={() => { setError(null); window.location.reload(); }} className="w-full">Rafraîchir la page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // STATE DECLARATIONS
  // ═══════════════════════════════════════════════════

  const [clientInfo, setClientInfo] = useState({
    name: "", company: "", address: "", phone: "", phone2: "", email: "",
    event_date: "", event_location: "", event_type: "", custom_event_type: "",
    event_note: "", setup_date: "", setup_time: "À définir", start_time: "",
    end_time: "", unlimited_time: false, guest_count: ""
  });

  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [cgvTemplates, setCgvTemplates] = useState({});
  const [selectedCgvTemplate, setSelectedCgvTemplate] = useState("");
  const [cgvText, setCgvText] = useState("");
  const [artisteCgvText, setArtisteCgvText] = useState(defaultArtistCgv);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [artisteInvoiceNumber, setArtisteInvoiceNumber] = useState("");
  const [nextNumbers, setNextNumbers] = useState({ next_mandat_number: "", next_artiste_number: "" });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [djProfiles, setDjProfiles] = useState({});
  const [selectedDjProfile, setSelectedDjProfile] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  // ── CONTRATS 2: Mode Mandat/Agence ──
  const [contractMode, setContractMode] = useState('mandataire'); // 'mandataire' ou 'entreprise'
  const [fraisMandat, setFraisMandat] = useState(0);
  const [cachetArtiste, setCachetArtiste] = useState(0);
  const [packSonorisation, setPackSonorisation] = useState(false);
  const [packLumiere, setPackLumiere] = useState(false);
  const [optionsTarifNotes, setOptionsTarifNotes] = useState("");
  const [contracts, setContracts] = useState([]);
  const [activeTab, setActiveTab] = useState("history");
  const [generatedContract, setGeneratedContract] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [selectedMusicStyles, setSelectedMusicStyles] = useState([]);
  const [djNotes, setDjNotes] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [cateringNotes, setCateringNotes] = useState("");
  const [cateringDrinks, setCateringDrinks] = useState(false);
  const [cateringHotMealNoTable, setCateringHotMealNoTable] = useState(false);
  const [cateringHotMealNoTableQty, setCateringHotMealNoTableQty] = useState(0);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [customRepasEvents, setCustomRepasEvents] = useState([]);
  const [customMusiqueEvents, setCustomMusiqueEvents] = useState([]);
  const [newRepasEvent, setNewRepasEvent] = useState("");
  const [newMusiqueEvent, setNewMusiqueEvent] = useState("");
  const [newAnimationEvent, setNewAnimationEvent] = useState("");
  const [customAnimationEvents, setCustomAnimationEvents] = useState([]);
  const [eventNotes, setEventNotes] = useState("");
  const [eventOrder, setEventOrder] = useState([]);
  
  const [hypnosisProgram, setHypnosisProgram] = useState(defaultHypnosisProgram);
  const [customDepositAmount, setCustomDepositAmount] = useState(0);
  const [noDepositRequired, setNoDepositRequired] = useState(false);
  const [selectedRIB, setSelectedRIB] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState("");
  const [depositPaidDate, setDepositPaidDate] = useState("");
  const [backgroundMusicAperitif, setBackgroundMusicAperitif] = useState("");

  const [companySettings, setCompanySettings] = useState(defaultCompanySettings);
  
  const [hasLimiteurSon, setHasLimiteurSon] = useState(false);
  const [hasDetecteurFumee, setHasDetecteurFumee] = useState(false);
  const [hasNoLimiteurNiDetecteur, setHasNoLimiteurNiDetecteur] = useState(false);
  const [hasWifi, setHasWifi] = useState(false);
  const [has4g5g, setHas4g5g] = useState(false);
  
  const [technicianContact, setTechnicianContact] = useState({ name: "", email: "", phone: "" });

  const [deletedContracts, setDeletedContracts] = useState([]);
  const [archivedContracts, setArchivedContracts] = useState([]);
  const [showTrash, setShowTrash] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [clientSignature, setClientSignature] = useState(null);
  const [signaturePadRef, setSignaturePadRef] = useState(null);
  const [signatureImages, setSignatureImages] = useState({});

  const [predefinedNotes, setPredefinedNotes] = useState(fallbackPredefinedNotes);
  const [pdfNotes, setPdfNotes] = useState([]);
  const [selectedPdfNotes, setSelectedPdfNotes] = useState([]);

  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedContractForAttachments, setSelectedContractForAttachments] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfFilename, setPreviewPdfFilename] = useState("");

  const [crmCompanies, setCrmCompanies] = useState([]);
  const [searchCrmQuery, setSearchCrmQuery] = useState("");
  const [showCrmDropdown, setShowCrmDropdown] = useState(false);

  // Handle submission import → auto-fill client fields
  const handleSubmissionSelect = (fields) => {
    const updates = {};
    if (fields.nom) updates.name = fields.nom;
    if (fields.email) updates.email = fields.email;
    if (fields.telephone) updates.phone = fields.telephone;
    if (fields.entreprise) updates.company = fields.entreprise;
    if (fields.date_evenement) {
      const raw = fields.date_evenement;
      // Try to parse to YYYY-MM-DD for the date input
      let iso = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { iso = raw; }
      else {
        const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
        if (m) iso = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        else { const d = new Date(raw); if (!isNaN(d.getTime())) iso = d.toISOString().split('T')[0]; }
      }
      if (iso) updates.event_date = iso;
    }
    if (fields.type_evenement) updates.event_type = fields.type_evenement;
    setClientInfo(prev => ({ ...prev, ...updates }));
    setSelectedSubmission(fields);
  };

  const handleClearSubmission = () => { setSelectedSubmission(null); };

  // Format date JJ-MM-AAAA for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
    if (iso) { const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}`; }
    const m = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (m) return `${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}-${m[3]}`;
    return dateStr;
  };

  // ═══════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════

  const getProfileData = (profileKey) => {
    const p = djProfiles[profileKey];
    if (p) return p;
    if (profileKey === 'joel') return { name: "Joël RUTTKAY (Joël R'Key)", nom_complet: "Joël RUTTKAY", nom_artistique: "Joël R'Key", email: "info@rkey-prod.fr", phone: "07 83 55 36 74", address: "5 rue du Hohlandsbourg, 67390 Marckolsheim", siret: "99992355000019", titre: "Gérant de R'KEY PROD", statut_artiste: "dirigeant", iban: "", bic: "" };
    if (profileKey === 'stephane') return { name: "Stéphane JACOBY (Stefan Edison)", nom_complet: "Stéphane JACOBY", nom_artistique: "Stefan Edison", email: "stephane@rkey-prod.fr", phone: "06 31 21 61 14", address: "5 rue du Hohlandsbourg, 67390 Marckolsheim", siret: "42121827200019", titre: "Animateur DJ", statut_artiste: "freelance", iban: "FR76 4061 8804 8700 0401 4272 395", bic: "" };
    return { name: "", nom_complet: "", nom_artistique: "", email: "", phone: "", address: "", siret: "", titre: "Animateur DJ", statut_artiste: "dirigeant", iban: "", bic: "" };
  };

  const resolveProfile = (contract) => {
    const snapshot = contract.dj_profile_data && contract.dj_profile_data.name
      ? contract.dj_profile_data
      : getProfileData(contract.dj_profile);
    const current = getProfileData(contract.dj_profile);
    return { ...current, ...snapshot, bic: snapshot.bic || current.bic || "" };
  };

  // Wrapper : appelle le HTML generator importé avec le contexte local
  const generateContractHTMLLocal = (contract, clientSig = null, sigs = null, options = {}) => {
    return generateContractHTML(contract, clientSig, sigs || signatureImages, companySettings, predefinedNotes, resolveProfile, options);
  };

  const animationEvents = useMemo(() => {
    const baseAnimations = [...eventCategories.animations];
    const profile = getProfileData(selectedDjProfile);
    if (profile.nom_artistique?.toLowerCase().includes("r'key") || profile.nom_artistique?.toLowerCase().includes("rkey") || profile.titre?.includes("Gérant")) {
      baseAnimations.push("Show hypnose");
    }
    return baseAnimations;
  }, [selectedDjProfile, djProfiles]);

  const eventTypesList = useMemo(() => {
    const baseTypes = ["Mariage", "Anniversaire", "Comité d'entreprise", "Soirée privée", "Événement professionnel"];
    const profile = getProfileData(selectedDjProfile);
    if (profile.nom_artistique?.toLowerCase().includes("r'key") || profile.nom_artistique?.toLowerCase().includes("rkey") || profile.titre?.includes("Gérant")) {
      baseTypes.push("Show Hypnose");
      baseTypes.push("Intervention hypnose");
    }
    return baseTypes;
  }, [selectedDjProfile, djProfiles]);

  const getNoteContent = (noteKey) => {
    return predefinedNotes[noteKey] || { title: '', content: '' };
  };

  // ═══════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════

  useEffect(() => {
    const loadSignatures = async () => {
      try {
        const signatures = await loadSignatureImages();
        setSignatureImages(signatures);
      } catch (error) { console.warn('Erreur lors du chargement des signatures:', error); }
    };
    loadSignatures();
  }, []);

  useEffect(() => {
    loadOptions();
    loadTechnicalNotes();
    loadPdfNotes();
    loadCgvTemplates();
    loadDjProfiles();
    loadContracts();
    loadDeletedContracts();
    loadArchivedContracts();
    loadCompanySettings();
    loadCrmCompanies();
    fetchNextNumbers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#crm-search-container')) {
        setShowCrmDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCrmCompanies = async () => {
    try {
      const response = await axios.get(`${API}/crm/companies`);
      setCrmCompanies(response.data || []);
    } catch (error) {
      console.error("Error loading CRM companies:", error);
    }
  };

  const handleSelectCrmCompany = (company) => {
    let name = company.nom || "";
    let compName = "";
    
    if (company.type_client !== "Particulier") {
      compName = company.nom || "";
      if (company.contacts && company.contacts.length > 0) {
        name = company.contacts[0].nom || company.nom;
      }
    }
    
    setClientInfo(prev => ({
      ...prev,
      name: name,
      company: compName,
      email: company.email || (company.contacts && company.contacts[0]?.email) || "",
      phone: company.telephone || (company.contacts && company.contacts[0]?.telephone) || "",
      address: company.adresse || ""
    }));
    
    setSearchCrmQuery("");
    setShowCrmDropdown(false);
    toast.success(`Informations de ${company.nom} appliquées !`);
  };

  const filteredCrmCompanies = useMemo(() => {
    if (!searchCrmQuery.trim()) return [];
    const q = searchCrmQuery.toLowerCase();
    return crmCompanies.filter(c => 
      (c.nom && c.nom.toLowerCase().includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.telephone && c.telephone.includes(q)) ||
      (c.secteur && c.secteur.toLowerCase().includes(q)) ||
      (c.contacts && c.contacts.some(contact => contact.nom && contact.nom.toLowerCase().includes(q)))
    );
  }, [crmCompanies, searchCrmQuery]);

  const loadOptions = async () => {
    try {
      const persistentOptions = await apiService.getMaterialOptions();
      if (persistentOptions && persistentOptions.length > 0) {
        const options = persistentOptions.map((opt) => ({ ...opt, selected: false }));
        setAvailableOptions(options);
        setSelectedOptions(options);
      } else {
        const response = await axios.get(`${API}/contract-options`);
        const options = response.data.options.map((opt, index) => ({
          ...opt, id: `option-${index}-${opt.name.replace(/\s+/g, '-').toLowerCase()}`, selected: false
        }));
        setAvailableOptions(options);
        setSelectedOptions(options);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des options");
      console.error("Error loading options:", error);
    }
  };

  const loadTechnicalNotes = async () => {
    try {
      const notes = await apiService.getTechnicalNotes();
      if (notes && notes.length > 0) {
        const notesObj = {};
        notes.forEach(note => { notesObj[note.key] = { title: note.title, content: note.content }; });
        setPredefinedNotes(notesObj);
      }
    } catch (error) { console.error("Error loading technical notes:", error); }
  };

  const fetchNextNumbers = async () => {
    try {
      const response = await axios.get(`${API}/contracts2/counters`);
      setNextNumbers(response.data);
    } catch (e) {
      console.warn("Error loading counters:", e);
    }
  };

  const handleGenerateNumbers = async (type) => {
    try {
      const response = await axios.post(`${API}/contracts2/counters/increment`, { type });
      const { mandat_number, artiste_number } = response.data;
      
      if (type === 'mandat') {
        setInvoiceNumber(mandat_number);
        toast.success(`Numéro de mandat généré : ${mandat_number}`);
      } else if (type === 'artiste') {
        setArtisteInvoiceNumber(artiste_number);
        toast.success(`Numéro d'engagement d'artiste généré : ${artiste_number}`);
      } else if (type === 'both') {
        setInvoiceNumber(mandat_number);
        setArtisteInvoiceNumber(artiste_number);
        toast.success(`Numéros générés : Mandat ${mandat_number} & Artiste ${artiste_number}`);
      }
      
      fetchNextNumbers();
    } catch (error) {
      console.error("Erreur génération numéros de contrat:", error);
      toast.error("Erreur lors de la génération des numéros séquentiels");
    }
  };

  const loadPdfNotes = async () => {
    try {
      const notes = await apiService.getContractPdfNotes();
      setPdfNotes(notes || []);
    } catch (error) { console.error("Error loading PDF notes:", error); }
  };

  const loadCgvTemplates = async () => {
    try {
      const response = await apiService.getCgvTemplates();
      setCgvTemplates(response.templates || {});
    } catch (error) {
      toast.error("Erreur lors du chargement des modèles CGV");
      console.error("Error loading CGV templates:", error);
    }
  };

  const loadDjProfiles = async () => {
    try {
      const response = await axios.get(`${API}/dj-profiles`);
      const profiles = response.data.profiles;
      setDjProfiles(profiles);
      if (!selectedDjProfile && Object.keys(profiles).length > 0) {
        const dirigeantKey = Object.keys(profiles).find(k => profiles[k].statut_artiste === 'dirigeant');
        setSelectedDjProfile(dirigeantKey || Object.keys(profiles)[0]);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des profils DJ");
      console.error("Error loading DJ profiles:", error);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/global-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanySettings({
          company_name: data.company_name || "R'KEY PROD",
          bank_name: data.bank_name || "Tiime",
          bank_iban: data.bank_iban || "",
          bank_bic: data.bank_bic || "",
          bank_titulaire: data.bank_titulaire || "R'KEY PROD",
          artiste_cgv_text: data.artiste_cgv_text || "",
        });
        if (data.artiste_cgv_text) {
          setArtisteCgvText(data.artiste_cgv_text);
        }
      }
    } catch (error) { console.error("Error loading company settings:", error); }
  };

  const loadSignatureImages = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/contracts2/signatures`, { headers });
      if (response.ok) { return await response.json(); }
      return {};
    } catch (error) { console.warn('Erreur lors de la récupération des signatures:', error); return {}; }
  };

  // ═══════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════

  // PERSISTENCE: Save/Load form state to handle "Back" button from email page
  useEffect(() => {
    const saved = sessionStorage.getItem('contracts2_form_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClientInfo(parsed.clientInfo || { name: "", company: "", address: "", phone: "", phone2: "", email: "", event_date: "", event_location: "", event_type: "", custom_event_type: "", event_note: "", setup_date: "", setup_time: "À définir", start_time: "", end_time: "", unlimited_time: false, guest_count: "" });
        setBasePrice(parsed.basePrice || 0);
        setDiscountAmount(parsed.discountAmount || 0);
        setSelectedOptions(parsed.selectedOptions || []);
        setSelectedDjProfile(parsed.selectedDjProfile || "");
        setSignatureImages(parsed.signatureImages || {});
        setInvoiceNumber(parsed.invoiceNumber || "");
        setArtisteInvoiceNumber(parsed.artisteInvoiceNumber || "");
        setNoDepositRequired(parsed.noDepositRequired || false);
        setCustomDepositAmount(parsed.customDepositAmount || 0);
        setContractMode(parsed.contractMode || 'mandataire');
        setFraisMandat(parsed.fraisMandat || 0);
        setCachetArtiste(parsed.cachetArtiste || 0);
        setPackSonorisation(parsed.packSonorisation || false);
        setPackLumiere(parsed.packLumiere || false);
        setOptionsTarifNotes(parsed.optionsTarifNotes || "");
        setSelectedNotes(parsed.selectedNotes || []);
        setSelectedMusicStyles(parsed.selectedMusicStyles || []);
        setDjNotes(parsed.djNotes || "");
        setBlacklist(parsed.blacklist || "");
        setCateringNotes(parsed.cateringNotes || "");
        setCateringDrinks(parsed.cateringDrinks || false);
        setCateringHotMealNoTable(parsed.cateringHotMealNoTable || false);
        setCateringHotMealNoTableQty(parsed.cateringHotMealNoTableQty || 0);
        setSelectedEvents(parsed.selectedEvents || []);
        setCustomRepasEvents(parsed.customRepasEvents || []);
        setCustomMusiqueEvents(parsed.customMusiqueEvents || []);
        setEventNotes(parsed.eventNotes || "");
        setEventOrder(parsed.eventOrder || []);
        setHypnosisProgram(parsed.hypnosisProgram || defaultHypnosisProgram);
        setSelectedRIB(parsed.selectedRIB || "");
        setDepositPaid(parsed.depositPaid || false);
        setDepositPaymentMethod(parsed.depositPaymentMethod || "");
        setDepositPaidDate(parsed.depositPaidDate || "");
        setBackgroundMusicAperitif(parsed.backgroundMusicAperitif || "");
        setHasLimiteurSon(parsed.hasLimiteurSon || false);
        setHasDetecteurFumee(parsed.hasDetecteurFumee || false);
        setHasNoLimiteurNiDetecteur(parsed.hasNoLimiteurNiDetecteur || false);
        setHasWifi(parsed.hasWifi || false);
        setHas4g5g(parsed.has4g5g || false);
        setTechnicianContact(parsed.technicianContact || { name: "", email: "", phone: "" });
        setSelectedPdfNotes(parsed.selectedPdfNotes || []);
        setCgvText(parsed.cgvText || "");
        setArtisteCgvText(parsed.artisteCgvText || defaultArtistCgv);
      } catch (e) {
        console.error('Failed to restore state:', e);
      }
    }
  }, []);

  useEffect(() => {
    const state = {
      clientInfo, basePrice, discountAmount, selectedOptions, selectedDjProfile, 
      signatureImages, invoiceNumber, artisteInvoiceNumber, noDepositRequired, customDepositAmount,
      contractMode, fraisMandat, cachetArtiste, packSonorisation, packLumiere, 
      optionsTarifNotes, selectedNotes, selectedMusicStyles, djNotes, blacklist, 
      cateringNotes, cateringDrinks, cateringHotMealNoTable, cateringHotMealNoTableQty, selectedEvents, 
      customRepasEvents, customMusiqueEvents, eventNotes, eventOrder, 
      hypnosisProgram, selectedRIB, depositPaid, depositPaymentMethod, 
      depositPaidDate, backgroundMusicAperitif, hasLimiteurSon, 
      hasDetecteurFumee, hasNoLimiteurNiDetecteur, hasWifi, has4g5g, technicianContact,
      selectedPdfNotes, cgvText, artisteCgvText
    };
    sessionStorage.setItem('contracts2_form_state', JSON.stringify(state));
  }, [clientInfo, basePrice, discountAmount, selectedOptions, selectedDjProfile, signatureImages, invoiceNumber, artisteInvoiceNumber, noDepositRequired, customDepositAmount, contractMode, fraisMandat, cachetArtiste, packSonorisation, packLumiere, optionsTarifNotes, selectedNotes, selectedMusicStyles, djNotes, blacklist, cateringNotes, cateringDrinks, cateringHotMealNoTable, cateringHotMealNoTableQty, selectedEvents, customRepasEvents, customMusiqueEvents, eventNotes, eventOrder, hypnosisProgram, selectedRIB, depositPaid, depositPaymentMethod, depositPaidDate, backgroundMusicAperitif, hasLimiteurSon, hasDetecteurFumee, hasNoLimiteurNiDetecteur, hasWifi, has4g5g, technicianContact, selectedPdfNotes, cgvText, artisteCgvText]);

  const getMandataireDefaultTemplateKey = (templates) => {
    const keys = Object.keys(templates || {});
    const exactMatch = keys.find(k => k === 'mandataire_1780345494958');
    if (exactMatch) return exactMatch;
    const timestampMatch = keys.find(k => k.includes('1780345494958'));
    if (timestampMatch) return timestampMatch;
    const stringMatch = keys.find(k => k.toLowerCase().replace(/_/g, ' ').includes('mandataire 1780345494958'));
    if (stringMatch) return stringMatch;
    const generalMatch = keys.find(k => k.toLowerCase().includes('mandataire'));
    if (generalMatch) return generalMatch;
    return "";
  };

  const getArtistDefaultTemplateKey = (templates) => {
    const keys = Object.keys(templates || {});
    const exactMatch = keys.find(k => k === 'contrat_artistique_1780345881807');
    if (exactMatch) return exactMatch;
    const timestampMatch = keys.find(k => k.includes('1780345881807'));
    if (timestampMatch) return timestampMatch;
    const stringMatch = keys.find(k => {
      const normalized = k.toLowerCase().replace(/_/g, ' ');
      return normalized.includes('contrat artistique') && normalized.includes('1780345881807');
    });
    if (stringMatch) return stringMatch;
    const generalMatch = keys.find(k => k.toLowerCase().includes('contrat artistique') || k.toLowerCase().includes('artistique'));
    if (generalMatch) return generalMatch;
    return "";
  };

  useEffect(() => {
    if (!editingContract && contractMode === 'mandataire' && Object.keys(cgvTemplates).length > 0) {
      const defaultKey = getMandataireDefaultTemplateKey(cgvTemplates);
      if (defaultKey && cgvTemplates[defaultKey]) {
        setSelectedCgvTemplate(defaultKey);
        setCgvText(cgvTemplates[defaultKey].content || "");
      }
      const artistDefaultKey = getArtistDefaultTemplateKey(cgvTemplates);
      if (artistDefaultKey && cgvTemplates[artistDefaultKey]) {
        setArtisteCgvText(cgvTemplates[artistDefaultKey].content || "");
      }
    }
  }, [contractMode, cgvTemplates, editingContract]);

  const loadContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts2`);
      const activeContracts = response.data.filter(contract => !['deleted', 'archived'].includes(contract.status));
      setContracts(activeContracts);
    } catch (error) { toast.error("Erreur lors du chargement des contrats"); console.error("Error loading contracts:", error); }
  };

  const loadDeletedContracts = async () => {
    try { setDeletedContracts((await axios.get(`${API}/contracts2/trash`)).data); }
    catch (error) { toast.error("Erreur lors du chargement de la corbeille"); console.error(error); }
  };

  const loadArchivedContracts = async () => {
    try { setArchivedContracts((await axios.get(`${API}/contracts2/archived`)).data); }
    catch (error) { toast.error("Erreur lors du chargement des archives"); console.error(error); }
  };

  const handleManageAttachments = (contract) => {
    setSelectedContractForAttachments(contract);
    setShowAttachmentsDialog(true);
  };

  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const allowedTypes = [
      "application/pdf", 
      "image/png", 
      "image/jpeg", 
      "image/jpg", 
      "image/heic", 
      "image/heif"
    ];

    setUploadingAttachment(true);
    const token = localStorage.getItem('access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    for (const file of files) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const isHeic = fileExt === 'heic' || fileExt === 'heif';
      if (!allowedTypes.includes(file.type) && !isHeic) {
        toast.error(`Format non supporté pour "${file.name}". PDF, PNG, JPG ou HEIC uniquement.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "Administrative");

      try {
        const response = await fetch(`${BACKEND_URL}/api/contracts2/${selectedContractForAttachments.id}/documents`, {
          method: "POST",
          headers,
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            toast.success(`"${file.name}" a été ajouté avec succès !`);
            
            // local update in state
            setSelectedContractForAttachments(prev => {
              const updatedDocs = [...(prev.event_documents || []), result.document];
              return { ...prev, event_documents: updatedDocs };
            });
          } else {
            toast.error(`Erreur d'envoi pour "${file.name}"`);
          }
        } else {
          const errRes = await response.json().catch(() => ({}));
          toast.error(`Erreur pour "${file.name}" : ${errRes.error || 'Statut ' + response.status}`);
        }
      } catch (err) {
        console.error(err);
        toast.error(`Erreur réseau pour "${file.name}"`);
      }
    }
    
    setUploadingAttachment(false);
    e.target.value = null; // reset input
    
    loadContracts();
    loadArchivedContracts();
  };

  const handlePreviewAttachment = async (doc) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/contracts2/${selectedContractForAttachments.id}/documents/${doc.id}?preview=true`, { headers });
      if (!response.ok) throw new Error("Impossible de récupérer le document");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewPdfFilename(doc.filename);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ouverture du document");
    }
  };

  const handleDeleteAttachment = async (docId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette pièce jointe ?")) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/contracts2/${selectedContractForAttachments.id}/documents/${docId}`, {
        method: "DELETE",
        headers
      });
      
      if (response.ok) {
        toast.success("Pièce jointe supprimée !");
        setSelectedContractForAttachments(prev => ({
          ...prev,
          event_documents: (prev.event_documents || []).filter(a => a.id !== docId)
        }));
        
        loadContracts();
        loadArchivedContracts();
      } else {
        toast.error("Erreur lors de la suppression de la pièce jointe");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau lors de la suppression");
    }
  };

  const markContractAsSent = async (contractId) => {
    try {
      const response = await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'sent' });
      if (response.status === 200) {
        setContracts(prev => prev.map(contract => contract.id === contractId ? { ...contract, status: 'sent' } : contract));
        toast.success("Contrat marqué comme envoyé !");
      }
    } catch (error) { console.error('Error marking contract as sent:', error); toast.error("Erreur lors de la mise à jour du statut"); }
  };

  const markContractAsSigned = async (contractId) => {
    try { await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'archived' }); toast.success("Contrat archivé avec succès !"); loadContracts(); loadArchivedContracts(); }
    catch (error) { toast.error("Erreur lors de l'archivage du contrat"); console.error(error); }
  };

  const moveContractToTrash = async (contractId) => {
    try { await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'deleted' }); toast.success("Contrat déplacé vers la corbeille"); loadContracts(); loadDeletedContracts(); }
    catch (error) { toast.error("Erreur lors de la suppression du contrat"); console.error(error); }
  };

  const restoreContract = async (contractId) => {
    try { 
      await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'draft' }); 
      toast.success("Contrat restauré avec succès !"); 
      await loadContracts(); 
      await loadDeletedContracts(); 
      setShowTrash(false); 
      setShowArchive(false); 
    }
    catch (error) { toast.error("Erreur lors de la restauration du contrat"); console.error(error); }
  };

  const permanentlyDeleteContract = async (contractId) => {
      try { await axios.delete(`${API}/contracts2/${contractId}/permanent`); toast.success("Contrat supprimé définitivement"); loadDeletedContracts(); }
      catch (error) { toast.error("Erreur lors de la suppression définitive"); console.error(error); }
  };

  const deleteArchivedContract = async (contractId) => {
      try { await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'deleted' }); toast.success("Contrat archivé supprimé et déplacé vers la corbeille"); loadArchivedContracts(); loadDeletedContracts(); }
      catch (error) { toast.error("Erreur lors de la suppression du contrat archivé"); console.error(error); }
  };

  const markArchivedAsUnsigned = async (contractId) => {
      try { 
        const response = await axios.get(`${API}/contracts2/${contractId}`);
        if (response.data) {
           const updated = { ...response.data, status: 'draft', signatures: [] };
           await axios.put(`${API}/contracts2/${contractId}`, updated);
        } else {
           await axios.put(`${API}/contracts2/${contractId}/status`, { status: 'draft' }); 
        }
        toast.success("Contrat remis dans les contrats en attente"); 
        await loadContracts(); 
        await loadArchivedContracts(); 
        setShowArchive(false); 
        setShowTrash(false); 
      }
      catch (error) { toast.error("Erreur lors de la remise en attente du contrat"); console.error(error); }
  };

  // ═══════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════

  const handleClientInfoChange = (field, value) => {
    setClientInfo(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'event_date' && value) { updated.setup_date = value; }
      return updated;
    });

    if (field === 'event_type') {
      const eventToCgvMapping = { 'Mariage': 'mariage', 'Anniversaire': 'anniversaire', 'Comité d\'entreprise': 'comite_entreprise', 'Show Hypnose': 'show_hypnose', 'Intervention hypnose': 'intervention_hypnose' };
      const selectedCgv = eventToCgvMapping[value] || '';
      setSelectedCgvTemplate(selectedCgv);
      if (selectedCgv && cgvTemplates[selectedCgv]) { setCgvText(cgvTemplates[selectedCgv].content); } else { setCgvText(''); }
      setSelectedNotes([]);
    }
  };

  const handleOptionToggle = (optionId) => {
    setSelectedOptions(prev => prev.map(option => option.id === optionId ? { ...option, selected: !option.selected } : option));
  };

  const handleNoteToggle = (noteKey) => {
    setSelectedNotes(prev => prev.includes(noteKey) ? prev.filter(key => key !== noteKey) : [...prev, noteKey]);
  };

  const handleMusicStyleToggle = (style) => {
    setSelectedMusicStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
  };

  const handleEventClick = (eventKey, eventLabel, eventType) => {
    setSelectedEvents(prev => {
      const isSelected = prev.includes(eventKey);
      if (isSelected) {
        setEventOrder(prevOrder => prevOrder.filter(item => item.key !== eventKey));
        return prev.filter(e => e !== eventKey);
      } else {
        const newOrderItem = { key: eventKey, label: eventLabel, type: eventType, icon: eventType === 'repas' ? '' : eventType === 'musique' ? '' : '' };
        setEventOrder(prevOrder => [...prevOrder, newOrderItem]);
        return [...prev, eventKey];
      }
    });
  };

  const moveEventUp = (index) => {
    if (index > 0) { setEventOrder(prev => { const n = [...prev]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n; }); }
  };

  const moveEventDown = (index) => {
    setEventOrder(prev => { if (index < prev.length - 1) { const n = [...prev]; [n[index], n[index + 1]] = [n[index + 1], n[index]]; return n; } return prev; });
  };

  const removeFromOrder = (eventKey) => {
    setEventOrder(prev => prev.filter(item => item.key !== eventKey));
    setSelectedEvents(prev => prev.filter(e => e !== eventKey));
  };

  const handleCgvTemplateChange = (templateKey) => {
    setSelectedCgvTemplate(templateKey);
    if (templateKey && cgvTemplates[templateKey]) { setCgvText(cgvTemplates[templateKey].content); }
    else if (templateKey === "custom") { setCgvText(""); }
  };

  // ═══════════════════════════════════════════════════
  // CALCULATIONS
  // ═══════════════════════════════════════════════════

  const isDirigeant = () => {
    const p = getProfileData(selectedDjProfile);
    return p.nom_artistique?.toLowerCase().includes("r'key") || p.nom_artistique?.toLowerCase().includes("rkey") || p.titre?.includes("Gérant") || p.statut_artiste === 'dirigeant';
  };

  const calculateTotal = () => {
    const optionsTotal = selectedOptions.filter(option => option.selected).reduce((sum, option) => sum + option.price, 0);
    if (isDirigeant()) {
      // Mode Prestation Directe: Prix de base + Options - Remise
      return Math.max(0, basePrice + optionsTotal - discountAmount);
    }
    if (contractMode === 'entreprise') {
      // Mode Entreprise: Prix de base + Options - Remise (tout facturé par R'KEY)
      return Math.max(0, basePrice + optionsTotal - discountAmount);
    }
    // Mode Mandat: Frais Mandat + Cachet Artiste + Options - Remise
    // Support robust fallback for legacy contracts (migrated from old app) where separate mandate fees are 0 but basePrice is set
    const mandataireRate = fraisMandat + cachetArtiste;
    const baseRate = (mandataireRate === 0 && basePrice > 0) ? basePrice : mandataireRate;
    return Math.max(0, baseRate + optionsTotal - discountAmount);
  };

  const calculateDepositAmount = () => {
    if (noDepositRequired) return 0;
    if (customDepositAmount > 0) return customDepositAmount;
    // Contrats 2: 50% du total client, ou 30% si entreprise
    const isCompany = !!(clientInfo?.company && clientInfo.company.trim().length > 0);
    const ratio = isCompany ? 0.3 : 0.5;
    const deposit = calculateTotal() * ratio;
    return Math.max(0, Math.round(deposit / 50) * 50);
  };

  const calculateRemainingBalance = () => {
    return Math.max(0, calculateTotal() - calculateDepositAmount());
  };

  const calculateSetupDate = (eventDate) => {
    if (!eventDate) return "";
    const date = new Date(eventDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const selectAllMusicStyles = () => {
    setSelectedMusicStyles([...musicStyles]);
    toast.success("Tous les styles musicaux ont été sélectionnés !");
  };

  // ═══════════════════════════════════════════════════
  // FORM RESET
  // ═══════════════════════════════════════════════════

  const resetForm = () => {
    setClientInfo({ name: "", company: "", address: "", phone: "", email: "", event_date: "", event_location: "", event_type: "", custom_event_type: "", event_note: "", setup_date: "", setup_time: "À définir", start_time: "", end_time: "", unlimited_time: false, phone2: "", guest_count: "" });
    setSelectedOptions(availableOptions.map(opt => ({ ...opt, selected: false })));
    setSelectedNotes([]); setSelectedMusicStyles([]); setDjNotes(""); setBlacklist("");
    setCateringNotes(""); setCateringDrinks(false); setCateringHotMealNoTable(false); setCateringHotMealNoTableQty(0);
    setSelectedEvents([]); setCustomRepasEvents([]); setCustomMusiqueEvents([]); setEventNotes(""); setEventOrder([]);
    setBasePrice(0); setFraisMandat(0); setCachetArtiste(0); setPackSonorisation(false); setPackLumiere(false); setInvoiceNumber(""); setArtisteInvoiceNumber(""); setDiscountAmount(0); setCustomDepositAmount(0); setNoDepositRequired(false);
    setOptionsTarifNotes(""); setSelectedRIB(""); setDepositPaid(false); setDepositPaymentMethod(""); setBackgroundMusicAperitif("");
    setHasLimiteurSon(false); setHasDetecteurFumee(false); setHasNoLimiteurNiDetecteur(false);
    setHypnosisProgram(defaultHypnosisProgram);
    setTechnicianContact({ name: "", email: "", phone: "" });
    setCgvText("");
    const artistDefaultKey = getArtistDefaultTemplateKey(cgvTemplates);
    if (contractMode === 'mandataire' && artistDefaultKey && cgvTemplates[artistDefaultKey]) {
      setArtisteCgvText(cgvTemplates[artistDefaultKey].content || "");
    } else {
      setArtisteCgvText(companySettings.artiste_cgv_text || defaultArtistCgv);
    }
    setEditingContract(null); setGeneratedContract(null);
    toast.success("Formulaire réinitialisé !");
  };

  useEffect(() => {
    if (clientInfo.event_date && (!clientInfo.setup_date || clientInfo.setup_date === calculateSetupDate(clientInfo.event_date))) {
      setClientInfo(prev => ({ ...prev, setup_date: calculateSetupDate(prev.event_date) }));
    }
  }, [clientInfo.event_date]);

  // ═══════════════════════════════════════════════════
  // SAVE / LOAD CONTRACT
  // ═══════════════════════════════════════════════════

  const saveContractDraft = async (switchToPreview = true) => {
    if (!clientInfo.name || !clientInfo.email) {
      toast.error("Nom du client et email sont requis pour sauvegarder un brouillon.");
      return;
    }

    const contract = {
      client_info: {
        name: clientInfo.name, email: clientInfo.email, phone: clientInfo.phone,
        address: clientInfo.address, company: clientInfo.company, event_type: clientInfo.event_type,
        event_date: clientInfo.event_date, event_location: clientInfo.event_location,
        guest_count: clientInfo.guest_count, setup_date: clientInfo.setup_date,
        setup_time: clientInfo.setup_time, start_time: clientInfo.start_time,
        end_time: clientInfo.unlimited_time ? null : clientInfo.end_time,
        unlimited_time: clientInfo.unlimited_time, phone2: clientInfo.phone2,
        custom_event_type: clientInfo.custom_event_type, event_note: clientInfo.event_note
      },
      dj_profile: selectedDjProfile,
      dj_profile_data: getProfileData(selectedDjProfile),
      contract_mode: contractMode,
      base_price: basePrice || 0,
      frais_mandat: fraisMandat || 0,
      cachet_artiste: cachetArtiste || 0,
      pack_sonorisation: packSonorisation || false,
      pack_lumiere: packLumiere || false,
      selected_options: selectedOptions.filter(opt => opt.selected),
      options_tarif_notes: optionsTarifNotes,
      discount_amount: discountAmount || 0,
      invoice_number: invoiceNumber || "",
      custom_deposit_amount: customDepositAmount || 0,
      no_deposit_required: noDepositRequired || false,
      selected_rib: selectedRIB || "",
      deposit_paid: depositPaid || false,
      deposit_payment_method: depositPaymentMethod || "",
      deposit_paid_date: depositPaidDate || "",
      has_limiteur_son: hasLimiteurSon || false,
      has_detecteur_fumee: hasDetecteurFumee || false,
      has_no_limiteur_ni_detecteur: hasNoLimiteurNiDetecteur || false,
      has_wifi: hasWifi || false,
      has_4g_5g: has4g5g || false,
      selected_notes: selectedNotes,
      selected_pdf_notes: selectedPdfNotes,
      predefined_notes: predefinedNotes,
      selected_music_styles: selectedMusicStyles,
      dj_notes: djNotes,
      blacklist: blacklist,
      catering_notes: cateringNotes,
      catering_drinks: cateringDrinks,
      catering_hot_meal_no_table: cateringHotMealNoTable,
      catering_hot_meal_no_table_qty: cateringHotMealNoTableQty,
      background_music_aperitif: backgroundMusicAperitif,
      selected_events: selectedEvents,
      custom_repas_events: customRepasEvents,
      custom_musique_events: customMusiqueEvents,
      event_notes: eventNotes,
      event_order: eventOrder,
      hypnosis_program: hypnosisProgram,
      technician_contact: technicianContact,
      cgv_text: cgvText,
      artiste_cgv_text: artisteCgvText,
      status: "draft",
      draft_saved_at: new Date().toISOString()
    };

    try {
      if (editingContract) {
        const response = await axios.put(`${API}/contracts2/${editingContract.id}`, contract);
        const updatedContract = response.data;
        setGeneratedContract(updatedContract);
        setContracts(prev => prev.map(c => c.id === editingContract.id ? updatedContract : c));
        toast.success("Brouillon de contrat mis à jour avec succès !");
        if (switchToPreview === true) setActiveTab("preview");
      } else {
        const response = await axios.post(`${API}/contracts2`, contract);
        const newContract = response.data;
        setGeneratedContract(newContract);
        setContracts(prev => [newContract, ...prev]);
        setEditingContract(newContract);
        toast.success("Brouillon de contrat sauvegardé avec succès !");
        if (switchToPreview === true) setActiveTab("preview");
      }
    } catch (error) {
      console.error('Error saving contract draft:', error);
      toast.error("Erreur lors de la sauvegarde du brouillon");
    }
  };

  const loadContract = (contract) => {
    setSelectedDjProfile(contract.dj_profile || "");
    setClientInfo({
      name: contract.client_info.name || "", company: contract.client_info.company || "",
      address: contract.client_info.address || "", phone: contract.client_info.phone || "",
      email: contract.client_info.email || "", event_date: contract.client_info.event_date || "",
      event_location: contract.client_info.event_location || "", event_type: contract.client_info.event_type || "",
      custom_event_type: contract.client_info.custom_event_type || "", event_note: contract.client_info.event_note || "",
      setup_date: contract.client_info.setup_date || "", setup_time: contract.client_info.setup_time || "À définir",
      start_time: contract.client_info.start_time || "", end_time: contract.client_info.end_time || "",
      unlimited_time: contract.client_info.unlimited_time || false, phone2: contract.client_info.phone2 || "",
      guest_count: contract.client_info.guest_count || ""
    });
    
    const contractSelectedOptionsIds = (contract.selected_options || []).filter(opt => opt.selected).map(opt => opt.id);
    setSelectedOptions(availableOptions.map(option => ({ ...option, selected: contractSelectedOptionsIds.includes(option.id) })));
    
    setDiscountAmount(contract.discount_amount || 0);
    setInvoiceNumber(contract.invoice_number || "");
    setArtisteInvoiceNumber(contract.artiste_invoice_number || "");
    setCustomDepositAmount(contract.custom_deposit_amount || 0);
    setNoDepositRequired(contract.no_deposit_required || false);
    setSelectedRIB(contract.selected_rib || "");
    setDepositPaid(contract.deposit_paid || false);
    setDepositPaymentMethod(contract.deposit_payment_method || "");
    setDepositPaidDate(contract.deposit_paid_date || "");
    setBasePrice(contract.base_price || 0);
    setContractMode(contract.contract_mode || 'mandataire');
    setFraisMandat(contract.frais_mandat || 0);
    setCachetArtiste(contract.cachet_artiste || 0);
    setPackSonorisation(contract.pack_sonorisation || false);
    setPackLumiere(contract.pack_lumiere || false);
    setOptionsTarifNotes(contract.options_tarif_notes || "");
    setHasLimiteurSon(contract.has_limiteur_son || false);
    setHasDetecteurFumee(contract.has_detecteur_fumee || false);
    setHasNoLimiteurNiDetecteur(contract.has_no_limiteur_ni_detecteur || false);
    setHasWifi(contract.has_wifi || false);
    setHas4g5g(contract.has_4g_5g || false);
    setSelectedPdfNotes(contract.selected_pdf_notes || []);
    setSelectedNotes(contract.selected_notes || []);
    setSelectedMusicStyles(contract.selected_music_styles || []);
    setDjNotes(contract.dj_notes || "");
    setBlacklist(contract.blacklist || "");
    setCateringNotes(contract.catering_notes || "");
    setCateringDrinks(contract.catering_drinks || false);
    setCateringHotMealNoTable(contract.catering_hot_meal_no_table || false);
    setCateringHotMealNoTableQty(contract.catering_hot_meal_no_table_qty || 0);
    setBackgroundMusicAperitif(contract.background_music_aperitif || "");
    setSelectedEvents(contract.selected_events || []);
    setCustomRepasEvents(contract.custom_repas_events || []);
    setCustomMusiqueEvents(contract.custom_musique_events || []);
    setEventNotes(contract.event_notes || "");
    setEventOrder(contract.event_order || []);
    setHypnosisProgram(contract.hypnosis_program || defaultHypnosisProgram);
    setTechnicianContact(contract.technician_contact || { name: "", email: "", phone: "" });
    setCgvText(contract.cgv_text || "");
    setArtisteCgvText(contract.artiste_cgv_text || defaultArtistCgv);
    setEditingContract(contract);
    setActiveTab("create");
    toast.success("Contrat chargé pour modification");
  };

  const duplicateContract = (contract) => {
    setSelectedDjProfile(contract.dj_profile || "");
    setClientInfo({
      name: contract.client_info?.name || "", company: contract.client_info?.company || "",
      address: contract.client_info?.address || "", phone: contract.client_info?.phone || "",
      email: contract.client_info?.email || "", event_date: contract.client_info?.event_date || "",
      event_location: contract.client_info?.event_location || "", event_type: contract.client_info?.event_type || "",
      custom_event_type: contract.client_info?.custom_event_type || "", event_note: contract.client_info?.event_note || "",
      setup_date: contract.client_info?.setup_date || "", setup_time: contract.client_info?.setup_time || "À définir",
      start_time: contract.client_info?.start_time || "", end_time: contract.client_info?.end_time || "",
      unlimited_time: contract.client_info?.unlimited_time || false, phone2: contract.client_info?.phone2 || "",
      guest_count: contract.client_info?.guest_count || ""
    });
    
    const contractSelectedOptionsIds = (contract.selected_options || []).filter(opt => opt.selected).map(opt => opt.id);
    setSelectedOptions(availableOptions.map(option => ({ ...option, selected: contractSelectedOptionsIds.includes(option.id) })));
    
    setDiscountAmount(contract.discount_amount || 0);
    setInvoiceNumber(""); 
    setArtisteInvoiceNumber(""); 
    setCustomDepositAmount(contract.custom_deposit_amount || 0);
    setNoDepositRequired(contract.no_deposit_required || false);
    setSelectedRIB(contract.selected_rib || "");
    setDepositPaid(false); 
    setDepositPaymentMethod("");
    setDepositPaidDate("");
    setBasePrice(contract.base_price || 0);
    setContractMode(contract.contract_mode || 'mandataire');
    setFraisMandat(contract.frais_mandat || 0);
    setCachetArtiste(contract.cachet_artiste || 0);
    setPackSonorisation(contract.pack_sonorisation || false);
    setPackLumiere(contract.pack_lumiere || false);
    setOptionsTarifNotes(contract.options_tarif_notes || "");
    setHasLimiteurSon(contract.has_limiteur_son || false);
    setHasDetecteurFumee(contract.has_detecteur_fumee || false);
    setHasNoLimiteurNiDetecteur(contract.has_no_limiteur_ni_detecteur || false);
    setHasWifi(contract.has_wifi || false);
    setHas4g5g(contract.has_4g_5g || false);
    setSelectedPdfNotes(contract.selected_pdf_notes || []);
    setSelectedNotes(contract.selected_notes || []);
    setSelectedMusicStyles(contract.selected_music_styles || []);
    setDjNotes(contract.dj_notes || "");
    setBlacklist(contract.blacklist || "");
    setCateringNotes(contract.catering_notes || "");
    setCateringDrinks(contract.catering_drinks || false);
    setCateringHotMealNoTable(contract.catering_hot_meal_no_table || false);
    setCateringHotMealNoTableQty(contract.catering_hot_meal_no_table_qty || 0);
    setBackgroundMusicAperitif(contract.background_music_aperitif || "");
    setSelectedEvents(contract.selected_events || []);
    setCustomRepasEvents(contract.custom_repas_events || []);
    setCustomMusiqueEvents(contract.custom_musique_events || []);
    setEventNotes(contract.event_notes || "");
    setEventOrder(contract.event_order || []);
    setHypnosisProgram(contract.hypnosis_program || defaultHypnosisProgram);
    setTechnicianContact(contract.technician_contact || { name: "", email: "", phone: "" });
    setCgvText(contract.cgv_text || "");
    setArtisteCgvText(contract.artiste_cgv_text || defaultArtistCgv);
    setEditingContract(null); 
    setGeneratedContract(null); 
    setActiveTab("create");
    toast.success("Contrat dupliqué ! Modifiez-le puis enregistrez-le dans l'onglet de création.");
  };

  // ═══════════════════════════════════════════════════
  // PDF / EMAIL ACTIONS
  // ═══════════════════════════════════════════════════

  const handlePrintContract = (contract) => {
    generateContractAndGuide(contract, generateContractHTMLLocal, loadSignatureImages, selectedPdfNotes, apiService);
  };

  const handlePreviewContract = (contract) => {
    const isMandat = contract.contract_mode === 'mandataire';
    const isEntreprise = contract.contract_mode === 'entreprise';
    
    const clientName = contract.client_info?.name || 'Client';
    const docs = [];
    
    if (isMandat) {
      docs.push({
        label: "Mandat d'encaissement R'Key Prod",
        html: generateMandatHTML(contract, companySettings)
      });
      docs.push({
        label: "Contrat d'Engagement Artiste DJ",
        html: generateArtisteHTML(contract, resolveProfile)
      });
    } else if (isEntreprise) {
      docs.push({
        label: "Contrat de Prestation (Entreprise)",
        html: generateEntrepriseHTML(contract, companySettings)
      });
    } else {
      docs.push({
        label: "Contrat Administratif",
        html: generateContractHTMLLocal(contract, null, signatureImages)
      });
    }
    
    setPreviewDoc({
      title: `Contrat de ${clientName}`,
      contract,
      documents: docs,
      activeDocIndex: 0
    });
  };

  const handleExportSpecificPDF = async (contract, docLabel) => {
    try {
      const isMandatDoc = docLabel.includes("Mandat");
      const isArtisteDoc = docLabel.includes("Artiste") || docLabel.includes("Engagement");
      const isEntrepriseDoc = docLabel.includes("Entreprise") || docLabel.includes("Prestation");
      
      let html;
      let filename;
      const cName = (contract.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = getFormattedEventDate(contract);
      
      if (isMandatDoc) {
        html = generateMandatHTML(contract, companySettings);
        filename = `Contrat_Mandat_RKeyProd_${cName}_${dateStr}.pdf`;
      } else if (isArtisteDoc) {
        html = generateArtisteHTML(contract, resolveProfile);
        const artisteP = resolveProfile(contract);
        const artistName = (artisteP.nom_artistique || artisteP.nom_complet || 'Artiste').replace(/[^a-zA-Z0-9]/g, '_');
        filename = `Contrat_Artiste_${artistName}_${cName}_${dateStr}.pdf`;
      } else if (isEntrepriseDoc) {
        html = generateEntrepriseHTML(contract, companySettings);
        filename = `Contrat_Prestation_RKeyProd_${cName}_${dateStr}.pdf`;
      } else {
        html = generateContractHTMLLocal(contract, null, signatureImages);
        filename = `Contrat_RKEYPROD_${cName}_${dateStr}.pdf`;
      }
      
      await exportHTMLToPDF(html, filename);
    } catch (error) {
      console.error("Erreur d'exportation PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  // Export PDF pour Document 1 (Mandat R'KEY PROD)
  const handleExportMandatPDF = async () => {
    const data = buildCurrentContractData();
    const html = generateMandatHTML(data, companySettings);
    await exportHTMLToPDF(html, `Contrat_Mandat_RKeyProd_${(data.client_info.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}_${getFormattedEventDate(data)}.pdf`);
  };

  // Export PDF pour Document 2 (Engagement Artiste DJ)
  const handleExportArtistePDF = async () => {
    const data = buildCurrentContractData();
    const html = generateArtisteHTML(data, resolveProfile);
    const artisteP = resolveProfile(data);
    const artistName = (artisteP.nom_artistique || artisteP.nom_complet || 'Artiste').replace(/[^a-zA-Z0-9]/g, '_');
    await exportHTMLToPDF(html, `Contrat_Artiste_${artistName}_${(data.client_info.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}_${getFormattedEventDate(data)}.pdf`);
  };

  // Export PDF pour Mode Entreprise (1 seul contrat global)
  const handleExportEntreprisePDF = async () => {
    const data = buildCurrentContractData();
    const html = generateEntrepriseHTML(data, companySettings);
    await exportHTMLToPDF(html, `Contrat_Prestation_RKeyProd_${(data.client_info.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}_${getFormattedEventDate(data)}.pdf`);
  };


  // Fonction générique d'export HTML → PDF
  const exportHTMLToPDF = async (htmlContent, fileName) => {
    try {
      toast.info("Génération PDF en cours...", { duration: 3000 });
      if (!window.jspdf || !window.jspdf.jsPDF) { toast.error("jsPDF non disponible."); return; }
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:white;padding:20px;';
      tempContainer.innerHTML = htmlContent;
      document.body.appendChild(tempContainer);
      await new Promise(r => setTimeout(r, 1500));
      const { default: html2canvas } = await import('html2canvas');
      const allPages = tempContainer.querySelectorAll('[id^="pdf-page-"]');
      const pageIds = Array.from(allPages).map(el => el.id).sort((a, b) => {
        const order = id => id === 'pdf-page-1' ? 1 : id === 'pdf-page-cgv' ? 999 : 2;
        return order(a) - order(b);
      });
      let added = false;
      for (const pageId of pageIds) {
        const el = tempContainer.querySelector(`#${pageId}`);
        if (!el || !el.innerHTML.trim()) continue;
        if (added) pdf.addPage();
        const canvas = await html2canvas(el, { scale: 1.4, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: 794, logging: false });
        const imgW = 190, imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        pdf.addImage(imgData, 'JPEG', 10, 10, imgW, Math.min(imgH, 277), undefined, 'FAST');
        added = true;
      }
      document.body.removeChild(tempContainer);
      pdf.save(fileName);
      toast.success("PDF téléchargé !");
    } catch (error) {
      console.error('Erreur PDF:', error);
      toast.error("Erreur : " + error.message);
    }
  };

  const openContractEmailModal = (contractDataOrId, selectedTab = null) => {
    let contractData = contractDataOrId;
    if (!contractData.client_info) {
      contractData = { ...contractData, ...buildCurrentContractData() };
    }
    
    let contractHTML = "";
    let contractHTMLs = null;
    const isMandat = contractData.contract_mode === 'mandataire' && !contractData.is_dirigeant;
    const isEntreprise = contractData.contract_mode === 'entreprise' && !contractData.is_dirigeant;

    if (isMandat) {
        if (selectedTab === 'mandat') {
            contractHTML = generateMandatHTML(contractData, companySettings);
            contractHTMLs = [
              {
                 html: contractHTML,
                 filename: `Contrat_Mandat_RKeyProd_${(contractData.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              }
            ];
        } else if (selectedTab === 'artiste') {
            contractHTML = generateArtisteHTML(contractData, resolveProfile);
            const profile = resolveProfile(contractData);
            const artistName = (profile.nom_artistique || profile.nom_complet || 'Artiste').replace(/[^a-zA-Z0-9]/g, '_');
            contractHTMLs = [
              {
                 html: contractHTML,
                 filename: `Contrat_Artiste_${artistName}_${(contractData.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              }
            ];
        } else {
            contractHTMLs = [
              {
                 html: generateMandatHTML(contractData, companySettings),
                 filename: `Contrat_Mandat_RKeyProd_${(contractData.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              },
              {
                 html: generateArtisteHTML(contractData, resolveProfile),
                 filename: `Contrat_Artiste_${(contractData.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              }
            ];
            // Keep a fallback combined html just in case
            contractHTML = contractHTMLs[0].html + "\n<div class='page-break' style='page-break-after: always; height: 0; min-height: 0; margin: 0; padding: 0;'></div>\n" + contractHTMLs[1].html;
        }
    } else if (isEntreprise) {
        contractHTML = generateEntrepriseHTML(contractData, companySettings);
    } else {
        contractHTML = generateContractHTMLLocal(contractData, null, signatureImages);
    }

    navigate('/contracts2/send-email', { state: { contractData, contractHTML, contractHTMLs } });
  };

  const handleSignatureValidated = (signatureData) => {
    if (generatedContract) {
      printContractWithSignature(generatedContract, generateContractHTMLLocal);
    }
    setShowSignaturePad(false);
  };

  // ═══════════════════════════════════════════════════
  // BUILD CONTRACT DATA OBJECT (for preview/export)
  // ═══════════════════════════════════════════════════

  const buildCurrentContractData = () => ({
    client_info: clientInfo,
    dj_profile: selectedDjProfile,
    selected_options: selectedOptions.filter(opt => opt.selected),
    options_tarif_notes: optionsTarifNotes,
    selected_notes: selectedNotes,
    predefined_notes: predefinedNotes,
    selected_music_styles: selectedMusicStyles,
    dj_notes: djNotes,
    blacklist: blacklist,
    catering_notes: cateringNotes,
    catering_drinks: cateringDrinks,
    catering_hot_meal_no_table: cateringHotMealNoTable,
    catering_hot_meal_no_table_qty: cateringHotMealNoTableQty,
    selected_events: selectedEvents,
    custom_repas_events: customRepasEvents,
    custom_musique_events: customMusiqueEvents,
    event_notes: eventNotes,
    event_order: eventOrder,
    background_music_aperitif: backgroundMusicAperitif,
    hypnosis_program: hypnosisProgram,
    technician_contact: technicianContact,
    cgv_text: cgvText,
    contract_mode: contractMode,
    base_price: basePrice,
    frais_mandat: fraisMandat,
    cachet_artiste: cachetArtiste,
    pack_sonorisation: packSonorisation,
    pack_lumiere: packLumiere,
    discount_amount: discountAmount,
    custom_deposit_amount: customDepositAmount,
    no_deposit_required: noDepositRequired,
    selected_rib: selectedRIB,
    deposit_paid: depositPaid,
    deposit_payment_method: depositPaymentMethod,
    deposit_paid_date: depositPaidDate,
    has_limiteur_son: hasLimiteurSon,
    has_detecteur_fumee: hasDetecteurFumee,
    has_no_limiteur_ni_detecteur: hasNoLimiteurNiDetecteur,
    has_wifi: hasWifi,
    has_4g_5g: has4g5g,
    selected_pdf_notes: selectedPdfNotes,
    invoice_number: invoiceNumber,
    artiste_invoice_number: artisteInvoiceNumber,
    artiste_cgv_text: artisteCgvText
  });

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  if (showConfiguration) {
    return (
      <ConfigurationPage
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        predefinedNotes={predefinedNotes}
        setPredefinedNotes={setPredefinedNotes}
        pdfNotes={pdfNotes}
        setPdfNotes={setPdfNotes}
        cgvTemplates={cgvTemplates}
        setCgvTemplates={setCgvTemplates}
        apiService={apiService}
        setShowConfiguration={setShowConfiguration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      
      {/* Signature Pad Modal */}
      <SignaturePadModal
        showSignaturePad={showSignaturePad}
        setShowSignaturePad={setShowSignaturePad}
        signaturePadRef={signaturePadRef}
        setSignaturePadRef={setSignaturePadRef}
        setClientSignature={setClientSignature}
        onSignatureValidated={handleSignatureValidated}
      />

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                <FileSignature className="h-6 w-6 text-amber-600" />
                <span>Contrats</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">Gestion Agence / Mandataire</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                {contracts.length} contrat{contracts.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="create" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>{editingContract ? 'Modifier' : 'Créer'}</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Historique</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════ */}
          {/* CREATE CONTRACT TAB                            */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="create">
            <div className="mb-6 flex justify-center space-x-2">
              <Button onClick={() => setActiveTab("history")} variant="outline" className="px-4 py-3 text-sm flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" /> Retour au Sommaire
              </Button>
              <Button onClick={resetForm} variant="outline" className="px-4 py-3 text-sm">Reset</Button>
              <Button onClick={() => {
                // Pré-remplir un mariage test
                setClientInfo({
                  name: "Marie Dupont", company: "", address: "12 rue des Lilas, 67000 Strasbourg",
                  phone: "06 12 34 56 78", phone2: "", email: "marie.dupont@test.fr",
                  event_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
                  event_location: "Château de Pourtalès, Strasbourg",
                  event_type: "Mariage", custom_event_type: "", event_note: "Thème champêtre",
                  setup_date: new Date(Date.now() + 89 * 86400000).toISOString().split('T')[0],
                  setup_time: "14h00", start_time: "18:00", end_time: "04:00",
                  unlimited_time: false, guest_count: "150"
                });
                setBasePrice(1200);
                setFraisMandat(500);
                setCachetArtiste(800);
                setDiscountAmount(0);
                setInvoiceNumber("C2-" + new Date().getFullYear() + "-001");
                toast.success("Données de test Mariage chargées !");
              }} variant="outline" className="px-4 py-3 text-sm border-amber-400 text-amber-700 hover:bg-amber-50" data-testid="test-fill-btn">Test Mariage</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* DJ Selection */}
              <div className="lg:col-span-2 mb-4">
                <div className="flex items-center gap-4">
                  <Label className="text-slate-700 font-semibold whitespace-nowrap">Artiste :</Label>
                  <select
                    value={selectedDjProfile}
                    onChange={(e) => setSelectedDjProfile(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                    data-testid="dj-profile-select"
                  >
                    <option value="">-- Sélectionner un artiste --</option>
                    {Object.entries(djProfiles)
                      .sort(([,a], [,b]) => {
                        const aDir = (a.statut_artiste === 'dirigeant' || a.titre?.includes('Gérant')) ? 0 : 1;
                        const bDir = (b.statut_artiste === 'dirigeant' || b.titre?.includes('Gérant')) ? 0 : 1;
                        if (aDir !== bDir) return aDir - bDir;
                        const nameA = a.nom_artistique || a.name || "";
                        const nameB = b.nom_artistique || b.name || "";
                        return nameA.localeCompare(nameB);
                      })
                      .map(([key, profile]) => (
                      <option key={key} value={key}>
                        {profile.nom_artistique || profile.name} {profile.statut_artiste === 'dirigeant' ? '(Dirigeant)' : '(Freelance)'}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDjProfile && djProfiles[selectedDjProfile] && (() => {
                  const p = djProfiles[selectedDjProfile];
                  const hasData = p.nom_complet || p.email || p.phone || p.siret || p.address;
                  return hasData ? (
                    <div className="mt-3 ml-[70px] bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs" data-testid="profile-preview-card">
                      {p.nom_complet && <div><span className="text-slate-400 block">Nom complet</span><span className="text-slate-700 font-medium">{p.nom_complet}</span></div>}
                      {p.email && <div><span className="text-slate-400 block">Email</span><span className="text-slate-700 font-medium">{p.email}</span></div>}
                      {p.phone && <div><span className="text-slate-400 block">Téléphone</span><span className="text-slate-700 font-medium">{p.phone}</span></div>}
                      {p.siret && <div><span className="text-slate-400 block">SIRET</span><span className="text-slate-700 font-medium">{p.siret}</span></div>}
                      {p.address && <div className="col-span-2"><span className="text-slate-400 block">Adresse</span><span className="text-slate-700 font-medium">{p.address}</span></div>}
                    </div>
                  ) : (
                    <p className="mt-2 ml-[70px] text-xs text-amber-600">Aucune information privée renseignée pour cet artiste. Complétez le profil dans "Profils Artistes".</p>
                  );
                })()}
              </div>

              {/* Mode Toggle: Mandataire / Entreprise (visible uniquement si pas dirigeant) */}
              {!isDirigeant() && (
              <div className="lg:col-span-2 mb-2">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Label className="text-slate-700 font-semibold text-sm">Mode de facturation :</Label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setContractMode('mandataire')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${contractMode === 'mandataire' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                      data-testid="mode-mandataire-btn"
                    >
                      Mandataire
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractMode('entreprise')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${contractMode === 'entreprise' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                      data-testid="mode-entreprise-btn"
                    >
                      Entreprise
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">{contractMode === 'mandataire' ? '2 contrats séparés (Mandat + Artiste)' : '1 seul contrat global (R\'KEY PROD)'}</span>
                </div>
              </div>
              )}

              {/* Client Information */}
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-slate-800">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>Informations Client</span>
                    </div>
                    <FormSubmissionsSelector onSelect={handleSubmissionSelect} buttonLabel="Soumissions" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSubmission && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1 relative" data-testid="contract-selected-submission">
                      <button
                        onClick={handleClearSubmission}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Annuler l'import"
                        data-testid="contract-clear-submission-btn"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <p className="font-semibold text-blue-700 pr-6">Contact importé : {selectedSubmission.nom || 'Anonyme'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-blue-600">
                        {selectedSubmission.email && <span>{selectedSubmission.email}</span>}
                        {selectedSubmission.telephone && <span>{selectedSubmission.telephone}</span>}
                        {selectedSubmission.date_evenement && <span>{formatDateDisplay(selectedSubmission.date_evenement)}</span>}
                      </div>
                    </div>
                  )}

                  {/* Rechercher/Importer un Client existant du CRM */}
                  <div id="crm-search-container" className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="crm-search" className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-550" /> Rechercher un client du CRM (Pré-remplissage automatique)
                      </Label>
                      {searchCrmQuery && (
                        <button 
                          type="button"
                          onClick={() => { setSearchCrmQuery(""); setShowCrmDropdown(false); }}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="crm-search"
                        value={searchCrmQuery}
                        onChange={(e) => {
                          setSearchCrmQuery(e.target.value);
                          setShowCrmDropdown(true);
                        }}
                        onFocus={() => setShowCrmDropdown(true)}
                        placeholder="Rechercher par nom, email, entreprise, téléphone..."
                        className="bg-white border-slate-300 focus:border-blue-500 pl-9"
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      
                      {showCrmDropdown && searchCrmQuery.trim() !== "" && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {filteredCrmCompanies.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400 text-center">
                              Aucun client trouvé dans le CRM pour "{searchCrmQuery}"
                            </div>
                          ) : (
                            filteredCrmCompanies.map(c => {
                              const isParticulier = c.type_client === "Particulier";
                              const provenance = getCompanyProvenance(c);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSelectCrmCompany(c)}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm select-none shrink-0">
                                        {isParticulier ? "👤" : c.type_client === "Association" ? "🤝" : "🏢"}
                                      </span>
                                      <span className="font-semibold text-slate-800 text-sm truncate">{c.nom}</span>
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal select-none bg-slate-100 border-slate-200">
                                        {c.type_client}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-1">
                                      {c.email && <span className="truncate">{c.email}</span>}
                                      {c.telephone && <span>• {c.telephone}</span>}
                                      {c.adresse && <span className="truncate">• {c.adresse}</span>}
                                    </div>
                                  </div>
                                  {provenance && (
                                    <Badge className={`text-[10px] uppercase font-semibold select-none shrink-0 ${
                                      provenance === "location" ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200" : "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200"
                                    }`}>
                                      {provenance === "location" ? "📦 Loc" : "🎵 Prest"}
                                    </Badge>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700">Nom complet *</Label>
                      <Input id="name" value={clientInfo.name} onChange={(e) => handleClientInfoChange("name", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-slate-700 flex items-center space-x-1"><Building className="h-4 w-4" /><span>Entreprise (optionnel)</span></Label>
                      <Input id="company" value={clientInfo.company} onChange={(e) => handleClientInfoChange("company", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 flex items-center space-x-1"><Mail className="h-4 w-4" /><span>Email *</span></Label>
                      <Input id="email" type="email" value={clientInfo.email} onChange={(e) => handleClientInfoChange("email", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 flex items-center space-x-1"><Phone className="h-4 w-4" /><span>Téléphone</span></Label>
                      <Input id="phone" value={clientInfo.phone} onChange={(e) => handleClientInfoChange("phone", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-700">Adresse complète</Label>
                    <Textarea id="address" value={clientInfo.address} onChange={(e) => handleClientInfoChange("address", e.target.value)} rows={2} className="border-slate-300 focus:border-blue-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event_type" className="text-slate-700">Type d'événement</Label>
                      <Select value={clientInfo.event_type} onValueChange={(value) => { handleClientInfoChange("event_type", value); if (value !== "custom") { handleClientInfoChange("custom_event_type", ""); } }}>
                        <SelectTrigger className="border-slate-300 focus:border-blue-500"><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                        <SelectContent>
                          {eventTypesList.map((type, index) => (<SelectItem key={`event-${index}-${type}`} value={type}>{type}</SelectItem>))}
                          <SelectItem key="custom" value="custom">Type personnalisé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event_note" className="text-slate-700">Note événement <span className="text-slate-400 text-xs">(optionnel, 100 car. max)</span></Label>
                      <Input id="event_note" value={clientInfo.event_note} onChange={(e) => handleClientInfoChange("event_note", e.target.value.slice(0, 100))} className="border-slate-300 focus:border-blue-500" maxLength={100} />
                    </div>
                  </div>
                  
                  {clientInfo.event_type === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_event_type" className="text-slate-700">Type d'événement personnalisé</Label>
                      <Input id="custom_event_type" value={clientInfo.custom_event_type} onChange={(e) => handleClientInfoChange("custom_event_type", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event_date" className="text-slate-700 flex items-center space-x-1"><Calendar className="h-4 w-4" /><span>Date de l'événement *</span></Label>
                      <Input id="event_date" type="date" value={clientInfo.event_date} onChange={(e) => handleClientInfoChange("event_date", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event_location" className="text-slate-700 flex items-center space-x-1"><MapPin className="h-4 w-4" /><span>Lieu de l'événement *</span></Label>
                      <Input id="event_location" value={clientInfo.event_location} onChange={(e) => handleClientInfoChange("event_location", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-slate-800">Informations Supplémentaires</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest_count" className="text-slate-700">Nombre d'invités attendu</Label>
                        <Input id="guest_count" type="text" value={clientInfo.guest_count} onChange={(e) => handleClientInfoChange("guest_count", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone2" className="text-slate-700">Téléphone 2 (facultatif)</Label>
                      <Input id="phone2" value={clientInfo.phone2} onChange={(e) => handleClientInfoChange("phone2", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                    </div>

                    {/* Planning de la prestation */}
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800">Planning de la prestation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="setup_date" className="text-slate-700">Date d'installation</Label>
                          <Input id="setup_date" type="date" value={clientInfo.setup_date} onChange={(e) => handleClientInfoChange("setup_date", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="setup_time" className="text-slate-700">Heure d'installation</Label>
                          <Input id="setup_time" type="text" value={clientInfo.setup_time} onChange={(e) => handleClientInfoChange("setup_time", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                          <small className="text-slate-500 text-xs">Par exemple: 14h00, À définir, etc.</small>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_time" className="text-slate-700">Début de prestation</Label>
                          <Input id="start_time" type="time" value={clientInfo.start_time} onChange={(e) => handleClientInfoChange("start_time", e.target.value)} className="border-slate-300 focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_time" className="text-slate-700">Fin de prestation</Label>
                          <div className="flex items-center space-x-2">
                            <Input id="end_time" type="time" value={clientInfo.end_time} onChange={(e) => handleClientInfoChange("end_time", e.target.value)} className="border-slate-300 focus:border-blue-500" disabled={clientInfo.unlimited_time} />
                            <div className="flex items-center space-x-1">
                              <Checkbox id="unlimited_time" checked={clientInfo.unlimited_time} onCheckedChange={(checked) => handleClientInfoChange("unlimited_time", checked)} />
                              <Label htmlFor="unlimited_time" className="text-sm">Illimité</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Catering - Stacked Minimalist Design */}
                    <div className="pt-5 border-t border-slate-200/80 space-y-4">
                      <Label className="text-slate-700 font-semibold block text-base">Catering (Restauration Artiste)</Label>

                      <div className="space-y-4">
                        {/* Line 1: Plat chaud hors table with Stepper */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-3">
                          <label htmlFor="cateringHotMealNoTableInput" className="text-sm font-medium text-slate-700 cursor-pointer select-none flex items-center gap-3">
                            <Checkbox 
                              id="cateringHotMealNoTableInput" 
                              checked={cateringHotMealNoTable} 
                              onCheckedChange={(checked) => {
                                setCateringHotMealNoTable(checked);
                                if (checked && (!cateringHotMealNoTableQty || Number(cateringHotMealNoTableQty) === 0)) {
                                  setCateringHotMealNoTableQty(1);
                                } else if (!checked) {
                                  setCateringHotMealNoTableQty(0);
                                }
                              }} 
                            />
                            <span className="text-slate-800">Plat chaud (pas de place à table)</span>
                          </label>

                          {cateringHotMealNoTable && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500 font-medium">Quantité :</span>
                              <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextQty = Math.max(0, Number(cateringHotMealNoTableQty) - 1);
                                    setCateringHotMealNoTableQty(nextQty);
                                    if (nextQty === 0) {
                                      setCateringHotMealNoTable(false);
                                    }
                                  }}
                                  className="h-8 w-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all text-lg font-semibold border-r border-slate-200"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input 
                                  type="number"
                                  min="0"
                                  value={cateringHotMealNoTableQty}
                                  onChange={e => {
                                    const valStr = e.target.value;
                                    const valNum = valStr === '' ? 0 : (parseInt(valStr, 10) || 0);
                                    setCateringHotMealNoTableQty(valNum);
                                    if (valNum > 0) {
                                      setCateringHotMealNoTable(true);
                                    } else {
                                      setCateringHotMealNoTable(false);
                                    }
                                  }}
                                  className="w-10 h-8 text-center text-sm font-bold border-0 focus:outline-none focus:ring-0 text-slate-800 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCateringHotMealNoTableQty(Number(cateringHotMealNoTableQty) + 1);
                                  }}
                                  className="h-8 w-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all text-lg font-semibold border-l border-slate-200"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Line 2: Boissons comprises */}
                        <div className="flex items-center py-2 border-b border-slate-100">
                          <label htmlFor="cateringDrinksInput" className="text-sm font-medium text-slate-700 cursor-pointer select-none flex items-center gap-3">
                            <Checkbox 
                              id="cateringDrinksInput" 
                              checked={cateringDrinks} 
                              onCheckedChange={setCateringDrinks} 
                            />
                            <span className="text-slate-800">Boissons comprises (softs et boissons chaudes)</span>
                          </label>
                        </div>

                        {/* Line 3: Conditions de repas / Notes - Champ libre */}
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor="cateringNotesInput" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conditions de repas / Remarques</Label>
                          <Input 
                            id="cateringNotesInput"
                            value={cateringNotes} 
                            onChange={(e) => setCateringNotes(e.target.value)} 
                            placeholder="Ex: Plat chaud, dessert, sans porc, etc." 
                            className="border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg w-full text-slate-800 h-10 font-normal text-sm" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section Programme Show Hypnose */}
              {clientInfo.event_type === "Show Hypnose" && (
                <div className="lg:col-span-2">
                  <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-center text-xl font-bold flex items-center justify-center">Programme Show Hypnose - Déroulement du Jour J</CardTitle>
                      <CardDescription className="text-center text-purple-100">Planning détaillé modifiable selon vos besoins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Planning de la journée */}
                      <div className="bg-white/10 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Planning de la journée</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-white/90">Arrivée des techniciens</Label><Input type="time" value={hypnosisProgram.techniciansArrival} onChange={(e) => setHypnosisProgram(prev => ({...prev, techniciansArrival: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Repas des techniciens</Label><Input type="time" value={hypnosisProgram.techniciansLunch} onChange={(e) => setHypnosisProgram(prev => ({...prev, techniciansLunch: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Réglages son et lumières</Label><Input value={hypnosisProgram.soundLightAdjustments} onChange={(e) => setHypnosisProgram(prev => ({...prev, soundLightAdjustments: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Arrivée de l'artiste</Label><Input type="time" value={hypnosisProgram.artistArrival} onChange={(e) => setHypnosisProgram(prev => ({...prev, artistArrival: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                        </div>
                      </div>

                      {/* Catering */}
                      <div className="bg-white/10 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Catering pour les techniciens</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-white/90">Nombre de repas midi</Label><Input type="number" min="0" value={hypnosisProgram.cateringLunchCount} onChange={(e) => setHypnosisProgram(prev => ({...prev, cateringLunchCount: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Nombre de repas soir</Label><Input type="number" min="0" value={hypnosisProgram.cateringDinnerCount} onChange={(e) => setHypnosisProgram(prev => ({...prev, cateringDinnerCount: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                        </div>
                      </div>

                      {/* Planning du spectacle */}
                      <div className="bg-white/10 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Planning du spectacle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-white/90">Ouverture des portes</Label><Input type="time" value={hypnosisProgram.doorsOpen} onChange={(e) => setHypnosisProgram(prev => ({...prev, doorsOpen: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Début du spectacle</Label><Input type="time" value={hypnosisProgram.showStartTime} onChange={(e) => setHypnosisProgram(prev => ({...prev, showStartTime: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Entracte</Label><Input type="time" value={hypnosisProgram.intermissionTime} onChange={(e) => setHypnosisProgram(prev => ({...prev, intermissionTime: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Durée entracte (minutes)</Label><Input type="number" value={hypnosisProgram.intermissionDuration} onChange={(e) => setHypnosisProgram(prev => ({...prev, intermissionDuration: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Reprise du spectacle</Label><Input type="time" value={hypnosisProgram.secondPartTime} onChange={(e) => setHypnosisProgram(prev => ({...prev, secondPartTime: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                          <div className="space-y-2"><Label className="text-white/90">Fin du spectacle</Label><Input type="time" value={hypnosisProgram.showEndTime} onChange={(e) => setHypnosisProgram(prev => ({...prev, showEndTime: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                        </div>
                      </div>

                      {/* Après-spectacle */}
                      <div className="bg-white/10 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Après-spectacle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-white/90">Fin du démontage</Label><Input type="time" value={hypnosisProgram.dismantlingEnd} onChange={(e) => setHypnosisProgram(prev => ({...prev, dismantlingEnd: e.target.value}))} className="bg-white/20 border-white/30 text-white placeholder-white/70" /></div>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4">
                        <Button type="button" onClick={() => setHypnosisProgram(defaultHypnosisProgram)} className="bg-white/20 hover:bg-white/30 text-white border-white/30">Réinitialiser aux horaires par défaut</Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Contact Technicien de Salle */}
                  <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-teal-600 text-white mt-6">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-center text-xl font-bold">Contact Technicien de Salle</CardTitle>
                      <CardDescription className="text-center text-blue-100">Coordonnées du technicien pour la coordination technique</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2"><Label className="text-white font-medium">Nom & Prénom</Label><Input value={technicianContact.name} onChange={(e) => setTechnicianContact(prev => ({ ...prev, name: e.target.value }))} className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20" /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className="text-white font-medium">Adresse email</Label><Input type="email" value={technicianContact.email} onChange={(e) => setTechnicianContact(prev => ({ ...prev, email: e.target.value }))} className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20" /></div>
                        <div className="space-y-2"><Label className="text-white font-medium">Numéro de téléphone</Label><Input type="tel" value={technicianContact.phone} onChange={(e) => setTechnicianContact(prev => ({ ...prev, phone: e.target.value }))} className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Options et Tarifs pour Show Hypnose et Intervention hypnose */}
              {['Show Hypnose', 'Intervention hypnose'].includes(clientInfo.event_type) && (
                <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-800">Tarifs et Paiement</CardTitle>
                    <CardDescription>Configurez le tarif et les conditions de paiement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label className="text-slate-700">Prix de base</Label><div className="flex items-center space-x-2"><Euro className="h-4 w-4 text-slate-500" /><Input type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} className="border-slate-300 focus:border-blue-500 w-32" min="0" step="10" /></div></div>
                    <div className="space-y-2"><Label className="text-slate-700">Remise (optionnel)</Label><div className="flex items-center space-x-2"><Euro className="h-4 w-4 text-slate-500" /><Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} className="border-slate-300 focus:border-blue-500 w-32" min="0" step="5" /></div></div>
                    <Separator />
                    <div className="space-y-2"><Label className="text-slate-700">Acompte personnalisé (optionnel)</Label><div className="flex items-center space-x-2"><Euro className="h-4 w-4 text-slate-500" /><Input type="number" value={customDepositAmount} onChange={(e) => setCustomDepositAmount(Number(e.target.value))} className="border-slate-300 focus:border-blue-500 w-32" min="0" step="10" /></div><p className="text-xs text-slate-500">Par défaut: {clientInfo?.company?.trim() ? "30%" : "50%"} du tarif de base</p></div>
                    <div className="flex items-center space-x-2"><Checkbox id="no_deposit_hypnosis" checked={noDepositRequired} onCheckedChange={(checked) => setNoDepositRequired(checked)} /><Label htmlFor="no_deposit_hypnosis" className="text-sm font-normal cursor-pointer">Client de confiance - Aucun acompte requis</Label></div>
                    <Separator />
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-slate-800 text-sm">Récapitulatif financier</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Tarif de base :</span><span className="font-medium">{basePrice.toFixed(2)} €</span></div>
                        {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Remise :</span><span className="font-medium">-{discountAmount.toFixed(2)} €</span></div>}
                        <Separator />
                        <div className="flex justify-between font-bold"><span>Total TTC :</span><span>{calculateTotal().toFixed(2)} €</span></div>
                        <div className="flex justify-between text-blue-600"><span>Acompte :</span><span className="font-medium">{calculateDepositAmount().toFixed(2)} €</span></div>
                        <div className="flex justify-between text-green-600"><span>Solde à régler :</span><span className="font-medium">{calculateRemainingBalance().toFixed(2)} €</span></div>
                      </div>
                    </div>
                    <Textarea value={optionsTarifNotes} onChange={(e) => setOptionsTarifNotes(e.target.value)} className="border-slate-300 focus:border-blue-500" rows={3} />
                  </CardContent>
                </Card>
              )}

              {/* Tarifs - Contrats 2 (adaptatif Dirigeant / Mandat) */}
              {!['Show Hypnose', 'Intervention hypnose'].includes(clientInfo.event_type) && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    {isDirigeant() ? 'Options et Tarifs' : 'Tarifs & Répartition'}
                    {selectedDjProfile && !isDirigeant() && (
                      contractMode === 'entreprise' ? (
                        <Badge className="bg-blue-600 text-white text-xs">Mode Entreprise</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white text-xs">Mode Mandat</Badge>
                      )
                    )}
                  </CardTitle>
                  <CardDescription>{isDirigeant() ? 'Configurez les options et le tarif du contrat' : 'Répartition des montants entre l\'agence et l\'artiste'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prix de base simple - Non modifiable en mode mandat */}
                  <div className="space-y-2">
                    <Label className="text-slate-700">Prix de base (TTC)</Label>
                    <div className="flex items-center space-x-2">
                      <Euro className="h-4 w-4 text-slate-500" />
                      <Input 
                        type="number" 
                        value={basePrice} 
                        onChange={(e) => setBasePrice(Number(e.target.value))} 
                        disabled={!(isDirigeant() || contractMode === 'entreprise')}
                        className={`w-32 font-bold ${!(isDirigeant() || contractMode === 'entreprise') ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-slate-300 focus:border-blue-500"}`} 
                        min="0" 
                        step="10" 
                      />
                    </div>
                  </div>

                  {/* Mode Mandat: Frais + Cachet */}
                  {!isDirigeant() && contractMode === 'mandataire' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <Label className="text-orange-800 font-semibold">Frais de Mandat & Gestion</Label>
                        <p className="text-xs text-orange-600">Part R'KEY PROD</p>
                        <div className="flex items-center space-x-2">
                          <Euro className="h-4 w-4 text-orange-500" />
                          <Input 
                            type="number" 
                            value={fraisMandat} 
                            onChange={(e) => {
                              const newFrais = Number(e.target.value) || 0;
                              setFraisMandat(newFrais);
                              setBasePrice(newFrais + cachetArtiste);
                            }} 
                            className="border-orange-300 focus:border-orange-500 w-full font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            min="0" 
                            step="10" 
                            data-testid="frais-mandat-input" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Label className="text-purple-800 font-semibold">Cachet Artiste</Label>
                        <p className="text-xs text-purple-600">Part du DJ partenaire</p>
                        <div className="flex items-center space-x-2">
                          <Euro className="h-4 w-4 text-purple-500" />
                          <Input 
                            type="number" 
                            value={cachetArtiste} 
                            onChange={(e) => {
                              const newCachet = Number(e.target.value) || 0;
                              setCachetArtiste(newCachet);
                              setBasePrice(fraisMandat + newCachet);
                            }} 
                            className="border-purple-300 focus:border-purple-500 w-full font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            min="0" 
                            step="10" 
                            data-testid="cachet-artiste-input" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2"><Label className="text-slate-700">Remise (optionnel)</Label><div className="flex items-center space-x-2"><Euro className="h-4 w-4 text-slate-500" /><Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} className="border-slate-300 focus:border-blue-500 w-32" min="0" step="5" /></div></div>

                  <Separator />

                  {/* Options Matériel (communes aux deux modes) */}
                  <div className="grid grid-cols-1 gap-3">
                    {selectedOptions.filter(opt => !opt.event_categories || opt.event_categories.length === 0 || opt.event_categories.includes(clientInfo.event_type)).map((option) => (
                      <div key={option.id} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${option.selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleOptionToggle(option.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox checked={option.selected} readOnly />
                            <div><p className="font-medium text-slate-800">{option.name}</p><Badge variant="secondary" className="mt-1">{option.price}€</Badge></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>


                  <Separator />

                  {/* Récapitulatif */}
                  <div className={`p-4 rounded-lg border ${(isDirigeant() || contractMode === 'entreprise') ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'}`}>
                    <div className="space-y-2 text-sm">
                      {(isDirigeant() || contractMode === 'entreprise') ? (
                        <>
                          <div className="flex justify-between"><span>Tarif de base :</span><span className="font-medium">{basePrice.toFixed(2)} €</span></div>
                          {selectedOptions.filter(o => o.selected).map(o => (
                            <div key={o.id} className="flex justify-between text-slate-600"><span>{o.name} :</span><span className="font-medium">{o.price.toFixed(2)} €</span></div>
                          ))}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span className="text-orange-700">Frais de Mandat & Gestion :</span><span className="font-medium">{fraisMandat.toFixed(2)} €</span></div>
                          <div className="flex justify-between"><span className="text-purple-700">Cachet Artiste :</span><span className="font-medium">{cachetArtiste.toFixed(2)} €</span></div>
                          {selectedOptions.filter(o => o.selected).map(o => (
                            <div key={o.id} className="flex justify-between text-slate-600"><span>{o.name} :</span><span className="font-medium">{o.price.toFixed(2)} €</span></div>
                          ))}
                        </>
                      )}
                      {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Remise :</span><span className="font-medium">-{discountAmount.toFixed(2)} €</span></div>}
                      <Separator />
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-lg font-bold text-slate-800">Total {isDirigeant() ? '' : 'Client'} :</span>
                        <span className="text-2xl font-bold text-blue-600">{calculateTotal().toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Notes sur les tarifs (optionnel)</Label>
                    <textarea value={optionsTarifNotes} onChange={(e) => setOptionsTarifNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" rows={3} />
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Section Organisation et notes DJ (Nouveau) */}
              {!['Show Hypnose', 'Intervention hypnose'].includes(clientInfo.event_type) && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-800">Organisation et notes DJ</CardTitle>
                  <CardDescription>Sélectionnez les documents à inclure dans le Guide Organisation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 pb-4 border-b">
                     <Label className="text-slate-700">Notes DJ complémentaires (visible uniquement par le DJ)</Label>
                     <Textarea value={djNotes} onChange={(e) => setDjNotes(e.target.value)} rows={3} className="border-slate-300 focus:border-blue-500" placeholder="Informations complémentaires, remarques particulières..." />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {/* PDF uploadés */}
                    {pdfNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${selectedPdfNotes.includes(note.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        onClick={() => {
                          setSelectedPdfNotes(prev => prev.includes(note.id) ? prev.filter(i => i !== note.id) : [...prev, note.id]);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <Checkbox checked={selectedPdfNotes.includes(note.id)} readOnly />
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{note.title}</p>
                              <p className="text-xs text-slate-500">Document PDF</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Informations techniques de la salle */}
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <Label className="text-slate-700 font-semibold">Informations techniques de la salle</Label>
                    <p className="text-xs text-slate-500 mb-2">Ces informations apparaîtront dans le PDF du contrat</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${hasLimiteurSon ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => { setHasLimiteurSon(!hasLimiteurSon); if (!hasLimiteurSon) setHasNoLimiteurNiDetecteur(false); }}>
                        <div className="flex items-center space-x-3"><Checkbox checked={hasLimiteurSon} onCheckedChange={(checked) => { setHasLimiteurSon(checked); if (checked) setHasNoLimiteurNiDetecteur(false); }} /><p className="font-medium text-slate-800 text-sm">Limiteur de son</p></div>
                      </div>
                      <div className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${hasDetecteurFumee ? "border-red-500 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => { setHasDetecteurFumee(!hasDetecteurFumee); if (!hasDetecteurFumee) setHasNoLimiteurNiDetecteur(false); }}>
                        <div className="flex items-center space-x-3"><Checkbox checked={hasDetecteurFumee} onCheckedChange={(checked) => { setHasDetecteurFumee(checked); if (checked) setHasNoLimiteurNiDetecteur(false); }} /><p className="font-medium text-slate-800 text-sm">Détecteur de fumée</p></div>
                      </div>
                      <div className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${hasNoLimiteurNiDetecteur ? "border-green-500 bg-green-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => { const nv = !hasNoLimiteurNiDetecteur; setHasNoLimiteurNiDetecteur(nv); if (nv) { setHasLimiteurSon(false); setHasDetecteurFumee(false); } }}>
                        <div className="flex items-center space-x-3"><Checkbox checked={hasNoLimiteurNiDetecteur} onCheckedChange={(checked) => { setHasNoLimiteurNiDetecteur(checked); if (checked) { setHasLimiteurSon(false); setHasDetecteurFumee(false); } }} /><p className="font-medium text-slate-800 text-sm">Aucun</p></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${hasWifi ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => { setHasWifi(!hasWifi); }}>
                        <div className="flex items-center space-x-3"><Checkbox checked={hasWifi} onCheckedChange={(checked) => { setHasWifi(checked); }} /><p className="font-medium text-slate-800 text-sm">Wi-Fi disponible dans la salle</p></div>
                      </div>
                      <div className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${has4g5g ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => { setHas4g5g(!has4g5g); }}>
                        <div className="flex items-center space-x-3"><Checkbox checked={has4g5g} onCheckedChange={(checked) => { setHas4g5g(checked); }} /><p className="font-medium text-slate-800 text-sm">Réseau 4G/5G disponible</p></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Styles Musicaux (Uniquement pour R'Key) */}
              {!['Show Hypnose', 'Intervention hypnose'].includes(clientInfo.event_type) && (getProfileData(selectedDjProfile).nom_artistique?.toLowerCase().includes("r'key") || getProfileData(selectedDjProfile).titre?.includes("Gérant")) && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-800">Styles Musicaux</CardTitle>
                  <CardDescription>Sélectionnez les styles musicaux prévus pour la soirée</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end mb-3">
                    <Button type="button" onClick={selectAllMusicStyles} variant="outline" size="sm" className="text-purple-600 border-purple-300 hover:bg-purple-50">Tout sélectionner</Button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {musicStyles.map((style) => (
                      <div key={style} className={`p-2 rounded-lg border-2 transition-all cursor-pointer text-center text-sm ${selectedMusicStyles.includes(style) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleMusicStyleToggle(style)}>
                        {style}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4 border-t"><Label className="text-slate-700">Fond sonore apéritif</Label><Input value={backgroundMusicAperitif} onChange={(e) => setBackgroundMusicAperitif(e.target.value)} className="border-slate-300 focus:border-blue-500" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
                    <div className="space-y-2"><Label className="text-slate-700">Musiques à éviter</Label><Textarea value={blacklist} onChange={(e) => setBlacklist(e.target.value)} rows={2} className="border-slate-300 focus:border-blue-500" /></div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Déroulement de Soirée (Uniquement pour R'Key) */}
              {!['Show Hypnose', 'Intervention hypnose'].includes(clientInfo.event_type) && (getProfileData(selectedDjProfile).nom_artistique?.toLowerCase().includes("r'key") || getProfileData(selectedDjProfile).titre?.includes("Gérant")) && (
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-800">Déroulement de Soirée</CardTitle>
                    <CardDescription>Organisez les événements et animations de votre soirée</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Événements Repas */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800">Événements du Repas</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {eventCategories.repas.map((event) => (
                          <div key={`repas-${event}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`repas-${event}`) ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`repas-${event}`, event, 'repas')}>{event}</div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Input value={newRepasEvent} onChange={(e) => setNewRepasEvent(e.target.value)} className="border-slate-300 focus:border-blue-500" onKeyPress={(e) => { if (e.key === 'Enter' && newRepasEvent.trim()) { setCustomRepasEvents(prev => [...prev, newRepasEvent.trim()]); setNewRepasEvent(""); } }} />
                        <Button type="button" onClick={() => { if (newRepasEvent.trim()) { setCustomRepasEvents(prev => [...prev, newRepasEvent.trim()]); setNewRepasEvent(""); } }} className="bg-orange-600 hover:bg-orange-700">+</Button>
                      </div>
                      {customRepasEvents.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          {customRepasEvents.map((event, index) => (
                            <div key={`custom-repas-${index}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`custom-repas-${index}`) ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`custom-repas-${index}`, event, 'repas')}>
                              {event}<button className="ml-2 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setCustomRepasEvents(prev => prev.filter((_, i) => i !== index)); setSelectedEvents(prev => prev.filter(ev => ev !== `custom-repas-${index}`)); }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Événements Musique */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800">Musique</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {eventCategories.musique.map((event) => (
                          <div key={`musique-${event}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`musique-${event}`) ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`musique-${event}`, event, 'musique')}>{event}</div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Input value={newMusiqueEvent} onChange={(e) => setNewMusiqueEvent(e.target.value)} className="border-slate-300 focus:border-blue-500" onKeyPress={(e) => { if (e.key === 'Enter' && newMusiqueEvent.trim()) { setCustomMusiqueEvents(prev => [...prev, newMusiqueEvent.trim()]); setNewMusiqueEvent(""); } }} />
                        <Button type="button" onClick={() => { if (newMusiqueEvent.trim()) { setCustomMusiqueEvents(prev => [...prev, newMusiqueEvent.trim()]); setNewMusiqueEvent(""); } }} className="bg-green-600 hover:bg-green-700">+</Button>
                      </div>
                      {customMusiqueEvents.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {customMusiqueEvents.map((event, index) => (
                            <div key={`custom-musique-${index}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`custom-musique-${index}`) ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`custom-musique-${index}`, event, 'musique')}>
                              {event}<button className="ml-2 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setCustomMusiqueEvents(prev => prev.filter((_, i) => i !== index)); setSelectedEvents(prev => prev.filter(ev => ev !== `custom-musique-${index}`)); }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Événements Animations */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800">Animations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {animationEvents.map((event) => (
                          <div key={`animation-${event}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`animation-${event}`) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`animation-${event}`, event, 'animation')}>{event}</div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Input value={newAnimationEvent} onChange={(e) => setNewAnimationEvent(e.target.value)} className="border-slate-300 focus:border-blue-500" onKeyPress={(e) => { if (e.key === 'Enter' && newAnimationEvent.trim()) { setCustomAnimationEvents(prev => [...prev, newAnimationEvent.trim()]); setNewAnimationEvent(""); } }} />
                        <Button type="button" onClick={() => { if (newAnimationEvent.trim()) { setCustomAnimationEvents(prev => [...prev, newAnimationEvent.trim()]); setNewAnimationEvent(""); } }} className="bg-purple-600 hover:bg-purple-700">+</Button>
                      </div>
                      {customAnimationEvents.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                          {customAnimationEvents.map((event, index) => (
                            <div key={`custom-animation-${index}`} className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${selectedEvents.includes(`custom-animation-${index}`) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => handleEventClick(`custom-animation-${index}`, event, 'animation')}>
                              {event}<button className="ml-2 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setCustomAnimationEvents(prev => prev.filter((_, i) => i !== index)); setSelectedEvents(prev => prev.filter(ev => ev !== `custom-animation-${index}`)); }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ordre chronologique */}
                    {eventOrder.length > 0 && (
                      <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                        <h4 className="text-lg font-semibold text-slate-800">Ordre chronologique de la soirée</h4>
                        <div className="space-y-2">
                          {eventOrder.map((event, index) => (
                            <div key={event.key} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                              <div className="flex items-center space-x-3">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">{index + 1}</span>
                                <span className="text-lg">{event.icon}</span>
                                <span className="font-medium text-slate-700">{event.label}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button type="button" onClick={() => moveEventUp(index)} disabled={index === 0} className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" title="Monter">↑</button>
                                <button type="button" onClick={() => moveEventDown(index)} disabled={index === eventOrder.length - 1} className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" title="Descendre">↓</button>
                                <button type="button" onClick={() => removeFromOrder(event.key)} className="p-1 rounded text-red-600 hover:bg-red-100" title="Supprimer">×</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2"><Label className="text-slate-700">Notes et observations pour le déroulement</Label><Textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} rows={3} className="border-slate-300 focus:border-blue-500" /></div>
                  </CardContent>
                </Card>
              </div>
              )}

              {/* Conditions de Paiement Détaillées (Mode Dirigeant uniquement) */}
              {isDirigeant() && (
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-800">Conditions de Paiement</CardTitle>
                    <CardDescription>Configuration des modalités de paiement et acompte</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Integrated Dual Isolated Numbering Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm">Numérotations de Dossier Séquentielles</h4>
                          <p className="text-xs text-slate-500">Compteurs isolés pour la conformité réglementaire</p>
                        </div>
                        {contractMode === 'mandataire' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateNumbers('both')}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1 h-8 px-2"
                            title="Générer les deux numéros séquentiels d'un coup"
                          >
                            ⚡ Générer les deux
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FIRST CONTRACT NUMBER (MANDAT or PRESTATION) */}
                        <div className="space-y-2 border-r pr-0 md:pr-4 border-slate-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-700 font-medium text-xs">
                              {contractMode === 'mandataire' ? "N° Contrat Mandat (R'KEY PROD)" : "N° Contrat Prestation"}
                            </Label>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded font-bold">CTR</span>
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            <Input 
                              value={invoiceNumber} 
                              onChange={(e) => setInvoiceNumber(e.target.value)} 
                              placeholder="CTR-2026-0000"
                              className="border-slate-300 focus:border-blue-500 text-sm h-9 flex-1 bg-white font-mono" 
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              onClick={() => {
                                if (invoiceNumber) {
                                  navigator.clipboard.writeText(invoiceNumber);
                                  toast.success("Numéro Mandat copié !");
                                } else {
                                  toast.error("Le numéro de contrat est vide");
                                }
                              }} 
                              className="bg-white hover:bg-slate-100 h-9 w-9 border-slate-300 shrink-0"
                              title="Copier"
                            >
                              <Copy className="h-4 w-4 text-slate-600" />
                            </Button>
                          </div>
                          
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleGenerateNumbers('mandat')}
                            className="w-full text-xs h-8 bg-white hover:bg-slate-100 border text-slate-700 border-slate-300 flex items-center justify-center gap-1 font-medium"
                          >
                            🎲 Incrémenter {nextNumbers.next_mandat_number ? `(${nextNumbers.next_mandat_number})` : ""}
                          </Button>
                        </div>

                        {/* SECOND CONTRACT NUMBER (ENGAGEMENT ARTISTE) - only if in Mandataire Mode */}
                        {contractMode === 'mandataire' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-slate-700 font-medium text-xs">N° Engagement Artiste (DJ Mandaté)</Label>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded font-bold">ART</span>
                            </div>
                            
                            <div className="flex items-center space-x-1.5">
                              <Input 
                                value={artisteInvoiceNumber} 
                                onChange={(e) => setArtisteInvoiceNumber(e.target.value)} 
                                placeholder="ART-SJ-2026-0000"
                                className="border-slate-300 focus:border-amber-500 text-sm h-9 flex-1 bg-white font-mono" 
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                onClick={() => {
                                  if (artisteInvoiceNumber) {
                                    navigator.clipboard.writeText(artisteInvoiceNumber);
                                    toast.success("Numéro d'artiste copié !");
                                  } else {
                                    toast.error("Le numéro d'artiste est vide");
                                  }
                                }} 
                                className="bg-white hover:bg-slate-100 h-9 w-9 border-slate-300 shrink-0"
                                title="Copier"
                              >
                                <Copy className="h-4 w-4 text-slate-600" />
                              </Button>
                            </div>
                            
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleGenerateNumbers('artiste')}
                              className="w-full text-xs h-8 bg-white hover:bg-slate-100 border text-slate-700 border-slate-300 flex items-center justify-center gap-1 font-medium"
                            >
                              🎲 Incrémenter {nextNumbers.next_artiste_number ? `(${nextNumbers.next_artiste_number})` : ""}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center border-l border-slate-200 text-slate-400 text-xs italic px-4 text-center">
                            Mode Entreprise Actif. Un seul contrat global R'Key Prod est généré. Aucun contrat d'engagement artiste séparé requis.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between"><span className="font-medium">Montant total:</span><span className="font-bold text-blue-600">{calculateTotal()}€</span></div>
                      <div className="flex justify-between"><span>Acompte ({clientInfo?.company?.trim() ? "30%" : "50%"} tarif + options complètes):</span><span className="font-semibold text-green-600">{calculateDepositAmount()}€</span></div>
                      <div className="flex justify-between"><span>Solde restant:</span><span className="font-semibold">{calculateRemainingBalance()}€</span></div>
                    </div>

                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Checkbox id="no_deposit_required" checked={noDepositRequired} onCheckedChange={(checked) => { setNoDepositRequired(checked); if (checked) { setCustomDepositAmount(0); } }} />
                      <Label htmlFor="no_deposit_required" className="text-blue-700 font-medium cursor-pointer">Client de confiance - Pas d'acompte requis</Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700">Acompte personnalisé (optionnel)</Label>
                      <div className="flex items-center space-x-2">
                        <Euro className="h-4 w-4 text-slate-500" />
                        <Input type="number" value={customDepositAmount} onChange={(e) => setCustomDepositAmount(Number(e.target.value))} className="border-slate-300 focus:border-blue-500 w-32" min="0" step="10" disabled={noDepositRequired} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700">Coordonnées bancaires pour le paiement</Label>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm border border-slate-200" data-testid="company-rib-display">
                        <p><strong>Banque :</strong> {companySettings.bank_name}</p>
                        <p><strong>IBAN :</strong> {companySettings.bank_iban}</p>
                        <p><strong>BIC :</strong> {companySettings.bank_bic}</p>
                        <p><strong>Titulaire :</strong> {companySettings.bank_titulaire}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="deposit_paid" checked={depositPaid} onCheckedChange={setDepositPaid} />
                        <Label htmlFor="deposit_paid" className="text-slate-700">Acompte déjà payé</Label>
                      </div>
                      {depositPaid && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-slate-700">Mode de paiement de l'acompte</Label>
                            <Select value={depositPaymentMethod} onValueChange={setDepositPaymentMethod}>
                              <SelectTrigger className="border-slate-300 focus:border-blue-500"><SelectValue placeholder="Comment l'acompte a été payé ?" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="virement">Virement bancaire</SelectItem>
                                <SelectItem value="especes">Espèces</SelectItem>
                                <SelectItem value="cheque">Chèque</SelectItem>
                                <SelectItem value="carte">Carte bancaire</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700">Date de versement de l'acompte</Label>
                            <Input type="date" value={depositPaidDate} onChange={(e) => setDepositPaidDate(e.target.value)} className="border-slate-300 focus:border-blue-500" />
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}

              {/* Mode Mandat: Numéro de contrat uniquement */}
              {!isDirigeant() && (
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-800">Référence du Contrat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Integrated Dual Isolated Numbering Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm">Numérotations de Dossier Séquentielles</h4>
                          <p className="text-xs text-slate-500">Compteurs isolés pour la conformité réglementaire</p>
                        </div>
                        {contractMode === 'mandataire' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateNumbers('both')}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1 h-8 px-2"
                            title="Générer les deux numéros séquentiels d'un coup"
                          >
                            ⚡ Générer les deux
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FIRST CONTRACT NUMBER (MANDAT or PRESTATION) */}
                        <div className="space-y-2 border-r pr-0 md:pr-4 border-slate-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-700 font-medium text-xs">
                              {contractMode === 'mandataire' ? "N° Contrat Mandat (R'KEY PROD)" : "N° Contrat Prestation"}
                            </Label>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded font-bold">CTR</span>
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            <Input 
                              value={invoiceNumber} 
                              onChange={(e) => setInvoiceNumber(e.target.value)} 
                              placeholder="CTR-2026-0000"
                              className="border-slate-300 focus:border-blue-500 text-sm h-9 flex-1 bg-white font-mono" 
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              onClick={() => {
                                if (invoiceNumber) {
                                  navigator.clipboard.writeText(invoiceNumber);
                                  toast.success("Numéro Mandat copié !");
                                } else {
                                  toast.error("Le numéro de contrat est vide");
                                }
                              }} 
                              className="bg-white hover:bg-slate-100 h-9 w-9 border-slate-300 shrink-0"
                              title="Copier"
                            >
                              <Copy className="h-4 w-4 text-slate-600" />
                            </Button>
                          </div>
                          
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleGenerateNumbers('mandat')}
                            className="w-full text-xs h-8 bg-white hover:bg-slate-100 border text-slate-700 border-slate-300 flex items-center justify-center gap-1 font-medium"
                          >
                            🎲 Incrémenter {nextNumbers.next_mandat_number ? `(${nextNumbers.next_mandat_number})` : ""}
                          </Button>
                        </div>

                        {/* SECOND CONTRACT NUMBER (ENGAGEMENT ARTISTE) - only if in Mandataire Mode */}
                        {contractMode === 'mandataire' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-slate-700 font-medium text-xs">N° Engagement Artiste (DJ Mandaté)</Label>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded font-bold">ART</span>
                            </div>
                            
                            <div className="flex items-center space-x-1.5">
                              <Input 
                                value={artisteInvoiceNumber} 
                                onChange={(e) => setArtisteInvoiceNumber(e.target.value)} 
                                placeholder="ART-SJ-2026-0000"
                                className="border-slate-300 focus:border-amber-500 text-sm h-9 flex-1 bg-white font-mono" 
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                onClick={() => {
                                  if (artisteInvoiceNumber) {
                                    navigator.clipboard.writeText(artisteInvoiceNumber);
                                    toast.success("Numéro d'artiste copié !");
                                  } else {
                                    toast.error("Le numéro d'artiste est vide");
                                  }
                                }} 
                                className="bg-white hover:bg-slate-100 h-9 w-9 border-slate-300 shrink-0"
                                title="Copier"
                              >
                                <Copy className="h-4 w-4 text-slate-600" />
                              </Button>
                            </div>
                            
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleGenerateNumbers('artiste')}
                              className="w-full text-xs h-8 bg-white hover:bg-slate-100 border text-slate-700 border-slate-300 flex items-center justify-center gap-1 font-medium"
                            >
                              🎲 Incrémenter {nextNumbers.next_artiste_number ? `(${nextNumbers.next_artiste_number})` : ""}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center border-l border-slate-200 text-slate-400 text-xs italic px-4 text-center">
                            Mode Entreprise Actif. Un seul contrat global R'Key Prod est généré. Aucun contrat d'engagement artiste séparé requis.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}

              {/* Bouton d'action */}
              <div className="lg:col-span-2 flex justify-center gap-4 mb-6">
                <Button onClick={() => saveContractDraft(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg" disabled={!clientInfo.name || !clientInfo.email}>
                  <FileText className="h-5 w-5 mr-2" />Aperçu du contrat
                </Button>
                {editingContract && (
                  <Button onClick={() => saveContractDraft(false)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg" disabled={!clientInfo.name || !clientInfo.email}>
                    <Save className="h-5 w-5 mr-2" />Mettre à jour
                  </Button>
                )}
              </div>

              {/* CGV Section */}
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-800">Conditions Générales de Vente</CardTitle>
                    <CardDescription>Choisissez un modèle prédéfini ou personnalisez vos CGV *</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Modèle de CGV *</Label>
                      <Select value={selectedCgvTemplate} onValueChange={handleCgvTemplateChange} required>
                        <SelectTrigger className={`bg-white border-slate-300 focus:border-blue-500 ${!selectedCgvTemplate ? 'border-red-300' : ''}`}><SelectValue placeholder="Sélectionner un modèle *" /></SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem key="custom" value="custom">Personnalisé</SelectItem>
                          {Object.entries(cgvTemplates).map(([key, template]) => (
                            <SelectItem key={key} value={key}>
                              {template.name || key.replace(/_[0-9]+$/, '').replace(/_/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="text-slate-700">Texte des CGV</Label><Textarea value={cgvText} onChange={(e) => setCgvText(e.target.value)} rows={6} className="border-slate-300 focus:border-blue-500" /></div>
                    {selectedCgvTemplate && selectedCgvTemplate !== 'custom' && (
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={async () => {
                        try {
                          const updated = { ...cgvTemplates };
                          updated[selectedCgvTemplate] = { ...updated[selectedCgvTemplate], content: cgvText };
                          await axios.put(`${API}/cgv-templates`, { templates: updated });
                          setCgvTemplates(updated);
                          toast.success('Modèle CGV sauvegardé');
                        } catch { toast.error('Erreur sauvegarde CGV'); }
                      }} data-testid="save-cgv-template-btn">
                        <Save className="w-4 h-4 mr-1" />Sauvegarder ce modèle
                      </Button>
                    )}
                    
                    {/* CGV Artiste pour le Mode Mandat */}
                    {contractMode === 'mandataire' && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-3">
                          <Label className="text-slate-800 font-semibold text-sm flex items-center gap-1.5 md:text-base">
                            Conditions Générales de l'Artiste (Document 2 - Contrat DJ)
                          </Label>
                          <CardDescription className="text-xs text-slate-500">
                            Ces conditions s'appliquent séparément sur le Document 2 du mode mandat. Éditez ce texte pour ce contrat ou cliquez sur "Sauvegarder par défaut" pour l'enregistrer globalement.
                          </CardDescription>
                          <Textarea 
                            value={artisteCgvText} 
                            onChange={(e) => setArtisteCgvText(e.target.value)} 
                            rows={8} 
                            className="border-slate-300 focus:border-blue-500 font-mono text-[11px] leading-relaxed bg-slate-50/50" 
                            placeholder="Saisissez les CGV de l'artiste..."
                          />
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 transition" 
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('access_token');
                                  const response = await fetch(`${API}/global-settings`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  let existingData = {};
                                  if (response.ok) {
                                    existingData = await response.json();
                                  }
                                  const updated = { 
                                    ...existingData, 
                                    artiste_cgv_text: artisteCgvText,
                                    type: 'company',
                                    updated_at: new Date().toISOString()
                                  };
                                  await axios.put(`${API}/global-settings`, updated);
                                  toast.success('Sauvegardé avec succès dans la configuration globale !');
                                } catch (err) {
                                  console.error("Save failure:", err);
                                  toast.error('Erreur de sauvegarde globale');
                                }
                              }}
                            >
                              <Save className="w-4 h-4 mr-1" />Sauvegarder par défaut
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-600 border-slate-250 hover:bg-slate-50 transition" 
                              onClick={() => {
                                if (window.confirm("Voulez-vous réinitialiser le texte par défaut de l'Artiste ?")) {
                                  setArtisteCgvText(defaultArtistCgv);
                                  toast.success('Texte réinitialisé !');
                                }
                              }}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />Réinitialiser d'origine
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* PREVIEW TAB (composant extrait)                */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="preview">
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden min-h-[600px]">
                <ContractPreview
                  generatedContract={generatedContract}
                  generateContractHTMLForPreview={(mode) => generateContractHTMLLocal(buildCurrentContractData(), null, signatureImages, { mode })}
                  onExportPDF={() => generateContractAndGuide(buildCurrentContractData(), generateContractHTMLLocal, loadSignatureImages, selectedPdfNotes, apiService)}
                  onSendEmail={(selectedTab) => openContractEmailModal({
                    id: generatedContract?.id || editingContract?.id,
                    ...buildCurrentContractData()
                  }, selectedTab)}
                  selectedPdfNotes={selectedPdfNotes}
                  onGetCompiledGuideBlob={() => getCompiledGuideBlob(buildCurrentContractData(), generateContractHTMLLocal, loadSignatureImages, selectedPdfNotes, apiService)}
                  isMandatMode={!isDirigeant() && contractMode === 'mandataire'}
                  isEntrepriseMode={!isDirigeant() && contractMode === 'entreprise'}
                  generateMandatHTMLForPreview={() => generateMandatHTML(buildCurrentContractData(), companySettings)}
                  generateArtisteHTMLForPreview={() => generateArtisteHTML(buildCurrentContractData(), resolveProfile)}
                  generateEntrepriseHTMLForPreview={() => generateEntrepriseHTML(buildCurrentContractData(), companySettings)}
                  onExportMandatPDF={handleExportMandatPDF}
                  onExportArtistePDF={handleExportArtistePDF}
                  onExportEntreprisePDF={handleExportEntreprisePDF}
                  artisteName={(() => { const p = getProfileData(selectedDjProfile); return p.nom_artistique || p.nom_complet || ''; })()}
                  totalMandat={(() => { const opts = selectedOptions.filter(o => o.selected).reduce((s, o) => s + o.price, 0); return Math.max(0, fraisMandat + opts - discountAmount); })()}
                  totalArtiste={cachetArtiste}
                  totalEntreprise={(() => { const opts = selectedOptions.filter(o => o.selected).reduce((s, o) => s + o.price, 0); return Math.max(0, basePrice + opts - discountAmount); })()}
                  cachetInterne={cachetArtiste}
                />
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* HISTORY TAB (composant extrait)                */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="history">
            <ContractHistory
              contracts={contracts}
              deletedContracts={deletedContracts}
              archivedContracts={archivedContracts}
              showTrash={showTrash}
              setShowTrash={setShowTrash}
              showArchive={showArchive}
              setShowArchive={setShowArchive}
              setShowConfiguration={setShowConfiguration}
              setActiveTab={setActiveTab}
              onPrintContract={handlePrintContract}
              onPreviewContract={handlePreviewContract}
              onLoadContract={loadContract}
              onDuplicateContract={duplicateContract}
              onMarkAsSent={markContractAsSent}
              onMarkAsSigned={markContractAsSigned}
              onMoveToTrash={moveContractToTrash}
              onRestore={restoreContract}
              onPermanentDelete={permanentlyDeleteContract}
              onMarkArchivedAsUnsigned={markArchivedAsUnsigned}
              onDeleteArchived={deleteArchivedContract}
              onManageAttachments={handleManageAttachments}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real Document Preview Modal (In-App) */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 sm:p-6 text-slate-800"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b bg-slate-50 flex-shrink-0 gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 truncate" title={previewDoc.title}>
                  Aperçu : {previewDoc.title}
                </h3>
              </div>
              
              {/* Document switcher if multiple exist */}
              {previewDoc.documents.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-300/50 self-start">
                  {previewDoc.documents.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewDoc(prev => ({ ...prev, activeDocIndex: idx }))}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                        previewDoc.activeDocIndex === idx
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  onClick={() => handleExportSpecificPDF(previewDoc.contract, previewDoc.documents[previewDoc.activeDocIndex].label)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 h-auto"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger PDF
                </Button>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content of preview */}
            <div className="flex-1 bg-slate-150 overflow-y-auto relative min-h-0 p-4">
              <div className="max-w-4xl mx-auto my-4 bg-white p-6 sm:p-10 shadow-md border rounded-xl overflow-x-auto select-text font-serif text-slate-900 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: previewDoc.documents[previewDoc.activeDocIndex].html }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue Pièces Jointes */}
      <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto text-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Paperclip className="w-5 h-5 text-emerald-700" />
              Pièces Jointes & Documents Administratifs - {selectedContractForAttachments?.client_name || selectedContractForAttachments?.client_info?.name || "Client"}
            </DialogTitle>
            <DialogDescription>
              Gérez les pièces jointes et les documents du contrat et du DJ-client (images JPG/PNG/HEIC converties automatiquement en PDF, ou directement des fichiers PDF).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Zone d'importation de fichiers */}
            <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/5 rounded-xl p-6 transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-700 mb-3">
                  <Upload className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1 text-sm">Téléverser de nouveaux documents</h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs">PDF, PNG, JPG, JPEG, HEIC (les images seront automatiquement converties en documents PDF)</p>
                
                <label className="cursor-pointer">
                  <div className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                    {uploadingAttachment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Sélectionner des fichiers
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf, image/png, image/jpeg, image/jpg, .heic, .heif"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachment}
                    multiple
                  />
                </label>
              </div>
            </div>

            {/* Liste des documents */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Documents associés ({selectedContractForAttachments?.event_documents?.length || 0})
              </h4>
              
              {(!selectedContractForAttachments?.event_documents || selectedContractForAttachments.event_documents.length === 0) ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucun document n'a encore été associé à ce contrat.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[40vh] overflow-y-auto pr-1">
                  {selectedContractForAttachments.event_documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate" title={doc.filename}>{doc.filename}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Catégorie : <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">{doc.category || 'Administrative'}</span>
                            {doc.uploaded_at && ` • Envoyé le ${new Date(doc.uploaded_at).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewAttachment(doc)}
                          className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          title="Visionner en direct"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(doc.id)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachmentsDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visionnage Direct du PDF */}
      <Dialog open={!!previewPdfUrl} onOpenChange={(open) => { if (!open) setPreviewPdfUrl(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 text-slate-800">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Eye className="w-5 h-5 text-emerald-700" />
              Aperçu en Direct - {previewPdfFilename}
            </DialogTitle>
            <DialogDescription>
              Prévisualisation en direct de la pièce jointe
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 w-full overflow-hidden rounded-lg border bg-gray-100">
            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded"
                title="Aperçu Document PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Chargement en cours...
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setPreviewPdfUrl(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Contracts2App;
