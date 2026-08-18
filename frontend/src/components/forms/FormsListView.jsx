import React from 'react';
import { Button } from '../ui/button';
import { Plus, FileText, Settings, Trash2, Inbox, Copy, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getFormDirectLink } from './embedCodeGenerator';

/**
 * Vue liste des formulaires existants.
 */
export function FormsListView({ forms, createNewForm, editForm, deleteForm, duplicateForm, viewSubmissions }) {
  const handleCopyLink = (formId, formName) => {
    const link = getFormDirectLink(formId);
    navigator.clipboard.writeText(link);
    toast.success(`Lien direct copié pour "${formName}" !`);
  };

  const handleOpenLink = (formId) => {
    const link = getFormDirectLink(formId);
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="forms-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Formulaires</h2>
          <p className="text-xs text-gray-500 mt-0.5">Créez, gérez et partagez des liens directs vers vos formulaires</p>
        </div>
        <Button onClick={createNewForm} className="bg-orange-500 hover:bg-orange-600" data-testid="create-form-btn">
          <Plus className="w-4 h-4 mr-2" /> Nouveau formulaire
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">Aucun formulaire</h3>
          <p className="text-gray-400 mt-1">Créez votre premier formulaire personnalisé</p>
          <Button onClick={createNewForm} className="mt-4 bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" /> Créer un formulaire
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map(form => (
            <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow" data-testid={`form-card-${form.id}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{form.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500">
                      {form.fields?.length || 0} champ{(form.fields?.length || 0) > 1 ? 's' : ''}
                    </p>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={() => handleCopyLink(form.id, form.name)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 hover:underline"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Copier le lien direct
                    </button>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => handleCopyLink(form.id, form.name)}
                    title="Copier le lien public direct"
                  >
                    <LinkIcon className="w-4 h-4 mr-1" /> Copier le lien
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenLink(form.id)}
                    title="Ouvrir le formulaire dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" /> Voir
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => viewSubmissions(form)} data-testid={`view-submissions-${form.id}`}>
                    <Inbox className="w-4 h-4 mr-1" /> Soumissions
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => editForm(form)}>
                    <Settings className="w-4 h-4 mr-1" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => duplicateForm(form.id)} data-testid={`duplicate-form-${form.id}`}>
                    <Copy className="w-4 h-4 mr-1" /> Dupliquer
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => deleteForm(form.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
