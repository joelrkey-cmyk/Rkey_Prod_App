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
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin } from 'lucide-react';
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
      
      if (response.data.success) {
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

  const fetchProductsOrder = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/location/catalogue/products-order`);
      setProductsOrder(response.data.product_ids || []);
    } catch (error) {
      console.error('Error fetching products order:', error);
      setProductsOrder([]);
    }
  };

  // Product order management
  const openProductOrderDialog = () => {
    // Get published equipment and sort by saved order
    const publishedEquipment = equipment.filter(e => e.publier_catalogue);
    
    // Sort by saved order first, then by name for new items
    const sorted = [...publishedEquipment].sort((a, b) => {
      const indexA = productsOrder.indexOf(a.id);
      const indexB = productsOrder.indexOf(b.id);
      
      if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    setOrderedProducts(sorted);
    setShowProductOrder(true);
  };

  const moveProduct = (index, direction) => {
    const newProducts = [...orderedProducts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newProducts.length) return;
    
    [newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]];
    setOrderedProducts(newProducts);
  };

  const saveProductsOrder = async () => {
    try {
      setIsSavingProducts(true);
      const productIds = orderedProducts.map(p => p.id);
      await axios.put(`${BACKEND_URL}/api/location/catalogue/products-order`, { product_ids: productIds });
      setProductsOrder(productIds);
      toast.success('Ordre des produits sauvegardé !');
      setShowProductOrder(false);
    } catch (error) {
      console.error('Error saving products order:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingProducts(false);
    }
  };

  const resetProductsOrder = async () => {
    try {
      setIsSavingProducts(true);
      await axios.post(`${BACKEND_URL}/api/location/catalogue/products-order/reset`);
      setProductsOrder([]);
      // Re-sort by name
      const sorted = [...orderedProducts].sort((a, b) => a.name.localeCompare(b.name));
      setOrderedProducts(sorted);
      toast.success('Ordre des produits réinitialisé !');
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
    const productionUrl = 'https://rkeyprodapp.fr';
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowVisibilityManager(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Visibilité
            </Button>
            <Button variant="outline" onClick={openProductOrderDialog}>
              <Package className="w-4 h-4 mr-2" />
              Produits
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

        {/* Published Equipment List - By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Équipements publiés sur le catalogue</CardTitle>
            <p className="text-sm text-gray-500">
              Pour ajouter/retirer un équipement du catalogue, modifiez-le dans la section "Matériel"
            </p>
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
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryEquipment = getEquipmentByCategory(category.name);
                  if (categoryEquipment.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="border-l-4 border-l-orange-500 pl-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                        <span className="text-sm text-gray-500">({categoryEquipment.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryEquipment.map(item => (
                          <div 
                            key={item.id} 
                            className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                          >
                            {item.photo_url && (
                              <img 
                                src={item.photo_url} 
                                alt={item.name}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                  {item.is_pack && <span className="text-orange-500 mr-1">📦</span>}
                                  {item.name}
                                </h3>
                                <p className="text-xs text-gray-500">{item.category}</p>
                              </div>
                              <span className="text-sm font-bold text-orange-600">{item.daily_price}€/j</span>
                            </div>
                            {item.observations && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-2">{item.observations}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Visibility Dialog */}
        <Dialog open={showVisibilityManager} onOpenChange={setShowVisibilityManager}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Visibilité des catégories
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Choisissez quelles catégories apparaissent sur le site public
              </p>
            </DialogHeader>
            
            <div className="space-y-2 my-4 max-h-[50vh] overflow-y-auto">
              {categories.map((category) => (
                <div 
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    category.visible_catalogue 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => toggleCategoryVisibility(category)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.icon}</span>
                    <span className={`font-medium ${!category.visible_catalogue ? 'text-gray-500' : ''}`}>
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.visible_catalogue ? (
                      <Eye className="w-5 h-5 text-green-600" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-gray-500">
                  {categories.filter(c => c.visible_catalogue).length} / {categories.length} visibles
                </p>
                <Button variant="outline" onClick={() => setShowVisibilityManager(false)}>
                  Fermer
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Order Dialog */}
        <Dialog open={showProductOrder} onOpenChange={setShowProductOrder}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ordre des produits
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Réorganisez l'ordre d'affichage des produits dans le catalogue ({orderedProducts.length} produits)
              </p>
            </DialogHeader>
            
            <div className="space-y-2 my-4 max-h-[50vh] overflow-y-auto pr-2">
              {orderedProducts.map((product, index) => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-gray-400 w-6">{index + 1}.</span>
                    {product.photo_url ? (
                      <img 
                        src={product.photo_url} 
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center text-orange-500">
                        {product.is_pack ? '📦' : '🎛️'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category} • {product.daily_price}€/j</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveProduct(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveProduct(index, 'down')}
                      disabled={index === orderedProducts.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetProductsOrder} disabled={isSavingProducts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
              <Button onClick={saveProductsOrder} disabled={isSavingProducts} className="bg-blue-600 hover:bg-blue-700">
                {isSavingProducts ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </DialogFooter>
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
      </div>
    </div>
  );
}

// ==================== PARAMETRES VIEW ====================

export default CatalogueView;
