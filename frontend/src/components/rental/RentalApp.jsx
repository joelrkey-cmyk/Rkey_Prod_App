import React, { useState, useEffect } from "react";
import { Package, Handshake, AlertTriangle, RefreshCw, Search, Phone, Mail, Calendar, DollarSign, ChevronRight, Check } from "lucide-react";
import axios from "../../services/axiosConfig";
import { Toaster } from "../ui/sonner";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import DossierModal from "../location/DossierModal";
import DisputesView from "./DisputesView";
import { WithdrawalSlipModal, WithdrawalSignatureModal } from "../location/WithdrawalModals";
import { generateWithdrawalSlip, calculateGuaranteeDeposit } from "../../utils/pdfGenerator";

import API_BASE_URL from "../../utils/apiUrl";
const API = `${API_BASE_URL}/api`;

// Beautiful Return Registration Modal
function ReturnSlipModal({
  open,
  onClose,
  reservation,
  checklist,
  setChecklist,
  returnedBy,
  setReturnedBy,
  onSubmit,
  isLoading
}) {
  if (!open || !reservation) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Enregistrer le Retour Matériel
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Enregistrement du retour pour <strong>{reservation.client_name}</strong> ({reservation.quote_number || 'N/A'})
          </p>
        </div>

        {/* Checklist */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 capitalize">Vérification du matériel retourné</p>
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setChecklist(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it));
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  item.checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-purple-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                }`}>
                  {item.checked && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.equipment_name || item.name}</p>
                  <p className="text-xs text-slate-400">Qté attendue: {item.quantity}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Handled By Form */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Responsable de la réception / vérification *</label>
          <Input
            value={returnedBy}
            onChange={(e) => setReturnedBy(e.target.value)}
            placeholder="Nom du technicien ou prénom"
            className="h-10 text-sm border-slate-200"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-11 text-sm border-slate-200 rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            className="flex-1 h-11 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm"
            onClick={onSubmit}
            disabled={isLoading || !returnedBy.trim()}
          >
            {isLoading ? 'Enregistrement...' : 'Valider le retour'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RentalApp() {
  const [activeTab, setActiveTab] = useState("withdrawals"); // withdrawals, returns, disputes
  const [withdrawals, setWithdrawals] = useState([]);
  const [returns, setReturns] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Modal tracking
  const [selectedId, setSelectedId] = useState(null);
  const [showDossier, setShowDossier] = useState(false);

  // States for withdrawal slip & signature flow (matching ReservationsViewIntegrated)
  const [showWithdrawalSlipModal, setShowWithdrawalSlipModal] = useState(false);
  const [showWithdrawalSignaturePad, setShowWithdrawalSignaturePad] = useState(false);
  const [currentReservationForSlip, setCurrentReservationForSlip] = useState(null);
  const [validatedEquipment, setValidatedEquipment] = useState([]);
  const [withdrawalSignaturePadRef, setWithdrawalSignaturePadRef] = useState(null);
  const [withdrawalSignature, setWithdrawalSignature] = useState(null);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // States for return flow
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [currentReturnReservation, setCurrentReturnReservation] = useState(null);
  const [returnChecklist, setReturnChecklist] = useState([]);
  const [returnWfId, setReturnWfId] = useState(null);
  const [returnedBy, setReturnedBy] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/location/clients`);
      setClients(res.data || []);
    } catch (e) {
      console.error("Error fetching clients", e);
    }
  };

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

  // Start withdrawal slips flow
  const handleStartWithdrawal = (e, item) => {
    e.stopPropagation();
    setCurrentReservationForSlip(item);
    setValidatedEquipment([]);
    setShowWithdrawalSlipModal(true);
  };

  // Confirm changes to "equipment_withdrawn" status (without signature)
  const confirmWithdrawalStatus = async () => {
    if (!currentReservationForSlip) return;

    try {
      setIsLoading(true);
      
      const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
      const depositAmount = parseFloat(document.getElementById('deposit-amount')?.value || 0);
      const paymentMethod = document.getElementById('payment-method')?.value || 'especes';
      const isTrustedClient = document.getElementById('trusted-client')?.checked || false;
      
      if (!withdrawalPerson.trim()) {
        toast.error('Veuillez entrer le nom de la personne qui retire le matériel');
        setIsLoading(false);
        return;
      }
      
      const withdrawalData = {
        status: 'equipment_withdrawn',
        withdrawal_person: withdrawalPerson,
        deposit_amount: depositAmount,
        deposit_payment_method: paymentMethod,
        is_trusted_client: isTrustedClient
      };
      
      await axios.put(`${API}/location/reservations/${currentReservationForSlip.id}/change-status`, withdrawalData);
      toast.success('Statut changé vers "Matériel retiré"');
      
      setShowWithdrawalSlipModal(false);
      setCurrentReservationForSlip(null);
      setValidatedEquipment([]);
      
      await fetchData();
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

  // Generate Withdrawal slip document PDF
  const generateWithdrawalSlipDocument = () => {
    if (!currentReservationForSlip) return;

    try {
      let equipmentDayTotal = 0;
      
      const reservationData = {
        id: currentReservationForSlip.id,
        clientName: currentReservationForSlip.client_name || 'N/A',
        clientEmail: currentReservationForSlip.client_email || 'N/A',
        clientPhone: currentReservationForSlip.client_phone || 'N/A',
        endDate: currentReservationForSlip.end_date,
        items: (currentReservationForSlip.equipment_items || currentReservationForSlip.items)?.map(item => {
          const dailyPrice = item.daily_price || item.equipment?.daily_price || 0;
          equipmentDayTotal += (item.quantity || 1) * dailyPrice;
          return {
            name: item.equipment_name || item.equipment?.name || 'N/A',
            quantity: item.quantity || 1,
            price: dailyPrice,
            serialNumber: item.equipment_reference || item.equipment?.reference || 'N/A'
          };
        }) || []
      };

      const guaranteeAmount = calculateGuaranteeDeposit(equipmentDayTotal);
      const doc = generateWithdrawalSlip(reservationData);
      doc.save(`Bon_Retrait_${currentReservationForSlip.id}.pdf`);
      
      toast.success(`Bon de retrait généré ! Dépôt de garantie: ${guaranteeAmount}€`);
      confirmWithdrawalStatus();
    } catch (error) {
      console.error('Error generating withdrawal slip:', error);
      toast.error('Erreur lors de la génération du bon de retrait');
    }
  };

  // Start return workflow
  const handleStartReturn = async (e, item) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/rental/workflows`, {
        reservation_id: item.id,
        type: 'return'
      });
      const wf = res.data;
      setReturnWfId(wf.id);
      
      const initialChecklist = (wf.checklist || []).map(checkItem => ({
        equipment_id: checkItem.equipment_id,
        equipment_name: checkItem.equipment_name || checkItem.name || 'Équipement',
        quantity: checkItem.quantity || 1,
        checked: checkItem.checked !== undefined ? checkItem.checked : true
      }));
      
      setReturnChecklist(initialChecklist);
      setCurrentReturnReservation(item);
      setReturnedBy("");
      setShowReturnModal(true);
    } catch (err) {
      console.error("Error initializing return workflow", err);
      toast.error("Erreur lors de l'initialisation du retour");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete return workflow
  const handleConfirmReturn = async () => {
    if (!returnWfId || !currentReturnReservation) return;
    if (!returnedBy.trim()) {
      toast.error("Veuillez indiquer le responsable de la réception");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API}/rental/returns/${returnWfId}/complete`, {
        return_checklist: returnChecklist,
        returned_by: returnedBy
      });
      
      toast.success("Retour enregistré avec succès !");
      setShowReturnModal(false);
      setCurrentReturnReservation(null);
      setReturnChecklist([]);
      setReturnWfId(null);
      setReturnedBy("");
      
      await fetchData();
    } catch (err) {
      console.error("Error completing return", err);
      toast.error("Erreur lors de la validation du retour");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter((item) =>
    (item.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.company_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.quote_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReturns = returns.filter((item) =>
    (item.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.company_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                            {item.company_name || item.client_name}
                          </h3>
                          {item.company_name && item.client_name && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">
                              {item.client_name}
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
                            <span>Contrat: {item.total_amount?.toFixed(2)}€ | Acompte: {item.deposit_amount?.toFixed(2)}€</span>
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
                        <Button 
                          onClick={(e) => handleStartWithdrawal(e, item)}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs h-9 font-medium shadow-sm flex items-center gap-1"
                        >
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
                            {item.company_name || item.client_name}
                          </h3>
                          {item.company_name && item.client_name && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">
                              {item.client_name}
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
                        <Button 
                          onClick={(e) => handleStartReturn(e, item)}
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 font-medium shadow-sm flex items-center gap-1"
                        >
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

      {/* Dossier Modal for read-only reservation details */}
      {showDossier && selectedId && (
        <DossierModal
          open={showDossier}
          onClose={handleCloseDossier}
          reservationId={selectedId}
        />
      )}

      {/* Interactive Withdrawal Bon de Retrait Modals */}
      {showWithdrawalSlipModal && currentReservationForSlip && (
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
      )}

      {showWithdrawalSignaturePad && currentReservationForSlip && (
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
          fetchReservations={fetchData}
        />
      )}

      {/* Interactive Return Slip Modal */}
      {showReturnModal && currentReturnReservation && (
        <ReturnSlipModal
          open={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setCurrentReturnReservation(null);
            setReturnChecklist([]);
            setReturnWfId(null);
          }}
          reservation={currentReturnReservation}
          checklist={returnChecklist}
          setChecklist={setReturnChecklist}
          returnedBy={returnedBy}
          setReturnedBy={setReturnedBy}
          onSubmit={handleConfirmReturn}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default RentalApp;
