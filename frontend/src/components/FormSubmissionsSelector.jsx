import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Users, Search, Calendar, Mail, Phone, Building2, MessageSquare, ChevronRight, FileText, Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../services/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

const FormSubmissionsSelector = ({ onSelect, buttonLabel = 'Soumissions', buttonVariant = 'outline' }) => {
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/form-submissions/all');
      setSubmissions(response.data?.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Erreur lors du chargement des soumissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchSubmissions();
  }, [open]);

  const extractFields = (sub) => {
    const data = sub.data || {};
    const keys = Object.keys(data);
    const findField = (patterns) => {
      for (const p of patterns) {
        const key = keys.find(k => k.toLowerCase().includes(p));
        if (key && data[key]) return data[key];
      }
      return '';
    };

    return {
      nom: findField(['nom complet', 'nom', 'name', 'prenom', 'prénom']) || '',
      email: findField(['email', 'mail', 'e-mail', 'adresse email']) || sub.submitter_email || '',
      telephone: findField(['telephone', 'téléphone', 'tel', 'phone', 'portable', 'mobile']) || '',
      entreprise: findField(['entreprise', 'association', 'société', 'societe', 'company', 'organization']) || '',
      date_evenement: findField(['date', 'date_evenement', 'date événement', 'event_date']) || '',
      message: findField(['message', 'commentaire', 'description', 'details', 'détails', 'votre événement']) || '',
      nombre_personnes: findField(['nombre', 'personnes', 'invités', 'guests', 'participants']) || '',
      type_evenement: findField(['type', 'liste déroulante', 'catégorie', 'category']) || '',
    };
  };

  // Extract unique form names for filter
  const formNames = [...new Set(submissions.map(s => s.form_name || 'Sans nom'))].sort();

  const filtered = submissions.filter(sub => {
    // Form filter
    if (formFilter !== 'all' && (sub.form_name || 'Sans nom') !== formFilter) return false;
    // Text search
    if (!search) return true;
    const q = search.toLowerCase();
    const fields = extractFields(sub);
    return (
      fields.nom.toLowerCase().includes(q) ||
      fields.email.toLowerCase().includes(q) ||
      fields.entreprise.toLowerCase().includes(q) ||
      (sub.form_name || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = (sub) => {
    const fields = extractFields(sub);
    onSelect(fields, sub);
    setOpen(false);
    toast.success('Coordonnées importées depuis la soumission');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.delete(`/form-submissions/${deleteTarget.id}`);
      setSubmissions(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success('Soumission supprimée');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        data-testid="form-submissions-btn"
      >
        <Users className="w-4 h-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Soumissions de formulaires
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email, entreprise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="submissions-search"
            />
          </div>

          {formNames.length > 1 && (
            <div className="flex flex-wrap gap-1.5" data-testid="form-filter-tabs">
              <button
                onClick={() => setFormFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${formFilter === 'all' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}
                data-testid="form-filter-all"
              >
                Tous ({submissions.length})
              </button>
              {formNames.map(name => {
                const count = submissions.filter(s => (s.form_name || 'Sans nom') === name).length;
                return (
                  <button
                    key={name}
                    onClick={() => setFormFilter(name)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${formFilter === name ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}
                    data-testid={`form-filter-${name}`}
                  >
                    {name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-2 min-h-0" style={{ maxHeight: '55vh' }}>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {submissions.length === 0 ? 'Aucune soumission reçue' : 'Aucun résultat pour cette recherche'}
              </div>
            ) : (
              filtered.map((sub) => {
                const fields = extractFields(sub);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all group"
                    data-testid={`submission-${sub.id}`}
                  >
                    <button
                      onClick={() => handleSelect(sub)}
                      className="flex-1 text-left p-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">{fields.nom || 'Anonyme'}</span>
                            {fields.entreprise && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Building2 className="w-3 h-3" />{fields.entreprise}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                            {fields.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{fields.email}</span>}
                            {fields.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{fields.telephone}</span>}
                            {fields.date_evenement && <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fields.date_evenement}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <FileText className="w-3 h-3" />
                            <span>{sub.form_name || 'Formulaire'}</span>
                            <span>&bull;</span>
                            <span>{formatDate(sub.submitted_at)}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors mt-1 flex-shrink-0" />
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(sub); }}
                      className="p-2 mr-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Supprimer"
                      data-testid={`delete-submission-${sub.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette soumission ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>Voulez-vous vraiment supprimer la soumission de <strong>{extractFields(deleteTarget).nom || 'Anonyme'}</strong> ({extractFields(deleteTarget).email}) ? Cette action est irréversible.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-submission">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FormSubmissionsSelector;
