import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../utils/apiUrl';
import { DEFAULT_STYLES } from './constants';

function splitIntoSteps(fields) {
  const steps = [];
  let current = { label: '', buttonText: '', fields: [] };

  (fields || []).forEach(field => {
    if (field.type === 'divider') {
      current.buttonText = field.button_text || 'Suivant';
      steps.push(current);
      current = { label: field.label || `Étape ${steps.length + 2}`, buttonText: '', fields: [] };
    } else {
      current.fields.push(field);
    }
  });
  steps.push(current);

  if (!steps[0].label && steps.length > 1) {
    const firstSection = steps[0].fields.find(f => f.type === 'section');
    steps[0].label = firstSection ? firstSection.label : 'Étape 1';
  }

  return steps;
}

export default function PublicFormView() {
  const { formId: paramFormId } = useParams();
  const [searchParams] = useSearchParams();
  const formId = paramFormId || searchParams.get('id');

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [fileUploading, setFileUploading] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!formId) {
      setError("Aucun identifiant de formulaire fourni.");
      setLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/forms/${formId}/public`);
        setForm(res.data);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement formulaire:', err);
        setError("Formulaire introuvable ou indisponible.");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Formulaire introuvable</h2>
          <p className="text-sm text-gray-600 mb-4">{error || "Ce formulaire n'existe pas ou n'est plus accessible."}</p>
        </div>
      </div>
    );
  }

  const s = form.styles || DEFAULT_STYLES;
  const fields = form.fields || [];
  const steps = splitIntoSteps(fields);
  const isMultiStep = steps.length > 1;

  if (isMultiStep && form.step1_label) {
    steps[0].label = form.step1_label;
  }

  const safeStep = Math.min(currentStep, steps.length - 1);
  const activeFields = steps[safeStep]?.fields || [];
  const isLastStep = safeStep === steps.length - 1;

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setFormData(prev => {
      const currentList = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentList, option] };
      } else {
        return { ...prev, [fieldId]: currentList.filter(item => item !== option) };
      }
    });
  };

  const handleFileUpload = async (fieldId, file) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Type de fichier non autorisé. Formats acceptés : JPEG, PNG, PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (maximum 5 Mo).');
      return;
    }

    try {
      setFileUploading(prev => ({ ...prev, [fieldId]: true }));
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API_BASE_URL}/api/forms/upload-file`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.file_id) {
        setUploadedFiles(prev => ({ ...prev, [fieldId]: res.data }));
      }
    } catch (err) {
      console.error('Erreur upload:', err);
      alert("Erreur lors de l'envoi du fichier.");
    } finally {
      setFileUploading(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const validateCurrentStep = () => {
    for (const field of activeFields) {
      if (field.required) {
        if (field.type === 'file') {
          if (!uploadedFiles[field.id]) return false;
        } else if (field.type === 'checkbox') {
          const val = formData[field.id];
          if (!val || (Array.isArray(val) && val.length === 0)) return false;
        } else if (field.type !== 'section' && field.type !== 'note') {
          const val = formData[field.id];
          if (val === undefined || val === null || String(val).trim() === '') return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Find submitter email
      let emailField = '';
      fields.forEach(f => {
        if (f.type === 'email' && formData[f.id]) {
          emailField = formData[f.id];
        }
      });

      const payload = {
        data: formData,
        email: emailField,
        files: uploadedFiles
      };

      const res = await axios.post(`${API_BASE_URL}/api/forms/${formId}/submit`, payload);
      if (res.data && res.data.success) {
        setIsSubmitted(true);
      } else {
        setSubmitError(res.data?.detail || "Erreur lors de l'envoi du formulaire.");
      }
    } catch (err) {
      console.error('Erreur soumission:', err);
      setSubmitError("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const borderStyle = s.border_color && s.border_color !== 'transparent' ? `1px solid ${s.border_color}` : 'none';
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: borderStyle,
    borderRadius: Math.max(4, s.border_radius - 4),
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
    color: s.text_color,
    background: s.input_bg_color || '#ffffff',
    fontFamily: 'Montserrat, Arial, sans-serif'
  };

  return (
    <div
      className="min-h-screen py-10 px-4 flex flex-col items-center justify-start"
      style={{
        backgroundColor: s.background_color === '#ffffff' ? '#f8fafc' : s.background_color,
        fontFamily: 'Montserrat, Arial, sans-serif'
      }}
    >
      <div
        className="w-full max-w-xl shadow-lg transition-all"
        style={{
          background: s.background_color,
          borderRadius: s.border_radius || 12,
          padding: '32px 28px',
          border: s.form_border_color && s.form_border_color !== 'transparent' ? `2px solid ${s.form_border_color}` : '1px solid rgba(0,0,0,0.06)',
          color: s.text_color
        }}
      >
        {/* Titre & Description du formulaire */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: s.text_color }}>
            {form.name}
          </h1>
          {form.description && (
            <p className="text-sm opacity-80 whitespace-pre-wrap">{form.description}</p>
          )}
        </div>

        {/* Message de confirmation de succès */}
        {isSubmitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-xl font-bold text-emerald-700">Demande envoyée avec succès !</h2>
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm leading-relaxed border border-emerald-200">
              {form.confirmation_message || "Merci ! Nous avons bien reçu votre demande et nous reviendrons vers vous dans les plus brefs délais."}
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({});
                setUploadedFiles({});
                setCurrentStep(0);
              }}
              className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 shadow-sm"
              style={{
                backgroundColor: s.button_color || '#e67e22',
                color: s.button_text_color || '#ffffff'
              }}
            >
              Envoyer une autre réponse
            </button>
          </div>
        ) : (
          <form onSubmit={isLastStep ? handleSubmit : handleNextStep} className="space-y-5">
            {/* Step navigation bar */}
            {isMultiStep && (
              <div className="mb-6">
                <div className="flex items-center justify-center gap-3">
                  {steps.map((step, idx) => {
                    const isActive = idx === safeStep;
                    const isPassed = idx < safeStep;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (idx <= safeStep) setCurrentStep(idx);
                        }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isActive
                            ? (s.step_active_bg || s.button_color)
                            : isPassed
                            ? '#22c55e'
                            : (s.step_inactive_bg || '#f1f1f1'),
                          color: isActive
                            ? (s.step_active_text || s.button_text_color)
                            : isPassed
                            ? '#ffffff'
                            : (s.step_inactive_text || '#888888'),
                          border: s.step_border_color && s.step_border_color !== 'transparent' ? `1px solid ${s.step_border_color}` : 'none',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: idx <= safeStep ? 'pointer' : 'default',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </div>
                    );
                  })}
                </div>
                <div
                  className="text-center mt-3 text-base font-bold"
                  style={{ color: s.step_active_bg || s.button_color }}
                >
                  {steps[safeStep]?.label || `Étape ${safeStep + 1}`}
                </div>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Step Fields */}
            <div className="space-y-4">
              {activeFields.map(field => {
                if (field.type === 'section') return null;

                if (field.type === 'note') {
                  return (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        color: s.text_color,
                        borderLeft: `4px solid ${s.button_color || '#e67e22'}`
                      }}
                    >
                      {field.label}
                    </div>
                  );
                }

                if (field.type === 'toggle' || field.type === 'radio') {
                  const isChecked = formData[field.id] === 'Oui' || formData[field.id] === true;
                  return (
                    <div key={field.id} className="flex items-center justify-between py-1">
                      <label className="text-sm font-semibold" style={{ color: s.text_color }}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleInputChange(field.id, isChecked ? 'Non' : 'Oui')}
                        className="relative w-13 h-7 rounded-full transition-colors flex items-center p-0.5"
                        style={{
                          background: isChecked ? (s.step_active_bg || s.button_color || '#e67e22') : '#cbd5e1'
                        }}
                      >
                        {isChecked && (
                          <span
                            className="absolute left-2 text-[9px] font-bold select-none"
                            style={{ color: s.step_active_text || s.button_text_color || '#ffffff' }}
                          >
                            Oui
                          </span>
                        )}
                        <span
                          className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                            isChecked ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                if (field.type === 'file') {
                  const uploaded = uploadedFiles[field.id];
                  const uploading = fileUploading[field.id];
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <label className="block text-sm font-semibold" style={{ color: s.text_color }}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <label
                        className={`block border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                          uploaded ? 'border-emerald-500 bg-emerald-50/40' : 'hover:opacity-85'
                        }`}
                        style={{
                          borderColor: uploaded ? '#10b981' : (s.border_color && s.border_color !== 'transparent' ? s.border_color : '#cbd5e1'),
                          background: s.input_bg_color || '#ffffff'
                        }}
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(field.id, e.target.files[0]);
                            }
                          }}
                        />
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 font-medium">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Envoi du fichier en cours...</span>
                          </div>
                        ) : uploaded ? (
                          <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
                            <span>📄 {uploaded.filename} ({(uploaded.size / 1024 / 1024).toFixed(1)} Mo) ✓</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-2xl mb-1">📎</div>
                            <div className="text-sm font-medium" style={{ color: s.text_color }}>
                              Cliquer pour choisir un fichier
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">JPEG, PNG ou PDF — Max 5 Mo</div>
                          </div>
                        )}
                      </label>
                    </div>
                  );
                }

                return (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-sm font-semibold" style={{ color: s.text_color }}>
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        rows={4}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        style={inputStyle}
                        className="focus:ring-2 focus:ring-orange-500/20 transition-all resize-y"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        style={inputStyle}
                        className="focus:ring-2 focus:ring-orange-500/20 transition-all"
                      >
                        <option value="">-- Choisir une option --</option>
                        {(field.options || []).map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <div className="space-y-2 pt-1">
                        {(field.options || []).map((opt, i) => {
                          const checked = Array.isArray(formData[field.id]) && formData[field.id].includes(opt);
                          return (
                            <label key={i} className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                                style={{ accentColor: s.button_color }}
                              />
                              <span style={{ color: s.text_color }}>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        style={inputStyle}
                        className="focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4">
              {isMultiStep ? (
                <div className="flex gap-3">
                  {safeStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                      style={{ borderRadius: s.border_radius }}
                    >
                      <ArrowLeft className="w-4 h-4" /> Précédent
                    </button>
                  )}
                  {isLastStep ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 rounded-lg text-base font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      style={{
                        backgroundColor: s.button_color || '#e67e22',
                        color: s.button_text_color || '#ffffff',
                        borderRadius: s.border_radius
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...
                        </>
                      ) : (
                        s.button_text || 'Envoyer'
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer"
                      style={{
                        backgroundColor: s.button_color || '#e67e22',
                        color: s.button_text_color || '#ffffff',
                        borderRadius: s.border_radius
                      }}
                    >
                      {steps[safeStep]?.buttonText || 'Suivant'} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-lg text-base font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{
                    backgroundColor: s.button_color || '#e67e22',
                    color: s.button_text_color || '#ffffff',
                    borderRadius: s.border_radius
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    s.button_text || 'Envoyer'
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Powered by / Branding footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Propulsé par <strong className="text-gray-600">R'KEY PROD</strong>
      </div>
    </div>
  );
}
