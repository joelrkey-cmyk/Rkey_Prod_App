import React from 'react';
import { Button } from '../ui/button';
import { Plus, FileText, Settings, Trash2, Inbox, Copy } from 'lucide-react';

/**
 * Vue liste des formulaires existants.
 */
export function FormsListView({ forms, createNewForm, editForm, deleteForm, duplicateForm, viewSubmissions }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="forms-list">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Formulaires</h2>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{form.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {form.fields?.length || 0} champ{(form.fields?.length || 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
