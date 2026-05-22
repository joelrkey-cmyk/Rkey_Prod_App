import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Camera, Shield, CreditCard, FileText, Search, Plus, Trash2, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { axios } from '../location/helpers';

import API_BASE_URL from '../../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
import { SignatureCanvas } from './SignatureCanvas';
import { PhotoCapture, IdentityCapture } from './PhotoCapture';
import { generateWithdrawalPDF } from '../location/withdrawalPdf';
import { getDefaultCGV } from '../location/withdrawalPdf';

const STEPS = [
  { num: 1, label: 'Reservation', icon: FileText },
  { num: 2, label: 'Materiel', icon: CheckCircle2 },
  { num: 3, label: 'Test', icon: Zap },
  { num: 4, label: 'Photos', icon: Camera },
  { num: 5, label: 'Identite', icon: Shield },
  { num: 6, label: 'Caution', icon: CreditCard },
  { num: 7, label: 'Validation', icon: FileText },
];

const StepHeader = ({ step, totalSteps, label, clientName, onBack }) => (
  <header className="bg-white border-b border-slate-200 px-4 py-3">
    <div className="flex items-center gap-3 mb-3">
      <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100">
        <ArrowLeft className="w-5 h-5 text-slate-600" />
      </button>
      <div className="flex-1">
        <h1 className="text-sm font-semibold text-slate-900">{label}</h1>
        {clientName && <p className="text-xs text-slate-500">{clientName}</p>}
      </div>
      <span className="text-xs text-slate-400 font-mono">{step}/{totalSteps}</span>
    </div>
    <div className="flex gap-1">
      {STEPS.map(s => (
        <div key={s.num} className={`h-1 flex-1 rounded-full transition-colors ${s.num <= step ? 'bg-slate-800' : 'bg-slate-200'}`} />
      ))}
    </div>
  </header>
);

