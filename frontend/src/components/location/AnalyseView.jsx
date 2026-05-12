// AnalyseView - Module Location
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

function AnalyseView() {
  const [reservations, setReservations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all reservations
      const reservationsResponse = await axios.get(`${API}/reservations`);
      const allReservations = reservationsResponse.data || [];
      setReservations(allReservations);
      
      // Fetch all equipment
      const equipmentResponse = await axios.get(`${API}/equipment`);
      setEquipment(equipmentResponse.data || []);
      
      // Extract available years from reservations
      const years = new Set();
      allReservations.forEach(res => {
        if (res.start_date) {
          const year = new Date(res.start_date).getFullYear();
          years.add(year);
        }
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter reservations by year
  const filteredReservations = reservations.filter(res => {
    if (selectedYear === 'all') return true;
    if (!res.start_date) return false;
    const resYear = new Date(res.start_date).getFullYear();
    return resYear === parseInt(selectedYear);
  });

  // Calculate statistics per equipment
  const calculateStats = () => {
    const stats = {};
    
    filteredReservations.forEach(reservation => {
      if (!reservation.equipment_items) return;
      
      reservation.equipment_items.forEach(item => {
        const equipmentId = item.equipment_id;
        
        if (!stats[equipmentId]) {
          // Find equipment details to get purchase price AND category
          const equipmentDetails = equipment.find(eq => eq.id === equipmentId);
          
          // Debug: log if equipment not found
          if (!equipmentDetails) {
            console.log(`⚠️ Equipment not found in table for ID: ${equipmentId}, name: ${item.equipment_name}`);
          }
          
          stats[equipmentId] = {
            equipment_id: equipmentId,
            equipment_name: equipmentDetails?.name || item.equipment_name || item.name || 'Inconnu',
            category: equipmentDetails?.category || item.category || 'Autre',
            reference: equipmentDetails?.reference || item.reference || '',
            purchase_price: equipmentDetails?.purchase_price || null,
            total_rentals: 0,
            total_revenue: 0,
            total_days: 0
          };
        }
        
        stats[equipmentId].total_rentals += 1;
        stats[equipmentId].total_revenue += (item.subtotal || 0);
        stats[equipmentId].total_days += (item.total_days || 0);
      });
    });
    
    // Convert to array and filter out cables
    let statsArray = Object.values(stats).filter(stat => 
      stat.category && stat.category.toLowerCase() !== 'câbles' && stat.category.toLowerCase() !== 'cables'
    );
    
    // Filter by selected category if not 'all'
    if (selectedCategory !== 'all') {
      statsArray = statsArray.filter(stat => stat.category === selectedCategory);
    }
    
    // Sort by revenue (descending)
    statsArray.sort((a, b) => b.total_revenue - a.total_revenue);
    
    return statsArray;
  };

  const stats = calculateStats();

  // Calculate KPIs
  const totalRevenue = stats.reduce((sum, item) => sum + item.total_revenue, 0);
  const totalRentals = stats.reduce((sum, item) => sum + item.total_rentals, 0);
  const topEquipment = stats.length > 0 ? stats[0] : null;

  // Get all unique categories (excluding cables)
  const allCategories = [...new Set(equipment
    .filter(eq => eq.category && eq.category.toLowerCase() !== 'câbles' && eq.category.toLowerCase() !== 'cables')
    .map(eq => eq.category))];

  const exportToCSV = () => {
    const headers = ['Équipement', 'Catégorie', 'Référence', 'Nombre de locations', 'Revenus générés (€)', 'Prix d\'achat (€)'];
    const rows = stats.map(item => [
      item.equipment_name,
      item.category,
      item.reference,
      item.total_rentals,
      item.total_revenue.toFixed(2),
      item.purchase_price ? item.purchase_price.toFixed(2) : '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analyse_locations_${selectedYear === 'all' ? 'toutes' : selectedYear}.csv`;
    link.click();
    
    toast.success('Export CSV réussi !');
  };

  const categoryColors = {
    'Sonorisation': 'bg-purple-500',
    'Éclairage': 'bg-yellow-500',
    'Lumière': 'bg-yellow-500',
    'Vidéo': 'bg-blue-500',
    'Packs': 'bg-green-500',
    'Machine FX': 'bg-pink-500',
    'Structure et pieds': 'bg-gray-500',
    'Structure Truss': 'bg-gray-500',
    'DJ': 'bg-orange-400',
    'Divers': 'bg-orange-500'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📊 Analyse des Locations</h2>
          <p className="text-gray-600 mt-1">Statistiques de performance du matériel</p>
        </div>
        <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Year Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block">📅 Période</Label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📆 Depuis toujours</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block">🏷️ Catégorie</Label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📂 Toutes les catégories</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">💰 Revenus Total</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {totalRevenue.toFixed(2)} €
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Rentals */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">📦 Nombre de Locations</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {totalRentals}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Equipment */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">🏆 Top Équipement</p>
                <p className="text-lg font-bold text-purple-600 mt-2 truncate">
                  {topEquipment ? topEquipment.equipment_name : 'N/A'}
                </p>
                {topEquipment && (
                  <p className="text-sm text-gray-500 mt-1">
                    {topEquipment.total_revenue.toFixed(2)} €
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🥇</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Détail des Statistiques par Équipement
            <Badge variant="outline" className="ml-2">{stats.length} équipements</Badge>
          </CardTitle>
          <CardDescription>
            {selectedYear === 'all' ? 'Toutes les années' : `Année ${selectedYear}`}
            {selectedCategory !== 'all' && ` • Catégorie: ${selectedCategory}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Chargement des données...</p>
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">Aucune donnée disponible pour les filtres sélectionnés</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold">#</TableHead>
                    <TableHead className="font-bold">Équipement</TableHead>
                    <TableHead className="font-bold">Catégorie</TableHead>
                    <TableHead className="font-bold text-center">Référence</TableHead>
                    <TableHead className="font-bold text-center">Nombre de Locations</TableHead>
                    <TableHead className="font-bold text-right">Revenus Générés</TableHead>
                    <TableHead className="font-bold text-right">Prix d'Achat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((item, index) => (
                    <TableRow key={item.equipment_id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.equipment_name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${categoryColors[item.category] || 'bg-gray-500'} text-white`}
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {item.reference || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.total_rentals} fois
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${
                        !item.purchase_price || item.purchase_price === 0
                          ? 'text-gray-400'  // Gris clair si pas de prix d'achat
                          : item.total_revenue >= item.purchase_price
                            ? 'text-green-700'  // Vert si rentabilisé
                            : 'text-red-600'     // Rouge si pas encore rentabilisé
                      }`}>
                        {item.total_revenue.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {item.purchase_price ? `${item.purchase_price.toFixed(2)} €` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CATALOGUE VIEW ====================

export default AnalyseView;
