// AgendaView - Module Location
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

function AgendaView({ stats, setCurrentView }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('Mois');
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedDayReservations, setSelectedDayReservations] = useState([]);
  
  // Form states for reservation creation
  const [addReservationForm, setAddReservationForm] = useState({
    booking_type: 'dj',
    client_id: '',
    dj_id: '',
    start_date: '',
    end_date: '',
    event: '',
    notes: ''
  });
  const [selectedEquipmentForReservation, setSelectedEquipmentForReservation] = useState([]);
  const [clients, setClients] = useState([]);
  const [djs, setDjs] = useState([]);
  const [equipment, setEquipment] = useState([]);

  // États pour la modification de réservation depuis l'agenda
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editFormData, setEditFormData] = useState({
    start_date: '',
    end_date: '',
    equipment_items: [],
    notes: ''
  });

  // États pour la recherche d'équipements (nouvelle réservation et modification)
  const [equipmentSearchNew, setEquipmentSearchNew] = useState({}); // {index: searchTerm} pour nouvelle réservation
  const [showSuggestionsNew, setShowSuggestionsNew] = useState({}); // {index: boolean} pour nouvelle réservation
  const [equipmentSearchEdit, setEquipmentSearchEdit] = useState(''); // Pour modification (un seul champ)
  const [showSuggestionsEdit, setShowSuggestionsEdit] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchClients();
    fetchDJs();
    fetchEquipment();
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await axios.get(`${API}/reservations`);
      setReservations(response.data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    }
  };

  // Helper function to get client display name (company name if exists, otherwise contact name)
  const getClientDisplayNameFromReservation = (reservation) => {
    if (!reservation) return 'Inconnu';
    
    if (reservation.booking_type === 'dj') {
      return reservation.dj_name || 'DJ';
    }
    
    // Pour les clients, chercher les infos complètes du client
    const client = clients.find(c => c.id === reservation.client_id);
    if (client && client.company_name) {
      // Si c'est une entreprise, afficher uniquement le nom de l'entreprise
      return client.company_name;
    }
    
    // Sinon afficher le nom du contact
    return reservation.client_name || 'Client';
  };

  // Helper function to get display text and color for reservations
  const getReservationDisplay = (reservation) => {
    // Protection contre les réservations invalides
    if (!reservation) {
      return { text: '?', color: '#9ca3af' };
    }
    
    // Vérifier si la réservation inclut une livraison (delivery_zone non vide)
    const hasDelivery = reservation.delivery_zone && reservation.delivery_zone !== '' && reservation.delivery_zone !== 'none';
    
    if (reservation.booking_type === 'client') {
      // Client avec livraison: couleur violette
      if (hasDelivery) {
        return {
          text: getClientDisplayNameFromReservation(reservation) || 'Client',
          color: '#8b5cf6' // Violet pour les livraisons
        };
      }
      // Client sans livraison: couleur bleue
      return {
        text: getClientDisplayNameFromReservation(reservation) || 'Client',
        color: '#3b82f6' // Bleu
      };
    } else {
      // DJ: afficher les références du matériel (4 lettres max)
      const equipmentLabels = (reservation.equipment_items || [])
        .map(item => item?.reference || (item?.equipment_name || '').substring(0, 4))
        .filter(label => label && label.length > 0)
        .join('/');
      
      // Trouver la couleur du DJ
      const dj = djs.find(d => d.id === reservation.dj_id);
      const djColor = dj?.color || '#f97316'; // Orange par défaut
      
      return {
        text: equipmentLabels || reservation.dj_name || 'DJ',
        color: djColor
      };
    }
  };

  const handleDayClick = (day, dayReservations) => {
    setSelectedDate(day);
    setSelectedDayReservations(dayReservations);
    setShowDayDetails(true);
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setCalendarView('Jour');
    console.log('Date clicked:', day.toLocaleDateString('fr-FR')); // Debug log
  };

  const handleReservationClick = (reservation) => {
    // Navigate to the appropriate section based on booking type
    if (reservation.booking_type === 'client') {
      // Navigate to reservations view and highlight this reservation
      setCurrentView('reservations');
    } else {
      // For DJ reservations, also navigate to reservations view
      setCurrentView('reservations');
    }
    
    // Optional: You could also add logic to scroll to the specific reservation
    setTimeout(() => {
      const reservationElement = document.getElementById(`reservation-${reservation.id}`);
      if (reservationElement) {
        reservationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reservationElement.classList.add('highlight-reservation');
        setTimeout(() => {
          reservationElement.classList.remove('highlight-reservation');
        }, 3000);
      }
    }, 500);
  };

  const changeReservationStatus = async (reservationId, newStatus) => {
    const statusLabels = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'equipment_withdrawn': 'Matériel retiré',
      'equipment_returned': 'Matériel rendu',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };

    // Special handling for "Matériel retiré" - ouvrir la modal
    if (newStatus === 'equipment_withdrawn') {
      const reservation = reservations.find(r => r.id === reservationId);
      setCurrentReservationForSlip(reservation);
      setShowWithdrawalSlipModal(true);
      return; // Ne pas changer le statut tout de suite, attendre la décision de l'utilisateur
    }

    // Special handling for cancellation
    if (newStatus === 'cancelled') {
      const reservation = reservations.find(r => r.id === reservationId);
      const clientName = reservation ? (reservation.client_name || reservation.dj_name) : 'cette réservation';
      
      const confirmDelete = window.confirm(
        `⚠️ ANNULATION DE RÉSERVATION ⚠️\n\n` +
        `Êtes-vous sûr de vouloir ANNULER définitivement la réservation de "${clientName}" ?\n\n` +
        `Cette action va :\n` +
        `• Supprimer complètement l'événement de l'agenda\n` +
        `• Rendre le matériel disponible\n` +
        `• Cette action est IRRÉVERSIBLE\n\n` +
        `Confirmez-vous l'annulation ?`
      );

      if (confirmDelete) {
        try {
          // Delete the reservation instead of just changing status
          await axios.delete(`${API}/reservations/${reservationId}`);
          
          // Refresh reservations to update display
          await fetchReservations();
          
          // Update the selected day reservations if modal is open
          if (showDayDetails && selectedDate) {
            const dayReservations = reservations.filter(reservation => {
              const startDate = new Date(reservation.start_date);
              const endDate = new Date(reservation.end_date);
              const currentDay = new Date(selectedDate);
              currentDay.setHours(0, 0, 0, 0);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);
              
              return currentDay >= startDate && currentDay <= endDate && reservation.id !== reservationId;
            });
            setSelectedDayReservations(dayReservations);
          }
          
          toast.success(`✅ Réservation de "${clientName}" annulée et supprimée de l'agenda`);
        } catch (error) {
          console.error('Error deleting reservation:', error);
          toast.error('❌ Erreur lors de l\'annulation de la réservation');
        }
      }
    } else {
      // Normal status change for other statuses
      if (window.confirm(`Changer le statut vers "${statusLabels[newStatus]}" ?`)) {
        try {
          await axios.put(`${API}/reservations/${reservationId}/change-status`, { status: newStatus });
          
          // Refresh reservations to update display
          await fetchReservations();
          
          // Update the selected day reservations if modal is open
          if (showDayDetails && selectedDate) {
            const dayReservations = reservations.filter(reservation => {
              const startDate = new Date(reservation.start_date);
              const endDate = new Date(reservation.end_date);
              const currentDay = new Date(selectedDate);
              currentDay.setHours(0, 0, 0, 0);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);
              
              return currentDay >= startDate && currentDay <= endDate;
            });
            setSelectedDayReservations(dayReservations);
          }
          
          toast.success(`Statut changé vers "${statusLabels[newStatus]}"`);
        } catch (error) {
          console.error('Error changing status:', error);
          toast.error('Erreur lors du changement de statut');
        }
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-600"><Check className="w-3 h-3 mr-1" />Acceptée</Badge>;
      case 'equipment_withdrawn':
        return <Badge className="bg-purple-600"><Package className="w-3 h-3 mr-1" />Matériel retiré</Badge>;
      case 'equipment_returned':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Matériel retourné</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600"><Archive className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Navigation rapide par mois
  const handleMonthChange = (monthIndex) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(monthIndex));
    setCurrentDate(newDate);
  };

  // Navigation rapide par année
  const handleYearChange = (year) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(year));
    setCurrentDate(newDate);
  };

  // Liste des mois en français
  const monthsList = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Générer les années disponibles (5 ans avant et après l'année courante)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Add reservation handlers
  const handleAddReservationClick = (date = null) => {
    const targetDate = date || new Date();
    setSelectedDate(targetDate);
    setAddReservationForm({
      booking_type: 'dj',
      client_id: '',
      dj_id: '',
      start_date: formatDateLocal(targetDate),
      end_date: formatDateLocal(targetDate),
      event: '',
      notes: '',
      status: 'accepted'  // Statut par défaut : Accepté
    });
    setSelectedEquipmentForReservation([]);
    setShowAddReservation(true);
  };

  const addEquipmentToReservation = () => {
    setSelectedEquipmentForReservation([...selectedEquipmentForReservation, { equipment_id: '', quantity: 1 }]);
  };

  const removeEquipmentFromReservation = (index) => {
    setSelectedEquipmentForReservation(selectedEquipmentForReservation.filter((_, i) => i !== index));
  };

  const updateEquipmentInReservation = (index, field, value) => {
    const updated = [...selectedEquipmentForReservation];
    updated[index][field] = value;
    setSelectedEquipmentForReservation(updated);
  };

  const handleCreateReservation = async (e) => {
    e?.preventDefault();
    
    const isClientBooking = addReservationForm.booking_type === 'client';
    const requiredId = isClientBooking ? addReservationForm.client_id : addReservationForm.dj_id;
    
    if (!requiredId || !addReservationForm.start_date || !addReservationForm.end_date || selectedEquipmentForReservation.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create reservation directly without creating a quote first
      const reservationData = {
        booking_type: addReservationForm.booking_type,
        items: selectedEquipmentForReservation,
        start_date: addReservationForm.start_date,
        end_date: addReservationForm.end_date,
        event: addReservationForm.event || '',
        notes: addReservationForm.notes || '',
        status: addReservationForm.status || 'accepted'  // Statut Accepté par défaut
      };

      if (isClientBooking) {
        reservationData.client_id = addReservationForm.client_id;
      } else {
        reservationData.dj_id = addReservationForm.dj_id;
      }
      
      // Use the new direct endpoint
      await axios.post(`${API}/reservations/direct`, reservationData);
      
      toast.success('Réservation créée avec succès depuis l\'agenda !');
      setShowAddReservation(false);
      
      // Reset form
      setAddReservationForm({
        booking_type: 'dj',
        client_id: '',
        dj_id: '',
        start_date: '',
        end_date: '',
        event: '',
        notes: '',
        status: 'accepted'
      });
      setSelectedEquipmentForReservation([]);
      
      await fetchReservations();
    } catch (error) {
      console.error('Error creating reservation:', error);
      
      // Check if error is related to insufficient stock
      const errorMessage = error?.response?.data?.detail || error?.message || '';
      if (errorMessage.includes('Insufficient quantity') || errorMessage.includes('insufficient')) {
        // Extract the item name from the error message
        let itemName = errorMessage.replace('Insufficient quantity for pack item', '').replace('Insufficient quantity for', '').trim();
        // Remove the "(need X, have Y)" part if present
        itemName = itemName.split('(')[0].trim();
        toast.error(`❌ Stock insuffisant pour : ${itemName}`, {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: 'white',
            fontWeight: 'bold'
          }
        });
      } else {
        toast.error('Erreur lors de la création de la réservation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fonctions pour filtrer les équipements lors de la recherche
  const getFilteredEquipmentForAgenda = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    return equipment.filter(eq => 
      (eq.name?.toLowerCase().includes(lowerSearch) || 
       eq.reference?.toLowerCase().includes(lowerSearch) ||
       eq.category?.toLowerCase().includes(lowerSearch)) &&
      (!eq.maintenance_status || eq.maintenance_status === 'operational')
    ).slice(0, 10); // Limiter à 10 résultats
  };

  // Sélectionner équipement depuis la recherche (nouvelle réservation)
  const selectEquipmentFromSearchNew = (index, equipmentId) => {
    updateEquipmentInReservation(index, 'equipment_id', equipmentId);
    setEquipmentSearchNew({ ...equipmentSearchNew, [index]: '' });
    setShowSuggestionsNew({ ...showSuggestionsNew, [index]: false });
  };

  // Sélectionner équipement depuis la recherche (modification)
  const selectEquipmentFromSearchEdit = (equipmentId) => {
    addEquipmentToReservationEdit(equipmentId);
    setEquipmentSearchEdit('');
    setShowSuggestionsEdit(false);
  };

  // Obtenir le nom de l'équipement par ID
  const getEquipmentNameById = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.name : '';
  };

  // Obtenir la catégorie de l'équipement par ID
  const getEquipmentCategoryById = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.category : '';
  };

  // Fonctions de modification de réservation (similaires à ReservationsViewIntegrated)
  const handleEditReservationFromAgenda = async (reservation) => {
    setEditingReservation(reservation);
    
    // Fermer la première pop-up des détails du jour
    setShowDayDetails(false);
    
    // Enrichir les equipment_items avec les informations complètes
    const enrichedEquipmentItems = (reservation.equipment_items || []).map(item => {
      // Chercher l'équipement complet dans la liste
      const fullEquipment = equipment.find(eq => eq.id === item.equipment_id);
      if (fullEquipment) {
        return {
          equipment_id: item.equipment_id,
          name: fullEquipment.name,
          daily_price: fullEquipment.daily_price,
          reference: item.reference || fullEquipment.reference || '',
          quantity: item.quantity || 1
        };
      }
      // Si on ne trouve pas l'équipement, garder les données existantes
      return {
        equipment_id: item.equipment_id,
        name: item.name || 'Équipement inconnu',
        daily_price: item.daily_price || 0,
        reference: item.reference || '',
        quantity: item.quantity || 1
      };
    });
    
    setEditFormData({
      start_date: reservation.start_date ? formatDateLocal(new Date(reservation.start_date)) : '',
      end_date: reservation.end_date ? formatDateLocal(new Date(reservation.end_date)) : '',
      event: reservation.event || '',
      equipment_items: enrichedEquipmentItems,
      notes: reservation.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateReservationFromAgenda = async () => {
    if (!editingReservation) return;
    
    try {
      setIsLoading(true);
      const days = Math.ceil((new Date(editFormData.end_date) - new Date(editFormData.start_date)) / (1000 * 60 * 60 * 24));
      const calculatedTotal = editFormData.equipment_items.reduce((total, item) => {
        return total + (item.daily_price * item.quantity * days);
      }, 0);
      
      const updateData = {
        ...editFormData,
        subtotal: calculatedTotal,
        total_amount: calculatedTotal
      };
      
      await axios.put(`${API}/reservations/${editingReservation.id}`, updateData);
      toast.success('Réservation modifiée avec succès depuis l\'agenda');
      setShowEditModal(false);
      setEditingReservation(null);
      await fetchReservations();
      
      // Rafraîchir les détails du jour si ouvert
      if (showDayDetails && selectedDate) {
        const dayReservations = reservations.filter(reservation => {
          if (!reservation.start_date || !reservation.end_date) return false;
          const startDate = new Date(reservation.start_date);
          const endDate = new Date(reservation.end_date);
          return selectedDate >= startDate && selectedDate <= endDate;
        });
        setSelectedDayReservations(dayReservations);
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification de la réservation');
    } finally {
      setIsLoading(false);
    }
  };

  const addEquipmentToReservationEdit = (equipmentId) => {
    const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
    if (!selectedEquipment) return;

    const existingItem = editFormData.equipment_items.find(item => item.equipment_id === equipmentId);
    if (existingItem) {
      setEditFormData(prev => ({
        ...prev,
        equipment_items: prev.equipment_items.map(item =>
          item.equipment_id === equipmentId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        equipment_items: [...prev.equipment_items, {
          equipment_id: equipmentId,
          name: selectedEquipment.name,
          daily_price: selectedEquipment.daily_price,
          reference: selectedEquipment.reference || '',
          quantity: 1
        }]
      }));
    }
  };

  const removeEquipmentFromReservationEdit = (equipmentId) => {
    setEditFormData(prev => ({
      ...prev,
      equipment_items: prev.equipment_items.filter(item => item.equipment_id !== equipmentId)
    }));
  };

  const handleDeleteReservationFromAgenda = async (reservation) => {
    // Demander confirmation
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer cette réservation ?\n\n` +
      `${reservation.booking_type === 'client' ? 'Client' : 'DJ'}: ${reservation.client_name || reservation.dj_name}\n` +
      `Date: ${new Date(reservation.start_date).toLocaleDateString('fr-FR')} - ${new Date(reservation.end_date).toLocaleDateString('fr-FR')}\n\n` +
      `Cette action est irréversible.`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await axios.delete(`${API}/reservations/${reservation.id}`);
      toast.success('Réservation supprimée avec succès');
      
      // Refresh reservations
      await fetchReservations();
      
      // Update the selected day reservations
      if (showDayDetails && selectedDate) {
        const dayReservations = reservations.filter(res => {
          if (!res.start_date || !res.end_date) return false;
          const startDate = new Date(res.start_date);
          const endDate = new Date(res.end_date);
          return selectedDate >= startDate && selectedDate <= endDate && res.id !== reservation.id;
        });
        setSelectedDayReservations(dayReservations);
        
        // If no more reservations for this day, close the modal
        if (dayReservations.length === 0) {
          setShowDayDetails(false);
        }
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Erreur lors de la suppression de la réservation');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEquipmentQuantityEdit = (equipmentId, newQuantity) => {
    if (newQuantity <= 0) {
      removeEquipmentFromReservationEdit(equipmentId);
      return;
    }
    
    setEditFormData(prev => ({
      ...prev,
      equipment_items: prev.equipment_items.map(item =>
        item.equipment_id === equipmentId
          ? { ...item, quantity: newQuantity }
          : item
      )
    }));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Calculer le nombre de jours à reculer pour commencer par lundi
    // getDay() renvoie: 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam
    // Pour commencer par lundi: si c'est dimanche (0) on recule de 6 jours, sinon on recule de (getDay() - 1) jours
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 42); // 6 weeks
    
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = format(currentDate, 'MMMM yyyy', { locale: fr });

  // Navigation handlers for stat cards
  const navigateToSection = (section) => {
    setCurrentView(section);
  };

  return (
    <div className="p-6">
      {/* Légende des couleurs DJ */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🎨 Légende des couleurs</h3>
        <div className="flex flex-wrap gap-3">
          {/* Clients - toujours en bleu */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-sm text-gray-600">👤 Clients</span>
          </div>
          
          {/* Clients avec livraison - en violet */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span className="text-sm text-gray-600">🚚 Livraisons</span>
          </div>
          
          {/* DJs avec leurs couleurs */}
          {djs.map((dj) => (
            <div key={dj.id} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: dj.color || '#f97316' }}></div>
              <span className="text-sm text-gray-600">🎧 {dj.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section Agenda */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Agenda</h2>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleAddReservationClick()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle réservation
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Navigation du calendrier */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                ←
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToToday}
                className="px-4"
              >
                Aujourd'hui
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateDate('next')}
              >
                →
              </Button>
            </div>
            
            {/* Sélecteurs de mois et année pour navigation rapide */}
            <div className="flex items-center gap-2">
              <select
                value={currentDate.getMonth()}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthsList.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={currentDate.getFullYear()}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vue selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {/* Vue mensuelle uniquement - boutons de vue supprimés */}
          </div>
        </div>

        {/* Vue mensuelle avec numéros de semaine */}
        <div className="bg-white rounded-lg border">
          {/* En-têtes des jours */}
          <div className="grid border-b" style={{gridTemplateColumns: '40px repeat(7, 1fr)'}}>
            <div className="p-2 text-center font-medium text-gray-500 text-xs border-r">
              #
            </div>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div key={day} className="p-3 text-center font-medium text-gray-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid" style={{gridTemplateColumns: '40px repeat(7, 1fr)'}}>
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayOfWeek = index % 7; // 0 = Lundi, 6 = Dimanche
              
              // Get reservations for this day
              const dayReservations = reservations.filter(reservation => {
                const startDate = new Date(reservation.start_date);
                const endDate = new Date(reservation.end_date);
                const currentDay = new Date(day);
                currentDay.setHours(0, 0, 0, 0);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                
                return currentDay >= startDate && currentDay <= endDate;
              });
              
              // Séparer les réservations mono-jour et multi-jours
              const getReservationDuration = (reservation) => {
                const start = new Date(reservation.start_date);
                const end = new Date(reservation.end_date);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
              };

              // Pour les réservations multi-jours, ne les afficher que le jour de début OU le premier jour de la semaine
              const isStartOfReservation = (reservation) => {
                const startDate = new Date(reservation.start_date);
                startDate.setHours(0, 0, 0, 0);
                const currentDay = new Date(day);
                currentDay.setHours(0, 0, 0, 0);
                return startDate.getTime() === currentDay.getTime();
              };

              const isFirstDayOfWeek = (reservation) => {
                return dayOfWeek === 0; // Lundi
              };

              // Calculer combien de jours restent dans cette semaine pour cette réservation
              const getDaysInWeek = (reservation) => {
                const startDate = new Date(reservation.start_date);
                const endDate = new Date(reservation.end_date);
                const currentDay = new Date(day);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                currentDay.setHours(0, 0, 0, 0);
                
                const effectiveStart = currentDay > startDate ? currentDay : startDate;
                const daysUntilEndOfWeek = 6 - dayOfWeek; // jours restants jusqu'à dimanche
                const endOfWeek = new Date(currentDay);
                endOfWeek.setDate(endOfWeek.getDate() + daysUntilEndOfWeek);
                
                const effectiveEnd = endDate < endOfWeek ? endDate : endOfWeek;
                return Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
              };

              // Filtrer les réservations à afficher
              const reservationsToShow = dayReservations.filter(reservation => {
                const duration = getReservationDuration(reservation);
                if (duration === 1) return true; // Toujours afficher les mono-jour
                
                // Pour multi-jours: afficher seulement au début OU au début de chaque semaine
                return isStartOfReservation(reservation) || (isFirstDayOfWeek(reservation) && !isStartOfReservation(reservation));
              });
              
              const clientReservations = reservationsToShow.filter(r => r.booking_type === 'client');
              const djReservations = reservationsToShow.filter(r => r.booking_type === 'dj');
              
              // Ajouter le numéro de semaine au début de chaque ligne (tous les 7 jours)
              const elements = [];
              
              if (index % 7 === 0) {
                // Calculer le numéro de semaine ISO
                const getWeekNumber = (date) => {
                  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                  const dayNum = d.getUTCDay() || 7;
                  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                };
                
                const weekNumber = getWeekNumber(day);
                
                elements.push(
                  <div 
                    key={`week-${index}`}
                    className="flex items-center justify-center border-r border-b bg-gray-50 text-gray-500 text-[11px] font-medium py-2 px-1"
                  >
                    {weekNumber}
                  </div>
                );
              }
              
              elements.push(
                <div 
                  key={index}
                  className={`min-h-[100px] p-2 border-r border-b last:border-r-0 relative ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className={`text-sm cursor-pointer hover:bg-blue-100 rounded ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'px-1 py-0.5'}`}
                      onClick={() => handleDateClick(day)}
                      title="Cliquez pour voir les détails"
                    >
                      {day.getDate()}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-6 h-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      onClick={() => handleAddReservationClick(day)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Display reservations with client/DJ names */}
                  <div className="mt-2 space-y-1">
                    {clientReservations.map((reservation) => {
                      const display = getReservationDisplay(reservation);
                      const duration = getReservationDuration(reservation);
                      const daysInWeek = getDaysInWeek(reservation);
                      const isMultiDay = duration > 1;
                      const isStart = isStartOfReservation(reservation);
                      const isContinuation = isMultiDay && !isStart;
                      
                      // Calculer la largeur pour les événements multi-jours
                      const widthPercent = isMultiDay ? `calc(${daysInWeek * 100}% + ${(daysInWeek - 1) * 8}px)` : '100%';
                      
                      return (
                        <div 
                          key={reservation.id}
                          className={`text-white text-xs px-2 py-1 cursor-pointer hover:opacity-90 truncate ${
                            isMultiDay 
                              ? `absolute z-10 ${isStart ? 'rounded-l' : 'rounded-l-none'} rounded-r`
                              : 'rounded relative'
                          }`}
                          style={{ 
                            backgroundColor: display.color,
                            width: isMultiDay ? widthPercent : '100%',
                            left: isMultiDay ? '8px' : 'auto',
                            right: isMultiDay ? 'auto' : 'auto',
                            marginTop: isMultiDay ? '0' : '0',
                            position: isMultiDay ? 'relative' : 'relative'
                          }}
                          onClick={() => handleDayClick(day, dayReservations)}
                          title={`Client: ${getClientDisplayNameFromReservation(reservation)}${isMultiDay ? ` (${duration} jours)` : ''}`}
                        >
                          {isContinuation ? '→ ' : ''}{display.text}{isMultiDay && isStart ? ` (${duration}j)` : ''}
                        </div>
                      );
                    })}
                    {djReservations.map((reservation) => {
                      const display = getReservationDisplay(reservation);
                      const duration = getReservationDuration(reservation);
                      const daysInWeek = getDaysInWeek(reservation);
                      const isMultiDay = duration > 1;
                      const isStart = isStartOfReservation(reservation);
                      const isContinuation = isMultiDay && !isStart;
                      
                      const widthPercent = isMultiDay ? `calc(${daysInWeek * 100}% + ${(daysInWeek - 1) * 8}px)` : '100%';
                      
                      return (
                        <div 
                          key={reservation.id}
                          className={`text-white text-xs px-2 py-1 cursor-pointer hover:opacity-90 truncate ${
                            isMultiDay 
                              ? `z-10 ${isStart ? 'rounded-l' : 'rounded-l-none'} rounded-r`
                              : 'rounded'
                          }`}
                          style={{ 
                            backgroundColor: display.color,
                            width: isMultiDay ? widthPercent : '100%',
                            position: 'relative'
                          }}
                          onClick={() => handleDayClick(day, dayReservations)}
                          title={`DJ: ${reservation.dj_name || 'Nom non défini'} - ${display.text}${isMultiDay ? ` (${duration} jours)` : ''}`}
                        >
                          {isContinuation ? '→ ' : ''}{display.text}{isMultiDay && isStart ? ` (${duration}j)` : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
              
              return elements;
            })}
          </div>
          </div>

      </div>

      {/* Modal Nouvelle Réservation - Version complète de l'original */}
      {showAddReservation && (
        <Dialog open={showAddReservation} onOpenChange={setShowAddReservation}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Nouvelle réservation
              </DialogTitle>
              <DialogDescription>
                Créer une réservation directement depuis l'agenda
                {selectedDate && ` pour le ${selectedDate.toLocaleDateString('fr-FR')}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              {/* Booking Type Selection */}
              <div>
                <Label className="font-semibold mb-2 block">Type de réservation *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="booking_type"
                      value="dj"
                      checked={addReservationForm.booking_type === 'dj'}
                      onChange={(e) => setAddReservationForm({
                        ...addReservationForm, 
                        booking_type: e.target.value,
                        client_id: '',
                        dj_id: ''
                      })}
                      className="mr-2"
                    />
                    DJ
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="booking_type"
                      value="client"
                      checked={addReservationForm.booking_type === 'client'}
                      onChange={(e) => setAddReservationForm({
                        ...addReservationForm, 
                        booking_type: e.target.value,
                        client_id: '',
                        dj_id: ''
                      })}
                      className="mr-2"
                    />
                    Client
                  </label>
                </div>
              </div>

              {/* Client/DJ Selection */}
              {addReservationForm.booking_type === 'client' ? (
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <select
                    value={addReservationForm.client_id}
                    onChange={(e) => setAddReservationForm({...addReservationForm, client_id: e.target.value})}
                    required
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name || client.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="dj">DJ *</Label>
                  <select
                    value={addReservationForm.dj_id}
                    onChange={(e) => setAddReservationForm({...addReservationForm, dj_id: e.target.value})}
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
                    value={addReservationForm.start_date}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      // Auto-remplir la date de fin avec la même date de début
                      setAddReservationForm({
                        ...addReservationForm, 
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
                    value={addReservationForm.end_date}
                    min={addReservationForm.start_date || undefined}
                    onChange={(e) => setAddReservationForm({...addReservationForm, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Event field - Only for DJ bookings */}
              {addReservationForm.booking_type === 'dj' && (
                <div>
                  <Label htmlFor="event">Évènement (optionnel)</Label>
                  <Input
                    id="event"
                    type="text"
                    value={addReservationForm.event}
                    onChange={(e) => setAddReservationForm({...addReservationForm, event: e.target.value})}
                    placeholder="Ex: Mariage, Anniversaire, Soirée d'entreprise..."
                    maxLength={100}
                  />
                </div>
              )}

              {/* Equipment Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Matériel *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEquipmentToReservation}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                {selectedEquipmentForReservation.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center mb-2 p-2 border rounded">
                    <div className="flex-1 relative">
                      <div className="flex gap-1">
                        <Input
                          type="text"
                          placeholder="🔍 Rechercher un équipement (nom, référence...)"
                          value={item.equipment_id ? getEquipmentNameById(item.equipment_id) : (equipmentSearchNew[index] || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEquipmentSearchNew({ ...equipmentSearchNew, [index]: value });
                            setShowSuggestionsNew({ ...showSuggestionsNew, [index]: value.length >= 2 });
                            if (!value) {
                              updateEquipmentInReservation(index, 'equipment_id', '');
                            }
                          }}
                          onFocus={() => {
                            if (equipmentSearchNew[index]?.length >= 2) {
                              setShowSuggestionsNew({ ...showSuggestionsNew, [index]: true });
                            }
                          }}
                          className="text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSuggestionsNew({ ...showSuggestionsNew, [index]: !showSuggestionsNew[index] })}
                          className="px-2"
                          title="Voir tous les équipements"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Suggestions dropdown */}
                      {showSuggestionsNew[index] && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {(equipmentSearchNew[index]?.length >= 2 
                            ? getFilteredEquipmentForAgenda(equipmentSearchNew[index]) 
                            : equipment.filter(eq => eq.available_quantity > 0)
                          ).length > 0 ? (
                            (equipmentSearchNew[index]?.length >= 2 
                              ? getFilteredEquipmentForAgenda(equipmentSearchNew[index]) 
                              : equipment.filter(eq => eq.available_quantity > 0)
                            ).map((eq) => (
                              <div
                                key={eq.id}
                                onClick={() => selectEquipmentFromSearchNew(index, eq.id)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{eq.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {eq.category} • {eq.reference} • {eq.daily_price}€/jour
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600 ml-2">
                                    {eq.available_quantity >= 999999 ? '∞' : eq.available_quantity} dispo
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
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateEquipmentInReservation(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-center text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeEquipmentFromReservation(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {selectedEquipmentForReservation.length === 0 && (
                  <div className="text-center text-gray-500 py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    Aucun matériel sélectionné. Cliquez sur "Ajouter" pour commencer.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <textarea
                  id="notes"
                  value={addReservationForm.notes}
                  onChange={(e) => setAddReservationForm({...addReservationForm, notes: e.target.value})}
                  placeholder="Notes supplémentaires..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddReservation(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateReservation} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? 'Création...' : 'Créer la réservation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Détails du Jour */}
      {showDayDetails && (
        <Dialog open={showDayDetails} onOpenChange={setShowDayDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon2 className="w-5 h-5 text-blue-600" />
                Réservations du {selectedDate?.toLocaleDateString('fr-FR')}
              </DialogTitle>
              <DialogDescription>
                Aperçu des locations pour cette date
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedDayReservations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune réservation pour cette date</p>
              ) : (
                selectedDayReservations
                  .sort((a, b) => {
                    // DJ first, then Client
                    if (a.booking_type === 'dj' && b.booking_type === 'client') return -1;
                    if (a.booking_type === 'client' && b.booking_type === 'dj') return 1;
                    return 0;
                  })
                  .map((reservation) => (
                  <div 
                    key={reservation.id} 
                    className={`p-4 rounded-lg border-l-4 ${
                      reservation.booking_type === 'client' 
                        ? 'border-l-green-500 bg-green-50' 
                        : 'border-l-orange-500 bg-orange-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={reservation.booking_type === 'client' ? 'default' : 'secondary'}
                            className={reservation.booking_type === 'client' ? 'bg-green-500' : 'bg-orange-500'}
                          >
                            {reservation.booking_type === 'client' ? 'CLIENT' : 'DJ'}
                          </Badge>
                          <span className="font-medium">
                            {getClientDisplayNameFromReservation(reservation)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {getStatusBadge(reservation.status)}
                          {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
                            <select
                              onChange={(e) => {
                                if (e.target.value && e.target.value !== reservation.status) {
                                  changeReservationStatus(reservation.id, e.target.value);
                                  e.target.value = ''; // Reset select
                                }
                              }}
                              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                              defaultValue=""
                            >
                              <option value="">Changer statut</option>
                              {reservation.status !== 'pending' && <option value="pending">En attente</option>}
                              {reservation.status !== 'accepted' && <option value="accepted">Acceptée</option>}
                              {reservation.status !== 'equipment_withdrawn' && <option value="equipment_withdrawn">Matériel retiré</option>}
                              {reservation.status !== 'equipment_returned' && <option value="equipment_returned">Matériel rendu</option>}
                              {reservation.status !== 'completed' && <option value="completed">Terminé</option>}
                            </select>
                          )}
                          
                          {/* Bouton Modifier */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditReservationFromAgenda(reservation)}
                            className="border-blue-500 hover:bg-blue-50 text-blue-600"
                            title="Modifier cette réservation"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Bouton Supprimer */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReservationFromAgenda(reservation)}
                            className="border-red-500 hover:bg-red-50 text-red-600"
                            title="Supprimer cette réservation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Période :</strong> Du {new Date(reservation.start_date).toLocaleDateString('fr-FR')} au {new Date(reservation.end_date).toLocaleDateString('fr-FR')}</p>
                          {reservation.event && (
                            <p><strong>Évènement :</strong> {reservation.event}</p>
                          )}
                          {reservation.notes && (
                            <p><strong>Notes :</strong> {reservation.notes}</p>
                          )}
                        </div>
                        
                        {/* Equipment list */}
                        {(() => {
                          console.log('[DEBUG] Reservation equipment_items:', reservation.equipment_items);
                          return reservation.equipment_items && reservation.equipment_items.length > 0;
                        })() && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Matériel loué :</p>
                            <div className="space-y-2">
                              {reservation.equipment_items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs bg-blue-50">
                                        x{item.quantity}
                                      </Badge>
                                      <span className="text-sm font-medium">{item.equipment_name}</span>
                                    </div>
                                    {/* Hide pricing for DJ bookings */}
                                    {reservation.booking_type !== 'dj' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {item.daily_price || 0}€/jour × {item.total_days || 1} jour{(item.total_days || 1) > 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                  {/* Hide subtotal for DJ bookings */}
                                  {reservation.booking_type !== 'dj' && (
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {((item.subtotal && item.subtotal > 0) ? item.subtotal : ((item.daily_price || 0) * (item.quantity || 1) * (item.total_days || 1))).toFixed(2)}€
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {/* Hide total amount for DJ bookings */}
                            {reservation.booking_type !== 'dj' && (
                              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Total de la location :</span>
                                <span className="text-base font-bold text-gray-900">
                                  {reservation.total_amount ? reservation.total_amount.toFixed(2) : '0.00'}€
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDayDetails(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de modification de réservation depuis l'agenda */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Modifier la réservation (depuis l'agenda)
              </h3>
              <p className="text-gray-600 text-sm">
                Client: <strong>{editingReservation.client_name || editingReservation.dj_name}</strong>
              </p>
            </div>

            <div className="space-y-6">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData(prev => ({...prev, start_date: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData(prev => ({...prev, end_date: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Événement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Évènement
                </label>
                <input
                  type="text"
                  value={editFormData.event}
                  onChange={(e) => setEditFormData(prev => ({...prev, event: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type d'événement (mariage, anniversaire, etc.)"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({...prev, notes: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Notes additionnelles..."
                />
              </div>

              {/* Équipements */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Équipements de la réservation</h4>
                
                {editFormData.equipment_items.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {editFormData.equipment_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({item.daily_price}€/jour)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateEquipmentQuantityEdit(item.equipment_id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateEquipmentQuantityEdit(item.equipment_id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEquipmentFromReservationEdit(item.equipment_id)}
                            className="ml-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic mb-4">Aucun équipement sélectionné</p>
                )}

                {/* Ajouter nouvel équipement */}
                <div className="relative">
                  <h5 className="text-md font-medium text-gray-800 mb-2">Ajouter du matériel</h5>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher un équipement (nom, référence...)"
                    value={equipmentSearchEdit}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEquipmentSearchEdit(value);
                      setShowSuggestionsEdit(value.length >= 2);
                    }}
                    onFocus={() => {
                      if (equipmentSearchEdit.length >= 2) {
                        setShowSuggestionsEdit(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Suggestions dropdown */}
                  {showSuggestionsEdit && equipmentSearchEdit.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredEquipmentForAgenda(equipmentSearchEdit).length > 0 ? (
                        getFilteredEquipmentForAgenda(equipmentSearchEdit).map((eq) => (
                          <div
                            key={eq.id}
                            onClick={() => selectEquipmentFromSearchEdit(eq.id)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{eq.name}</div>
                                <div className="text-xs text-gray-500">
                                  {eq.category} • {eq.reference} • {eq.daily_price}€/jour
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 ml-2">
                                {(eq.available_quantity || 0) >= 999999 ? '∞' : (eq.available_quantity || 0)} dispo
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          Aucun équipement trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Calcul du total */}
                {editFormData.equipment_items.length > 0 && editFormData.start_date && editFormData.end_date && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-800">
                      Total estimé: {editFormData.equipment_items.reduce((total, item) => {
                        const days = Math.max(1, Math.ceil((new Date(editFormData.end_date) - new Date(editFormData.start_date)) / (1000 * 60 * 60 * 24)));
                        return total + (item.daily_price * item.quantity * days);
                      }, 0)}€
                    </div>
                    <div className="text-sm text-green-600">
                      Durée: {editFormData.start_date && editFormData.end_date ? Math.max(1, Math.ceil((new Date(editFormData.end_date) - new Date(editFormData.start_date)) / (1000 * 60 * 60 * 24))) : 0} jour(s)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                onClick={handleUpdateReservationFromAgenda}
                disabled={isLoading || !editFormData.start_date || !editFormData.end_date}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReservation(null);
                }}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Matériel View Component avec bouton "Description IA"

export default AgendaView;
