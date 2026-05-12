import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Trash2, GripVertical, Copy, Eye, ArrowLeft,
  AlignLeft, ChevronDown,
  Settings, Palette, Code
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { FIELD_TYPES, STRUCTURAL_TYPES, ALL_FIELD_TYPES, DEFAULT_STYLES } from './forms/constants';
import { generateEmbedCode } from './forms/embedCodeGenerator';
import { FormPreview } from './forms/FormPreview';
import { FormsListView } from './forms/FormsListView';
import { SubmissionsView } from './forms/SubmissionsView';

import API_BASE_URL from '../utils/apiUrl';
const API = API_BASE_URL + '/api';

export default function FormsApp() {
  const [forms, setForms] = useState([]);
  const [activeView, setActiveView] = useState('list');
  const [currentForm, setCurrentForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [editorStep, setEditorStep] = useState(-1); // -1 = show all
  const [expandedFieldId, setExpandedFieldId] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragNewType, setDragNewType] = useState(null);

  const handleDragStart = (index) => {
    setDragSourceIndex(index);
    setDragNewType(null);
  };

  const handleSidebarDragStart = (type) => {
    setDragNewType(type);
    setDragSourceIndex(null);
  };

  const handleDragEnter = (index) => {
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragOverIndex !== null) {
      if (dragNewType) {
        // Insert new field from sidebar at position
        addField(dragNewType, dragOverIndex);
      } else if (dragSourceIndex !== null && dragSourceIndex !== dragOverIndex) {
        // Reorder existing fields
        const fields = [...currentForm.fields];
        const draggedField = fields[dragSourceIndex];
        fields.splice(dragSourceIndex, 1);
        fields.splice(dragOverIndex, 0, draggedField);
        setCurrentForm({ ...currentForm, fields });
      }
    }
    setDragSourceIndex(null);
    setDragOverIndex(null);
    setDragNewType(null);
  };

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchForms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/forms`, { headers });
      setForms(res.data);
    } catch (err) {
      console.error('Error fetching forms:', err);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const createNewForm = () => {
    setCurrentForm({
      name: 'Nouveau formulaire',
      description: '',
      fields: [
        { id: 'nom', type: 'text', label: 'Nom complet', placeholder: 'Votre nom', required: true, options: [] },
        { id: 'email', type: 'email', label: 'Adresse email', placeholder: 'votre@email.com', required: true, options: [] },
        { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Votre message...', required: false, options: [] },
      ],
      styles: { ...DEFAULT_STYLES },
      recipient_email: 'info@rkey-prod.fr',
      send_confirmation: true,
      confirmation_subject: 'Merci pour votre demande',
      confirmation_message: 'Nous avons bien reçu votre demande et reviendrons vers vous dans les plus brefs délais.',
    });
    setActiveView('editor');
  };

  const editForm = (form) => {
    setCurrentForm({ ...form });
    setActiveView('editor');
  };

  const saveForm = async () => {
    if (!currentForm.name.trim()) {
      toast.error('Le nom du formulaire est requis');
      return;
    }
    try {
      setIsLoading(true);
      // Clean options: remove empty lines only on save
      const cleanedForm = {
        ...currentForm,
        fields: currentForm.fields.map(f => ({
          ...f,
          options: (f.options || []).filter(o => o.trim()),
        })),
      };
      if (cleanedForm.id) {
        await axios.put(`${API}/forms/${cleanedForm.id}`, cleanedForm, { headers });
        toast.success('Formulaire mis à jour');
      } else {
        const res = await axios.post(`${API}/forms`, cleanedForm, { headers });
        setCurrentForm(res.data);
        toast.success('Formulaire créé');
      }
      await fetchForms();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteForm = async (formId) => {
    if (!window.confirm('Supprimer ce formulaire ?')) return;
    try {
      await axios.delete(`${API}/forms/${formId}`, { headers });
      toast.success('Formulaire supprimé');
      fetchForms();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const duplicateForm = async (formId) => {
    try {
      await axios.post(`${API}/forms/${formId}/duplicate`, {}, { headers });
      toast.success('Formulaire dupliqué');
      fetchForms();
    } catch (err) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const addField = (type, atIndex) => {
    const id = `field_${Date.now()}`;
    const defaults = {
      note: { label: 'Texte informatif à destination du visiteur.' },
      divider: { label: 'Étape suivante', button_text: 'Suivant' },
      toggle: { label: 'Interrupteur' },
      file: { label: 'Pièce jointe' },
    };
    const def = defaults[type] || {};
    const newField = {
      id,
      type,
      label: def.label || ALL_FIELD_TYPES.find(f => f.type === type)?.label || 'Champ',
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'checkbox' ? ['Option 1', 'Option 2'] : [],
    };
    const fields = [...(currentForm.fields || [])];
    if (atIndex !== undefined && atIndex >= 0) {
      fields.splice(atIndex, 0, newField);
    } else {
      fields.push(newField);
    }
    setCurrentForm({ ...currentForm, fields });
    setExpandedFieldId(id);
  };

  const updateField = (index, updates) => {
    const fields = [...currentForm.fields];
    fields[index] = { ...fields[index], ...updates };
    setCurrentForm({ ...currentForm, fields });
  };

  const removeField = (index) => {
    const fields = currentForm.fields.filter((_, i) => i !== index);
    setCurrentForm({ ...currentForm, fields });
  };

  const viewSubmissions = async (form) => {
    try {
      const res = await axios.get(`${API}/forms/${form.id}/submissions`, { headers });
      setSubmissions(res.data);
      setCurrentForm(form);
      setActiveView('submissions');
    } catch (err) {
      toast.error('Erreur lors du chargement');
    }
  };

  // ============== RENDER ==============

  if (activeView === 'list') {
    return <FormsListView forms={forms} createNewForm={createNewForm} editForm={editForm} deleteForm={deleteForm} duplicateForm={duplicateForm} viewSubmissions={viewSubmissions} />;
  }

  if (activeView === 'submissions') {
    return <SubmissionsView submissions={submissions} formName={currentForm?.name} fields={currentForm?.fields || []} onBack={() => setActiveView('list')} />;
  }

  // EDITOR VIEW
  const s = currentForm?.styles || DEFAULT_STYLES;

  // Compute editor steps for section navigation
  const editorSteps = (() => {
    const steps = [{ label: '', startIdx: 0, endIdx: -1 }];
    (currentForm?.fields || []).forEach((field, idx) => {
      if (field.type === 'divider') {
        steps[steps.length - 1].endIdx = idx - 1;
        steps.push({ label: field.label || `Étape ${steps.length + 1}`, startIdx: idx + 1, endIdx: -1 });
      }
    });
    steps[steps.length - 1].endIdx = (currentForm?.fields || []).length - 1;
    // Auto-label first step
    if (steps.length > 1) {
      if (!steps[0].label) {
        const firstSection = (currentForm?.fields || []).slice(0, steps[0].endIdx + 1).find(f => f.type === 'section');
        steps[0].label = currentForm?.step1_label || (firstSection ? firstSection.label : 'Étape 1');
      }
      if (currentForm?.step1_label) {
        steps[0].label = currentForm.step1_label;
      }
    }
    return steps;
  })();
  const isEditorMultiStep = editorSteps.length > 1;

  const EditorTab = ({ id, label, icon }) => {
    const isActive = activeView === id;
    return (
      <button
        onClick={() => setActiveView(id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        {icon} {label}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4" data-testid="forms-editor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveView('list'); setCurrentForm(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <Input
            value={currentForm?.name || ''}
            onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
            className="text-lg font-bold border-none shadow-none focus-visible:ring-0 w-72"
            placeholder="Nom du formulaire"
            data-testid="form-name-input"
          />
        </div>
        <Button onClick={saveForm} disabled={isLoading} className="bg-green-600 hover:bg-green-700" data-testid="save-form-btn">
          {isLoading ? 'Sauvegarde...' : (currentForm?.id ? 'Mettre à jour' : 'Créer')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <EditorTab id="editor" label="Champs" icon={<AlignLeft className="w-4 h-4" />} />
        <EditorTab id="style" label="Style" icon={<Palette className="w-4 h-4" />} />
        <EditorTab id="settings" label="Paramètres" icon={<Settings className="w-4 h-4" />} />
        {currentForm?.id && <EditorTab id="code" label="Code HTML" icon={<Code className="w-4 h-4" />} />}
      </div>

      {/* FIELDS TAB */}
      {activeView === 'editor' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">

              {/* Section navigation tabs in editor */}
              {isEditorMultiStep && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-1.5 flex-wrap" data-testid="editor-step-tabs">
                    <button
                      onClick={() => setEditorStep(-1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        editorStep === -1 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      data-testid="editor-step-all"
                    >
                      Tout voir
                    </button>
                    {editorSteps.map((step, idx) => (
                      <button
                        key={idx}
                        onClick={() => setEditorStep(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          editorStep === idx ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                        data-testid={`editor-step-${idx}`}
                      >
                        {step.label || `Étape ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-purple-600 whitespace-nowrap">Nom de l'étape 1 :</Label>
                    <Input
                      value={currentForm?.step1_label || ''}
                      onChange={(e) => setCurrentForm({ ...currentForm, step1_label: e.target.value })}
                      placeholder="Ex: Informations générales"
                      className="text-xs h-7 max-w-xs"
                      data-testid="step1-label-input"
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-4 space-y-3">
                {currentForm?.fields?.map((field, index) => {
                  // Filter by editor step
                  if (isEditorMultiStep && editorStep !== -1) {
                    const step = editorSteps[editorStep];
                    // Show divider only if it's the boundary before or after current step
                    if (field.type === 'divider') {
                      // Show divider that ends the current step (index = step.startIdx - 1) for context
                      const isDividerBefore = index === editorSteps[editorStep]?.startIdx - 1;
                      if (!isDividerBefore) return null;
                    } else if (index < step.startIdx || index > step.endIdx) {
                      return null;
                    }
                  }

                  const isStructural = ['note', 'divider'].includes(field.type);
                  const isToggle = field.type === 'toggle' || field.type === 'radio';
                  const isFile = field.type === 'file';

                  return (
                  <div key={field.id} className="relative">
                    {dragOverIndex === index && (dragSourceIndex !== null || dragNewType !== null) && dragSourceIndex !== index && (
                      <div className="absolute -top-1.5 left-0 right-0 h-[3px] bg-orange-400 rounded-full z-10" />
                    )}
                    <div
                    onDragEnter={() => handleDragEnter(index)}
                    onDragOver={(e) => e.preventDefault()}
                    className={`rounded-lg border transition-all ${
                      dragSourceIndex === index ? 'opacity-30 scale-[0.97]' : ''
                    } ${
                    field.type === 'note' ? 'bg-amber-50 border-amber-200' :
                    field.type === 'divider' ? 'bg-purple-50 border-purple-200' :
                    'bg-white border-gray-200'
                  }`} data-testid={`field-${field.id}`}>
                    {/* Compact inline row */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <div
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnd={handleDragEnd}
                        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-100"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 px-1.5 py-0">{ALL_FIELD_TYPES.find(f => f.type === field.type)?.shortLabel || field.type}</Badge>

                      {/* Structural: note/divider - inline label */}
                      {field.type === 'note' && (
                        <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Texte informatif..." className="flex-1 text-sm bg-transparent border-none outline-none px-1 text-amber-800 placeholder:text-amber-300" />
                      )}
                      {field.type === 'divider' && (
                        <>
                          <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Nom étape" className="flex-1 text-sm bg-transparent border-none outline-none px-1 text-purple-800 placeholder:text-purple-300" />
                          <input value={field.button_text || 'Suivant'} onChange={(e) => updateField(index, { button_text: e.target.value })} placeholder="Bouton" className="w-20 text-xs bg-white border border-purple-200 rounded px-1.5 py-0.5 text-purple-700 placeholder:text-purple-300" />
                        </>
                      )}

                      {/* Toggle / File: just label */}
                      {(isToggle || isFile) && (
                        <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Libellé" className="flex-1 text-sm bg-transparent border-none outline-none px-1 text-gray-700 placeholder:text-gray-300" />
                      )}

                      {/* Standard fields: label + placeholder inline */}
                      {!isStructural && !isToggle && !isFile && (
                        <>
                          <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Libellé" className="flex-1 text-sm bg-transparent border-none outline-none px-1 text-gray-700 placeholder:text-gray-300 min-w-0" />
                          <input value={field.placeholder || ''} onChange={(e) => updateField(index, { placeholder: e.target.value })} placeholder="Placeholder" className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 placeholder:text-gray-300 min-w-0" />
                        </>
                      )}

                      {/* Required toggle */}
                      {!isStructural && (
                        <label className="flex items-center shrink-0 cursor-pointer" title={field.required ? 'Obligatoire' : 'Optionnel'}>
                          <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} className="w-3 h-3 accent-red-500" />
                          <span className="text-[10px] text-red-400 ml-0.5 hidden sm:inline">*</span>
                        </label>
                      )}

                      {/* Expand button for fields with extra options */}
                      {['select', 'checkbox'].includes(field.type) && (
                        <button onClick={() => setExpandedFieldId(expandedFieldId === field.id ? null : field.id)} className="text-gray-400 hover:text-gray-600 shrink-0" title="Options">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFieldId === field.id ? 'rotate-180' : ''}`} />
                        </button>
                      )}

                      <button onClick={() => removeField(index)} className="text-red-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expanded: only for fields needing extra config */}
                    {expandedFieldId === field.id && (
                    <div className="px-3 pb-2 pt-1 border-t border-gray-100">
                      {['select', 'checkbox'].includes(field.type) && (
                        <div>
                          <Label className="text-xs text-gray-500">Options (une par ligne)</Label>
                          <textarea
                            value={(field.options || []).join('\n')}
                            onChange={(e) => updateField(index, { options: e.target.value.split('\n') })}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-300"
                          />
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  </div>
                  );
                })}
                {/* Drop zone at end of list */}
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-all py-2 text-center text-xs text-gray-300 ${
                    dragOverIndex === (currentForm?.fields?.length || 0) && (dragSourceIndex !== null || dragNewType !== null)
                      ? 'border-orange-400 bg-orange-50 text-orange-400'
                      : 'border-gray-200'
                  }`}
                  onDragEnter={() => handleDragEnter(currentForm?.fields?.length || 0)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDragEnd}
                >
                  Déposer ici
                </div>
              </div>
            </div>

            {/* Add field sidebar */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Champs</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_TYPES.map(ft => (
                    <button
                      key={ft.type}
                      draggable
                      onDragStart={() => handleSidebarDragStart(ft.type)}
                      onDragEnd={handleDragEnd}
                      onClick={() => addField(ft.type)}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left text-xs cursor-grab active:cursor-grabbing"
                      data-testid={`add-field-${ft.type}`}
                    >
                      <span className="text-orange-500">{ft.icon}</span>
                      {ft.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Structure</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STRUCTURAL_TYPES.map(ft => (
                    <button
                      key={ft.type}
                      draggable
                      onDragStart={() => handleSidebarDragStart(ft.type)}
                      onDragEnd={handleDragEnd}
                      onClick={() => addField(ft.type)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 border rounded-lg transition-colors text-left text-xs cursor-grab active:cursor-grabbing ${
                        ft.type === 'note' ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
                        'bg-purple-50 border-purple-200 hover:border-purple-400'
                      }`}
                      data-testid={`add-field-${ft.type}`}
                    >
                      <span className={`${
                        ft.type === 'note' ? 'text-amber-500' :
                        'text-purple-500'
                      }`}>{ft.icon}</span>
                      {ft.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Aperçu en direct
            </h3>
            <FormPreview currentForm={currentForm} />
          </div>
        </>
      )}

      {/* STYLE TAB */}
      {activeView === 'style' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Left column - Personnalisation visuelle */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Personnalisation visuelle</h3>
              <div className="space-y-1.5">
                {[
                  { key: 'button_color', label: 'Bouton', allowTransparent: true },
                  { key: 'button_text_color', label: 'Texte bouton', allowTransparent: false },
                  { key: 'background_color', label: 'Fond formulaire', allowTransparent: true },
                  { key: 'form_border_color', label: 'Cadre formulaire', allowTransparent: true },
                  { key: 'input_bg_color', label: 'Fond champs', allowTransparent: true },
                  { key: 'border_color', label: 'Contour champs', allowTransparent: true },
                  { key: 'text_color', label: 'Texte', allowTransparent: false },
                ].map(({ key, label, allowTransparent }) => {
                  const val = s[key] || '#ffffff';
                  const isTransparent = val === 'transparent';
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                      <input type="color" value={isTransparent ? '#ffffff' : val} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.value } })} className="w-7 h-7 rounded cursor-pointer shrink-0 border border-gray-200" disabled={isTransparent} />
                      <Input value={val} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.value } })} className="text-xs h-7 w-24" />
                      {allowTransparent && (
                        <label className="flex items-center gap-1 cursor-pointer shrink-0">
                          <input type="checkbox" checked={isTransparent} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.checked ? 'transparent' : '#ffffff' } })} className="rounded w-3 h-3" />
                          <span className="text-[10px] text-gray-400">Transparent</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Texte bouton</span>
                  <Input value={s.button_text} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, button_text: e.target.value } })} className="text-xs h-7 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Arrondi (px)</span>
                  <Input type="number" min="0" max="30" value={s.border_radius} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, border_radius: parseInt(e.target.value) || 0 } })} className="text-xs h-7 w-16" />
                </div>
              </div>
            </div>

            {/* Right column - Boutons d'étapes */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Boutons d'étapes</h3>
              <div className="space-y-1.5">
                {[
                  { key: 'step_active_bg', label: 'Fond actif', allowTransparent: true, fallback: s.button_color || '#e67e22' },
                  { key: 'step_active_text', label: 'Texte actif', allowTransparent: false, fallback: s.button_text_color || '#ffffff' },
                  { key: 'step_inactive_bg', label: 'Fond inactif', allowTransparent: true, fallback: '#f1f1f1' },
                  { key: 'step_inactive_text', label: 'Texte inactif', allowTransparent: false, fallback: '#888888' },
                  { key: 'step_border_color', label: 'Contour', allowTransparent: true, fallback: 'transparent' },
                ].map(({ key, label, allowTransparent, fallback }) => {
                  const val = s[key] || fallback;
                  const isTransparent = val === 'transparent';
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                      <input type="color" value={isTransparent ? '#ffffff' : val} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.value } })} className="w-7 h-7 rounded cursor-pointer shrink-0 border border-gray-200" disabled={isTransparent} />
                      <Input value={val} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.value } })} className="text-xs h-7 w-24" />
                      {allowTransparent && (
                        <label className="flex items-center gap-1 cursor-pointer shrink-0">
                          <input type="checkbox" checked={isTransparent} onChange={(e) => setCurrentForm({ ...currentForm, styles: { ...s, [key]: e.target.checked ? 'transparent' : '#ffffff' } })} className="rounded w-3 h-3" />
                          <span className="text-[10px] text-gray-400">Transparent</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 items-center pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">Aperçu :</span>
                <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.step_active_bg || '#e67e22', color: s.step_active_text || '#fff', border: s.step_border_color && s.step_border_color !== 'transparent' ? `1px solid ${s.step_border_color}` : 'none', fontSize: 11, fontWeight: 700 }}>1</span>
                <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.step_inactive_bg || '#f1f1f1', color: s.step_inactive_text || '#888', border: s.step_border_color && s.step_border_color !== 'transparent' ? `1px solid ${s.step_border_color}` : 'none', fontSize: 11, fontWeight: 700 }}>2</span>
                <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.step_inactive_bg || '#f1f1f1', color: s.step_inactive_text || '#888', border: s.step_border_color && s.step_border_color !== 'transparent' ? `1px solid ${s.step_border_color}` : 'none', fontSize: 11, fontWeight: 700 }}>3</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Aperçu en direct
            </h3>
            <FormPreview currentForm={currentForm} />
          </div>
        </>
      )}

      {/* SETTINGS TAB */}
      {activeView === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="font-semibold text-gray-700">Paramètres d'envoi</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Email de réception des soumissions</Label>
              <Input
                type="email"
                value={currentForm?.recipient_email || ''}
                onChange={(e) => setCurrentForm({ ...currentForm, recipient_email: e.target.value })}
                placeholder="info@rkey-prod.fr"
                className="mt-1 max-w-md"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Objet de l'email reçu</Label>
              <Input
                value={currentForm?.email_subject || ''}
                onChange={(e) => setCurrentForm({ ...currentForm, email_subject: e.target.value })}
                placeholder={`[${currentForm?.name || 'Formulaire'}] Nouvelle soumission`}
                className="mt-1 max-w-md"
                data-testid="form-email-subject"
              />
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour utiliser "[Nom du formulaire] Nouvelle soumission"</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={currentForm?.send_confirmation || false}
                onChange={(e) => setCurrentForm({ ...currentForm, send_confirmation: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <Label className="text-sm font-medium text-blue-800 cursor-pointer">Envoyer un email de confirmation au visiteur</Label>
                <p className="text-xs text-blue-600 mt-1">Un récapitulatif sera envoyé automatiquement si le visiteur a renseigné son email</p>
              </div>
            </div>
            {currentForm?.send_confirmation && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                <div>
                  <Label className="text-sm text-gray-600">Objet de l'email de confirmation</Label>
                  <Input
                    value={currentForm?.confirmation_email_subject || ''}
                    onChange={(e) => setCurrentForm({ ...currentForm, confirmation_email_subject: e.target.value })}
                    placeholder="Merci pour votre demande"
                    className="mt-1 max-w-md"
                    data-testid="confirmation-email-subject"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Corps de l'email de confirmation</Label>
                  <p className="text-xs text-gray-400 mb-1">La signature email des paramètres généraux sera ajoutée automatiquement.</p>
                  <ReactQuill
                    value={currentForm?.confirmation_email_body || ''}
                    onChange={(val) => setCurrentForm({ ...currentForm, confirmation_email_body: val })}
                    theme="snow"
                    modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
                    placeholder="Bonjour, nous avons bien reçu votre demande..."
                    style={{ background: '#fff', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Message affiché après envoi (sur le formulaire)</Label>
                  <textarea
                    value={currentForm?.confirmation_message || ''}
                    onChange={(e) => setCurrentForm({ ...currentForm, confirmation_message: e.target.value })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-300 max-w-md"
                    data-testid="confirmation-message"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ce message s'affiche dans le formulaire après la soumission (pas dans l'email).</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CODE TAB */}
      {activeView === 'code' && currentForm?.id && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Code HTML à intégrer</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(generateEmbedCode(currentForm));
                toast.success('Code copié dans le presse-papiers !');
              }}
              data-testid="copy-code-btn"
            >
              <Copy className="w-4 h-4 mr-1" /> Copier le code
            </Button>
          </div>
          <p className="text-sm text-gray-500">Collez ce code dans un bloc "Code HTML personnalisé" sur votre site.</p>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed max-h-96 overflow-y-auto">
            {generateEmbedCode(currentForm)}
          </pre>
        </div>
      )}
    </div>
  );
}
