import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { ArrowLeft, Inbox, ChevronDown, ChevronUp, Mail, Phone, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

import API_BASE_URL from '../../utils/apiUrl';

const API = API_BASE_URL || '';

/**
 * Vue compacte des soumissions d'un formulaire.
 * Chaque soumission = 1 ligne repliée (date, nom, tel, email) + bouton supprimer.
 * Clic pour déplier et voir tous les champs avec leurs vrais labels.
 */
export function SubmissionsView({ submissions: initialSubmissions, formName, fields = [], onBack }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [expanded, setExpanded] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const labelMap = {};
  fields.forEach(f => {
    if (f.id && f.label) labelMap[f.id] = f.label;
  });

  const getLabel = (key) => labelMap[key] || key;

  const getSummary = (data) => {
    let name = '', email = '', phone = '';
    for (const [key, val] of Object.entries(data || {})) {
      const field = fields.find(f => f.id === key);
      const type = field?.type || '';
      const lbl = (key + ' ' + (field?.label || '')).toLowerCase();
      if (!name && (type === 'text' || lbl.includes('nom') || lbl.includes('name') || lbl.includes('prenom'))) {
        name = String(val || '');
      }
      if (!email && (type === 'email' || lbl.includes('email') || lbl.includes('mail'))) {
        email = String(val || '');
      }
      if (!phone && (type === 'tel' || lbl.includes('phone') || lbl.includes('tel') || lbl.includes('mobile'))) {
        phone = String(val || '');
      }
    }
    return { name, email, phone };
  };

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/form-submissions/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success('Soumission supprimée');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4" data-testid="submissions-view">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="submissions-back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <h2 className="text-lg font-bold text-gray-800">Soumissions — {formName}</h2>
        <Badge variant="secondary">{submissions.length}</Badge>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune soumission pour ce formulaire</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {submissions.map(sub => {
            const isOpen = expanded[sub.id];
            const { name, email, phone } = getSummary(sub.data);
            const date = new Date(sub.submitted_at).toLocaleString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={sub.id} data-testid={`submission-row-${sub.id}`}>
                {/* Summary row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggle(sub.id)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                    data-testid={`submission-toggle-${sub.id}`}
                  >
                    <span className="text-xs text-gray-400 font-mono whitespace-nowrap min-w-[120px]">{date}</span>
                    {name && (
                      <span className="flex items-center gap-1 text-sm text-gray-800 font-medium truncate max-w-[180px]">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {name}
                      </span>
                    )}
                    {phone && (
                      <span className="hidden sm:flex items-center gap-1 text-sm text-gray-500 truncate max-w-[140px]">
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {phone}
                      </span>
                    )}
                    {email && (
                      <span className="hidden md:flex items-center gap-1 text-sm text-blue-500 truncate max-w-[220px]">
                        <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        {email}
                      </span>
                    )}
                    <span className="ml-auto flex-shrink-0">
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(sub); }}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                    data-testid={`delete-submission-${sub.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100" data-testid={`submission-details-${sub.id}`}>
                    <div className="grid gap-2 max-w-xl">
                      {Object.entries(sub.data || {}).map(([key, val]) => {
                        const displayVal = Array.isArray(val) ? val.join(', ') : (val === true ? 'Oui' : val === false ? 'Non' : val || '-');
                        return (
                          <div key={key} className="flex gap-3 text-sm py-1">
                            <span className="font-medium text-gray-500 min-w-[140px]">{getLabel(key)}</span>
                            <span className="text-gray-800">{displayVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette soumission ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>Voulez-vous vraiment supprimer la soumission de <strong>{getSummary(deleteTarget.data).name || 'Anonyme'}</strong> ? Cette action est irréversible.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-submission-view">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
