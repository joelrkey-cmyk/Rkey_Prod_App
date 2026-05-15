// ClientsView - Module Location
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
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin, Search, ArrowUpDown } from 'lucide-react';
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

function ClientsView() {
  const [clients, setClients] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientType, setClientType] = useState('particulier'); // 'particulier', 'entreprise', 'association'
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    siret: '',
    company_name: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/clients`);
      setClients(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientTypeChange = (type) => {
    setClientType(type);
    // Réinitialiser le formulaire
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      siret: '',
      company_name: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Le nom est obligatoire');
      return;
    }

    try {
      setIsLoading(true);
      
      // Préparer les données complètes incluant company_name et siret
      const clientData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address || '',
        notes: formData.notes || ''
      };

      // Add type explicitely if we want to save it
      clientData.client_type = clientType;

      // Ajouter les champs spécifiques si le type est entreprise ou association
      if (clientType === 'entreprise') {
        clientData.company_name = formData.company_name || '';
        clientData.siret = formData.siret || '';
      } else if (clientType === 'association') {
        clientData.company_name = formData.company_name || ''; // on utilise le même champ
        clientData.siret = formData.siret || ''; // optionnel pour assoc
      }
      
      if (editingClient) {
        // Mode édition
        await axios.put(`${API}/clients/${editingClient.id}`, clientData);
        toast.success('Client mis à jour avec succès');
      } else {
        // Mode création - Check if client already exists
        const existingClient = clients.find(client => 
          client.name.toLowerCase() === formData.name.toLowerCase() ||
          (formData.email && client.email && client.email.toLowerCase() === formData.email.toLowerCase())
        );
        
        if (existingClient) {
          toast.error('Un client avec ce nom ou cet email existe déjà');
          return;
        }

        await axios.post(`${API}/clients`, clientData);
        toast.success('Client ajouté avec succès');
      }
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', address: '', notes: '', company_name: '', siret: '' });
      setClientType('particulier');
      setShowAddForm(false);
      setEditingClient(null);
      await fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erreur lors de la sauvegarde du client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
      company_name: client.company_name || '',
      siret: client.siret || ''
    });
    // Détecter le type de client (entreprise si company_name exists)
    let initialType = 'particulier';
    if (client.client_type) {
      initialType = client.client_type;
    } else if (client.company_name) {
      initialType = 'entreprise';
    }
    setClientType(initialType);
    setShowAddForm(true);
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) {
      try {
        setIsLoading(true);
        await axios.delete(`${API}/clients/${clientId}`);
        toast.success('Client supprimé avec succès');
        await fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        if (error.response?.status === 400) {
          toast.error('Impossible de supprimer ce client : il a des réservations actives');
        } else {
          toast.error('Erreur lors de la suppression du client');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getClientBadge = (client) => {
    let type = client.client_type;
    if (!type && client.company_name) type = 'entreprise';
    else if (!type) type = 'particulier';

    if (type === 'entreprise') {
      return <Badge className="bg-blue-500 text-white border-blue-600">🏢 Entreprise</Badge>;
    } else if (type === 'association') {
      return <Badge className="bg-purple-500 text-white border-purple-600">🤝 Association</Badge>;
    }
    return <Badge variant="outline">👤 Particulier</Badge>;
  };

  // Formater le nom du client pour l'affichage (avec entreprise si applicable)
  const getClientDisplayName = (client) => {
    if (client.company_name) {
      return `${client.name} - ${client.company_name}`;
    }
    return client.name;
  };

  const filteredAndSortedClients = [...clients]
    .filter(client => {
      const searchTerms = searchQuery.toLowerCase();
      return (
        (client.name && client.name.toLowerCase().includes(searchTerms)) ||
        (client.company_name && client.company_name.toLowerCase().includes(searchTerms)) ||
        (client.email && client.email.toLowerCase().includes(searchTerms))
      );
    })
    .sort((a, b) => {
      const nameA = getClientDisplayName(a).toLowerCase();
      const nameB = getClientDisplayName(b).toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'fr');
      } else {
        return nameB.localeCompare(nameA, 'fr');
      }
    });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Clients</h2>
        <Button 
          onClick={() => setShowAddForm(true)} 
          disabled={isLoading}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un client
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</CardTitle>
            <CardDescription>
              {editingClient ? 'Modifiez les informations du client' : 'Créez un nouveau client (particulier, entreprise ou association)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Type Selection - Only show when creating new client */}
              {!editingClient && (
                <div>
                  <Label>Type de client *</Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        value="particulier"
                        checked={clientType === 'particulier'}
                        onChange={(e) => handleClientTypeChange(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">👤 Particulier</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        value="entreprise"
                        checked={clientType === 'entreprise'}
                        onChange={(e) => handleClientTypeChange(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">🏢 Entreprise</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        value="association"
                        checked={clientType === 'association'}
                        onChange={(e) => handleClientTypeChange(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">🤝 Association</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Champs entreprise ou association (si sélectionné) */}
              {(clientType === 'entreprise' || clientType === 'association') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">{clientType === 'association' ? "Nom de l'association" : "Nom de l'entreprise"} *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      required
                      disabled={isLoading}
                      placeholder={clientType === 'association' ? "Nom de l'association" : "Raison sociale"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="siret">{clientType === 'association' ? "SIRET / RNA" : "SIRET"}</Label>
                    <Input
                      id="siret"
                      value={formData.siret}
                      onChange={(e) => setFormData({...formData, siret: e.target.value})}
                      disabled={isLoading}
                      placeholder={clientType === 'association' ? "Numéro (optionnel)" : "12345678900012"}
                      maxLength={14}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{(clientType === 'entreprise' || clientType === 'association') ? 'Personne de contact' : 'Nom'} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    disabled={isLoading}
                    placeholder={(clientType === 'entreprise' || clientType === 'association') ? 'Nom du contact' : 'Nom complet du client'}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={isLoading}
                    placeholder="email@exemple.com (optionnel)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={isLoading}
                    placeholder="+33 6 XX XX XX XX (optionnel)"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={isLoading}
                    placeholder="Adresse complète (optionnel)"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes supplémentaires sur le client..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (editingClient ? 'Mise à jour...' : 'Ajout...') : (
                    editingClient ? 'Mettre à jour' : 'Ajouter Client'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isLoading}
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingClient(null);
                    setClientType('particulier');
                    setFormData({ name: '', email: '', phone: '', address: '', notes: '', siret: '', company_name: '' });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div>
            <CardTitle>Liste des clients</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : (
                clients.length === 0 ? 'Aucun client enregistré' : `${filteredAndSortedClients.length} client(s) trouvé(s) (sur ${clients.length})`
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Rechercher (nom, entreprise, email)..."
                className="pl-8 sm:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des clients...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={toggleSortOrder} className="h-8 flex items-center gap-1 -ml-4 px-4 font-semibold hover:bg-transparent hover:text-gray-900">
                      Nom
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchQuery ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client enregistré. Cliquez sur "Ajouter un client" pour commencer.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {client.is_vip && <span className="text-amber-500">🌟</span>}
                          {client.company_name ? (
                            <span>🏢 {client.company_name}</span>
                          ) : (
                            client.name
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                          {client.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                          {client.phone}
                        </a>
                      </TableCell>
                      <TableCell>{client.address || '-'}</TableCell>
                      <TableCell>
                        {getClientBadge(client)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(client)}
                            disabled={isLoading}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(client.id)}
                            disabled={isLoading}
                            className="hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// DJ Management Component - Implémentation complète

export default ClientsView;
