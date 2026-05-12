import { AlignLeft, Mail, Phone, FileText, List, Calendar, CheckSquare, ToggleLeft, Hash, Paperclip, Info, SplitSquareVertical } from 'lucide-react';

export const FIELD_TYPES = [
  { type: 'text', label: 'Texte court', shortLabel: 'Texte', icon: <AlignLeft className="w-4 h-4" /> },
  { type: 'email', label: 'Email', shortLabel: 'Email', icon: <Mail className="w-4 h-4" /> },
  { type: 'phone', label: 'Téléphone', shortLabel: 'Tél.', icon: <Phone className="w-4 h-4" /> },
  { type: 'textarea', label: 'Texte long', shortLabel: 'Long', icon: <FileText className="w-4 h-4" /> },
  { type: 'select', label: 'Liste déroulante', shortLabel: 'Liste', icon: <List className="w-4 h-4" /> },
  { type: 'date', label: 'Date', shortLabel: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { type: 'checkbox', label: 'Cases à cocher', shortLabel: 'Cases', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'toggle', label: 'Interrupteur (Oui/Non)', shortLabel: 'Oui/Non', icon: <ToggleLeft className="w-4 h-4" /> },
  { type: 'number', label: 'Nombre', shortLabel: 'Nombre', icon: <Hash className="w-4 h-4" /> },
  { type: 'file', label: 'Pièce jointe', shortLabel: 'Fichier', icon: <Paperclip className="w-4 h-4" /> },
];

export const STRUCTURAL_TYPES = [
  { type: 'note', label: 'Texte informatif', shortLabel: 'Note', icon: <Info className="w-4 h-4" /> },
  { type: 'divider', label: "Séparateur d'étapes", shortLabel: 'Étape', icon: <SplitSquareVertical className="w-4 h-4" /> },
];

export const ALL_FIELD_TYPES = [...FIELD_TYPES, ...STRUCTURAL_TYPES];

export const DEFAULT_STYLES = {
  button_color: '#e67e22',
  button_text_color: '#ffffff',
  button_text: 'Envoyer',
  border_color: '#dddddd',
  background_color: '#ffffff',
  text_color: '#333333',
  border_radius: 8,
  form_border_color: '#dddddd',
  input_bg_color: '#ffffff',
  step_active_bg: '#e67e22',
  step_active_text: '#ffffff',
  step_inactive_bg: '#f1f1f1',
  step_inactive_text: '#888888',
  step_border_color: 'transparent',
};
