import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';
import { 
  MapPin, Building2, Search, Plus, Edit, Trash2, AlertTriangle, 
  CheckCircle2, Image, Wifi, Smartphone, VolumeX, Flame, 
  ChevronLeft, HelpCircle, Check, Combine, FolderOpen, Info,
  ExternalLink, Calendar, PlusCircle, CheckSquare, X, ArrowUpRight, Star, Camera,
  ChevronRight, Download, Eye, FileSpreadsheet, Upload, Copy, FolderUp, Sparkles, Loader2, FileDown,
  Users, Phone, Globe, DollarSign, Tag, Link2, Clock, Volume2, ShieldCheck
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { FRENCH_DEPARTMENTS, FRENCH_DEPARTMENTS_CODES } from './contracts2/constants';

const API_BASE_URL = '/api';

const detectDeptKey = (deptString) => {
  if (!deptString) return '';
  const clean = deptString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  
  for (const dept of FRENCH_DEPARTMENTS) {
    if (!dept.code) continue;
    const cleanName = dept.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const cleanLabel = dept.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const cleanCode = dept.code.toLowerCase();

    if (clean === cleanName || clean === cleanLabel || clean === cleanCode) {
      return dept.name;
    }
    if (clean.includes(`(${cleanCode})`) || clean.endsWith(cleanCode) || clean.startsWith(cleanCode)) {
      return dept.name;
    }
    if (clean.includes(cleanLabel) && cleanLabel.length > 3) {
      return dept.name;
    }
  }
  return 'Autre';
};

export default function VenueApp() {
  const [venues, setVenues] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'incomplete' | 'blacklist'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  // Filters
  const [filterWifi, setFilterWifi] = useState(false);
  const [filter4g, setFilter4g] = useState(false);
  const [filterLimiter, setFilterLimiter] = useState(false);
  const [filterSmoke, setFilterSmoke] = useState(false);

  // Modals / Editing state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({
    name: '',
    department: '',
    city: '',
    notes: '',
    notes_observation: '',
    notes_accessibilite: '',
    rating_accessibilite: 0,
    notes_technique: '',
    notes_lumiere: '',
    has_limiteur_son: false,
    has_detecteur_fumee: false,
    has_no_limiteur_ni_detecteur: false,
    has_wifi: false,
    has_4g_5g: false,
    type_lieu: '',
    capacite_min: '',
    capacite_max: '',
    tarif_indicatif: '',
    infos_annuaire: '',
    lien_annuaire: '',
    telephone: '',
    venue_photos: [],
    is_complete: true,
    is_blacklisted: false,
    blacklist_reason: ''
  });

  const [formDeptKey, setFormDeptKey] = useState(''); // 'Bas-Rhin (67)' | ... | 'Autre'
  const [formCityKey, setFormCityKey] = useState(''); // city name | 'Autre'
  const [manualDept, setManualDept] = useState('');
  const [manualCity, setManualCity] = useState('');

  // AI Suggestion states
  const [searchingAI, setSearchingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Duplicate Merging State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState('');
  const [selectedMergeSources, setSelectedMergeSources] = useState([]);

  // Photos upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [importingFromContracts, setImportingFromContracts] = useState(false);

  // Lightbox / Image Previewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOpenLightbox = (images, index = 0) => {
    setLightboxImages(images || []);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // ══════════ ÉTAT EXPORTATION EXCEL (.xlsx) ══════════
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'filtered'

  // ══════════ ÉTAT IMPORTATION DIRECTE CSV & EXCEL (.xlsx, .csv) ══════════
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview'
  const [importTab, setImportTab] = useState('file'); // 'file' | 'paste'
  const [importPastedText, setImportPastedText] = useState('');
  const [parsedVenues, setParsedVenues] = useState([]);
  const [importRawFilename, setImportRawFilename] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [updateExistingInVenues, setUpdateExistingInVenues] = useState(true);
  const [importPreviewFilter, setImportPreviewFilter] = useState('all'); // 'all' | 'new' | 'update' | 'doubt'
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [rawGridData, setRawGridData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    nom: '',
    ville: '',
    departement: '',
    statut: '',
    notes: '',
    observations: '',
    accessibilite: '',
    rating_access: '',
    technique: '',
    lumiere: '',
    limiteur: '',
    detecteur: '',
    sans_limiteur: '',
    wifi: '',
    reseau: '',
    blacklist: '',
    type_lieu: '',
    capacite_min: '',
    capacite_max: '',
    tarif_indicatif: '',
    infos_annuaire: '',
    lien_annuaire: '',
    telephone: ''
  });

  const [departmentCities, setDepartmentCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      if (!formDeptKey || formDeptKey === 'Autre') {
        setDepartmentCities([]);
        return;
      }
      
      const deptCode = FRENCH_DEPARTMENTS_CODES[formDeptKey];
      if (!deptCode) {
        setDepartmentCities([]);
        return;
      }
      
      try {
        setLoadingCities(true);
        // Using direct public API of the French Government which is fast, free, open, and has 100% of all cities
        const res = await axios.get(`https://geo.api.gouv.fr/departements/${deptCode}/communes`);
        if (res.data) {
          const sorted = res.data.map(c => c.nom || c.name || '').filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'));
          setDepartmentCities(sorted);
          
          if (formCityKey && formCityKey !== 'Autre') {
            const exists = sorted.some(c => c.toLowerCase() === formCityKey.toLowerCase());
            if (!exists) {
              setManualCity(formCityKey);
              setFormCityKey('Autre');
            } else {
              const exactMatch = sorted.find(c => c.toLowerCase() === formCityKey.toLowerCase());
              setFormCityKey(exactMatch);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching communes from geo api gouv:', err);
        setDepartmentCities([]);
      } finally {
        setLoadingCities(false);
      }
    };
    
    fetchCities();
  }, [formDeptKey]);

  const filteredCities = departmentCities.filter(c => {
    if (!citySearchQuery || citySearchQuery === 'Autre') return true;
    const queryNormalized = citySearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cityNormalized = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cityNormalized.includes(queryNormalized);
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [venuesRes, contractsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/venues`),
        axios.get(`${API_BASE_URL}/contracts2`)
      ]);
      
      let fetchedVenues = venuesRes.data;
      if (fetchedVenues.length === 0 && contractsRes.data && contractsRes.data.length > 0) {
        try {
          const importRes = await axios.post(`${API_BASE_URL}/venues/import-all`);
          if (importRes.data && importRes.data.success && importRes.data.importedCount > 0) {
            const freshVenuesRes = await axios.get(`${API_BASE_URL}/venues`);
            fetchedVenues = freshVenuesRes.data;
            toast.success(`${importRes.data.importedCount} lieux de réception ont été récoltés automatiquement depuis vos contrats !`);
          }
        } catch (importErr) {
          console.error('Auto-import from contracts failed:', importErr);
        }
      }
      
      setVenues(fetchedVenues);
      setContracts(contractsRes.data);
    } catch (err) {
      console.error('Error loading venue app data:', err);
      toast.error('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const resolvedVenues = React.useMemo(() => {
    return venues.map(v => {
      let resolvedCity = v.city || 'À préciser';
      let resolvedDept = v.department || 'À préciser';

      if (resolvedCity === 'À préciser' || resolvedDept === 'À préciser') {
        const associatedContracts = (contracts || []).filter(c => {
          if (c.client_info?.venue_id === v.id) return true;
          const loc = (c.client_info?.event_location || c.event_location || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          return loc && vName && loc.includes(vName);
        });

        for (const c of associatedContracts) {
          const loc = c.client_info?.event_location || c.event_location || '';
          if (loc && !loc.toLowerCase().includes('à préciser')) {
            if (loc.includes('/')) {
              const parts = loc.split('/').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
              if (parts.length >= 1 && parts[0] && !parts[0].toLowerCase().includes('à préciser')) {
                if (resolvedDept === 'À préciser') resolvedDept = parts[0];
              }
            } else if (loc.includes(',')) {
              const parts = loc.split(',').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
            }
          }
        }
      }

      if (resolvedCity === 'À préciser' && v.name && v.name !== 'À préciser') {
        resolvedCity = v.name;
      }

      return {
        ...v,
        city: resolvedCity,
        department: resolvedDept
      };
    });
  }, [venues, contracts]);

  const departments = [...new Set(resolvedVenues.map(v => v.department).filter(Boolean))].sort();
  const cities = [...new Set(resolvedVenues.map(v => v.city).filter(Boolean))].sort();

  // Filter venues
  const filteredVenues = resolvedVenues.filter(v => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (v.name || '').toLowerCase().includes(query);
    const cityMatch = (v.city || '').toLowerCase().includes(query);
    const deptMatch = (v.department || '').toLowerCase().includes(query);
    const textMatch = nameMatch || cityMatch || deptMatch;

    const matchesDept = !selectedDept || v.department === selectedDept;
    const matchesCity = !selectedCity || v.city === selectedCity;

    const matchesWifi = !filterWifi || v.has_wifi;
    const matches4g = !filter4g || v.has_4g_5g;
    const matchesLimiter = !filterLimiter || v.has_limiteur_son;
    const matchesSmoke = !filterSmoke || v.has_detecteur_fumee;

    return textMatch && matchesDept && matchesCity && matchesWifi && matches4g && matchesLimiter && matchesSmoke;
  });

  const blacklistedVenues = filteredVenues.filter(v => v.is_blacklisted);
  const activeFilteredVenues = filteredVenues.filter(v => !v.is_blacklisted);
  const incompleteVenues = activeFilteredVenues.filter(v => !v.is_complete || (v.venue_photos?.length === 0 && !v.notes));
  const completeVenues = activeFilteredVenues.filter(v => v.is_complete && (v.venue_photos?.length > 0 || v.notes));

  // Sectorization group
  // Grouping structure: Department -> City -> Venues
  const groupedVenues = {};
  const listToGroup = 
    activeTab === 'blacklist' ? blacklistedVenues : 
    activeTab === 'incomplete' ? incompleteVenues : 
    activeFilteredVenues;

  listToGroup.forEach(v => {
    const dept = v.department || 'Non spécifié';
    const city = v.city || 'Non spécifié';
    if (!groupedVenues[dept]) groupedVenues[dept] = {};
    if (!groupedVenues[dept][city]) groupedVenues[dept][city] = [];
    groupedVenues[dept][city].push(v);
  });

  const handleOpenForm = (venue = null) => {
    setAiSuggestion(null);
    setSearchingAI(false);

    if (venue) {
      setEditingVenue(venue);
      setVenueForm({
        name: venue.name || '',
        department: venue.department || '',
        city: venue.city || '',
        notes: venue.notes || '',
        notes_observation: venue.notes_observation || '',
        notes_accessibilite: venue.notes_accessibilite || '',
        rating_accessibilite: venue.rating_accessibilite || 0,
        notes_technique: venue.notes_technique || '',
        notes_lumiere: venue.notes_lumiere || '',
        has_limiteur_son: !!venue.has_limiteur_son,
        has_detecteur_fumee: !!venue.has_detecteur_fumee,
        has_no_limiteur_ni_detecteur: !!venue.has_no_limiteur_ni_detecteur,
        has_wifi: !!venue.has_wifi,
        has_4g_5g: !!venue.has_4g_5g,
        type_lieu: venue.type_lieu || '',
        capacite_min: venue.capacite_min !== undefined && venue.capacite_min !== null ? venue.capacite_min : '',
        capacite_max: venue.capacite_max !== undefined && venue.capacite_max !== null ? venue.capacite_max : '',
        tarif_indicatif: venue.tarif_indicatif || '',
        infos_annuaire: venue.infos_annuaire || '',
        lien_annuaire: venue.lien_annuaire || '',
        telephone: venue.telephone || '',
        venue_photos: venue.venue_photos || [],
        is_complete: venue.is_complete !== undefined ? venue.is_complete : true,
        is_blacklisted: !!venue.is_blacklisted,
        blacklist_reason: venue.blacklist_reason || ''
      });

      const deptKey = detectDeptKey(venue.department);
      setFormDeptKey(deptKey);
      if (deptKey && deptKey !== 'Autre') {
        setFormCityKey(venue.city || '');
        setManualCity('');
        setManualDept('');
      } else {
        setFormCityKey('Autre');
        setManualDept(venue.department || '');
        setManualCity(venue.city || '');
      }
    } else {
      setEditingVenue(null);
      setVenueForm({
        name: '',
        department: '',
        city: '',
        notes: '',
        notes_observation: '',
        notes_accessibilite: '',
        rating_accessibilite: 0,
        notes_technique: '',
        notes_lumiere: '',
        has_limiteur_son: false,
        has_detecteur_fumee: false,
        has_no_limiteur_ni_detecteur: false,
        has_wifi: false,
        has_4g_5g: false,
        type_lieu: '',
        capacite_min: '',
        capacite_max: '',
        tarif_indicatif: '',
        infos_annuaire: '',
        lien_annuaire: '',
        telephone: '',
        venue_photos: [],
        is_complete: true,
        is_blacklisted: false,
        blacklist_reason: ''
      });
      setFormDeptKey('');
      setFormCityKey('');
      setManualDept('');
      setManualCity('');
    }
    setIsFormOpen(true);
  };

  const handleSearchAI = async () => {
    const finalDept = formDeptKey === 'Autre' ? manualDept : (formDeptKey ? (formDeptKey.includes(' - ') ? formDeptKey.split(' - ')[1] : formDeptKey.split(' (')[0]) : '');
    const finalCity = (formDeptKey !== 'Autre' && formCityKey !== 'Autre') ? formCityKey : manualCity;

    if (!venueForm.name) {
      toast.error('Veuillez saisir au moins le nom de la salle.');
      return;
    }

    try {
      setSearchingAI(true);
      setAiSuggestion(null);
      const response = await axios.post(`${API_BASE_URL}/venues/suggest`, {
        name: venueForm.name,
        city: finalCity,
        department: finalDept
      });
      if (response.data) {
        setAiSuggestion(response.data);
        if (response.data.found) {
          toast.success('Lieu trouvé sur Google Maps via l\'IA ! ✨');
        } else {
          toast.info('Aucune correspondance exacte trouvée sur internet, voici une proposition.');
        }
      }
    } catch (err) {
      console.error('Error fetching AI suggestion:', err);
      toast.error('Erreur lors de la recherche par l\'IA.');
    } finally {
      setSearchingAI(false);
    }
  };

  const handleApplySuggestion = (suggestion) => {
    if (!suggestion) return;

    // Set Name and Notes
    setVenueForm(prev => {
      const extraNotes = `📍 Adresse : ${suggestion.suggestedAddress || ''}, ${suggestion.suggestedPostalCode || ''} ${suggestion.suggestedCity || ''}\n🌐 Site web : ${suggestion.website || 'Non renseigné'}\n📝 Description : ${suggestion.description || ''}`;
      return {
        ...prev,
        name: suggestion.suggestedName || prev.name,
        notes: prev.notes ? `${prev.notes}\n\n${extraNotes}` : extraNotes
      };
    });

    // Detect Department and City
    const deptKey = detectDeptKey(suggestion.suggestedDepartment);
    if (deptKey && deptKey !== 'Autre') {
      setFormDeptKey(deptKey);
      setFormCityKey(suggestion.suggestedCity || '');
      setManualCity('');
      setManualDept('');
    } else {
      setFormDeptKey('Autre');
      setFormCityKey('Autre');
      setManualDept(suggestion.suggestedDepartment || '');
      setManualCity(suggestion.suggestedCity || '');
    }

    toast.success('Informations appliquées avec succès ! 🎉');
    setAiSuggestion(null);
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    const finalDept = (formDeptKey === 'Autre' ? manualDept : (formDeptKey ? (formDeptKey.includes(' - ') ? formDeptKey.split(' - ')[1] : formDeptKey.split(' (')[0]) : '')) || venueForm.department || '';
    const finalCity = (formDeptKey !== 'Autre' && formCityKey && formCityKey !== 'Autre') ? formCityKey : (manualCity || venueForm.city || '');

    if (!venueForm.name || !finalDept || !finalCity) {
      toast.error('Veuillez remplir le nom de la salle, la ville et le département.');
      return;
    }

    try {
      const payload = { 
        ...venueForm,
        department: finalDept,
        city: finalCity
      };

      // Respect explicitly chosen is_complete if set, otherwise auto-calculate
      if (venueForm.is_complete !== undefined) {
        payload.is_complete = !!venueForm.is_complete;
      } else if (
        payload.venue_photos?.length > 0 || 
        payload.notes?.trim() || 
        payload.notes_observation?.trim() || 
        payload.notes_accessibilite?.trim() || 
        payload.notes_technique?.trim() || 
        payload.notes_lumiere?.trim() ||
        payload.rating_accessibilite > 0
      ) {
        payload.is_complete = true;
      }

      if (editingVenue) {
        await axios.put(`${API_BASE_URL}/venues/${editingVenue.id}`, payload);
        toast.success('Lieu de réception mis à jour !');
      } else {
        await axios.post(`${API_BASE_URL}/venues`, payload);
        toast.success('Nouveau lieu de réception créé !');
      }
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving venue:', err);
      toast.error('Erreur lors de l\'enregistrement.');
    }
  };

  const handleDeleteVenue = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu de réception ?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/venues/${id}`);
      toast.success('Lieu de réception supprimé.');
      loadData();
    } catch (err) {
      console.error('Error deleting venue:', err);
      toast.error('Erreur lors de la suppression.');
    }
  };

  const handleValidateVenue = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/venues/${id}`, {
        is_complete: true
      });
      toast.success('Lieu validé et publié sur le catalogue public !');
      loadData();
    } catch (err) {
      console.error('Error validating venue:', err);
      toast.error('Erreur lors de la validation.');
    }
  };

  const handleValidateAllVenues = async () => {
    if (!window.confirm('Voulez-vous passer toutes les salles à compléter en validées ?')) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/venues/validate-all`);
      toast.success(`${res.data.count} salle(s) validée(s) avec succès !`);
      loadData();
    } catch (err) {
      console.error('Error validating all venues:', err);
      toast.error('Erreur lors de la validation.');
    }
  };

  // ══════════ EXPORTATION EXCEL (.xlsx) ══════════
  const handleExportVenuesToExcel = (scope = 'all') => {
    const target = scope === 'all' ? resolvedVenues : filteredVenues;
    if (!target || target.length === 0) {
      toast.warning("Aucune salle de réception à exporter.");
      return;
    }

    try {
      const rows = target.map(v => {
        return {
          "Nom de la Salle / Lieu": v.name || "",
          "Ville": v.city || "À préciser",
          "Département": v.department || "À préciser",
          "Statut de la Fiche": (v.is_complete && (v.venue_photos?.length > 0 || v.notes)) ? "Complète" : "À compléter",
          "Limiteur de Son": v.has_limiteur_son ? "Oui" : "Non",
          "Détecteur de Fumée": v.has_detecteur_fumee ? "Oui" : "Non",
          "Sans Limiteur ni Détecteur": v.has_no_limiteur_ni_detecteur ? "Oui" : "Non",
          "Wifi Disponible": v.has_wifi ? "Oui" : "Non",
          "Réseau 4G / 5G": v.has_4g_5g ? "Oui" : "Non",
          "Note Accessibilité (/5)": v.rating_accessibilite > 0 ? v.rating_accessibilite : "",
          "Accessibilité & PMR": v.notes_accessibilite || "",
          "Observations Générales": v.notes_observation || "",
          "Spécificités Techniques": v.notes_technique || "",
          "Éclairage & Lumière": v.notes_lumiere || "",
          "Autres Notes & Remarques": v.notes || "",
          "Liste Noire": v.is_blacklisted ? `Oui (${v.blacklist_reason || 'Raison non spécifiée'})` : "Non",
          "Type de lieu": v.type_lieu || "",
          "Capacité min": v.capacite_min !== undefined && v.capacite_min !== null ? v.capacite_min : "",
          "Capacité max": v.capacite_max !== undefined && v.capacite_max !== null ? v.capacite_max : "",
          "Tarif indicatif": v.tarif_indicatif || "",
          "Infos annuaire": v.infos_annuaire || "",
          "Lien fiche annuaire": v.lien_annuaire || "",
          "Téléphone": v.telephone || ""
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-taille et largeurs de colonnes professionnelles correspondant aux 23 colonnes
      ws['!cols'] = [
        { wch: 32 }, // 1. Nom de la Salle / Lieu
        { wch: 20 }, // 2. Ville
        { wch: 18 }, // 3. Département
        { wch: 18 }, // 4. Statut de la Fiche
        { wch: 16 }, // 5. Limiteur de Son
        { wch: 18 }, // 6. Détecteur de Fumée
        { wch: 24 }, // 7. Sans Limiteur ni Détecteur
        { wch: 16 }, // 8. Wifi Disponible
        { wch: 16 }, // 9. Réseau 4G / 5G
        { wch: 22 }, // 10. Note Accessibilité (/5)
        { wch: 35 }, // 11. Accessibilité & PMR
        { wch: 40 }, // 12. Observations Générales
        { wch: 35 }, // 13. Spécificités Techniques
        { wch: 35 }, // 14. Éclairage & Lumière
        { wch: 35 }, // 15. Autres Notes & Remarques
        { wch: 18 }, // 16. Liste Noire
        { wch: 22 }, // 17. Type de lieu
        { wch: 15 }, // 18. Capacité min
        { wch: 15 }, // 19. Capacité max
        { wch: 20 }, // 20. Tarif indicatif
        { wch: 35 }, // 21. Infos annuaire
        { wch: 35 }, // 22. Lien fiche annuaire
        { wch: 18 }  // 23. Téléphone
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lieux de Réception");

      const today = new Date().toISOString().split('T')[0];
      const filename = `lieux_reception_rkey_${scope === 'all' ? 'tous' : 'selection'}_${today}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Fichier Excel de ${target.length} salle(s) exporté avec succès !`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Erreur lors de l'export Excel:", err);
      toast.error("Erreur lors de la génération du fichier Excel : " + err.message);
    }
  };

  // ══════════ IMPORTATION DIRECTE CSV & EXCEL ══════════
  const processRawGrid = (rawGrid, sourceFilename = "fichier_importe", manualMapping = null) => {
    if (!rawGrid || rawGrid.length < 2) {
      toast.error("Le fichier semble vide ou ne contient aucune ligne de données.");
      return;
    }

    setRawGridData(rawGrid);

    // Trouver la ligne d'en-tête (première ligne contenant au moins 2 cellules non vides)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawGrid.length, 10); i++) {
      const nonEmpties = (rawGrid[i] || []).filter(c => c !== null && c !== undefined && String(c).trim() !== "");
      if (nonEmpties.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const rawHeaders = (rawGrid[headerRowIdx] || []).map(h => String(h || "").trim());
    const validHeaders = rawHeaders.filter(Boolean);
    setDetectedHeaders(validHeaders);

    const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    const findBestHeader = (keywords) => {
      for (const kw of keywords) {
        const normKw = norm(kw);
        const match = rawHeaders.find(h => {
          const normH = norm(h);
          return normH === normKw || normH.includes(normKw) || normKw.includes(normH);
        });
        if (match) return match;
      }
      return "";
    };

    const currentMapping = manualMapping || {
      nom: findBestHeader(["nom de la salle / lieu", "nom de la salle", "nom du lieu", "nom salle", "lieu de reception", "salle de reception", "salle", "nom", "lieu", "etablissement", "titre"]),
      ville: findBestHeader(["ville", "commune", "city", "localite", "village", "agglomeration"]),
      departement: findBestHeader(["departement", "département", "dept", "dpt", "cp", "codepostal", "code postal", "code_postal"]),
      statut: findBestHeader(["statut de la fiche", "statut fiche", "statut"]),
      limiteur: findBestHeader(["limiteur de son", "limiteur", "sonometre", "decibel", "db"]),
      detecteur: findBestHeader(["detecteur de fumee", "détecteur de fumée", "detecteur", "fumee", "fumée", "incendie"]),
      sans_limiteur: findBestHeader(["sans limiteur ni détecteur", "sans limiteur ni detecteur", "sans limiteur", "pas de limiteur", "aucun limiteur"]),
      wifi: findBestHeader(["wifi disponible", "wifi", "wi-fi", "internet"]),
      reseau: findBestHeader(["réseau 4g / 5g", "reseau 4g / 5g", "réseau 4g", "reseau 4g", "4g", "5g", "mobile", "couverture 4g"]),
      rating_access: findBestHeader(["note accessibilité (/5)", "note accessibilite (/5)", "note accessibilité", "note accessibilite", "note acces", "rating", "etoiles"]),
      accessibilite: findBestHeader(["accessibilité & pmr", "accessibilite & pmr", "accessibilite", "accessibilité", "acces", "pmr", "escalier", "entree"]),
      observations: findBestHeader(["observations générales", "observations generales", "observations", "observation", "remarques generales", "avis"]),
      technique: findBestHeader(["spécificités techniques", "specificites techniques", "technique", "fiche technique", "puissance", "electricite", "sonorisation"]),
      lumiere: findBestHeader(["éclairage & lumière", "eclairage & lumiere", "lumiere", "lumière", "eclairage", "éclairage", "light"]),
      notes: findBestHeader(["autres notes & remarques", "autres notes", "notes", "note", "commentaires", "commentaire", "remarques", "remarque", "infos", "divers"]),
      blacklist: findBestHeader(["liste noire", "blacklist", "liste_noire"]),
      type_lieu: findBestHeader(["type de lieu", "type lieu", "type", "categorie"]),
      capacite_min: findBestHeader(["capacité min", "capacite min", "capacité min.", "capacite min.", "min personnes", "min pers"]),
      capacite_max: findBestHeader(["capacité max", "capacite max", "capacité max.", "capacite max.", "max personnes", "max pers", "capacité", "capacite"]),
      tarif_indicatif: findBestHeader(["tarif indicatif", "tarif", "prix indicatif", "prix", "budget"]),
      infos_annuaire: findBestHeader(["infos annuaire", "info annuaire", "description annuaire", "annuaire"]),
      lien_annuaire: findBestHeader(["lien fiche annuaire", "lien annuaire", "fiche annuaire", "site web", "site internet", "url", "lien"]),
      telephone: findBestHeader(["téléphone", "telephone", "tel", "contact téléphone", "contact"])
    };

    setColumnMapping(currentMapping);

    const parseBool = (val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        return s === 'true' || s === 'oui' || s === '1' || s === 'yes' || s === 'vrai';
      }
      return !!val;
    };

    const parsed = [];

    for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
      const row = rawGrid[r];
      if (!row || row.length === 0) continue;

      const valByHeader = {};
      rawHeaders.forEach((h, colIdx) => {
        if (h) {
          const cellVal = row[colIdx];
          valByHeader[h] = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : "";
        }
      });

      // 1. Extraction Nom
      let name = "";
      if (currentMapping.nom && valByHeader[currentMapping.nom]) {
        name = valByHeader[currentMapping.nom];
      } else {
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const val = String(row[colIdx] || "").trim();
          if (val.length >= 2 && !/^\d+$/.test(val) && !val.includes("@")) {
            name = val;
            break;
          }
        }
      }

      if (!name || name.length < 2) continue;

      // 2. Extraction Ville
      let city = "";
      if (currentMapping.ville && valByHeader[currentMapping.ville]) {
        city = valByHeader[currentMapping.ville];
      }

      // 3. Extraction Département
      let dept = "";
      if (currentMapping.departement && valByHeader[currentMapping.departement]) {
        dept = valByHeader[currentMapping.departement];
      }

      // Normalisation du département si code postal ou numéro
      if (dept) {
        const resolvedDept = detectDeptKey(dept);
        if (resolvedDept && resolvedDept !== 'Autre') {
          dept = resolvedDept;
        } else if (/^\d{2}/.test(dept)) {
          const code = dept.substring(0, 2);
          for (const d of FRENCH_DEPARTMENTS) {
            if (d.code === code) {
              dept = d.name;
              break;
            }
          }
        }
      }

      // 4. Extraction autres champs
      const notes = currentMapping.notes && valByHeader[currentMapping.notes] ? valByHeader[currentMapping.notes] : "";
      const notes_observation = currentMapping.observations && valByHeader[currentMapping.observations] ? valByHeader[currentMapping.observations] : "";
      const notes_accessibilite = currentMapping.accessibilite && valByHeader[currentMapping.accessibilite] ? valByHeader[currentMapping.accessibilite] : "";
      const rating_accessibilite = currentMapping.rating_access && valByHeader[currentMapping.rating_access] ? (Number(valByHeader[currentMapping.rating_access]) || 0) : 0;
      const notes_technique = currentMapping.technique && valByHeader[currentMapping.technique] ? valByHeader[currentMapping.technique] : "";
      const notes_lumiere = currentMapping.lumiere && valByHeader[currentMapping.lumiere] ? valByHeader[currentMapping.lumiere] : "";

      const has_limiteur_son = parseBool(currentMapping.limiteur ? valByHeader[currentMapping.limiteur] : false);
      const has_detecteur_fumee = parseBool(currentMapping.detecteur ? valByHeader[currentMapping.detecteur] : false);
      const has_no_limiteur_ni_detecteur = parseBool(currentMapping.sans_limiteur ? valByHeader[currentMapping.sans_limiteur] : false);
      const has_wifi = parseBool(currentMapping.wifi ? valByHeader[currentMapping.wifi] : false);
      const has_4g_5g = parseBool(currentMapping.reseau ? valByHeader[currentMapping.reseau] : false);

      const type_lieu = currentMapping.type_lieu && valByHeader[currentMapping.type_lieu] ? valByHeader[currentMapping.type_lieu] : "";
      const capacite_min = currentMapping.capacite_min && valByHeader[currentMapping.capacite_min] ? (Number(valByHeader[currentMapping.capacite_min]) || valByHeader[currentMapping.capacite_min]) : "";
      const capacite_max = currentMapping.capacite_max && valByHeader[currentMapping.capacite_max] ? (Number(valByHeader[currentMapping.capacite_max]) || valByHeader[currentMapping.capacite_max]) : "";
      const tarif_indicatif = currentMapping.tarif_indicatif && valByHeader[currentMapping.tarif_indicatif] ? valByHeader[currentMapping.tarif_indicatif] : "";
      const infos_annuaire = currentMapping.infos_annuaire && valByHeader[currentMapping.infos_annuaire] ? valByHeader[currentMapping.infos_annuaire] : "";
      const lien_annuaire = currentMapping.lien_annuaire && valByHeader[currentMapping.lien_annuaire] ? valByHeader[currentMapping.lien_annuaire] : "";
      const telephone = currentMapping.telephone && valByHeader[currentMapping.telephone] ? valByHeader[currentMapping.telephone] : "";
      const is_blacklisted = parseBool(currentMapping.blacklist ? valByHeader[currentMapping.blacklist] : false);

      const rawStatut = (currentMapping.statut && valByHeader[currentMapping.statut] ? valByHeader[currentMapping.statut] : "").toLowerCase();
      const isCompleteFromStatut = rawStatut.includes('complète') || rawStatut.includes('complete');
      const isComplete = rawStatut ? isCompleteFromStatut : ((city && city !== 'À préciser') && (dept && dept !== 'À préciser'));

      // 5. Dédoublonnage intelligent & Détection des doutes
      const normName = norm(name);
      const normCity = norm(city);

      let existingMatch = null;
      let hasDoubt = false;
      let doubtReason = '';
      let candidates = [];

      const GENERIC_VENUE_TERMS = ['salledesfetes', 'sallepolyvalente', 'foyerrural', 'complexe', 'restaurant', 'hotel', 'auberge', 'domaine', 'chateau', 'mairie'];

      // A. Match certain 100% : Nom normalisé identique ET Ville identique
      if (normCity && normCity !== 'apreciser') {
        const exactCityMatch = venues.find(v => {
          const vCityNorm = norm(v.city);
          return norm(v.name) === normName && (vCityNorm === normCity || vCityNorm === 'apreciser');
        });
        if (exactCityMatch) {
          existingMatch = exactCityMatch;
        }
      }

      // B. Si non trouvé : Nom identique exact
      if (!existingMatch && normName.length >= 4) {
        const sameNameVenues = venues.filter(v => norm(v.name) === normName);
        if (sameNameVenues.length === 1) {
          const v = sameNameVenues[0];
          const vCityNorm = norm(v.city);
          const isGeneric = GENERIC_VENUE_TERMS.some(term => normName.includes(term));
          if (normCity && normCity !== 'apreciser' && vCityNorm && vCityNorm !== 'apreciser' && normCity !== vCityNorm) {
            existingMatch = v;
            hasDoubt = true;
            doubtReason = `Même nom mais ville différente (${city} vs ${v.city})`;
            candidates = sameNameVenues;
          } else if (isGeneric && (!normCity || normCity === 'apreciser' || !vCityNorm || vCityNorm === 'apreciser')) {
            existingMatch = v;
            hasDoubt = true;
            doubtReason = `Nom générique fréquent sans ville précise`;
            candidates = sameNameVenues;
          } else {
            existingMatch = v;
          }
        } else if (sameNameVenues.length > 1) {
          const matchedByCity = sameNameVenues.find(v => norm(v.city) === normCity);
          if (matchedByCity) {
            existingMatch = matchedByCity;
          } else {
            existingMatch = sameNameVenues[0];
            hasDoubt = true;
            doubtReason = `Plusieurs lieux portent ce nom (${sameNameVenues.map(c => c.city).join(', ')})`;
            candidates = sameNameVenues;
          }
        }
      }

      // C. Match partiel / inclusion forte dans la même ville
      if (!existingMatch && normCity && normCity !== 'apreciser') {
        const sameCityVenues = venues.filter(v => norm(v.city) === normCity);
        for (const v of sameCityVenues) {
          const vNorm = norm(v.name);
          if (vNorm.length >= 5 && normName.length >= 5) {
            if (vNorm.includes(normName) || normName.includes(vNorm)) {
              existingMatch = v;
              const lenDiff = Math.abs(vNorm.length - normName.length);
              if (lenDiff > 4) {
                hasDoubt = true;
                doubtReason = `Nom proche dans la même ville ("${v.name}")`;
                candidates.push(v);
              }
              break;
            }
          }
        }
      }

      // D. Forte ressemblance de mots-clés
      if (!existingMatch && normName.length >= 7) {
        for (const v of venues) {
          const vNorm = norm(v.name);
          const vCityNorm = norm(v.city);
          const wordsName = normName.split(/\s+/).filter(w => w.length >= 4 && !['salle', 'fetes', 'reception', 'domaine', 'chateau'].includes(w));
          const wordsV = vNorm.split(/\s+/).filter(w => w.length >= 4 && !['salle', 'fetes', 'reception', 'domaine', 'chateau'].includes(w));
          if (wordsName.length > 0 && wordsV.length > 0) {
            const shared = wordsName.filter(w => wordsV.includes(w));
            if (shared.length >= 2 || (shared.length === 1 && wordsName.length === 1 && wordsV.length === 1 && shared[0].length >= 6)) {
              existingMatch = v;
              hasDoubt = true;
              doubtReason = `Forte ressemblance avec "${v.name}" (${v.city})`;
              candidates.push(v);
              break;
            }
          }
        }
      }

      parsed.push({
        id: `venue_import_${Date.now()}_${parsed.length}`,
        name,
        city: city || 'À préciser',
        department: dept || 'À préciser',
        notes,
        notes_observation,
        notes_accessibilite,
        rating_accessibilite,
        notes_technique,
        notes_lumiere,
        has_limiteur_son,
        has_detecteur_fumee,
        has_no_limiteur_ni_detecteur,
        has_wifi,
        has_4g_5g,
        type_lieu,
        capacite_min,
        capacite_max,
        tarif_indicatif,
        infos_annuaire,
        lien_annuaire,
        telephone,
        is_complete: isComplete,
        is_blacklisted,
        isExisting: !!existingMatch,
        hasDoubt,
        doubtReason,
        candidates,
        existingVenue: existingMatch ? { id: existingMatch.id, name: existingMatch.name, city: existingMatch.city, department: existingMatch.department } : null,
        userAction: existingMatch ? 'update' : 'create',
        selectedExistingId: existingMatch ? existingMatch.id : '',
        isIncomplete: !isComplete
      });
    }

    if (parsed.length === 0) {
      setShowColumnMapper(true);
      toast.warning("Aucune salle n'a pu être extraite. Vérifiez les colonnes et sélectionnez la colonne du Nom ci-dessous.");
      return;
    }

    setParsedVenues(parsed);
    setImportRawFilename(sourceFilename);
    setImportStep('preview');
    toast.success(`📊 ${parsed.length} salles détectées et analysées avec succès !`);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        
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
        console.error("Error reading file as array:", err);
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

  const handlePasteSubmit = () => {
    if (!importPastedText || !importPastedText.trim()) {
      toast.error("Veuillez coller le texte de votre fichier CSV.");
      return;
    }
    try {
      const wb = XLSX.read(importPastedText, { type: 'string', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rawGrid.length > 0) {
        processRawGrid(rawGrid, "texte_colle.csv");
        return;
      }
    } catch (e) {
      console.warn("XLSX string parse failed, attempting split fallback:", e);
    }

    const lines = importPastedText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;
    const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const rawGrid = lines.map(line => line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim()));
    processRawGrid(rawGrid, "texte_colle.csv");
  };

  const handleConfirmImport = async () => {
    if (!parsedVenues || parsedVenues.length === 0) {
      toast.warning("Aucune salle à importer.");
      return;
    }

    try {
      setIsImporting(true);
      const payload = {
        venues: parsedVenues.map(v => ({
          name: v.name,
          city: v.city,
          department: v.department,
          notes: v.notes,
          notes_observation: v.notes_observation,
          notes_accessibilite: v.notes_accessibilite,
          rating_accessibilite: v.rating_accessibilite,
          notes_technique: v.notes_technique,
          notes_lumiere: v.notes_lumiere,
          has_limiteur_son: v.has_limiteur_son,
          has_detecteur_fumee: v.has_detecteur_fumee,
          has_no_limiteur_ni_detecteur: v.has_no_limiteur_ni_detecteur,
          has_wifi: v.has_wifi,
          has_4g_5g: v.has_4g_5g,
          type_lieu: v.type_lieu,
          capacite_min: v.capacite_min,
          capacite_max: v.capacite_max,
          tarif_indicatif: v.tarif_indicatif,
          infos_annuaire: v.infos_annuaire,
          lien_annuaire: v.lien_annuaire,
          telephone: v.telephone,
          is_complete: v.is_complete,
          is_blacklisted: v.is_blacklisted,
          existingId: v.selectedExistingId || v.existingVenue?.id,
          targetAction: v.userAction || (v.isExisting ? 'update' : 'create')
        })),
        updateExisting: updateExistingInVenues
      };

      const res = await axios.post(`${API_BASE_URL}/venues/import-csv-excel`, payload);
      if (res.data && res.data.success) {
        toast.success(res.data.message || `${res.data.addedCount} nouveaux lieux ajoutés, ${res.data.updatedCount} salles existantes mises à jour !`);
        setShowImportModal(false);
        setImportStep('upload');
        setParsedVenues([]);
        setImportPastedText('');
        await loadData();
      } else {
        toast.error("Une erreur est survenue lors de l'enregistrement des lieux.");
      }
    } catch (err) {
      console.error("Error confirming venues import:", err);
      toast.error(err.response?.data?.error || "Erreur lors de l'import : " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFromContracts = async () => {
    if (!window.confirm('Voulez-vous analyser tous vos contrats pour importer de nouveaux lieux de réception ?')) return;
    try {
      setImportingFromContracts(true);
      const response = await axios.post(`${API_BASE_URL}/venues/import-all`);
      toast.success(`${response.data.importedCount} nouveaux lieux importés avec succès !`);
      loadData();
    } catch (err) {
      console.error('Error importing from contracts:', err);
      toast.error('Erreur lors de l\'importation depuis les contrats.');
    } finally {
      setImportingFromContracts(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    const token = localStorage.getItem('access_token');
    let successCount = 0;
    const uploadedPhotos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/upload/venue-photo`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.url) {
          uploadedPhotos.push({ url: data.url, id: Date.now() + i });
          successCount++;
        }
      } catch (err) {
        console.error('Error uploading photo:', file.name, err);
      }
    }

    if (successCount > 0) {
      setVenueForm(prev => ({
        ...prev,
        venue_photos: [...prev.venue_photos, ...uploadedPhotos]
      }));
      toast.success(`${successCount} photo(s) ajoutée(s) avec succès !`);
    } else {
      toast.error("Erreur lors de l'upload de la/des photo(s).");
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleRemovePhoto = (photoId) => {
    setVenueForm(prev => ({
      ...prev,
      venue_photos: prev.venue_photos.filter(p => p.id !== photoId)
    }));
  };

  // Find duplicates
  const potentialDuplicates = venues.filter(v => v.has_potential_duplicate);

  const handleOpenMergeModal = (venue) => {
    setSelectedMergeTarget(venue.id);
    // Find options in same city with similar name
    const matches = venues.filter(v => v.id !== venue.id && (v.city || '').toLowerCase() === (venue.city || '').toLowerCase());
    setSelectedMergeSources([]);
    setIsMergeModalOpen(true);
  };

  const handleMergeVenues = async () => {
    if (selectedMergeSources.length === 0) {
      toast.error('Veuillez sélectionner au moins un lieu à fusionner.');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/venues/merge`, {
        targetVenueId: selectedMergeTarget,
        sourceVenueIds: selectedMergeSources
      });
      toast.success('Lieux de réception fusionnés avec succès !');
      setIsMergeModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error merging venues:', err);
      toast.error('Erreur lors de la fusion.');
    }
  };

  const getVenueContracts = (venue) => {
    return contracts.filter(c => {
      // Direct ref link
      if (c.client_info?.venue_id === venue.id) return true;
      // Text fallback link
      const locStr = (c.client_info?.event_location || '').toLowerCase();
      const venueName = (venue.name || '').toLowerCase();
      const city = (venue.city || '').toLowerCase();
      return locStr.includes(venueName) && locStr.includes(city);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Black Header Banner */}
      <div className="bg-black text-white py-10 px-6 shadow-md mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-8 h-8 text-indigo-400" />
              <h1 className="text-3xl font-extrabold tracking-tight">Lieux de Réception</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Répertoire centralisé, fiches techniques et synchronisation des salles de réception.
            </p>
            
            <div className="mt-3 flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 w-fit text-xs text-slate-300">
              <span className="font-semibold text-indigo-400 flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Lien de partage public :
              </span>
              <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-slate-400 border border-slate-800 select-all">
                {window.location.origin}/lieux-reception
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950 font-bold transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/lieux-reception`);
                  toast.success('Lien copié dans le presse-papiers !');
                }}
              >
                Copier le lien
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setShowImportModal(true);
                setImportStep('upload');
                setParsedVenues([]);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              Importer CSV / Excel
            </Button>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Exporter en Excel
            </Button>
            <Button 
              onClick={handleImportFromContracts}
              disabled={importingFromContracts}
              className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              {importingFromContracts ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Récolter les lieux des contrats
            </Button>
            <Button 
              onClick={() => handleOpenForm()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un lieu
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Alerts / Duplicate warnings banner */}
        {potentialDuplicates.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-pulse">
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">Doublons potentiels détectés</h4>
                <p className="text-amber-700 text-xs mt-0.5">
                  Certains lieux de réception partagent des noms ou des emplacements très similaires.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-2.5 py-1">
                {potentialDuplicates.length} Salles
              </Badge>
            </div>
          </div>
        )}

        {/* Search and Filters panel */}
        <div className="bg-white rounded-2xl border p-5 mb-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par nom de salle, ville, département..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-slate-200 focus:border-indigo-500 rounded-xl"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Tous les départements</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Toutes les villes</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-sm">
            <span className="font-semibold text-slate-500 self-center">Caractéristiques :</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={filterWifi} onChange={(e) => setFilterWifi(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Wi-Fi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={filter4g} onChange={(e) => setFilter4g(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Réseau 4G/5G</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={filterLimiter} onChange={(e) => setFilterLimiter(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Limiteur de son</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={filterSmoke} onChange={(e) => setFilterSmoke(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Détecteur de fumée</span>
            </label>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b mb-8 gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 font-bold text-sm tracking-wide border-b-2 transition-colors ${
              activeTab === 'list' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tous les Lieux ({activeFilteredVenues.length})
          </button>
          <button
            onClick={() => setActiveTab('incomplete')}
            className={`pb-3 font-bold text-sm tracking-wide border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'incomplete' 
                ? 'border-rose-600 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            À Compléter
            {incompleteVenues.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[11px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                {incompleteVenues.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`pb-3 font-bold text-sm tracking-wide border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'blacklist' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Blacklist
            {blacklistedVenues.length > 0 && (
              <span className="bg-red-100 text-red-700 text-[11px] font-extrabold px-1.5 py-0.5 rounded-full">
                {blacklistedVenues.length}
              </span>
            )}
          </button>

          {activeTab === 'incomplete' && incompleteVenues.length > 0 && (
            <div className="ml-auto pb-2 flex items-center">
              <Button
                size="sm"
                onClick={handleValidateAllVenues}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tout valider ({incompleteVenues.length})
              </Button>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">Chargement des lieux de réception...</p>
          </div>
        ) : listToGroup.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center shadow-sm max-w-xl mx-auto mt-6">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Aucun lieu trouvé</h3>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'blacklist' 
                ? "Il n'y a aucun lieu de réception sur liste noire (blacklisté) pour le moment." 
                : activeTab === 'incomplete'
                ? "Tous les lieux de réception ont des fiches complètes !"
                : "Modifiez vos critères de recherche ou ajoutez un nouveau lieu de réception pour commencer."}
            </p>
            {activeTab === 'list' && (
              <Button onClick={() => handleOpenForm()} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
                Ajouter un lieu
              </Button>
            )}
          </div>
        ) : (
          /* Structured Accordions / Sections (Sectorized by Department -> City) */
          <div className="space-y-8">
            {Object.entries(groupedVenues).map(([dept, citiesMap]) => (
              <div key={dept} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-indigo-900 font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 w-fit">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Département : {dept}
                </div>

                <div className="pl-4 space-y-6 border-l-2 border-indigo-100">
                  {Object.entries(citiesMap).map(([city, hallList]) => (
                    <div key={city} className="space-y-3">
                      <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg uppercase">
                          {city}
                        </span>
                      </h3>

                      <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-2">
                        {hallList.map((venue, idx) => {
                          const venueContracts = getVenueContracts(venue);
                          return (
                            <div key={venue.id} className="pt-2 first:pt-0 flex flex-col gap-1.5 transition-all">
                              <div className="flex items-center justify-between gap-4">
                                {/* Left side / Core details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 
                                      onClick={() => handleOpenForm(venue)}
                                      className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                                    >
                                      {venue.name}
                                    </h4>
                                    {!venue.is_blacklisted && !venue.is_complete && (
                                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] py-0 px-1.5 font-bold">À compléter</Badge>
                                    )}
                                    {!venue.is_blacklisted && venue.is_complete && (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 font-bold">Fiche complète</Badge>
                                    )}
                                    {venue.is_blacklisted && (
                                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] py-0 px-1.5 font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Blacklisté
                                      </Badge>
                                    )}
                                    {venue.type_lieu && (
                                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-medium">
                                        {venue.type_lieu}
                                      </Badge>
                                    )}
                                    {(venue.capacite_max || venue.capacite_min) && (
                                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] py-0 px-1.5 font-medium flex items-center gap-1">
                                        <Users className="w-2.5 h-2.5 text-slate-500" />
                                        {venue.capacite_min && venue.capacite_max ? `${venue.capacite_min} - ${venue.capacite_max} pers.` : `${venue.capacite_max || venue.capacite_min} pers.`}
                                      </Badge>
                                    )}
                                    {venue.has_potential_duplicate && (
                                      <Badge 
                                        onClick={() => handleOpenMergeModal(venue)}
                                        className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] py-0 px-1.5 font-bold cursor-pointer hover:bg-amber-200"
                                      >
                                        Doublon potentiel
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" /> {venue.city} ({venue.department})
                                    </span>
                                    {venue.telephone && (
                                      <span className="text-slate-400 flex items-center gap-1">
                                        • <Phone className="w-2.5 h-2.5" /> {venue.telephone}
                                      </span>
                                    )}
                                    {venue.tarif_indicatif && (
                                      <span className="text-slate-400">
                                        • {venue.tarif_indicatif}
                                      </span>
                                    )}
                                    {venueContracts.length > 0 && (
                                      <span className="text-indigo-600 font-semibold">
                                        • {venueContracts.length} Prestation{venueContracts.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  {venue.venue_photos && venue.venue_photos.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {venue.venue_photos.map((photo, pIdx) => (
                                        <div 
                                          key={photo.id || pIdx} 
                                          className="relative w-12 h-12 rounded-lg border border-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all flex-shrink-0 group"
                                          onClick={() => handleOpenLightbox(venue.venue_photos, pIdx)}
                                        >
                                          <img src={photo.url} className="w-full h-full object-cover" alt="Lieu" />
                                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye className="w-3.5 h-3.5 text-white" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {!venue.is_blacklisted && !venue.is_complete && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidateVenue(venue.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[10px] px-2 flex items-center gap-1 rounded-lg"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Valider
                                    </Button>
                                  )}
                                  <Button 
                                    onClick={() => handleOpenForm(venue)}
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                    title="Modifier"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Blacklist reason display if blacklisted */}
                              {venue.is_blacklisted && venue.blacklist_reason && (
                                <div className="text-[11px] text-rose-700 bg-rose-50/50 border border-rose-100/50 rounded-lg p-2 whitespace-pre-wrap leading-relaxed flex items-start gap-1.5 mt-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-rose-950">Motif de la blacklist :</strong> {venue.blacklist_reason}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over / Modal for Venue Creation & Editing */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              {editingVenue ? 'Modifier la fiche du lieu de réception' : 'Ajouter un lieu de réception'}
            </DialogTitle>
            <DialogDescription>
              Fiche technique complète du lieu structurée dans l'ordre d'importation standard (23 rubriques).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenue} className="space-y-4 py-3">
            {/* 1. Nom de la Salle / Lieu */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div className="flex justify-between items-center">
                <Label htmlFor="venue-name" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">1</span>
                  Nom de la Salle / Lieu *
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSearchAI}
                  disabled={searchingAI || !venueForm.name}
                  className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1.5"
                >
                  {searchingAI ? (
                    <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                  )}
                  Compléter par IA
                </Button>
              </div>
              <Input
                id="venue-name"
                placeholder="Ex: Domaine de l'Île, Château du Grand-Rupt, Salle Polyvalente..."
                value={venueForm.name}
                onChange={(e) => setVenueForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="h-10 text-sm font-medium bg-white"
              />
            </div>

            {/* 2. Ville */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div className="flex justify-between items-center">
                <Label htmlFor="form-city-input" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">2</span>
                  Ville *
                </Label>
                {loadingCities && (
                  <span className="text-[10px] text-indigo-600 animate-pulse flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    Chargement des communes...
                  </span>
                )}
              </div>
              <div className="relative" ref={cityDropdownRef}>
                <Input
                  id="form-city-input"
                  placeholder="Tapez le nom de la ville ou commune..."
                  value={formCityKey && formCityKey !== 'Autre' ? formCityKey : (manualCity || venueForm.city || citySearchQuery)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCitySearchQuery(val);
                    setManualCity(val);
                    setVenueForm(prev => ({ ...prev, city: val }));
                    if (formDeptKey && formDeptKey !== 'Autre') {
                      setIsCityDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (formDeptKey && formDeptKey !== 'Autre') {
                      setIsCityDropdownOpen(true);
                    }
                  }}
                  className="w-full pr-10 h-10 font-medium text-slate-700 bg-white"
                  required
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>

                {isCityDropdownOpen && filteredCities.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 animate-fadeIn">
                    {filteredCities.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setFormCityKey(c);
                          setCitySearchQuery(c);
                          setManualCity(c);
                          setVenueForm(prev => ({ ...prev, city: c }));
                          setIsCityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-50 flex justify-between items-center ${formCityKey === c ? 'bg-indigo-50/60 text-indigo-600 font-semibold' : 'text-slate-700'}`}
                      >
                        <span>{c}</span>
                        {formCityKey === c && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Département */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="form-dept-select" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">3</span>
                Département *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  id="form-dept-select"
                  value={formDeptKey || detectDeptKey(venueForm.department) || (venueForm.department ? 'Autre' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormDeptKey(val);
                    if (val === 'Autre') {
                      setVenueForm(prev => ({ ...prev, department: manualDept || '' }));
                    } else if (val) {
                      setVenueForm(prev => ({ ...prev, department: val }));
                      setManualDept('');
                    } else {
                      setVenueForm(prev => ({ ...prev, department: '' }));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 h-10 font-medium text-slate-700 cursor-pointer"
                  required
                >
                  <option value="">-- Choisir un département (France) --</option>
                  {FRENCH_DEPARTMENTS.filter(d => d.code).map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                  <option value="Autre">Autre département (Saisie manuelle)...</option>
                </select>

                {(formDeptKey === 'Autre' || (!FRENCH_DEPARTMENTS.some(d => d.name === venueForm.department) && venueForm.department)) && (
                  <Input
                    id="manual-dept-input"
                    placeholder="Préciser le département (ex: Paris, Gironde...)"
                    value={manualDept || venueForm.department || ''}
                    onChange={(e) => {
                      setManualDept(e.target.value);
                      setVenueForm(prev => ({ ...prev, department: e.target.value }));
                    }}
                    required
                    className="h-10 text-sm font-medium bg-white"
                  />
                )}
              </div>
            </div>

            {/* 4. Statut de la Fiche */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">4</span>
                Statut de la Fiche
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVenueForm(prev => ({ ...prev, is_complete: true }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    venueForm.is_complete
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${venueForm.is_complete ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Fiche Complète
                </button>
                <button
                  type="button"
                  onClick={() => setVenueForm(prev => ({ ...prev, is_complete: false }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    !venueForm.is_complete
                      ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-1 ring-amber-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${!venueForm.is_complete ? 'text-amber-600' : 'text-slate-400'}`} />
                  À compléter
                </button>
              </div>
            </div>

            {/* 5, 6, 7. Limiteur de Son, Détecteur de Fumée, Sans Limiteur ni Détecteur */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">5-7</span>
                Contraintes Sonores & Détecteurs
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 5. Limiteur de Son */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none text-xs transition-all ${venueForm.has_limiteur_son ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">5</span>
                  <input
                    type="checkbox"
                    checked={venueForm.has_limiteur_son}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_limiteur_son: e.target.checked, has_no_limiteur_ni_detecteur: false }))}
                    className="rounded text-indigo-600 shrink-0"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Limiteur de Son</span>
                </label>

                {/* 6. Détecteur de Fumée */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none text-xs transition-all ${venueForm.has_detecteur_fumee ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">6</span>
                  <input
                    type="checkbox"
                    checked={venueForm.has_detecteur_fumee}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_detecteur_fumee: e.target.checked, has_no_limiteur_ni_detecteur: false }))}
                    className="rounded text-indigo-600 shrink-0"
                  />
                  <Flame className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Détecteur de Fumée</span>
                </label>

                {/* 7. Sans Limiteur ni Détecteur */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none text-xs transition-all ${venueForm.has_no_limiteur_ni_detecteur ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">7</span>
                  <input
                    type="checkbox"
                    checked={venueForm.has_no_limiteur_ni_detecteur}
                    onChange={(e) => setVenueForm(prev => ({
                      ...prev,
                      has_no_limiteur_ni_detecteur: e.target.checked,
                      has_limiteur_son: e.target.checked ? false : prev.has_limiteur_son,
                      has_detecteur_fumee: e.target.checked ? false : prev.has_detecteur_fumee
                    }))}
                    className="rounded text-emerald-600 shrink-0"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sans Limiteur ni Détecteur</span>
                </label>
              </div>
            </div>

            {/* 8 & 9. Wifi Disponible & Réseau 4G / 5G */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">8-9</span>
                Connectivité & Réseaux
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 8. Wifi Disponible */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none text-xs transition-all ${venueForm.has_wifi ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">8</span>
                  <input
                    type="checkbox"
                    checked={venueForm.has_wifi}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_wifi: e.target.checked }))}
                    className="rounded text-indigo-600 shrink-0"
                  />
                  <Wifi className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Wifi Disponible</span>
                </label>

                {/* 9. Réseau 4G / 5G */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none text-xs transition-all ${venueForm.has_4g_5g ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">9</span>
                  <input
                    type="checkbox"
                    checked={venueForm.has_4g_5g}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_4g_5g: e.target.checked }))}
                    className="rounded text-indigo-600 shrink-0"
                  />
                  <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Réseau 4G / 5G</span>
                </label>
              </div>
            </div>

            {/* 10. Note Accessibilité (/5) */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">10</span>
                  Note Accessibilité (/5)
                </Label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setVenueForm(prev => ({ ...prev, rating_accessibilite: prev.rating_accessibilite === star ? 0 : star }))}
                      className="focus:outline-none transition-transform active:scale-90 p-0.5"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= venueForm.rating_accessibilite
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-extrabold text-amber-700 ml-2 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                    {venueForm.rating_accessibilite > 0 ? `${venueForm.rating_accessibilite} / 5` : 'Non noté'}
                  </span>
                </div>
              </div>
            </div>

            {/* 11. Accessibilité & PMR */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-notes-accessibilite" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">11</span>
                Accessibilité & PMR
              </Label>
              <Textarea
                id="venue-notes-accessibilite"
                placeholder="Ex: Accès PMR de plain-pied, rampe d'accès, ascenseur, sanitaires adaptés PMR..."
                value={venueForm.notes_accessibilite}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_accessibilite: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 12. Observations Générales */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-notes-observation" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">12</span>
                Observations Générales
              </Label>
              <Textarea
                id="venue-notes-observation"
                placeholder="Ex: Stationnement facile, à proximité de l'église, propriétaire agréable, parc arboré..."
                value={venueForm.notes_observation}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_observation: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 13. Spécificités Techniques */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-notes-technique" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">13</span>
                Spécificités Techniques
              </Label>
              <Textarea
                id="venue-notes-technique"
                placeholder="Ex: Puissance électrique disponible (32A Triphasé), hauteur sous plafond, scène, accès traiteur..."
                value={venueForm.notes_technique}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_technique: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 14. Éclairage & Lumière */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-notes-lumiere" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">14</span>
                Éclairage & Lumière
              </Label>
              <Textarea
                id="venue-notes-lumiere"
                placeholder="Ex: Lumières réglables en intensité (variateurs), éclairage indirect, projecteurs de scène intégrés..."
                value={venueForm.notes_lumiere}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_lumiere: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 15. Autres Notes & Remarques */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-notes" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">15</span>
                Autres Notes & Remarques
              </Label>
              <Textarea
                id="venue-notes"
                placeholder="Ex: Tarifs traiteurs, contacts régisseurs, code portail, consignes de fin de soirée, ménage..."
                value={venueForm.notes}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 16. Liste Noire */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              venueForm.is_blacklisted 
                ? 'bg-rose-50 border-rose-300 shadow-xs' 
                : 'bg-slate-50/70 border-slate-200/80'
            } space-y-2.5`}>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">16</span>
                <input
                  type="checkbox"
                  checked={venueForm.is_blacklisted}
                  onChange={(e) => setVenueForm(prev => ({ 
                    ...prev, 
                    is_blacklisted: e.target.checked,
                    blacklist_reason: e.target.checked ? prev.blacklist_reason : ''
                  }))}
                  className="rounded text-rose-600 focus:ring-rose-500 border-slate-300 shrink-0"
                />
                <AlertTriangle className={`w-4 h-4 ${venueForm.is_blacklisted ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className={venueForm.is_blacklisted ? 'text-rose-950 font-extrabold' : 'text-slate-700'}>
                  Liste Noire (Blacklist)
                </span>
              </label>

              {venueForm.is_blacklisted && (
                <div className="space-y-1.5 animate-fadeIn pl-7">
                  <Label htmlFor="venue-blacklist-reason" className="text-[11px] font-bold text-rose-900">
                    Motif de la mise sur liste noire *
                  </Label>
                  <Textarea
                    id="venue-blacklist-reason"
                    placeholder="Précisez la raison détaillée de la blacklist de ce lieu..."
                    value={venueForm.blacklist_reason}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, blacklist_reason: e.target.value }))}
                    required={venueForm.is_blacklisted}
                    rows={2}
                    className="bg-white border-rose-200 text-rose-900 placeholder:text-rose-300 text-xs"
                  />
                </div>
              )}
            </div>

            {/* 17. Type de lieu */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-type-lieu" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">17</span>
                Type de lieu
              </Label>
              <Input
                id="venue-type-lieu"
                placeholder="Ex: Domaine, Château, Salle des fêtes, Grange rénovée, Restaurant, Hôtel..."
                value={venueForm.type_lieu}
                onChange={(e) => setVenueForm(prev => ({ ...prev, type_lieu: e.target.value }))}
                list="types-lieux-suggestions"
                className="h-10 text-sm font-medium bg-white"
              />
              <datalist id="types-lieux-suggestions">
                <option value="Domaine" />
                <option value="Château" />
                <option value="Salle des fêtes" />
                <option value="Grange rénovée" />
                <option value="Restaurant" />
                <option value="Hôtel" />
                <option value="Auberge" />
                <option value="Salle polyvalente" />
                <option value="Péniche" />
                <option value="Manoir" />
                <option value="Chapiteau / Barnum" />
              </datalist>
            </div>

            {/* 18 & 19. Capacité min et Capacité max */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 18. Capacité min */}
                <div className="space-y-1.5">
                  <Label htmlFor="venue-capacite-min" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">18</span>
                    Capacité min
                  </Label>
                  <div className="relative">
                    <Input
                      id="venue-capacite-min"
                      type="number"
                      min="0"
                      placeholder="Ex: 50"
                      value={venueForm.capacite_min}
                      onChange={(e) => setVenueForm(prev => ({ ...prev, capacite_min: e.target.value }))}
                      className="h-10 text-sm font-medium bg-white pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">pers.</span>
                  </div>
                </div>

                {/* 19. Capacité max */}
                <div className="space-y-1.5">
                  <Label htmlFor="venue-capacite-max" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">19</span>
                    Capacité max
                  </Label>
                  <div className="relative">
                    <Input
                      id="venue-capacite-max"
                      type="number"
                      min="0"
                      placeholder="Ex: 250"
                      value={venueForm.capacite_max}
                      onChange={(e) => setVenueForm(prev => ({ ...prev, capacite_max: e.target.value }))}
                      className="h-10 text-sm font-medium bg-white pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">pers.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 20. Tarif indicatif */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-tarif-indicatif" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">20</span>
                Tarif indicatif
              </Label>
              <Input
                id="venue-tarif-indicatif"
                placeholder="Ex: 1 500 €, 2 800 € / weekend, Sur devis..."
                value={venueForm.tarif_indicatif}
                onChange={(e) => setVenueForm(prev => ({ ...prev, tarif_indicatif: e.target.value }))}
                className="h-10 text-sm font-medium bg-white"
              />
            </div>

            {/* 21. Infos annuaire */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-infos-annuaire" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">21</span>
                Infos annuaire
              </Label>
              <Textarea
                id="venue-infos-annuaire"
                placeholder="Ex: Informations publiques destinées à l'annuaire, formule clé en main, hébergements sur place..."
                value={venueForm.infos_annuaire}
                onChange={(e) => setVenueForm(prev => ({ ...prev, infos_annuaire: e.target.value }))}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            {/* 22. Lien fiche annuaire */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-lien-annuaire" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">22</span>
                Lien fiche annuaire
              </Label>
              <div className="flex gap-2">
                <Input
                  id="venue-lien-annuaire"
                  type="url"
                  placeholder="Ex: https://mariages.net/... ou https://domaine-exemple.com"
                  value={venueForm.lien_annuaire}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, lien_annuaire: e.target.value }))}
                  className="h-10 text-sm font-medium bg-white flex-1"
                />
                {venueForm.lien_annuaire && (
                  <a
                    href={venueForm.lien_annuaire.startsWith('http') ? venueForm.lien_annuaire : `https://${venueForm.lien_annuaire}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 h-10 bg-white hover:bg-slate-100 text-indigo-600 rounded-lg flex items-center justify-center transition-colors border border-slate-200"
                    title="Ouvrir le lien"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* 23. Téléphone */}
            <div className="space-y-1.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label htmlFor="venue-telephone" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">23</span>
                Téléphone
              </Label>
              <div className="relative">
                <Input
                  id="venue-telephone"
                  type="tel"
                  placeholder="Ex: 03 88 00 00 00 ou 06 12 34 56 78"
                  value={venueForm.telephone}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, telephone: e.target.value }))}
                  className="h-10 text-sm font-medium bg-white pl-9"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* History of Prestations associated with this venue (if editing) */}
            {editingVenue && (
              <div className="space-y-2.5 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Prestations réalisées dans ce lieu ({getVenueContracts(editingVenue).length})
                  </Label>
                </div>
                {getVenueContracts(editingVenue).length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {getVenueContracts(editingVenue).map((c) => {
                      const clientName = c.client_info?.name || c.client_name || "Client";
                      const eventDate = c.client_info?.event_date || "—";
                      return (
                        <div key={c.id} className="flex justify-between items-center text-xs bg-white border border-slate-100 p-2.5 rounded-lg shadow-xs">
                          <span className="font-semibold text-slate-800">{clientName}</span>
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {eventDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Aucune prestation enregistrée pour ce lieu.</p>
                )}
              </div>
            )}

            {/* Gallery Photos */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-slate-500" /> Galerie Photos
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {venueForm.venue_photos.map((p, pIdx) => (
                  <div key={p.id} className="relative aspect-video rounded-lg border overflow-hidden bg-slate-100 group">
                    <img src={p.url} alt="Venue" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenLightbox(venueForm.venue_photos, pIdx)}
                        className="bg-indigo-600 text-white p-1 rounded-full shadow hover:bg-indigo-700"
                        title="Aperçu"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(p.id)}
                        className="bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Multiple Photos Upload Trigger */}
                <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors bg-white">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5 text-indigo-500" />
                      <span className="text-[10px] text-slate-600 font-bold mt-1">Ajouter des photos</span>
                    </>
                  )}
                </label>

                {/* Direct Camera Capture Trigger */}
                <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-colors bg-white">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-emerald-500" />
                      <span className="text-[10px] text-slate-600 font-bold mt-1">Prendre une photo</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-3 pt-4 border-t">
              {editingVenue ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold w-full sm:w-auto"
                  onClick={async () => {
                    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce lieu de réception ? Cette action est irréversible.')) {
                      setIsFormOpen(false);
                      await handleDeleteVenue(editingVenue.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Supprimer ce lieu
                </Button>
              ) : (
                <div className="hidden sm:block" />
              )}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto">Enregistrer</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge Duplicates Modal */}
      <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Combine className="w-5 h-5 text-amber-500" /> Fusionner les doublons
            </DialogTitle>
            <DialogDescription>
              Regroupez plusieurs entrées de salles similaires sous une seule fiche technique unique et mettez à jour tous les contrats existants d'un coup !
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-indigo-900">Lieu cible conservé :</p>
              <p className="text-sm font-extrabold text-indigo-950 mt-1">
                {venues.find(v => v.id === selectedMergeTarget)?.name} ({venues.find(v => v.id === selectedMergeTarget)?.city})
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Sélectionnez les doublons à fusionner :</Label>
              <div className="border rounded-xl max-h-[180px] overflow-y-auto divide-y">
                {venues
                  .filter(v => v.id !== selectedMergeTarget && (v.city || '').toLowerCase() === (venues.find(vt => vt.id === selectedMergeTarget)?.city || '').toLowerCase())
                  .map(v => (
                    <label key={v.id} className="flex items-center gap-2.5 p-3 hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMergeSources.includes(v.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMergeSources(prev => [...prev, v.id]);
                          } else {
                            setSelectedMergeSources(prev => prev.filter(id => id !== v.id));
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{v.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{v.city} - ID: {v.id.slice(0,8)}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsMergeModalOpen(false)}>Annuler</Button>
            <Button type="button" onClick={handleMergeVenues} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Confirmer la fusion ({selectedMergeSources.length} Salles)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Photo Preview Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-slate-950/95 border-none text-white overflow-hidden flex flex-col items-center justify-center min-h-[50vh] max-h-[90vh]">
          {lightboxImages.length > 0 && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header inside lightbox */}
              <div className="flex justify-between items-center p-4 bg-slate-900/85 z-10 w-full text-white border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Photo {lightboxIndex + 1} / {lightboxImages.length}
                </span>
                <div className="flex items-center gap-2">
                  <a 
                    href={lightboxImages[lightboxIndex].url} 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                    title="Télécharger la photo"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => setLightboxOpen(false)} 
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image and navigation */}
              <div className="flex-1 flex items-center justify-between p-6 relative min-h-[350px] max-h-[60vh] overflow-hidden">
                {lightboxImages.length > 1 && (
                  <button
                    onClick={() => setLightboxIndex(prev => (prev === 0 ? lightboxImages.length - 1 : prev - 1))}
                    className="absolute left-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/95 text-white transition-colors border border-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                <div className="w-full h-full flex items-center justify-center">
                  <img 
                    src={lightboxImages[lightboxIndex].url} 
                    alt={`Photo ${lightboxIndex + 1}`} 
                    className="max-w-full max-h-[55vh] object-contain rounded select-none shadow-2xl" 
                  />
                </div>

                {lightboxImages.length > 1 && (
                  <button
                    onClick={() => setLightboxIndex(prev => (prev === lightboxImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/95 text-white transition-colors border border-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Thumbnails strip */}
              {lightboxImages.length > 1 && (
                <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex gap-2 items-center justify-center overflow-x-auto max-w-full">
                  {lightboxImages.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setLightboxIndex(idx)}
                      className={`relative w-12 h-12 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                        idx === lightboxIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG EXPORTATION EXCEL ══════════ */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Exporter les salles en fichier Excel
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Téléchargez la base complète de vos salles et lieux de réception au format Microsoft Excel (.xlsx).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Périmètre des salles à exporter :
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    exportScope === "all"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Toutes les salles</span>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                      {resolvedVenues.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    L'intégralité du répertoire des lieux et fiches techniques
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    exportScope === "filtered"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Salles filtrées</span>
                    <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-bold text-xs">
                      {filteredVenues.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    Seules les salles correspondant à votre recherche ou filtre actif
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-semibold text-slate-800 block">
                📋 Colonnes incluses dans le fichier Excel :
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Nom du lieu, Ville, Département, Statut de la fiche, Limiteur de son, Détecteur de fumée, Sans limiteur, Wifi, Réseau 4G/5G, Note d'accessibilité PMR, Observations générales, Fiche technique, Éclairage, Notes diverses, Nombre de photos, Date d'ajout.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
              className="text-xs sm:w-auto w-full"
            >
              Annuler
            </Button>
            <Button
              onClick={() => handleExportVenuesToExcel(exportScope)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 sm:w-auto w-full shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier Excel (.xlsx)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG IMPORTATION CSV / EXCEL (.xlsx, .csv) ══════════ */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {importStep === 'upload' ? "Importer des salles (CSV ou Excel)" : "Aperçu et gestion des doublons"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  {importStep === 'upload' 
                    ? "Importez un fichier de salles de réception (.xlsx, .xls ou .csv). Dédoublonnage intelligent et mise à jour automatique des fiches existantes."
                    : `Vérifiez les ${parsedVenues.length} salles détectées et confirmez le traitement des doublons avant l'importation.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {importStep === 'upload' ? (
            <div className="space-y-5 py-4">
              {/* Onglets Fichier vs Copier-Coller */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setImportTab('file')}
                  className={`py-2.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
                    importTab === 'file'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Déposer un fichier (.xlsx ou .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('paste')}
                  className={`py-2.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
                    importTab === 'paste'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  <span>Coller le texte CSV directement</span>
                </button>
              </div>

              {importTab === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-emerald-250 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 relative shadow-2xs"
                >
                  <input
                    id="venue-csv-excel-input"
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-600 border border-emerald-100 flex items-center gap-3">
                    <span className="text-3xl">🏛️</span>
                    <span className="text-3xl">📑</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Glissez et déposez votre fichier de salles ici
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Formats acceptés : <strong>.XLSX</strong>, <strong>.XLS</strong> ou <strong>.CSV</strong>.
                      Détection automatique de vos colonnes (Nom de la salle, Ville, Département, Limiteur, etc.).
                    </p>
                  </div>
                  <label
                    htmlFor="venue-csv-excel-input"
                    className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Parcourir mes documents</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="venue-csv-paste-area" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Collez le contenu de vos salles au format CSV :
                  </Label>
                  <Textarea
                    id="venue-csv-paste-area"
                    rows={10}
                    placeholder="Nom;Ville;Departement;Limiteur;Detecteur;Wifi;Notes&#10;Château de l'Ill;La Wantzenau;Bas-Rhin;Non;Oui;Oui;Superbe salle avec parc..."
                    value={importPastedText}
                    onChange={(e) => setImportPastedText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasteSubmit}
                      disabled={!importPastedText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
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
                  {detectedHeaders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowColumnMapper(!showColumnMapper)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 h-7 px-2 font-semibold"
                    >
                      {showColumnMapper ? "Masquer les colonnes" : "Ajuster les colonnes manuellement ⚙️"}
                    </Button>
                  )}
                </div>

                {showColumnMapper && detectedHeaders.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-3">
                    <p className="text-xs text-emerald-950 font-medium">
                      Associez les colonnes de votre fichier aux champs de l'application :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Nom de la salle / Lieu *</Label>
                        <select
                          value={columnMapping.nom || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, nom: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, importRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          <option value="">-- Choisir la colonne Nom --</option>
                          {detectedHeaders.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Ville</Label>
                        <select
                          value={columnMapping.ville || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, ville: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, importRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Choisir la colonne Ville --</option>
                          {detectedHeaders.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">Département</Label>
                        <select
                          value={columnMapping.departement || ""}
                          onChange={(e) => {
                            const updated = { ...columnMapping, departement: e.target.value };
                            setColumnMapping(updated);
                            if (rawGridData.length > 0) processRawGrid(rawGridData, importRawFilename, updated);
                          }}
                          className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Choisir la colonne Département --</option>
                          {detectedHeaders.map((h, i) => (
                            <option key={i} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Étape Aperçu & Validation */
            <div className="space-y-4 py-3">
              {/* Bannière de réassurance et d'explication */}
              <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-xl flex items-start gap-3 text-xs text-indigo-950">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-indigo-950 text-xs">
                    Dédoublonnage intelligent & Protection intégrale de vos données
                  </p>
                  <p className="text-indigo-800 text-[11px] leading-relaxed">
                    Les lieux déjà enregistrés sont <strong>automatiquement mis à jour et enrichis</strong> (vos photos, vos notes et réglages existants ne sont jamais effacés, et aucun doublon n'est créé). En cas d'hésitation ou de doute, l'application vous le signale ci-dessous pour que vous puissiez confirmer l'action d'un clic.
                  </p>
                </div>
              </div>

              {/* Synthèse KPI & Filtres cliquables */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setImportPreviewFilter('all')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    importPreviewFilter === 'all'
                      ? 'bg-slate-200/90 border-slate-400 ring-2 ring-slate-400'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total détecté</span>
                  <span className="text-lg font-extrabold text-slate-900">{parsedVenues.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportPreviewFilter('new')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    importPreviewFilter === 'new'
                      ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400'
                      : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Nouvelles salles</span>
                  <span className="text-lg font-extrabold text-emerald-800">{parsedVenues.filter(v => v.userAction === 'create' && !v.hasDoubt).length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportPreviewFilter('update')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    importPreviewFilter === 'update'
                      ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400'
                      : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Mises à jour auto</span>
                  <span className="text-lg font-extrabold text-blue-800">{parsedVenues.filter(v => v.userAction === 'update' && !v.hasDoubt).length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportPreviewFilter('doubt')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                    importPreviewFilter === 'doubt'
                      ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500'
                      : parsedVenues.some(v => v.hasDoubt)
                      ? 'bg-amber-50 border-amber-300 hover:bg-amber-100/60 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1">
                    {parsedVenues.some(v => v.hasDoubt) && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />}
                    Doutes à valider
                  </span>
                  <span className="text-lg font-extrabold text-amber-950">{parsedVenues.filter(v => v.hasDoubt).length}</span>
                </button>
              </div>

              {/* Barre de filtre d'affichage */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span className="font-medium text-[11px] text-slate-500">
                  Affichage : {importPreviewFilter === 'all' ? 'Toutes les salles' : importPreviewFilter === 'new' ? 'Uniquement les nouvelles salles' : importPreviewFilter === 'update' ? 'Uniquement les mises à jour automatiques' : 'Uniquement les doutes à confirmer'} ({parsedVenues.filter(v => {
                    if (importPreviewFilter === 'new') return v.userAction === 'create' && !v.hasDoubt;
                    if (importPreviewFilter === 'update') return v.userAction === 'update' && !v.hasDoubt;
                    if (importPreviewFilter === 'doubt') return v.hasDoubt;
                    return true;
                  }).length})
                </span>
                {importPreviewFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setImportPreviewFilter('all')}
                    className="text-indigo-600 hover:underline font-semibold text-[11px]"
                  >
                    Voir toutes les salles
                  </button>
                )}
              </div>

              {/* Table d'aperçu */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <div className="bg-slate-100 px-3.5 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b">
                    <div className="col-span-3">Nom dans le fichier</div>
                    <div className="col-span-3">Ville & Département</div>
                    <div className="col-span-2">Équipements & Capacité</div>
                    <div className="col-span-4">Traitement Dédoublonnage</div>
                  </div>

                  {parsedVenues
                    .filter(v => {
                      if (importPreviewFilter === 'new') return v.userAction === 'create' && !v.hasDoubt;
                      if (importPreviewFilter === 'update') return v.userAction === 'update' && !v.hasDoubt;
                      if (importPreviewFilter === 'doubt') return v.hasDoubt;
                      return true;
                    })
                    .slice(0, 80)
                    .map((v) => {
                      const realIndex = parsedVenues.findIndex(pv => pv.id === v.id);
                      return (
                        <div 
                          key={v.id} 
                          className={`px-3.5 py-2.5 grid grid-cols-12 gap-2 items-center transition-colors ${
                            v.hasDoubt 
                              ? 'bg-amber-50/50 hover:bg-amber-50' 
                              : v.userAction === 'skip'
                              ? 'bg-slate-50/60 opacity-60'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 1. Nom */}
                          <div className="col-span-3 font-semibold text-slate-900 truncate" title={v.name}>
                            <span className="block truncate">{v.name}</span>
                            {v.type_lieu && (
                              <span className="text-[10px] text-indigo-600 font-medium">{v.type_lieu}</span>
                            )}
                          </div>

                          {/* 2. Ville & Dép */}
                          <div className="col-span-3 text-slate-600 truncate">
                            <span className="font-medium text-slate-800">{v.city}</span>
                            {v.department && v.department !== 'À préciser' && (
                              <span className="text-slate-400 text-[10px] block truncate">{v.department}</span>
                            )}
                          </div>

                          {/* 3. Équipements & Capacité */}
                          <div className="col-span-2 flex flex-col gap-0.5">
                            {(v.capacite_max || v.capacite_min) && (
                              <span className="text-[10px] font-bold text-slate-700">
                                {v.capacite_max ? `${v.capacite_max} pers.` : `${v.capacite_min} pers.`}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {v.has_wifi && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-50 text-blue-700">Wifi</Badge>}
                              {v.has_4g_5g && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-purple-50 text-purple-700">4G</Badge>}
                              {v.has_limiteur_son && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-rose-50 text-rose-700">Limiteur</Badge>}
                              {v.has_no_limiteur_ni_detecteur && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700">Libre</Badge>}
                            </div>
                          </div>

                          {/* 4. Action & Dédoublonnage */}
                          <div className="col-span-4">
                            {v.hasDoubt ? (
                              <div className="space-y-1 bg-white p-2 rounded-lg border border-amber-300 shadow-2xs">
                                <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-900">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Doute : {v.doubtReason}</span>
                                </div>
                                <select
                                  value={v.userAction}
                                  onChange={(e) => {
                                    const action = e.target.value;
                                    setParsedVenues(prev => prev.map((item, idx) => idx === realIndex ? { ...item, userAction: action } : item));
                                  }}
                                  className="w-full text-[11px] font-bold h-7 rounded border border-amber-300 bg-amber-50 text-amber-950 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                  {v.existingVenue && (
                                    <option value="update">
                                      🔄 Mettre à jour : {v.existingVenue.name} ({v.existingVenue.city})
                                    </option>
                                  )}
                                  <option value="create">✨ Créer comme nouveau lieu séparé</option>
                                  <option value="skip">⛔ Ne pas importer cette ligne</option>
                                </select>
                              </div>
                            ) : v.isExisting ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-bold py-0.5">
                                    🔄 Mise à jour auto
                                  </Badge>
                                  <span className="text-[10px] text-slate-500 truncate" title={`Lieu existant : ${v.existingVenue?.name} (${v.existingVenue?.city})`}>
                                    sur « {v.existingVenue?.name} »
                                  </span>
                                </div>
                                <select
                                  value={v.userAction}
                                  onChange={(e) => {
                                    const action = e.target.value;
                                    setParsedVenues(prev => prev.map((item, idx) => idx === realIndex ? { ...item, userAction: action } : item));
                                  }}
                                  className="w-full text-[10px] h-6 rounded border border-slate-200 bg-white text-slate-700 px-1 font-medium"
                                >
                                  <option value="update">Mettre à jour ce lieu existant (automatique)</option>
                                  <option value="create">Créer plutôt un nouveau lieu distinct</option>
                                  <option value="skip">Ne pas importer cette ligne</option>
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold py-0.5">
                                    ✨ Nouveau lieu
                                  </Badge>
                                  <span className="text-[10px] text-emerald-700 font-medium">Sera créé</span>
                                </div>
                                <select
                                  value={v.userAction}
                                  onChange={(e) => {
                                    const action = e.target.value;
                                    setParsedVenues(prev => prev.map((item, idx) => idx === realIndex ? { ...item, userAction: action } : item));
                                  }}
                                  className="w-full text-[10px] h-6 rounded border border-slate-200 bg-white text-slate-700 px-1 font-medium"
                                >
                                  <option value="create">Créer cette nouvelle salle (automatique)</option>
                                  <option value="skip">Ne pas importer cette ligne</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            {importStep === 'preview' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportStep('upload')}
                  disabled={isImporting}
                  className="sm:w-auto w-full text-xs"
                >
                  ← Choisir un autre fichier
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 sm:w-auto w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Intégration en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmer et importer ces {parsedVenues.length} salles</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
                className="sm:w-auto w-full text-xs"
              >
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
