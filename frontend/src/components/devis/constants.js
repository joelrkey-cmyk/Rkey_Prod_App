// Constantes et configuration pour le module Devis

// Configuration du rich text editor Quill
export const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['image'],
    ['clean']
  ]
};

export const quillFormats = [
  'header',
  'bold', 'italic', 'underline',
  'color', 'background',
  'list', 'bullet',
  'align',
  'image'
];

// Email signature handled by backend CID embedding
export const EMAIL_SIGNATURE = '';

// Labels des catégories de pages
export const categoryLabels = {
  artiste: 'Artiste',
  tarif: 'Tarif',
  option: 'Option',
  photos: 'Photos',
  hypnose: 'Hypnose'
};

// Helpers pour les statuts de devis
export const getStatusLabel = (status) => {
  const labels = {
    'en_attente': 'En attente',
    'a_relancer': 'À relancer',
    'accepte': 'Accepté',
    'refuse': 'Refusé'
  };
  return labels[status] || status;
};

export const getStatusColor = (status) => {
  const colors = {
    'en_attente': 'bg-yellow-100 text-yellow-800',
    'a_relancer': 'bg-orange-100 text-orange-800',
    'accepte': 'bg-green-100 text-green-800',
    'refuse': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const formatEventDate = (eventDate) => {
  if (!eventDate) return '';
  if (/^\d{4}$/.test(eventDate)) return eventDate;
  if (/^\d{8}$/.test(eventDate)) {
    const day = eventDate.substring(0, 2);
    const month = eventDate.substring(2, 4);
    const year = eventDate.substring(4, 8);
    return `${day}/${month}/${year}`;
  }
  return eventDate;
};

// Formulaire initial pour ajout manuel
export const initialManualQuoteForm = {
  recipient_email: '',
  recipient_name: '',
  price_amount: '',
  price_type: 'TTC',
  event_date: '',
  notes: ''
};
