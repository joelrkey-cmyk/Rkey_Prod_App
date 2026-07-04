import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Trash2, Plus, Eye, Camera, FileCheck, Shield, CreditCard, PenLine, ChevronDown, ChevronUp, FileText, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import axios from '../../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
      >
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
};

const PhotoGrid = ({ photos, onDelete, onAdd, label }) => {
  const inputRef = useRef(null);

  const handleDownload = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const compressAndAdd = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > 1200) { h = (1200 / w) * h; w = 1200; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const compressed = await compressAndAdd(file);
      onAdd(compressed);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-slate-500 font-medium">{label}</p>}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
            <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => handleDownload(photo, `photo_${idx + 1}.jpg`)}
                className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-700"
                title="Télécharger"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(idx)}
                className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Ajouter</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
    </div>
  );
};

const DossierModal = ({ open, onClose, reservationId }) => {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfFilename, setPreviewPdfFilename] = useState('');

  useEffect(() => {
    if (open && reservationId) fetchDossier();
  }, [open, reservationId]);

  const fetchDossier = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/rental/dossier-by-reservation/${reservationId}`);
      setDossier(res.data);
    } catch (err) {
      toast.error('Erreur chargement dossier');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewAttachment = async (doc) => {
    try {
      const res = await axios.get(`${API}/location/quotes/${dossier?.reservation?.quote_id}/documents/${doc.id}?preview=true`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewPdfFilename(doc.filename);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ouverture du document");
    }
  };

  const handleDownloadAttachment = async (doc) => {
    try {
      const res = await axios.get(`${API}/location/quotes/${dossier?.reservation?.quote_id}/documents/${doc.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de téléchargement");
    }
  };

  const withdrawalWf = dossier?.rental_workflows?.find(w => w.type === 'withdrawal') || null;
  const returnWf = dossier?.rental_workflows?.find(w => w.type === 'return') || null;
  const deliveryWf = dossier?.delivery_workflows?.[0] || null;

  const deletePhoto = async (wfId, index) => {
    try {
      await axios.delete(`${API}/rental/workflows/${wfId}/photo/${index}`);
      toast.success('Photo supprimée');
      fetchDossier();
    } catch (e) {
      toast.error('Erreur suppression');
    }
  };

  const deleteIdentity = async (wfId, side) => {
    try {
      await axios.delete(`${API}/rental/workflows/${wfId}/identity/${side}`);
      toast.success('Photo supprimée');
      fetchDossier();
    } catch (e) {
      toast.error('Erreur suppression');
    }
  };

  const addPhotos = async (wfId, photos) => {
    try {
      await axios.post(`${API}/rental/workflows/${wfId}/photos`, { photos });
      toast.success('Photo ajoutée');
      fetchDossier();
    } catch (e) {
      toast.error('Erreur ajout');
    }
  };

  const addIdentity = async (wfId, side, photo) => {
    try {
      await axios.post(`${API}/rental/workflows/${wfId}/identity`, { [side]: photo });
      toast.success('Photo ajoutée');
      fetchDossier();
    } catch (e) {
      toast.error('Erreur ajout');
    }
  };

  const handleDownload = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  if (previewPdfUrl) {
    return (
      <Dialog open={true} onOpenChange={() => {
        window.URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 text-slate-800 bg-white">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
              <Eye className="w-5 h-5 text-indigo-700" />
              Aperçu - {previewPdfFilename}
            </h3>
            <button onClick={() => {
              window.URL.revokeObjectURL(previewPdfUrl);
              setPreviewPdfUrl(null);
            }} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 w-full overflow-hidden rounded-lg border bg-gray-100 mt-3">
            <iframe
              src={previewPdfUrl}
              className="w-full h-full rounded"
              title="Aperçu Document PDF"
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="outline" onClick={() => {
              window.URL.revokeObjectURL(previewPdfUrl);
              setPreviewPdfUrl(null);
            }}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (viewer) {
    return (
      <Dialog open={true} onOpenChange={() => setViewer(null)}>
        <DialogContent className="max-w-2xl p-0">
          <div className="relative">
            <img src={viewer} alt="Document" className="w-full" />
            <button onClick={() => setViewer(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby="dossier-description">
        <DialogHeader>
          <DialogTitle className="text-base">Dossier de la réservation</DialogTitle>
          <p id="dossier-description" className="sr-only">Documents et photos du dossier de réservation</p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : (
          <div className="space-y-3">
            {/* Informations de la réservation */}
            {dossier?.reservation && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {dossier.reservation.company_name || dossier.reservation.client_name}
                    </h3>
                    {dossier.reservation.company_name && dossier.reservation.client_name && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Contact : {dossier.reservation.client_name}
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                    Statut : {
                      {
                        'pending': 'En attente',
                        'accepted': 'Acceptée',
                        'equipment_withdrawn': 'Matériel retiré',
                        'delivered': 'Livré',
                        'equipment_returned': 'Matériel rendu',
                        'returned': 'Retourné',
                        'dispute': 'Litige',
                        'completed': 'Terminé',
                        'cancelled': 'Annulé'
                      }[dossier.reservation.status] || dossier.reservation.status
                    }
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold">Période :</span> du {dossier.reservation.start_date ? new Date(dossier.reservation.start_date).toLocaleDateString('fr-FR') : '-'} au {dossier.reservation.end_date ? new Date(dossier.reservation.end_date).toLocaleDateString('fr-FR') : '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Montant Contrat :</span> {dossier.reservation.total_amount?.toFixed(2)} EUR
                  </div>
                  <div>
                    <span className="font-semibold">Acompte :</span> {dossier.reservation.deposit_amount?.toFixed(2) || '0.00'} EUR
                  </div>
                  <div>
                    <span className="font-semibold">Caution :</span> {dossier.reservation.guarantee_amount?.toFixed(2) || '0.00'} EUR
                  </div>
                  {dossier.reservation.delivery_address && (
                    <div className="col-span-2">
                      <span className="font-semibold">Adresse de livraison :</span> {dossier.reservation.delivery_address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pièces jointes (Documents) */}
            {dossier?.reservation?.quote_documents && dossier.reservation.quote_documents.length > 0 && (
              <Section title={`Pièces jointes & Documents (${dossier.reservation.quote_documents.length})`} icon={FileText} defaultOpen={true}>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1 p-2 bg-white">
                  {dossier.reservation.quote_documents.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-800" title={doc.filename}>{doc.filename}</span>
                        {doc.category && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex-shrink-0 font-medium">
                            {doc.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          title="Aperçu"
                          onClick={() => handlePreviewAttachment(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Télécharger"
                          onClick={() => handleDownloadAttachment(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {!withdrawalWf && !deliveryWf ? (
              <>
                {dossier?.reservation && dossier.reservation.equipment_items && dossier.reservation.equipment_items.length > 0 && (
                  <Section title="Matériel réservé" icon={FileCheck} defaultOpen={true}>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                      {dossier.reservation.equipment_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 text-sm text-slate-700">
                          <span>{item.name || item.equipment_name}</span>
                          <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Aucun document de suivi pour le moment</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Les bons de retrait, bons de livraison ou photos de l'état du matériel seront visibles ici dès que l'opération aura débuté.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Checklist matériel */}
                {withdrawalWf && (
              <Section title="Liste du matériel" icon={FileCheck} defaultOpen={true}>
                <div className="space-y-1.5">
                  {(withdrawalWf.checklist || []).filter(item => !item.isLastMinute).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${item.checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        {item.checked && '✓'}
                      </div>
                      <span className="text-sm text-slate-700">{item.name || item.equipment_name}</span>
                      <span className="text-xs text-slate-400 ml-auto">x{item.quantity}</span>
                    </div>
                  ))}
                  {(withdrawalWf.checklist || []).filter(item => item.isLastMinute).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Ajouts manuels</p>
                      {(withdrawalWf.checklist || []).filter(item => item.isLastMinute).map((item, idx) => (
                        <div key={`lm-${idx}`} className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-sm text-amber-800">{item.name || item.equipment_name}</span>
                          <span className="text-xs text-amber-500 ml-auto">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Photos état */}
            {withdrawalWf && (
              <Section title={`Photos état du matériel (${(withdrawalWf.equipment_photos || []).length})`} icon={Camera}>
                {(withdrawalWf.equipment_photos || []).length > 0 ? (
                  <PhotoGrid
                    photos={(withdrawalWf.equipment_photos || []).map(p => typeof p === 'object' ? p.photo : p)}
                    onDelete={(idx) => deletePhoto(withdrawalWf.id, idx)}
                    onAdd={(photo) => addPhotos(withdrawalWf.id, [photo])}
                  />
                ) : (
                  <p className="text-xs text-slate-400">Aucune photo (supprimées après retour ou non prises)</p>
                )}
              </Section>
            )}

            {/* Pièce d'identité */}
            {withdrawalWf && (
              <Section title="Pièce d'identité" icon={Shield}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Recto</p>
                    {withdrawalWf.identity_recto ? (
                      <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={withdrawalWf.identity_recto} alt="ID Recto" className="w-full h-full object-cover cursor-pointer" onClick={() => setViewer(withdrawalWf.identity_recto)} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleDownload(withdrawalWf.identity_recto, 'id_recto.jpg')} className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteIdentity(withdrawalWf.id, 'recto')} className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 aspect-[3/2] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">Supprimé (RGPD)</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Verso</p>
                    {withdrawalWf.identity_verso ? (
                      <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={withdrawalWf.identity_verso} alt="ID Verso" className="w-full h-full object-cover cursor-pointer" onClick={() => setViewer(withdrawalWf.identity_verso)} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleDownload(withdrawalWf.identity_verso, 'id_verso.jpg')} className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-700"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteIdentity(withdrawalWf.id, 'verso')} className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 aspect-[3/2] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">Supprimé (RGPD)</p>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Caution */}
            {withdrawalWf && (
              <Section title="Caution" icon={CreditCard}>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-slate-400">Mode</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">
                      {{ empreinte_cb: 'Empreinte CB', cheque: 'Chèque', virement: 'Virement', especes: 'Espèces' }[withdrawalWf.deposit_method] || withdrawalWf.deposit_method || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Montant</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{withdrawalWf.deposit_amount?.toFixed(2)} EUR</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Statut</p>
                    <p className={`text-sm font-medium mt-0.5 ${withdrawalWf.deposit_returned ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {withdrawalWf.deposit_returned ? 'Restituée' : 'En attente'}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* Signatures */}
            {withdrawalWf && (withdrawalWf.signature_material || withdrawalWf.signature_cgv) && (
              <Section title="Signatures" icon={PenLine}>
                <div className="grid grid-cols-2 gap-3">
                  {withdrawalWf.signature_material && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Liste matériel</p>
                      <div className="border border-slate-200 rounded-lg p-1 bg-white cursor-pointer" onClick={() => setViewer(withdrawalWf.signature_material)}>
                        <img src={withdrawalWf.signature_material} alt="Signature matériel" className="w-full h-16 object-contain" />
                      </div>
                      <button onClick={() => handleDownload(withdrawalWf.signature_material, 'signature_materiel.png')} className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Télécharger
                      </button>
                    </div>
                  )}
                  {withdrawalWf.signature_cgv && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">CGV</p>
                      <div className="border border-slate-200 rounded-lg p-1 bg-white cursor-pointer" onClick={() => setViewer(withdrawalWf.signature_cgv)}>
                        <img src={withdrawalWf.signature_cgv} alt="Signature CGV" className="w-full h-16 object-contain" />
                      </div>
                      <button onClick={() => handleDownload(withdrawalWf.signature_cgv, 'signature_cgv.png')} className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Télécharger
                      </button>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Contrat signé (PDF) */}
            {withdrawalWf && withdrawalWf.signed_pdf_base64 && (
              <Section title="Contrat signé (Bon de retrait)" icon={FileText} defaultOpen={true}>
                <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {withdrawalWf.signed_pdf_filename || 'Bon_Retrait.pdf'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {withdrawalWf.signed_pdf_date
                        ? `Signé le ${new Date(withdrawalWf.signed_pdf_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Document signé'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="download-signed-pdf"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:application/pdf;base64,${withdrawalWf.signed_pdf_base64}`;
                      link.download = withdrawalWf.signed_pdf_filename || 'Bon_Retrait.pdf';
                      link.click();
                      toast.success('PDF téléchargé');
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" /> Télécharger
                  </Button>
                </div>
              </Section>
            )}

            {/* Delivery checklist */}
            {deliveryWf && (
              <Section title="Livraison" icon={FileCheck}>
                <div className="space-y-1.5">
                  {(deliveryWf.checklist || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${item.checked ? 'bg-emerald-500' : 'bg-amber-400'}`}>
                        {item.checked ? '✓' : '!'}
                      </div>
                      <span className="text-sm text-slate-700">{item.equipment_name}</span>
                      <span className="text-xs text-slate-400 ml-auto">x{item.quantity}</span>
                    </div>
                  ))}
                  {(deliveryWf.missing_items || []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-amber-600 font-medium">Matériel manquant à la livraison :</p>
                      {deliveryWf.missing_items.map((item, idx) => (
                        <div key={idx} className="text-sm text-amber-700 py-0.5">- {item.equipment_name} x{item.quantity}</div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Retour info */}
            {returnWf && returnWf.status === 'completed' && (
              <Section title="Retour" icon={Check} defaultOpen={true}>
                <div className="space-y-2">
                  {returnWf.returned_by && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <PenLine className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Opéré par</p>
                        <p className="text-sm font-medium text-slate-700" data-testid="return-operator">{returnWf.returned_by}</p>
                      </div>
                    </div>
                  )}
                  {returnWf.return_date && (
                    <p className="text-xs text-slate-400">
                      Retour le {new Date(returnWf.return_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </Section>
            )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DossierModal;
