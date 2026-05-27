import React, { useState, useEffect } from "react";
import { Package, Handshake, AlertTriangle, RefreshCw, Search, Phone, Mail, Calendar, DollarSign, ChevronRight } from "lucide-react";
import axios from "../../services/axiosConfig";
import { Toaster } from "../ui/sonner";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import DossierModal from "../location/DossierModal";
import DisputesView from "./DisputesView";

import API_BASE_URL from "../../utils/apiUrl";
const API = `${API_BASE_URL}/api`;

function RentalApp() {
  const [activeTab, setActiveTab] = useState("withdrawals"); // withdrawals, returns, disputes
  const [withdrawals, setWithdrawals] = useState([]);
  const [returns, setReturns] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Modal tracking
  const [selectedId, setSelectedId] = useState(null);
  const [showDossier, setShowDossier] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "withdrawals") {
        const res = await axios.get(`${API}/rental/withdrawals`);
        setWithdrawals(res.data || []);
      } else if (activeTab === "returns") {
        const res = await axios.get(`${API}/rental/returns`);
        setReturns(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDossier = (id) => {
    setSelectedId(id);
    setShowDossier(true);
  };

  const handleCloseDossier = () => {
    setShowDossier(false);
    setSelectedId(null);
    fetchData(); // Refresh current list
  };

  const filteredWithdrawals = withdrawals.filter((item) =>
    (item.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.quote_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReturns = returns.filter((item) =>
    (item.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.quote_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If disputes tab is active, render DisputesView directly
  if (activeTab === "disputes") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Toaster position="top-center" />
        <DisputesView onBack={() => setActiveTab("withdrawals")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" data-testid="rental-app">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Handshake className="w-7 h-7 text-orange-600" />
              Retraits & Retours Matériel
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gérez les signatures de contrats, prises de cautions, états des lieux de retrait et de retour.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchData}
              variant="outline"
              size="icon"
              className="h-10 w-10 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            
            <Button
              onClick={() => setActiveTab("disputes")}
              className="h-10 bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Gérer les litiges
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab("withdrawals"); setSearchQuery(""); }}
            className={`px-4 py-3 font-semibold text-sm border-b-2 tracking-wide transition-colors flex items-center gap-2 ${
              activeTab === "withdrawals"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="w-4 h-4" />
            Retraits en attente
            {withdrawals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                {withdrawals.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => { setActiveTab("returns"); setSearchQuery(""); }}
            className={`px-4 py-3 font-semibold text-sm border-b-2 tracking-wide transition-colors flex items-center gap-2 ${
              activeTab === "returns"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Retours en attente
            {returns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                {returns.length}
              </span>
            )}
          </button>
        </div>

        {/* Controls Panel */}
        <div className="flex bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de client ou numéro de devis..."
              className="pl-10 h-10 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm mt-4">Chargement en cours...</p>
          </div>
        ) : (
          <>
            {activeTab === "withdrawals" && (
              <div className="space-y-3">
                {filteredWithdrawals.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <Package className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-medium mt-4">Aucun retrait en attente</p>
                    <p className="text-slate-400 text-xs mt-1">Félicitations, tout est à jour !</p>
                  </div>
                ) : (
                  filteredWithdrawals.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDossier(item.id)}
                      className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-950 text-base truncate">
                            {item.client_name}
                          </h3>
                          {item.company_name && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">
                              {item.company_name}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Du {item.start_date} au {item.end_date}</span>
                          </div>
                          
                          {(item.client_phone || item.client_email) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span>{item.client_phone || item.client_email}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Contrat: {item.total_amount?.toFixed(2)}€ | Caution: {item.deposit_amount?.toFixed(2)}€</span>
                          </div>
                        </div>

                        {item.equipment_items && item.equipment_items.length > 0 && (
                          <div className="text-xs text-slate-500 bg-orange-50/50 border border-orange-100/50 rounded-lg p-2.5 mt-2 flex flex-wrap gap-x-3 gap-y-1 max-w-2xl">
                            <strong className="text-orange-900">Matériel lourd :</strong>
                            {item.equipment_items.slice(0, 4).map((eq, i) => (
                              <span key={i}>
                                • {eq.quantity || 1}x {eq.name || eq.equipment_name}
                              </span>
                            ))}
                            {item.equipment_items.length > 4 && <span>(+ {item.equipment_items.length - 4} autres...)</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs h-9 font-medium shadow-sm flex items-center gap-1">
                          Commencer retrait
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "returns" && (
              <div className="space-y-3">
                {filteredReturns.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <RefreshCw className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-medium mt-4">Aucun retour en attente</p>
                    <p className="text-slate-400 text-xs mt-1">Il n'y a pas de matériel à l'extérieur actuellement.</p>
                  </div>
                ) : (
                  filteredReturns.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDossier(item.id)}
                      className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-950 text-base truncate">
                            {item.client_name}
                          </h3>
                          {item.company_name && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">
                              {item.company_name}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Loué du {item.start_date} au {item.end_date}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 truncate">
                            <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Caution prise: {item.deposit_amount?.toFixed(2)}€ ({item.deposit_method || "N/A"})</span>
                          </div>
                        </div>

                        {item.equipment_items && item.equipment_items.length > 0 && (
                          <div className="text-xs text-slate-500 bg-purple-50/50 border border-purple-100/50 rounded-lg p-2.5 mt-2 flex flex-wrap gap-x-3 gap-y-1 max-w-2xl">
                            <strong className="text-purple-900">Articles à retourner :</strong>
                            {item.equipment_items.slice(0, 4).map((eq, i) => (
                              <span key={i}>
                                • {eq.quantity || 1}x {eq.name || eq.equipment_name}
                              </span>
                            ))}
                            {item.equipment_items.length > 4 && <span>(+ {item.equipment_items.length - 4} autres...)</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 font-medium shadow-sm flex items-center gap-1">
                          Enregistrer retour
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Dossier Modal for starting Withdrawal/Return flow */}
      {showDossier && selectedId && (
        <DossierModal
          open={showDossier}
          onClose={handleCloseDossier}
          reservationId={selectedId}
        />
      )}
    </div>
  );
}

export default RentalApp;
