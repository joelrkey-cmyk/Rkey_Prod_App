import React, { useState, useEffect, useRef } from 'react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';
import { 
  MapPin, Building2, Search, Plus, Edit, Trash2, AlertTriangle, 
  CheckCircle2, Image, Wifi, Smartphone, VolumeX, Flame, 
  ChevronLeft, HelpCircle, Check, Combine, FolderOpen, Info,
  ExternalLink, Calendar, PlusCircle, CheckSquare, X, ArrowUpRight, Star
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';

const API_BASE_URL = '/api';

const GRAND_EST_DEPARTMENTS_CODES = {
  "Bas-Rhin (67)": "67",
  "Haut-Rhin (68)": "68",
  "Marne (51)": "51",
  "Moselle (57)": "57",
  "Meurthe-et-Moselle (54)": "54",
  "Vosges (88)": "88",
  "Meuse (55)": "55",
  "Haute-Marne (52)": "52",
  "Ardennes (08)": "08",
  "Aube (10)": "10"
};

const detectDeptKey = (deptString) => {
  if (!deptString) return '';
  const clean = deptString.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('basrhin') || clean.includes('67')) return 'Bas-Rhin (67)';
  if (clean.includes('hautrhin') || clean.includes('68')) return 'Haut-Rhin (68)';
  if (clean.includes('marne') && !clean.includes('hautemarne')) return 'Marne (51)';
  if (clean.includes('moselle') && !clean.includes('meurthe')) return 'Moselle (57)';
  if (clean.includes('meurthe') || clean.includes('54')) return 'Meurthe-et-Moselle (54)';
  if (clean.includes('vosges') || clean.includes('88')) return 'Vosges (88)';
  if (clean.includes('meuse') && !clean.includes('meurthe')) return 'Meuse (55)';
  if (clean.includes('hautemarne') || clean.includes('52')) return 'Haute-Marne (52)';
  if (clean.includes('ardennes') || clean.includes('08')) return 'Ardennes (08)';
  if (clean.includes('aube') || clean.includes('10')) return 'Aube (10)';
  return 'Autre';
};