const WithdrawalFlow = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [reservations, setReservations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [search, setSearch] = useState('');

  // Step 2: checklist
  const [checklist, setChecklist] = useState([]);
  const [lastMinuteItems, setLastMinuteItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  // Step 3: test
  const [testConfirmed, setTestConfirmed] = useState(false);

  // Step 4: photos + comments
  const [photos, setPhotos] = useState([]);
  const [photoComments, setPhotoComments] = useState({});

  // Step 5: identity
  const [identityRecto, setIdentityRecto] = useState(null);
  const [identityVerso, setIdentityVerso] = useState(null);

  // Step 6: caution
  const [depositMethod, setDepositMethod] = useState('especes');
  const [depositAmount, setDepositAmount] = useState('');
  const [isTrusted, setIsTrusted] = useState(false);

  // Step 7: validation
  const [globalReceived, setGlobalReceived] = useState(false);
  const [cgvText, setCgvText] = useState('');
  const [signature, setSignature] = useState(null);
  const [clientEmail, setClientEmail] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resRes, eqRes, clRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/location/reservations`),
        axios.get(`${BACKEND_URL}/api/location/equipment`),
        axios.get(`${BACKEND_URL}/api/location/clients`),
      ]);
      const activeReservations = (resRes.data || []).filter(
        r => r.status === 'accepted' && !r.is_archived && r.booking_type === 'client'
      );
      setReservations(activeReservations);
      setEquipment(eqRes.data || []);
      setClients(clRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const selectReservation = async (res) => {
    setSelectedReservation(res);
    const client = clients.find(c => c.id === res.client_id);
    if (client?.email) setClientEmail(client.email);

    // Build checklist
    const items = (res.equipment_items || []).map(item => {
      const eq = equipment.find(e => e.id === item.equipment_id);
      return {
        id: item.equipment_id || item.id,
        name: eq?.name || item.equipment_name || 'Equipement',
        reference: eq?.reference || item.reference || '',
        quantity: item.quantity || 1,
        checked: false,
        is_pack: eq?.is_pack || false,
        pack_items: eq?.pack_items ? eq.pack_items.map(p => {
          const subEq = equipment.find(e => e.id === p.equipment_id);
          return {
            equipment_id: p.equipment_id,
            name: subEq?.name || 'Sous-équipement',
            reference: subEq?.reference || '',
            quantity: p.quantity || 1,
            checked: false
          };
        }) : []
      };
    });
    setChecklist(items);

    // Fetch quote caution (guarantee) amount
    if (res.quote_id) {
      try {
        const { data: quote } = await axios.get(`${BACKEND_URL}/api/location/quotes/${res.quote_id}`);
        if (quote.guarantee_amount) setDepositAmount(String(quote.guarantee_amount));
      } catch (e) { console.error(e); }
    }

    // Fetch CGV
    try {
      const { data: cgvData } = await axios.get(`${BACKEND_URL}/api/location/settings/cgv`);
      setCgvText(cgvData.cgv || getDefaultCGV());
    } catch (e) {
      console.error(e);
      setCgvText(getDefaultCGV());
    }

    // Create workflow
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/rental/workflows`, {
        reservation_id: res.id,
        type: 'withdrawal',
      });
      setWorkflowId(data.id);
    } catch (e) {
      console.error(e);
    }
    setStep(2);
  };

  // Step 2 helpers
  const toggleCheck = (idx) => {
    setChecklist(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const nextChecked = !item.checked;
      return {
        ...item,
        checked: nextChecked,
        pack_items: item.pack_items 
          ? item.pack_items.map(pi => ({ ...pi, checked: nextChecked }))
          : []
      };
    }));
  };
  const toggleSubCheck = (packIdx, subIdx) => {
    setChecklist(prev => prev.map((item, i) => {
      if (i !== packIdx) return item;
      const updatedPackItems = item.pack_items.map((pi, sIdx) => 
        sIdx === subIdx ? { ...pi, checked: !pi.checked } : pi
      );
      const allSubChecked = updatedPackItems.every(pi => pi.checked);
      return {
        ...item,
        checked: allSubChecked,
        pack_items: updatedPackItems
      };
    }));
  };
  const checkAll = () => {
    const allChecked = checklist.every(i => i.checked) && lastMinuteItems.every(i => i.checked);
    setChecklist(prev => prev.map(i => {
      const nextChecked = !allChecked;
      return {
        ...i,
        checked: nextChecked,
        pack_items: i.pack_items ? i.pack_items.map(pi => ({ ...pi, checked: nextChecked })) : []
      };
    }));
    setLastMinuteItems(prev => prev.map(i => ({ ...i, checked: !allChecked })));
  };
  const addLastMinute = () => {
    if (!newItemName.trim()) return;
    setLastMinuteItems(prev => [...prev, { id: `lm-${Date.now()}`, name: newItemName.trim(), quantity: newItemQty, checked: false, isLastMinute: true }]);
    setNewItemName('');
    setNewItemQty(1);
  };
  const toggleLastMinute = (idx) => {
    setLastMinuteItems(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };
  const removeLastMinute = (idx) => {
    setLastMinuteItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Save workflow data and proceed
  const saveAndProceed = async (nextStep, extraData = {}) => {
    if (workflowId) {
      try {
        await axios.patch(`${BACKEND_URL}/api/rental/workflows/${workflowId}`, {
          checklist: [...checklist, ...lastMinuteItems],
          ...extraData,
        });
      } catch (e) {
        console.error(e);
      }
    }
    setStep(nextStep);
  };

  // Step 7: Finalize
  const handleFinalize = async () => {
    if (!globalReceived) return toast.error('Veuillez confirmer la reception du materiel');
    if (!signature) return toast.error('Veuillez signer');

    setIsFinalizing(true);
    try {
      const allItems = [...checklist, ...lastMinuteItems];
      const client = clients.find(c => c.id === selectedReservation.client_id);

      // Save signature + email data to workflow
      await axios.patch(`${BACKEND_URL}/api/rental/workflows/${workflowId}`, {
        withdrawal_signature: signature,
        cgv_signature: signature,
        status: 'equipment_withdrawn',
        withdrawal_date: new Date().toISOString(),
        withdrawal_person: client?.name || selectedReservation.client_name || '',
        deposit_payment_method: isTrusted ? 'n/a' : depositMethod,
        deposit_amount: isTrusted ? 0 : parseFloat(depositAmount) || 0,
        is_trusted_client: isTrusted,
        equipment_test_confirmed: testConfirmed,
      });

      // Update reservation status
      await axios.patch(`${BACKEND_URL}/api/location/reservations/${selectedReservation.id}/status`, {
        status: 'equipment_withdrawn',
      });

      // Generate PDF
      const withdrawalData = {
        ...selectedReservation,
        equipment_items: allItems,
        withdrawal_signature: signature,
        withdrawal_date: new Date().toISOString(),
        withdrawal_person: client?.name || selectedReservation.client_name || '',
        deposit_payment_method: isTrusted ? 'n/a' : depositMethod,
        deposit_amount: isTrusted ? 0 : parseFloat(depositAmount) || 0,
        is_trusted_client: isTrusted,
      };
      const pdfBase64 = await generateWithdrawalPDF(withdrawalData, clients);

      // Save PDF to workflow for dossier access
      if (pdfBase64) {
        try {
          await axios.patch(`${BACKEND_URL}/api/rental/workflows/${workflowId}`, {
            signed_pdf_base64: pdfBase64,
            signed_pdf_filename: `Bon_Retrait_${client?.name || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`,
            signed_pdf_date: new Date().toISOString(),
          });
        } catch (pdfSaveErr) {
          console.error('Erreur sauvegarde PDF dans dossier:', pdfSaveErr);
        }
      }

      // Send email with PDF
      if (clientEmail.trim()) {
        try {
          // Fetch email template from settings
          let emailSubject = `Bon de retrait - ${client?.name || selectedReservation.client_name || 'Client'}`;
          let emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><p>Bonjour,</p><p>Veuillez trouver ci-joint votre bon de retrait pour la location du matériel.</p><p>Cordialement,<br/><strong>R'KEY PROD</strong></p></div>`;
          try {
            const { data: tpl } = await axios.get(`${BACKEND_URL}/api/rental/settings/withdrawal-email`);
            if (tpl.subject) emailSubject = tpl.subject;
            if (tpl.body) emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">${tpl.body}</div>`;
          } catch (tplErr) { /* use defaults */ }

          const clientNameClean = (client?.name || 'Client').replace(/[^a-zA-Z0-9\u00C0-\u017F]/g, '').substring(0, 30);
          const dateClean = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
          const pdfName = `Bon_Retrait_${clientNameClean}_${dateClean}.pdf`;
          await axios.post(`${BACKEND_URL}/api/rental/workflows/${workflowId}/send-email`, {
            to: clientEmail.trim(),
            subject: emailSubject,
            body: emailBody,
            pdf_base64: pdfBase64 || '',
            pdf_filename: pdfName,
          });
          toast.success('Email envoye avec le PDF en piece jointe !');
        } catch (emailErr) {
          console.error(emailErr);
          toast.warning('Retrait valide, mais erreur envoi email');
        }
      }

      toast.success('Retrait finalise avec succes !');
      onBack();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsFinalizing(false);
    }
  };

  const clientName = selectedReservation
    ? (clients.find(c => c.id === selectedReservation.client_id)?.name || selectedReservation.client_name || '')
    : '';

  // ============================
  // STEP 1: Select Reservation
  // ============================
  if (step === 1) {
    const filtered = reservations.filter(r => {
      const name = (r.client_name || '').toLowerCase();
      return name.includes(search.toLowerCase());
    });
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-1">
        <StepHeader step={1} totalSteps={7} label="Choisir une reservation" onBack={onBack} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm"
              data-testid="search-reservation"
            />
          </div>
          {loading ? (
            <div className="text-center py-10 text-slate-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Aucune reservation disponible</div>
          ) : (
            filtered.map(r => {
              const cl = clients.find(c => c.id === r.client_id);
              return (
                <button
                  key={r.id}
                  onClick={() => selectReservation(r)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition-colors"
                  data-testid={`reservation-item-${r.id}`}
                >
                  <p className="font-medium text-slate-900">{cl?.name || r.client_name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(r.start_date).toLocaleDateString('fr-FR')} - {new Date(r.end_date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{(r.equipment_items || []).length} equipements</p>
                </button>
              );
            })
          )}
        </main>
      </div>
    );
  }

  // ============================
  // STEP 2: Material Checklist
  // ============================
  if (step === 2) {
    const allChecked = checklist.every(i => i.checked) && lastMinuteItems.every(i => i.checked);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-2">
        <StepHeader step={2} totalSteps={7} label="Preparation materiel" clientName={clientName} onBack={() => setStep(1)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-3">
          <button onClick={checkAll} className="text-xs text-slate-500 hover:text-slate-800 underline">
            {allChecked ? 'Tout decocher' : 'Tout cocher'}
          </button>
          {checklist.map((item, idx) => {
            const hasSubItems = item.pack_items && item.pack_items.length > 0;
            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`check-item-${idx}`}>
                {/* Main line */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(idx)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                    {item.reference && <p className="text-xs text-slate-400">Ref: {item.reference}</p>}
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">x{item.quantity}</span>
                </div>
                
                {/* Sub-items list with a small indent / arborescence style */}
                {hasSubItems && (
                  <div className="mt-3 pl-6 ml-2 border-l border-dashed border-slate-200 space-y-2">
                    {item.pack_items.map((subItem, sIdx) => (
                      <label key={sIdx} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={subItem.checked}
                          onChange={() => toggleSubCheck(idx, sIdx)}
                          className="w-4 h-4 rounded text-slate-705 border-slate-300 focus:ring-slate-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${subItem.checked ? 'text-slate-400 line-through' : 'text-slate-500'} font-medium truncate`}>{subItem.name}</p>
                          {subItem.reference && <p className="text-[10px] text-slate-400">Ref: {subItem.reference}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">x{subItem.quantity * item.quantity}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {lastMinuteItems.map((item, idx) => (
            <label key={item.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
              <input type="checkbox" checked={item.checked} onChange={() => toggleLastMinute(idx)} className="w-5 h-5 rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{item.name}</p>
                <p className="text-xs text-amber-500">Ajout derniere minute</p>
              </div>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">x{item.quantity}</span>
              <button onClick={(e) => { e.preventDefault(); removeLastMinute(idx); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </label>
          ))}
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-500 font-medium">Ajouter un equipement de derniere minute</p>
            <div className="flex gap-2">
              <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nom..." className="flex-1 text-sm border rounded-lg px-3 py-2" />
              <input type="number" value={newItemQty} onChange={e => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-sm text-center border rounded-lg px-2 py-2" min="1" />
              <Button onClick={addLastMinute} size="sm" className="bg-slate-800"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button onClick={() => saveAndProceed(3)} className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl" data-testid="to-step-3">
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 3: Material Test
  // ============================
  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-3">
        <StepHeader step={3} totalSteps={7} label="Test du materiel" clientName={clientName} onBack={() => setStep(2)} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Test du materiel</h2>
              <p className="text-sm text-slate-500 mt-2">
                Veuillez effectuer un test de fonctionnement de chaque equipement en presence du client.
              </p>
            </div>
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors" data-testid="test-confirm-checkbox">
              <input type="checkbox" checked={testConfirmed} onChange={() => setTestConfirmed(!testConfirmed)} className="w-5 h-5 rounded" />
              <span className="text-sm font-medium text-slate-800">Je confirme que le test du materiel a ete effectue</span>
            </label>
          </div>
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button onClick={() => setStep(4)} disabled={!testConfirmed} className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl disabled:opacity-50" data-testid="to-step-4">
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 4: Equipment Photos + Comments
  // ============================
  if (step === 4) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-4">
        <StepHeader step={4} totalSteps={7} label="Photos du materiel" clientName={clientName} onBack={() => setStep(3)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">
          <p className="text-sm text-slate-500">Photographiez l'etat du materiel et ajoutez un commentaire si necessaire.</p>
          <PhotoCapture
            photos={photos}
            onAdd={(photo) => {
              const newPhotos = [...photos, photo];
              setPhotos(newPhotos);
              setPhotoComments(prev => ({ ...prev, [newPhotos.length - 1]: '' }));
            }}
            onRemove={(idx) => {
              setPhotos(prev => prev.filter((_, i) => i !== idx));
              setPhotoComments(prev => {
                const updated = {};
                Object.keys(prev).forEach(k => {
                  const ki = parseInt(k);
                  if (ki < idx) updated[ki] = prev[ki];
                  else if (ki > idx) updated[ki - 1] = prev[ki];
                });
                return updated;
              });
            }}
            maxPhotos={20}
          />
          {photos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Commentaires</p>
              {photos.map((photo, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-white border border-slate-200 rounded-xl p-3">
                  <img src={photo} alt={`Photo ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Photo {idx + 1}</p>
                    <input
                      type="text"
                      value={photoComments[idx] || ''}
                      onChange={e => setPhotoComments(prev => ({ ...prev, [idx]: e.target.value }))}
                      placeholder="Ex: Spot abime sur le cote..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                      data-testid={`photo-comment-${idx}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={async () => {
              if (workflowId && photos.length > 0) {
                const photosWithComments = photos.map((p, idx) => ({
                  photo: p,
                  comment: photoComments[idx] || '',
                }));
                try {
                  await axios.post(`${BACKEND_URL}/api/rental/workflows/${workflowId}/photos`, { photos: photosWithComments });
                } catch (e) { console.error(e); }
              }
              setStep(5);
            }}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl"
            data-testid="to-step-5"
          >
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 5: Identity Capture
  // ============================
  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-5">
        <StepHeader step={5} totalSteps={7} label="Piece d'identite" clientName={clientName} onBack={() => setStep(4)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">
          <p className="text-sm text-slate-500">Photographiez la piece d'identite du client (recto et verso).</p>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <IdentityCapture
              recto={identityRecto}
              verso={identityVerso}
              onRectoChange={setIdentityRecto}
              onVersoChange={setIdentityVerso}
            />
          </div>
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={async () => {
              if (workflowId && (identityRecto || identityVerso)) {
                try {
                  await axios.post(`${BACKEND_URL}/api/rental/workflows/${workflowId}/identity`, {
                    recto: identityRecto,
                    verso: identityVerso,
                  });
                } catch (e) { console.error(e); }
              }
              setStep(6);
            }}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl"
            data-testid="to-step-6"
          >
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 6: Caution / Deposit
  // ============================
  if (step === 6) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-6">
        <StepHeader step={6} totalSteps={7} label="Caution" clientName={clientName} onBack={() => setStep(5)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">
          <label className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 cursor-pointer" data-testid="trusted-client">
            <input type="checkbox" checked={isTrusted} onChange={() => setIsTrusted(!isTrusted)} className="w-5 h-5 rounded" />
            <span className="text-sm font-medium text-emerald-800">Client de confiance (pas de caution)</span>
          </label>
          {!isTrusted && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Mode de paiement</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'especes', label: 'Especes' },
                    { value: 'cb', label: 'CB' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'virement', label: 'Virement' },
                  ].map(m => (
                    <button
                      key={m.value}
                      onClick={() => setDepositMethod(m.value)}
                      className={`p-3 rounded-xl text-sm font-medium border transition-colors ${depositMethod === m.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}
                      data-testid={`deposit-method-${m.value}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">Montant de la caution</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 text-lg font-medium border border-slate-200 rounded-xl px-4 py-3 text-center"
                    data-testid="deposit-amount"
                  />
                  <span className="text-lg font-medium text-slate-500">EUR</span>
                </div>
              </div>
            </>
          )}
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={() => {
              setStep(7);
            }}
            disabled={!isTrusted && !depositAmount}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl disabled:opacity-50"
            data-testid="to-step-7"
          >
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 7: Validation (unified)
  // ============================
  if (step === 7) {
    const allItems = [...checklist, ...lastMinuteItems];
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="withdrawal-step-7">
        <StepHeader step={7} totalSteps={7} label="Validation & Signature" clientName={clientName} onBack={() => setStep(6)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">

          {/* Recap materiel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Recapitulatif du materiel</p>
              <span className="text-xs text-slate-400">{allItems.length} article(s)</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-500">x{item.quantity}</span>
                </div>
              ))}
              {lastMinuteItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-xs text-amber-600 font-medium mb-1">Ajouts manuels</p>
                  {lastMinuteItems.map((item, idx) => (
                    <div key={`lm-${idx}`} className="flex justify-between text-sm py-1 border-b border-amber-50 last:border-0">
                      <span className="text-amber-800">{item.name}</span>
                      <span className="text-amber-600">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer" data-testid="global-received-checkbox">
              <input type="checkbox" checked={globalReceived} onChange={() => setGlobalReceived(!globalReceived)} className="w-5 h-5 rounded text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">Je confirme avoir recu l'ensemble du materiel</span>
            </label>
          </div>

          {/* CGV */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Conditions Generales de Vente</p>
            <div className="max-h-48 overflow-auto border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap" data-testid="cgv-text">
              {cgvText || 'Aucune CGV configuree dans les parametres.'}
            </div>
          </div>

          {/* Signature */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Signature du client</p>
            <p className="text-xs text-slate-500">En signant, le client accepte les CGV et confirme la reception du materiel.</p>
            <SignatureCanvas onSave={setSignature} />
          </div>

          {/* Email client (editable) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Email du client</p>
            <p className="text-xs text-slate-500">Le bon de retrait (PDF) sera envoye a cette adresse + copie a info@rkey-prod.fr</p>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              data-testid="client-email-input"
            />
          </div>
        </main>

        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={handleFinalize}
            disabled={isFinalizing || !globalReceived || !signature}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
            data-testid="finalize-btn"
          >
            {isFinalizing ? 'Finalisation en cours...' : 'Finaliser le retrait'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default WithdrawalFlow;
