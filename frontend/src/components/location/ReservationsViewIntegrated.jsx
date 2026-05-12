// ReservationsViewIntegrated - Module Location
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fr } from 'date-fns/locale';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Package, FileText, Plus, Edit, Trash2, Check, RefreshCw, CheckCircle, Clock, Archive, Headphones, Building2, User, Truck, AlertTriangle, FolderOpen, Download, X, Camera, Eye } from 'lucide-react';
import DossierModal from './DossierModal';
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
import { toast } from 'sonner';
import { API, BACKEND_URL, formatDateLocal, axios } from './helpers';
import { generateWithdrawalPDF, getDefaultCGV } from './withdrawalPdf';
import { WithdrawalSlipModal, WithdrawalSignatureModal, WithdrawalViewModal } from './WithdrawalModals';
import { EditReservationModal } from './EditReservationModal';

function ReservationsViewIntegrated({ setCurrentView, onOpenAddReservation = () => {} }) {
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]); // Ajout pour récupérer les infos entreprises
  const [isLoading, setIsLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [maintenanceReports, setMaintenanceReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // State pour la recherche
  const [showDJs, setShowDJs] = useState(false); // State pour afficher les DJ (masqués par défaut)
  const [categories, setCategories] = useState([]);
  
  // États pour la pop-up du bon de retrait
  const [showWithdrawalSlipModal, setShowWithdrawalSlipModal] = useState(false);
  const [currentReservationForSlip, setCurrentReservationForSlip] = useState(null);
  const [validatedEquipment, setValidatedEquipment] = useState([]); // IDs des équipements validés

  // États pour la modal de consultation du bon de retrait
  const [showWithdrawalViewModal, setShowWithdrawalViewModal] = useState(false);
  const [viewingWithdrawal, setViewingWithdrawal] = useState(null);

  // États pour la signature numérique du bon de retrait
  const [showWithdrawalSignaturePad, setShowWithdrawalSignaturePad] = useState(false);
  const [withdrawalSignature, setWithdrawalSignature] = useState(null);
  const [withdrawalSignaturePadRef, setWithdrawalSignaturePadRef] = useState(null);

  // États pour le dossier
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierReservationId, setDossierReservationId] = useState(null);

  // États pour la modification de réservation
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [editFormData, setEditFormData] = useState({
    start_date: '',
    end_date: '',
    equipment_items: [],
    notes: ''
  });

  useEffect(() => {
    fetchReservations();
    fetchClients();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/location/categories`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
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

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/reservations?archived=false`);
      setReservations(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setIsLoading(false);
    }
  };

  // Change reservation status with rules
  const changeReservationStatus = async (reservationId, newStatus) => {
    const statusLabels = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'equipment_withdrawn': 'Matériel retiré',
      'delivered': 'Livré',
      'equipment_returned': 'Matériel rendu',
      'returned': 'Retourné',
      'dispute': 'Litige',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    
    // Vérifier si le nouveau statut est "matériel retiré"
    if (newStatus === 'equipment_withdrawn') {
      // Trouver la réservation pour la pop-up
      const reservation = reservations.find(r => r.id === reservationId);
      setCurrentReservationForSlip(reservation);
      setShowWithdrawalSlipModal(true);
      return; // Ne pas changer le statut tout de suite, attendre la décision de l'utilisateur
    }
    
    if (window.confirm(`Changer le statut vers "${statusLabels[newStatus]}" ?`)) {
      try {
        setIsLoading(true);
        await axios.put(`${API}/reservations/${reservationId}/change-status`, { status: newStatus });
        toast.success(`Statut changé vers "${statusLabels[newStatus]}"`);
        await fetchReservations();
      } catch (error) {
        console.error('Error changing status:', error);
        if (error.response?.status === 400) {
          toast.error('Transition de statut invalide : ' + error.response.data.detail);
        } else {
          toast.error('Erreur lors du changement de statut');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-500"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Acceptée</Badge>;
      case 'equipment_withdrawn':
        return <Badge className="bg-blue-600"><Package className="w-3 h-3 mr-1" />Matériel retiré</Badge>;
      case 'delivered':
        return <Badge className="bg-indigo-600"><Truck className="w-3 h-3 mr-1" />Livré</Badge>;
      case 'equipment_returned':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Matériel retourné</Badge>;
      case 'returned':
        return <Badge className="bg-green-700"><CheckCircle className="w-3 h-3 mr-1" />Retourné</Badge>;
      case 'dispute':
        return <Badge className="bg-amber-500"><AlertTriangle className="w-3 h-3 mr-1" />Litige</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600"><Archive className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${API}/reservations/${id}`);
        toast.success('Réservation supprimée avec succès');
        await fetchReservations();
      } catch (error) {
        console.error('Error deleting reservation:', error);
        toast.error('Erreur lors de la suppression');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Charger les équipements pour la modification
  const fetchEquipment = async () => {
    try {
      const response = await axios.get(`${API}/equipment`);
      setEquipment(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des équipements:', error);
    }
  };

  // Ouvrir le modal de modification
  const handleEditReservation = async (reservation) => {
    setEditingReservation(reservation);
    
    // Charger d'abord les équipements
    try {
      const response = await axios.get(`${API}/equipment`);
      const allEquipment = response.data || [];
      setEquipment(allEquipment);
      
      // Enrichir les equipment_items avec les informations complètes
      const enrichedEquipmentItems = (reservation.equipment_items || []).map(item => {
        // Chercher l'équipement complet dans la liste
        const fullEquipment = allEquipment.find(eq => eq.id === item.equipment_id);
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
      
    } catch (error) {
      console.error('Erreur lors du chargement des équipements:', error);
      // En cas d'erreur, utiliser les données telles quelles
      setEditFormData({
        start_date: reservation.start_date ? formatDateLocal(new Date(reservation.start_date)) : '',
        end_date: reservation.end_date ? formatDateLocal(new Date(reservation.end_date)) : '',
        event: reservation.event || '',
        equipment_items: reservation.equipment_items || [],
        notes: reservation.notes || ''
      });
    }
    
    setShowEditModal(true);
  };

  // Sauvegarder les modifications de réservation
  const handleUpdateReservation = async () => {
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
      toast.success('Réservation modifiée avec succès');
      setShowEditModal(false);
      setEditingReservation(null);
      await fetchReservations();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification de la réservation');
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter un équipement à la réservation
  const addEquipmentToReservation = (equipmentId) => {
    const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
    if (!selectedEquipment) return;

    const existingItem = editFormData.equipment_items.find(item => item.equipment_id === equipmentId);
    if (existingItem) {
      // Augmenter la quantité si l'équipement est déjà dans la liste
      setEditFormData(prev => ({
        ...prev,
        equipment_items: prev.equipment_items.map(item =>
          item.equipment_id === equipmentId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      // Ajouter nouvel équipement
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

  // Supprimer un équipement de la réservation
  const removeEquipmentFromReservation = (equipmentId) => {
    setEditFormData(prev => ({
      ...prev,
      equipment_items: prev.equipment_items.filter(item => item.equipment_id !== equipmentId)
    }));
  };

  // Changer la quantité d'un équipement
  const updateEquipmentQuantity = (equipmentId, newQuantity) => {
    if (newQuantity <= 0) {
      removeEquipmentFromReservation(equipmentId);
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

  // Removed duplicate confirmWithdrawalStatus function

  // Confirmer l'acceptation d'une réservation et générer les documents
  const confirmAcceptedReservation = async () => {
    if (!currentAcceptedReservation) return;

    try {
      setIsLoading(true);
      
      // Changer le statut vers "acceptée"
      await axios.put(`${API}/reservations/${currentAcceptedReservation.id}/change-status`, { status: 'accepted' });
      toast.success('Statut changé vers "Acceptée"');
      
      // Fermer la modal
      setShowAcceptedReservationModal(false);
      setCurrentAcceptedReservation(null);
      
      // Rafraîchir les réservations
      await fetchReservations();
    } catch (error) {
      console.error('Error changing status to accepted:', error);
      if (error.response?.status === 400) {
        toast.error('Transition de statut invalide : ' + error.response.data.detail);
      } else {
        toast.error('Erreur lors du changement de statut');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Générer et télécharger les documents de réservation acceptée
  const generateAcceptedReservationDocuments = () => {
    if (!currentAcceptedReservation) return;

    try {
      // Préparer les données pour le PDF
      const reservationData = {
        id: currentAcceptedReservation.id,
        clientName: currentAcceptedReservation.client?.name || 'N/A',
        clientEmail: currentAcceptedReservation.client?.email || 'N/A', 
        clientPhone: currentAcceptedReservation.client?.phone || 'N/A',
        eventDate: currentAcceptedReservation.start_date,
        endDate: currentAcceptedReservation.end_date,
        items: currentAcceptedReservation.items?.map(item => ({
          name: item.equipment?.name || 'N/A',
          quantity: item.quantity || 1,
          price: item.equipment?.daily_price || 0
        })) || [],
        days: calculateDaysBetween(currentAcceptedReservation.start_date, currentAcceptedReservation.end_date)
      };

      // Générer le PDF complet (devis + bon de réservation + CGV)
      const doc = generateCompleteReservationDocuments(reservationData);
      
      // Télécharger le PDF
      doc.save(`Reservation_Complete_${currentAcceptedReservation.id}.pdf`);
      
      toast.success('Documents générés et téléchargés avec succès !');
      
      // Après génération, confirmer l'acceptation
      confirmAcceptedReservation();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // Calculer le nombre de jours entre deux dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  // Générer et télécharger le bon de retrait
  const generateWithdrawalSlipDocument = () => {
    if (!currentReservationForSlip) return;

    try {
      // Calculer le montant du matériel pour UN JOUR (pour le dépôt de garantie)
      let equipmentDayTotal = 0;
      
      const reservationData = {
        id: currentReservationForSlip.id,
        clientName: currentReservationForSlip.client?.name || 'N/A',
        clientEmail: currentReservationForSlip.client?.email || 'N/A',
        clientPhone: currentReservationForSlip.client?.phone || 'N/A',
        endDate: currentReservationForSlip.end_date,
        items: currentReservationForSlip.items?.map(item => {
          const dailyPrice = item.equipment?.daily_price || 0;
          equipmentDayTotal += (item.quantity || 1) * dailyPrice;
          return {
            name: item.equipment?.name || 'N/A',
            quantity: item.quantity || 1,
            price: dailyPrice,
            serialNumber: item.equipment?.reference || 'N/A'
          };
        }) || []
      };

      // Calculer le dépôt de garantie selon le barème
      const guaranteeAmount = calculateGuaranteeDeposit(equipmentDayTotal);

      // Générer le PDF du bon de retrait
      const doc = generateWithdrawalSlip(reservationData);
      
      // Télécharger le PDF
      doc.save(`Bon_Retrait_${currentReservationForSlip.id}.pdf`);
      
      toast.success(`Bon de retrait généré ! Dépôt de garantie: ${guaranteeAmount}€`);
      
      // Après génération du document, confirmer le changement de statut
      confirmWithdrawalStatus();
    } catch (error) {
      console.error('Error generating withdrawal slip:', error);
      toast.error('Erreur lors de la génération du bon de retrait');
    }
  };

  // Confirmer le changement de statut vers "matériel retiré"
  const confirmWithdrawalStatus = async () => {
    if (!currentReservationForSlip) return;

    try {
      setIsLoading(true);
      
      // Récupérer les données du formulaire
      const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
      const depositAmount = parseFloat(document.getElementById('deposit-amount')?.value || 0);
      const paymentMethod = document.getElementById('payment-method')?.value || 'especes';
      const isTrustedClient = document.getElementById('trusted-client')?.checked || false;
      
      // Validation
      if (!withdrawalPerson.trim()) {
        toast.error('Veuillez entrer le nom de la personne qui retire le matériel');
        setIsLoading(false);
        return;
      }
      
      // Préparer les données de retrait
      const withdrawalData = {
        status: 'equipment_withdrawn',
        withdrawal_person: withdrawalPerson,
        deposit_amount: depositAmount,
        deposit_payment_method: paymentMethod,
        is_trusted_client: isTrustedClient
      };
      
      // Changer le statut vers "equipment_withdrawn" avec les données de retrait
      await axios.put(`${API}/reservations/${currentReservationForSlip.id}/change-status`, withdrawalData);
      toast.success('Statut changé vers "Matériel retiré"');
      
      // Fermer la modal
      setShowWithdrawalSlipModal(false);
      setCurrentReservationForSlip(null);
      setValidatedEquipment([]); // Reset équipements validés
      
      // Rafraîchir les réservations
      await fetchReservations();
    } catch (error) {
      console.error('Error changing status to equipment_withdrawn:', error);
      if (error.response?.status === 400) {
        toast.error('Transition de statut invalide : ' + error.response.data.detail);
      } else {
        toast.error('Erreur lors du changement de statut');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Réservations</h2>
        <div className="flex gap-2">
          <Button onClick={() => onOpenAddReservation && onOpenAddReservation()} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Réservation
          </Button>
          <Button onClick={fetchReservations} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          {/* Barre de recherche et filtre */}
          <div className="mb-4 flex items-center gap-4">
            <Input
              placeholder="🔍 Rechercher par client, DJ ou événement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="show-djs"
                checked={showDJs}
                onCheckedChange={setShowDJs}
              />
              <Label htmlFor="show-djs" className="cursor-pointer whitespace-nowrap">
                Afficher les DJ
              </Label>
            </div>
          </div>
          <CardTitle>Liste des réservations actives</CardTitle>
          <CardDescription>
            {isLoading ? 'Chargement...' : (
              reservations.length === 0 ? 'Aucune réservation active' : `${reservations.length} réservation(s) active(s)`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des réservations...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 md:px-4">Client/DJ</TableHead>
                  <TableHead className="hidden lg:table-cell px-2 md:px-4">Type</TableHead>
                  <TableHead className="px-2 md:px-4">Période</TableHead>
                  <TableHead className="hidden xl:table-cell px-2 md:px-4">Équipements</TableHead>
                  <TableHead className="px-2 md:px-4">Montant</TableHead>
                  <TableHead className="px-2 md:px-4">Statut</TableHead>
                  <TableHead className="px-2 md:px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Aucune réservation active. Les réservations sont créées depuis les devis.
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations
                    .filter((reservation) => {
                      // Filtrer par type (afficher DJ uniquement si activé, masqués par défaut)
                      if (!showDJs && reservation.booking_type === 'dj') return false;
                      
                      // Filtrer par recherche (client, DJ, événement)
                      if (!searchQuery.trim()) return true; // Si pas de recherche, afficher tout
                      
                      const query = searchQuery.toLowerCase();
                      const clientName = (reservation.client_name || '').toLowerCase();
                      const djName = (reservation.dj_name || '').toLowerCase();
                      const event = (reservation.event || '').toLowerCase();
                      
                      return clientName.includes(query) || 
                             djName.includes(query) || 
                             event.includes(query);
                    })
                    .map((reservation) => {
                    // Helper pour obtenir le nom d'affichage (entreprise ou contact)
                    const getClientDisplayName = () => {
                      if (reservation.booking_type === 'dj') {
                        return reservation.dj_name || 'DJ';
                      }
                      
                      // Pour les clients, chercher les infos complètes
                      const client = clients.find(c => c.id === reservation.client_id);
                      if (client && client.company_name) {
                        return client.company_name;
                      }
                      
                      return reservation.client_name || 'Client';
                    };
                    
                    const clientName = getClientDisplayName();
                    const startDate = reservation.start_date ? new Date(reservation.start_date).toLocaleDateString('fr-FR') : 'N/A';
                    const endDate = reservation.end_date ? new Date(reservation.end_date).toLocaleDateString('fr-FR') : 'N/A';
                    const itemCount = reservation.equipment_items ? reservation.equipment_items.length : 0;
                    
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-semibold px-2 md:px-4 text-sm">
                          <div className="flex items-center gap-1 md:gap-2">
                            {(() => {
                              if (reservation.booking_type === 'dj') {
                                return <Headphones className="w-4 h-4 text-purple-600 flex-shrink-0" />;
                              }
                              
                              // Pour clients, déterminer si c'est une entreprise
                              const client = clients.find(c => c.id === reservation.client_id);
                              const isCompany = client && client.company_name;
                              
                              return isCompany 
                                ? <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                : <User className="w-4 h-4 text-blue-600 flex-shrink-0" />;
                            })()}
                            <span className="truncate">{clientName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell px-2 md:px-4">
                          <Badge variant={reservation.booking_type === 'dj' ? 'secondary' : 'default'}>
                            {reservation.booking_type === 'dj' ? 'DJ' : 'Client'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 md:px-4 text-xs md:text-sm">
                          <div className="whitespace-nowrap">{startDate}</div>
                          <div className="whitespace-nowrap">→ {endDate}</div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell px-2 md:px-4">
                          <Badge variant="outline">{itemCount} équipement(s)</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600 px-2 md:px-4 text-sm md:text-base whitespace-nowrap">
                          {reservation.total_amount ? reservation.total_amount.toFixed(2) : '0.00'}€
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          {getStatusBadge(reservation.status)}
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex gap-1 md:gap-2 items-center flex-wrap">
                            {/* Edit button */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditReservation(reservation)}
                              disabled={isLoading}
                              className="border-blue-500 hover:bg-blue-50 p-1 md:p-2"
                              title="Modifier cette réservation"
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                            </Button>
                            
                            {/* Bouton Voir bon de retrait (seulement si matériel retiré) */}
                            {reservation.status === 'equipment_withdrawn' && (
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setViewingWithdrawal(reservation);
                                  setShowWithdrawalViewModal(true);
                                }}
                                disabled={isLoading}
                                className="border-green-500 hover:bg-green-50 p-1 md:p-2"
                                title="Voir bon de retrait"
                              >
                                <FileText className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                              </Button>
                            )}
                            
                            {/* Bouton Dossier */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDossierReservationId(reservation.id);
                                setShowDossierModal(true);
                              }}
                              disabled={isLoading}
                              className="border-amber-500 hover:bg-amber-50 p-1 md:p-2"
                              title="Voir le dossier"
                              data-testid={`dossier-btn-${reservation.id}`}
                            >
                              <FolderOpen className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                            </Button>
                            
                            <Button 
                              type="button"
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDelete(reservation.id)}
                              disabled={isLoading}
                              title="Supprimer"
                              className="p-1 md:p-2"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals de retrait (slip, signature, consultation) */}
      <WithdrawalSlipModal
        showWithdrawalSlipModal={showWithdrawalSlipModal}
        setShowWithdrawalSlipModal={setShowWithdrawalSlipModal}
        currentReservationForSlip={currentReservationForSlip}
        setCurrentReservationForSlip={setCurrentReservationForSlip}
        validatedEquipment={validatedEquipment}
        setValidatedEquipment={setValidatedEquipment}
        clients={clients}
        isLoading={isLoading}
        generateWithdrawalSlipDocument={generateWithdrawalSlipDocument}
        confirmWithdrawalStatus={confirmWithdrawalStatus}
        onOpenSignaturePad={() => setShowWithdrawalSignaturePad(true)}
      />

      <WithdrawalSignatureModal
        showWithdrawalSignaturePad={showWithdrawalSignaturePad}
        setShowWithdrawalSignaturePad={setShowWithdrawalSignaturePad}
        withdrawalSignaturePadRef={withdrawalSignaturePadRef}
        setWithdrawalSignaturePadRef={setWithdrawalSignaturePadRef}
        setWithdrawalSignature={setWithdrawalSignature}
        currentReservationForSlip={currentReservationForSlip}
        setShowWithdrawalSlipModal={setShowWithdrawalSlipModal}
        setCurrentReservationForSlip={setCurrentReservationForSlip}
        setValidatedEquipment={setValidatedEquipment}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        fetchReservations={fetchReservations}
      />

      <WithdrawalViewModal
        showWithdrawalViewModal={showWithdrawalViewModal}
        setShowWithdrawalViewModal={setShowWithdrawalViewModal}
        viewingWithdrawal={viewingWithdrawal}
        setViewingWithdrawal={setViewingWithdrawal}
        clients={clients}
      />

      {/* Modal Dossier */}
      <DossierModal
        open={showDossierModal}
        onClose={() => { setShowDossierModal(false); setDossierReservationId(null); }}
        reservationId={dossierReservationId}
      />

      {/* Modal de modification de réservation */}
      <EditReservationModal
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingReservation={editingReservation}
        setEditingReservation={setEditingReservation}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        equipment={equipment}
        categories={categories}
        isLoading={isLoading}
        handleUpdateReservation={handleUpdateReservation}
        updateEquipmentQuantity={updateEquipmentQuantity}
        removeEquipmentFromReservation={removeEquipmentFromReservation}
        addEquipmentToReservation={addEquipmentToReservation}
      />
    </div>
  );
}

// Livraisons View Component - Affichage des livraisons à effectuer

export default ReservationsViewIntegrated;
