// LivraisonsView - Module Location
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

function LivraisonsView() {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);

  // Charger les données depuis les DEVIS (pas les réservations) car c'est là que les infos de livraison sont stockées
  // Exclure les devis archivés
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quotesRes, clientsRes] = await Promise.all([
          axios.get(`${API}/quotes?archived=false`),
          axios.get(`${API}/clients`)
        ]);
        setQuotes(quotesRes.data || []);
        setClients(clientsRes.data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des livraisons:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API]);
  
  // Calculer le début et la fin de la semaine en cours
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  // Filtrer les devis avec livraison (delivery_cost > 0 ou delivery_zone définie)
  // Critères: devis ACCEPTÉ + forfait livraison appliqué
  const quotesWithDelivery = quotes.filter(q => {
    const hasDelivery = q.delivery_cost > 0 || (q.delivery_zone && q.delivery_zone !== '');
    const isAccepted = q.status === 'Accepté' || q.status === 'accepted';
    return hasDelivery && isAccepted;
  });
  
  // Séparer les livraisons de la semaine et les livraisons à venir
  const thisWeekDeliveries = quotesWithDelivery.filter(q => {
    const startDate = new Date(q.start_date);
    startDate.setHours(0, 0, 0, 0);
    return startDate >= startOfWeek && startDate <= endOfWeek;
  });
  
  const upcomingDeliveries = quotesWithDelivery.filter(q => {
    const startDate = new Date(q.start_date);
    startDate.setHours(0, 0, 0, 0);
    return startDate > endOfWeek;
  }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  
  // Fonction pour obtenir le nom du client/DJ
  const getClientName = (quote) => {
    if (quote.booking_type === 'dj') {
      return quote.dj_name || 'DJ inconnu';
    }
    if (quote.client_name) return quote.client_name;
    const client = clients.find(c => c.id === quote.client_id);
    return client ? (client.company_name || client.name) : 'Client inconnu';
  };
  
  // Fonction pour formater la date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Fonction pour obtenir le label de la zone de livraison
  const getDeliveryZoneLabel = (zone, km) => {
    const zones = {
      'zone1': 'Zone 1 - Local (<20km)',
      'zone2': 'Zone 2 - Départemental (20-50km)',
      'zone3': 'Zone 3 - Régional (50-70km)',
      'hors_zone': `Hors zone (${km || '?'}km)`
    };
    return zones[zone] || zone || 'Non définie';
  };
  
  // Composant pour afficher une carte de livraison (version compacte avec accordéon)
  const DeliveryCard = ({ quote, isThisWeek, onUpdateDeliveryAddress }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState(quote.delivery_address || '');
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // États pour le retrait
    const [pickupByUs, setPickupByUs] = useState(quote.pickup_by_us || false);
    const [pickupByClient, setPickupByClient] = useState(quote.pickup_by_client || false);
    const [pickupAddress, setPickupAddress] = useState(quote.pickup_address || '');
    const [isEditingPickupAddress, setIsEditingPickupAddress] = useState(false);
    
    const startDate = new Date(quote.start_date);
    const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
    
    // Les items du devis sont dans quote.items (pas equipment_items)
    const equipmentItems = quote.items || [];
    
    // Calculer la quantité totale d'équipements
    const totalEquipmentCount = equipmentItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Construire les notes à partir des infos client
    const client = clients.find(c => c.id === quote.client_id);
    let notesDisplay = [];
    if (client) {
      if (client.phone) notesDisplay.push(`Tél: ${client.phone}`);
      if (client.email) notesDisplay.push(`Email: ${client.email}`);
      if (client.address && !deliveryAddress) notesDisplay.push(`Adresse client: ${client.address}`);
    }
    if (quote.notes) notesDisplay.push(quote.notes);
    const notesText = notesDisplay.join(' | ');
    
    // Sauvegarder l'adresse de livraison
    const handleSaveAddress = async () => {
      setIsSaving(true);
      try {
        await axios.patch(`${API}/quotes/${quote.id}`, {
          delivery_address: deliveryAddress
        });
        setIsEditingAddress(false);
        toast.success('Adresse de livraison enregistrée');
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la sauvegarde');
      } finally {
        setIsSaving(false);
      }
    };
    
    // Sauvegarder les options de retrait
    const handleSavePickupOptions = async (byUs, byClient, address = pickupAddress) => {
      try {
        await axios.patch(`${API}/quotes/${quote.id}`, {
          pickup_by_us: byUs,
          pickup_by_client: byClient,
          pickup_address: address
        });
        toast.success('Options de retrait enregistrées');
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la sauvegarde');
      }
    };
    
    // Gérer le changement de "Retrait par nos soins"
    const handlePickupByUsChange = (checked) => {
      setPickupByUs(checked);
      if (checked) {
        setPickupByClient(false);
        handleSavePickupOptions(true, false, pickupAddress);
      } else {
        handleSavePickupOptions(false, pickupByClient, pickupAddress);
      }
    };
    
    // Gérer le changement de "Le client ramène le matériel"
    const handlePickupByClientChange = (checked) => {
      setPickupByClient(checked);
      if (checked) {
        setPickupByUs(false);
        setPickupAddress('');
        handleSavePickupOptions(false, true, '');
      } else {
        handleSavePickupOptions(pickupByUs, false, pickupAddress);
      }
    };
    
    // Sauvegarder l'adresse de retrait
    const handleSavePickupAddress = async () => {
      setIsSaving(true);
      try {
        await axios.patch(`${API}/quotes/${quote.id}`, {
          pickup_address: pickupAddress
        });
        setIsEditingPickupAddress(false);
        toast.success('Adresse de retrait enregistrée');
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la sauvegarde');
      } finally {
        setIsSaving(false);
      }
    };
    
    // Générer et imprimer le bon de livraison
    const handlePrintDeliveryNote = () => {
      const clientName = getClientName(quote);
      const clientInfo = client || {};
      const deliveryAddr = deliveryAddress || clientInfo.address || 'Non spécifiée';
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bon de Livraison - ${clientName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; background: #f0f0f0; padding: 8px; border-left: 4px solid #FF6B00; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-item { padding: 5px 0; }
            .info-item strong { display: inline-block; min-width: 120px; }
            .equipment-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .equipment-table th, .equipment-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .equipment-table th { background: #f5f5f5; }
            .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .signature-box { border: 1px solid #ddd; padding: 15px; min-height: 100px; }
            .signature-box p { margin-bottom: 60px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BON DE LIVRAISON</h1>
            <p>R'KEY PROD - Location de Matériel</p>
          </div>
          
          <div class="section">
            <div class="section-title">INFORMATIONS CLIENT</div>
            <div class="info-grid">
              <div class="info-item"><strong>Client:</strong> ${clientName}</div>
              <div class="info-item"><strong>Téléphone:</strong> ${clientInfo.phone || 'Non renseigné'}</div>
              <div class="info-item"><strong>Email:</strong> ${clientInfo.email || 'Non renseigné'}</div>
              <div class="info-item"><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">ADRESSE DE LIVRAISON</div>
            <p style="padding: 10px; background: #fff9e6; border: 1px solid #ffc107;">${deliveryAddr}</p>
          </div>
          
          <div class="section">
            <div class="section-title">PÉRIODE DE LOCATION</div>
            <div class="info-grid">
              <div class="info-item"><strong>Livraison:</strong> ${formatDate(quote.start_date)}</div>
              <div class="info-item"><strong>Retour prévu:</strong> ${formatDate(quote.end_date)}</div>
              <div class="info-item"><strong>Zone:</strong> ${getDeliveryZoneLabel(quote.delivery_zone, quote.delivery_km)}</div>
              <div class="info-item"><strong>Frais livraison:</strong> ${quote.delivery_cost || 0}€</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">RETOUR DU MATÉRIEL</div>
            <div style="padding: 10px; background: ${pickupByClient ? '#e8f5e9' : pickupByUs ? '#e3f2fd' : '#fff'}; border: 1px solid ${pickupByClient ? '#4caf50' : pickupByUs ? '#2196f3' : '#ddd'};">
              ${pickupByClient ? '<strong>✓ Le client ramène le matériel</strong>' : ''}
              ${pickupByUs ? `<strong>✓ Retrait par nos soins</strong><br><br><strong>Adresse de retrait:</strong> ${pickupAddress || deliveryAddr}` : ''}
              ${!pickupByClient && !pickupByUs ? '<em>Mode de retour non défini</em>' : ''}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">ÉQUIPEMENTS LIVRÉS</div>
            <table class="equipment-table">
              <thead>
                <tr>
                  <th>Qté</th>
                  <th>Désignation</th>
                  <th>Prix/jour</th>
                </tr>
              </thead>
              <tbody>
                ${equipmentItems.map(item => `
                  <tr>
                    <td>${item.quantity}x</td>
                    <td>${item.equipment_name || item.name || 'Équipement'}</td>
                    <td>${item.daily_price || item.daily_rate || 0}€</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="margin-top: 10px; text-align: right;"><strong>Total: ${quote.total_amount || 0}€</strong></p>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <p>Signature du livreur:</p>
              <p style="margin-top: 40px;">Date: ___/___/______</p>
            </div>
            <div class="signature-box">
              <p>Signature du client:</p>
              <p style="margin-top: 40px;">Date: ___/___/______</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Matériel reçu en bon état. Le client s'engage à restituer le matériel dans le même état.</p>
            <p style="margin-top: 5px;">R'KEY PROD - Contact: contact@rkeyprod.com</p>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    };
    
    return (
      <Card className={`hover:shadow-lg transition-all ${isThisWeek ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-400'}`}>
        <CardContent className="p-0">
          {/* En-tête compact - toujours visible */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <Truck className={`w-5 h-5 ${isThisWeek ? 'text-red-500' : 'text-blue-500'}`} />
              <div>
                <h3 className="font-semibold text-lg">{getClientName(quote)}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(quote.start_date)} • {totalEquipmentCount} équipement{totalEquipmentCount > 1 ? 's' : ''}
                </p>
              </div>
              {isThisWeek && daysUntil <= 2 && (
                <Badge className="bg-red-500 text-white ml-2">
                  {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? "Demain" : `Dans ${daysUntil} jours`}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{quote.total_amount || 0}€</p>
                <Badge className={quote.booking_type === 'dj' ? 'bg-orange-500' : 'bg-blue-500'}>
                  {quote.booking_type === 'dj' ? 'DJ' : 'Client'}
                </Badge>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
          
          {/* Détails - visible seulement si déplié */}
          {isExpanded && (
            <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
              {/* Bouton imprimer */}
              <div className="flex justify-end mb-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); handlePrintDeliveryNote(); }}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer bon de livraison
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span><strong>Livraison:</strong> {formatDate(quote.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span><strong>Retour:</strong> {formatDate(quote.end_date)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span><strong>Zone:</strong> {getDeliveryZoneLabel(quote.delivery_zone, quote.delivery_km)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span><strong>Frais livraison:</strong> {quote.delivery_cost || 0}€</span>
                  </div>
                </div>
              </div>
              
              {/* Adresse de livraison */}
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse de livraison:
                  </p>
                  {!isEditingAddress && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); setIsEditingAddress(true); }}
                      className="text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      {deliveryAddress ? 'Modifier' : 'Ajouter'}
                    </Button>
                  )}
                </div>
                
                {isEditingAddress ? (
                  <div className="bg-white rounded-lg border p-3" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Entrez l'adresse de livraison complète..."
                      className="w-full p-2 border rounded text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { setIsEditingAddress(false); setDeliveryAddress(quote.delivery_address || ''); }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveAddress}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border p-3 text-sm">
                    {deliveryAddress || client?.address || <span className="text-gray-400 italic">Aucune adresse de livraison définie</span>}
                  </div>
                )}
              </div>
              
              {/* Options de retrait */}
              <div className="mt-4 pt-3 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Retour du matériel:
                </p>
                
                <div className="bg-white rounded-lg border p-3 space-y-3">
                  {/* Option: Retrait par nos soins */}
                  <label 
                    className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${pickupByUs ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={pickupByUs}
                      onChange={(e) => handlePickupByUsChange(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">Retrait par nos soins</span>
                      <p className="text-xs text-gray-500">Nous allons récupérer le matériel chez le client</p>
                    </div>
                  </label>
                  
                  {/* Adresse de retrait (visible uniquement si "Retrait par nos soins" est coché) */}
                  {pickupByUs && (
                    <div className="ml-7 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Adresse de retrait:
                        </p>
                        {!isEditingPickupAddress && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); setIsEditingPickupAddress(true); }}
                            className="text-xs h-6"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {pickupAddress ? 'Modifier' : 'Ajouter'}
                          </Button>
                        )}
                      </div>
                      
                      {isEditingPickupAddress ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <textarea
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            placeholder="Entrez l'adresse de retrait..."
                            className="w-full p-2 border rounded text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs"
                              onClick={() => { setIsEditingPickupAddress(false); setPickupAddress(quote.pickup_address || ''); }}
                            >
                              Annuler
                            </Button>
                            <Button 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={handleSavePickupAddress}
                              disabled={isSaving}
                            >
                              {isSaving ? '...' : 'Enregistrer'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded p-2 text-sm">
                          {pickupAddress || deliveryAddress || client?.address || <span className="text-gray-400 italic">Même adresse que la livraison</span>}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Option: Le client ramène le matériel */}
                  <label 
                    className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${pickupByClient ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={pickupByClient}
                      onChange={(e) => handlePickupByClientChange(e.target.checked)}
                      className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">Le client ramène le matériel</span>
                      <p className="text-xs text-gray-500">Le client dépose le matériel chez nous</p>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Équipements à livrer */}
              {equipmentItems.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Équipements à livrer:
                  </p>
                  <div className="bg-white rounded-lg border p-3">
                    <ul className="space-y-1">
                      {equipmentItems.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded flex items-center justify-center text-xs font-medium">
                              {item.quantity}x
                            </span>
                            <span className="font-medium">{item.equipment_name || item.name || 'Équipement'}</span>
                          </span>
                          {(item.daily_price || item.daily_rate) && (
                            <span className="text-gray-500">{item.daily_price || item.daily_rate}€/jour</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {notesText && (
                <div className="mt-3 text-sm text-gray-500 bg-white p-3 rounded-lg border">
                  <strong>Notes:</strong> {notesText}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-2" />
          <p className="text-gray-500">Chargement des livraisons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Truck className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
            <p className="text-gray-500">Gérez vos livraisons de matériel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-600">{thisWeekDeliveries.length}</p>
            <p className="text-xs text-red-600">Cette semaine</p>
          </div>
          <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold text-blue-600">{upcomingDeliveries.length}</p>
            <p className="text-xs text-blue-600">À venir</p>
          </div>
        </div>
      </div>
      
      {/* Période de la semaine */}
      <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-600">
        <strong>Semaine actuelle:</strong> {startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Section: Livraisons de la semaine */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-800">Livraisons de la semaine</h2>
          <Badge className="bg-red-500">{thisWeekDeliveries.length}</Badge>
        </div>
        
        {thisWeekDeliveries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune livraison prévue cette semaine</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {thisWeekDeliveries
              .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
              .map((quote) => (
                <DeliveryCard key={quote.id} quote={quote} isThisWeek={true} />
              ))}
          </div>
        )}
      </div>

      {/* Section: Livraisons à venir */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-800">Livraisons à venir</h2>
          <Badge className="bg-blue-500">{upcomingDeliveries.length}</Badge>
        </div>
        
        {upcomingDeliveries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune livraison à venir</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingDeliveries.map((quote) => (
              <DeliveryCard key={quote.id} quote={quote} isThisWeek={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Archives View Component - Affichage des réservations et devis archivés

export default LivraisonsView;
