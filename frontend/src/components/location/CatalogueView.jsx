// CatalogueView - Module Location
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
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin, GripVertical, LayoutGrid, Grid3X3, List, ArrowUpDown, FolderTree } from 'lucide-react';
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
import ImageSlideshow from '../ui/ImageSlideshow';
import CatalogueReorderManager from './CatalogueReorderManager';
import CategoryReorderManager from './CategoryReorderManager';

function CatalogueView() {
  const [equipment, setEquipment] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [widgetCode, setWidgetCode] = useState('');
  const [categories, setCategories] = useState([]);
  const [showVisibilityManager, setShowVisibilityManager] = useState(false);
  const [showProductOrder, setShowProductOrder] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isSavingProducts, setIsSavingProducts] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState([]);
  const [productsOrder, setProductsOrder] = useState([]);
  const [showOnlyPublishedCategories, setShowOnlyPublishedCategories] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('categories'); // 'categories' | 'reorder'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState(null);

  useEffect(() => {
    fetchEquipment();
    fetchCategories();
    fetchProductsOrder();
  }, []);

  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/location/equipment`);
      setEquipment(response.data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Erreur lors du chargement du matériel');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/location/categories`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const toggleCategoryVisibility = async (category) => {
    try {
      setIsSavingCategories(true);
      const response = await axios.put(`${BACKEND_URL}/api/location/categories/${category.id}`, { 
        visible_catalogue: !category.visible_catalogue 
      });
      
      if (response.data.success || response.data.id || response.status === 200) {
        toast.success(category.visible_catalogue ? 'Catégorie masquée' : 'Catégorie visible');
        fetchCategories();
      }
    } catch (error) {
      console.error('Error toggling category visibility:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingCategories(false);
    }
  };

  const saveCategoriesOrder = async (newOrderedCategories) => {
    try {
      setIsSavingCategories(true);
      const listToSave = newOrderedCategories || categories;
      const categoryIds = listToSave.map(c => c.id).filter(Boolean);
      await axios.put(`${BACKEND_URL}/api/location/categories/reorder`, {
        category_ids: categoryIds
      });
      setCategories(listToSave);
      toast.success('Ordre des catégories sauvegardé avec succès !');
    } catch (error) {
      console.error('Error saving categories order:', error);
      toast.error('Erreur lors de la sauvegarde de l\'ordre des catégories');
    } finally {
      setIsSavingCategories(false);
    }
  };

  const moveCategoryOneStep = async (categoryIndex, direction) => {
    const targetIndex = direction === 'up' ? categoryIndex - 1 : categoryIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    
    const nextCategories = [...categories];
    const [moved] = nextCategories.splice(categoryIndex, 1);
    nextCategories.splice(targetIndex, 0, moved);
    
    setCategories(nextCategories);
    try {
      await axios.put(`${BACKEND_URL}/api/location/categories/reorder`, {
        category_ids: nextCategories.map(c => c.id).filter(Boolean)
      });
      toast.success(`Catégorie "${moved.name}" déplacée`);
    } catch (err) {
      console.error('Error reordering category:', err);
      toast.error('Erreur lors du déplacement');
      fetchCategories();
    }
  };

  const fetchProductsOrder = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/location/catalogue/products-order`);
      setProductsOrder(response.data.product_ids || response.data.order || []);
    } catch (error) {
      console.error('Error fetching products order:', error);
      setProductsOrder([]);
    }
  };

  // Synchroniser orderedProducts dès que l'équipement ou l'ordre change
  useEffect(() => {
    if (!equipment || equipment.length === 0) return;
    const publishedEquipment = equipment.filter(e => e.publier_catalogue);
    
    const sorted = [...publishedEquipment].sort((a, b) => {
      const indexA = productsOrder.indexOf(a.id);
      const indexB = productsOrder.indexOf(b.id);
      
      if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    setOrderedProducts(sorted);
    setHasUnsavedChanges(false);
  }, [equipment, productsOrder]);

  // Product order dialog opening
  const openProductOrderDialog = () => {
    setShowProductOrder(true);
  };

  const saveProductsOrder = async () => {
    try {
      setIsSavingProducts(true);
      const productIds = orderedProducts.map(p => p.id);
      await axios.put(`${BACKEND_URL}/api/location/catalogue/products-order`, { 
        product_ids: productIds,
        order: productIds 
      });
      setProductsOrder(productIds);
      setHasUnsavedChanges(false);
      toast.success('Ordre des produits sauvegardé avec succès !');
      setShowProductOrder(false);
    } catch (error) {
      console.error('Error saving products order:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingProducts(false);
    }
  };

  const resetProductsOrder = async () => {
    if (!window.confirm('Voulez-vous réinitialiser l\'ordre par défaut (alphabétique) ?')) return;
    try {
      setIsSavingProducts(true);
      await axios.post(`${BACKEND_URL}/api/location/catalogue/products-order/reset`);
      setProductsOrder([]);
      const sorted = [...orderedProducts].sort((a, b) => a.name.localeCompare(b.name));
      setOrderedProducts(sorted);
      setHasUnsavedChanges(true);
      toast.success('Ordre des produits réinitialisé par ordre alphabétique');
    } catch (error) {
      console.error('Error resetting products order:', error);
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsSavingProducts(false);
    }
  };

  const publishedCount = equipment.filter(e => e.publier_catalogue).length;
  const unpublishedCount = equipment.length - publishedCount;

  const generateWidgetCode = () => {
    let productionUrl = window.location.origin;
    if (productionUrl.includes('ais-dev')) {
        productionUrl = productionUrl.replace('ais-dev', 'ais-pre');
    }
    const uid = 'rkey-cat-' + Date.now().toString(36);
    const code = `<!-- Widget Catalogue Location R'Key Prod -->
<div style="width:100%;position:relative;">
  <iframe id="${uid}" src="${productionUrl}/api/widgets/catalogue.html" 
    style="width:100%;border:none;min-height:500px;display:block;" 
    scrolling="no" frameborder="0" allowtransparency="true">
  </iframe>
</div>
<script>
(function(){
  var f=document.getElementById('${uid}');
  if(!f)return;
  window.addEventListener('message',function(e){
    if(e.source===f.contentWindow&&e.data&&e.data.type==='rkey-widget-resize'&&e.data.height>50){
      f.style.height=e.data.height+'px';
    }
  });
})();
</script>`;
    setWidgetCode(code);
    setShowWidgetDialog(true);
  };

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(widgetCode);
    toast.success('Code copié dans le presse-papier !');
  };

  // Group equipment by category respecting the saved order
  const getEquipmentByCategory = (categoryName) => {
    let filtered = equipment.filter(e => {
      if (!e.publier_catalogue) return false;
      
      // Handle legacy category names
      if (categoryName === 'Structure et pieds') {
        return e.category === 'Structure et pieds' || e.category === 'Structure Truss';
      }
      if (categoryName === 'Lumière') {
        return e.category === 'Lumière' || e.category === 'Éclairage';
      }
      if (categoryName === 'Packs') {
        return e.is_pack;
      }
      
      return e.category === categoryName;
    });

    // Sort by saved product order
    if (productsOrder.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const indexA = productsOrder.indexOf(a.id);
        const indexB = productsOrder.indexOf(b.id);
        
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return filtered;
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📢 Catalogue Public</h1>
            <p className="text-gray-600 mt-1">
              Gérez les équipements visibles sur votre catalogue public
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" onClick={() => setShowVisibilityManager(true)}>
              <FolderTree className="w-4 h-4 mr-2 text-orange-600" />
              Trier les catégories
            </Button>
            <Button 
              variant="outline" 
              onClick={openProductOrderDialog}
              className={cn(
                "transition-all",
                hasUnsavedChanges && "border-amber-400 bg-amber-50 text-amber-900 font-semibold"
              )}
            >
              <ArrowUpDown className="w-4 h-4 mr-2 text-orange-600" />
              Ordre des produits (Drag & Drop)
              {hasUnsavedChanges && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </Button>
            <Button onClick={generateWidgetCode} className="bg-orange-600 hover:bg-orange-700">
              <Target className="w-4 h-4 mr-2" />
              Widget
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Publiés</p>
                  <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Non publiés</p>
                  <p className="text-2xl font-bold text-gray-600">{unpublishedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total équipements</p>
                  <p className="text-2xl font-bold text-blue-600">{equipment.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sélecteur de vue : Aperçu par catégories vs Mode Réorganisation Produits vs Mode Réorganisation Catégories */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMainTab('categories')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                activeMainTab === 'categories'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <LayoutGrid className="w-4 h-4 text-orange-600" />
              <span>Aperçu par Catégories</span>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 ml-1">
                {publishedCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('reorder')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                activeMainTab === 'reorder'
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <ArrowUpDown className={cn("w-4 h-4", activeMainTab === 'reorder' ? "text-white" : "text-orange-600")} />
              <span>🎯 Réorganiser les produits</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('categories-order')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                activeMainTab === 'categories-order'
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <FolderTree className={cn("w-4 h-4", activeMainTab === 'categories-order' ? "text-white" : "text-orange-600")} />
              <span>📁 Trier les catégories</span>
              <Badge variant="secondary" className={cn("text-xs ml-1", activeMainTab === 'categories-order' ? "bg-orange-700 text-white" : "bg-slate-200 text-slate-700")}>
                {categories.length}
              </Badge>
            </button>
          </div>

          {activeMainTab === 'reorder' && (
            <div className="text-xs text-slate-500 font-medium">
              Glissez et déposez les produits pour ordonner leur affichage public
            </div>
          )}

          {activeMainTab === 'categories-order' && (
            <div className="text-xs text-slate-500 font-medium">
              Définissez l'ordre exact d'apparition des catégories dans le catalogue et le widget
            </div>
          )}
        </div>

        {/* Affichage conditionnel selon l'onglet actif */}
        {activeMainTab === 'categories-order' ? (
          <Card className="border-orange-200 shadow-sm mb-8">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderTree className="w-5 h-5 text-orange-600" />
                    Trier les catégories du catalogue
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Cet ordre modifie directement l'ordre des sections et les boutons de filtres sur votre widget et catalogue en ligne.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <CategoryReorderManager
                categories={categories}
                equipment={equipment}
                onSave={saveCategoriesOrder}
                onToggleVisibility={toggleCategoryVisibility}
                isSaving={isSavingCategories}
              />
            </CardContent>
          </Card>
        ) : activeMainTab === 'reorder' ? (
          <Card className="border-orange-200 shadow-sm mb-8">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowUpDown className="w-5 h-5 text-orange-600" />
                    Réorganisation des produits du catalogue
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Cet ordre détermine exactement la disposition des articles sur votre widget et site web.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <CatalogueReorderManager
                orderedProducts={orderedProducts}
                setOrderedProducts={setOrderedProducts}
                categories={categories}
                onSave={saveProductsOrder}
                onReset={resetProductsOrder}
                isSaving={isSavingProducts}
                hasUnsavedChanges={hasUnsavedChanges}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            </CardContent>
          </Card>
        ) : (
          /* Published Equipment List - By Category */
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Équipements publiés sur le catalogue</CardTitle>
                  <p className="text-sm text-gray-500">
                    Pour ajouter/retirer un équipement du catalogue, modifiez-le dans la section "Matériel"
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-lg">
                  <label htmlFor="toggle-published-only" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    Filtre : Publiés uniquement (comme sur le site)
                  </label>
                  <Switch
                    id="toggle-published-only"
                    checked={showOnlyPublishedCategories}
                    onCheckedChange={setShowOnlyPublishedCategories}
                    className="data-[state=checked]:bg-orange-600"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : publishedCount === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Aucun équipement publié sur le catalogue</p>
                <p className="text-sm mt-2">
                  Allez dans "Matériel" et activez "Publier sur le catalogue" pour chaque équipement souhaité
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {categories.map((category, categoryIndex) => {
                  if (showOnlyPublishedCategories && category.visible_catalogue === false) {
                    return null;
                  }
                  
                  const categoryEquipment = getEquipmentByCategory(category.name);
                  if (categoryEquipment.length === 0) return null;
                  
                  const isVisible = category.visible_catalogue !== false;
                  
                  return (
                    <div 
                      key={category.id} 
                      className={cn(
                        "border-l-4 pl-4 transition-all duration-200", 
                        isVisible ? "border-l-orange-500" : "border-l-slate-300 opacity-60 bg-slate-50/50 py-2 pr-2 rounded-r-lg"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-dashed border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category.icon}</span>
                          <span className={cn(
                            "font-bold text-lg text-slate-850", 
                            !isVisible && "line-through text-slate-400 decoration-slate-300"
                          )}>
                            {category.name}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({categoryEquipment.length} produit{categoryEquipment.length > 1 ? 's' : ''})
                          </span>
                          
                          {isVisible ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-normal hover:bg-emerald-50 shadow-none px-2 rounded-full">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                              Publiée sur le site
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-normal hover:bg-slate-100 shadow-none px-2 rounded-full">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
                              Masquée
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Flèches monter / descendre la catégorie */}
                          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/70 mr-1">
                            <button
                              type="button"
                              onClick={() => moveCategoryOneStep(categoryIndex, 'up')}
                              disabled={categoryIndex === 0}
                              className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-20 disabled:hover:text-slate-500 rounded hover:bg-white transition-colors cursor-pointer"
                              title="Monter la catégorie"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCategoryOneStep(categoryIndex, 'down')}
                              disabled={categoryIndex === categories.length - 1}
                              className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-20 disabled:hover:text-slate-500 rounded hover:bg-white transition-colors cursor-pointer"
                              title="Descendre la catégorie"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryVisibility(category)}
                            disabled={isSavingCategories}
                            className="h-8 w-8 p-0"
                            title={isVisible ? "Masquer du catalogue public" : "Afficher sur le catalogue public"}
                          >
                            {isVisible ? (
                              <Eye className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-slate-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {categoryEquipment.map(item => {
                          const itemPhotos = Array.isArray(item.photos) && item.photos.length > 0
                            ? item.photos
                            : (item.photo_url ? [item.photo_url] : []);
                          const photo = itemPhotos[0];

                          return (
                            <div 
                              key={item.id} 
                              onClick={() => setSelectedEquipmentForModal(item)}
                              className="group relative border border-slate-200/80 rounded-xl p-2.5 bg-white hover:border-orange-400 hover:shadow-md hover:scale-[1.02] transition-all duration-150 flex flex-col justify-between cursor-pointer select-none"
                              title="Cliquez pour afficher les photos et le descriptif complet"
                            >
                              {/* Vignette carrée */}
                              <div className="relative w-full aspect-square max-h-28 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-2">
                                {photo ? (
                                  <img 
                                    src={getImageUrl(photo)} 
                                    alt={item.name}
                                    className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <span className="text-3xl">{item.is_pack ? '📦' : '🎛️'}</span>
                                )}

                                {/* Badge nombre de photos si > 1 */}
                                {itemPhotos.length > 1 && (
                                  <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                    📷 {itemPhotos.length}
                                  </span>
                                )}

                                {/* Badge Pack */}
                                {item.is_pack && (
                                  <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md shadow-2xs">
                                    Pack
                                  </span>
                                )}
                              </div>

                              {/* Détails de la petite icône */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors" title={item.name}>
                                  {item.name}
                                </h4>
                                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                                  <span className="text-slate-400 truncate max-w-[60%]">{item.category}</span>
                                  <span className="font-bold text-orange-600 shrink-0">{item.daily_price}€/j</span>
                                </div>
                              </div>

                              {/* Indicateur discret au survol */}
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-center text-[10px] text-slate-400 group-hover:text-orange-600 font-medium transition-colors">
                                <span>Voir le détail →</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Category Visibility & Reorder Dialog */}
        <Dialog open={showVisibilityManager} onOpenChange={setShowVisibilityManager}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="pb-3 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <FolderTree className="w-5 h-5 text-orange-600" />
                Trier et gérer la visibilité des catégories
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">
                Déplacez les catégories par glisser-déposer ou avec les flèches pour changer leur ordre sur votre catalogue et votre widget en ligne.
              </p>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-3 pr-1">
              <CategoryReorderManager
                categories={categories}
                equipment={equipment}
                onSave={saveCategoriesOrder}
                onToggleVisibility={toggleCategoryVisibility}
                isSaving={isSavingCategories}
              />
            </div>

            <DialogFooter className="border-t pt-3 shrink-0">
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-gray-500">
                  {categories.filter(c => c.visible_catalogue !== false).length} / {categories.length} visibles
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowVisibilityManager(false)}>
                  Fermer
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Order Dialog */}
        <Dialog open={showProductOrder} onOpenChange={setShowProductOrder}>
          <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="pb-3 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <ArrowUpDown className="w-5 h-5 text-orange-600" />
                    Réorganiser l'ordre des produits du catalogue
                  </DialogTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Glissez-déposez les produits pour ajuster l'ordre exact d'affichage sur votre widget et catalogue en ligne.
                  </p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden pt-4">
              <CatalogueReorderManager
                orderedProducts={orderedProducts}
                setOrderedProducts={setOrderedProducts}
                categories={categories}
                onSave={saveProductsOrder}
                onReset={resetProductsOrder}
                isSaving={isSavingProducts}
                hasUnsavedChanges={hasUnsavedChanges}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Widget Dialog */}
        <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>🔗 Code Widget Catalogue</DialogTitle>
              <p className="text-sm text-gray-500">
                Copiez ce code HTML et collez-le dans un bloc "Code personnalisé" sur votre site
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                {widgetCode}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Instructions :</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Copiez le code ci-dessus</li>
                  <li>Sur votre constructeur de site, ajoutez un bloc "Code HTML personnalisé"</li>
                  <li>Collez le code et enregistrez</li>
                  <li>Le catalogue s'affiche et se redimensionne automatiquement</li>
                </ol>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
                Fermer
              </Button>
              <Button onClick={copyWidgetCode} className="bg-orange-600 hover:bg-orange-700">
                <Copy className="w-4 h-4 mr-2" />
                Copier le code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pop-up Détail Équipement avec Diaporama et Descriptif complet */}
        <Dialog 
          open={!!selectedEquipmentForModal} 
          onOpenChange={(open) => { if (!open) setSelectedEquipmentForModal(null); }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {selectedEquipmentForModal && (() => {
              const modalItem = selectedEquipmentForModal;
              const modalPhotos = Array.isArray(modalItem.photos) && modalItem.photos.length > 0
                ? modalItem.photos
                : (modalItem.photo_url ? [modalItem.photo_url] : []);

              return (
                <div className="space-y-5">
                  <DialogHeader className="pb-3 border-b">
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {modalItem.is_pack && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">
                              📦 Pack Matériel
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-normal text-slate-700 bg-slate-50">
                            {modalItem.category}
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-normal">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Publié sur le catalogue
                          </Badge>
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
                          {modalItem.name}
                        </DialogTitle>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-orange-600">
                          {modalItem.daily_price}€
                          <span className="text-xs font-medium text-slate-500"> / jour</span>
                        </div>
                        {modalItem.guarantee && (
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            Caution : {modalItem.guarantee}€
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Diaporama des photos ou photo unique */}
                  {modalPhotos.length > 0 ? (
                    <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">
                      {modalPhotos.length > 1 ? (
                        <ImageSlideshow
                          images={modalPhotos}
                          alt={modalItem.name}
                          className="w-full h-72 sm:h-80"
                          interval={3500}
                          showDots={true}
                          showArrows={true}
                          showCountBadge={true}
                        />
                      ) : (
                        <div className="w-full h-72 sm:h-80 flex items-center justify-center bg-slate-950 p-2">
                          <img
                            src={getImageUrl(modalPhotos[0])}
                            alt={modalItem.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-44 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-12 h-12 mb-2 text-slate-300" />
                      <p className="text-sm font-medium">Aucune photo pour cet équipement</p>
                    </div>
                  )}

                  {/* Descriptif & Observations */}
                  <div className="space-y-2 bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Descriptif & Caractéristiques
                    </h4>
                    {modalItem.observations || modalItem.catalogue_description || modalItem.description ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {modalItem.observations || modalItem.catalogue_description || modalItem.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        Aucun descriptif détaillé renseigné pour cet équipement.
                      </p>
                    )}
                  </div>

                  {/* Contenu du Pack si applicable */}
                  {modalItem.is_pack && Array.isArray(modalItem.pack_items) && modalItem.pack_items.length > 0 && (
                    <div className="space-y-2.5 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📦</span> Matériel inclus dans ce pack
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {modalItem.pack_items.map((pi, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white/90 border border-amber-100 px-3 py-1.5 rounded-lg text-xs shadow-2xs">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                              {pi.quantity || 1}×
                            </span>
                            <span className="font-medium text-slate-800 truncate">
                              {pi.name || pi.equipment_name || 'Équipement'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="border-t pt-3 flex items-center justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedEquipmentForModal(null)}
                    >
                      Fermer
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ==================== PARAMETRES VIEW ====================

export default CatalogueView;
