import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Camera, Image, X, ZoomIn, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API, axios } from '../location/helpers';

import API_BASE_URL from '../../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const STEPS = [
  { num: 1, label: 'Selection' },
  { num: 2, label: 'Photos' },
  { num: 3, label: 'Retour' },
  { num: 4, label: 'Validation' },
];

const StepHeader = ({ step, label, clientName, onBack }) => (
  <header className="bg-white border-b border-slate-200 px-4 py-3">
    <div className="flex items-center gap-3 mb-3">
      <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100">
        <ArrowLeft className="w-5 h-5 text-slate-600" />
      </button>
      <div className="flex-1">
        <h1 className="text-sm font-semibold text-slate-900">{label}</h1>
        {clientName && <p className="text-xs text-slate-500">{clientName}</p>}
      </div>
      <span className="text-xs text-slate-400 font-mono">{step}/4</span>
    </div>
    <div className="flex gap-1">
      {STEPS.map(s => (
        <div key={s.num} className={`h-1 flex-1 rounded-full transition-colors ${s.num <= step ? 'bg-slate-800' : 'bg-slate-200'}`} />
      ))}
    </div>
  </header>
);

// Lightbox component
const Lightbox = ({ photos, currentIndex, onClose, onPrev, onNext }) => {
  const currentPhoto = photos[currentIndex];
  const photoSrc = typeof currentPhoto === 'object' ? currentPhoto.photo : currentPhoto;
  const photoComment = typeof currentPhoto === 'object' ? currentPhoto.comment : '';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="lightbox">
      <div className="flex items-center justify-between p-4">
        <span className="text-white text-sm">{currentIndex + 1} / {photos.length}</span>
        <button onClick={onClose} className="text-white p-2 hover:bg-white/20 rounded-lg">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-4">
        {photos.length > 1 && (
          <button onClick={onPrev} className="absolute left-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <img
          src={photoSrc}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
          style={{ touchAction: 'pinch-zoom' }}
        />
        {photos.length > 1 && (
          <button onClick={onNext} className="absolute right-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
      {photoComment && (
        <div className="p-4 flex items-center gap-2 justify-center">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <p className="text-amber-300 text-sm">{photoComment}</p>
        </div>
      )}
    </div>
  );
};

const ReturnFlow = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [activeRentals, setActiveRentals] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedRental, setSelectedRental] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step 2: photos
  const [withdrawalPhotos, setWithdrawalPhotos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Step 3: checklist
  const [returnChecklist, setReturnChecklist] = useState([]);

  // Step 4: operator name + email
  const [returnOperator, setReturnOperator] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [wfRes, clRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/rental/workflows`),
        axios.get(`${BACKEND_URL}/api/location/clients`),
      ]);
      const workflows = wfRes.data || [];
      // Exclude withdrawals whose return is already completed
      const completedReturnResIds = new Set(
        workflows.filter(w => w.type === 'return' && w.status === 'completed').map(w => w.reservation_id)
      );
      const active = workflows.filter(w => 
        w.type === 'withdrawal' && 
        w.status === 'equipment_withdrawn' && 
        !completedReturnResIds.has(w.reservation_id)
      );
      setActiveRentals(active);
      setClients(clRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const selectRental = async (rental) => {
    setSelectedRental(rental);
    const client = clients.find(c => c.id === rental.client_id);
    if (client?.email) setClientEmail(client.email);

    // Build return checklist from withdrawal items
    const items = (rental.checklist || rental.equipment_items || []).map((item, idx) => ({
      id: item.id || `item-${idx}`,
      name: item.name || item.equipment_name || 'Equipement',
      quantity: item.quantity || 1,
      checked: false,
    }));
    setReturnChecklist(items);

    // Fetch withdrawal photos
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rental/withdrawal-photos/${rental.reservation_id}`);
      setWithdrawalPhotos(data.photos || []);
    } catch (e) {
      console.error(e);
    }

    // Fetch return email template
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rental/settings/return-email`);
      setEmailSubject(data.subject || '');
      setEmailBody(data.body || '');
    } catch (e) {
      console.error(e);
    }

    // Create return workflow
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/rental/workflows`, {
        reservation_id: rental.reservation_id,
        type: 'return',
      });
      setWorkflowId(data.id);
    } catch (e) {
      console.error(e);
    }

    setStep(2);
  };

  const handleCompleteReturn = async () => {
    if (!returnOperator.trim()) return toast.error('Veuillez saisir le nom de l\'opérateur');
    setIsFinalizing(true);
    try {
      const emailData = clientEmail.trim() ? {
        to: clientEmail.trim(),
        subject: emailSubject || 'Confirmation de retour - R\'KEY PROD',
        body: emailBody || '<p>Retour confirme.</p>',
      } : null;

      await axios.post(`${BACKEND_URL}/api/rental/returns/${workflowId}/complete`, {
        returned_by: returnOperator.trim(),
        return_checklist: returnChecklist.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          checked: item.checked,
        })),
        email: emailData,
      });

      toast.success('Retour validé avec succès !');
      onBack();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la validation du retour');
    } finally {
      setIsFinalizing(false);
    }
  };

  const clientName = selectedRental
    ? (clients.find(c => c.id === selectedRental.client_id)?.name || selectedRental.client_name || '')
    : '';

  // ============================
  // STEP 1: Select active rental
  // ============================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="return-step-1">
        <StepHeader step={1} label="Locations actives" onBack={onBack} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Chargement...</div>
          ) : activeRentals.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Aucune location active</div>
          ) : (
            activeRentals.map(r => {
              const cl = clients.find(c => c.id === r.client_id);
              return (
                <button
                  key={r.id}
                  onClick={() => selectRental(r)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition-colors"
                  data-testid={`return-rental-${r.id}`}
                >
                  <p className="font-medium text-slate-900">{cl?.name || r.client_name || 'Client'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Retrait le {new Date(r.withdrawal_date || r.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-xs text-slate-400">{(r.checklist || r.equipment_items || []).length} equipements</p>
                </button>
              );
            })
          )}
        </main>
      </div>
    );
  }

  // ============================
  // STEP 2: Photo Gallery (withdrawal photos)
  // ============================
  if (step === 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="return-step-2">
        <StepHeader step={2} label="Photos du retrait" clientName={clientName} onBack={() => setStep(1)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">
          <p className="text-sm text-slate-500">
            Verifiez l'etat du materiel en comparant avec les photos prises lors du retrait. Cliquez sur une photo pour l'agrandir.
          </p>
          {withdrawalPhotos.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
              <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Aucune photo prise lors du retrait</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {withdrawalPhotos.map((photo, idx) => {
                const src = typeof photo === 'object' ? photo.photo : photo;
                const comment = typeof photo === 'object' ? photo.comment : '';
                return (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative group bg-white border border-slate-200 rounded-xl overflow-hidden aspect-square"
                    data-testid={`photo-thumb-${idx}`}
                  >
                    <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {comment && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                        <p className="text-xs text-white truncate">{comment}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button onClick={() => setStep(3)} className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl" data-testid="to-return-step-3">
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        {lightboxIndex !== null && (
          <Lightbox
            photos={withdrawalPhotos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(i => (i - 1 + withdrawalPhotos.length) % withdrawalPhotos.length)}
            onNext={() => setLightboxIndex(i => (i + 1) % withdrawalPhotos.length)}
          />
        )}
      </div>
    );
  }

  // ============================
  // STEP 3: Return Checklist
  // ============================
  if (step === 3) {
    const allChecked = returnChecklist.every(i => i.checked);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="return-step-3">
        <StepHeader step={3} label="Verification retour" clientName={clientName} onBack={() => setStep(2)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-3">
          <p className="text-sm text-slate-500">Cochez chaque article restitue par le client.</p>
          <button
            onClick={() => setReturnChecklist(prev => prev.map(i => ({ ...i, checked: !allChecked })))}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            {allChecked ? 'Tout decocher' : 'Tout cocher'}
          </button>
          {returnChecklist.map((item, idx) => (
            <label key={item.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 cursor-pointer" data-testid={`return-check-${idx}`}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => setReturnChecklist(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))}
                className="w-5 h-5 rounded"
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${item.checked ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{item.name}</p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">x{item.quantity}</span>
            </label>
          ))}
          {!allChecked && returnChecklist.some(i => !i.checked) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Camera className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">Articles non restitues : un litige pourra etre ouvert apres la validation.</p>
            </div>
          )}
        </main>
        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button onClick={() => setStep(4)} className="w-full h-12 bg-slate-800 hover:bg-slate-900 rounded-xl" data-testid="to-return-step-4">
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // STEP 4: Signature + Email confirmation
  // ============================
  if (step === 4) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="return-step-4">
        <StepHeader step={4} label="Validation retour" clientName={clientName} onBack={() => setStep(3)} />
        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">

          {/* Opérateur */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Opéré par</p>
            <p className="text-xs text-slate-500">Nom de la personne qui effectue le retour.</p>
            <input
              type="text"
              value={returnOperator}
              onChange={e => setReturnOperator(e.target.value)}
              placeholder="Votre prénom"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              data-testid="return-operator-name"
            />
          </div>

          {/* Email client */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Email de confirmation</p>
            <p className="text-xs text-slate-500">Un email de confirmation sera envoyé au client + copie à info@rkey-prod.fr</p>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              data-testid="return-client-email"
            />
          </div>
        </main>

        <div className="bg-white border-t px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={handleCompleteReturn}
            disabled={isFinalizing || !returnOperator.trim()}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
            data-testid="complete-return-btn"
          >
            {isFinalizing ? 'Validation en cours...' : 'Valider le retour'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default ReturnFlow;
