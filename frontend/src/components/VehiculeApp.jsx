import React, { useState, useEffect } from 'react';
import { 
  Car, Plus, Trash2, Edit, FileText, Calendar, Clock, CreditCard, 
  Fuel, Wrench, Shield, ClipboardList, TrendingUp, AlertTriangle, 
  Download, Loader2, Search, X, Check, Eye, ExternalLink, RefreshCw, BarChart2
} from 'lucide-react';
import { toast } from 'sonner';

export default function VehiculeApp() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'maintenance' | 'fuel' | 'docs'
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals / Dialogs
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);

  // Loading States
  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form States
  const [vehicleForm, setVehicleForm] = useState({
    id: '',
    brand: '',
    model: '',
    licensePlate: '',
    year: '',
    mileage: '',
    fuelType: 'Diesel', // 'Diesel' | 'Essence' | 'Hybride' | 'Électrique'
    tollBadgeNumber: '',
    insuranceCompany: '',
    insurancePolicyNumber: '',
    nextCtDate: '', // Prochain contrôle technique
    nextOilChangeMileage: '', // Kilométrage prochaine vidange
    status: 'En service', // 'En service' | 'En entretien' | 'En panne' | 'Vendu'
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Vidange', // 'Vidange' | 'Freinage' | 'Pneumatiques' | 'Contrôle Technique' | 'Assurance' | 'Autre'
    description: '',
    mileage: '',
    cost: '',
    garage: '',
    documentUrl: '',
    documentName: ''
  });

  const [fuelForm, setFuelForm] = useState({
    date: new Date().toISOString().split('T')[0],
    liters: '',
    cost: '',
    mileage: '',
    station: ''
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
        if (data.length > 0) {
          // Keep current selection if valid, else pick first
          const stillExists = selectedVehicle ? data.find(v => (v.id || v._id) === (selectedVehicle.id || selectedVehicle._id)) : null;
          setSelectedVehicle(stillExists || data[0]);
        } else {
          setSelectedVehicle(null);
        }
      } else {
        toast.error("Impossible de récupérer les véhicules");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVehicleModal = (vehicle = null) => {
    if (vehicle) {
      setVehicleForm({
        id: vehicle.id || vehicle._id,
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        licensePlate: vehicle.licensePlate || '',
        year: vehicle.year || '',
        mileage: vehicle.mileage || '',
        fuelType: vehicle.fuelType || 'Diesel',
        tollBadgeNumber: vehicle.tollBadgeNumber || '',
        insuranceCompany: vehicle.insuranceCompany || '',
        insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
        nextCtDate: vehicle.nextCtDate || '',
        nextOilChangeMileage: vehicle.nextOilChangeMileage || '',
        status: vehicle.status || 'En service',
        notes: vehicle.notes || ''
      });
    } else {
      setVehicleForm({
        id: '',
        brand: '',
        model: '',
        licensePlate: '',
        year: new Date().getFullYear().toString(),
        mileage: '',
        fuelType: 'Diesel',
        tollBadgeNumber: '',
        insuranceCompany: '',
        insurancePolicyNumber: '',
        nextCtDate: '',
        nextOilChangeMileage: '',
        status: 'En service',
        notes: ''
      });
    }
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.licensePlate) {
      toast.error("La marque, le modèle et la plaque d'immatriculation sont obligatoires");
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(vehicleForm)
      });

      if (res.ok) {
        const saved = await res.json();
        toast.success(vehicleForm.id ? "Véhicule mis à jour !" : "Véhicule ajouté à la flotte !");
        setVehicleModalOpen(false);
        await fetchVehicles();
        setSelectedVehicle(saved);
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erreur lors de la sauvegarde.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de connexion");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVehicle = async (vId) => {
    if (!window.confirm("Êtes-vous certain de vouloir supprimer ce véhicule de votre flotte ? Tous les entretiens associés seront supprimés.")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/vehicles/${vId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Véhicule supprimé.");
        setSelectedVehicle(null);
        fetchVehicles();
      } else {
        toast.error("Échec de la suppression");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/vehicles/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'maintenance') {
          setMaintenanceForm(prev => ({
            ...prev,
            documentUrl: data.url,
            documentName: file.name
          }));
        }
        toast.success("Document enregistré avec succès !");
      } else {
        toast.error("Échec de l'import de document");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(maintenanceForm)
      });

      if (res.ok) {
        const updatedVehicle = await res.json();
        toast.success("Nouvel entretien consigné !");
        setMaintenanceModalOpen(false);
        
        // Reset Form
        setMaintenanceForm({
          date: new Date().toISOString().split('T')[0],
          type: 'Vidange',
          description: '',
          mileage: '',
          cost: '',
          garage: '',
          documentUrl: '',
          documentName: ''
        });

        // Update local list & selection
        setVehicles(prev => prev.map(v => (v.id || v._id) === (updatedVehicle.id || updatedVehicle._id) ? updatedVehicle : v));
        setSelectedVehicle(updatedVehicle);
      } else {
        toast.error("Erreur lors de l'enregistrement de l'entretien");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFuel = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      
      const res = await fetch(`/api/vehicles/${vehicleId}/fuel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(fuelForm)
      });

      if (res.ok) {
        const updatedVehicle = await res.json();
        toast.success("Plein de carburant enregistré !");
        setFuelModalOpen(false);
        
        setFuelForm({
          date: new Date().toISOString().split('T')[0],
          liters: '',
          cost: '',
          mileage: '',
          station: ''
        });

        // Update local list & selection
        setVehicles(prev => prev.map(v => (v.id || v._id) === (updatedVehicle.id || updatedVehicle._id) ? updatedVehicle : v));
        setSelectedVehicle(updatedVehicle);
      } else {
        toast.error("Erreur lors de l'enregistrement du carburant");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaintenanceRecord = async (index) => {
    if (!window.confirm("Supprimer cette entrée d'entretien ?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedVehicle = await res.json();
        toast.success("Entretien supprimé");
        setVehicles(prev => prev.map(v => (v.id || v._id) === (updatedVehicle.id || updatedVehicle._id) ? updatedVehicle : v));
        setSelectedVehicle(updatedVehicle);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFuelRecord = async (index) => {
    if (!window.confirm("Supprimer ce plein de carburant ?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      const res = await fetch(`/api/vehicles/${vehicleId}/fuel/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedVehicle = await res.json();
        toast.success("Plein supprimé");
        setVehicles(prev => prev.map(v => (v.id || v._id) === (updatedVehicle.id || updatedVehicle._id) ? updatedVehicle : v));
        setSelectedVehicle(updatedVehicle);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper Stats Calculation
  const totalFleetCost = vehicles.reduce((sum, v) => {
    const maintCost = (v.maintenanceRecords || []).reduce((s, r) => sum + Number(r.cost || 0), 0);
    const fuelCost = (v.fuelRecords || []).reduce((s, r) => sum + Number(r.cost || 0), 0);
    return sum + maintCost + fuelCost;
  }, 0);

  const totalOverdueAlerts = vehicles.filter(v => {
    const hasCtAlert = v.nextCtDate && new Date(v.nextCtDate) < new Date();
    const hasOilChangeAlert = v.nextOilChangeMileage && Number(v.mileage || 0) >= Number(v.nextOilChangeMileage || 0);
    return hasCtAlert || hasOilChangeAlert;
  }).length;

  const totalFuelLiters = vehicles.reduce((sum, v) => {
    return sum + (v.fuelRecords || []).reduce((s, r) => s + Number(r.liters || 0), 0);
  }, 0);

  const getMaintenanceHistory = () => {
    if (!selectedVehicle) return [];
    return (selectedVehicle.maintenanceRecords || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getFuelHistory = () => {
    if (!selectedVehicle) return [];
    return (selectedVehicle.fuelRecords || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getDocuments = () => {
    if (!selectedVehicle) return [];
    const docs = [];
    if (selectedVehicle.maintenanceRecords) {
      selectedVehicle.maintenanceRecords.forEach(r => {
        if (r.documentUrl) {
          docs.push({
            name: r.documentName || `Facture ${r.type} - ${r.date}`,
            url: r.documentUrl,
            date: r.date,
            type: r.type,
            cost: r.cost
          });
        }
      });
    }
    return docs;
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = `${v.brand} ${v.model} ${v.licensePlate}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl text-left">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Car className="w-7 h-7 text-indigo-600" />
            Suivi Flotte Véhicules
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gérez vos véhicules d'entreprise, contrôles techniques, historique d'entretien, factures et badges télépéage.
          </p>
        </div>
        <button
          onClick={() => handleOpenVehicleModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors text-sm shadow-sm cursor-pointer whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter un véhicule
        </button>
      </div>

      {/* KPI Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Flotte totale</span>
            <span className="text-2xl font-black text-gray-800 tabular-nums">{vehicles.length}</span>
            <span className="block text-[10px] text-gray-500 mt-0.5">Véhicules enregistrés</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Budget Engagé</span>
            <span className="text-2xl font-black text-gray-800 tabular-nums">
              {vehicles.reduce((acc, v) => {
                const totalMaint = (v.maintenanceRecords || []).reduce((s, r) => s + Number(r.cost || 0), 0);
                const totalFuel = (v.fuelRecords || []).reduce((s, r) => s + Number(r.cost || 0), 0);
                return acc + totalMaint + totalFuel;
              }, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[10px] text-gray-500 mt-0.5">Entretien + Carburant</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${totalOverdueAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Alerte(s) Critique(s)</span>
            <span className="text-2xl font-black text-gray-800 tabular-nums">{totalOverdueAlerts}</span>
            <span className="block text-[10px] text-gray-500 mt-0.5">CT dépassé / Vidange requise</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Plein de Carburant</span>
            <span className="text-2xl font-black text-gray-800 tabular-nums">
              {totalFuelLiters.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-xs text-gray-500">L</span>
            </span>
            <span className="block text-[10px] text-gray-500 mt-0.5">Consommation cumulée</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: LIST OF VEHICLES (3 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
            
            {/* Search/Filter UI */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher (marque, plaque...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              {['all', 'En service', 'En entretien', 'En panne'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 text-[10px] font-bold py-1.5 px-1 rounded-lg transition-all border ${
                    statusFilter === status 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Tous' : status}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                Aucun véhicule correspondant.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredVehicles.map((vehicle) => {
                  const isSelected = selectedVehicle && (selectedVehicle.id || selectedVehicle._id) === (vehicle.id || vehicle._id);
                  const hasAlert = (vehicle.nextCtDate && new Date(vehicle.nextCtDate) < new Date()) || 
                                   (vehicle.nextOilChangeMileage && Number(vehicle.mileage || 0) >= Number(vehicle.nextOilChangeMileage || 0));

                  return (
                    <div
                      key={vehicle.id || vehicle._id}
                      onClick={() => setSelectedVehicle(vehicle)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Alert banner border indicator */}
                      {hasAlert && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-gray-800 leading-snug">
                            {vehicle.brand} {vehicle.model}
                          </h4>
                          <span className="inline-block mt-1 font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border">
                            {vehicle.licensePlate}
                          </span>
                        </div>

                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          vehicle.status === 'En service' ? 'bg-green-50 text-green-700 border border-green-200' :
                          vehicle.status === 'En entretien' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {vehicle.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                          {Number(vehicle.mileage || 0).toLocaleString('fr-FR')} km
                        </span>
                        {vehicle.tollBadgeNumber && (
                          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            Péage actif
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: VEHICLE DETAILS & ACTIONS (8 cols) */}
        <div className="lg:col-span-8">
          {selectedVehicle ? (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
              
              {/* Profile/Vehicle Header banner */}
              <div className="bg-slate-900 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-black tracking-tight">{selectedVehicle.brand} {selectedVehicle.model}</h2>
                    <span className="font-mono text-xs font-black tracking-wider px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 rounded-md">
                      {selectedVehicle.licensePlate}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Année {selectedVehicle.year} · Motorisation {selectedVehicle.fuelType} · {Number(selectedVehicle.mileage || 0).toLocaleString('fr-FR')} km au compteur
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenVehicleModal(selectedVehicle)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(selectedVehicle.id || selectedVehicle._id)}
                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b flex items-center gap-1 bg-gray-50 px-4">
                {[
                  { id: 'info', label: 'Vue d\'ensemble', icon: ClipboardList },
                  { id: 'maintenance', label: 'Entretiens', icon: Wrench },
                  { id: 'fuel', label: 'Carburant', icon: Fuel },
                  { id: 'docs', label: 'Documents Flotte', icon: FileText }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 px-4 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        isActive 
                          ? 'border-indigo-600 text-indigo-600 bg-white font-black shadow-inner-sm' 
                          : 'border-transparent text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                
                {/* TAB 1: INFO / OVERVIEW */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Alerts panel */}
                    {((selectedVehicle.nextCtDate && new Date(selectedVehicle.nextCtDate) < new Date()) || 
                      (selectedVehicle.nextOilChangeMileage && Number(selectedVehicle.mileage || 0) >= Number(selectedVehicle.nextOilChangeMileage || 0))) && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5 animate-bounce" />
                        <div>
                          <h4 className="text-xs font-black">Opération de maintenance requise immédiatement !</h4>
                          <ul className="list-disc list-inside text-[11px] text-red-700 mt-1 space-y-0.5">
                            {selectedVehicle.nextCtDate && new Date(selectedVehicle.nextCtDate) < new Date() && (
                              <li>Le contrôle technique a expiré ou est à faire rapidement (Échéance: {new Date(selectedVehicle.nextCtDate).toLocaleDateString('fr-FR')})</li>
                            )}
                            {selectedVehicle.nextOilChangeMileage && Number(selectedVehicle.mileage || 0) >= Number(selectedVehicle.nextOilChangeMileage || 0) && (
                              <li>La vidange moteur est en retard (Compteur: {Number(selectedVehicle.mileage).toLocaleString('fr-FR')} km / Seuil: {Number(selectedVehicle.nextOilChangeMileage).toLocaleString('fr-FR')} km)</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Telepeage and administrative information */}
                      <div className="border rounded-2xl p-4 bg-white space-y-4">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-indigo-600" /> Télépéage & Identification
                        </h3>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Badge Télépéage</span>
                            <span className="font-mono font-bold text-gray-700">
                              {selectedVehicle.tollBadgeNumber || 'Non renseigné'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Contrôle Technique</span>
                            <span className={`font-semibold ${selectedVehicle.nextCtDate && new Date(selectedVehicle.nextCtDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                              {selectedVehicle.nextCtDate ? new Date(selectedVehicle.nextCtDate).toLocaleDateString('fr-FR') : 'Non planifié'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Seuil Vidange</span>
                            <span className="font-semibold text-gray-700">
                              {selectedVehicle.nextOilChangeMileage ? `${Number(selectedVehicle.nextOilChangeMileage).toLocaleString('fr-FR')} km` : 'Non configuré'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Assurance & administrative details */}
                      <div className="border rounded-2xl p-4 bg-white space-y-4">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-600" /> Assurance Véhicule
                        </h3>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Compagnie d'Assurance</span>
                            <span className="font-semibold text-gray-700">{selectedVehicle.insuranceCompany || 'Non renseignée'}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Numéro de Contrat/Police</span>
                            <span className="font-mono font-semibold text-gray-700">{selectedVehicle.insurancePolicyNumber || 'Non renseigné'}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-gray-400 font-medium">Statut d'utilisation</span>
                            <span className="font-semibold text-gray-700">{selectedVehicle.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Notes */}
                      {selectedVehicle.notes && (
                        <div className="md:col-span-2 border rounded-2xl p-4 bg-yellow-50/20 border-yellow-100 text-xs">
                          <h4 className="font-bold text-gray-700">Notes & Informations complémentaires :</h4>
                          <p className="text-gray-600 mt-1.5 italic whitespace-pre-wrap">{selectedVehicle.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: MAINTENANCE LIST */}
                {activeTab === 'maintenance' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Historique complet des entretiens</h3>
                      <button
                        onClick={() => setMaintenanceModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 text-[11px] cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Enregistrer un entretien
                      </button>
                    </div>

                    {getMaintenanceHistory().length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 border rounded-2xl text-gray-400 text-xs">
                        Aucune maintenance consignée pour le moment.
                      </div>
                    ) : (
                      <div className="border rounded-2xl overflow-hidden divide-y text-xs bg-white">
                        {getMaintenanceHistory().map((record, idx) => (
                          <div key={idx} className="p-4 flex flex-col sm:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-800">{record.type}</span>
                                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                                  {new Date(record.date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <p className="text-gray-500 italic mt-0.5">{record.description || 'Sans description'}</p>
                              <div className="flex gap-3 text-[10px] text-gray-400 font-medium pt-1">
                                {record.mileage && <span>Compteur : {Number(record.mileage).toLocaleString('fr-FR')} km</span>}
                                {record.garage && <span>Garage : {record.garage}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                              <span className="font-black text-gray-900 text-sm tabular-nums">
                                {Number(record.cost || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {record.documentUrl && (
                                  <a
                                    href={record.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-all flex items-center gap-0.5 text-[10px] font-bold"
                                    title="Voir le justificatif"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Justificatif
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDeleteMaintenanceRecord(idx)}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                                  title="Supprimer la fiche"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: FUEL CONSUMPTION */}
                {activeTab === 'fuel' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Suivi des pleins & Consommation</h3>
                      <button
                        onClick={() => setFuelModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 text-[11px] cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Enregistrer un plein
                      </button>
                    </div>

                    {getFuelHistory().length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 border rounded-2xl text-gray-400 text-xs">
                        Aucun approvisionnement enregistré.
                      </div>
                    ) : (
                      <div className="border rounded-2xl overflow-hidden divide-y text-xs bg-white">
                        {getFuelHistory().map((record, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div className="space-y-1 text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-800">{record.liters} Litres</span>
                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                                  {new Date(record.date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex gap-3 text-[10px] text-gray-400 font-medium mt-1 truncate">
                                <span>Kilométrage : {Number(record.mileage).toLocaleString('fr-FR')} km</span>
                                {record.station && <span>Station : {record.station}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="font-black text-gray-900 text-sm tabular-nums">
                                {Number(record.cost || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </span>
                              <button
                                onClick={() => handleDeleteFuelRecord(idx)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: DOCUMENTS DRAWER */}
                {activeTab === 'docs' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Factures & Justificatifs flotte</h3>

                    {getDocuments().length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 border rounded-2xl text-gray-400 text-xs">
                        Aucun document disponible. Attachez des factures lors de l'enregistrement de vos entretiens.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getDocuments().map((doc, idx) => (
                          <div key={idx} className="border rounded-2xl p-4 bg-white flex items-start gap-3 justify-between">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="block text-xs font-bold text-gray-800 truncate" title={doc.name}>
                                  {doc.name}
                                </span>
                                <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">
                                  Maintenance {doc.type} · {new Date(doc.date).toLocaleDateString('fr-FR')}
                                </span>
                                {doc.cost && (
                                  <span className="block text-[10px] font-black text-indigo-600 mt-1">
                                    Montant : {Number(doc.cost).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all self-center flex-shrink-0"
                              title="Ouvrir le document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center min-h-[400px]">
              <Car className="w-12 h-12 text-gray-300 animate-pulse mb-3" />
              <h3 className="font-bold text-gray-600">Aucun véhicule sélectionné</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Sélectionnez un véhicule dans le volet de gauche ou ajoutez-en un nouveau pour suivre l'historique et les alertes d'entretien.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* DIALOG 1: ADD / EDIT VEHICLE */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in text-left">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 tracking-tight text-base flex items-center gap-1.5">
                <Car className="w-5 h-5 text-indigo-600" />
                {vehicleForm.id ? "Modifier le véhicule" : "Ajouter un véhicule à la flotte"}
              </h3>
              <button 
                onClick={() => setVehicleModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Peugeot, Renault, Tesla"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 208, Clio, Model Y"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Plaque d'immatriculation *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: AA-123-XX"
                    value={vehicleForm.licensePlate}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, licensePlate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Année</label>
                  <input
                    type="number"
                    placeholder="ex: 2022"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Motorisation/Carburant</label>
                  <select
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, fuelType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Essence">Essence</option>
                    <option value="Hybride">Hybride</option>
                    <option value="Électrique">Électrique</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Kilométrage actuel (km)</label>
                  <input
                    type="number"
                    placeholder="ex: 45000"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, mileage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Badge Télépéage (Numéro)</label>
                  <input
                    type="text"
                    placeholder="ex: 307123456"
                    value={vehicleForm.tollBadgeNumber}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, tollBadgeNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Échéance Contrôle Technique</label>
                  <input
                    type="date"
                    value={vehicleForm.nextCtDate}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, nextCtDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Kilométrage Prochaine Vidange</label>
                  <input
                    type="number"
                    placeholder="ex: 60000"
                    value={vehicleForm.nextOilChangeMileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, nextOilChangeMileage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Assurance (Compagnie)</label>
                  <input
                    type="text"
                    placeholder="ex: AXA, Macif, MMA"
                    value={vehicleForm.insuranceCompany}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, insuranceCompany: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Numéro Contrat Assurance</label>
                  <input
                    type="text"
                    placeholder="ex: POL-123456"
                    value={vehicleForm.insurancePolicyNumber}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Statut du véhicule</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="En service">En service</option>
                    <option value="En entretien">En entretien</option>
                    <option value="En panne">En panne</option>
                    <option value="Vendu">Vendu / Retiré</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Notes & Remarques</label>
                  <textarea
                    rows="2.5"
                    placeholder="Détails supplémentaires..."
                    value={vehicleForm.notes}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Sauvegarder le véhicule
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: LOG MAINTENANCE */}
      {maintenanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in text-left">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 tracking-tight text-base flex items-center gap-1.5">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Enregistrer un entretien
              </h3>
              <button onClick={() => setMaintenanceModalOpen(false)} className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaintenance} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={maintenanceForm.date}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Type d'entretien *</label>
                  <select
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Vidange">Vidange</option>
                    <option value="Freinage">Freinage (Plaquettes, Disques)</option>
                    <option value="Pneumatiques">Pneumatiques</option>
                    <option value="Contrôle Technique">Contrôle Technique</option>
                    <option value="Assurance">Assurance</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Kilométrage lors de l'acte</label>
                  <input
                    type="number"
                    placeholder="ex: 48200"
                    value={maintenanceForm.mileage}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, mileage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Coût TTC (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ex: 180"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Garage / Établissement</label>
                  <input
                    type="text"
                    placeholder="ex: Norauto, Garage du Centre, Constructeur"
                    value={maintenanceForm.garage}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, garage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Description précise de l'intervention</label>
                  <textarea
                    rows="2.5"
                    required
                    placeholder="Remplacement des plaquettes avant..."
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* GCS File upload integration for invoices */}
              <div className="border border-dashed border-indigo-200 bg-indigo-50/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 relative">
                {maintenanceForm.documentUrl ? (
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span className="truncate max-w-[200px]">{maintenanceForm.documentName}</span>
                    <button
                      type="button"
                      onClick={() => setMaintenanceForm(prev => ({ ...prev, documentUrl: '', documentName: '' }))}
                      className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-400 font-bold">Importer la facture ou un justificatif (PDF, PNG...)</span>
                    <input
                      type="file"
                      id="maint-doc-input"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'maintenance')}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => document.getElementById('maint-doc-input').click()}
                      className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Choisir le fichier
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer l'entretien
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: ADD FUEL */}
      {fuelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-scale-in text-left">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 tracking-tight text-base flex items-center gap-1.5">
                <Fuel className="w-5 h-5 text-indigo-600" />
                Enregistrer un plein
              </h3>
              <button onClick={() => setFuelModalOpen(false)} className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFuel} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={fuelForm.date}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Volume (Litres) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ex: 45.5"
                    value={fuelForm.liters}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, liters: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Coût Total (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ex: 85.3"
                    value={fuelForm.cost}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Kilométrage actuel compteur (km) *</label>
                <input
                  type="number"
                  required
                  placeholder="ex: 48500"
                  value={fuelForm.mileage}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, mileage: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Station service (Enseigne, Lieu)</label>
                <input
                  type="text"
                  placeholder="ex: Total Strasbourg, E.Leclerc"
                  value={fuelForm.station}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, station: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Consigner le plein
                </button>
                <button
                  type="button"
                  onClick={() => setFuelModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
