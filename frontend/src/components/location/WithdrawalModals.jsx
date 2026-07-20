// Modals de retrait de matériel - Extraites de ReservationsViewIntegrated
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Check, FileText, Printer, ArrowLeft, ArrowRight, Camera, Trash2, Plus, AlertTriangle, Upload, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { calculateGuaranteeDeposit } from '../../utils/pdfGenerator';
import { generateWithdrawalPDF } from './withdrawalPdf';
import { API, axios, BACKEND_URL } from './helpers';

/**
 * Modal du bon de retrait — Formulaire pour enregistrer le retrait du matériel
 */
export function WithdrawalSlipModal({
  showWithdrawalSlipModal,
  setShowWithdrawalSlipModal,
  currentReservationForSlip,
  setCurrentReservationForSlip,
  validatedEquipment,
  setValidatedEquipment,
  clients,
  isLoading: isParentLoading,
  generateWithdrawalSlipDocument,
  confirmWithdrawalStatus,
  onOpenSignaturePad,
}) {
  const [step, setStep] = useState(1);
  const [workflow, setWorkflow] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Étape 1 : Liste du matériel & Packs
  const [checkedPackItems, setCheckedPackItems] = useState({});
  const [addedItems, setAddedItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  // Étape 2 : Photos & Justificatifs
  const [equipmentPhotos, setEquipmentPhotos] = useState([]);
  const [identityRecto, setIdentityRecto] = useState(null);
  const [identityVerso, setIdentityVerso] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Webcam Inline Capture
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamTarget, setWebcamTarget] = useState(null); // 'equipment', 'recto', 'verso'
  const videoRef = useRef(null);

  useEffect(() => {
    if (showWithdrawalSlipModal && currentReservationForSlip) {
      setStep(1);
      setAddedItems([]);
      setEquipmentPhotos([]);
      setIdentityRecto(null);
      setIdentityVerso(null);
      setCheckedPackItems({});
      stopWebcam();

      // Charger tous les équipements pour pouvoir identifier les packs et leurs contenus
      axios.get(`${API}/equipment`)
        .then(res => {
          setEquipmentList(res.data || []);
        })
        .catch(err => {
          console.error("Error fetching equipment in modal", err);
        });

      // Initialiser ou récupérer un workflow de location sur le serveur pour cette réservation
      setIsLoading(true);
      axios.post(`${BACKEND_URL}/api/rental/workflows`, {
        reservation_id: currentReservationForSlip.id,
        type: 'withdrawal'
      })
      .then(res => {
        if (res.data) {
          const wf = res.data;
          setWorkflow(wf);
          if (wf.added_items) setAddedItems(wf.added_items);
          if (wf.equipment_photos) setEquipmentPhotos(wf.equipment_photos);
          if (wf.identity_recto) setIdentityRecto(wf.identity_recto);
          if (wf.identity_verso) setIdentityVerso(wf.identity_verso);
          
          if (wf.checklist) {
            const validated = wf.checklist
              .filter(item => item.checked)
              .map(item => item.equipment_id);
            setValidatedEquipment(validated);
          }
        }
      })
      .catch(err => {
        console.warn("Failed to fetch or create rental workflow, continuing locally:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [showWithdrawalSlipModal, currentReservationForSlip]);

  const getEquipmentName = (item) => {
    if (item.equipment_name) return item.equipment_name;
    if (item.name) return item.name;
    const found = equipmentList.find(e => e.id === item.equipment_id);
    return found ? found.name : `Matériel #${item.equipment_id || 'Inconnu'}`;
  };

  // Résoudre les composants d'un pack d'équipement
  const getPackItems = (item) => {
    const found = equipmentList.find(e => e.id === item.equipment_id);
    if (found && found.is_pack && found.pack_items && found.pack_items.length > 0) {
      return found.pack_items;
    }
    return null;
  };

  const toggleItemCheck = (equipmentId) => {
    setValidatedEquipment(prev => {
      const isChecked = prev.includes(equipmentId);
      let next = [];
      if (isChecked) {
        next = prev.filter(id => id !== equipmentId);
      } else {
        next = [...prev, equipmentId];
      }
      
      // Mettre à jour automatiquement tous les sous-articles du pack
      const eqDetails = equipmentList.find(e => e.id === equipmentId);
      if (eqDetails && eqDetails.is_pack && eqDetails.pack_items) {
        const nextCheckedPackItems = { ...checkedPackItems };
        eqDetails.pack_items.forEach(sub => {
          nextCheckedPackItems[`${equipmentId}_${sub.equipment_id}`] = !isChecked;
        });
        setCheckedPackItems(nextCheckedPackItems);
      }
      
      return next;
    });
  };

  const togglePackSubItemCheck = (parentId, subId) => {
    const key = `${parentId}_${subId}`;
    setCheckedPackItems(prev => {
      const nextChecked = { ...prev, [key]: !prev[key] };
      
      // Si tous les sous-articles du pack sont cochés, on coche aussi le parent
      const parentItem = currentReservationForSlip.equipment_items?.find(item => item.equipment_id === parentId);
      if (parentItem) {
        const eqDetails = equipmentList.find(e => e.id === parentId);
        if (eqDetails && eqDetails.is_pack && eqDetails.pack_items) {
          const allSubItemsChecked = eqDetails.pack_items.every(sub => nextChecked[`${parentId}_${sub.equipment_id}`]);
          
          setValidatedEquipment(prevValidated => {
            if (allSubItemsChecked && !prevValidated.includes(parentId)) {
              return [...prevValidated, parentId];
            } else if (!allSubItemsChecked && prevValidated.includes(parentId)) {
              return prevValidated.filter(id => id !== parentId);
            }
            return prevValidated;
          });
        }
      }
      
      return nextChecked;
    });
  };

  // Équipements supplémentaires hors devis
  const handleAddCustomItem = () => {
    if (!newItemName.trim()) {
      toast.error("Veuillez entrer un nom d'équipement");
      return;
    }
    const newItem = {
      id: `custom_${Date.now()}`,
      name: newItemName,
      quantity: newItemQty,
      checked: true
    };
    setAddedItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    toast.success("Équipement supplémentaire ajouté");
  };

  const handleToggleAddedItem = (id) => {
    setAddedItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleRemoveAddedItem = (id) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
  };

  // Upload de médias sur GCS via l'endpoint de l'application
  const handleFileUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploading(true);
      const res = await axios.post(`${BACKEND_URL}/api/public/upload/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data && res.data.url) {
        if (type === 'recto') {
          setIdentityRecto(res.data.url);
        } else if (type === 'verso') {
          setIdentityVerso(res.data.url);
        } else {
          setEquipmentPhotos(prev => [...prev, { url: res.data.url, comments: '' }]);
        }
        toast.success('Image importée avec succès');
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du transfert de la photo");
    } finally {
      setIsUploading(false);
    }
  };

  // Webcam Capture Logic
  const startWebcam = async (target) => {
    setWebcamTarget(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'accéder à l'appareil photo/webcam.");
    }
  };

  const triggerFileInput = (target) => {
    let inputId = '';
    if (target === 'equipment') inputId = 'file-upload-equipment';
    else if (target === 'recto') inputId = 'file-upload-recto';
    else if (target === 'verso') inputId = 'file-upload-verso';
    
    if (inputId) {
      document.getElementById(inputId)?.click();
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setWebcamTarget(null);
  };

  const captureWebcamPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
          await handleFileUpload(file, webcamTarget);
          stopWebcam();
        }
      }, 'image/jpeg', 0.85);
    }
  };

  // Sauvegarde globale de l'état du workflow sur la base de données
  const saveWorkflow = async () => {
    if (workflow?.id) {
      try {
        const depositAmountInput = document.getElementById('deposit-amount');
        const paymentMethodSelect = document.getElementById('payment-method');
        const trustedClientCheckbox = document.getElementById('trusted-client');

        const checklist = (currentReservationForSlip.equipment_items || []).map(item => ({
          equipment_id: item.equipment_id,
          equipment_name: getEquipmentName(item),
          quantity: item.quantity || 1,
          checked: validatedEquipment.includes(item.equipment_id)
        }));

        await axios.put(`${BACKEND_URL}/api/rental/workflows/${workflow.id}`, {
          checklist,
          added_items: addedItems,
          equipment_photos: equipmentPhotos,
          identity_recto: identityRecto,
          identity_verso: identityVerso,
          deposit_amount: depositAmountInput ? parseFloat(depositAmountInput.value || 0) : 0,
          deposit_method: paymentMethodSelect ? paymentMethodSelect.value : 'especes',
          is_trusted_client: trustedClientCheckbox ? trustedClientCheckbox.checked : false,
          current_step: step
        });
      } catch (err) {
        console.error("Error saving workflow state:", err);
      }
    }
  };

  const handlePreSignature = async () => {
    const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
    if (!withdrawalPerson.trim()) {
      toast.error('Veuillez entrer le nom de la personne qui retire le matériel avant de signer');
      return;
    }
    await saveWorkflow();
    onOpenSignaturePad();
  };

  const handlePreConfirm = async () => {
    const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
    if (!withdrawalPerson.trim()) {
      toast.error('Veuillez entrer le nom de la personne qui retire le matériel');
      return;
    }
    await saveWorkflow();
    confirmWithdrawalStatus();
  };

  const handlePrePrint = async () => {
    await saveWorkflow();
    generateWithdrawalSlipDocument();
  };

  const isAllEquipmentChecked = () => {
    const reservationItems = currentReservationForSlip.equipment_items || [];
    const allReservationsChecked = reservationItems.every(item => validatedEquipment.includes(item.equipment_id));
    const allAddedChecked = addedItems.every(item => item.checked);
    return allReservationsChecked && allAddedChecked;
  };

  const renderEquipmentItem = (item, index) => {
    const isValidated = validatedEquipment.includes(item.equipment_id);
    const packItems = getPackItems(item);
    const isPack = !!packItems;
    
    return (
      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
        {/* En-tête de l'équipement */}
        <div 
          onClick={() => toggleItemCheck(item.equipment_id)}
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${
            isValidated 
              ? 'bg-green-50 border-green-200 text-green-900' 
              : 'bg-white border-gray-150 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
              isValidated ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
            }`}>
              {isValidated && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
            <div>
              <p className={`font-semibold ${isValidated ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {getEquipmentName(item)}
              </p>
              <p className="text-xs text-gray-400">Quantité: {item.quantity || 1}</p>
            </div>
          </div>
          {isPack && (
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-0.5 rounded-full">
              Pack ({packItems.length} articles)
            </span>
          )}
        </div>
        
        {/* Composition du pack (le cas échéant) */}
        {isPack && (
          <div className="pl-6 border-l-2 border-purple-100 space-y-2 mt-2">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
              Contenu du pack à vérifier :
            </p>
            {packItems.map((sub, sIdx) => {
              const subId = sub.equipment_id;
              const subKey = `${item.equipment_id}_${subId}`;
              const isSubChecked = !!checkedPackItems[subKey] || isValidated;
              
              const subEqDetails = equipmentList.find(e => e.id === subId);
              const subName = subEqDetails ? subEqDetails.name : `Matériel #${subId}`;
              
              return (
                <div
                  key={sIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePackSubItemCheck(item.equipment_id, subId);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isSubChecked 
                      ? 'bg-purple-50/70 border-purple-200 text-purple-900' 
                      : 'bg-white border-gray-100 hover:border-purple-200 hover:bg-purple-50/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSubChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {isSubChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`text-sm ${isSubChecked ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {subName}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    x{(sub.quantity || 1) * (item.quantity || 1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!showWithdrawalSlipModal || !currentReservationForSlip) return null;

  // Calcul du dépôt de caution fixé dans le devis ou par défaut
  const initialCautionAmount = (() => {
    if (currentReservationForSlip.guarantee_amount !== undefined && currentReservationForSlip.guarantee_amount !== null) {
      return currentReservationForSlip.guarantee_amount;
    }
    return calculateGuaranteeDeposit(currentReservationForSlip.equipment_items || []);
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col my-8 max-h-[90vh]">
        
        {/* En-tête avec barre d'étapes */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Bon de Retrait Matériel</span>
                <span className="text-sm font-normal text-gray-500">
                  ({currentReservationForSlip.quote_number || "Réf: " + currentReservationForSlip.id.substring(0, 8)})
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Client : <strong className="text-gray-700">{currentReservationForSlip.client_name || 'Client'}</strong>
              </p>
            </div>
            <button 
              onClick={() => {
                setShowWithdrawalSlipModal(false);
                setCurrentReservationForSlip(null);
                setValidatedEquipment([]);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stepper graphique */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: 'Matériel' },
              { num: 2, label: 'Photos & Justificatif' },
              { num: 3, label: 'Validation' }
            ].map((s) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                    step === s.num 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-4 ring-blue-50' 
                      : step > s.num 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${
                    step === s.num ? 'text-blue-600' : step > s.num ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {s.num < 3 && <div className={`h-1 flex-1 rounded-full ${step > s.num ? 'bg-green-600' : 'bg-gray-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Contenu principal défilant */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Étape 1 : Liste du matériel */}
          <div className={step === 1 ? "space-y-4" : "hidden"}>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-950 text-sm">Vérification de la commande</h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  Cochez chaque article ou détail de pack lors de sa remise en main propre.
                </p>
              </div>
            </div>

            {/* Liste principale */}
            <div className="space-y-3">
              {currentReservationForSlip.equipment_items && currentReservationForSlip.equipment_items.length > 0 ? (
                currentReservationForSlip.equipment_items.map((item, index) => renderEquipmentItem(item, index))
              ) : (
                <p className="text-center text-gray-500 italic py-4 text-sm bg-gray-50 rounded-xl">
                  Aucun équipement de base trouvé dans cette réservation.
                </p>
              )}

              {/* Liste des équipements ajoutés en cours de route */}
              {addedItems.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Équipements supplémentaires ajoutés au comptoir
                  </h4>
                  {addedItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                        item.checked 
                          ? 'bg-green-50/50 border-green-200' 
                          : 'bg-white border-gray-150'
                      }`}
                    >
                      <div 
                        onClick={() => handleToggleAddedItem(item.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          item.checked ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-400">Quantité supplémentaire: {item.quantity}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveAddedItem(item.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ajout d'un équipement supplémentaire */}
            <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Ajouter un matériel supplémentaire</span>
              </h5>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  type="text"
                  placeholder="Ex: Rallonge blanche, multiprise, adaptateur..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 text-sm bg-white"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center text-sm bg-white"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCustomItem} 
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Étape 2 : Photos & Pièce d'identité */}
          <div className={step === 2 ? "space-y-6" : "hidden"}>
            
            {/* Webcam Stream Active View */}
            {webcamStream && (
              <div className="bg-slate-950 rounded-2xl p-4 text-center border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-cover rounded-xl bg-black mx-auto" />
                <div className="flex justify-center gap-3">
                  <Button onClick={captureWebcamPhoto} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Camera className="w-4 h-4 mr-1.5" /> Prendre la photo
                  </Button>
                  <Button variant="secondary" onClick={stopWebcam} className="bg-white/20 hover:bg-white/30 text-white border-0">
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {/* Photos du matériel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-sm">Photos du matériel (État au retrait)</h4>
                <div className="flex gap-2">
                  <input
                    id="file-upload-equipment"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'equipment');
                    }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => startWebcam('equipment')}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Camera className="w-3.5 h-3.5" /> Webcam
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => triggerFileInput('equipment')}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importer
                  </Button>
                </div>
              </div>

              {/* Grille des photos */}
              {equipmentPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {equipmentPhotos.map((photo, index) => (
                    <div key={index} className="flex flex-col border border-gray-150 rounded-xl overflow-hidden bg-gray-50/50 shadow-sm">
                      <div className="relative h-32 bg-black flex items-center justify-center">
                        <img src={photo.url} alt={`Matériel ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => setEquipmentPhotos(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-white flex-1">
                        <input
                          type="text"
                          placeholder="Ajouter un commentaire ou remarque..."
                          value={photo.comments || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEquipmentPhotos(prev => prev.map((p, i) => i === index ? { ...p, comments: val } : p));
                          }}
                          className="w-full text-xs border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  onClick={() => triggerFileInput('equipment')}
                  className="border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all"
                >
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Prendre en photo l'état du matériel</p>
                  <p className="text-xs text-gray-400 mt-1">Recommandé pour prouver l'état initial des équipements</p>
                </div>
              )}
            </div>

            {/* Pièce d'identité */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="font-bold text-gray-900 text-sm">Pièce d'identité du client</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Recto */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">RECTO (Face avant)</label>
                  <input
                    id="file-upload-recto"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'recto');
                    }}
                  />
                  {identityRecto ? (
                    <div className="relative border border-gray-200 rounded-xl overflow-hidden h-36 bg-gray-50 flex items-center justify-center">
                      <img src={identityRecto} alt="Identity Recto" className="h-full w-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          onClick={() => setIdentityRecto(null)}
                          className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50 flex flex-col justify-center items-center h-36">
                      <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                      <span className="text-xs font-medium text-gray-600 mb-2">Pièce d'identité - Recto</span>
                      <div className="flex gap-1.5">
                        <Button size="xs" variant="outline" onClick={() => startWebcam('recto')} className="text-[10px] h-7 px-2">
                          Camera
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => triggerFileInput('recto')} className="text-[10px] h-7 px-2">
                          Fichier
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verso */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">VERSO (Face arrière)</label>
                  <input
                    id="file-upload-verso"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'verso');
                    }}
                  />
                  {identityVerso ? (
                    <div className="relative border border-gray-200 rounded-xl overflow-hidden h-36 bg-gray-50 flex items-center justify-center">
                      <img src={identityVerso} alt="Identity Verso" className="h-full w-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          onClick={() => setIdentityVerso(null)}
                          className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50 flex flex-col justify-center items-center h-36">
                      <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                      <span className="text-xs font-medium text-gray-600 mb-2">Pièce d'identité - Verso</span>
                      <div className="flex gap-1.5">
                        <Button size="xs" variant="outline" onClick={() => startWebcam('verso')} className="text-[10px] h-7 px-2">
                          Camera
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => triggerFileInput('verso')} className="text-[10px] h-7 px-2">
                          Fichier
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Étape 3 : Signature & Caution */}
          {/* Toujours rendu dans le DOM pour que les scripts externes / signatures accèdent aux inputs via ID */}
          <div className={step === 3 ? "space-y-5" : "hidden"}>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 items-start">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-950 text-sm">Prêt pour la validation</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Veuillez finaliser les informations financières de garantie et faire signer le bon.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="withdrawal-person" className="text-sm font-semibold text-gray-700">
                  Nom et prénom de la personne qui retire *
                </Label>
                <Input
                  id="withdrawal-person"
                  type="text"
                  placeholder="Ex: Jean Dupont"
                  defaultValue={currentReservationForSlip.client_name || ''}
                  className="mt-1"
                  data-testid="withdrawal-person-input"
                />
              </div>
              
              <div className="flex items-center space-x-2.5 p-3 bg-gray-50 rounded-xl border border-gray-150">
                <input
                  type="checkbox"
                  id="trusted-client"
                  className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  data-testid="trusted-client-checkbox"
                  onChange={(e) => {
                    const depositInput = document.getElementById('deposit-amount');
                    const paymentSelect = document.getElementById('payment-method');
                    if (e.target.checked) {
                      if (depositInput) {
                        depositInput.value = '0';
                        depositInput.disabled = true;
                      }
                      if (paymentSelect) {
                        paymentSelect.value = 'n/a';
                        paymentSelect.disabled = true;
                      }
                    } else {
                      if (depositInput) {
                        depositInput.disabled = false;
                        depositInput.value = initialCautionAmount.toFixed(2);
                      }
                      if (paymentSelect) {
                        paymentSelect.disabled = false;
                        paymentSelect.value = 'especes';
                      }
                    }
                  }}
                />
                <Label htmlFor="trusted-client" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
                  Client de confiance (pas de caution)
                </Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deposit-amount" className="text-sm font-semibold text-gray-700">
                    Montant de la caution (€)
                  </Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={initialCautionAmount.toFixed(2)}
                    className="mt-1 font-mono"
                    data-testid="deposit-amount-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="payment-method" className="text-sm font-semibold text-gray-700">
                    Moyen de paiement de la caution
                  </Label>
                  <select
                    id="payment-method"
                    className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    data-testid="payment-method-select"
                  >
                    <option value="especes">Espèces</option>
                    <option value="cb">CB</option>
                    <option value="cheque">Chèque</option>
                    <option value="virement">Virement</option>
                    <option value="n/a">N/A</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Boutons de validation finale */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md py-2.5 rounded-xl transition-all" 
                disabled={isParentLoading || isUploading}
                onClick={handlePrePrint}
                data-testid="print-documents-btn"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer les documents
              </Button>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md py-2.5 rounded-xl transition-all" 
                disabled={isParentLoading || isUploading}
                onClick={handlePreSignature}
                data-testid="sign-document-btn"
              >
                <Camera className="w-4 h-4 mr-2" />
                Signer le document
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-gray-300 hover:bg-gray-50 py-2.5 rounded-xl text-gray-700 font-semibold" 
                disabled={isParentLoading || isUploading}
                onClick={handlePreConfirm}
                data-testid="accept-no-docs-btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Accepter sans générer de documents
              </Button>
            </div>
          </div>

          {/* Indicateur de chargement global de l'upload d'images */}
          {isUploading && (
            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Envoi en cours sur Google Cloud Storage...</span>
            </div>
          )}
        </div>

        {/* Pied de page du wizard */}
        <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(prev => prev - 1)}
                disabled={isParentLoading || isUploading}
                className="border-gray-300 text-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => {
                stopWebcam();
                setShowWithdrawalSlipModal(false);
                setCurrentReservationForSlip(null);
                setValidatedEquipment([]);
              }}
              disabled={isParentLoading || isUploading}
              data-testid="cancel-withdrawal-btn"
            >
              Annuler
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={async () => {
                  // Sauvegarder d'abord pour garder la trace de la check-list et des photos
                  setIsLoading(true);
                  await saveWorkflow();
                  setIsLoading(false);
                  
                  if (step === 1 && !isAllEquipmentChecked()) {
                    toast.warning("Certains articles ou pièces d'équipements n'ont pas encore été validés.");
                  }
                  setStep(prev => prev + 1);
                }}
                disabled={isParentLoading || isUploading}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                Suivant <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Modal de signature numérique du bon de retrait
 */
export function WithdrawalSignatureModal({
  showWithdrawalSignaturePad,
  setShowWithdrawalSignaturePad,
  withdrawalSignaturePadRef,
  setWithdrawalSignaturePadRef,
  setWithdrawalSignature,
  currentReservationForSlip,
  setShowWithdrawalSlipModal,
  setCurrentReservationForSlip,
  setValidatedEquipment,
  isLoading,
  setIsLoading,
  fetchReservations,
}) {
  if (!showWithdrawalSignaturePad) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Signature du Bon de Retrait</h3>
        <p className="text-gray-600 text-sm mb-4">
          Veuillez signer dans la zone ci-dessous avec votre doigt ou stylet
        </p>
        
        {/* Zone de signature */}
        <div className="border-2 border-gray-300 rounded-lg mb-4 bg-white">
          <canvas
            ref={(canvas) => {
              if (canvas && !withdrawalSignaturePadRef) {
                setWithdrawalSignaturePadRef(canvas);
                const ctx = canvas.getContext('2d');
                canvas.width = 700;
                canvas.height = 300;
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                let isDrawing = false;
                let lastX = 0;
                let lastY = 0;
                
                canvas.addEventListener('mousedown', (e) => {
                  isDrawing = true;
                  const rect = canvas.getBoundingClientRect();
                  lastX = e.clientX - rect.left;
                  lastY = e.clientY - rect.top;
                });
                
                canvas.addEventListener('mousemove', (e) => {
                  if (!isDrawing) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.beginPath();
                  ctx.moveTo(lastX, lastY);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  lastX = x;
                  lastY = y;
                });
                
                canvas.addEventListener('mouseup', () => { isDrawing = false; });
                canvas.addEventListener('mouseleave', () => { isDrawing = false; });
                
                canvas.addEventListener('touchstart', (e) => {
                  e.preventDefault();
                  isDrawing = true;
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  lastX = touch.clientX - rect.left;
                  lastY = touch.clientY - rect.top;
                });
                
                canvas.addEventListener('touchmove', (e) => {
                  e.preventDefault();
                  if (!isDrawing) return;
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = touch.clientX - rect.left;
                  const y = touch.clientY - rect.top;
                  ctx.beginPath();
                  ctx.moveTo(lastX, lastY);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  lastX = x;
                  lastY = y;
                });
                
                canvas.addEventListener('touchend', () => { isDrawing = false; });
              }
            }}
            className="w-full touch-none"
            style={{ touchAction: 'none' }}
            data-testid="signature-canvas"
          />
        </div>
        
        {/* Boutons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (withdrawalSignaturePadRef) {
                const ctx = withdrawalSignaturePadRef.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, withdrawalSignaturePadRef.width, withdrawalSignaturePadRef.height);
              }
            }}
            className="flex-1"
            data-testid="clear-signature-btn"
          >
            Effacer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowWithdrawalSignaturePad(false);
              setWithdrawalSignature(null);
            }}
            className="flex-1"
            data-testid="cancel-signature-btn"
          >
            Annuler
          </Button>
          <Button
            onClick={async () => {
              if (withdrawalSignaturePadRef) {
                const signatureData = withdrawalSignaturePadRef.toDataURL('image/png');
                setWithdrawalSignature(signatureData);
                toast.success("Signature enregistrée !");
                setShowWithdrawalSignaturePad(false);
                
                try {
                  setIsLoading(true);
                  
                  const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
                  const depositAmount = parseFloat(document.getElementById('deposit-amount')?.value || 0);
                  const paymentMethod = document.getElementById('payment-method')?.value || 'especes';
                  const isTrustedClient = document.getElementById('trusted-client')?.checked || false;
                  
                  const withdrawalData = {
                    status: 'equipment_withdrawn',
                    withdrawal_person: withdrawalPerson,
                    deposit_amount: depositAmount,
                    deposit_payment_method: paymentMethod,
                    is_trusted_client: isTrustedClient,
                    withdrawal_signature: signatureData
                  };
                  
                  await axios.put(`${API}/reservations/${currentReservationForSlip.id}/change-status`, withdrawalData);
                  toast.success('Matériel retiré avec signature enregistrée !');
                  
                  setShowWithdrawalSlipModal(false);
                  setCurrentReservationForSlip(null);
                  setValidatedEquipment([]);
                  
                  await fetchReservations();
                } catch (error) {
                  console.error('Error saving withdrawal with signature:', error);
                  toast.error('Erreur lors de l\'enregistrement de la signature');
                } finally {
                  setIsLoading(false);
                }
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            data-testid="validate-signature-btn"
          >
            Valider la signature
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de consultation d'un bon de retrait existant
 */
export function WithdrawalViewModal({
  showWithdrawalViewModal,
  setShowWithdrawalViewModal,
  viewingWithdrawal,
  setViewingWithdrawal,
  clients,
}) {
  if (!showWithdrawalViewModal || !viewingWithdrawal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2" data-testid="withdrawal-view-title">
            Bon de Retrait - {(() => {
              const client = clients.find(c => c.id === viewingWithdrawal.client_id);
              if (client && client.company_name) {
                return client.company_name;
              }
              return viewingWithdrawal.client_name || 'Client';
            })()}
          </h3>
          
          {/* Informations de retrait */}
          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Informations de Retrait</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Personne qui a retiré :</span>
                  <p className="text-gray-900">{viewingWithdrawal.withdrawal_person || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date de retrait :</span>
                  <p className="text-gray-900">
                    {viewingWithdrawal.withdrawal_date 
                      ? new Date(viewingWithdrawal.withdrawal_date).toLocaleDateString('fr-FR', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                      : 'Non renseignée'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Montant de la caution :</span>
                  <p className="text-green-600 font-semibold text-lg">
                    {viewingWithdrawal.is_trusted_client 
                      ? '0,00€ (Client de confiance)' 
                      : `${(viewingWithdrawal.deposit_amount || 0).toFixed(2)}€`
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Moyen de paiement :</span>
                  <p className="text-gray-900">
                    {(() => {
                      const methods = {
                        'especes': 'Espèces',
                        'cb': 'CB',
                        'cheque': 'Chèque',
                        'virement': 'Virement'
                      };
                      return methods[viewingWithdrawal.deposit_payment_method] || 'Non renseigné';
                    })()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Liste du matériel retiré */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Matériel Retiré</h4>
              <div className="space-y-2">
                {viewingWithdrawal.equipment_items && viewingWithdrawal.equipment_items.length > 0 ? (
                  viewingWithdrawal.equipment_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <p className="font-medium text-gray-900">{item.equipment_name || 'Équipement'}</p>
                        <p className="text-sm text-gray-600">Réf: {item.reference || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Quantité: {item.quantity || 1}</p>
                        <p className="text-sm text-gray-600">{(item.daily_price || 0).toFixed(2)}€/jour</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">Aucun équipement</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total :</span>
                  <span className="font-bold text-lg text-green-600">
                    {(viewingWithdrawal.total_amount || 0).toFixed(2)}€
                  </span>
                </div>
              </div>
            </div>
            
            {/* Période de location */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Période de Location</h4>
              <p className="text-sm text-gray-700">
                Du <strong>{new Date(viewingWithdrawal.start_date).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(viewingWithdrawal.end_date).toLocaleDateString('fr-FR')}</strong>
              </p>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => generateWithdrawalPDF(viewingWithdrawal, clients)}
              data-testid="download-withdrawal-pdf-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Télécharger le PDF complet
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowWithdrawalViewModal(false);
                setViewingWithdrawal(null);
              }}
              data-testid="close-withdrawal-view-btn"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
