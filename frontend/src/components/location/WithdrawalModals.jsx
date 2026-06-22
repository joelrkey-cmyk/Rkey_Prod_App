// Modals de retrait de matériel - Extraites de ReservationsViewIntegrated
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Check, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { calculateGuaranteeDeposit } from '../../utils/pdfGenerator';
import { generateWithdrawalPDF } from './withdrawalPdf';
import { API, axios } from './helpers';

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
  isLoading,
  generateWithdrawalSlipDocument,
  confirmWithdrawalStatus,
  onOpenSignaturePad,
}) {
  const [equipmentList, setEquipmentList] = useState([]);

  useEffect(() => {
    if (showWithdrawalSlipModal) {
      axios.get(`${API}/equipment`)
        .then(res => {
          setEquipmentList(res.data || []);
        })
        .catch(err => {
          console.error("Error fetching equipment in modal", err);
        });
    }
  }, [showWithdrawalSlipModal]);

  const getEquipmentName = (item) => {
    if (item.equipment_name) return item.equipment_name;
    if (item.name) return item.name;
    const found = equipmentList.find(e => e.id === item.equipment_id);
    return found ? found.name : `Matériel #${item.equipment_id || 'Inconnu'}`;
  };

  if (!showWithdrawalSlipModal || !currentReservationForSlip) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Bon de Retrait Matériel
          </h3>
          <p className="text-gray-600 text-sm mb-3">
            Le statut va être changé vers <strong>"Matériel retiré"</strong> pour :
          </p>
          
          {/* Coordonnées du client/entreprise */}
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="font-medium text-blue-900">
              {(() => {
                const client = clients.find(c => c.id === currentReservationForSlip.client_id);
                if (client && client.company_name) {
                  return client.company_name;
                }
                return currentReservationForSlip.client_name || 'Client';
              })()}
            </p>
            <p className="text-sm text-blue-700">
              Tel: {(() => {
                const client = clients.find(c => c.id === currentReservationForSlip.client_id);
                return client?.phone || 'N/A';
              })()}
            </p>
            <p className="text-sm text-blue-700">
              Email: {(() => {
                const client = clients.find(c => c.id === currentReservationForSlip.client_id);
                return client?.email || 'N/A';
              })()}
            </p>
          </div>
          
          {/* Liste du matériel à remettre */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Matériel à remettre au client
            </h4>
            <div className="space-y-2">
              {currentReservationForSlip.equipment_items && currentReservationForSlip.equipment_items.length > 0 ? (
                currentReservationForSlip.equipment_items.map((item, index) => {
                  const isValidated = validatedEquipment.includes(item.equipment_id);
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setValidatedEquipment(prev => {
                          if (prev.includes(item.equipment_id)) {
                            return prev.filter(id => id !== item.equipment_id);
                          } else {
                            return [...prev, item.equipment_id];
                          }
                        });
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isValidated 
                          ? 'bg-green-50 border-green-300 opacity-60' 
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      data-testid={`withdrawal-equipment-item-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isValidated ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {getEquipmentName(item)} (x{item.quantity || 1})
                        </span>
                        {isValidated && <span className="text-green-600 font-bold">✓</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 italic text-sm">Aucun équipement dans cette réservation</p>
              )}
            </div>
          </div>
          
          {/* Formulaire de retrait */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdrawal-person" className="text-sm font-medium">
                Nom et prénom de la personne qui retire *
              </Label>
              <Input
                id="withdrawal-person"
                type="text"
                placeholder="Ex: Jean Dupont"
                defaultValue=""
                className="mt-1"
                data-testid="withdrawal-person-input"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="trusted-client"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                data-testid="trusted-client-checkbox"
                onChange={(e) => {
                  const depositInput = document.getElementById('deposit-amount');
                  const paymentSelect = document.getElementById('payment-method');
                  if (e.target.checked) {
                    depositInput.value = '0';
                    depositInput.disabled = true;
                    paymentSelect.value = 'n/a';
                    paymentSelect.disabled = true;
                  } else {
                    depositInput.disabled = false;
                    paymentSelect.disabled = false;
                    paymentSelect.value = 'especes';
                    const calculatedDeposit = calculateGuaranteeDeposit(currentReservationForSlip.equipment_items || []);
                    depositInput.value = calculatedDeposit.toFixed(2);
                  }
                }}
              />
              <Label htmlFor="trusted-client" className="text-sm font-medium cursor-pointer">
                Client de confiance (pas de caution)
              </Label>
            </div>
            
            <div>
              <Label htmlFor="deposit-amount" className="text-sm font-medium">
                Montant de la caution (€)
              </Label>
              <Input
                id="deposit-amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={calculateGuaranteeDeposit(currentReservationForSlip.equipment_items || []).toFixed(2)}
                className="mt-1"
                data-testid="deposit-amount-input"
              />
            </div>
            
            <div>
              <Label htmlFor="payment-method" className="text-sm font-medium">
                Moyen de paiement de la caution
              </Label>
              <select
                id="payment-method"
                className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                data-testid="payment-method-select"
              >
                <option value="n/a">N/A</option>
                <option value="especes">Espèces</option>
                <option value="cb">CB</option>
                <option value="cheque">Chèque</option>
                <option value="virement">Virement</option>
              </select>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="mt-6 space-y-2">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white" 
              disabled={isLoading}
              onClick={generateWithdrawalSlipDocument}
              data-testid="print-documents-btn"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer les documents
            </Button>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={isLoading}
              onClick={() => {
                const withdrawalPerson = document.getElementById('withdrawal-person')?.value || '';
                if (!withdrawalPerson.trim()) {
                  toast.error('Veuillez entrer le nom de la personne qui retire le matériel avant de signer');
                  return;
                }
                onOpenSignaturePad();
              }}
              data-testid="sign-document-btn"
            >
              Signer le document
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              disabled={isLoading}
              onClick={confirmWithdrawalStatus}
              data-testid="accept-no-docs-btn"
            >
              <Check className="w-4 h-4 mr-2" />
              Accepter sans générer de documents
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            variant="destructive" 
            onClick={() => {
              setShowWithdrawalSlipModal(false);
              setCurrentReservationForSlip(null);
              setValidatedEquipment([]);
            }}
            className="flex-1"
            disabled={isLoading}
            data-testid="cancel-withdrawal-btn"
          >
            Annuler
          </Button>
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
