// MaterielView - Module Location
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin, Wrench } from 'lucide-react';
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
import { API, BACKEND_URL, formatDateLocal, axios, getImageUrl } from './helpers';
import * as XLSX from 'xlsx';

function MaterielView() {
  const [equipment, setEquipment] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDescriptionIA, setShowDescriptionIA] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Nouveau filtre par catégorie
  const [isUploading, setIsUploading] = useState(false);
  
  // Category management states
  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showExportMenu]);
  
  // Common emojis for quick selection
  const EMOJI_OPTIONS = ['📁', '🔊', '💡', '📺', '🔌', '🌫️', '🏗️', '🎧', '🔧', '📦', '🎤', '🎵', '🎹', '🎸', '🎶', '⚡', '🎬', '📸', '🖥️', '💻', '🎮', '🕹️', '📱', '🔋', '💾', '🛠️', '⚙️', '🔩', '📐', '🎪', '💍', '💒', '👰', '💐'];
  
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    category: '',
    quantity: 1,
    daily_price: 0,
    purchase_price: null,
    observations: '',
    photo_url: '',
    youtube_url: '',
    catalogue_description: '',
    publier_catalogue: false,
    is_pack: false,
    pack_items: [],
    maintenance_status: 'operational'
  });
  const [isGeneratingCatalogueDesc, setIsGeneratingCatalogueDesc] = useState(false);
  
  // AI Description states
  const [productReference, setProductReference] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');

  useEffect(() => {
    fetchEquipment();
    fetchCategories();
  }, []);

  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/equipment`);
      setEquipment(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement du matériel');
    } finally {
      setIsLoading(false);
    }
  };

  // Category management functions
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/location/categories`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }
    
    try {
      setIsSavingCategory(true);
      const response = await axios.post(`${BACKEND_URL}/api/location/categories`, {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        visible_catalogue: true
      });
      
      if (response.data.success) {
        toast.success('Catégorie créée !');
        fetchCategories();
        setShowAddCategory(false);
        setNewCategoryName('');
        setNewCategoryIcon('📁');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const updateCategory = async (categoryId, updates) => {
    try {
      setIsSavingCategory(true);
      const response = await axios.put(`${BACKEND_URL}/api/location/categories/${categoryId}`, updates);
      
      if (response.data.success) {
        toast.success('Catégorie mise à jour !');
        fetchCategories();
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    // Check if any equipment uses this category
    const usedBy = equipment.filter(e => e.category === categoryName);
    if (usedBy.length > 0) {
      toast.error(`Impossible de supprimer : ${usedBy.length} équipement(s) utilisent cette catégorie`);
      return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?`)) return;
    
    try {
      setIsSavingCategory(true);
      const response = await axios.delete(`${BACKEND_URL}/api/location/categories/${categoryId}`);
      
      if (response.data.success) {
        toast.success('Catégorie supprimée !');
        fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const reorderCategories = async (newOrder) => {
    try {
      setIsSavingCategory(true);
      const categoryIds = newOrder.map(cat => cat.id);
      await axios.put(`${BACKEND_URL}/api/location/categories/reorder`, { category_ids: categoryIds });
      setCategories(newOrder);
    } catch (error) {
      console.error('Error reordering categories:', error);
      toast.error('Erreur lors de la réorganisation');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const moveCategory = (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    reorderCategories(newCategories);
  };

  const startEditCategory = (category) => {
    setEditingCategory({
      ...category,
      originalName: category.name
    });
  };

  const saveEditCategory = async () => {
    if (!editingCategory.name.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }
    
    await updateCategory(editingCategory.id, {
      name: editingCategory.name.trim(),
      icon: editingCategory.icon
    });
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      reference: '', 
      category: '', 
      quantity: 1, 
      daily_price: 0,
      purchase_price: null,
      observations: '',
      photo_url: '',
      youtube_url: '',
      catalogue_description: '',
      publier_catalogue: false,
      is_pack: false, 
      pack_items: [],
      unlimited_quantity: false,
      maintenance_status: 'operational'
    });
    setShowAddForm(false);
    setEditingEquipment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.reference) {
      toast.error('Veuillez remplir le nom et la référence');
      return;
    }

    // Validation du prix obligatoire pour tous les équipements (y compris les packs)
    if (formData.daily_price === undefined || formData.daily_price === null || formData.daily_price < 0) {
      toast.error('Veuillez saisir un prix de location journalier valide (0€ ou plus)');
      return;
    }

    // Validation spécifique pour les packs
    if (formData.is_pack) {
      if (formData.pack_items.length === 0) {
        toast.error('Veuillez sélectionner au moins un équipement pour le pack');
        return;
      }
      
      const hasEmptyEquipment = formData.pack_items.some(item => !item.equipment_id);
      if (hasEmptyEquipment) {
        toast.error('Veuillez sélectionner tous les équipements du pack');
        return;
      }
    } else {
      // Validation pour équipement individuel
      if (!formData.category) {
        toast.error('Veuillez sélectionner une catégorie');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // DEBUG: Log formData to see if purchase_price is included
      console.log('Sending equipment data:', formData);
      console.log('purchase_price value:', formData.purchase_price);
      
      if (editingEquipment) {
        await axios.put(`${API}/equipment/${editingEquipment.id}`, formData);
        toast.success(formData.is_pack ? 'Pack mis à jour avec succès' : 'Matériel mis à jour avec succès');
      } else {
        await axios.post(`${API}/equipment`, formData);
        toast.success(formData.is_pack ? 'Pack créé avec succès !' : 'Matériel ajouté avec succès ! Description générée automatiquement.');
      }
      
      resetForm();
      await fetchEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce matériel ?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${API}/equipment/${id}`);
        toast.success('Matériel supprimé avec succès');
        await fetchEquipment();
      } catch (error) {
        console.error('Error deleting equipment:', error);
        toast.error('Erreur lors de la suppression');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = (item) => {
    setEditingEquipment(item);
    setFormData({
      name: item.name || '',
      reference: item.reference || '',
      category: item.category || '',
      quantity: item.quantity || 1,
      daily_price: item.daily_price || 0,
      purchase_price: item.purchase_price || null,
      observations: item.observations || '',
      photo_url: item.photo_url || '',
      youtube_url: item.youtube_url || '',
      catalogue_description: item.catalogue_description || '',
      publier_catalogue: item.publier_catalogue || false,
      is_pack: item.is_pack || false,
      pack_items: item.pack_items || [],
      unlimited_quantity: item.quantity >= 999999,
      maintenance_status: item.maintenance_status || 'operational'
    });
    setShowAddForm(true);
    // Scroll vers le haut pour afficher le formulaire
    setTimeout(() => {
      // Essayer de scroller le conteneur principal ou la fenêtre
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Aussi scroller vers l'élément du formulaire s'il existe
      const formCard = document.querySelector('[data-form-card="equipment"]');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleDuplicate = (item) => {
    const duplicatedItem = {
      ...item,
      name: `${item.name} (Copie)`,
      reference: `${item.reference}-COPY`,
      id: undefined // Remove ID so it gets a new one
    };
    setFormData({
      name: duplicatedItem.name,
      reference: duplicatedItem.reference,
      category: duplicatedItem.category || '',
      quantity: duplicatedItem.quantity || 1,
      daily_price: duplicatedItem.daily_price || 0,
      purchase_price: duplicatedItem.purchase_price || null,
      observations: duplicatedItem.observations || '',
      photo_url: duplicatedItem.photo_url || '',
      youtube_url: duplicatedItem.youtube_url || '',
      catalogue_description: duplicatedItem.catalogue_description || '',
      publier_catalogue: false, // Don't duplicate the publish status
      is_pack: duplicatedItem.is_pack || false,
      pack_items: duplicatedItem.pack_items || [],
      unlimited_quantity: duplicatedItem.quantity >= 999999
    });
    setEditingEquipment(null); // Make sure we're in "add" mode
    setShowAddForm(true);
    toast.info("Équipement dupliqué - Modifiez le nom et les détails");
    // Scroll vers le haut pour afficher le formulaire
    setTimeout(() => {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const formCard = document.querySelector('[data-form-card="equipment"]');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // AI Description functions
  const generateDescription = async () => {
    if (!productReference.trim()) {
      toast.error('Veuillez saisir une référence produit');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await axios.post(`${API}/generate-description`, {
        reference: productReference
      });
      const generatedText = response.data.description;
      setGeneratedDescription(generatedText);
      toast.success('Description générée avec succès !');

      // Autofill if form is open, matching user expectations from previous versions
      if (showAddForm) {
        setFormData(prev => ({
          ...prev, 
          observations: generatedText,
          catalogue_description: generatedText
        }));
      }
    } catch (error) {
      toast.error('Erreur lors de la génération de la description');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction pour générer la description catalogue avec IA
  const generateCatalogueDescription = async () => {
    if (!formData.name && !formData.reference) {
      toast.error('Veuillez d\'abord saisir le nom ou la référence du matériel');
      return;
    }

    try {
      setIsGeneratingCatalogueDesc(true);
      const response = await axios.post(`${API}/generate-catalogue-description`, {
        name: formData.name,
        reference: formData.reference,
        category: formData.category,
        observations: formData.observations || ''
      });
      setFormData(prev => ({ 
        ...prev, 
        catalogue_description: response.data.description,
        observations: prev.observations ? prev.observations : response.data.description 
      }));
      toast.success('Description catalogue générée avec succès !');
    } catch (error) {
      console.error('Error generating catalogue description:', error);
      toast.error('Erreur lors de la génération de la description');
    } finally {
      setIsGeneratingCatalogueDesc(false);
    }
  };

  const copyDescription = async () => {
    try {
      await navigator.clipboard.writeText(generatedDescription);
      toast.success('Description copiée dans le presse-papiers !');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = generatedDescription;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Description copiée dans le presse-papiers !');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5 Mo)');
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${BACKEND_URL}/api/upload/equipment-image`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      // L'URL est maintenant un data URL base64 qui fonctionne partout
      const imageUrl = response.data.url;
      console.log('Image uploaded successfully, size:', response.data.size);
      
      setFormData(prev => ({ ...prev, photo_url: imageUrl }));
      toast.success('Image importée avec succès !');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'import de l\'image');
    } finally {
      setIsUploading(false);
      // Reset l'input file pour permettre de re-sélectionner le même fichier
      event.target.value = '';
    }
  };

  const closeDescriptionModal = () => {
    setProductReference('');
    setGeneratedDescription('');
    setShowDescriptionIA(false);
  };

  // Category select component - dynamic from database
  const CategorySelect = ({ value, onChange, disabled }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required
      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Sélectionner une catégorie</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
      ))}
    </select>
  );

  // Function to get maintenance status badge
  const getMaintenanceStatusBadge = (maintenanceStatus) => {
    switch (maintenanceStatus) {
      case 'maintenance':
        return <Badge variant="destructive" className="bg-orange-600"><Wrench className="w-3 h-3 mr-1" />Maintenance</Badge>;
      case 'out_of_service':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Hors service</Badge>;
      default:
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Opérationnel</Badge>;
    }
  };

  // ═══════════════════════════════════════════
  // EXPORT FUNCTIONS
  // ═══════════════════════════════════════════
  const getExportData = () => {
    return equipment.map(item => ({
      'Catégorie': item.category || '',
      'Nom': item.name || '',
      'Référence': item.reference || '',
      'Quantité': item.quantity >= 999999 ? 'Illimité' : (item.quantity || 0),
      'Prix/jour (€)': item.daily_price || 0,
      'Prix achat (€)': item.purchase_price || '',
      'Observations': item.observations || '',
      'Description catalogue': item.catalogue_description || '',
      'Publié catalogue': item.publier_catalogue ? 'Oui' : 'Non',
      'Pack': item.is_pack ? 'Oui' : 'Non',
    }));
  };

  const exportExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto column widths
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length).slice(0, 20)) + 2
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matériel');
    XLSX.writeFile(wb, `Stock_Materiel_RKeyProd_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setShowExportMenu(false);
    toast.success('Export Excel téléchargé');
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let y = 15;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Stock Matériel - R\'KEY PROD', margin, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Export du ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin - 40, y);
    y += 10;

    // Table header
    const cols = [
      { label: 'Catégorie', w: 30 },
      { label: 'Nom', w: 50 },
      { label: 'Réf.', w: 20 },
      { label: 'Qté', w: 12 },
      { label: 'Prix/j', w: 15 },
      { label: 'Observations', w: 70 },
      { label: 'Description', w: 80 },
    ];
    doc.setFillColor(50, 50, 50);
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = margin + 1;
    cols.forEach(c => { doc.text(c.label, x, y + 5); x += c.w; });
    y += 9;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Group by category
    const grouped = {};
    equipment.forEach(item => {
      const cat = item.category || 'Autres';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
      items.forEach((item, idx) => {
        if (y > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          y = 15;
          // Repeat header
          doc.setFillColor(50, 50, 50);
          doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          let hx = margin + 1;
          cols.forEach(c => { doc.text(c.label, hx, y + 5); hx += c.w; });
          y += 9;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }

        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 1, pageWidth - 2 * margin, 6, 'F');
        }

        doc.setFontSize(7);
        x = margin + 1;
        const truncate = (str, max) => str && str.length > max ? str.substring(0, max) + '...' : (str || '-');
        const qty = item.quantity >= 999999 ? '∞' : String(item.quantity || 0);
        const price = item.daily_price ? `${item.daily_price}€` : '0€';
        const row = [cat, item.name || '', item.reference || '', qty, price, item.observations || '', item.catalogue_description || ''];
        const maxChars = [18, 30, 12, 5, 7, 42, 48];
        row.forEach((val, i) => { doc.text(truncate(val, maxChars[i]), x, y + 3); x += cols[i].w; });
        y += 6;
      });
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Total : ${equipment.length} articles`, margin, doc.internal.pageSize.getHeight() - 5);

    doc.save(`Stock_Materiel_RKeyProd_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setShowExportMenu(false);
    toast.success('Export PDF téléchargé');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion du Matériel</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Button
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              data-testid="export-dropdown-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                <button
                  onClick={exportExcel}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 flex items-center gap-2 rounded-t-lg"
                  data-testid="export-excel-btn"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-2 rounded-b-lg border-t"
                  data-testid="export-pdf-btn"
                >
                  <Download className="w-4 h-4 text-red-600" />
                  PDF
                </button>
              </div>
            )}
          </div>
          <Button 
            onClick={() => setShowCategoryManager(true)}
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Menu className="w-4 h-4 mr-2" />
            Catégories
          </Button>
          <Button 
            onClick={() => setShowDescriptionIA(true)}
            variant="outline"
            className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Description IA
          </Button>
          <Button 
            onClick={() => setShowAddForm(true)} 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isLoading ? 'Chargement...' : 'Ajouter du matériel'}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card data-form-card="equipment">
          <CardHeader>
            <CardTitle>{editingEquipment ? 'Modifier le matériel' : 'Nouveau matériel'}</CardTitle>
            <CardDescription>
              {editingEquipment ? 'Modifiez les informations du matériel' : 'L\'IA générera automatiquement une description'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment-name">Nom du matériel</Label>
                  <Input
                    id="equipment-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Enceinte JBL EON615"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="equipment-reference">Référence (4 caractères max)</Label>
                  <Input
                    id="equipment-reference"
                    value={formData.reference}
                    onChange={(e) => {
                      // Allow letters, numbers, and dots, limit to 4 characters, convert to uppercase
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 4);
                      setFormData({...formData, reference: value});
                    }}
                    placeholder="Ex: EC.1"
                    maxLength={4}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="equipment-category">Catégorie</Label>
                  <CategorySelect 
                    value={formData.category}
                    onChange={(value) => setFormData({...formData, category: value})}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="equipment-quantity">Quantité</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="equipment-quantity"
                      type="number"
                      min="1"
                      value={formData.unlimited_quantity ? '' : formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      required={!formData.unlimited_quantity}
                      disabled={isLoading || formData.unlimited_quantity}
                      className={formData.unlimited_quantity ? "bg-gray-100 cursor-not-allowed" : ""}
                      placeholder={formData.unlimited_quantity ? "Illimité" : ""}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="unlimited-quantity"
                        checked={formData.unlimited_quantity || false}
                        onChange={(e) => setFormData({
                          ...formData, 
                          unlimited_quantity: e.target.checked,
                          quantity: e.target.checked ? 999999 : 1
                        })}
                        disabled={isLoading}
                      />
                      <Label htmlFor="unlimited-quantity" className="text-sm">Illimité</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="equipment-price">Prix/jour (€)</Label>
                  <Input
                    id="equipment-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.daily_price}
                    onChange={(e) => setFormData({...formData, daily_price: parseFloat(e.target.value) || 0})}
                    placeholder="Ex: 25.00"
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="equipment-purchase-price">Prix d'achat (€) - Optionnel</Label>
                  <Input
                    id="equipment-purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => setFormData({...formData, purchase_price: e.target.value ? parseFloat(e.target.value) : null})}
                    placeholder="Ex: 500.00"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance-status">État du matériel</Label>
                  <select
                    id="maintenance-status"
                    value={formData.maintenance_status}
                    onChange={(e) => setFormData({...formData, maintenance_status: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="operational">🟢 Opérationnel</option>
                    <option value="maintenance">🟠 En maintenance</option>
                    <option value="out_of_service">🔴 Hors service</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="equipment-observations">Description / Observations</Label>
                <textarea
                  id="equipment-observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  placeholder="Notes, observations particulières sur ce matériel..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>

              {/* Photo et Publier sur le catalogue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Photo du matériel (catalogue)</Label>
                  <div className="mt-2 space-y-3">
                    {/* Preview de l'image */}
                    {formData.photo_url && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <img 
                          src={getImageUrl(formData.photo_url)} 
                          alt="Aperçu"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image load error:', formData.photo_url);
                            e.target.onerror = null;
                            e.target.src = '';
                            e.target.alt = 'Erreur de chargement';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, photo_url: ''})}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          title="Supprimer l'image"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {/* Bouton d'upload */}
                    <div className="flex gap-2">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading || isLoading}
                          className="hidden"
                        />
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                            <span className="text-sm text-gray-600">Import en cours...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-orange-500" />
                            <span className="text-sm text-gray-600">
                              {formData.photo_url ? 'Changer l\'image' : 'Importer une image'}
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">JPG, PNG, WebP ou GIF (max 5 Mo)</p>
                  </div>
                </div>

                {/* Lien YouTube */}
                <div>
                  <Label htmlFor="youtube_url">🎬 Lien vidéo YouTube</Label>
                  <Input
                    id="youtube_url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Vidéo de présentation du matériel (optionnel)</p>
                </div>
              </div>

              {/* Description Catalogue avec IA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="catalogue_description">📝 Description Catalogue</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateCatalogueDescription}
                    disabled={isLoading || isGeneratingCatalogueDesc || (!formData.name && !formData.reference)}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    {isGeneratingCatalogueDesc ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Générer avec IA
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  id="catalogue_description"
                  value={formData.catalogue_description}
                  onChange={(e) => setFormData({...formData, catalogue_description: e.target.value})}
                  placeholder="Description commerciale qui apparaîtra sur le catalogue public. Vous pouvez l'écrire manuellement ou utiliser le bouton 'Générer avec IA' pour créer une description automatiquement."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">Cette description sera visible sur le catalogue public. Modifiable à tout moment.</p>
              </div>

              {/* Publier sur le catalogue */}
              <div className="flex items-center space-x-3 pt-2">
                <Switch
                  id="publier-catalogue"
                  checked={formData.publier_catalogue}
                  onCheckedChange={(checked) => setFormData({...formData, publier_catalogue: checked})}
                  disabled={isLoading}
                />
                <Label htmlFor="publier-catalogue" className="text-sm font-medium cursor-pointer">
                  📢 Publier sur le catalogue
                </Label>
              </div>

              {/* Pack Creation Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  id="create-pack"
                  type="checkbox"
                  checked={formData.is_pack}
                  onChange={(e) => setFormData({...formData, is_pack: e.target.checked, pack_items: e.target.checked ? [] : []})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <Label htmlFor="create-pack" className="text-sm font-medium">
                  📦 Créer un pack (sélection de plusieurs équipements)
                </Label>
              </div>

              {/* Pack Items Selection */}
              {formData.is_pack && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-blue-800">
                      Équipements du pack
                    </Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFormData({
                        ...formData, 
                        pack_items: [...formData.pack_items, { equipment_id: '', quantity: 1 }]
                      })}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter équipement
                    </Button>
                  </div>
                  
                  {formData.pack_items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-white p-2 border border-blue-200 rounded">
                      <div className="flex-1">
                        <select
                          value={item.equipment_id}
                          onChange={(e) => {
                            const newPackItems = [...formData.pack_items];
                            newPackItems[index].equipment_id = e.target.value;
                            setFormData({...formData, pack_items: newPackItems});
                          }}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="">Sélectionner un équipement</option>
                          {categories.map(cat => {
                            const categoryName = cat.name;
                            const categoryIcon = cat.icon || '📁';
                            
                            const categoryEquipment = equipment.filter(eq => {
                              const isOperational = !eq.maintenance_status || eq.maintenance_status === 'operational';
                              
                              if (categoryName === 'Lumière' || categoryName === 'Éclairage') {
                                return (eq.category === 'Éclairage' || eq.category === 'Lumière') && isOperational && !eq.is_pack;
                              }
                              if (categoryName === 'Packs') {
                                return eq.is_pack && isOperational;
                              }
                              if (categoryName === 'Structure et pieds') {
                                return (eq.category === 'Structure et pieds' || eq.category === 'Structure Truss') && isOperational && !eq.is_pack;
                              }
                              return eq.category === categoryName && isOperational && !eq.is_pack;
                            });
                            if (categoryEquipment.length === 0) return null;
                            
                            return (
                              <optgroup key={categoryName} label={`${categoryIcon} ${categoryName.toUpperCase()}`}>
                                {categoryEquipment.map((eq) => (
                                  <option key={eq.id} value={eq.id}>
                                    {eq.name} - {eq.daily_price}€/jour
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newPackItems = [...formData.pack_items];
                            newPackItems[index].quantity = parseInt(e.target.value) || 1;
                            setFormData({...formData, pack_items: newPackItems});
                          }}
                          placeholder="Qté"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPackItems = formData.pack_items.filter((_, i) => i !== index);
                          setFormData({...formData, pack_items: newPackItems});
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {formData.pack_items.length === 0 && (
                    <div className="text-center text-blue-600 py-4">
                      <Package className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Cliquez sur "Ajouter équipement" pour composer votre pack</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Traitement...' : (editingEquipment ? 'Mettre à jour' : 'Ajouter')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isLoading}
                  >
                    Annuler
                  </Button>
                </div>
                
                {/* Bouton Supprimer - uniquement en mode édition */}
                {editingEquipment && (
                  <Button 
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(editingEquipment.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste du matériel</CardTitle>
              <CardDescription>
                {equipment.length === 0 ? 'Aucun matériel ajouté' : `${equipment.length} équipement(s) dans l'inventaire`}
              </CardDescription>
            </div>
            <div className="flex gap-3 items-center">
              {/* Filtre par catégorie */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              {/* Barre de recherche */}
              <div className="w-80">
                <Input
                  placeholder="🔍 Rechercher par nom ou référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Equipment sections by category - dynamic from database */}
              {categories.map(cat => {
                const categoryName = cat.name;
                const categoryIcon = cat.icon || '📁';
                
                // Appliquer le filtre de catégorie
                if (categoryFilter !== 'all' && categoryName !== categoryFilter) {
                  return null;
                }
                
                // Default categories that exclude packs (they go to "Packs" section)
                const defaultCategories = ['Sonorisation', 'Lumière', 'Vidéo', 'Câbles', 'Machine FX', 'Structure et pieds', 'DJ', 'Divers'];
                const isDefaultCategory = defaultCategories.includes(categoryName);
                
                // Filter equipment by category and search term
                const categoryEquipment = equipment.filter(item => {
                  // Special handling for Packs category - shows ALL packs regardless of their category
                  let matchesCategory;
                  if (categoryName === 'Packs') {
                    // Only show packs that are in default categories (not custom ones like "Mariage")
                    const itemCategory = item.category || '';
                    const isInDefaultCategory = defaultCategories.includes(itemCategory) || itemCategory === 'Packs';
                    matchesCategory = item.is_pack && isInDefaultCategory;
                  } else if (categoryName === 'Lumière') {
                    matchesCategory = (item.category === 'Lumière' || item.category === 'Éclairage') && !item.is_pack;
                  } else if (categoryName === 'Structure et pieds') {
                    matchesCategory = (item.category === 'Structure et pieds' || item.category === 'Structure Truss') && !item.is_pack;
                  } else if (isDefaultCategory) {
                    // For other default categories, exclude packs
                    matchesCategory = item.category === categoryName && !item.is_pack;
                  } else {
                    // For custom categories (like "Mariage"), show ALL items including packs
                    matchesCategory = item.category === categoryName;
                  }
                  
                  const matchesSearch = !searchTerm || 
                    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.reference?.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  return matchesCategory && matchesSearch;
                });

                if (categoryEquipment.length === 0) return null;

                // Default color scheme for dynamic categories
                const defaultColors = [
                  'border-l-pink-500 bg-pink-50',
                  'border-l-indigo-500 bg-indigo-50',
                  'border-l-teal-500 bg-teal-50',
                  'border-l-amber-500 bg-amber-50',
                  'border-l-cyan-500 bg-cyan-50',
                ];
                
                const categoryColors = {
                  'Sonorisation': 'border-l-black bg-gray-50',
                  'Lumière': 'border-l-yellow-400 bg-yellow-50',
                  'Vidéo': 'border-l-blue-500 bg-blue-50',
                  'Câbles': 'border-l-gray-500 bg-gray-50',
                  'Machine FX': 'border-l-purple-500 bg-purple-50',
                  'Structure et pieds': 'border-l-red-500 bg-red-50',
                  'DJ': 'border-l-orange-400 bg-orange-50',
                  'Divers': 'border-l-green-500 bg-green-50',
                  'Packs': 'border-l-orange-500 bg-orange-50',
                  'Mariage': 'border-l-pink-400 bg-pink-50',
                };
                
                // Use predefined color or generate one based on category order
                const catIndex = categories.findIndex(c => c.name === categoryName);
                const colorClass = categoryColors[categoryName] || defaultColors[catIndex % defaultColors.length];

                return (
                  <div key={categoryName} className={`border-l-4 ${colorClass} rounded-lg p-4`}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="text-2xl">{categoryIcon}</span>
                      {categoryName}
                      <span className="text-sm text-gray-500">({categoryEquipment.length})</span>
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Référence</TableHead>
                            <TableHead>Prix/jour</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Observations</TableHead>
                            <TableHead>Catalogue</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryEquipment.map((item) => (
                            <TableRow key={`equipment-${item.id}-${item.reference}`}>
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  {item.name || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm font-semibold text-blue-600">
                                  {item.reference || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {item.daily_price ? `${item.daily_price}€` : '0€'}
                              </TableCell>
                              <TableCell>{item.quantity >= 999999 ? '∞' : (item.quantity || 0)}</TableCell>
                              <TableCell>
                                <div className="max-w-xs truncate" title={item.observations || ''}>
                                  {item.observations || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.publier_catalogue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3" />
                                    Publié
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    Non
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEdit(item)}
                                    disabled={isLoading}
                                    className="border-blue-500 hover:bg-blue-50"
                                    title="Modifier cet équipement"
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </Button>
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDuplicate(item)}
                                    disabled={isLoading}
                                    title="Dupliquer"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}

              {/* Show message if no equipment matches search */}
              {searchTerm && 
                !categories.some(cat => {
                  const categoryName = cat.name;
                  const defaultCategories = ['Sonorisation', 'Lumière', 'Vidéo', 'Câbles', 'Machine FX', 'Structure et pieds', 'DJ', 'Divers'];
                  const isDefaultCategory = defaultCategories.includes(categoryName);
                  
                  const categoryEquipment = equipment.filter(item => {
                    let matchesCategory;
                    if (categoryName === 'Packs') {
                      const itemCategory = item.category || '';
                      const isInDefaultCategory = defaultCategories.includes(itemCategory) || itemCategory === 'Packs';
                      matchesCategory = item.is_pack && isInDefaultCategory;
                    } else if (categoryName === 'Lumière') {
                      matchesCategory = (item.category === 'Lumière' || item.category === 'Éclairage') && !item.is_pack;
                    } else if (categoryName === 'Structure et pieds') {
                      matchesCategory = (item.category === 'Structure et pieds' || item.category === 'Structure Truss') && !item.is_pack;
                    } else if (isDefaultCategory) {
                      matchesCategory = item.category === categoryName && !item.is_pack;
                    } else {
                      matchesCategory = item.category === categoryName;
                    }
                    
                    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.reference?.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    return matchesCategory && matchesSearch;
                  });
                  return categoryEquipment.length > 0;
                }) && (
                <div className="text-center py-8 text-gray-500">
                  Aucun matériel trouvé pour "{searchTerm}"
                </div>
              )}

              {/* Show message if no equipment at all */}
              {equipment.length === 0 && !searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  Aucun matériel dans l'inventaire. Cliquez sur "Ajouter du matériel" pour commencer.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Description Modal */}
      {showDescriptionIA && (
        <Dialog open={showDescriptionIA} onOpenChange={setShowDescriptionIA}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Générateur de Description IA
              </DialogTitle>
              <DialogDescription>
                Entrez une référence de matériel pour générer automatiquement une description professionnelle et technique
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-reference">Référence du produit</Label>
                <Input
                  id="product-reference"
                  value={productReference}
                  onChange={(e) => setProductReference(e.target.value)}
                  placeholder="Ex: JBL EON615, Shure SM58, Pioneer CDJ-2000NXS2, etc."
                  disabled={isGenerating}
                />
              </div>
              {generatedDescription && (
                <div>
                  <Label>Description générée</Label>
                  <div className="p-4 bg-gray-50 border rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                      {generatedDescription}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={closeDescriptionModal}>
                  Fermer
                </Button>
                {generatedDescription && (
                  <>
                    <Button variant="outline" onClick={() => {setProductReference(''); setGeneratedDescription('');}}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Nouvelle Description
                    </Button>
                    <Button variant="outline" onClick={copyDescription}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                  </>
                )}
                <Button onClick={generateDescription} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Génération...' : 'Générer'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              Gestion des catégories
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Créez, modifiez et organisez les catégories de votre matériel
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 my-4">
            {categories.map((category, index) => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border"
              >
                {editingCategory?.id === category.id ? (
                  // Editing mode
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <select 
                        value={editingCategory.icon}
                        onChange={(e) => setEditingCategory({...editingCategory, icon: e.target.value})}
                        className="text-xl w-12 h-10 text-center border rounded cursor-pointer appearance-none bg-white"
                      >
                        {EMOJI_OPTIONS.map(emoji => (
                          <option key={emoji} value={emoji}>{emoji}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Nom de la catégorie"
                    />
                    <Button size="sm" onClick={saveEditCategory} disabled={isSavingCategory} className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  // Display mode
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-gray-400">
                        ({equipment.filter(e => e.category === category.name).length} équipements)
                      </span>
                    </div>
                    <div className="flex gap-1 items-center">
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditCategory(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {/* Move buttons */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0 || isSavingCategory}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === categories.length - 1 || isSavingCategory}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id, category.name)}
                        disabled={isSavingCategory}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {/* Add new category form */}
            {showAddCategory ? (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="relative">
                  <select 
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="text-xl w-12 h-10 text-center border rounded cursor-pointer appearance-none bg-white"
                  >
                    {EMOJI_OPTIONS.map(emoji => (
                      <option key={emoji} value={emoji}>{emoji}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nom de la nouvelle catégorie"
                  autoFocus
                />
                <Button size="sm" onClick={addCategory} disabled={isSavingCategory} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                  setNewCategoryIcon('📁');
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAddCategory(true)}
                className="w-full border-dashed border-2 text-gray-600 hover:text-purple-600 hover:border-purple-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une catégorie
              </Button>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-gray-500">
                {categories.length} catégories
              </p>
              <Button variant="outline" onClick={() => setShowCategoryManager(false)}>
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Gestion des Clients - Implémentation complète

export default MaterielView;