export default function VenueApp() {
  const [venues, setVenues] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'incomplete'
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
    venue_photos: [],
    is_complete: true
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
      
      const deptCode = GRAND_EST_DEPARTMENTS_CODES[formDeptKey];
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

  const incompleteVenues = filteredVenues.filter(v => !v.is_complete || (v.venue_photos?.length === 0 && !v.notes));
  const completeVenues = filteredVenues.filter(v => v.is_complete && (v.venue_photos?.length > 0 || v.notes));

  // Sectorization group
  // Grouping structure: Department -> City -> Venues
  const groupedVenues = {};
  const listToGroup = activeTab === 'incomplete' ? incompleteVenues : filteredVenues;

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
        venue_photos: venue.venue_photos || [],
        is_complete: venue.is_complete !== undefined ? venue.is_complete : true
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
        venue_photos: [],
        is_complete: true
      });
      setFormDeptKey('');
      setFormCityKey('');
      setManualDept('');
      setManualCity('');
    }
    setIsFormOpen(true);
  };

  const handleSearchAI = async () => {
    const finalDept = formDeptKey === 'Autre' ? manualDept : (formDeptKey ? formDeptKey.split(' (')[0] : '');
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
    const finalDept = formDeptKey === 'Autre' ? manualDept : (formDeptKey ? formDeptKey.split(' (')[0] : '');
    const finalCity = (formDeptKey !== 'Autre' && formCityKey !== 'Autre') ? formCityKey : manualCity;

    if (!venueForm.name || !finalDept || !finalCity) {
      toast.error('Veuillez remplir le département, la ville et le nom de la salle.');
      return;
    }

    try {
      const payload = { 
        ...venueForm,
        department: finalDept,
        city: finalCity
      };

      // Check if it has notes or photos to decide if complete
      if (
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
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/upload/venue-photo`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.url) {
        setVenueForm(prev => ({
          ...prev,
          venue_photos: [...prev.venue_photos, { url: data.url, id: Date.now() }]
        }));
        toast.success('Photo ajoutée avec succès !');
      } else {
        toast.error('Erreur lors de l\'upload de la photo.');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Erreur lors de l\'upload.');
    } finally {
      setUploadingPhoto(false);
    }
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
              onClick={handleImportFromContracts}
              disabled={importingFromContracts}
              className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
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
            Tous les Lieux ({completeVenues.length + incompleteVenues.length})
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
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">Chargement des lieux de réception...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center shadow-sm max-w-xl mx-auto mt-6">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Aucun lieu trouvé</h3>
            <p className="text-slate-500 text-sm mt-1">
              Modifiez vos critères de recherche ou ajoutez un nouveau lieu de réception pour commencer.
            </p>
            <Button onClick={() => handleOpenForm()} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
              Ajouter un lieu
            </Button>
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
                            <div key={venue.id} className="pt-2 first:pt-0 flex items-center justify-between gap-4 transition-all">
                              {/* Left side / Core details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 
                                    onClick={() => handleOpenForm(venue)}
                                    className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                                  >
                                    {venue.name}
                                  </h4>
                                  {!venue.is_complete && (
                                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] py-0 px-1.5 font-bold">À compléter</Badge>
                                  )}
                                  {venue.is_complete && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 font-bold">Fiche complète</Badge>
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
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {venue.city} ({venue.department})
                                  {venueContracts.length > 0 && (
                                    <span className="text-slate-400">
                                      • {venueContracts.length} Prestation{venueContracts.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                {!venue.is_complete && (
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              {editingVenue ? 'Modifier la fiche technique' : 'Nouveau lieu de réception'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les détails géographiques et techniques du lieu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenue} className="space-y-6 py-4">
            {/* 1. Département Selection (Grand Est / Autre) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-dept-select" className="text-xs font-bold text-slate-700">Département *</Label>
                <select
                  id="form-dept-select"
                  value={formDeptKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormDeptKey(val);
                    if (val === 'Autre') {
                      setFormCityKey('Autre');
                    } else if (val) {
                      setFormCityKey('');
                    } else {
                      setFormCityKey('');
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 h-10 font-medium text-slate-700 cursor-pointer"
                  required
                >
                  <option value="">-- Choisir un département (Grand Est) --</option>
                  {Object.keys(GRAND_EST_DEPARTMENTS_CODES).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="Autre">Autre (Saisie manuelle)...</option>
                </select>
              </div>

              {/* Manual Department Text Input if 'Autre' is selected */}
              {formDeptKey === 'Autre' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="manual-dept-input" className="text-xs font-bold text-slate-700">Nom du département *</Label>
                  <Input
                    id="manual-dept-input"
                    placeholder="Ex: Paris, Gironde..."
                    value={manualDept}
                    onChange={(e) => setManualDept(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* 2. Ville Selection (Grand Est Cities / Autre) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formDeptKey && formDeptKey !== 'Autre' ? (
                <div className="space-y-1.5 relative" ref={cityDropdownRef}>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="form-city-search" className="text-xs font-bold text-slate-700">Ville *</Label>
                    {loadingCities && (
                      <span className="text-[10px] text-indigo-600 animate-pulse flex items-center gap-1 font-medium">
                        <span className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                        Chargement...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="form-city-search"
                      placeholder={loadingCities ? 'Chargement...' : 'Tapez pour rechercher une ville...'}
                      value={citySearchQuery}
                      onChange={(e) => {
                        setCitySearchQuery(e.target.value);
                        setIsCityDropdownOpen(true);
                      }}
                      onFocus={() => setIsCityDropdownOpen(true)}
                      className="w-full pr-10 h-10 font-medium text-slate-700"
                      disabled={loadingCities}
                      required
                      autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>

                    {isCityDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 animate-fadeIn">
                        {filteredCities.length > 0 ? (
                          filteredCities.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setFormCityKey(c);
                                setCitySearchQuery(c);
                                setIsCityDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 flex justify-between items-center ${formCityKey === c ? 'bg-indigo-50/50 text-indigo-600 font-semibold' : 'text-slate-700'}`}
                            >
                              <span>{c}</span>
                              {formCityKey === c && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-500 italic">
                            Aucune ville correspondante
                          </div>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => {
                            setFormCityKey('Autre');
                            setCitySearchQuery('Autre');
                            setIsCityDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 flex justify-between items-center border-t border-slate-100 font-medium ${formCityKey === 'Autre' ? 'bg-indigo-50/50 text-indigo-600 font-bold' : 'text-slate-500'}`}
                        >
                          <span>Autre (Saisie manuelle)...</span>
                          {formCityKey === 'Autre' && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Manual City input if 'Autre' department is chosen OR 'Autre' city option is chosen */}
              {(formDeptKey === 'Autre' || formCityKey === 'Autre') && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="manual-city-input" className="text-xs font-bold text-slate-700">Nom de la ville *</Label>
                  <Input
                    id="manual-city-input"
                    placeholder="Ex: Mussig, Bordeaux..."
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* 3. Nom de la salle */}
            <div className="space-y-1.5">
              <Label htmlFor="venue-name" className="text-xs font-bold text-slate-700">Nom de la salle / Lieu de réception *</Label>
              <div className="flex gap-2">
                <Input
                  id="venue-name"
                  placeholder="Ex: Domaine de l'Île, Château du Grand-Rupt..."
                  value={venueForm.name}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="flex-1"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-sm text-slate-800">Spécifications Techniques</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={venueForm.has_wifi}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_wifi: e.target.checked }))}
                    className="rounded text-indigo-600"
                  />
                  <span>Wi-Fi disponible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={venueForm.has_4g_5g}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_4g_5g: e.target.checked }))}
                    className="rounded text-indigo-600"
                  />
                  <span>Réseau 4G/5G</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={venueForm.has_limiteur_son}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_limiteur_son: e.target.checked, has_no_limiteur_ni_detecteur: false }))}
                    className="rounded text-indigo-600"
                  />
                  <span>Limiteur de son</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={venueForm.has_detecteur_fumee}
                    onChange={(e) => setVenueForm(prev => ({ ...prev, has_detecteur_fumee: e.target.checked, has_no_limiteur_ni_detecteur: false }))}
                    className="rounded text-indigo-600"
                  />
                  <span>Détecteur de fumée</span>
                </label>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-1.5">
              <Label htmlFor="venue-notes-observation" className="text-xs font-bold text-slate-700">Observations (champ libre)</Label>
              <Textarea
                id="venue-notes-observation"
                placeholder="Ex: Stationnement facile, à proximité de l'église, propriétaire sympa..."
                value={venueForm.notes_observation}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_observation: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Accessibilité */}
            <div className="space-y-2 p-3 bg-slate-50 border rounded-xl">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Accessibilité (Note 1 à 5 ★)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setVenueForm(prev => ({ ...prev, rating_accessibilite: star }))}
                      className="focus:outline-none transition-transform active:scale-95 p-0.5"
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
                  {venueForm.rating_accessibilite > 0 && (
                    <span className="text-xs font-extrabold text-amber-600 ml-1.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {venueForm.rating_accessibilite} / 5
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="venue-notes-accessibilite" className="text-[10px] font-bold text-slate-500">Détails de l'accessibilité (champ libre)</Label>
                <Textarea
                  id="venue-notes-accessibilite"
                  placeholder="Ex: Accès PMR de plain-pied, rampe d'accès, ascenseur..."
                  value={venueForm.notes_accessibilite}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, notes_accessibilite: e.target.value }))}
                  rows={2}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Note technique */}
            <div className="space-y-1.5">
              <Label htmlFor="venue-notes-technique" className="text-xs font-bold text-slate-700">Note technique (champ libre)</Label>
              <Textarea
                id="venue-notes-technique"
                placeholder="Ex: Puissance électrique disponible (32A Triphasé), hauteur sous plafond..."
                value={venueForm.notes_technique}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_technique: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Lumière salle */}
            <div className="space-y-1.5">
              <Label htmlFor="venue-notes-lumiere" className="text-xs font-bold text-slate-700">Lumière salle (champ libre)</Label>
              <Textarea
                id="venue-notes-lumiere"
                placeholder="Ex: Lumières réglables en intensité, éclairage indirect, projecteurs de scène intégrés..."
                value={venueForm.notes_lumiere}
                onChange={(e) => setVenueForm(prev => ({ ...prev, notes_lumiere: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Gallery Uploader */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-slate-500" /> Galerie Photos
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {venueForm.venue_photos.map(p => (
                  <div key={p.id} className="relative aspect-video rounded-lg border overflow-hidden bg-slate-100 group">
                    <img src={p.url} alt="Venue" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p.id)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Upload Trigger card */}
                <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-bold mt-1">Upload</span>
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
    </div>
  );
}
