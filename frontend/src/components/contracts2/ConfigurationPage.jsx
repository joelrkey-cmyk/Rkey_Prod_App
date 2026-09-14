// Page de configuration des options matériel et notes techniques
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Music, FileText, Edit, Trash2, Plus, ChevronUp, ChevronDown, Save, UploadCloud, FileDown, FileCheck, Mail, Bold, Italic, Underline, List, Link, Eye, EyeOff, Image as ImageIcon, Info, X, Upload, Maximize2, ZoomIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ImageSlideshow from '../ui/ImageSlideshow';

// Composant autocomplétion intelligente et de recherche pour l'équipement de location
const EquipmentSearchSelector = ({ equipmentList, value, onChange, placeholder = "Tapez pour rechercher (nom, référence, catégorie)..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedEquipment = equipmentList.find(eq => eq.id === value);

  // Filtrer l'équipement par nom, référence ou catégorie
  const filteredEquipment = equipmentList.filter(eq => {
    const searchLow = searchTerm.toLowerCase();
    return (
      (eq.name || "").toLowerCase().includes(searchLow) ||
      (eq.reference || "").toLowerCase().includes(searchLow) ||
      (eq.category || "").toLowerCase().includes(searchLow)
    );
  });

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Label className="text-xs text-slate-500 block mb-1">Équipement lié :</Label>
      
      {/* Zone cliquable montrant la sélection actuelle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm border rounded-md px-3 py-2 bg-white cursor-pointer hover:border-slate-400 transition-colors focus-within:ring-2 focus-within:ring-blue-100"
      >
        {selectedEquipment ? (
          <div className="flex items-center space-x-1.5 overflow-hidden">
            {selectedEquipment.category && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                {selectedEquipment.category}
              </span>
            )}
            {selectedEquipment.reference && (
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded shrink-0">
                {selectedEquipment.reference}
              </span>
            )}
            <span className="truncate text-slate-800 font-medium">
              {selectedEquipment.name}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">-- Aucun équipement lié --</span>
        )}
        <div className="flex items-center space-x-1.5 shrink-0">
          {selectedEquipment && (
            <button
              type="button"
              id="clear-linked-equipment-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchTerm("");
              }}
              className="text-slate-450 hover:text-slate-755 text-sm font-bold px-1 hover:bg-slate-100 rounded"
              title="Détacher l'équipement"
            >
              ×
            </button>
          )}
          <span className="text-slate-400 text-[10px]">▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-xl max-h-64 overflow-y-auto">
          <div className="sticky top-0 bg-slate-50 p-2 border-b">
            <input
              id="equipment-search-input"
              type="text"
              className="w-full text-xs border rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="py-1">
            <button
              id="option-none-btn"
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-slate-50 border-b border-dashed transition-colors"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchTerm("");
              }}
            >
              Pas de liaison (Détacher l'équipement)
            </button>
            {filteredEquipment.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">Aucun équipement trouvé</div>
            ) : (
              filteredEquipment.map(eq => (
                <button
                  key={eq.id}
                  id={`select-eq-item-${eq.id}`}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 flex items-center justify-between text-xs transition-colors"
                  onClick={() => {
                    onChange(eq.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="flex items-center space-x-1.5 overflow-hidden mr-2">
                    {eq.category && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1 py-0.5 rounded shrink-0">
                        {eq.category}
                      </span>
                    )}
                    {eq.reference && (
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded shrink-0">
                        {eq.reference}
                      </span>
                    )}
                    <span className="font-medium text-slate-700 truncate">{eq.name}</span>
                  </div>
                  {eq.daily_price && (
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                      {eq.daily_price}€/j
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Nettoyeur universel de texte pour garantir un affichage texte simple sans balises HTML
export const cleanPlainText = (str) => {
  if (!str) return '';
  return str
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Assistant d'édition riche avec boutons de mise en forme et de variables pour les courriels
export const RichTextHelper = ({ value, onChange, placeholder, rows = 8, disabled = false }) => {
  const textareaRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertText = (before, after = '') => {
    if (disabled) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    const replacement = before + (selected || '') + after;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange(newValue);
    
    // Put focus back and restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected ? selected.length : 0));
    }, 50);
  };

  const insertVariable = (variableName) => {
    insertText(`{{${variableName}}}`);
  };

  const variablesList = [
    { name: 'client_name', label: 'Nom du Client' },
    { name: 'artist_name', label: 'Nom du Freelance/Artiste' },
    { name: 'event_date', label: 'Date' },
    { name: 'event_type', label: 'Type Événement' },
    { name: 'event_location', label: 'Lieu de Prestation' }
  ];

  // Process template with sample values for live preview
  const getPreviewHtml = () => {
    let html = value || '';
    
    // Convert lines into paragraphs or br if they don't contain standard HTML blocks
    const hasHtmlBlocks = /<p>|<div|<br|<ul|<ol|<h\d/i.test(html);
    if (!hasHtmlBlocks) {
      html = html.replace(/\n/g, '<br />');
    }
    
    const sampleValues = {
      client_name: 'Morgane & Maxence Condemi',
      artist_name: 'Stéphane JACOBY',
      event_date: 'Samedi 12 Septembre 2026',
      event_type: 'Mariage',
      event_location: 'Château de Thanvillé (67)'
    };

    Object.keys(sampleValues).forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, `<span class="inline-block text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md font-bold text-xs mx-0.5">${sampleValues[key]}</span>`);
    });

    return html;
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 flex flex-col shadow-xs">
      {/* Toolbar */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Formatting buttons */}
          <button
            type="button"
            onClick={() => insertText('<b>', '</b>')}
            disabled={disabled}
            className="h-8 w-8 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-sm transition-colors"
            title="Mettre en gras"
          >
            G
          </button>
          <button
            type="button"
            onClick={() => insertText('<i>', '</i>')}
            disabled={disabled}
            className="h-8 w-8 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 italic font-serif text-sm transition-colors"
            title="Mettre en italique"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertText('<u>', '</u>')}
            disabled={disabled}
            className="h-8 w-8 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 underline text-sm transition-colors"
            title="Souligner"
          >
            S
          </button>
          
          <div className="h-4 w-[1px] bg-slate-300 mx-1" />
          
          <button
            type="button"
            onClick={() => insertText('<p>', '</p>')}
            disabled={disabled}
            className="h-8 px-2 rounded flex items-center justify-center hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            title="Paragraphe"
          >
            Paragraphe
          </button>
          
          <button
            type="button"
            onClick={() => insertText('<ul>\n  <li>', '</li>\n</ul>')}
            disabled={disabled}
            className="h-8 px-2 rounded flex items-center justify-center hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            title="Liste à puces"
          >
            • Liste
          </button>

          <button
            type="button"
            onClick={() => insertText('<a href="https://rkeyprodapp.fr" target="_blank">', '</a>')}
            disabled={disabled}
            className="h-8 px-2 rounded flex items-center justify-center hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            title="Lien hypertexte"
          >
            Lien
          </button>
        </div>

        {/* Live Preview Toggle Button */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`text-xs px-3 py-1.5 rounded-md font-semibold border transition-all flex items-center gap-1.5 ${
            showPreview 
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-xs' 
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
          }`}
        >
          {showPreview ? "Modifier" : "Aperçu en direct"}
        </button>
      </div>

      {/* Variables insert toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Variables :</span>
        {variablesList.map(v => (
          <button
            key={v.name}
            type="button"
            onClick={() => insertVariable(v.name)}
            disabled={disabled || showPreview}
            className={`text-[11px] bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold transition-all ${
              showPreview ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            }`}
            title={`Insérer {{${v.name}}}`}
          >
            + {v.label}
          </button>
        ))}
      </div>

      {/* Editor or Preview */}
      <div className="bg-white flex-1 relative min-h-[220px]">
        {showPreview ? (
          <div className="p-4 overflow-y-auto text-sm text-slate-800 leading-relaxed bg-slate-50 min-h-[220px] max-h-[450px]">
            <div className="font-semibold text-xs text-slate-400 mb-2 uppercase tracking-wider border-b pb-1">Aperçu du courrier destiné au Freelance :</div>
            <div 
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full p-4 text-sm font-mono focus:outline-none border-0 resize-y text-slate-800 focus:ring-0 min-h-[220px] bg-white leading-relaxed"
          />
        )}
      </div>
    </div>
  );
};

