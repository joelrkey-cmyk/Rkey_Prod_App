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

  const getDirectWidgetCode = (serverUrl) => {
    return `<!-- Widget Catalogue Location R'Key Prod (Format Petites Icônes & Pop-up) -->
<div id="rkey-catalogue-widget" style="width:100%;max-width:1400px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <style>
    #rkey-catalogue-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .rkey-filter-bar { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
    .rkey-filter-btn { padding: 6px 14px; border: 1.5px solid #f97316; background: transparent; color: #f97316; border-radius: 20px; cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.2s ease; }
    .rkey-filter-btn:hover { background: rgba(249, 115, 22, 0.15); }
    .rkey-filter-btn.active { background: #f97316; color: white; font-weight: 600; }
    .rkey-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    @media (max-width: 480px) { .rkey-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; } }
    .rkey-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; cursor: pointer; user-select: none; transition: all 0.15s ease-in-out; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
    .rkey-card:hover { border-color: #f97316; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: scale(1.02); }
    .rkey-thumb-box { position: relative; width: 100%; padding-bottom: 100%; border-radius: 8px; background: #f8fafc; border: 1px solid #f1f5f9; overflow: hidden; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; }
    .rkey-thumb { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; padding: 6px; transition: transform 0.2s ease; }
    .rkey-card:hover .rkey-thumb { transform: scale(1.05); }
    .rkey-thumb-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 28px; background: #f8fafc; }
    .rkey-photo-badge { position: absolute; bottom: 4px; right: 4px; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); color: white; font-size: 9px; font-weight: 600; padding: 1px 5px; border-radius: 4px; z-index: 2; }
    .rkey-pack-badge { position: absolute; top: 4px; left: 4px; background: #f59e0b; color: white; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; z-index: 2; }
    .rkey-card-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
    .rkey-card-title { font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 31px; }
    .rkey-card:hover .rkey-card-title { color: #f97316; }
    .rkey-card-meta { display: flex; align-items: center; justify-content: space-between; font-size: 10px; margin-top: 4px; gap: 4px; }
    .rkey-card-cat { color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
    .rkey-card-price { font-weight: 700; color: #f97316; white-space: nowrap; }
    .rkey-card-action { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 9px; font-weight: 500; color: #94a3b8; transition: color 0.15s ease; }
    .rkey-card:hover .rkey-card-action { color: #f97316; }
    .rkey-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.25s ease-out; padding: 16px; }
    .rkey-modal-overlay.open { opacity: 1; pointer-events: auto; }
    .rkey-modal-content { background: white; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; }
    .rkey-modal-overlay.open .rkey-modal-content { transform: scale(1); }
    .rkey-modal-header { padding: 20px 20px 12px 20px; border-bottom: 1px solid #f1f5f9; position: relative; }
    .rkey-modal-close { position: absolute; top: 16px; right: 16px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 16px; transition: all 0.2s; }
    .rkey-modal-close:hover { background: #e2e8f0; color: #0f172a; }
    .rkey-modal-title { font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.3; }
    .rkey-modal-price { font-size: 20px; font-weight: 900; color: #f97316; }
    .rkey-modal-body { padding: 20px; overflow-y: auto; }
    .rkey-carousel { position: relative; width: 100%; height: 260px; border-radius: 12px; overflow: hidden; background: #0f172a; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
    .rkey-carousel img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .rkey-carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; font-weight: bold; }
    .rkey-carousel-btn.prev { left: 8px; }
    .rkey-carousel-btn.next { right: 8px; }
    .rkey-modal-sec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
    .rkey-modal-sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
    .rkey-modal-sec-desc { font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-line; }
    .rkey-pack-sec { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
    .rkey-pack-sec-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 0.05em; margin-bottom: 8px; }
    .rkey-pack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px; }
    .rkey-pack-item { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #fef3c7; padding: 6px 8px; border-radius: 6px; font-size: 11px; }
    .rkey-pack-qty { width: 18px; height: 18px; background: #fef3c7; color: #b45309; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; }
  </style>

  <div id="rkey-filter-bar" class="rkey-filter-bar"></div>
  <div id="rkey-container" style="text-align:center;padding:40px;color:#64748b;font-size:14px;">Chargement du matériel...</div>

  <div id="rkey-modal" class="rkey-modal-overlay" onclick="if(event.target===this)closeRkeyModal()">
    <div class="rkey-modal-content">
      <button class="rkey-modal-close" onclick="closeRkeyModal()">✕</button>
      <div class="rkey-modal-header">
        <div id="rkey-modal-badges" style="display:flex;gap:6px;margin-bottom:6px;padding-right:40px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <h3 id="rkey-modal-name" class="rkey-modal-title"></h3>
          <div style="text-align:right;flex-shrink:0;">
            <div id="rkey-modal-price" class="rkey-modal-price"></div>
            <div id="rkey-modal-guarantee" style="font-size:10px;color:#64748b;"></div>
          </div>
        </div>
      </div>
      <div class="rkey-modal-body" id="rkey-modal-body"></div>
      <div style="padding:10px 20px 14px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;">
        <button onclick="closeRkeyModal()" style="padding:6px 14px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">Fermer</button>
      </div>
    </div>
  </div>

  <script>
  (function(){
    var SERVER_URL = '\${serverUrl}';
    var allItems = [], itemMap = {}, currentPhotos = [], currentIdx = 0, autoTimer = null;

    function getPhotos(item) {
      if (!item) return [];
      var list = (Array.isArray(item.photos) && item.photos.length > 0) ? item.photos : (item.photo_url ? [item.photo_url] : []);
      return list.map(function(u) {
        if (!u) return '';
        u = String(u).trim();
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
        return SERVER_URL + (u.startsWith('/') ? '' : '/') + u;
      }).filter(Boolean);
    }

    fetch(SERVER_URL + '/api/location/categories/public')
      .then(function(r){ return r.json(); })
      .then(function(d){
        var cats = d.categories || [];
        var html = '<button class="rkey-filter-btn active" onclick="filterRkeyCat(\\'all\\', this)">Tout</button>';
        html += '<button class="rkey-filter-btn" onclick="filterRkeyCat(\\'pack\\', this)">📦 Packs</button>';
        cats.forEach(function(c){
          if (c.name.toLowerCase() === 'packs') return;
          html += '<button class="rkey-filter-btn" onclick="filterRkeyCat(\\'' + c.name.replace(/'/g, "\\\\'") + '\\', this)">' + (c.icon || '📁') + ' ' + c.name + '</button>';
        });
        document.getElementById('rkey-filter-bar').innerHTML = html;
      }).catch(function(e){ console.error(e); });

    fetch(SERVER_URL + '/api/catalogue/equipements')
      .then(function(r){ return r.json(); })
      .then(function(data){
        allItems = data;
        allItems.forEach(function(it){ itemMap[it.id] = it; });
        renderRkeyItems(allItems);
      }).catch(function(e){
        document.getElementById('rkey-container').innerHTML = '<p style="color:#ef4444;">Impossible de charger le catalogue.</p>';
      });

    window.renderRkeyItems = function(list) {
      var c = document.getElementById('rkey-container');
      if (!list || list.length === 0) {
        c.innerHTML = '<p style="padding:20px;background:white;border-radius:12px;">📦 Aucun équipement disponible dans cette catégorie.</p>';
        return;
      }
      var h = '<div class="rkey-grid">';
      list.forEach(function(it){
        var photos = getPhotos(it);
        var p0 = photos[0];
        h += '<div class="rkey-card" onclick="openRkeyModal(\\'' + it.id + '\\')">';
        h += '<div class="rkey-thumb-box">';
        if (p0) {
          h += '<img src="' + p0 + '" alt="' + it.name + '" class="rkey-thumb" onerror="this.style.display=\\'none\\'">';
        } else {
          h += '<div class="rkey-thumb-placeholder">' + (it.is_pack ? '📦' : '🎛️') + '</div>';
        }
        if (it.is_pack) h += '<div class="rkey-pack-badge">Pack</div>';
        if (photos.length > 1) h += '<div class="rkey-photo-badge">📷 ' + photos.length + '</div>';
        h += '</div>';
        h += '<div class="rkey-card-info">';
        h += '<h4 class="rkey-card-title" title="' + it.name + '">' + it.name + '</h4>';
        h += '<div class="rkey-card-meta"><span class="rkey-card-cat">' + it.category + '</span><span class="rkey-card-price">' + it.daily_price + '€/j</span></div>';
        h += '<div class="rkey-card-action">Voir le détail →</div>';
        h += '</div></div>';
      });
      h += '</div>';
      c.innerHTML = h;
    };

    window.filterRkeyCat = function(cat, btn) {
      document.querySelectorAll('.rkey-filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      if (cat === 'all') {
        renderRkeyItems(allItems);
      } else if (cat === 'pack') {
        renderRkeyItems(allItems.filter(function(it){ return it.is_pack; }));
      } else {
        renderRkeyItems(allItems.filter(function(it){
          if (cat === 'Lumière') return it.category === 'Lumière' || it.category === 'Éclairage';
          if (cat === 'Structure et pieds') return it.category === 'Structure et pieds' || it.category === 'Structure Truss';
          return it.category === cat;
        }));
      }
    };

    window.openRkeyModal = function(id) {
      var item = itemMap[id];
      if (!item) return;
      document.getElementById('rkey-modal-name').textContent = item.name;
      document.getElementById('rkey-modal-price').innerHTML = item.daily_price + '€<span style="font-size:11px;font-weight:normal;color:#64748b;"> / jour</span>';
      document.getElementById('rkey-modal-guarantee').textContent = item.guarantee ? ('Caution : ' + item.guarantee + '€') : '';
      
      var bH = '';
      if (item.is_pack) bH += '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#b45309;">📦 PACK</span>';
      bH += '<span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#475569;">' + item.category + '</span>';
      document.getElementById('rkey-modal-badges').innerHTML = bH;

      currentPhotos = getPhotos(item);
      currentIdx = 0;
      var bodyH = '';
      if (currentPhotos.length > 0) {
        bodyH += '<div class="rkey-carousel" id="rkey-car-box">';
        bodyH += '<img id="rkey-car-img" src="' + currentPhotos[0] + '">';
        if (currentPhotos.length > 1) {
          bodyH += '<button class="rkey-carousel-btn prev" onclick="moveRkeySlide(-1, event)">‹</button>';
          bodyH += '<button class="rkey-carousel-btn next" onclick="moveRkeySlide(1, event)">›</button>';
          bodyH += '<div id="rkey-car-num" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:2px 6px;border-radius:4px;">1/' + currentPhotos.length + '</div>';
        }
        bodyH += '</div>';
      }

      var desc = item.observations || item.catalogue_description || item.description || '';
      bodyH += '<div class="rkey-modal-sec"><div class="rkey-modal-sec-title">📝 Descriptif & Caractéristiques</div>';
      bodyH += '<div class="rkey-modal-sec-desc">' + (desc ? desc : '<em>Aucune description détaillée.</em>') + '</div>';
      if (item.youtube_url) {
        bodyH += '<a href="' + item.youtube_url + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#ef4444;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:600;margin-top:8px;">▶ Voir la vidéo</a>';
      }
      bodyH += '</div>';

      if (item.is_pack && Array.isArray(item.pack_items) && item.pack_items.length > 0) {
        bodyH += '<div class="rkey-pack-sec"><div class="rkey-pack-sec-title">📦 Matériel inclus dans ce pack</div><div class="rkey-pack-grid">';
        item.pack_items.forEach(function(pi){
          bodyH += '<div class="rkey-pack-item"><div class="rkey-pack-qty">' + (pi.quantity||1) + '×</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (pi.name || pi.equipment_name || 'Équipement') + '</div></div>';
        });
        bodyH += '</div></div>';
      }

      document.getElementById('rkey-modal-body').innerHTML = bodyH;
      document.getElementById('rkey-modal').classList.add('open');

      if (autoTimer) clearInterval(autoTimer);
      if (currentPhotos.length > 1) {
        autoTimer = setInterval(function(){ moveRkeySlide(1); }, 3500);
      }
    };

    window.closeRkeyModal = function() {
      document.getElementById('rkey-modal').classList.remove('open');
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    };

    window.moveRkeySlide = function(dir, ev) {
      if (ev) ev.stopPropagation();
      if (currentPhotos.length <= 1) return;
      currentIdx = (currentIdx + dir + currentPhotos.length) % currentPhotos.length;
      var img = document.getElementById('rkey-car-img');
      var num = document.getElementById('rkey-car-num');
      if (img) img.src = currentPhotos[currentIdx];
      if (num) num.textContent = (currentIdx + 1) + '/' + currentPhotos.length;
    };
  })();
  </script>
</div>`;
  };

  const generateWidgetCode = () => {
    let productionUrl = window.location.origin;
    if (productionUrl.includes('ais-dev') || productionUrl.includes('ais-pre') || productionUrl.includes('localhost')) {
      productionUrl = 'https://rkeyprodapp.fr';
    }

    const code = getDirectWidgetCode(productionUrl);
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
              <DialogTitle className="flex items-center gap-2">
                <span>🔗</span> Code Widget Catalogue
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Code HTML optimisé pour le Créateur de site Hostinger (petites icônes & fenêtre de détails)
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap select-all border border-gray-800">
                {widgetCode}
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3.5 text-xs text-orange-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-orange-900">
                  <span>💡</span> Instructions pour le Créateur de sites Hostinger :
                </div>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Cliquez sur <strong>"Copier le code"</strong> ci-dessous.</li>
                  <li>Sur votre éditeur Hostinger, cliquez sur votre bloc de catalogue puis sur <strong>"Entrer le code"</strong>.</li>
                  <li>Collez ce code, enregistrez et publiez votre site.</li>
                </ol>
                <p className="text-[11px] text-gray-500 pt-1 border-t border-orange-200/60">
                  Ce code intègre directement le design compact (petites icônes de 150px, filtres par catégorie, pop-up avec diaporama) et est synchronisé en temps réel avec votre catalogue R'Key Prod.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
                Fermer
              </Button>
              <Button onClick={copyWidgetCode} className="bg-orange-600 hover:bg-orange-700">
                <Copy className="w-4 h-4 mr-2" />
                Copier le code pour Hostinger
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
