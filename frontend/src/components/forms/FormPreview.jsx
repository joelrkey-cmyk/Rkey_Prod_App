import React, { useState, useEffect } from 'react';
import { DEFAULT_STYLES } from './constants';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Splits fields into steps based on 'divider' type fields.
 */
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

  // Auto-label first step
  if (!steps[0].label && steps.length > 1) {
    const firstSection = steps[0].fields.find(f => f.type === 'section');
    steps[0].label = firstSection ? firstSection.label : 'Étape 1';
  }

  return steps;
}

/**
 * Toggle field with "Oui" indicator
 */
function TogglePreviewField({ field, s }) {
  const [toggled, setToggled] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontWeight: 600, fontSize: 14, color: s.text_color }}>
          {field.label} {field.required && <span style={{ color: '#e74c3c' }}>*</span>}
        </label>
        <button
          type="button"
          onClick={() => setToggled(!toggled)}
          style={{
            position: 'relative',
            width: 52,
            height: 28,
            borderRadius: 14,
            border: 'none',
            background: toggled ? (s.step_active_bg || s.button_color) : '#ccc',
            cursor: 'pointer',
            transition: 'background 0.3s',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {toggled && (
            <span style={{
              position: 'absolute',
              left: 6,
              fontSize: 9,
              fontWeight: 700,
              color: s.step_active_text || s.button_text_color,
              userSelect: 'none',
            }}>Oui</span>
          )}
          <span style={{
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            top: 3,
            left: toggled ? 27 : 3,
            transition: 'left 0.3s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    </div>
  );
}

/**
 * Renders a single field in the preview.
 */
function PreviewField({ field, s }) {
  if (field.type === 'section') {
    return null;
  }

  if (field.type === 'note') {
    return (
      <div style={{
        marginBottom: 16,
        fontSize: 13,
        lineHeight: 1.5,
        color: s.text_color,
        whiteSpace: 'pre-wrap',
      }}>
        {field.label}
      </div>
    );
  }

  if (field.type === 'toggle' || field.type === 'radio') {
    return <TogglePreviewField field={field} s={s} />;
  }

  if (field.type === 'file') {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: s.text_color }}>
          {field.label} {field.required && <span style={{ color: '#e74c3c' }}>*</span>}
        </label>
        <div style={{
          border: s.border_color && s.border_color !== 'transparent' ? `2px dashed ${s.border_color}` : '2px dashed #ccc',
          borderRadius: Math.max(4, s.border_radius - 4),
          padding: '20px 16px',
          textAlign: 'center',
          background: s.input_bg_color || '#ffffff',
          cursor: 'pointer',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: 13, color: s.text_color, fontWeight: 500 }}>Cliquer pour choisir un fichier</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>JPEG, PNG ou PDF — Max 5 Mo</div>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: s.border_color && s.border_color !== 'transparent' ? `1px solid ${s.border_color}` : 'none',
    borderRadius: Math.max(4, s.border_radius - 4),
    fontSize: 14,
    boxSizing: 'border-box',
    color: s.text_color,
    background: s.input_bg_color || '#ffffff',
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: s.text_color }}>
        {field.label} {field.required && <span style={{ color: '#e74c3c' }}>*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea placeholder={field.placeholder} rows={4} style={{ ...inputStyle, resize: 'vertical' }} readOnly />
      ) : field.type === 'select' ? (
        <select style={inputStyle}>
          <option style={{ color: '#333', background: '#fff' }}>-- Choisir --</option>
          {(field.options || []).map(opt => <option key={opt} style={{ color: '#333', background: '#fff' }}>{opt}</option>)}
        </select>
      ) : field.type === 'checkbox' ? (
        (field.options || []).map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" style={{ width: 16, height: 16, accentColor: s.button_color }} readOnly /> {opt}
          </label>
        ))
      ) : (
        <input type={field.type} placeholder={field.placeholder} style={inputStyle} readOnly />
      )}
    </div>
  );
}

export function FormPreview({ currentForm }) {
  const s = currentForm?.styles || DEFAULT_STYLES;
  const fields = currentForm?.fields || [];
  const steps = splitIntoSteps(fields);
  const isMultiStep = steps.length > 1;
  const [currentStep, setCurrentStep] = useState(0);

  // Apply step1_label
  if (isMultiStep && currentForm?.step1_label) {
    steps[0].label = currentForm.step1_label;
  }

  // Reset step when fields change
  useEffect(() => { setCurrentStep(0); }, [fields.length]);

  const safeStep = Math.min(currentStep, steps.length - 1);
  const activeFields = steps[safeStep]?.fields || [];
  const isLastStep = safeStep === steps.length - 1;

  return (
    <div className="bg-gray-900 rounded-xl p-6 flex justify-center">
      <div style={{
        maxWidth: 500,
        width: '100%',
        padding: 25,
        background: s.background_color,
        borderRadius: s.border_radius,
        border: s.form_border_color && s.form_border_color !== 'transparent' ? `2px solid ${s.form_border_color}` : 'none',
        fontFamily: 'Montserrat, Arial, sans-serif',
        color: s.text_color,
      }}>

        {/* Step navigation bar */}
        {isMultiStep && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {steps.map((step, idx) => {
                const isActive = idx === safeStep;
                return (
                  <div key={idx} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? (s.step_active_bg || s.button_color) : (s.step_inactive_bg || '#f1f1f1'),
                    color: isActive ? (s.step_active_text || s.button_text_color) : (s.step_inactive_text || '#888'),
                    border: s.step_border_color && s.step_border_color !== 'transparent' ? `1px solid ${s.step_border_color}` : 'none',
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} onClick={() => setCurrentStep(idx)} data-testid={`step-tab-${idx}`}>
                    {idx + 1}
                  </div>
                );
              })}
            </div>
            <div style={{
              textAlign: 'center', marginTop: 8,
              fontSize: 18, fontWeight: 700,
              color: s.step_active_bg || s.button_color,
            }}>
              {steps[safeStep]?.label || `Étape ${safeStep + 1}`}
            </div>
          </div>
        )}

        {/* Current step fields */}
        {activeFields.map(field => (
          <PreviewField key={field.id} field={field} s={s} />
        ))}

        {/* Navigation buttons */}
        {isMultiStep ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {safeStep > 0 && (
              <button
                onClick={() => setCurrentStep(safeStep - 1)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: '#f1f1f1',
                  color: '#555',
                  border: 'none',
                  borderRadius: s.border_radius,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
            )}
            {isLastStep ? (
              <button style={{
                flex: 1,
                padding: 12,
                background: s.button_color,
                color: s.button_text_color,
                border: 'none',
                borderRadius: s.border_radius,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                {s.button_text}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(safeStep + 1)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: s.button_color,
                  color: s.button_text_color,
                  border: 'none',
                  borderRadius: s.border_radius,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {steps[safeStep]?.buttonText || 'Suivant'} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button style={{
            width: '100%',
            padding: 12,
            background: s.button_color,
            color: s.button_text_color,
            border: 'none',
            borderRadius: s.border_radius,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            {s.button_text}
          </button>
        )}
      </div>
    </div>
  );
}
