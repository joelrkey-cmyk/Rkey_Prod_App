import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, Edit, Trash2, ArrowLeft, CreditCard, Calendar, 
  AlertTriangle, CheckCircle, PauseCircle, XCircle,
  Euro, TrendingUp, Clock, Bell, Settings, Tag, FolderOpen, Download
} from 'lucide-react';

import API_BASE_URL from '../utils/apiUrl';
const API = API_BASE_URL + '/api';

// Configuration axios avec token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function AbonnementsApp() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    active_count: 0,
    total_monthly: 0,
    total_annual: 0,
    renewals_soon: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, subscription: null });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    provider: '',
    amount_ht: '',
    amount_ttc: '',
    tva_rate: '20',
    frequency: 'mensuel',
    status: 'actif',
    start_date: '',
    renewal_date: '',
    renewal_day: '',
    payment_method: '',
    payment_account: '',
    contract_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, catsRes, statsRes] = await Promise.all([
        axios.get(`${API}/subscriptions`),
        axios.get(`${API}/subscriptions/categories`),
        axios.get(`${API}/subscriptions/stats`)
      ]);
      setSubscriptions(subsRes.data || []);
      setCategories(catsRes.data || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcul TTC à partir du HT
  const calculateTTC = (ht, tvaRate) => {
    const htValue = parseFloat(ht) || 0;
    const tva = parseFloat(tvaRate) || 0;
    return (htValue * (1 + tva / 100)).toFixed(2);
  };

  // Calcul HT à partir du TTC
  const calculateHT = (ttc, tvaRate) => {
    const ttcValue = parseFloat(ttc) || 0;
    const tva = parseFloat(tvaRate) || 0;
    return (ttcValue / (1 + tva / 100)).toFixed(2);
  };

  // Gestion du changement de montant HT
  const handleHTChange = (value) => {
    const newTTC = calculateTTC(value, formData.tva_rate);
    setFormData({ ...formData, amount_ht: value, amount_ttc: newTTC });
  };

  // Gestion du changement de montant TTC
  const handleTTCChange = (value) => {
    const newHT = calculateHT(value, formData.tva_rate);
    setFormData({ ...formData, amount_ttc: value, amount_ht: newHT });
  };

  // Gestion du changement de taux TVA (recalcule le TTC à partir du HT)
  const handleTVAChange = (value) => {
    const newTTC = calculateTTC(formData.amount_ht, value);
    setFormData({ ...formData, tva_rate: value, amount_ttc: newTTC });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        amount_ht: parseFloat(formData.amount_ht) || 0,
        tva_rate: parseFloat(formData.tva_rate) || 0,
        amount_ttc: parseFloat(calculateTTC(formData.amount_ht, formData.tva_rate)),
        start_date: formData.start_date || null,
        // Pour mensuel: utiliser renewal_day, sinon renewal_date
        renewal_date: formData.frequency !== 'mensuel' && formData.renewal_date ? formData.renewal_date : null,
        renewal_day: formData.frequency === 'mensuel' && formData.renewal_day ? parseInt(formData.renewal_day) : null
      };

      if (editingSubscription) {
        await axios.put(`${API}/subscriptions/${editingSubscription.id}`, payload);
        toast.success('Abonnement mis à jour');
      } else {
        await axios.post(`${API}/subscriptions`, payload);
        toast.success('Abonnement créé');
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      name: subscription.name || '',
      category: subscription.category || '',
      provider: subscription.provider || '',
      amount_ht: subscription.amount_ht?.toString() || '',
      amount_ttc: subscription.amount_ttc?.toString() || '',
      tva_rate: subscription.tva_rate?.toString() || '20',
      frequency: subscription.frequency || 'mensuel',
      status: subscription.status || 'actif',
      start_date: subscription.start_date ? subscription.start_date.split('T')[0] : '',
      renewal_date: subscription.renewal_date ? subscription.renewal_date.split('T')[0] : '',
      renewal_day: subscription.renewal_day?.toString() || '',
      payment_method: subscription.payment_method || '',
      payment_account: subscription.payment_account || '',
      contract_number: subscription.contract_number || '',
      notes: subscription.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDialog.subscription) return;

    try {
      await axios.delete(`${API}/subscriptions/${confirmDialog.subscription.id}`);
      toast.success('Abonnement supprimé');
      setConfirmDialog({ open: false, subscription: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await axios.post(`${API}/subscriptions/categories`, { name: newCategoryName.trim() });
      toast.success('Catégorie ajoutée');
      setNewCategoryName('');
      setShowCategoryDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      provider: '',
      amount_ht: '',
      amount_ttc: '',
      tva_rate: '20',
      frequency: 'mensuel',
      status: 'actif',
      start_date: '',
      renewal_date: '',
      renewal_day: '',
      payment_method: '',
      payment_account: '',
      contract_number: '',
      notes: ''
    });
    setEditingSubscription(null);
    setShowForm(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'actif':
        return <Badge className="bg-green-500 hover:bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Actif</Badge>;
      case 'suspendu':
        return <Badge className="bg-yellow-500 hover:bg-yellow-500"><PauseCircle className="w-3 h-3 mr-1" /> Suspendu</Badge>;
      case 'resilie':
        return <Badge className="bg-red-500 hover:bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Résilié</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'mensuel': return '/mois';
      case 'trimestriel': return '/trim.';
      case 'annuel': return '/an';
      default: return '';
    }
  };

  const isRenewalSoon = (sub) => {
    const today = new Date();
    
    if (sub.frequency === 'mensuel' && sub.renewal_day) {
      // Pour mensuel, calculer la prochaine date de renouvellement
      const currentDay = today.getDate();
      const renewalDay = sub.renewal_day;
      let daysUntil;
      
      if (renewalDay >= currentDay) {
        daysUntil = renewalDay - currentDay;
      } else {
        // Prochain mois
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntil = (daysInMonth - currentDay) + renewalDay;
      }
      
      return daysUntil <= 7; // Alerte si dans les 7 prochains jours pour mensuel
    } else if (sub.renewal_date) {
      // Pour trimestriel/annuel
      const renewal = new Date(sub.renewal_date);
      const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }
    
    return false;
  };

  const getRenewalDisplay = (sub) => {
    if (sub.frequency === 'mensuel' && sub.renewal_day) {
      return `Le ${sub.renewal_day === 1 ? '1er' : sub.renewal_day} du mois`;
    } else if (sub.renewal_date) {
      return new Date(sub.renewal_date).toLocaleDateString('fr-FR');
    }
    return null;
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    if (filterCategory !== 'all' && sub.category !== filterCategory) return false;
    return true;
  });

  // Grouper les abonnements par catégorie
  const groupedSubscriptions = filteredSubscriptions.reduce((acc, sub) => {
    const category = sub.category || 'Sans catégorie';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sub);
    return acc;
  }, {});

  // Trier les catégories par ordre alphabétique
  const sortedCategories = Object.keys(groupedSubscriptions).sort();

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(18);
    doc.text("Liste des Abonnements", 14, 22);
    
    // Stats rapides
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Total mensuel HT: ${stats.total_monthly?.toFixed(2)} euros`, 14, 30);
    doc.text(`Total annuel HT: ${stats.total_annual?.toFixed(2)} euros`, 14, 36);
    doc.text(`Abonnements actifs: ${stats.active_count}`, 100, 30);
    
    // Préparation des données pour le tableau
    const tableColumn = ["Nom", "Categorie", "Fournisseur", "Montant TTC", "Freq.", "Statut", "Renouv."];
    const tableRows = [];
    
    filteredSubscriptions.forEach(sub => {
      const subData = [
        sub.name,
        sub.category || '-',
        sub.provider || '-',
        `${sub.amount_ttc?.toFixed(2)} €`,
        sub.frequency,
        sub.status,
        getRenewalDisplay(sub) || '-'
      ];
      tableRows.push(subData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save(`abonnements_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exporté avec succès");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-slate-600"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CreditCard className="w-7 h-7" />
                  Gestion des Abonnements
                </h1>
                <p className="text-slate-300 text-sm">Suivez tous vos abonnements et charges récurrentes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="bg-transparent border-slate-500 text-white hover:bg-slate-600"
                onClick={exportToPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter PDF
              </Button>
              <Button 
                variant="outline" 
                className="bg-transparent border-slate-500 text-white hover:bg-slate-600"
                onClick={() => setShowCategoryDialog(true)}
              >
                <Tag className="w-4 h-4 mr-2" />
                Catégories
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => { resetForm(); setShowForm(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvel abonnement
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Coût mensuel HT</p>
                  <p className="text-3xl font-bold">{stats.total_monthly?.toFixed(2)} €</p>
                  <p className="text-green-200 text-xs mt-0.5">{(stats.total_monthly * 1.2)?.toFixed(2)} € TTC</p>
                </div>
                <Euro className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Coût annuel HT</p>
                  <p className="text-3xl font-bold">{stats.total_annual?.toFixed(2)} €</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 ${stats.renewals_soon > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={stats.renewals_soon > 0 ? 'text-orange-100' : 'text-slate-200'} style={{fontSize: '0.875rem'}}>Renouvellements annuels</p>
                  <p className="text-3xl font-bold">{stats.renewals_soon}</p>
                  <p className={stats.renewals_soon > 0 ? 'text-orange-100' : 'text-slate-200'} style={{fontSize: '0.75rem'}}>dans les 30 jours</p>
                </div>
                <Bell className={`w-10 h-10 ${stats.renewals_soon > 0 ? 'text-orange-200' : 'text-slate-300'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Statut :</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="resilie">Résilié</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Catégorie :</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto text-sm text-gray-500">
                {filteredSubscriptions.length} abonnement(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions grouped by category */}
        {filteredSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Aucun abonnement trouvé</p>
                <p className="text-gray-400 text-sm mt-2">
                  Cliquez sur "Nouvel abonnement" pour en ajouter un
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map(category => (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-slate-600" />
                      {category}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {groupedSubscriptions[category].length} abonnement{groupedSubscriptions[category].length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>Nom</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                        <TableHead>Fréquence</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Renouvellement</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedSubscriptions[category].map(sub => (
                        <TableRow key={sub.id} className={sub.status === 'resilie' ? 'opacity-50' : ''}>
                          <TableCell className="font-semibold">{sub.name}</TableCell>
                          <TableCell className="text-gray-600">{sub.provider || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {sub.amount_ttc?.toFixed(2)} €
                            <span className="text-gray-400 text-xs ml-1">{getFrequencyLabel(sub.frequency)}</span>
                          </TableCell>
                          <TableCell>
                            {sub.frequency === 'mensuel' && 'Mensuel'}
                            {sub.frequency === 'trimestriel' && 'Trimestriel'}
                            {sub.frequency === 'annuel' && 'Annuel'}
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {getRenewalDisplay(sub) ? (
                              <div className="flex items-center gap-1">
                                {isRenewalSoon(sub) && (
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                )}
                                <span className={isRenewalSoon(sub) ? 'text-orange-600 font-medium' : ''}>
                                  {getRenewalDisplay(sub)}
                                </span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEdit(sub)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => setConfirmDialog({ open: true, subscription: sub })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? 'Modifier l\'abonnement' : 'Nouvel abonnement'}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription 
                ? 'Modifiez les informations de l\'abonnement'
                : 'Ajoutez un nouvel abonnement ou charge récurrente'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Tidal, EDF, Loyer..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Fournisseur</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="Nom du prestataire"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_number">N° Contrat / Référence</Label>
                <Input
                  id="contract_number"
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  placeholder="Référence client"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount_ht">Montant HT *</Label>
                <div className="relative">
                  <Input
                    id="amount_ht"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_ht}
                    onChange={(e) => handleHTChange(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tva_rate">TVA</Label>
                <Select 
                  value={formData.tva_rate} 
                  onValueChange={handleTVAChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exonéré)</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_ttc">Montant TTC *</Label>
                <div className="relative">
                  <Input
                    id="amount_ttc"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_ttc}
                    onChange={(e) => handleTTCChange(e.target.value)}
                    placeholder="0.00"
                    className="text-green-600 font-semibold"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Fréquence *</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="trimestriel">Trimestriel</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="resilie">Résilié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de souscription</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                {formData.frequency === 'mensuel' ? (
                  <>
                    <Label htmlFor="renewal_day">Jour de prélèvement</Label>
                    <Select 
                      value={formData.renewal_day} 
                      onValueChange={(value) => setFormData({ ...formData, renewal_day: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le jour..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            {day === 1 ? '1er' : day} du mois
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label htmlFor="renewal_date">Date de renouvellement</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Moyen de paiement</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData({ ...formData, payment_method: value, payment_account: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prelevement">Prélèvement automatique</SelectItem>
                  <SelectItem value="cb">Carte bancaire</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.payment_method === 'prelevement' || formData.payment_method === 'virement') && (
              <div className="space-y-2">
                <Label htmlFor="payment_account">Compte bancaire</Label>
                <Input
                  id="payment_account"
                  value={formData.payment_account || ''}
                  onChange={(e) => setFormData({ ...formData, payment_account: e.target.value })}
                  placeholder={formData.payment_method === 'prelevement' ? "Ex: Compte pro LCL, Compte perso..." : "Ex: Compte épargne, Compte courant..."}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : (editingSubscription ? 'Mettre à jour' : 'Créer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gérer les catégories</DialogTitle>
            <DialogDescription>
              Ajoutez des catégories personnalisées pour vos abonnements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nouvelle catégorie..."
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Catégories existantes :</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Badge 
                    key={cat.id} 
                    variant={cat.is_default ? 'secondary' : 'outline'}
                    className="py-1"
                  >
                    {cat.name}
                    {cat.is_default && <span className="ml-1 text-xs">(défaut)</span>}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, subscription: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer l'abonnement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'abonnement "{confirmDialog.subscription?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AbonnementsApp;
