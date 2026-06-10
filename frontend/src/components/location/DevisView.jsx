// DevisView - Module Location
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import EnvoiView from './EnvoiView';
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin, Paperclip, Loader2 } from 'lucide-react';
import { generateCompleteReservationDocuments, generateWithdrawalSlip, calculateGuaranteeDeposit } from '../../utils/pdfGenerator';
import { 
  DEGRESSION_COEFFICIENTS, 
  DELIVERY_ZONES, 
  getDegressionInfo, 
  calculateDeliveryPrice,
  isWeekendPeriod,
  calculateDeposit,
  calculateGuarantee,
  calculateInstallationCost,
  INSTALLATION_HOURLY_RATE
} from '../../utils/pricingUtils';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Toaster } from '../ui/sonner';
import { API, BACKEND_URL, formatDateLocal, axios } from './helpers';
import { generateQuotePDF, calculateDays } from './devisQuotePdf';

function DevisView({ setCurrentView }) {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [djs, setDjs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [archivingQuotes, setArchivingQuotes] = useState(new Set()); // Track quotes being archived
  const [deletingQuotes, setDeletingQuotes] = useState(new Set()); // Track quotes being deleted
  const [editingQuote, setEditingQuote] = useState(null);
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null, // 'archive' or 'delete'
    quote: null,
    title: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    booking_type: 'client',
    client_id: '',
    dj_id: '',
    start_date: '',
    end_date: '',
    force_weekend: false,
    manual_coefficient: '', // Coefficient personnalisé
    discount_type: 'percent', // 'percent' ou 'fixed'
    discount_percent: 0,
    discount_amount: 0,
    // Nouveaux champs pour forfait livraison
    delivery_zone: '',      // Zone de livraison sélectionnée
    delivery_km: 0,         // Km pour calcul hors zone
    delivery_cost: 0,       // Frais de livraison calculés
    delivery_address: '',   // Adresse de livraison
    // Retour du matériel
    pickup_by_us: false,    // Retrait par nos soins
    pickup_by_client: false, // Le client ramène le matériel
    pickup_address: '',     // Adresse de retrait
    // Frais d'installation (35€/h)
    installation_hours: 0,  // Nombre d'heures
    installation_cost: 0,   // Frais d'installation calculés ou manuels
    installation_manual: 0, // Montant manuel additionnel
    // Acompte et caution (calculés auto mais modifiables)
    deposit_amount: 0,      // Acompte demandé (30% du sous-total)
    guarantee_amount: 0,    // Caution à verser
    trusted_client: false,  // Client de confiance (legacy)
    trusted_no_deposit: false,
    trusted_no_guarantee: false,
    deposit_paid: false,
    deposit_date: '',
    deposit_payment_method: '',
    // Nouveau champ pour dégressivité
    force_weekend: null     // null = auto-détection, true/false = forçage manuel
  });
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [availabilityWarnings, setAvailabilityWarnings] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState({}); // {index: searchTerm}
  const [showSuggestions, setShowSuggestions] = useState({}); // {index: boolean}
  
  // State pour la recherche de client
  const [clientSearch, setClientSearch] = useState('');
  const [isQuickQuote, setIsQuickQuote] = useState(false);
  
  // State pour passer directement à l'envoi d'un devis spécifique
  const [pendingQuoteToSend, setPendingQuoteToSend] = useState(null);
  const [showEnvoiView, setShowEnvoiView] = useState(false);
  const [companySettings, setCompanySettings] = useState({});
  
  const [cgvText, setCgvText] = useState('');
  
  // Filtres pour la liste des devis
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  
  // États pour la gestion des brouillons
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'close' ou null

  // Pièces jointes
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedQuoteForAttachments, setSelectedQuoteForAttachments] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfFilename, setPreviewPdfFilename] = useState('');

  const handleManageAttachments = (quote) => {
    setSelectedQuoteForAttachments(quote);
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

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("category", "Administrative");

      try {
        const response = await fetch(`${API}/quotes/${selectedQuoteForAttachments.id}/documents`, {
          method: "POST",
          headers,
          body: uploadData
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            toast.success(`"${file.name}" a été ajouté avec succès !`);
            
            // local update in modal state
            setSelectedQuoteForAttachments(prev => {
              const updatedDocs = [...(prev.documents || []), result.document];
              return { ...prev, documents: updatedDocs };
            });
            
            // update in parent quotes list
            setQuotes(prevQuotes => {
              return prevQuotes.map(q => {
                if (q.id === selectedQuoteForAttachments.id) {
                  return {
                    ...q,
                    documents: [...(q.documents || []), result.document]
                  };
                }
                return q;
              });
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
  };

  const handlePreviewAttachment = async (doc) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API}/quotes/${selectedQuoteForAttachments.id}/documents/${doc.id}?preview=true`, { headers });
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
      const response = await fetch(`${API}/quotes/${selectedQuoteForAttachments.id}/documents/${docId}`, {
        method: "DELETE",
        headers
      });
      
      if (response.ok) {
        toast.success("Pièce jointe supprimée !");
        
        // local update in modal state
        setSelectedQuoteForAttachments(prev => ({
          ...prev,
          documents: (prev.documents || []).filter(a => a.id !== docId)
        }));
        
        // update in parent quotes list
        setQuotes(prevQuotes => {
          return prevQuotes.map(q => {
            if (q.id === selectedQuoteForAttachments.id) {
              return {
                ...q,
                documents: (q.documents || []).filter(a => a.id !== docId)
              };
            }
            return q;
          });
        });
      } else {
        toast.error("Erreur lors de la suppression de la pièce jointe");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau lors de la suppression");
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchClients();
    fetchDJs();
    fetchEquipment();
    fetchCompanySettings();
  }, []);
  
  // Détecte les modifications dans le formulaire
  useEffect(() => {
    if (showAddForm) {
      // Vérifier si le formulaire a des données saisies
      const hasClientOrDJ = formData.client_id || formData.dj_id;
      const hasDates = formData.start_date || formData.end_date;
      const hasEquipment = selectedEquipment.length > 0 && selectedEquipment.some(eq => eq.equipment_id);
      
      // Le formulaire a des modifications si au moins un de ces éléments est rempli
      setHasUnsavedChanges(hasClientOrDJ || hasDates || hasEquipment);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [showAddForm, formData, selectedEquipment]);

  // Auto-calculate deposit & guarantee when equipment or dates change (only if still at 0)
  useEffect(() => {
    if (!showAddForm || !formData.start_date || !formData.end_date) return;
    const hasEquip = selectedEquipment.some(eq => eq.equipment_id);
    if (!hasEquip) return;

    const summary = calculateLiveTotal();
    const autoDeposit = parseFloat(summary.autoDeposit) || 0;
    const autoGuarantee = parseFloat(summary.autoGuarantee) || 0;

    const updates = {};
    if (formData.deposit_amount === 0 && !formData.trusted_no_deposit && autoDeposit > 0) {
      updates.deposit_amount = autoDeposit;
    }
    if (formData.guarantee_amount === 0 && !formData.trusted_no_guarantee && !formData.trusted_client && autoGuarantee > 0) {
      updates.guarantee_amount = autoGuarantee;
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [selectedEquipment, formData.start_date, formData.end_date]);



  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${BACKEND_URL}/api/global-settings`, { headers: { Authorization: `Bearer ${token}` } });
      setCompanySettings(res.data || {});
      
      // Also fetch CGV for PDF inclusion
      const cgvRes = await axios.get(`${BACKEND_URL}/api/location/settings/cgv`);
      setCgvText(cgvRes.data?.cgv || '');
    } catch (err) {
      console.error('Error fetching company settings or CGV:', err);
    }
  };

  const fetchQuotes = async () => {
    try {
      // Utiliser un header Cache-Control pour forcer le bypass du cache
      // Ajouter le filtre archived=false pour exclure les devis archivés
      const response = await axios.get(`${API}/quotes?archived=false`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      setQuotes(response.data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Erreur lors du chargement des devis');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`);
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchDJs = async () => {
    try {
      const response = await axios.get(`${API}/djs`);
      setDjs(response.data || []);
    } catch (error) {
      console.error('Error fetching DJs:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await axios.get(`${API}/equipment`);
      setEquipment(response.data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const addEquipmentToQuote = () => {
    setSelectedEquipment([...selectedEquipment, { equipment_id: '', quantity: 1 }]);
  };

  const removeEquipmentFromQuote = (index) => {
    setSelectedEquipment(selectedEquipment.filter((_, i) => i !== index));
    // Nettoyer les states de recherche pour cet index
    const newSearch = { ...equipmentSearch };
    const newSuggestions = { ...showSuggestions };
    delete newSearch[index];
    delete newSuggestions[index];
    setEquipmentSearch(newSearch);
    setShowSuggestions(newSuggestions);
  };

  const updateEquipmentInQuote = (index, field, value) => {
    const updated = [...selectedEquipment];
    updated[index][field] = value;
    setSelectedEquipment(updated);
    
    // Check availability when quantity or equipment changes
    if (field === 'quantity' || field === 'equipment_id') {
      checkAvailability(updated);
    }
  };

  const checkAvailability = (equipmentList) => {
    const warnings = [];
    equipmentList.forEach((item, index) => {
      if (item.equipment_id) {
        const eq = equipment.find(e => e.id === item.equipment_id);
        if (eq && eq.quantity < item.quantity) {
          warnings.push(`${eq.name}: ${item.quantity >= 999999 ? '∞' : item.quantity} demandé, ${eq.quantity >= 999999 ? '∞' : eq.quantity} disponible`);
        }
      }
    });
    setAvailabilityWarnings(warnings);
  };

  // Fonction pour filtrer les équipements selon la recherche
  const getFilteredEquipment = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    return equipment.filter(eq => {
      if (eq.maintenance_status && eq.maintenance_status !== 'operational') return false;
      
      const matchName = eq.name?.toLowerCase().includes(lowerSearch);
      const matchReference = eq.reference?.toLowerCase().includes(lowerSearch);
      const matchCategory = eq.category?.toLowerCase().includes(lowerSearch);
      
      return matchName || matchReference || matchCategory;
    }).slice(0, 10); // Limiter à 10 résultats
  };

  // Fonction pour sélectionner un équipement depuis les suggestions
  const selectEquipmentFromSearch = (index, equipmentId) => {
    updateEquipmentInQuote(index, 'equipment_id', equipmentId);
    setEquipmentSearch({ ...equipmentSearch, [index]: '' });
    setShowSuggestions({ ...showSuggestions, [index]: false });
  };

  // Fonction pour obtenir le nom d'un équipement sélectionné
  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.name : '';
  };

  const resetForm = () => {
    setFormData({
      booking_type: 'client',
      client_id: '',
      dj_id: '',
      start_date: '',
      end_date: '',
      discount_type: 'percent',
      discount_percent: 0,
      discount_amount: 0,
      delivery_zone: '',
      delivery_km: 0,
      delivery_cost: 0,
      installation_hours: 0,
      installation_cost: 0,
      installation_manual: 0,
      deposit_amount: 0,
      guarantee_amount: 0,
      trusted_client: false,
      trusted_no_deposit: false,
      trusted_no_guarantee: false,
      deposit_paid: false,
      deposit_date: '',
      deposit_payment_method: '',
      force_weekend: null
    });
    setSelectedEquipment([]);
    setAvailabilityWarnings([]);
    setShowAddForm(false);
    setEditingQuote(null);
    setIsQuickQuote(false);
    setClientSearch('');
  };

  const handleSubmit = async (e, exportPDF = false) => {
    e.preventDefault();
    
    const isClientBooking = formData.booking_type === 'client';
    const requiredId = isClientBooking ? formData.client_id : formData.dj_id;
    
    // Pour les devis rapides, on n'exige pas de client/dj
    if (!isQuickQuote && !requiredId) {
      toast.error('Veuillez sélectionner un client ou un DJ');
      return;
    }
    
    if (!formData.start_date || !formData.end_date || selectedEquipment.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires et sélectionner au moins un équipement');
      return;
    }

    // Validate equipment selection
    const invalidEquipment = selectedEquipment.find(item => !item.equipment_id || item.quantity < 1);
    if (invalidEquipment) {
      toast.error('Veuillez sélectionner un équipement et une quantité valide pour tous les éléments');
      return;
    }

    try {
      setIsLoading(true);
      
      // Préparer les données avec validation
      // Envoyer soit discount_percent soit discount_amount selon le type de remise
      let finalDiscountPercent = 0;
      let finalDiscountAmount = 0;
      
      if (formData.discount_type === 'percent') {
        finalDiscountPercent = formData.discount_percent || 0;
      } else {
        // Remise fixe : envoyer le montant directement (arrondi à 2 décimales)
        finalDiscountAmount = Math.round((formData.discount_amount || 0) * 100) / 100;
      }

      // Calculer les frais de livraison
      const deliveryResult = calculateDeliveryPrice(formData.delivery_zone, formData.delivery_km);
      const finalDeliveryCost = deliveryResult.price || 0;

      // Obtenir les informations de dégressivité pour le calcul côté frontend
      const manualCoef = formData.manual_coefficient ? parseFloat(formData.manual_coefficient) : null;
      const degressionInfo = getDegressionInfo(formData.start_date, formData.end_date, formData.force_weekend, manualCoef);

      // Calculer le sous-total matériel avec dégressivité
      let computedSubtotal = 0;
      selectedEquipment.forEach(item => {
        if (item.equipment_id && item.quantity > 0) {
          const eq = equipment.find(e => e.id === item.equipment_id);
          if (eq) {
            computedSubtotal += eq.daily_price * degressionInfo.coef * item.quantity;
          }
        }
      });

      // Calculer la remise
      let computedDiscount = 0;
      if (formData.discount_type === 'percent') {
        computedDiscount = (computedSubtotal * (finalDiscountPercent || 0)) / 100;
      } else {
        computedDiscount = finalDiscountAmount || 0;
      }

      // Calculer les frais d'installation
      const computedInstallation = calculateInstallationCost(formData.installation_hours || 0) + (formData.installation_manual || 0);

      // Calculer le total final
      const computedTotal = computedSubtotal - computedDiscount + finalDeliveryCost + computedInstallation;

      const quoteData = {
        booking_type: formData.booking_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        discount_percent: finalDiscountPercent,
        discount_amount: finalDiscountAmount,
        delivery_cost: finalDeliveryCost,
        delivery_zone: formData.delivery_zone || '',
        delivery_km: formData.delivery_km || 0,
        delivery_address: formData.delivery_zone ? (formData.delivery_address || '') : '',
        pickup_by_us: formData.pickup_by_us || false,
        pickup_by_client: formData.pickup_by_client || false,
        pickup_address: formData.pickup_address || '',
        installation_hours: formData.installation_hours || 0,
        installation_cost: computedInstallation,
        installation_manual: formData.installation_manual || 0,
        deposit_amount: formData.deposit_amount || 0,
        guarantee_amount: formData.guarantee_amount || 0,
        trusted_client: formData.trusted_client || false,
        trusted_no_deposit: formData.trusted_no_deposit || false,
        trusted_no_guarantee: formData.trusted_no_guarantee || formData.trusted_client || false,
        deposit_paid: formData.deposit_paid || false,
        deposit_date: formData.deposit_paid ? (formData.deposit_date || new Date().toISOString().split('T')[0]) : '',
        deposit_payment_method: formData.deposit_payment_method || '',
        is_quick_quote: isQuickQuote,
        subtotal: Math.round(computedSubtotal * 100) / 100,
        total_amount: Math.round(computedTotal * 100) / 100,
        // Informations de dégressivité
        degression_coefficient: degressionInfo.coef,
        degression_type: degressionInfo.isWeekendDetected ? 'weekend' : degressionInfo.label,
        force_weekend: formData.force_weekend,
        manual_coefficient: formData.manual_coefficient,
        items: selectedEquipment.map(item => ({
          equipment_id: item.equipment_id,
          quantity: parseInt(item.quantity) || 1
        }))
      };

      // Ajouter client_id ou dj_id selon le type (sauf si devis rapide)
      if (formData.booking_type === 'client' && !isQuickQuote) {
        quoteData.client_id = formData.client_id;
        const client = clients.find(c => c.id === formData.client_id);
        quoteData.client_name = client ? (client.company_name || client.name) : formData.client_name || '';
      } else if (formData.booking_type === 'dj') {
        quoteData.dj_id = formData.dj_id;
        const dj = djs.find(d => d.id === formData.dj_id);
        quoteData.dj_name = dj ? dj.name : '';
      }

      console.log('Envoi des données du devis:', quoteData); // Debug log

      let savedQuote = null;
      if (editingQuote) {
        const response = await axios.put(`${API}/quotes/${editingQuote.id}`, quoteData);
        savedQuote = response.data;
        toast.success('Devis mis à jour avec succès');
      } else {
        const response = await axios.post(`${API}/quotes`, quoteData);
        savedQuote = response.data;
        toast.success('Devis créé avec succès');
      }
      
      // Si exportPDF est true, générer le PDF après la sauvegarde
      if (exportPDF && savedQuote) {
        try {
          // Utiliser directement le devis retourné par le serveur au lieu de faire un GET séparé
          await generateQuotePDF(savedQuote, clients, equipment, companySettings, { cgvText });
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          toast.error('Devis sauvegardé mais erreur lors de la génération du PDF');
        }
      }
      
      resetForm();
      await fetchQuotes();
    } catch (error) {
      console.error('Error saving quote:', error);
      console.error('Error details:', error.response?.data); // Log détaillé
      const errorMsg = error.response?.data?.detail || 'Erreur lors de la sauvegarde du devis';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer l'export PDF (sauvegarde + génération PDF)
  const handleExportPDF = async (e) => {
    await handleSubmit(e, true);
  };

  // Fonction pour sauvegarder et envoyer par email
  const handleSaveAndSend = async (e) => {
    e.preventDefault();
    
    const isClientBooking = formData.booking_type === 'client';
    const requiredId = isClientBooking ? formData.client_id : formData.dj_id;
    
    // Pour les devis rapides, on n'exige pas de client/dj
    if (!isQuickQuote && !requiredId) {
      toast.error('Veuillez sélectionner un client ou un DJ');
      return;
    }
    
    if (!formData.start_date || !formData.end_date || selectedEquipment.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires et sélectionner au moins un équipement');
      return;
    }

    // Validate equipment selection
    const invalidEquipment = selectedEquipment.find(item => !item.equipment_id || item.quantity < 1);
    if (invalidEquipment) {
      toast.error('Veuillez sélectionner un équipement et une quantité valide pour tous les éléments');
      return;
    }

    try {
      setIsLoading(true);
      
      // Calculate discount - envoyer soit discount_percent soit discount_amount
      let finalDiscountPercent = 0;
      let finalDiscountAmount = 0;
      
      if (formData.discount_type === 'percent') {
        finalDiscountPercent = formData.discount_percent || 0;
      } else {
        // Remise fixe : envoyer le montant directement (arrondi à 2 décimales)
        finalDiscountAmount = Math.round((formData.discount_amount || 0) * 100) / 100;
      }

      // Calculer les frais de livraison
      const deliveryResult = calculateDeliveryPrice(formData.delivery_zone, formData.delivery_km);
      const finalDeliveryCost = deliveryResult.price || 0;

      // Obtenir les informations de dégressivité
      const manualCoef = formData.manual_coefficient ? parseFloat(formData.manual_coefficient) : null;
      const degressionInfo = getDegressionInfo(formData.start_date, formData.end_date, formData.force_weekend, manualCoef);

      // Calculer les totaux
      let computedSubtotal = 0;
      selectedEquipment.forEach(item => {
        if (item.equipment_id && item.quantity > 0) {
          const eq = equipment.find(e => e.id === item.equipment_id);
          if (eq) { computedSubtotal += eq.daily_price * degressionInfo.coef * item.quantity; }
        }
      });
      let computedDiscount = 0;
      if (formData.discount_type === 'percent') { computedDiscount = (computedSubtotal * (finalDiscountPercent || 0)) / 100; }
      else { computedDiscount = finalDiscountAmount || 0; }
      const computedInstallation = calculateInstallationCost(formData.installation_hours || 0) + (formData.installation_manual || 0);
      const computedTotal = computedSubtotal - computedDiscount + finalDeliveryCost + computedInstallation;

      const quoteData = {
        booking_type: formData.booking_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        discount_percent: finalDiscountPercent,
        discount_amount: finalDiscountAmount,
        delivery_cost: finalDeliveryCost,
        delivery_zone: formData.delivery_zone || '',
        delivery_km: formData.delivery_km || 0,
        delivery_address: formData.delivery_zone ? (formData.delivery_address || '') : '',
        pickup_by_us: formData.pickup_by_us || false,
        pickup_by_client: formData.pickup_by_client || false,
        pickup_address: formData.pickup_address || '',
        installation_hours: formData.installation_hours || 0,
        installation_cost: computedInstallation,
        installation_manual: formData.installation_manual || 0,
        deposit_amount: formData.deposit_amount || 0,
        guarantee_amount: formData.guarantee_amount || 0,
        trusted_client: formData.trusted_client || false,
        trusted_no_deposit: formData.trusted_no_deposit || false,
        trusted_no_guarantee: formData.trusted_no_guarantee || formData.trusted_client || false,
        deposit_paid: formData.deposit_paid || false,
        deposit_date: formData.deposit_paid ? (formData.deposit_date || new Date().toISOString().split('T')[0]) : '',
        deposit_payment_method: formData.deposit_payment_method || '',
        is_quick_quote: isQuickQuote,
        subtotal: Math.round(computedSubtotal * 100) / 100,
        total_amount: Math.round(computedTotal * 100) / 100,
        // Informations de dégressivité
        degression_coefficient: degressionInfo.coef,
        degression_type: degressionInfo.isWeekendDetected ? 'weekend' : degressionInfo.label,
        force_weekend: formData.force_weekend,
        manual_coefficient: formData.manual_coefficient,
        items: selectedEquipment.map(item => ({
          equipment_id: item.equipment_id,
          quantity: parseInt(item.quantity) || 1
        }))
      };

      if (formData.booking_type === 'client' && !isQuickQuote) {
        quoteData.client_id = formData.client_id;
        const client = clients.find(c => c.id === formData.client_id);
        quoteData.client_name = client ? (client.company_name || client.name) : formData.client_name || '';
      } else if (formData.booking_type === 'dj') {
        quoteData.dj_id = formData.dj_id;
        const dj = djs.find(d => d.id === formData.dj_id);
        quoteData.dj_name = dj ? dj.name : '';
      }

      let savedQuote = null;
      if (editingQuote) {
        const response = await axios.put(`${API}/quotes/${editingQuote.id}`, quoteData);
        savedQuote = response.data;
        toast.success('Devis mis à jour avec succès');
      } else {
        const response = await axios.post(`${API}/quotes`, quoteData);
        savedQuote = response.data;
        toast.success('Devis créé avec succès');
      }
      
      // Get client info for email
      const client = clients.find(c => c.id === formData.client_id);
      const clientName = client ? (client.company_name || client.name) : 'Client';
      const clientEmail = client?.email || '';
      
      // Passer à la vue d'envoi avec les données du devis
      setPendingQuoteToSend({
        id: savedQuote.id,
        quote_number: savedQuote.quote_number || savedQuote.id?.slice(0, 8),
        client_name: clientName,
        client_email: clientEmail,
        start_date: savedQuote.start_date,
        end_date: savedQuote.end_date,
        total_amount: savedQuote.total_amount
      });
      
      // Rafraîchir la liste pour que le devis soit visible au retour
      await fetchQuotes();
      
      setShowEnvoiView(true);
      setShowAddForm(false);
      
      resetForm();
    } catch (error) {
      console.error('Error saving quote:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de la sauvegarde du devis';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour sauvegarder en brouillon
  const handleSaveAsDraft = async () => {
    try {
      setIsLoading(true);
      
      // Calculer les frais de livraison
      const deliveryResult = calculateDeliveryPrice(formData.delivery_zone, formData.delivery_km);
      const finalDeliveryCost = deliveryResult.price || 0;

      // Obtenir les informations de dégressivité
      const manualCoef = formData.manual_coefficient ? parseFloat(formData.manual_coefficient) : null;
      const degressionInfo = getDegressionInfo(formData.start_date, formData.end_date, formData.force_weekend, manualCoef);
      
      // Calculer la remise
      let finalDiscountPercent = 0;
      let finalDiscountAmount = 0;
      
      if (formData.discount_type === 'percent') {
        finalDiscountPercent = formData.discount_percent || 0;
      } else {
        finalDiscountAmount = Math.round((formData.discount_amount || 0) * 100) / 100;
      }

      // Calculer les totaux
      let computedSubtotal = 0;
      selectedEquipment.forEach(item => {
        if (item.equipment_id && item.quantity > 0) {
          const eq = equipment.find(e => e.id === item.equipment_id);
          if (eq) { computedSubtotal += eq.daily_price * degressionInfo.coef * item.quantity; }
        }
      });
      let computedDiscount = 0;
      if (formData.discount_type === 'percent') { computedDiscount = (computedSubtotal * (finalDiscountPercent || 0)) / 100; }
      else { computedDiscount = finalDiscountAmount || 0; }
      const computedInstallation = calculateInstallationCost(formData.installation_hours || 0) + (formData.installation_manual || 0);
      const computedTotal = computedSubtotal - computedDiscount + finalDeliveryCost + computedInstallation;

      const quoteData = {
        booking_type: formData.booking_type,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        end_date: formData.end_date || new Date().toISOString().split('T')[0],
        discount_percent: finalDiscountPercent,
        discount_amount: finalDiscountAmount,
        delivery_cost: finalDeliveryCost,
        delivery_zone: formData.delivery_zone || '',
        delivery_km: formData.delivery_km || 0,
        delivery_address: formData.delivery_zone ? (formData.delivery_address || '') : '',
        pickup_by_us: formData.pickup_by_us || false,
        pickup_by_client: formData.pickup_by_client || false,
        pickup_address: formData.pickup_address || '',
        installation_hours: formData.installation_hours || 0,
        installation_cost: computedInstallation,
        installation_manual: formData.installation_manual || 0,
        deposit_amount: formData.deposit_amount || 0,
        guarantee_amount: formData.guarantee_amount || 0,
        trusted_client: formData.trusted_client || false,
        trusted_no_deposit: formData.trusted_no_deposit || false,
        trusted_no_guarantee: formData.trusted_no_guarantee || formData.trusted_client || false,
        deposit_paid: formData.deposit_paid || false,
        deposit_date: formData.deposit_paid ? (formData.deposit_date || new Date().toISOString().split('T')[0]) : '',
        deposit_payment_method: formData.deposit_payment_method || '',
        is_quick_quote: isQuickQuote || (!formData.client_id && !formData.dj_id),
        subtotal: Math.round(computedSubtotal * 100) / 100,
        total_amount: Math.round(computedTotal * 100) / 100,
        degression_coefficient: degressionInfo.coef,
        degression_type: degressionInfo.isWeekendDetected ? 'weekend' : degressionInfo.label,
        force_weekend: formData.force_weekend,
        manual_coefficient: formData.manual_coefficient,
        status: 'Brouillon', // Marquer comme brouillon
        items: selectedEquipment.filter(item => item.equipment_id).map(item => ({
          equipment_id: item.equipment_id,
          quantity: parseInt(item.quantity) || 1
        }))
      };

      // Ajouter client_id ou dj_id selon le type
      if (formData.booking_type === 'client' && formData.client_id) {
        quoteData.client_id = formData.client_id;
        const client = clients.find(c => c.id === formData.client_id);
        quoteData.client_name = client ? (client.company_name || client.name) : formData.client_name || '';
      } else if (formData.booking_type === 'dj' && formData.dj_id) {
        quoteData.dj_id = formData.dj_id;
        const dj = djs.find(d => d.id === formData.dj_id);
        quoteData.dj_name = dj ? dj.name : '';
      }

      // Si aucun équipement sélectionné, créer un devis vide avec un item placeholder
      if (quoteData.items.length === 0) {
        toast.warning('Brouillon sauvegardé sans matériel sélectionné');
      }

      let savedQuote = null;
      if (editingQuote) {
        const response = await axios.put(`${API}/quotes/${editingQuote.id}`, quoteData);
        savedQuote = response.data;
      } else {
        const response = await axios.post(`${API}/quotes`, quoteData);
        savedQuote = response.data;
      }
      
      toast.success('📋 Brouillon sauvegardé ! Vous pourrez le reprendre plus tard.');
      resetForm();
      setShowExitConfirmation(false);
      setPendingAction(null);
      await fetchQuotes();
    } catch (error) {
      console.error('Error saving draft:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de la sauvegarde du brouillon';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la tentative de fermeture du formulaire
  const handleCloseForm = () => {
    if (hasUnsavedChanges && !editingQuote?.status?.includes('Brouillon')) {
      setPendingAction('close');
      setShowExitConfirmation(true);
    } else {
      resetForm();
    }
  };

  // Fonction pour confirmer la sortie sans sauvegarder
  const handleExitWithoutSaving = () => {
    setShowExitConfirmation(false);
    setPendingAction(null);
    resetForm();
  };

  // Exporter un devis existant en PDF depuis la liste (utilise le générateur partagé)
  const handleExportPDFFromList = (quote) => {
    generateQuotePDF(quote, clients, equipment, companySettings, { cgvText });
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    
    // Détecter le type de remise : montant fixe ou pourcentage
    const discountAmount = quote.discount_amount || 0;
    const discountPercent = quote.discount_percent || 0;
    
    let discountType = 'percent';
    let displayDiscountPercent = 0;
    let displayDiscountAmount = 0;
    
    if (discountAmount > 0) {
      // Si discount_amount est défini, c'est une remise fixe
      discountType = 'fixed';
      // Arrondir à 2 décimales pour éviter les erreurs de précision flottante
      displayDiscountAmount = Math.round(discountAmount * 100) / 100;
    } else if (discountPercent > 0) {
      // Sinon c'est une remise en pourcentage
      discountType = 'percent';
      displayDiscountPercent = Math.round(discountPercent * 100) / 100;
    }
    
    setFormData({
      booking_type: quote.booking_type || 'client',
      client_id: quote.client_id || '',
      dj_id: quote.dj_id || '',
      start_date: quote.start_date || '',
      end_date: quote.end_date || '',
      discount_type: discountType,
      discount_percent: displayDiscountPercent,
      discount_amount: displayDiscountAmount,
      // Livraison - restaurer zone et km
      delivery_cost: Math.round((quote.delivery_cost || 0) * 100) / 100,
      delivery_zone: quote.delivery_zone || '',
      delivery_km: quote.delivery_km || 0,
      delivery_address: quote.delivery_address || '',
      // Retour du matériel
      pickup_by_us: quote.pickup_by_us || false,
      pickup_by_client: quote.pickup_by_client || false,
      pickup_address: quote.pickup_address || '',
      // Installation - restaurer heures et montant manuel
      installation_cost: Math.round((quote.installation_cost || 0) * 100) / 100,
      installation_hours: quote.installation_hours || 0,
      installation_manual: Math.round((quote.installation_manual || 0) * 100) / 100,
      // Acompte et caution
      deposit_amount: Math.round((quote.deposit_amount || 0) * 100) / 100,
      guarantee_amount: Math.round((quote.guarantee_amount || 0) * 100) / 100,
      trusted_client: quote.trusted_client || false,
      trusted_no_deposit: quote.trusted_no_deposit || false,
      trusted_no_guarantee: quote.trusted_no_guarantee || quote.trusted_client || false,
      deposit_paid: quote.deposit_paid || false,
      deposit_date: quote.deposit_date || '',
      deposit_payment_method: quote.deposit_payment_method || '',
      // Dégressivité - garder null si c'était null, sinon utiliser la valeur
      force_weekend: quote.force_weekend === true ? true : (quote.force_weekend === false ? false : null),
      manual_coefficient: quote.manual_coefficient || '',
      internal_notes: quote.internal_notes || ''
    });
    setIsQuickQuote(quote.is_quick_quote || false);
    setClientSearch('');
    setSelectedEquipment(quote.items || []);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    const quote = quotes.find(q => q.id === id);
    const displayName = quote?.client_name || quote?.dj_name || 'ce devis';
    setConfirmDialog({
      open: true,
      type: 'delete',
      quote: quote,
      title: 'Supprimer le devis',
      description: `Êtes-vous sûr de vouloir supprimer le devis de "${displayName}" ? Cette action est irréversible.`
    });
  };

  const executeDelete = async (quote) => {
    try {
      setDeletingQuotes(prev => new Set([...prev, quote.id]));
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
      
      await axios.delete(`${API}/quotes/${quote.id}`);
      // Supprimer la réservation associée au devis
      await axios.delete(`${API}/reservations/by-quote/${quote.id}`).catch(err => console.log('Pas de réservation à supprimer', err));
      toast.success('Devis et réservation associée supprimés avec succès');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Erreur lors de la suppression');
      await fetchQuotes();
    } finally {
      setDeletingQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quote.id);
        return newSet;
      });
    }
  };

  const handleArchive = async (quote) => {
    const displayName = quote.client_name || quote.dj_name || 'ce devis';
    setConfirmDialog({
      open: true,
      type: 'archive',
      quote: quote,
      title: 'Archiver le devis',
      description: `Archiver le devis de "${displayName}" ? Le devis et sa réservation associée seront déplacés vers les archives et ne seront plus visibles dans le tableau de bord.`
    });
  };

  const executeArchive = async (quote) => {
    try {
      setArchivingQuotes(prev => new Set([...prev, quote.id]));
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
      
      await axios.patch(`${API}/quotes/${quote.id}/archive`, { is_archived: true });
      toast.success('Devis archivé avec succès');
    } catch (error) {
      console.error('Error archiving quote:', error);
      toast.error('Erreur lors de l\'archivage du devis');
      await fetchQuotes();
    } finally {
      setArchivingQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quote.id);
        return newSet;
      });
    }
  };

  const handleConfirmAction = () => {
    if (confirmDialog.type === 'archive' && confirmDialog.quote) {
      executeArchive(confirmDialog.quote);
    } else if (confirmDialog.type === 'delete' && confirmDialog.quote) {
      executeDelete(confirmDialog.quote);
    }
    setConfirmDialog({ open: false, type: null, quote: null, title: '', description: '' });
  };

  const handleCancelAction = () => {
    setConfirmDialog({ open: false, type: null, quote: null, title: '', description: '' });
  };

  const convertToReservation = async (quoteId) => {
    if (window.confirm('Convertir ce devis en réservation ?')) {
      try {
        setIsLoading(true);
        await axios.post(`${API}/reservations`, { quote_id: quoteId });
        toast.success('Devis converti en réservation avec succès !');
        await fetchQuotes();
      } catch (error) {
        console.error('Error converting quote:', error);
        toast.error('Erreur lors de la conversion en réservation');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      setIsLoading(true);
      
      // Mettre à jour le statut du devis (le backend gère la création/suppression de réservation)
      await axios.patch(`${API}/quotes/${quoteId}/status`, { status: newStatus });
      
      if (newStatus === 'Accepté') {
        toast.success('✅ Devis accepté et réservation synchronisée avec l\'agenda !');
      } else if (newStatus === 'Brouillon' || newStatus === 'En attente') {
        toast.info(`Statut modifié: ${newStatus}. L'agenda est à jour.`);
      } else {
        toast.success(`Statut modifié: ${newStatus}`);
      }
      
      await fetchQuotes();
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast.error('Erreur lors de la modification du statut');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepté':
      case 'accepted':
        return <Badge className="bg-green-600">✅ Accepté</Badge>;
      case 'Brouillon':
        return <Badge className="bg-orange-500">📋 Brouillon</Badge>;
      case 'En attente':
      case 'pending':
      case 'draft':
      default:
        return <Badge className="bg-yellow-600">⏳ En attente</Badge>;
    }
  };

  const calculateTotal = (quote) => {
    // Utiliser total_amount s'il est disponible (calculé par le serveur avec toutes les remises)
    if (quote.total_amount !== undefined && quote.total_amount !== null) {
      return quote.total_amount.toFixed(2);
    }
    
    // Sinon recalculer (fallback pour anciens devis)
    if (!quote.items) return '0.00';
    const subtotal = quote.subtotal || 0;
    
    // Prendre en compte la remise fixe OU le pourcentage
    let discount = 0;
    if (quote.discount_amount && quote.discount_amount > 0) {
      discount = quote.discount_amount;
    } else if (quote.discount_percent && quote.discount_percent > 0) {
      discount = (subtotal * quote.discount_percent) / 100;
    }
    
    const deliveryCost = quote.delivery_cost || 0;
    const installationCost = quote.installation_cost || 0;
    return (subtotal - discount + deliveryCost + installationCost).toFixed(2);
  };

  // Calculer le montant total en temps réel (pendant la saisie) avec dégressivité
  const calculateLiveTotal = () => {
    const days = calculateDays(formData.start_date, formData.end_date);
    
    // Obtenir les informations de dégressivité
    const manualCoef = formData.manual_coefficient ? parseFloat(formData.manual_coefficient) : null;
    const degressionInfo = getDegressionInfo(formData.start_date, formData.end_date, formData.force_weekend, manualCoef);
    
    let subtotal = 0;

    selectedEquipment.forEach(item => {
      if (item.equipment_id && item.quantity > 0) {
        const eq = equipment.find(e => e.id === item.equipment_id);
        if (eq) {
          // Appliquer le coefficient de dégressivité au lieu de multiplier par le nombre de jours
          subtotal += eq.daily_price * degressionInfo.coef * item.quantity;
        }
      }
    });

    // Calculer la remise selon le type
    let discountAmount = 0;
    if (formData.discount_type === 'percent') {
      discountAmount = (subtotal * (formData.discount_percent || 0)) / 100;
    } else {
      discountAmount = formData.discount_amount || 0;
    }
    
    // Calculer les frais de livraison
    const deliveryResult = calculateDeliveryPrice(formData.delivery_zone, formData.delivery_km);
    const deliveryCost = deliveryResult.price || formData.delivery_cost || 0;
    
    // Calculer les frais d'installation (heures × 35€ + montant manuel)
    const installationFromHours = calculateInstallationCost(formData.installation_hours || 0);
    const installationManual = formData.installation_manual || 0;
    const installationCost = installationFromHours + installationManual;
    
    // Calculer acompte et caution automatiques basés sur le sous-total
    const autoDeposit = calculateDeposit(subtotal);
    const autoGuarantee = calculateGuarantee(subtotal);
    
    const total = subtotal - discountAmount + deliveryCost + installationCost;

    return {
      days,
      degressionInfo,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      discountType: formData.discount_type,
      discountValue: formData.discount_type === 'percent' ? formData.discount_percent : formData.discount_amount,
      deliveryCost: deliveryCost.toFixed(2),
      deliveryZone: deliveryResult.zone,
      deliveryCalculation: deliveryResult.calculation,
      installationFromHours: installationFromHours.toFixed(2),
      installationManual: installationManual.toFixed(2),
      installationCost: installationCost.toFixed(2),
      autoDeposit: autoDeposit.toFixed(2),
      autoGuarantee: autoGuarantee.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Fonction pour obtenir le nom d'affichage correct (entreprise ou contact)
  const getClientDisplayName = (quote) => {
    if (quote.booking_type === 'dj') {
      return quote.dj_name || 'N/A';
    }
    
    // Pour les clients, chercher les infos complètes du client
    const client = clients.find(c => c.id === quote.client_id);
    if (client && client.company_name) {
      // Si c'est une entreprise, afficher uniquement le nom de l'entreprise
      return client.company_name;
    }
    
    // Sinon afficher le nom du contact
    return quote.client_name || 'N/A';
  };

  // Fonction pour filtrer les devis selon la recherche et l'année
  const getFilteredQuotes = () => {
    let filtered = [...quotes];
    
    // Filtre par recherche (nom client/entreprise)
    if (searchTerm) {
      filtered = filtered.filter(quote => {
        const displayName = getClientDisplayName(quote).toLowerCase();
        return displayName.includes(searchTerm.toLowerCase());
      });
    }
    
    // Filtre par année
    if (yearFilter !== 'all') {
      filtered = filtered.filter(quote => {
        if (!quote.start_date) return false;
        const quoteYear = new Date(quote.start_date).getFullYear().toString();
        return quoteYear === yearFilter;
      });
    }
    
    return filtered;
  };

  // Obtenir les années disponibles pour le filtre
  const getAvailableYears = () => {
    const years = new Set();
    quotes.forEach(quote => {
      if (quote.start_date) {
        const year = new Date(quote.start_date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Tri décroissant
  };

  // Si showEnvoiView est true, afficher la vue d'envoi
  if (showEnvoiView) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => {
              setShowEnvoiView(false);
              setPendingQuoteToSend(null);
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux devis
          </Button>
        </div>
        <EnvoiView pendingQuoteToSend={pendingQuoteToSend} setPendingQuoteToSend={setPendingQuoteToSend} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Devis</h2>
        <Button 
          onClick={() => setShowAddForm(true)} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau devis
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingQuote ? 'Modifier le devis' : 'Nouveau devis'}</CardTitle>
            <CardDescription>
              Créer un devis pour un client ou un DJ avec sélection d'équipement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Booking Type Selection */}
              <div>
                <Label className="font-semibold mb-2 block">Type de devis *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="booking_type"
                      value="client"
                      checked={formData.booking_type === 'client'}
                      onChange={(e) => setFormData({
                        ...formData, 
                        booking_type: e.target.value,
                        client_id: '',
                        dj_id: ''
                      })}
                      className="mr-2"
                    />
                    Client (Part., Pro, Assoc.)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="booking_type"
                      value="dj"
                      checked={formData.booking_type === 'dj'}
                      onChange={(e) => setFormData({
                        ...formData, 
                        booking_type: e.target.value,
                        client_id: '',
                        dj_id: ''
                      })}
                      className="mr-2"
                    />
                    DJ
                  </label>
                </div>
              </div>

              {/* Client/DJ Selection */}
              {formData.booking_type === 'client' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="client">Client</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={isQuickQuote ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsQuickQuote(!isQuickQuote);
                          if (!isQuickQuote) {
                            setFormData({...formData, client_id: ''});
                            setClientSearch('');
                          }
                        }}
                        className={isQuickQuote ? "bg-amber-500 hover:bg-amber-600" : ""}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Devis rapide
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentView('clients')}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Nouveau
                      </Button>
                    </div>
                  </div>
                  
                  {!isQuickQuote && (
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="🔍 Rechercher ou sélectionner un client..."
                        value={clientSearch || (formData.client_id ? (clients.find(c => c.id === formData.client_id)?.company_name || clients.find(c => c.id === formData.client_id)?.name || '') : '')}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData({...formData, client_id: ''});
                          }
                        }}
                        onFocus={() => setShowSuggestions({...showSuggestions, client: true})}
                        onBlur={() => setTimeout(() => setShowSuggestions({...showSuggestions, client: false}), 200)}
                      />
                      {showSuggestions.client && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                          {clients
                            .filter(client => {
                              if (!clientSearch) return true;
                              const search = clientSearch.toLowerCase();
                              const name = (client.name || '').toLowerCase();
                              const company = (client.company_name || '').toLowerCase();
                              const type = (client.client_type || '').toLowerCase();
                              return name.includes(search) || company.includes(search) || type.includes(search);
                            })
                            .sort((a, b) => {
                              const nameA = (a.company_name || a.name || '').toLowerCase();
                              const nameB = (b.company_name || b.name || '').toLowerCase();
                              return nameA.localeCompare(nameB);
                            })
                            .slice(0, 100)
                            .map((client) => (
                              <div
                                key={client.id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center justify-between"
                                onMouseDown={() => {
                                  setFormData({...formData, client_id: client.id});
                                  setClientSearch(client.company_name || client.name);
                                  setShowSuggestions({...showSuggestions, client: false});
                                }}
                              >
                                <div>
                                  {client.company_name || client.name} {client.is_vip ? '⭐' : ''}
                                  {client.company_name && client.name !== client.company_name && (
                                    <span className="text-gray-400 ml-2">({client.name})</span>
                                  )}
                                </div>
                                <div>
                                  {client.client_type === 'association' ? (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">🤝 Association</span>
                                  ) : (client.client_type === 'entreprise' || (!client.client_type && client.company_name)) ? (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">🏢 Entreprise</span>
                                  ) : (
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full border border-gray-200">👤 Particulier</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          {clients.filter(client => {
                            if (!clientSearch) return true;
                            const search = clientSearch.toLowerCase();
                            const nameMatch = (client.name || '').toLowerCase().includes(search);
                            const companyMatch = (client.company_name || '').toLowerCase().includes(search);
                            const typeMatch = (client.client_type || '').toLowerCase().includes(search);
                            return nameMatch || companyMatch || typeMatch;
                          }).length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">Aucun client trouvé</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isQuickQuote && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                      Mode devis rapide activé - Aucun client ne sera associé
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="dj">DJ *</Label>
                  <select
                    value={formData.dj_id}
                    onChange={(e) => setFormData({...formData, dj_id: e.target.value})}
                    required
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sélectionner un DJ</option>
                    {djs.map((dj) => (
                      <option key={dj.id} value={dj.id}>{dj.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Date de début *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      // Auto-remplir la date de fin avec la même date (toujours)
                      setFormData({
                        ...formData, 
                        start_date: newStartDate,
                        end_date: newStartDate
                      });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Date de fin *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    min={formData.start_date} // Ne peut pas être avant la date de début
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Equipment Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Matériel *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEquipmentToQuote}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                {selectedEquipment.map((item, index) => {
                  const categoryIcons = {
                    'Sonorisation': '🔊',
                    'Éclairage': '💡',
                    'Lumière': '💡',
                    'Vidéo': '📺',
                    'Câbles': '🔌',
                    'Machine FX': '🌫️',
                    'Structure et pieds': '🏗️',
                    'Structure Truss': '🏗️',
                    'DJ': '🎧',
                    'Divers': '🔧',
                    'Packs': '📦'
                  };
                  
                  return (
                    <div key={index} className="flex gap-2 items-center mb-2 p-2 border rounded">
                      <div className="flex-1 relative">
                        {/* Barre de recherche avec autocomplétion et bouton déroulant */}
                        <div className="relative">
                          <div className="flex gap-1">
                            <Input
                              type="text"
                              placeholder="🔍 Rechercher un équipement (nom, référence...)"
                              value={item.equipment_id ? getEquipmentName(item.equipment_id) : (equipmentSearch[index] || '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEquipmentSearch({ ...equipmentSearch, [index]: value });
                                setShowSuggestions({ ...showSuggestions, [index]: value.length >= 2 });
                                if (!value) {
                                  updateEquipmentInQuote(index, 'equipment_id', '');
                                }
                              }}
                              onFocus={() => {
                                if (equipmentSearch[index]?.length >= 2) {
                                  setShowSuggestions({ ...showSuggestions, [index]: true });
                                }
                              }}
                              className="flex-1 text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowSuggestions({ ...showSuggestions, [index]: !showSuggestions[index] })}
                              className="px-2"
                              title="Voir tous les équipements"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Suggestions dropdown */}
                          {showSuggestions[index] && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {(equipmentSearch[index]?.length >= 2 
                                ? getFilteredEquipment(equipmentSearch[index]) 
                                : equipment.filter(eq => eq.quantity > 0)
                              ).length > 0 ? (
                                (equipmentSearch[index]?.length >= 2 
                                  ? getFilteredEquipment(equipmentSearch[index]) 
                                  : equipment.filter(eq => eq.quantity > 0)
                                ).map((eq) => (
                                  <div
                                    key={eq.id}
                                    onClick={() => selectEquipmentFromSearch(index, eq.id)}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">
                                          {categoryIcons[eq.category] || '📦'} {eq.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {eq.reference} • {eq.category}
                                        </div>
                                      </div>
                                      <div className="text-right ml-2">
                                        <div className="text-sm font-semibold text-blue-600">
                                          {eq.daily_price}€/jour
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {eq.quantity >= 999999 ? '∞' : eq.quantity} dispo
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                  Aucun équipement disponible
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Detail du pack en tout petit */}
                        {(() => {
                          const selectedEq = item.equipment_id ? equipment.find(eq => eq.id === item.equipment_id) : null;
                          if (selectedEq && selectedEq.is_pack && selectedEq.pack_items && selectedEq.pack_items.length > 0) {
                            return (
                              <div className="mt-1 pl-1.5 text-[9.5px] text-gray-500 bg-gray-50/60 rounded p-1.5 border border-dashed border-gray-250">
                                <div className="space-y-0.5">
                                  {selectedEq.pack_items.map((packItem, pIdx) => {
                                    const subEq = equipment.find(e => e.id === packItem.equipment_id);
                                    return (
                                      <div key={pIdx} className="flex items-center gap-1 leading-tight font-medium text-slate-500">
                                        <span>•</span>
                                        <span>{packItem.quantity}x {subEq ? subEq.name : packItem.equipment_id}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qté"
                          value={item.quantity}
                          onChange={(e) => updateEquipmentInQuote(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="text-center text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeEquipmentFromQuote(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
                
                {selectedEquipment.length === 0 && (
                  <div className="text-center text-gray-500 py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    Aucun matériel sélectionné. Cliquez sur "Ajouter" pour commencer.
                  </div>
                )}

                {availabilityWarnings.length > 0 && (
                  <div className="mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 text-orange-700">
                    <strong>⚠️ Alertes de disponibilité :</strong>
                    <ul className="mt-1 text-sm">
                      {availabilityWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Type de remise */}
              <div>
                <Label>Type de remise</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      value="percent"
                      checked={formData.discount_type === 'percent'}
                      onChange={(e) => setFormData({...formData, discount_type: e.target.value, discount_amount: 0})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Pourcentage (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      value="fixed"
                      checked={formData.discount_type === 'fixed'}
                      onChange={(e) => setFormData({...formData, discount_type: e.target.value, discount_percent: 0})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Montant fixe (€)</span>
                  </label>
                </div>
              </div>

              {/* Champ de remise selon le type */}
              <div>
                {formData.discount_type === 'percent' ? (
                  <>
                    <Label htmlFor="discount">Remise (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="discount-amount">Remise (€)</Label>
                    <Input
                      id="discount-amount"
                      type="number"
                      min="0"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </>
                )}
              </div>

              {/* Frais de livraison - Forfaits par zone */}
              <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label className="flex items-center gap-2 font-semibold text-blue-800">
                  <span>🚚</span> Forfait livraison
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="delivery_zone" className="text-sm text-gray-600">Zone</Label>
                    <select
                      id="delivery_zone"
                      value={formData.delivery_zone}
                      onChange={(e) => {
                        const zoneId = e.target.value;
                        const deliveryResult = calculateDeliveryPrice(zoneId, formData.delivery_km);
                        setFormData({
                          ...formData,
                          delivery_zone: zoneId,
                          delivery_cost: deliveryResult.price || 0
                        });
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid="delivery-zone-select"
                    >
                      <option value="">Retrait et retour en agence</option>
                      {DELIVERY_ZONES.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} - {zone.description} {zone.price !== null ? `(${zone.price}€${zone.price === 0 ? ' - Gratuit' : ''})` : `(${zone.pricePerKm}€/km)`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Champ km visible seulement pour "Hors zone" */}
                  {formData.delivery_zone === 'hors_zone' && (
                    <div>
                      <Label htmlFor="delivery_km" className="text-sm text-gray-600">Distance (km)</Label>
                      <Input
                        id="delivery_km"
                        type="number"
                        min="101"
                        value={formData.delivery_km}
                        onChange={(e) => {
                          const km = parseInt(e.target.value) || 0;
                          const deliveryResult = calculateDeliveryPrice('hors_zone', km);
                          setFormData({
                            ...formData,
                            delivery_km: km,
                            delivery_cost: deliveryResult.price
                          });
                        }}
                        placeholder="Ex: 150"
                        data-testid="delivery-km-input"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  )}
                </div>
                
                {/* Affichage du calcul livraison */}
                {formData.delivery_zone && (
                  <div className="text-sm bg-white p-2 rounded border border-blue-200">
                    {(() => {
                      const result = calculateDeliveryPrice(formData.delivery_zone, formData.delivery_km);
                      return (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{result.calculation}</span>
                          <span className="font-semibold text-blue-700">{result.price.toFixed(2)}€</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* Adresse de livraison */}
                {formData.delivery_zone && (
                  <div className="mt-3">
                    <Label htmlFor="delivery_address" className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Adresse de livraison
                    </Label>
                    <textarea
                      id="delivery_address"
                      value={formData.delivery_address || ''}
                      onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                      placeholder="Entrez l'adresse complète de livraison..."
                      className="w-full mt-1 p-2 border rounded-md text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="delivery-address-input"
                    />
                  </div>
                )}
              </div>
              
              {/* Retour du matériel */}
              {formData.delivery_zone && (
                <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                  <Label className="flex items-center gap-2 font-semibold text-purple-800">
                    <Truck className="w-4 h-4" /> Retour du matériel
                  </Label>
                  
                  <div className="space-y-2">
                    {/* Option: Retrait par nos soins */}
                    <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${formData.pickup_by_us ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={formData.pickup_by_us || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, pickup_by_us: true, pickup_by_client: false});
                          } else {
                            setFormData({...formData, pickup_by_us: false});
                          }
                        }}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">Retrait par nos soins</span>
                        <p className="text-xs text-gray-500">Nous allons récupérer le matériel chez le client</p>
                      </div>
                    </label>
                    
                    {/* Adresse de retrait (visible si retrait par nos soins) */}
                    {formData.pickup_by_us && (
                      <div className="ml-7">
                        <Label htmlFor="pickup_address" className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Adresse de retrait
                        </Label>
                        <textarea
                          id="pickup_address"
                          value={formData.pickup_address || ''}
                          onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
                          placeholder="Laisser vide pour utiliser l'adresse de livraison..."
                          className="w-full mt-1 p-2 border rounded-md text-sm min-h-[50px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          data-testid="pickup-address-input"
                        />
                        {!formData.pickup_address && formData.delivery_address && (
                          <p className="text-xs text-gray-400 mt-1">Par défaut : {formData.delivery_address}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Option: Le client ramène le matériel */}
                    <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${formData.pickup_by_client ? 'bg-green-100 border-2 border-green-400' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={formData.pickup_by_client || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, pickup_by_client: true, pickup_by_us: false, pickup_address: ''});
                          } else {
                            setFormData({...formData, pickup_by_client: false});
                          }
                        }}
                        className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">Le client ramène le matériel</span>
                        <p className="text-xs text-gray-500">Le client dépose le matériel chez nous</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Frais d'installation (35€/h + montant manuel) */}
              <div className="space-y-3 p-4 bg-green-50/50 rounded-lg border border-green-100">
                <Label className="flex items-center gap-2 font-semibold text-green-800">
                  <span>🔧</span> Frais d'installation (35€/h)
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="installation_hours" className="text-sm text-gray-600">Heures</Label>
                    <Input
                      id="installation_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.installation_hours}
                      onChange={(e) => {
                        const hours = parseFloat(e.target.value) || 0;
                        const installCost = calculateInstallationCost(hours);
                        setFormData({
                          ...formData,
                          installation_hours: hours,
                          installation_cost: installCost + (formData.installation_manual || 0)
                        });
                      }}
                      placeholder="0"
                      data-testid="installation-hours-input"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="installation_manual" className="text-sm text-gray-600">Montant manuel (+)</Label>
                    <Input
                      id="installation_manual"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.installation_manual}
                      onChange={(e) => {
                        const manual = parseFloat(e.target.value) || 0;
                        const fromHours = calculateInstallationCost(formData.installation_hours || 0);
                        setFormData({
                          ...formData,
                          installation_manual: manual,
                          installation_cost: fromHours + manual
                        });
                      }}
                      placeholder="0"
                      data-testid="installation-manual-input"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Total installation</Label>
                    <div className="h-9 flex items-center px-3 bg-white border rounded-md text-green-700 font-semibold">
                      {((formData.installation_hours || 0) * INSTALLATION_HOURLY_RATE + (formData.installation_manual || 0)).toFixed(2)}€
                    </div>
                  </div>
                </div>
                
                {/* Détail du calcul */}
                {(formData.installation_hours > 0 || formData.installation_manual > 0) && (
                  <div className="text-sm bg-white p-2 rounded border border-green-200">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>
                        {formData.installation_hours > 0 && `${formData.installation_hours}h × 35€ = ${(formData.installation_hours * 35).toFixed(2)}€`}
                        {formData.installation_hours > 0 && formData.installation_manual > 0 && ' + '}
                        {formData.installation_manual > 0 && `${formData.installation_manual.toFixed(2)}€ (manuel)`}
                      </span>
                      <span className="font-semibold text-green-700">
                        {((formData.installation_hours || 0) * 35 + (formData.installation_manual || 0)).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Acompte et Caution (calculés automatiquement mais modifiables) */}
              <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                <Label className="flex items-center gap-2 font-semibold text-purple-800">
                  <span>💳</span> Acompte et Caution
                  <span className="text-xs text-purple-400 font-normal">(calculés auto, modifiables)</span>
                </Label>
                
                {/* Bouton pour recalculer automatiquement */}
                {selectedEquipment.length > 0 && formData.start_date && formData.end_date && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const summary = calculateLiveTotal();
                      setFormData({
                        ...formData,
                        deposit_amount: formData.trusted_no_deposit ? 0 : parseFloat(summary.autoDeposit),
                        guarantee_amount: (formData.trusted_no_guarantee || formData.trusted_client) ? 0 : parseFloat(summary.autoGuarantee)
                      });
                    }}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    🔄 Recalculer automatiquement
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deposit_amount" className="text-sm text-gray-600">
                      Acompte demandé (30%)
                    </Label>
                    <Input
                      id="deposit_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.deposit_amount}
                      onChange={(e) => setFormData({...formData, deposit_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      disabled={formData.trusted_no_deposit}
                      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${formData.trusted_no_deposit ? 'opacity-50 bg-gray-100' : ''}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guarantee_amount" className="text-sm text-gray-600">
                      Caution à verser
                    </Label>
                    <Input
                      id="guarantee_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.guarantee_amount}
                      onChange={(e) => setFormData({...formData, guarantee_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      disabled={formData.trusted_no_guarantee || formData.trusted_client}
                      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${(formData.trusted_no_guarantee || formData.trusted_client) ? 'opacity-50 bg-gray-100' : ''}`}
                    />
                  </div>
                </div>
                
                {/* Cases Client de confiance */}
                <div className="flex flex-col gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50">
                  <div className="text-sm font-medium text-green-800 border-b border-green-200 pb-2">Client de confiance</div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.trusted_no_deposit || false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const summary = calculateLiveTotal();
                          setFormData({
                            ...formData, 
                            trusted_no_deposit: checked,
                            deposit_amount: checked ? 0 : parseFloat(summary.autoDeposit),
                            deposit_paid: checked ? false : formData.deposit_paid
                          });
                        }}
                        className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-green-700">Pas d'acompte</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.trusted_no_guarantee || formData.trusted_client || false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const summary = calculateLiveTotal();
                          setFormData({
                            ...formData, 
                            trusted_no_guarantee: checked,
                            trusted_client: checked, // legacy compatibility
                            guarantee_amount: checked ? 0 : parseFloat(summary.autoGuarantee)
                          });
                        }}
                        className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-green-700">Pas de caution</span>
                    </label>
                  </div>
                </div>

                {/* État de l'acompte */}
                {!formData.trusted_no_deposit && formData.deposit_amount > 0 && (
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-blue-200 bg-blue-50/50 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deposit_paid || false}
                        onChange={(e) => setFormData({ ...formData, deposit_paid: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-800">Acompte versé</span>
                    </label>

                    {formData.deposit_paid && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-blue-600 whitespace-nowrap">Moyen :</Label>
                          <select
                            value={formData.deposit_payment_method || ''}
                            onChange={(e) => setFormData({ ...formData, deposit_payment_method: e.target.value })}
                            className="text-sm border-blue-200 rounded py-1 px-2"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="Espèce">Espèce</option>
                            <option value="Chèque">Chèque</option>
                            <option value="Virement">Virement</option>
                            <option value="Carte">Carte</option>
                            <option value="Lien de paiement">Lien de paiement</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-blue-600 whitespace-nowrap">Le :</Label>
                          <input
                            type="date"
                            value={formData.deposit_date || ''}
                            onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
                            className="text-sm border-blue-200 border rounded py-1 px-2 h-7 w-[120px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Info calcul automatique */}
                {selectedEquipment.length > 0 && formData.start_date && formData.end_date && (() => {
                  const summary = calculateLiveTotal();
                  return (
                    <div className="text-xs text-purple-600 bg-white p-2 rounded border border-purple-200">
                      <div>📊 Valeurs suggérées basées sur le sous-total ({summary.subtotal}€) :</div>
                      <div className="mt-1 flex gap-4">
                        <span>Acompte: <strong>{summary.autoDeposit}€</strong> (30%)</span>
                        <span>Caution: <strong>{summary.autoGuarantee}€</strong> {parseFloat(summary.subtotal) < 150 ? '(base)' : '(350€ + sous-total)'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Résumé des montants en temps réel avec dégressivité */}
              {selectedEquipment.length > 0 && formData.start_date && formData.end_date && (() => {
                const summary = calculateLiveTotal();
                const degressionInfo = summary.degressionInfo;
                
                return (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">📊</span> Résumé du devis
                    </h4>
                    <div className="space-y-2">
                      {/* Informations de dégressivité */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-amber-800">📅 Tarification dégressivité</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.force_weekend === true}
                                  onChange={(e) => {
                                    // Simple toggle: coché = forfait weekend, décoché = tarif normal
                                    const newValue = formData.force_weekend === true ? false : true;
                                    setFormData({...formData, force_weekend: newValue});
                                  }}
                                  className="w-3 h-3"
                                />
                                <span>Forfait weekend</span>
                              </label>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-gray-600 font-medium">Coef manuel (optionnel)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={formData.manual_coefficient || ''}
                                onChange={(e) => setFormData({...formData, manual_coefficient: e.target.value})}
                                placeholder="ex: 4.5"
                                className="w-24 text-sm border-gray-300 rounded-md py-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Durée réelle :</span>
                            <span className="ml-2 font-medium">{summary.days} jour{summary.days > 1 ? 's' : ''}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Type :</span>
                            <span className="ml-2 font-semibold text-amber-700">
                              {degressionInfo?.isWeekendDetected ? '🌅 Weekend' : degressionInfo?.label || ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Coefficient :</span>
                            <span className="ml-2 font-bold text-green-700">×{degressionInfo?.coef || 1}</span>
                          </div>
                          <div className="text-xs text-gray-500 italic">
                            {degressionInfo?.description || ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">💰 Sous-total matériel :</span>
                        <span className="font-medium text-gray-800">{summary.subtotal}€</span>
                      </div>
                      
                      {(formData.discount_percent > 0 || formData.discount_amount > 0) && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            💸 Remise {formData.discount_type === 'percent' ? `(${formData.discount_percent}%)` : 'fixe'} :
                          </span>
                          <span className="font-medium text-red-600">-{summary.discountAmount}€</span>
                        </div>
                      )}
                      
                      {parseFloat(summary.deliveryCost) > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            🚚 Livraison {summary.deliveryZone ? `(${summary.deliveryZone.name})` : ''} :
                          </span>
                          <span className="font-medium text-blue-600">+{summary.deliveryCost}€</span>
                        </div>
                      )}
                      
                      {parseFloat(summary.installationCost) > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            🔧 Installation {formData.installation_hours > 0 ? `(${formData.installation_hours}h × 35€${formData.installation_manual > 0 ? ' + manuel' : ''})` : '(manuel)'} :
                          </span>
                          <span className="font-medium text-green-600">+{summary.installationCost}€</span>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t-2 border-green-300">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">✅ Total final :</span>
                          <span className="text-xl font-bold text-green-600">{summary.total}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 flex-wrap">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Sauvegarde...' : (editingQuote ? 'Mettre à jour' : 'Créer le devis')}
                </Button>
                <Button 
                  type="button" 
                  onClick={handleExportPDF}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isLoading ? 'Génération...' : 'Sauvegarder et Exporter en PDF'}
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveAndSend}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Envoi...' : 'Sauvegarder et Envoyer'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseForm}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation de sortie avec option brouillon */}
      <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Modifications non sauvegardées
            </DialogTitle>
            <DialogDescription>
              Vous avez commencé à rédiger un devis. Souhaitez-vous l'enregistrer en brouillon pour pouvoir le reprendre plus tard ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-between flex-wrap">
            <Button
              variant="destructive"
              onClick={handleExitWithoutSaving}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Quitter sans sauvegarder
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirmation(false)}
                disabled={isLoading}
              >
                Continuer l'édition
              </Button>
              <Button
                onClick={handleSaveAsDraft}
                disabled={isLoading}
                className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                {isLoading ? 'Sauvegarde...' : 'Enregistrer en brouillon'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis</CardTitle>
          <CardDescription>
            {isLoading ? 'Chargement...' : (
              quotes.length === 0 ? 'Aucun devis créé' : `${quotes.length} devis dans le système`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barre de recherche et filtres */}
          <div className="mb-4 flex gap-4 items-center">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="🔍 Rechercher par client ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Toutes les années</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des devis...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client/DJ</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Acompte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun devis créé. Cliquez sur "Nouveau devis" pour commencer.
                    </TableCell>
                  </TableRow>
                ) : getFilteredQuotes().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun devis ne correspond à vos critères de recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredQuotes().map((quote) => {
                    const displayName = getClientDisplayName(quote);
                    const startDate = quote.start_date ? new Date(quote.start_date).toLocaleDateString('fr-FR') : 'N/A';
                    const endDate = quote.end_date ? new Date(quote.end_date).toLocaleDateString('fr-FR') : 'N/A';
                    
                    // Déterminer l'icône en fonction du type et si c'est une entreprise
                    const client = clients.find(c => c.id === quote.client_id);
                    const isCompany = client && client.company_name;
                    const icon = quote.booking_type === 'dj' 
                      ? <Headphones className="w-4 h-4 text-purple-600" /> 
                      : isCompany 
                        ? <Building2 className="w-4 h-4 text-blue-600" />
                        : <User className="w-4 h-4 text-blue-600" />;
                    
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {icon}
                            {displayName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {startDate}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {quote.deposit_paid && quote.deposit_amount > 0 ? (
                            <span>{Math.round((calculateTotal(quote) - quote.deposit_amount) * 100) / 100}€ <span className="text-xs text-gray-400 font-normal line-through ml-1">{calculateTotal(quote)}€</span></span>
                          ) : (
                            <span>{calculateTotal(quote)}€</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {quote.deposit_paid && quote.deposit_amount > 0 ? (
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
                              {quote.deposit_amount}€
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                            disabled={isLoading}
                            className={`
                              text-sm border rounded px-3 py-1.5 font-medium
                              ${quote.status === 'En attente' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : ''}
                              ${quote.status === 'Accepté' ? 'bg-green-50 text-green-700 border-green-300' : ''}
                              ${quote.status === 'Brouillon' ? 'bg-orange-50 text-orange-700 border-orange-300' : ''}
                              hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500
                            `}
                          >
                            <option value="Brouillon">📋 Brouillon</option>
                            <option value="En attente">En attente</option>
                            <option value="Accepté">Accepté</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(quote)}
                              disabled={isLoading}
                              title="Modifier le devis"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleManageAttachments(quote)}
                              disabled={isLoading}
                              title="Gérer les pièces jointes (Devis signé, etc.)"
                              className="relative text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            >
                              <Paperclip className="w-4 h-4" />
                              {quote.documents && quote.documents.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-bold rounded-full text-[9px] w-4 h-4 flex items-center justify-center border border-white">
                                  {quote.documents.length}
                                </span>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleExportPDFFromList(quote)}
                              disabled={isLoading}
                              title="Exporter en PDF"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleArchive(quote)}
                              disabled={archivingQuotes.has(quote.id)}
                              title="Archiver le devis"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDelete(quote.id)}
                              disabled={deletingQuotes.has(quote.id)}
                              title="Supprimer le devis"
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
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmDialog.type === 'delete' ? 'text-red-600' : 'text-orange-600'}>
              {confirmDialog.type === 'delete' ? (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  {confirmDialog.title}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Archive className="w-5 h-5" />
                  {confirmDialog.title}
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={confirmDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {confirmDialog.type === 'delete' ? 'Supprimer' : 'Archiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue Pièces Jointes */}
      <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto text-slate-800 bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Paperclip className="w-5 h-5 text-emerald-700" />
              Pièces Jointes - {selectedQuoteForAttachments ? getClientDisplayName(selectedQuoteForAttachments) : ''}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Gérez les pièces jointes associées à ce devis (images PNG, JPG, JPEG, HEIC converties automatiquement en PDF, ou directement des fichiers PDF).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Zone d'importation de fichiers */}
            <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/5 rounded-xl p-6 transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-700 mb-3">
                  <Upload className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1 text-sm">Téléverser un nouveau document</h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs">PDF, PNG, JPG, JPEG ou HEIC (les images seront automatiquement converties en documents PDF)</p>
                
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
                        Sélectionner un fichier
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
              <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2 border-b pb-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Documents associés ({selectedQuoteForAttachments?.documents?.length || 0})
              </h4>
              
              {selectedQuoteForAttachments?.documents && selectedQuoteForAttachments.documents.length > 0 ? (
                <div className="divide-y max-h-60 overflow-y-auto">
                  {selectedQuoteForAttachments.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2 truncate pr-4">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate font-medium text-gray-700" title={doc.filename}>{doc.filename}</span>
                        <span className="text-xs text-gray-400">
                          ({new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePreviewAttachment(doc)} 
                          title="Visualiser le document"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteAttachment(doc.id)} 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer la pièce jointe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm italic">
                  Aucune pièce jointe associée pour le moment.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="border-gray-200 text-gray-700" onClick={() => setShowAttachmentsDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visionnage Direct du PDF */}
      <Dialog open={!!previewPdfUrl} onOpenChange={(open) => { if (!open) setPreviewPdfUrl(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 text-slate-800 bg-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Eye className="w-5 h-5 text-emerald-700" />
              Aperçu en Direct - {previewPdfFilename}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Prévisualisation de la pièce jointe
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

// Complete ReservationsView implementation integrated

export default DevisView;
