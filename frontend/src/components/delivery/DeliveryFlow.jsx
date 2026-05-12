import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, MapPin, Phone, MessageSquare, Mail, Navigation, Wrench, Handshake } from 'lucide-react';
import { Button } from '../ui/button';
import axios from '../../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const STEPS = [
  { num: 1, label: 'Matériel' },
  { num: 2, label: 'Rappel' },
];

const DeliveryFlow = ({ delivery, onBack }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workflow, setWorkflow] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [showMissingPopup, setShowMissingPopup] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  useEffect(() => { initWorkflow(); }, []);

  const initWorkflow = async () => {
    try {
      const res = await axios.post(`${API}/delivery/workflows`, {
        reservation_id: delivery.id
      });
      setWorkflow(res.data);
      setChecklist((res.data.checklist || []).map(item => ({ ...item, checked: false })));
    } catch (err) {
      toast.error('Erreur initialisation');
    }
  };

  const toggleCheck = (idx) => {
    setChecklist(prev => prev.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    ));
  };

  const allChecked = checklist.every(item => item.checked);

  const handleValidateChecklist = async () => {
    if (!allChecked) {
      const missing = checklist.filter(item => !item.checked);
      setMissingItems(missing);
      setShowMissingPopup(true);
      return;
    }
    await saveAndProceed();
  };

  const saveAndProceed = async () => {
    if (!workflow) return;
    const missing = checklist.filter(item => !item.checked);
    try {
      await axios.put(`${API}/delivery/workflows/${workflow.id}`, {
        checklist,
        missing_items: missing.map(m => ({
          equipment_id: m.equipment_id,
          equipment_name: m.equipment_name,
          quantity: m.quantity
        })),
        current_step: 2
      });
      setShowMissingPopup(false);
      setStep(2);
    } catch (err) {
      toast.error('Erreur sauvegarde');
    }
  };

  const address = delivery.delivery_address || '';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const phone = delivery.client_phone || '';
  const email = delivery.client_email || '';
  const hasInstallation = (delivery.installation_cost || 0) > 0;
  const installHours = delivery.installation_hours || 0;

  // ============================
  // Step 1: Checklist
  // ============================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="delivery-step-1">
        <header className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-semibold text-slate-900">{STEPS[0].label}</h1>
              <p className="text-xs text-slate-500">{delivery.client_name} - {delivery.quote_number}</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">1/3</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map(s => (
              <div key={s.num} className={`h-1 flex-1 rounded-full transition-colors ${s.num <= step ? 'bg-slate-800' : 'bg-slate-200'}`} />
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-3">
          <p className="text-sm text-slate-600">Cochez chaque article chargé :</p>

          {hasInstallation && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border-2 border-orange-300" data-testid="installation-banner">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-800">Installation demandée</p>
                <p className="text-xs text-orange-600">
                  Le client a demandé l'installation du matériel{installHours > 0 ? ` (${installHours}h prévue${installHours > 1 ? 's' : ''})` : ''}.
                </p>
              </div>
            </div>
          )}

          {checklist.map((item, idx) => (
            <button
              key={idx}
              onClick={() => toggleCheck(idx)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                item.checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
              }`}
              data-testid={`delivery-check-${idx}`}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
              }`}>
                {item.checked && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-slate-800">{item.equipment_name}</p>
                <p className="text-xs text-slate-400">Qté: {item.quantity}</p>
              </div>
            </button>
          ))}
        </main>

        <div className="bg-white border-t border-slate-200 px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={handleValidateChecklist}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-sm font-medium rounded-xl"
            data-testid="delivery-next-btn"
          >
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Missing items popup */}
        {showMissingPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="missing-popup">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Matériel manquant</h3>
              </div>

              <div className="space-y-2">
                {missingItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-700">{item.equipment_name} (x{item.quantity})</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-500">Souhaitez-vous continuer la livraison malgré le matériel manquant ?</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowMissingPopup(false)}
                  className="flex-1 h-11 text-sm rounded-xl"
                >
                  Revenir
                </Button>
                <Button
                  onClick={saveAndProceed}
                  className="flex-1 h-11 text-sm rounded-xl bg-amber-500 hover:bg-amber-600"
                  data-testid="confirm-missing-btn"
                >
                  Continuer quand même
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================
  // Step 2: Rappel paiement + Contact client + Adresse
  // ============================
  if (step === 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="delivery-step-2">
        <header className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setStep(1)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-semibold text-slate-900">{STEPS[1].label}</h1>
              <p className="text-xs text-slate-500">{delivery.client_name}</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">2/3</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map(s => (
              <div key={s.num} className={`h-1 flex-1 rounded-full transition-colors ${s.num <= step ? 'bg-slate-800' : 'bg-slate-200'}`} />
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-4">
          {/* Rappel paiement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Avant de partir</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Pensez à demander au client quel <strong>mode de paiement</strong> il utilisera pour régler la location ainsi que la <strong>caution</strong>.
              </p>
            </div>
          </div>

          {/* Contact client */}
          {(phone || email) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Contacter le client</p>
              <div className="flex flex-col gap-2">
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors" data-testid="call-client">
                      <Phone className="w-5 h-5" /> Appeler {phone}
                    </a>
                    <a href={`sms:${phone}`} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors" data-testid="sms-client">
                      <MessageSquare className="w-5 h-5" /> Envoyer un SMS
                    </a>
                  </>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors" data-testid="email-client">
                    <Mail className="w-5 h-5" /> Envoyer un email
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Adresse de livraison */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Adresse de livraison</p>
            </div>
            {address ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{address}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                  data-testid="open-navigation"
                >
                  <Navigation className="w-5 h-5" /> Ouvrir dans la navigation
                </a>
              </>
            ) : (
              <p className="text-sm text-slate-400">Aucune adresse renseignée.</p>
            )}
          </div>
        </main>

        <div className="bg-white border-t border-slate-200 px-4 py-3 max-w-lg mx-auto w-full">
          <Button
            onClick={() => navigate('/rental?view=withdrawal')}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-sm font-medium rounded-xl"
            data-testid="validate-go-to-location-btn"
          >
            <Handshake className="w-4 h-4 mr-2" /> Passer à la location
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default DeliveryFlow;