export const EVENT_CATEGORIES = [
  "Mariage",
  "Anniversaire",
  "Comité d'entreprise",
  "Soirée privée",
  "Événement professionnel",
  "Show Hypnose",
  "Intervention hypnose"
];

export const ConfigurationPage = ({
  selectedOptions,
  setSelectedOptions,
  predefinedNotes,
  setPredefinedNotes,
  pdfNotes,
  setPdfNotes,
  cgvTemplates,
  setCgvTemplates,
  apiService,
  setShowConfiguration,
  initialTab = "options"
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState(initialTab);
  const [editingOptionIndex, setEditingOptionIndex] = useState(null);
  const [newOption, setNewOption] = useState({ name: "", price: 0, event_categories: [], linked_equipment_id: "", image_url: "", image_urls: [], description: "" });
  const [isUploadingOptionImage, setIsUploadingOptionImage] = useState(false);
  const [previewOptionImageModal, setPreviewOptionImageModal] = useState({ open: false, title: "", imageUrl: "", imageUrls: [], price: null, description: "" });
  const newOptionFileInputRef = useRef(null);
  const editOptionFileInputRef = useRef(null);

  const [newNote, setNewNote] = useState({ key: "", title: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [orderedNotes, setOrderedNotes] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState({ key: "", title: "", content: "" });

  const [newPdfNote, setNewPdfNote] = useState({ title: "", file: null });
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const [newCgv, setNewCgv] = useState({ name: "", content: "" });
  const [editingCgvKey, setEditingCgvKey] = useState(null);
  const [isCgvModalOpen, setIsCgvModalOpen] = useState(false);
  const [editingCgvData, setEditingCgvData] = useState({ name: "", content: "" });

  const [freelanceTemplates, setFreelanceTemplates] = useState([]);
  const [newFreelanceTemplate, setNewFreelanceTemplate] = useState({ name: "", subject: "", body: "" });
  const [editingFreelanceTemplate, setEditingFreelanceTemplate] = useState(null);
  const [isFreelanceModalOpen, setIsFreelanceModalOpen] = useState(false);

  // Modèles d'emails pour les Clients / Mariés (Contrat & Acompte, Contrat seul, Lien interface DJ)
  const [clientTemplates, setClientTemplates] = useState([]);
  const [newClientTemplate, setNewClientTemplate] = useState({ name: "", category: "contrat_acompte", subject: "", body: "" });
  const [editingClientTemplate, setEditingClientTemplate] = useState(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [equipmentList, setEquipmentList] = useState([]);

  // Charger les notes ordonnées au montage
  useEffect(() => {
    const loadOrderedNotes = async () => {
      try {
        const notes = await apiService.getTechnicalNotes();
        if (notes && notes.length > 0) {
          setOrderedNotes(notes);
        }
      } catch (error) {
        console.error("Error loading ordered notes:", error);
      }
    };
    const loadEquipmentList = async () => {
      try {
        const data = await apiService.getEquipmentList();
        setEquipmentList(data || []);
      } catch (error) {
        console.error("Error loading equipment list:", error);
      }
    };
    const loadFreelanceTemplates = async () => {
      try {
        const response = await apiService.get('/freelance-email-templates');
        const list = response.data.templates || [];
        if (list.length === 0) {
          // pre-create a default
          const defTpl = {
            name: "Félicitations Signature",
            subject: "Contrat signé ! Détails de votre prestation : {{client_name}}",
            body: "Bonjour {{artist_name}},\n\nFélicitations ! Le contrat pour la prestation {{client_name}} du {{event_date}} a bien été signé par le client.\n\nVous pouvez dès à présent retrouver l'ensemble des détails de la prestation, de l'installation et le planning complet sur votre espace DJ / Artiste.\n\nBonne prestation !\n\nCordialement,",
            is_default: true
          };
          const saved = await apiService.post('/freelance-email-templates', defTpl);
          setFreelanceTemplates([saved.data]);
        } else {
          setFreelanceTemplates(list);
        }
      } catch (error) {
        console.error("Error loading freelance templates:", error);
      }
    };
    const loadClientTemplates = async () => {
      try {
        const response = await apiService.get('/client-email-templates');
        const list = response.data.templates || [];
        setClientTemplates(list.map(t => ({ ...t, body: cleanPlainText(t.body) })));
      } catch (error) {
        console.error("Error loading client templates:", error);
      }
    };
    loadOrderedNotes();
    loadEquipmentList();
    loadFreelanceTemplates();
    loadClientTemplates();
  }, [apiService]);

  // --- Options Matériel ---
  const handleUploadImagesForNewOption = async (files) => {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;
    const validFiles = fileArray.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" dépasse la taille maximale autorisée (5 Mo)`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    try {
      setIsUploadingOptionImage(true);
      const res = await apiService.uploadMaterialOptionImages(validFiles);
      if (res && res.urls && res.urls.length > 0) {
        setNewOption(prev => {
          const current = Array.isArray(prev.image_urls) ? prev.image_urls : (prev.image_url ? [prev.image_url] : []);
          const updated = [...current, ...res.urls];
          return {
            ...prev,
            image_urls: updated,
            image_url: updated[0] || ""
          };
        });
        toast.success(res.urls.length === 1 ? "Image ajoutée avec succès !" : `${res.urls.length} images ajoutées avec succès !`);
      }
    } catch (error) {
      console.error("Error uploading images for new option:", error);
      toast.error("Erreur lors du téléchargement des images.");
    } finally {
      setIsUploadingOptionImage(false);
    }
  };

  const handleUploadImagesForEditOption = async (files, index) => {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;
    const validFiles = fileArray.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" dépasse la taille maximale autorisée (5 Mo)`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    try {
      setIsUploadingOptionImage(true);
      const res = await apiService.uploadMaterialOptionImages(validFiles);
      if (res && res.urls && res.urls.length > 0) {
        const updated = [...selectedOptions];
        const current = Array.isArray(updated[index].image_urls) 
          ? updated[index].image_urls 
          : (updated[index].image_url ? [updated[index].image_url] : []);
        const combined = [...current, ...res.urls];
        updated[index] = { 
          ...updated[index], 
          image_urls: combined, 
          image_url: combined[0] || "" 
        };
        setSelectedOptions(updated);
        toast.success(res.urls.length === 1 ? "Image ajoutée !" : `${res.urls.length} images ajoutées !`);
      }
    } catch (error) {
      console.error("Error uploading images for edited option:", error);
      toast.error("Erreur lors du téléchargement des images.");
    } finally {
      setIsUploadingOptionImage(false);
    }
  };

  const handleRemoveOptionImage = (imgIndex, optionIndex = null) => {
    if (optionIndex === null) {
      setNewOption(prev => {
        const current = Array.isArray(prev.image_urls) ? prev.image_urls : (prev.image_url ? [prev.image_url] : []);
        const filtered = current.filter((_, i) => i !== imgIndex);
        return {
          ...prev,
          image_urls: filtered,
          image_url: filtered[0] || ""
        };
      });
      toast.info("Image retirée");
    } else {
      const updated = [...selectedOptions];
      const current = Array.isArray(updated[optionIndex].image_urls) 
        ? updated[optionIndex].image_urls 
        : (updated[optionIndex].image_url ? [updated[optionIndex].image_url] : []);
      const filtered = current.filter((_, i) => i !== imgIndex);
      updated[optionIndex] = {
        ...updated[optionIndex],
        image_urls: filtered,
        image_url: filtered[0] || ""
      };
      setSelectedOptions(updated);
      toast.info("Image retirée");
    }
  };

  const addNewOption = async () => {
    if (newOption.name.trim() && newOption.price >= 0) {
      try {
        setIsSaving(true);
        const finalImages = (Array.isArray(newOption.image_urls) && newOption.image_urls.length > 0)
          ? newOption.image_urls
          : (newOption.image_url ? [newOption.image_url] : []);

        const savedOption = await apiService.createMaterialOption({
          name: newOption.name.trim(),
          price: newOption.price,
          description: newOption.description || "",
          event_categories: newOption.event_categories || [],
          linked_equipment_id: newOption.linked_equipment_id || null,
          image_url: finalImages[0] || null,
          image_urls: finalImages
        });
        setSelectedOptions([...selectedOptions, { ...savedOption, image_urls: finalImages, selected: false }]);
        setNewOption({ name: "", price: 0, description: "", event_categories: [], linked_equipment_id: "", image_url: "", image_urls: [] });
        if (newOptionFileInputRef.current) newOptionFileInputRef.current.value = "";
        toast.success("Option matériel ajoutée et sauvegardée définitivement !");
      } catch (error) {
        console.error("Error adding option:", error);
        toast.error("Erreur lors de l'ajout de l'option");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteOption = async (index) => {
    const optionToDelete = selectedOptions[index];
    try {
      setIsSaving(true);
      await apiService.deleteMaterialOption(optionToDelete.id);
      setSelectedOptions(selectedOptions.filter((_, i) => i !== index));
      toast.success("Option supprimée définitivement !");
    } catch (error) {
      console.error("Error deleting option:", error);
      toast.error("Erreur lors de la suppression de l'option");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEditedOption = async (index) => {
    const option = selectedOptions[index];
    try {
      setIsSaving(true);
      const optImages = (Array.isArray(option.image_urls) && option.image_urls.length > 0)
        ? option.image_urls
        : (option.image_url ? [option.image_url] : []);

      await apiService.updateMaterialOption(option.id, { 
        name: option.name, 
        price: option.price,
        description: option.description || "",
        event_categories: option.event_categories || [],
        linked_equipment_id: option.linked_equipment_id || null,
        image_url: optImages[0] || null,
        image_urls: optImages
      });
      setEditingOptionIndex(null);
      toast.success("Option modifiée et sauvegardée !");
    } catch (error) {
      console.error("Error updating option:", error);
      toast.error("Erreur lors de la modification de l'option");
    } finally {
      setIsSaving(false);
    }
  };

  const moveOption = async (index, direction) => {
    const newOptions = [...selectedOptions];
    if (direction === 'up' && index > 0) {
      [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
    } else if (direction === 'down' && index < newOptions.length - 1) {
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    }
    setSelectedOptions(newOptions);
    try {
      const reorderData = newOptions.map((opt, idx) => ({ id: opt.id, order: idx }));
      await apiService.reorderMaterialOptions(reorderData);
    } catch (error) {
      console.error("Error reordering options:", error);
    }
  };

  // --- Notes Techniques ---
  const generateKeyFromTitle = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      + '_' + Date.now();
  };

  const addNewNote = async () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      try {
        setIsSaving(true);
        const generatedKey = generateKeyFromTitle(newNote.title.trim());
        const savedNote = await apiService.createTechnicalNote({
          key: generatedKey,
          title: newNote.title.trim(),
          content: newNote.content.trim()
        });
        setPredefinedNotes({ ...predefinedNotes, [generatedKey]: { title: newNote.title, content: newNote.content } });
        setOrderedNotes([...orderedNotes, savedNote]);
        setNewNote({ key: "", title: "", content: "" });
        toast.success("Note technique ajoutée et sauvegardée définitivement !");
      } catch (error) {
        console.error("Error adding note:", error);
        toast.error(error.message || "Erreur lors de l'ajout de la note");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteNote = async (noteKey) => {
    try {
      setIsSaving(true);
      await apiService.deleteTechnicalNote(noteKey);
      const updatedNotes = { ...predefinedNotes };
      delete updatedNotes[noteKey];
      setPredefinedNotes(updatedNotes);
      setOrderedNotes(orderedNotes.filter(n => n.key !== noteKey));
      toast.success("Note technique supprimée définitivement !");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erreur lors de la suppression de la note");
    } finally {
      setIsSaving(false);
    }
  };

  const moveNote = async (index, direction) => {
    const newNotes = [...orderedNotes];
    if (direction === 'up' && index > 0) {
      [newNotes[index], newNotes[index - 1]] = [newNotes[index - 1], newNotes[index]];
    } else if (direction === 'down' && index < newNotes.length - 1) {
      [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
    }
    setOrderedNotes(newNotes);
    try {
      const reorderData = newNotes.map((note, idx) => ({ key: note.key, order: idx }));
      await apiService.reorderTechnicalNotes(reorderData);
      const notesObj = {};
      newNotes.forEach(note => { notesObj[note.key] = { title: note.title, content: note.content }; });
      setPredefinedNotes(notesObj);
    } catch (error) {
      console.error("Error reordering notes:", error);
    }
  };

  const openEditModal = (key, note) => {
    setEditingNoteData({ key, title: note.title, content: note.content });
    setIsEditModalOpen(true);
  };

  const saveEditedNote = async () => {
    try {
      setIsSaving(true);
      await apiService.updateTechnicalNote(editingNoteData.key, {
        title: editingNoteData.title,
        content: editingNoteData.content
      });
      setPredefinedNotes({
        ...predefinedNotes,
        [editingNoteData.key]: { title: editingNoteData.title, content: editingNoteData.content }
      });
      setIsEditModalOpen(false);
      toast.success("Note technique modifiée et sauvegardée définitivement !");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Erreur lors de la modification de la note");
    } finally {
      setIsSaving(false);
    }
  };

  // --- PDF Notes ---
  const handlePdfUpload = async () => {
    if (!newPdfNote.file) return;
    try {
      setIsUploadingPdf(true);
      const saved = await apiService.createContractPdfNote(
        newPdfNote.title || newPdfNote.file.name,
        pdfNotes.length,
        newPdfNote.file
      );
      setPdfNotes([...pdfNotes, saved]);
      setNewPdfNote({ title: "", file: null });
      toast.success("Fichier PDF ajouté !");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Erreur lors de l'upload du PDF");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const deletePdfNote = async (id) => {
    try {
      await apiService.deleteContractPdfNote(id);
      setPdfNotes(pdfNotes.filter(n => n.id !== id));
      toast.success("PDF supprimé");
    } catch (error) {
      console.error("Error deleting PDF:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const movePdfNote = async (index, direction) => {
    const newNotes = [...pdfNotes];
    if (direction === 'up' && index > 0) {
      [newNotes[index], newNotes[index - 1]] = [newNotes[index - 1], newNotes[index]];
    } else if (direction === 'down' && index < newNotes.length - 1) {
      [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
    }
    setPdfNotes(newNotes);
    try {
      await apiService.reorderContractPdfNotes(newNotes.map((n, i) => ({ id: n.id, order: i })));
    } catch (error) {
      console.error("Error reordering PDF notes:", error);
    }
  };

  // --- CGV Modèles ---
  const addNewCgv = async () => {
    if (newCgv.name.trim() && newCgv.content.trim()) {
      try {
        setIsSaving(true);
        const name = newCgv.name.trim();
        const key = generateKeyFromTitle(name);
        const updatedTemplates = { ...cgvTemplates, [key]: { name: name, content: newCgv.content } };
        await apiService.updateCgvTemplates(updatedTemplates);
        setCgvTemplates(updatedTemplates);
        setNewCgv({ name: "", content: "" });
        toast.success("Modèle de CGV ajouté !");
      } catch (error) {
        console.error("Error adding CGV:", error);
        toast.error("Erreur lors de l'ajout des CGV");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteCgv = async (key) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce modèle de CGV ?")) return;
    try {
      setIsSaving(true);
      const updatedTemplates = { ...cgvTemplates };
      delete updatedTemplates[key];
      await apiService.updateCgvTemplates(updatedTemplates);
      setCgvTemplates(updatedTemplates);
      toast.success("Modèle de CGV supprimé !");
    } catch (error) {
      console.error("Error deleting CGV:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsSaving(false);
    }
  };

  const openCgvEditModal = (key, cgv) => {
    setEditingCgvKey(key);
    setEditingCgvData({ 
      name: cgv.name || key.replace(/_[0-9]+$/, '').replace(/_/g, ' ').trim(), 
      content: cgv.content 
    });
    setIsCgvModalOpen(true);
  };

  const saveEditedCgv = async () => {
    try {
      setIsSaving(true);
      const existing = cgvTemplates[editingCgvKey] || {};
      const updatedTemplates = { 
        ...cgvTemplates, 
        [editingCgvKey]: { 
          ...existing, 
          name: editingCgvData.name.trim() || existing.name || editingCgvKey.replace(/_[0-9]+$/, '').replace(/_/g, ' ').trim(),
          content: editingCgvData.content 
        } 
      };
      await apiService.updateCgvTemplates(updatedTemplates);
      setCgvTemplates(updatedTemplates);
      setIsCgvModalOpen(false);
      toast.success("Modèle de CGV mis à jour !");
    } catch (error) {
      console.error("Error updating CGV:", error);
      toast.error("Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Freelance Email Templates ---
  const addFreelanceTemplate = async () => {
    if (!newFreelanceTemplate.name.trim() || !newFreelanceTemplate.subject.trim() || !newFreelanceTemplate.body.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    try {
      setIsSaving(true);
      const res = await apiService.post('/freelance-email-templates', {
        name: newFreelanceTemplate.name.trim(),
        subject: newFreelanceTemplate.subject.trim(),
        body: newFreelanceTemplate.body.trim(),
        is_default: freelanceTemplates.length === 0
      });
      setFreelanceTemplates([...freelanceTemplates, res.data]);
      setNewFreelanceTemplate({ name: "", subject: "", body: "" });
      toast.success("Modèle de mail freelance ajouté !");
    } catch (err) {
      toast.error("Erreur d'ajout de modèle");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFreelanceTemplate = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
    try {
      await apiService.delete(`/freelance-email-templates/${id}`);
      setFreelanceTemplates(freelanceTemplates.filter(t => t.id !== id));
      toast.success("Modèle supprimé avec succès !");
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  const saveEditedFreelanceTemplate = async () => {
    if (!editingFreelanceTemplate.name.trim() || !editingFreelanceTemplate.subject.trim() || !editingFreelanceTemplate.body.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    try {
      setIsSaving(true);
      const res = await apiService.put(`/freelance-email-templates/${editingFreelanceTemplate.id}`, editingFreelanceTemplate);
      setFreelanceTemplates(freelanceTemplates.map(t => t.id === editingFreelanceTemplate.id ? res.data : t));
      setIsFreelanceModalOpen(false);
      setEditingFreelanceTemplate(null);
      toast.success("Modèle de mail freelance mis à jour !");
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  const setFreelanceTemplateAsDefault = async (id) => {
    try {
      const updatedList = await Promise.all(freelanceTemplates.map(async (t) => {
        const isTarget = t.id === id;
        if (t.is_default !== isTarget) {
          const res = await apiService.put(`/freelance-email-templates/${t.id}`, { ...t, is_default: isTarget });
          return res.data;
        }
        return t;
      }));
      setFreelanceTemplates(updatedList);
      toast.success("Modèle par défaut mis à jour !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // ── Méthodes pour les modèles d'emails clients ──
  const addClientTemplate = async () => {
    if (!newClientTemplate.name.trim() || !newClientTemplate.subject.trim() || !newClientTemplate.body.trim()) {
      toast.error("Veuillez remplir le nom, l'objet et le message du modèle.");
      return;
    }
    try {
      setIsSaving(true);
      const res = await apiService.post('/client-email-templates', {
        name: newClientTemplate.name.trim(),
        category: newClientTemplate.category || 'contrat_acompte',
        subject: newClientTemplate.subject.trim(),
        body: newClientTemplate.body.trim(),
        is_default: clientTemplates.length === 0
      });
      setClientTemplates([...clientTemplates, res.data]);
      setNewClientTemplate({ name: "", category: "contrat_acompte", subject: "", body: "" });
      toast.success("Modèle d'email client ajouté avec succès !");
    } catch (err) {
      console.error("Error adding client template:", err);
      toast.error("Erreur lors de l'ajout du modèle client");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClientTemplate = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle d'email client ?")) return;
    try {
      await apiService.delete(`/client-email-templates/${id}`);
      setClientTemplates(clientTemplates.filter(t => t.id !== id));
      toast.success("Modèle client supprimé !");
    } catch (err) {
      console.error("Error deleting client template:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const saveEditedClientTemplate = async () => {
    if (!editingClientTemplate.name.trim() || !editingClientTemplate.subject.trim() || !editingClientTemplate.body.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      setIsSaving(true);
      const res = await apiService.put(`/client-email-templates/${editingClientTemplate.id}`, editingClientTemplate);
      setClientTemplates(clientTemplates.map(t => t.id === editingClientTemplate.id ? res.data : t));
      setIsClientModalOpen(false);
      setEditingClientTemplate(null);
      toast.success("Modèle d'email client mis à jour !");
    } catch (err) {
      console.error("Error updating client template:", err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const setClientTemplateAsDefault = async (id) => {
    try {
      const updatedList = await Promise.all(clientTemplates.map(async (t) => {
        const isTarget = t.id === id;
        if (t.is_default !== isTarget) {
          const res = await apiService.put(`/client-email-templates/${t.id}`, { ...t, is_default: isTarget });
          return res.data;
        }
        return t;
      }));
      setClientTemplates(updatedList);
      toast.success("Modèle client par défaut mis à jour !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" data-testid="configuration-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Configuration</h1>
            <p className="text-slate-600 mt-2">Gérez vos options matériel et notes techniques</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowConfiguration(false)}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="back-to-contracts-btn"
            >
              <FileText className="h-4 w-4" />
              <span>Retour aux contrats</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8 h-auto p-1 gap-1">
            <TabsTrigger value="options" className="flex items-center space-x-2">
              <Music className="h-4 w-4" />
              <span>Options Matériel</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Notes Techniques</span>
            </TabsTrigger>
            <TabsTrigger value="pdf_notes" className="flex items-center space-x-2">
              <UploadCloud className="h-4 w-4" />
              <span>PDF Notes</span>
            </TabsTrigger>
            <TabsTrigger value="cgv" className="flex items-center space-x-2">
              <FileCheck className="h-4 w-4" />
              <span>Modèles CGV</span>
            </TabsTrigger>
            <TabsTrigger value="freelance_emails" className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              <span>Mails Freelances</span>
            </TabsTrigger>
            <TabsTrigger value="client_emails" className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-emerald-600" />
              <span>Mails Clients</span>
            </TabsTrigger>
          </TabsList>

          {/* Options Matériel */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Options Matériel</CardTitle>
                <CardDescription>Ajoutez, modifiez ou supprimez les options d'équipement et leurs infographies associées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {selectedOptions.map((option, index) => (
                    <div key={index} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl bg-white shadow-sm hover:border-slate-300 transition-colors gap-4">
                      <div className="flex-1">
                        {editingOptionIndex === index ? (
                          <div className="flex flex-col space-y-3 flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="flex-1 w-full">
                                <Label className="text-xs text-slate-500 mb-1 block">Nom de l'option</Label>
                                <Input value={option.name} onChange={(e) => { const updated = [...selectedOptions]; updated[index].name = e.target.value; setSelectedOptions(updated); }} className="w-full" />
                              </div>
                              <div className="w-full sm:w-28">
                                <Label className="text-xs text-slate-500 mb-1 block">Tarif (€)</Label>
                                <Input type="number" value={option.price} onChange={(e) => { const updated = [...selectedOptions]; updated[index].price = parseFloat(e.target.value) || 0; setSelectedOptions(updated); }} className="w-full" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Description / Détails (optionnel) :</Label>
                              <Input 
                                placeholder="Description succincte de l'option..." 
                                value={option.description || ""} 
                                onChange={(e) => {
                                  const updated = [...selectedOptions];
                                  updated[index].description = e.target.value;
                                  setSelectedOptions(updated);
                                }} 
                                className="w-full text-sm"
                              />
                            </div>

                            {/* Image / Infographie pour l'édition */}
                            <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                              {(() => {
                                const editOptionImages = (Array.isArray(option.image_urls) && option.image_urls.length > 0)
                                  ? option.image_urls
                                  : (option.image_url ? [option.image_url] : []);
                                
                                return (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                                        Images / Infographies ({editOptionImages.length})
                                      </Label>
                                      {editOptionImages.length > 0 && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[11px] text-indigo-600 hover:bg-indigo-50 px-2 flex items-center gap-1"
                                          onClick={() => setPreviewOptionImageModal({
                                            open: true,
                                            title: option.name,
                                            imageUrl: editOptionImages[0],
                                            imageUrls: editOptionImages,
                                            price: option.price,
                                            description: option.description
                                          })}
                                        >
                                          <Eye className="w-3 h-3" /> Diaporama
                                        </Button>
                                      )}
                                    </div>

                                    {editOptionImages.length > 0 && (
                                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 my-2">
                                        {editOptionImages.map((img, imgIdx) => (
                                          <div key={imgIdx} className="relative group rounded-md border border-slate-200 overflow-hidden bg-white aspect-square">
                                            <img
                                              src={img}
                                              alt={`Image ${imgIdx + 1}`}
                                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                                              onClick={() => setPreviewOptionImageModal({
                                                open: true,
                                                title: option.name,
                                                imageUrl: img,
                                                imageUrls: editOptionImages,
                                                price: option.price,
                                                description: option.description
                                              })}
                                            />
                                            <button
                                              type="button"
                                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveOptionImage(imgIdx, index);
                                              }}
                                              title="Supprimer cette image"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                            {imgIdx === 0 && (
                                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-medium">
                                                Principale
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div>
                                      <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg cursor-pointer bg-white transition-colors">
                                        <input 
                                          type="file" 
                                          multiple
                                          accept="image/png,image/jpeg,image/jpg,image/webp" 
                                          className="hidden" 
                                          disabled={isUploadingOptionImage}
                                          onChange={(e) => {
                                            if (e.target.files?.length) handleUploadImagesForEditOption(e.target.files, index);
                                          }} 
                                        />
                                        {isUploadingOptionImage ? (
                                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                        ) : (
                                          <UploadCloud className="w-4 h-4 text-indigo-600" />
                                        )}
                                        <span className="text-xs font-medium text-slate-700">
                                          {isUploadingOptionImage 
                                            ? "Téléchargement..." 
                                            : editOptionImages.length > 0 
                                              ? "Ajouter d'autres images (plusieurs sélectionnables)" 
                                              : "Sélectionner des images (plusieurs sélectionnables)"}
                                        </span>
                                      </label>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">Afficher pour les types d'événements :</Label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...selectedOptions];
                                      updated[index].event_categories = [...EVENT_CATEGORIES];
                                      setSelectedOptions(updated);
                                    }}
                                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                                  >
                                    Tout cocher
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...selectedOptions];
                                      updated[index].event_categories = [];
                                      setSelectedOptions(updated);
                                    }}
                                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                                  >
                                    Tout décocher
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {EVENT_CATEGORIES.map(cat => (
                                  <label key={cat} className="flex items-center space-x-1.5 border px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                                    <input type="checkbox" className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300" checked={(option.event_categories || []).includes(cat)} onChange={(e) => {
                                      const updated = [...selectedOptions];
                                      let cats = [...(updated[index].event_categories || [])];
                                      if (e.target.checked) cats.push(cat); else cats = cats.filter(c => c !== cat);
                                      updated[index].event_categories = cats;
                                      setSelectedOptions(updated);
                                    }} />
                                    <span className="text-xs font-medium text-slate-700">{cat}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              <EquipmentSearchSelector 
                                equipmentList={equipmentList}
                                value={option.linked_equipment_id || ""}
                                onChange={(val) => {
                                  const updated = [...selectedOptions];
                                  updated[index].linked_equipment_id = val;
                                  setSelectedOptions(updated);
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button onClick={() => saveEditedOption(index)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                Enregistrer
                              </Button>
                              <Button onClick={() => setEditingOptionIndex(null)} size="sm" variant="outline">
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {(() => {
                                const optPhotos = (Array.isArray(option.image_urls) && option.image_urls.length > 0)
                                  ? option.image_urls
                                  : (option.image_url ? [option.image_url] : []);

                                if (optPhotos.length === 0) {
                                  return (
                                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                                      <ImageIcon className="w-5 h-5" />
                                      <span className="text-[9px] mt-0.5">Sans visuel</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div 
                                    className="relative group shrink-0 cursor-pointer"
                                    onClick={() => setPreviewOptionImageModal({ 
                                      open: true, 
                                      title: option.name, 
                                      imageUrl: optPhotos[0], 
                                      imageUrls: optPhotos, 
                                      price: option.price, 
                                      description: option.description 
                                    })}
                                    title={optPhotos.length > 1 ? `Voir le diaporama (${optPhotos.length} photos)` : "Cliquez pour agrandir l'image"}
                                  >
                                    <img 
                                      src={optPhotos[0]} 
                                      alt={option.name} 
                                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 group-hover:scale-105 transition-transform"
                                    />
                                    {optPhotos.length > 1 && (
                                      <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] px-1 py-0.2 rounded font-bold shadow">
                                        {optPhotos.length}
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                );
                              })()}
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-slate-900">{option.name}</h3>
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                                    {option.price} €
                                  </Badge>
                                  {(() => {
                                    const optPhotos = (Array.isArray(option.image_urls) && option.image_urls.length > 0)
                                      ? option.image_urls
                                      : (option.image_url ? [option.image_url] : []);
                                    if (optPhotos.length === 0) return null;
                                    return (
                                      <Badge 
                                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] cursor-pointer hover:bg-emerald-100 flex items-center gap-1"
                                        onClick={() => setPreviewOptionImageModal({ 
                                          open: true, 
                                          title: option.name, 
                                          imageUrl: optPhotos[0], 
                                          imageUrls: optPhotos, 
                                          price: option.price, 
                                          description: option.description 
                                        })}
                                      >
                                        <Info className="w-3 h-3" />
                                        {optPhotos.length > 1 ? `${optPhotos.length} photos (Diaporama)` : "Visuel actif"}
                                      </Badge>
                                    );
                                  })()}
                                </div>

                                {option.description && (
                                  <p className="text-xs text-slate-600 mt-1">{option.description}</p>
                                )}

                                {(option.event_categories && option.event_categories.length > 0) && (
                                  <p className="text-xs text-blue-600 mt-1">Limité à : {option.event_categories.join(', ')}</p>
                                )}
                                {option.linked_equipment_id && (() => {
                                  const eq = equipmentList.find(eq => eq.id === option.linked_equipment_id);
                                  if (!eq) return <p className="text-xs text-rose-500 mt-1">Équipement lié introuvable</p>;
                                  return (
                                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                      <Music className="w-3.5 h-3.5 shrink-0" /> 
                                      <span>Lié à :</span>
                                      {eq.category && (
                                        <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                          {eq.category}
                                        </span>
                                      )}
                                      {eq.reference && (
                                        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded">
                                          {eq.reference}
                                        </span>
                                      )}
                                      <span className="font-semibold text-slate-700">{eq.name}</span>
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 self-end md:self-center shrink-0">
                        {(() => {
                          const optPhotos = (Array.isArray(option.image_urls) && option.image_urls.length > 0)
                            ? option.image_urls
                            : (option.image_url ? [option.image_url] : []);
                          if (optPhotos.length === 0 || editingOptionIndex === index) return null;
                          return (
                            <Button 
                              onClick={() => setPreviewOptionImageModal({ 
                                open: true, 
                                title: option.name, 
                                imageUrl: optPhotos[0], 
                                imageUrls: optPhotos, 
                                price: option.price, 
                                description: option.description 
                              })} 
                              size="sm" 
                              variant="ghost" 
                              className="text-indigo-600 hover:bg-indigo-50"
                              title={optPhotos.length > 1 ? "Voir le diaporama des photos (3s)" : "Voir l'infographie en plein écran"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        <Button onClick={() => moveOption(index, 'up')} disabled={index === 0 || isSaving} size="sm" variant="ghost" title="Monter"><ChevronUp className="h-4 w-4" /></Button>
                        <Button onClick={() => moveOption(index, 'down')} disabled={index === selectedOptions.length - 1 || isSaving} size="sm" variant="ghost" title="Descendre"><ChevronDown className="h-4 w-4" /></Button>
                        <Button onClick={() => setEditingOptionIndex(editingOptionIndex === index ? null : index)} size="sm" variant="outline" disabled={isSaving} title="Modifier"><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => deleteOption(index)} size="sm" variant="destructive" disabled={isSaving} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-5 bg-slate-50/50 p-4 rounded-xl border">
                  <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Ajouter une nouvelle option
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Les options ajoutées sont immédiatement disponibles dans les contrats et l'application DJ Client.</p>
                  
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 w-full">
                        <Label className="text-xs font-medium text-slate-700 mb-1 block">Nom de l'option *</Label>
                        <Input placeholder="Ex: Machine à fumée lourde, Éclairage d'ambiance..." value={newOption.name} onChange={(e) => setNewOption({...newOption, name: e.target.value})} className="w-full bg-white" disabled={isSaving} />
                      </div>
                      <div className="w-full sm:w-32">
                        <Label className="text-xs font-medium text-slate-700 mb-1 block">Tarif TTC (€) *</Label>
                        <Input type="number" placeholder="0" value={newOption.price} onChange={(e) => setNewOption({...newOption, price: parseFloat(e.target.value) || 0})} className="w-full bg-white" disabled={isSaving} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-slate-700 mb-1 block">Description / Détails (optionnel)</Label>
                      <Input 
                        placeholder="Description succincte de ce que comprend l'option..." 
                        value={newOption.description || ""} 
                        onChange={(e) => setNewOption({...newOption, description: e.target.value})} 
                        className="w-full bg-white text-sm" 
                        disabled={isSaving} 
                      />
                    </div>

                    {/* Section Images pour la nouvelle option */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          Images / Infographies ({newOption.image_urls && newOption.image_urls.length > 0 ? newOption.image_urls.length : (newOption.image_url ? 1 : 0)})
                        </Label>
                        {(newOption.image_urls && newOption.image_urls.length > 0 || newOption.image_url) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-indigo-600 hover:bg-indigo-50 px-2 flex items-center gap-1"
                            onClick={() => setPreviewOptionImageModal({
                              open: true,
                              title: newOption.name || "Aperçu Option",
                              imageUrl: newOption.image_urls && newOption.image_urls.length > 0 ? newOption.image_urls[0] : newOption.image_url,
                              imageUrls: newOption.image_urls && newOption.image_urls.length > 0 ? newOption.image_urls : (newOption.image_url ? [newOption.image_url] : []),
                              price: newOption.price,
                              description: newOption.description
                            })}
                          >
                            <Eye className="w-3 h-3" /> Diaporama
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ces infographies/images seront affichées en diaporama au client lorsqu'il cliquera sur l'icône <Info className="w-3 h-3 inline text-indigo-600" /> dans son espace.
                      </p>

                      {((newOption.image_urls && newOption.image_urls.length > 0) || newOption.image_url) && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 my-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {(newOption.image_urls && newOption.image_urls.length > 0 ? newOption.image_urls : [newOption.image_url]).map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group rounded-md border border-slate-200 overflow-hidden bg-white aspect-square">
                              <img
                                src={img}
                                alt={`Image ${imgIdx + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => setPreviewOptionImageModal({
                                  open: true,
                                  title: newOption.name || "Aperçu Option",
                                  imageUrl: img,
                                  imageUrls: newOption.image_urls && newOption.image_urls.length > 0 ? newOption.image_urls : [newOption.image_url],
                                  price: newOption.price,
                                  description: newOption.description
                                })}
                              />
                              <button
                                type="button"
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveOptionImage(imgIdx);
                                }}
                                title="Supprimer cette image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              {imgIdx === 0 && (
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-medium">
                                  Principale
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-white p-4 border border-dashed border-slate-300 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-indigo-400 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            {isUploadingOptionImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800">
                              {((newOption.image_urls && newOption.image_urls.length > 0) || newOption.image_url) 
                                ? "Ajouter d'autres images" 
                                : "Ajouter des infographies / images"}
                            </p>
                            <p className="text-[11px] text-slate-400">Formats: PNG, JPG, WebP (sélection multiple)</p>
                          </div>
                        </div>
                        <label className="cursor-pointer shrink-0">
                          <input 
                            ref={newOptionFileInputRef}
                            type="file" 
                            multiple
                            accept="image/png,image/jpeg,image/jpg,image/webp" 
                            className="hidden" 
                            disabled={isUploadingOptionImage || isSaving}
                            onChange={(e) => {
                              if (e.target.files?.length) handleUploadImagesForNewOption(e.target.files);
                            }} 
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium transition">
                            {isUploadingOptionImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {isUploadingOptionImage ? "En cours..." : "Parcourir"}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Afficher pour les types d'événements :</Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewOption({ ...newOption, event_categories: [...EVENT_CATEGORIES] })}
                            className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                          >
                            Tout cocher
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setNewOption({ ...newOption, event_categories: [] })}
                            className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                          >
                            Tout décocher
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_CATEGORIES.map(cat => (
                          <label key={cat} className="flex items-center space-x-1.5 border px-2 py-1 rounded bg-white hover:bg-slate-50 cursor-pointer text-xs transition-colors">
                            <input type="checkbox" className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300" checked={(newOption.event_categories || []).includes(cat)} onChange={(e) => {
                              let cats = [...(newOption.event_categories || [])];
                              if (e.target.checked) cats.push(cat); else cats = cats.filter(c => c !== cat);
                              setNewOption({...newOption, event_categories: cats});
                            }} />
                            <span className="text-xs font-medium text-slate-700">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-700">Liaison avec le parc matériel (Optionnel) :</Label>
                      <EquipmentSearchSelector 
                        equipmentList={equipmentList}
                        value={newOption.linked_equipment_id || ""}
                        onChange={(val) => setNewOption({...newOption, linked_equipment_id: val})}
                      />
                      <p className="text-[11px] text-slate-500">
                        Si un équipement est lié, une réservation sera automatiquement créée lorsque le contrat comportant cette option sera signé.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button onClick={addNewOption} disabled={!newOption.name.trim() || isSaving || isUploadingOptionImage} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        {isSaving ? "Ajout en cours..." : "Ajouter l'option matériel"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Techniques */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Notes Techniques</CardTitle>
                <CardDescription>Ajoutez, modifiez, réorganisez ou supprimez les notes techniques prédéfinies</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-600 mb-4">Les notes ajoutées sont sauvegardées définitivement. Utilisez les flèches pour réorganiser l'ordre.</p>
                <div className="space-y-4 mb-6">
                  {orderedNotes.map((note, index) => (
                    <div key={note.key} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div className="flex-1">
                        <h3 className="font-medium">{note.title}</h3>
                        <div className="text-sm text-slate-600 mt-1">
                          {note.content.replace(/\)\}/g, '').replace(/\}+/g, '').replace(/\)+$/g, '').split('\n').slice(0, 2).join(' ').trim().substring(0, 100)}...
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => moveNote(index, 'up')} disabled={index === 0 || isSaving} size="sm" variant="ghost"><ChevronUp className="h-4 w-4" /></Button>
                        <Button onClick={() => moveNote(index, 'down')} disabled={index === orderedNotes.length - 1 || isSaving} size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                        <Button onClick={() => openEditModal(note.key, note)} size="sm" variant="outline" disabled={isSaving}><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => deleteNote(note.key)} size="sm" variant="destructive" disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Ajouter une nouvelle note technique</h3>
                  <div className="space-y-4">
                    <Input value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} disabled={isSaving} />
                    <Textarea value={newNote.content} onChange={(e) => setNewNote({...newNote, content: e.target.value})} rows={6} disabled={isSaving} />
                    <Button onClick={addNewNote} disabled={!newNote.title.trim() || !newNote.content.trim() || isSaving}>
                      <Plus className="h-4 w-4 mr-2" />{isSaving ? "Ajout en cours..." : "Ajouter la note"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDF Notes Techniques */}
          <TabsContent value="pdf_notes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des PDF Notes Techniques</CardTitle>
                <CardDescription>Uploadez vos infographies PDF et organisez leur ordre de compilation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {/* Item par défaut (Déroulement de soirée) */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex items-center space-x-3">
                      <FileDown className="h-5 w-5 text-orange-500" />
                      <div>
                        <h3 className="font-medium text-orange-900">Déroulement de soirée</h3>
                        <p className="text-xs text-orange-700">Inclus par défaut (Généré dynamiquement)</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Système</Badge>
                  </div>

                  {pdfNotes.map((note, index) => (
                    <div key={note.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium text-slate-800">{note.title}</h3>
                          <p className="text-xs text-slate-500">{note.filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => movePdfNote(index, 'up')} disabled={index === 0} size="sm" variant="ghost">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => movePdfNote(index, 'down')} disabled={index === pdfNotes.length - 1} size="sm" variant="ghost">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deletePdfNote(note.id)} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Uploader un nouveau PDF</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Titre du PDF</Label>
                      <Input 
                        placeholder="Ex: Guide Photobooth" 
                        value={newPdfNote.title}
                        onChange={(e) => setNewPdfNote({...newPdfNote, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier PDF</Label>
                      <div className="flex space-x-2">
                        <Input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => setNewPdfNote({...newPdfNote, file: e.target.files[0]})}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handlePdfUpload} 
                          disabled={!newPdfNote.file || isUploadingPdf}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isUploadingPdf ? "..." : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modèles CGV */}
          <TabsContent value="cgv">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Modèles CGV</CardTitle>
                <CardDescription>Gérez les différentes conditions générales de vente pour vos types d'événements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {Object.entries(cgvTemplates || {}).map(([key, cgv]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 capitalize">{key.replace(/_/g, ' ')}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{cgv.content.substring(0, 100)}...</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => openCgvEditModal(key, cgv)} size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deleteCgv(key)} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {Object.keys(cgvTemplates || {}).length === 0 && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      Aucun modèle de CGV configuré
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Ajouter un nouveau modèle de CGV</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom du modèle (ex: Mariage, Entreprise...)</Label>
                      <Input 
                        placeholder="Nom du modèle" 
                        value={newCgv.name}
                        onChange={(e) => setNewCgv({...newCgv, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contenu des CGV</Label>
                      <Textarea 
                        placeholder="Texte des conditions générales de vente..." 
                        rows={10}
                        value={newCgv.content}
                        onChange={(e) => setNewCgv({...newCgv, content: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={addNewCgv} 
                      disabled={!newCgv.name.trim() || !newCgv.content.trim() || isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? "Ajout..." : <><Plus className="h-4 w-4 mr-2" />Ajouter le modèle</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mails Freelances */}
          <TabsContent value="freelance_emails">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <span>Modèles d'Emails pour les Freelances / Artistes</span>
                </CardTitle>
                <CardDescription>
                  Gérez les modèles de courriels envoyés directement à vos artistes ou DJ freelances pour les informer de la signature d'un contrat de prestation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {freelanceTemplates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:border-indigo-150 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{t.name}</h3>
                          {t.is_default && (
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                              Par défaut
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-indigo-600 font-medium mt-1">Sujet : {t.subject}</p>
                        <div className="text-xs text-slate-550 mt-1 line-clamp-1 prose max-w-none" dangerouslySetInnerHTML={{ __html: t.body && !t.body.includes('<p>') && !t.body.includes('<div') && !t.body.includes('<br') ? t.body.replace(/\n/g, '<br />') : (t.body || '') }}></div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-4">
                        {!t.is_default && (
                          <Button 
                            onClick={() => setFreelanceTemplateAsDefault(t.id)} 
                            size="sm" 
                            variant="outline"
                            className="text-slate-600 text-xs border-slate-350 hover:bg-slate-50"
                          >
                            Par défaut
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            setEditingFreelanceTemplate({ ...t });
                            setIsFreelanceModalOpen(true);
                          }} 
                          size="sm" 
                          variant="outline"
                          className="border-slate-300 hover:bg-slate-50"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button 
                          onClick={() => deleteFreelanceTemplate(t.id)} 
                          size="sm" 
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {freelanceTemplates.length === 0 && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      Aucun modèle configuré
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-600" />
                    <span>Créer un nouveau modèle</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-750 text-xs font-semibold">Nom interne du modèle (Ex: Validation, Félicitations...)</Label>
                        <Input 
                          placeholder="Ex: Confirmation de prestation" 
                          value={newFreelanceTemplate.name}
                          onChange={(e) => setNewFreelanceTemplate({...newFreelanceTemplate, name: e.target.value})}
                          className="border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-750 text-xs font-semibold">Sujet de l'email</Label>
                        <Input 
                          placeholder="Ex: Bonne nouvelle ! Votre contrat pour {{client_name}} est rentré" 
                          value={newFreelanceTemplate.subject}
                          onChange={(e) => setNewFreelanceTemplate({...newFreelanceTemplate, subject: e.target.value})}
                          className="border-slate-300 bg-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-750 text-xs font-semibold">Contenu du message (Formatage simple ou HTML)</Label>
                      <RichTextHelper 
                        placeholder="Bonjour {{artist_name}}, nous avons le plaisir de vous annoncer..." 
                        rows={10}
                        value={newFreelanceTemplate.body}
                        onChange={(val) => setNewFreelanceTemplate({...newFreelanceTemplate, body: val})}
                        disabled={isSaving}
                      />
                    </div>
                    <Button 
                      onClick={addFreelanceTemplate} 
                      disabled={!newFreelanceTemplate.name.trim() || !newFreelanceTemplate.subject.trim() || !newFreelanceTemplate.body.trim() || isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isSaving ? "Création..." : <><Plus className="h-4 w-4 mr-2" />Ajouter le modèle de mail</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mails Clients */}
          <TabsContent value="client_emails">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  <span>Modèles d'Emails de Confirmation & Accès pour les Clients / Mariés</span>
                </CardTitle>
                <CardDescription>
                  Gérez les modèles de courriels proposés lors de la signature d'un contrat pour confirmer la réception du contrat signé, de l'acompte et donner l'accès à l'Espace DJ / Client.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {clientTemplates.map((t) => (
                    <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:border-emerald-200 transition-colors gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{t.name}</h3>
                          {t.is_default && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300">
                              Par défaut
                            </Badge>
                          )}
                          {t.category === 'contrat_acompte' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                              Contrat & Acompte
                            </Badge>
                          )}
                          {t.category === 'contrat_seul' && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-normal">
                              Contrat seul
                            </Badge>
                          )}
                          {t.category === 'lien_espace_dj' && (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-normal">
                              Lien Espace DJ
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-emerald-700 font-medium mt-1">Sujet : {t.subject}</p>
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 whitespace-pre-line font-sans bg-slate-50 p-2 rounded border border-slate-100">{cleanPlainText(t.body)}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {!t.is_default && (
                          <Button 
                            onClick={() => setClientTemplateAsDefault(t.id)} 
                            size="sm" 
                            variant="outline"
                            className="text-slate-600 text-xs border-slate-300 hover:bg-slate-50"
                          >
                            Par défaut
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            setEditingClientTemplate({ ...t, body: cleanPlainText(t.body) });
                            setIsClientModalOpen(true);
                          }} 
                          size="sm" 
                          variant="outline"
                          className="border-slate-300 hover:bg-slate-50"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button 
                          onClick={() => deleteClientTemplate(t.id)} 
                          size="sm" 
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {clientTemplates.length === 0 && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      Aucun modèle client configuré
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-emerald-600" />
                    <span>Créer un nouveau modèle pour les clients</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 text-xs font-semibold">Nom interne du modèle</Label>
                        <Input 
                          placeholder="Ex: Contrat & Acompte reçus" 
                          value={newClientTemplate.name}
                          onChange={(e) => setNewClientTemplate({...newClientTemplate, name: e.target.value})}
                          className="border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 text-xs font-semibold">Catégorie / Utilisation</Label>
                        <select
                          className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={newClientTemplate.category || "contrat_acompte"}
                          onChange={(e) => setNewClientTemplate({...newClientTemplate, category: e.target.value})}
                        >
                          <option value="contrat_acompte">Contrat signé et acompte reçu</option>
                          <option value="contrat_seul">Contrat signé uniquement</option>
                          <option value="lien_espace_dj">Lien d'accès à l'Espace DJ uniquement</option>
                          <option value="autre">Autre modèle client</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 text-xs font-semibold">Sujet de l'email</Label>
                        <Input 
                          placeholder="Ex: Confirmation de votre contrat & Espace DJ : {{client_name}}" 
                          value={newClientTemplate.subject}
                          onChange={(e) => setNewClientTemplate({...newClientTemplate, subject: e.target.value})}
                          className="border-slate-300 bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Variables disponibles :</span>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{client_name}}"}</code>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{client_dj_link}}"}</code>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_date}}"}</code>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_type}}"}</code>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_location}}"}</code>
                      <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{dj_name}}"}</code>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 text-xs font-semibold">Contenu du message (Texte simple, clair et sans code HTML)</Label>
                      <Textarea 
                        placeholder="Bonjour {{client_name}}, nous vous confirmons avoir bien reçu votre contrat signé et votre acompte..." 
                        rows={10}
                        value={newClientTemplate.body}
                        onChange={(e) => setNewClientTemplate({...newClientTemplate, body: e.target.value})}
                        disabled={isSaving}
                        className="w-full text-sm font-sans leading-relaxed border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 bg-white p-3.5 shadow-sm min-h-[200px] text-slate-800 rounded-lg placeholder:text-slate-400"
                      />
                    </div>
                    <Button 
                      onClick={addClientTemplate} 
                      disabled={!newClientTemplate.name.trim() || !newClientTemplate.subject.trim() || !newClientTemplate.body.trim() || isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSaving ? "Création..." : <><Plus className="h-4 w-4 mr-2" />Ajouter le modèle de mail client</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal d'édition CGV */}
        <Dialog open={isCgvModalOpen} onOpenChange={setIsCgvModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le modèle CGV : {editingCgvKey?.replace(/_/g, ' ')}</DialogTitle>
              <DialogDescription>Modifiez le contenu de vos conditions générales de vente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cgv-title">Nom / Titre du modèle de CGV</Label>
                <Input id="cgv-title" value={editingCgvData.name || ""} onChange={(e) => setEditingCgvData({...editingCgvData, name: e.target.value})} disabled={isSaving} placeholder="Ex: Conditions Générales de Vente" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cgv-content">Contenu des CGV</Label>
                <Textarea id="cgv-content" value={editingCgvData.content} onChange={(e) => setEditingCgvData({...editingCgvData, content: e.target.value})} rows={18} disabled={isSaving} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCgvModalOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedCgv} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la note technique</DialogTitle>
              <DialogDescription>Modifiez le titre et le contenu de la note technique. Les changements seront sauvegardés définitivement.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre de la note</Label>
                <Input id="edit-title" value={editingNoteData.title} onChange={(e) => setEditingNoteData({...editingNoteData, title: e.target.value})} disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Contenu de la note</Label>
                <Textarea id="edit-content" value={editingNoteData.content} onChange={(e) => setEditingNoteData({...editingNoteData, content: e.target.value})} rows={12} disabled={isSaving} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingNoteData({ key: "", title: "", content: "" }); }} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedNote} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition Modèle Freelance */}
        <Dialog open={isFreelanceModalOpen} onOpenChange={setIsFreelanceModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le modèle freelance</DialogTitle>
              <DialogDescription>Modifiez le contenu du modèle d'email destiné à être envoyé à l'artiste.</DialogDescription>
            </DialogHeader>
            {editingFreelanceTemplate && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="freelance-name" className="text-slate-700 font-medium">Nom du modèle</Label>
                  <Input 
                    id="freelance-name" 
                    value={editingFreelanceTemplate.name || ""} 
                    onChange={(e) => setEditingFreelanceTemplate({...editingFreelanceTemplate, name: e.target.value})} 
                    disabled={isSaving} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freelance-subject" className="text-slate-700 font-medium">Sujet du courriel</Label>
                  <Input 
                    id="freelance-subject" 
                    value={editingFreelanceTemplate.subject || ""} 
                    onChange={(e) => setEditingFreelanceTemplate({...editingFreelanceTemplate, subject: e.target.value})} 
                    disabled={isSaving} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freelance-body" className="text-slate-700 font-medium">Contenu de l'email (Formatage simple ou HTML)</Label>
                  <RichTextHelper 
                    placeholder="Bonjour {{artist_name}}, ..." 
                    rows={12}
                    value={editingFreelanceTemplate.body || ""}
                    onChange={(val) => setEditingFreelanceTemplate({...editingFreelanceTemplate, body: val})}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsFreelanceModalOpen(false); setEditingFreelanceTemplate(null); }} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedFreelanceTemplate} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition Modèle Client */}
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le modèle client</DialogTitle>
              <DialogDescription>Modifiez le contenu du modèle d'email destiné aux mariés / clients.</DialogDescription>
            </DialogHeader>
            {editingClientTemplate && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-tpl-name" className="text-slate-700 font-medium text-xs">Nom du modèle</Label>
                    <Input 
                      id="client-tpl-name" 
                      value={editingClientTemplate.name || ""} 
                      onChange={(e) => setEditingClientTemplate({...editingClientTemplate, name: e.target.value})} 
                      disabled={isSaving} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-tpl-category" className="text-slate-700 font-medium text-xs">Catégorie</Label>
                    <select
                      id="client-tpl-category"
                      className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editingClientTemplate.category || "contrat_acompte"}
                      onChange={(e) => setEditingClientTemplate({...editingClientTemplate, category: e.target.value})}
                      disabled={isSaving}
                    >
                      <option value="contrat_acompte">Contrat signé et acompte reçu</option>
                      <option value="contrat_seul">Contrat signé uniquement</option>
                      <option value="lien_espace_dj">Lien d'accès à l'Espace DJ uniquement</option>
                      <option value="autre">Autre modèle client</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-tpl-subject" className="text-slate-700 font-medium text-xs">Sujet du courriel</Label>
                  <Input 
                    id="client-tpl-subject" 
                    value={editingClientTemplate.subject || ""} 
                    onChange={(e) => setEditingClientTemplate({...editingClientTemplate, subject: e.target.value})} 
                    disabled={isSaving} 
                  />
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Variables disponibles :</span>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{client_name}}"}</code>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{client_dj_link}}"}</code>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_date}}"}</code>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_type}}"}</code>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{event_location}}"}</code>
                  <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{"{{dj_name}}"}</code>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-tpl-body" className="text-slate-700 font-semibold text-xs">Contenu du message (Texte simple, clair et sans code HTML)</Label>
                  <Textarea 
                    id="client-tpl-body"
                    placeholder="Bonjour {{client_name}}, ..." 
                    rows={12}
                    value={editingClientTemplate.body || ""}
                    onChange={(e) => setEditingClientTemplate({...editingClientTemplate, body: e.target.value})}
                    disabled={isSaving}
                    className="w-full text-sm font-sans leading-relaxed border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 bg-white p-3.5 shadow-sm min-h-[220px] text-slate-800 rounded-lg placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsClientModalOpen(false); setEditingClientTemplate(null); }} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedClientTemplate} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'aperçu d'infographie plein écran pour Option Matériel */}
        <Dialog open={previewOptionImageModal.open} onOpenChange={(open) => setPreviewOptionImageModal(prev => ({ ...prev, open }))}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-slate-950 border-slate-800 text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    {previewOptionImageModal.title}
                    {previewOptionImageModal.price !== null && previewOptionImageModal.price !== undefined && (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                        {previewOptionImageModal.price} €
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Infographie et détails de l'option matériel
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col items-center justify-center overflow-y-auto max-h-[75vh] bg-slate-950/50">
              {previewOptionImageModal.imageUrls && previewOptionImageModal.imageUrls.length > 0 ? (
                <div className="w-full max-w-3xl aspect-[4/3] relative">
                  <ImageSlideshow 
                    images={previewOptionImageModal.imageUrls}
                    autoPlay={true}
                    interval={3000}
                    className="w-full h-full rounded-lg shadow-2xl border border-slate-800"
                  />
                </div>
              ) : previewOptionImageModal.imageUrl ? (
                <div className="relative group max-w-full">
                  <img 
                    src={previewOptionImageModal.imageUrl} 
                    alt={previewOptionImageModal.title} 
                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl border border-slate-800"
                  />
                </div>
              ) : (
                <div className="py-12 text-slate-500 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p>Aucune infographie disponible pour cette option.</p>
                </div>
              )}

              {previewOptionImageModal.description && (
                <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 max-w-xl text-center">
                  {previewOptionImageModal.description}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
              {previewOptionImageModal.imageUrl && (
                <a 
                  href={previewOptionImageModal.imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Ouvrir l'image originale
                </a>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPreviewOptionImageModal(prev => ({ ...prev, open: false }))}
                className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 ml-auto"
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
