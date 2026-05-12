import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Edit, Trash2, Printer, Archive, CheckCircle, Clock, Package, User, Headphones } from 'lucide-react';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api/location`;

// Reservation Management Component - Complete Implementation
function ReservationsView() {
  const [reservations, setReservations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [maintenanceReports, setMaintenanceReports] = useState([]);

  useEffect(() => {
    fetchReservations();
    fetchEquipment();
    fetchClients();
  }, []);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/reservations`);
      setReservations(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setIsLoading(false);
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

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`);
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-500"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'equipment_withdrawn':
        return <Badge className="bg-blue-600"><Package className="w-3 h-3 mr-1" />Matériel retiré</Badge>;
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

  // Change reservation status with rules
  const changeReservationStatus = async (reservationId, newStatus) => {
    const statusLabels = {
      'pending': 'En attente',
      'equipment_withdrawn': 'Matériel retiré',
      'equipment_returned': 'Matériel rendu',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    
    // Special handling for equipment withdrawal
    if (newStatus === 'equipment_withdrawn') {
      if (window.confirm(`Changer le statut vers "Matériel retiré" ?\n\nNote: Le matériel sera marqué comme retiré par le client.`)) {
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
      return;
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

  const handleWithdrawEquipment = async (reservationId) => {
    changeReservationStatus(reservationId, 'equipment_withdrawn');
  };

  const handleReturnEquipment = (reservation) => {
    setSelectedReservation(reservation);
    // Initialize maintenance reports for each equipment item
    const reports = reservation.equipment_items.map(item => ({
      equipment_id: item.equipment_id,
      equipment_name: item.equipment_name,
      equipment_reference: item.equipment_reference || 'N/A',
      status: 'ok',
      notes: ''
    }));
    setMaintenanceReports(reports);
    setShowReturnModal(true);
  };

  const submitReturnReport = async () => {
    try {
      setIsLoading(true);
      
      // Submit maintenance report
      await axios.post(`${API}/maintenance-reports`, {
        reservation_id: selectedReservation.id,
        equipment_items: maintenanceReports,
        notes: 'Rapport de retour de matériel'
      });

      // Update reservation status
      await axios.put(`${API}/reservations/${selectedReservation.id}`, { 
        status: 'equipment_returned' 
      });

      toast.success('Retour de matériel confirmé avec rapport de maintenance');
      setShowReturnModal(false);
      setSelectedReservation(null);
      setMaintenanceReports([]);
      await fetchReservations();
    } catch (error) {
      console.error('Error submitting return report:', error);
      toast.error('Erreur lors du rapport de retour');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMaintenanceReport = (index, field, value) => {
    const updated = [...maintenanceReports];
    updated[index][field] = value;
    setMaintenanceReports(updated);
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

  const archiveReservation = async (id) => {
    if (window.confirm('Archiver cette réservation ?')) {
      try {
        setIsLoading(true);
        await axios.put(`${API}/reservations/${id}`, { 
          status: 'completed',
          is_archived: true,
          archived_at: new Date().toISOString()
        });
        toast.success('Réservation archivée avec succès');
        await fetchReservations();
      } catch (error) {
        console.error('Error archiving reservation:', error);
        toast.error('Erreur lors de l\'archivage');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Réservations</h2>
      </div>

      <Card>
        <CardHeader>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client/DJ</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Équipements</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
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
                  reservations.map((reservation) => {
                    const clientName = reservation.client_name || reservation.dj_name || 'N/A';
                    const startDate = reservation.start_date ? new Date(reservation.start_date).toLocaleDateString('fr-FR') : 'N/A';
                    const endDate = reservation.end_date ? new Date(reservation.end_date).toLocaleDateString('fr-FR') : 'N/A';
                    const itemCount = reservation.equipment_items ? reservation.equipment_items.length : 0;
                    
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {reservation.booking_type === 'dj' ? <Headphones className="w-4 h-4 text-purple-600" /> : <User className="w-4 h-4 text-blue-600" />}
                            {clientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={reservation.booking_type === 'dj' ? 'secondary' : 'default'}>
                            {reservation.booking_type === 'dj' ? 'DJ' : 'Client'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {startDate} → {endDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{itemCount} équipement(s)</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {reservation.total_amount}€
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reservation.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            {/* Quick actions based on current status */}
                            {reservation.status === 'equipment_withdrawn' && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleReturnEquipment(reservation)}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                                title="Retour matériel"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {reservation.status === 'equipment_returned' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => archiveReservation(reservation.id)}
                                disabled={isLoading}
                                title="Archiver"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* Status change dropdown - only show if not completed */}
                            {reservation.status !== 'completed' && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value && e.target.value !== reservation.status) {
                                    changeReservationStatus(reservation.id, e.target.value);
                                    e.target.value = ''; // Reset select
                                  }
                                }}
                                className="text-xs p-1 border rounded bg-white"
                                disabled={isLoading}
                                defaultValue=""
                              >
                                <option value="">Changer statut</option>
                                <option value="pending">En attente</option>
                                <option value="equipment_withdrawn">Matériel retiré</option>
                                <option value="equipment_returned">Matériel rendu</option>
                                <option value="completed">Terminé</option>
                                <option value="cancelled">Annulé</option>
                              </select>
                            )}
                            
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDelete(reservation.id)}
                              disabled={isLoading}
                              title="Supprimer"
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

      {/* Return Equipment Modal */}
      {showReturnModal && selectedReservation && (
        <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Retour de matériel - Rapport de maintenance</DialogTitle>
              <DialogDescription>
                Vérifiez l'état du matériel retourné et signalez tout problème
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {maintenanceReports.map((report, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{report.equipment_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label>État du matériel</Label>
                      <select
                        value={report.status}
                        onChange={(e) => updateMaintenanceReport(index, 'status', e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="ok">✅ En bon état</option>
                        <option value="maintenance_required">⚠️ Maintenance requise</option>
                        <option value="defective">❌ Défectueux</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={report.notes}
                        onChange={(e) => updateMaintenanceReport(index, 'notes', e.target.value)}
                        placeholder="Observations sur l'état du matériel..."
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReturnModal(false)}>
                Annuler
              </Button>
              <Button onClick={submitReturnReport} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? 'Enregistrement...' : 'Confirmer le retour'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ReservationsView;