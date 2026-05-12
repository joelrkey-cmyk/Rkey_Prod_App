import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  FileText, Send, Eye, Euro, Mail, Plus, Trash2, Edit2, Save, Star, Loader2,
  CheckCircle, Image as ImageIcon, Settings2, ChevronUp, ChevronDown, XCircle, History
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import api from '../services/api';
import FormSubmissionsSelector from './FormSubmissionsSelector';
import VariableInsertMenu, { VARIABLES } from './VariableInsertMenu';
import { useEmailSignature } from '../hooks/useEmailSignature';

// Modules extraits
import { quillModules, quillFormats, categoryLabels, initialManualQuoteForm } from './devis/constants';
import { SuiviTab } from './devis/SuiviTab';
import {
  PdfPreviewDialog, TemplateDialog, EditPageDialog, AddPageDialog,
  PagePreviewDialog, RelanceDialog, NotesDialog, ManualQuoteDialog
} from './devis/DevisDialogs';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DevisEnvoiApp = () => {
  const { signatureHtml } = useEmailSignature();
  // ═══════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [priceAmount, setPriceAmount] = useState('');
  const [priceType, setPriceType] = useState('TTC');
  const [eventDate, setEventDate] = useState('');
  const [eventDateType, setEventDateType] = useState('full');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', is_default: false });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [endTime, setEndTime] = useState('');
  const [unlimitedTime, setUnlimitedTime] = useState(false);
  const [showPageManagement, setShowPageManagement] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageForm, setPageForm] = useState({ label: '', category: 'artiste', is_tarif: false });
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [newPageFile, setNewPageFile] = useState(null);
  const [uploadingPage, setUploadingPage] = useState(false);
  const [pagePreviewData, setPagePreviewData] = useState(null);
  const [showPagePreview, setShowPagePreview] = useState(false);
  const fileInputRef = useRef(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'suivi' ? 'suivi' : 'envoi';
  });
  const [sentQuotes, setSentQuotes] = useState([]);
  const [loadingSentQuotes, setLoadingSentQuotes] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [selectedQuoteForRelance, setSelectedQuoteForRelance] = useState(null);
  const [relanceNote, setRelanceNote] = useState('');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedQuoteForNotes, setSelectedQuoteForNotes] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [showAddManualDialog, setShowAddManualDialog] = useState(false);
  const [manualQuoteForm, setManualQuoteForm] = useState(initialManualQuoteForm);
  const [manualQuoteFile, setManualQuoteFile] = useState(null);
  const [savingManualQuote, setSavingManualQuote] = useState(false);
  const manualFileInputRef = useRef(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const quillRef = useRef(null);
  const subjectInputRef = useRef(null);

  // Handle submission selection - pre-fill fields
  const handleSubmissionSelect = (fields) => {
    if (fields.email) setRecipientEmail(fields.email);
    if (fields.date_evenement) {
      const raw = fields.date_evenement;
      const parsed = parseDateToISO(raw);
      if (parsed) {
        setEventDate(parsed);
        setEventDateType('full');
      } else {
        setEventDate(raw);
        setEventDateType('text');
      }
    }
    setSelectedSubmission(fields);
  };

  // Clear imported submission
  const handleClearSubmission = () => {
    setSelectedSubmission(null);
  };

  // Parse date to yyyy-mm-dd (for the HTML date input)
  const parseDateToISO = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  };

  // Format date as JJ-MM-AAAA for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parsed = parseDateToISO(dateStr);
    if (parsed) {
      const [y, m, d] = parsed.split('-');
      return `${d}-${m}-${y}`;
    }
    return dateStr;
  };

  // Insert variable at cursor in email body (ReactQuill)
  const handleInsertVariable = (variable) => {
    const quill = document.querySelector('.ql-editor');
    if (quill) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && quill.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const textNode = document.createTextNode(variable);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        setEmailBody(quill.innerHTML);
      } else {
        setEmailBody(prev => prev ? prev.replace(/<\/p>(?![\s\S]*<\/p>)/, `${variable}</p>`) : `<p>${variable}</p>`);
      }
    } else {
      setEmailBody(prev => prev ? prev.replace(/<\/p>(?![\s\S]*<\/p>)/, `${variable}</p>`) : `<p>${variable}</p>`);
    }
  };

  // Insert variable at cursor in email subject
  const handleInsertSubjectVariable = (variable) => {
    const input = subjectInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = emailSubject || '';
      const newVal = current.slice(0, start) + variable + current.slice(end);
      setEmailSubject(newVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setEmailSubject(prev => prev + variable);
    }
  };

  // Replace variables in text with actual values
  const replaceVariables = (text, data) => {
    if (!text || !data) return text;
    let result = text;
    VARIABLES.forEach(v => {
      const field = v.key.replace(/[{}]/g, '');
      const value = data[field] || '';
      result = result.split(v.key).join(value);
    });
    return result;
  };

  // ═══════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════
  useEffect(() => { fetchPages(); fetchTemplates(); fetchSentQuotes(); }, []);

  // Initialize email body with signature when loaded
  useEffect(() => {
    if (signatureHtml && !emailBody) {
      setEmailBody(signatureHtml);
    }
  }, [signatureHtml]);

  const fetchPages = async () => {
    try { setLoadingPages(true); const response = await api.get('/devis2/pages'); setAvailablePages(response.data.pages || []); }
    catch (error) { console.error('Error fetching pages:', error); toast.error('Erreur lors du chargement des pages'); }
    finally { setLoadingPages(false); }
  };

  const fetchTemplates = async () => {
    try { const response = await api.get('/devis2/templates'); setTemplates(response.data.templates || []); }
    catch (error) { console.error('Error fetching templates:', error); }
  };

  const fetchSentQuotes = async () => {
    setLoadingSentQuotes(true);
    try { const response = await api.get('/devis2/sent'); setSentQuotes(response.data.quotes || []); }
    catch (error) { console.error('Error fetching sent quotes:', error); }
    finally { setLoadingSentQuotes(false); }
  };

  // ═══════════════════════════════════════════
  // SUIVI OPERATIONS
  // ═══════════════════════════════════════════
  const updateQuoteStatus = async (quoteId, newStatus) => {
    try { await api.put(`/devis2/sent/${quoteId}`, { status: newStatus }); setSentQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q)); toast.success('Statut mis à jour'); }
    catch (error) { console.error('Error updating status:', error); toast.error('Erreur lors de la mise à jour'); }
  };

  const addRelance = async () => {
    if (!selectedQuoteForRelance || !relanceNote.trim()) return;
    try {
      const response = await api.post(`/devis2/sent/${selectedQuoteForRelance.id}/relances`, { note: relanceNote });
      setSentQuotes(prev => prev.map(q => q.id === selectedQuoteForRelance.id ? { ...q, relances: [...(q.relances || []), response.data.relance], status: 'a_relancer' } : q));
      setShowRelanceDialog(false); setRelanceNote(''); setSelectedQuoteForRelance(null); toast.success('Relance ajoutée');
    } catch (error) { console.error('Error adding relance:', error); toast.error('Erreur lors de l\'ajout de la relance'); }
  };

  const saveNotes = async () => {
    if (!selectedQuoteForNotes) return;
    try { await api.put(`/devis2/sent/${selectedQuoteForNotes.id}`, { notes: notesText }); setSentQuotes(prev => prev.map(q => q.id === selectedQuoteForNotes.id ? { ...q, notes: notesText } : q)); setShowNotesDialog(false); setNotesText(''); setSelectedQuoteForNotes(null); toast.success('Notes enregistrées'); }
    catch (error) { console.error('Error saving notes:', error); toast.error('Erreur lors de l\'enregistrement'); }
  };

  const deleteQuote = async (quoteId) => {
    if (!window.confirm('Supprimer ce devis du suivi ?')) return;
    try { await api.delete(`/devis2/sent/${quoteId}`); setSentQuotes(prev => prev.filter(q => q.id !== quoteId)); toast.success('Devis supprimé du suivi'); }
    catch (error) { console.error('Error deleting quote:', error); toast.error('Erreur lors de la suppression'); }
  };

  const addManualQuote = async () => {
    if (!manualQuoteForm.recipient_email.trim()) { toast.error('L\'email du destinataire est requis'); return; }
    setSavingManualQuote(true);
    try {
      let fileData = null, fileName = null;
      if (manualQuoteFile) {
        const reader = new FileReader();
        fileData = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(manualQuoteFile); });
        fileName = manualQuoteFile.name;
      }
      const response = await api.post('/devis2/sent/manual', { ...manualQuoteForm, file_data: fileData, file_name: fileName });
      setSentQuotes(prev => [response.data.quote, ...prev]); setShowAddManualDialog(false); setManualQuoteForm(initialManualQuoteForm); setManualQuoteFile(null); toast.success('Devis ajouté au suivi');
    } catch (error) { console.error('Error adding manual quote:', error); toast.error('Erreur lors de l\'ajout'); }
    finally { setSavingManualQuote(false); }
  };

  const downloadQuoteFile = async (quoteId, fileName) => {
    try {
      const response = await api.get(`/devis2/sent/${quoteId}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', fileName || 'devis.pdf'); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { console.error('Error downloading file:', error); toast.error('Erreur lors du téléchargement'); }
  };

  const filteredSentQuotes = useMemo(() => {
    return sentQuotes.filter(q => {
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchesSearch = !searchFilter || q.recipient_email?.toLowerCase().includes(searchFilter.toLowerCase()) || q.recipient_name?.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [sentQuotes, statusFilter, searchFilter]);

  // ═══════════════════════════════════════════
  // PAGE MANAGEMENT
  // ═══════════════════════════════════════════
  const handlePageToggle = (pageKey) => {
    setSelectedPages(prev => prev.includes(pageKey) ? prev.filter(k => k !== pageKey) : [...prev, pageKey]);
    setPdfPreview(null);
  };

  const getOrderedSelectedPages = () => {
    const categoryOrder = ['artiste', 'tarif', 'option', 'photos', 'hypnose'];
    const pagesByCategory = {}; categoryOrder.forEach(cat => { pagesByCategory[cat] = []; });
    availablePages.forEach(page => { if (selectedPages.includes(page.id)) { const category = page.category || 'artiste'; if (pagesByCategory[category]) { pagesByCategory[category].push(page.id); } else { if (!pagesByCategory['_other']) pagesByCategory['_other'] = []; pagesByCategory['_other'].push(page.id); } } });
    const orderedPages = []; categoryOrder.forEach(cat => { orderedPages.push(...pagesByCategory[cat]); });
    if (pagesByCategory['_other']) { orderedPages.push(...pagesByCategory['_other']); }
    return orderedPages;
  };

  const movePage = async (pageId, direction) => {
    const currentIndex = availablePages.findIndex(p => p.id === pageId); if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1; if (newIndex < 0 || newIndex >= availablePages.length) return;
    const newPages = [...availablePages]; [newPages[currentIndex], newPages[newIndex]] = [newPages[newIndex], newPages[currentIndex]];
    try { await api.post('/devis2/pages/reorder', { page_ids: newPages.map(p => p.id) }); setAvailablePages(newPages); toast.success('Ordre mis à jour'); }
    catch (error) { console.error('Error reordering pages:', error); toast.error('Erreur lors de la réorganisation'); }
  };

  const openEditPage = (page) => { setEditingPage(page); setPageForm({ label: page.label, category: page.category, is_tarif: page.is_tarif || false }); };

  const savePageEdit = async () => {
    if (!editingPage || !pageForm.label) { toast.error('Veuillez saisir un nom'); return; }
    try { await api.put(`/devis2/pages/${editingPage.id}`, pageForm); toast.success('Page mise à jour'); fetchPages(); setEditingPage(null); }
    catch (error) { console.error('Error updating page:', error); toast.error('Erreur lors de la mise à jour'); }
  };

  const deletePage = async (pageId) => {
    if (!window.confirm('Supprimer cette page ? Cette action est irréversible.')) return;
    try { await api.delete(`/devis2/pages/${pageId}`); toast.success('Page supprimée'); fetchPages(); setSelectedPages(prev => prev.filter(id => id !== pageId)); }
    catch (error) { console.error('Error deleting page:', error); toast.error('Erreur lors de la suppression'); }
  };

  const previewPage = async (pageId) => {
    try { const response = await api.get(`/devis2/pages/${pageId}/preview`); if (response.data.success) { setPagePreviewData(response.data); setShowPagePreview(true); } }
    catch (error) { console.error('Error previewing page:', error); toast.error('Erreur lors de l\'aperçu'); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; if (file) { if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image (PNG ou JPG)'); return; } setNewPageFile(file); }
  };

  const uploadNewPage = async () => {
    if (!newPageFile || !pageForm.label) { toast.error('Veuillez sélectionner un fichier et saisir un nom'); return; }
    try {
      setUploadingPage(true);
      const formData = new FormData(); 
      formData.append('file', newPageFile); 
      formData.append('label', pageForm.label); 
      formData.append('category', pageForm.category); 
      formData.append('is_tarif', pageForm.is_tarif);
      
      const data = await api.uploadDevisPage(formData);
      if (data.success) { 
        toast.success('Page ajoutée avec succès'); 
        fetchPages(); 
        setShowAddPageDialog(false); 
        setNewPageFile(null); 
        setPageForm({ label: '', category: 'options', is_tarif: false }); 
      }
      else { toast.error(data.detail || 'Erreur lors de l\'ajout'); }
    } catch (error) { 
      console.error('Error uploading page:', error); 
      toast.error(error.message || 'Erreur lors de l\'upload'); 
    }
    finally { setUploadingPage(false); }
  };

  const deleteOrphanedPages = async () => {
    const orphanedPages = availablePages.filter(p => p.exists === false);
    if (orphanedPages.length === 0) { toast.info('Aucune page orpheline à supprimer'); return; }
    if (!window.confirm(`Supprimer ${orphanedPages.length} page(s) orpheline(s) ? Cette action est irréversible.`)) return;
    try { const response = await api.delete('/devis2/pages/orphaned'); if (response.data.success) { toast.success(response.data.message); fetchPages(); } }
    catch (error) { console.error('Error deleting orphaned pages:', error); toast.error('Erreur lors de la suppression des pages orphelines'); }
  };

  const orphanedPagesCount = availablePages.filter(p => p.exists === false).length;

  // ═══════════════════════════════════════════
  // PDF & EMAIL
  // ═══════════════════════════════════════════
  const generatePdfPreview = async () => {
    if (selectedPages.length === 0) { toast.error('Veuillez sélectionner au moins une page'); return; }
    if (!priceAmount) { toast.error('Veuillez saisir un montant ou texte'); return; }
    if (!eventDate) { toast.error('Veuillez saisir la date ou l\'année de l\'événement'); return; }
    try {
      setGeneratingPdf(true);
      if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
      const orderedSelectedPages = getOrderedSelectedPages();
      const response = await api.post('/devis2/generate-pdf', { 
        selected_pages: orderedSelectedPages, 
        price_amount: priceAmount || null, 
        price_type: priceType,
        end_time: endTime,
        unlimited_time: unlimitedTime
      });
      if (response.data.success) {
        setPdfPreview(response.data.pdf_base64);
        const byteCharacters = atob(response.data.pdf_base64); const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
        const byteArray = new Uint8Array(byteNumbers); const blob = new Blob([byteArray], { type: 'application/pdf' });
        setPdfBlobUrl(URL.createObjectURL(blob)); setShowPreview(true); toast.success('PDF généré avec succès');
      }
    } catch (error) { console.error('Error generating PDF:', error); toast.error('Erreur lors de la génération du PDF'); }
    finally { setGeneratingPdf(false); }
  };

  const sendEmail = async () => {
    if (selectedPages.length === 0) { toast.error('Veuillez sélectionner au moins une page'); return; }
    if (!priceAmount) { toast.error('Veuillez saisir un montant ou texte'); return; }
    if (!eventDate) { toast.error('Veuillez saisir la date ou l\'année de l\'événement'); return; }
    if (!recipientEmail) { toast.error('Veuillez saisir l\'email du destinataire'); return; }
    if (!emailSubject) { toast.error('Veuillez saisir l\'objet du mail'); return; }
    try {
      setSendingEmail(true);
      const orderedSelectedPages = getOrderedSelectedPages();
      const formattedEventDate = eventDateType === 'full' ? eventDate.split('-').reverse().join('-') : eventDate;
      // Build variable data from manual fields + submission data
      const variableData = {
        ...(selectedSubmission || {}),
        date_evenement: formattedEventDate || (selectedSubmission && selectedSubmission.date_evenement) || '',
        email: recipientEmail || (selectedSubmission && selectedSubmission.email) || '',
      };
      const finalSubject = replaceVariables(emailSubject, variableData);
      const finalBody = replaceVariables(emailBody, variableData);
      const response = await api.post('/devis2/send-email', { 
        selected_pages: orderedSelectedPages, 
        price_amount: priceAmount || null, 
        price_type: priceType, 
        end_time: endTime,
        unlimited_time: unlimitedTime,
        event_date: formattedEventDate, 
        recipient_email: recipientEmail, 
        email_subject: finalSubject, 
        email_body: finalBody 
      });
      if (response.data.success) { toast.success(response.data.message); setRecipientEmail(''); setEmailSubject(''); setEmailBody(signatureHtml); }
    } catch (error) { console.error('Error sending email:', error); toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email'); }
    finally { setSendingEmail(false); }
  };

  // ═══════════════════════════════════════════
  // TEMPLATE MANAGEMENT
  // ═══════════════════════════════════════════
  const openTemplateDialog = (template = null) => {
    if (template) { setEditingTemplate(template); setTemplateForm({ name: template.name, subject: template.subject, body: template.body, is_default: template.is_default }); }
    else { setEditingTemplate(null); setTemplateForm({ name: '', subject: emailSubject, body: emailBody, is_default: false }); }
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name) { toast.error('Veuillez saisir un nom pour le template'); return; }
    if (!templateForm.subject && !templateForm.body) { toast.error('Le template doit avoir un objet ou un corps de message'); return; }
    try {
      setSavingTemplate(true);
      if (editingTemplate) { await api.put(`/devis2/templates/${editingTemplate.id}`, templateForm); toast.success('Template mis à jour'); }
      else { await api.post('/devis2/templates', templateForm); toast.success('Template créé'); }
      fetchTemplates(); setShowTemplateDialog(false);
    } catch (error) { console.error('Error saving template:', error); toast.error('Erreur lors de l\'enregistrement'); }
    finally { setSavingTemplate(false); }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    try { await api.delete(`/devis2/templates/${templateId}`); toast.success('Template supprimé'); fetchTemplates(); }
    catch (error) { console.error('Error deleting template:', error); toast.error('Erreur lors de la suppression'); }
  };

  const applyTemplate = (template) => { setEmailSubject(template.subject); setEmailBody(template.body); toast.success(`Template "${template.name}" appliqué`); };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><Send className="w-8 h-8 text-orange-500" />Envoi de Devis</h1>
          <p className="text-gray-600 mt-2">Générez et envoyez des devis PDF personnalisés à vos clients</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === 'envoi' ? 'default' : 'outline'} onClick={() => setActiveTab('envoi')} className={activeTab === 'envoi' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
            <Send className="w-4 h-4 mr-2" />Envoi
          </Button>
          <Button variant={activeTab === 'suivi' ? 'default' : 'outline'} onClick={() => { setActiveTab('suivi'); fetchSentQuotes(); }} className={activeTab === 'suivi' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
            <History className="w-4 h-4 mr-2" />Suivi ({sentQuotes.length})
          </Button>
        </div>

        {/* Suivi Tab (composant extrait) */}
        {activeTab === 'suivi' && (
          <SuiviTab
            filteredSentQuotes={filteredSentQuotes} sentQuotes={sentQuotes} loadingSentQuotes={loadingSentQuotes}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchFilter={searchFilter} setSearchFilter={setSearchFilter}
            updateQuoteStatus={updateQuoteStatus} setSelectedQuoteForRelance={setSelectedQuoteForRelance}
            setShowRelanceDialog={setShowRelanceDialog} setSelectedQuoteForNotes={setSelectedQuoteForNotes}
            setNotesText={setNotesText} setShowNotesDialog={setShowNotesDialog} deleteQuote={deleteQuote}
            downloadQuoteFile={downloadQuoteFile} setShowAddManualDialog={setShowAddManualDialog}
          />
        )}

        {/* Envoi Tab */}
        {activeTab === 'envoi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Price & Page Selection */}
          <div className="space-y-6">
            {/* Price Configuration */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Euro className="w-5 h-5 text-orange-500" />Configuration du Prix</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="price">Montant ou texte <span className="text-red-500">*</span></Label>
                      <Input id="price" type="text" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} className={`mt-1 ${!priceAmount ? 'border-red-300' : ''}`} data-testid="price-input" required />
                      {!priceAmount && <p className="text-xs text-red-500 mt-1">Champ obligatoire</p>}
                    </div>
                    <div className="w-32">
                      <Label>Mention</Label>
                      <Select value={priceType} onValueChange={setPriceType}>
                        <SelectTrigger className="mt-1" data-testid="price-type-select"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="TTC">TTC</SelectItem><SelectItem value="HT">HT</SelectItem><SelectItem value="NONE">Aucune</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type de date <span className="text-red-500">*</span></Label>
                        <Select value={eventDateType} onValueChange={(val) => { setEventDateType(val); setEventDate(''); }}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="full">Date complète</SelectItem><SelectItem value="year">Année seule</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="eventDate">{eventDateType === 'full' ? "Date de l'événement" : "Année de l'événement"} <span className="text-red-500">*</span></Label>
                        {eventDateType === 'full' ? (
                          <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`mt-1 ${!eventDate ? 'border-red-300' : ''}`} data-testid="event-date-input" required />
                        ) : (
                          <Input id="eventDate" type="number" min="2024" max="2100" placeholder="2026" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`mt-1 ${!eventDate ? 'border-red-300' : ''}`} data-testid="event-year-input" required />
                        )}
                        {!eventDate && <p className="text-xs text-red-500 mt-1">Champ obligatoire</p>}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label htmlFor="endTime">Heure de fin</Label>
                        <Input 
                          id="endTime" 
                          type="time" 
                          value={endTime} 
                          onChange={(e) => setEndTime(e.target.value)} 
                          className="mt-1"
                          disabled={unlimitedTime}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox 
                          id="unlimited" 
                          checked={unlimitedTime} 
                          onCheckedChange={(val) => setUnlimitedTime(!!val)} 
                          data-testid="unlimited-checkbox"
                        />
                        <Label htmlFor="unlimited" className="cursor-pointer">Sans limite horaire</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-orange-500" />Sélection des Pages</span>
                  <div className="flex gap-2">
                    {orphanedPagesCount > 0 && (
                      <Button size="sm" variant="destructive" onClick={deleteOrphanedPages} className="bg-red-500 hover:bg-red-600" title="Supprimer les pages dont les fichiers sont manquants">
                        <Trash2 className="w-4 h-4 mr-1" />Supprimer orphelines ({orphanedPagesCount})
                      </Button>
                    )}
                    <Button size="sm" onClick={() => { setPageForm({ label: '', category: 'artiste', is_tarif: false }); setNewPageFile(null); setShowAddPageDialog(true); }} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" />Ajouter
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPages ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /><span className="ml-2">Chargement...</span></div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(categoryLabels).map(([categoryKey, categoryLabel]) => {
                      const pagesInCategory = availablePages.filter(p => (p.category || 'artiste') === categoryKey);
                      if (pagesInCategory.length === 0) return null;
                      return (
                        <div key={categoryKey} className="space-y-1.5">
                          <h4 className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{categoryLabel}</h4>
                          {pagesInCategory.map((page) => {
                            const globalIndex = availablePages.findIndex(p => p.id === page.id);
                            return (
                              <div key={page.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ml-2 ${selectedPages.includes(page.id || page.key) ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                <Checkbox id={page.id || page.key} checked={selectedPages.includes(page.id || page.key)} onCheckedChange={() => handlePageToggle(page.id || page.key)} disabled={page.exists === false} data-testid={`page-checkbox-${page.key}`} />
                                {page.exists === false && <div className="text-red-500" title="Fichier manquant"><XCircle className="w-4 h-4" /></div>}
                                <div className="flex flex-col gap-0.5">
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => movePage(page.id, 'up')} disabled={globalIndex === 0}><ChevronUp className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => movePage(page.id, 'down')} disabled={globalIndex === availablePages.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                                </div>
                                <div className="flex-1 min-w-0"><p className={`font-medium truncate text-sm ${page.exists === false ? 'text-red-500 line-through' : ''}`}>{page.label}{page.exists === false && <span className="text-xs ml-2 text-red-400">(fichier manquant)</span>}</p></div>
                                {selectedPages.includes(page.id || page.key) && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => previewPage(page.id)} title="Aperçu"><Eye className="w-4 h-4 text-blue-500" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditPage(page)} title="Modifier"><Edit2 className="w-4 h-4 text-gray-500" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50" onClick={() => deletePage(page.id)} title="Supprimer"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={generatePdfPreview} disabled={selectedPages.length === 0 || generatingPdf} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg" data-testid="generate-preview-btn">
              {generatingPdf ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Génération en cours...</>) : (<><Eye className="w-5 h-5 mr-2" />Générer l'Aperçu PDF</>)}
            </Button>
          </div>

          {/* Right Column - Email Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Mail className="w-5 h-5 text-orange-500" />Configuration Email</span>
                  <FormSubmissionsSelector onSelect={handleSubmissionSelect} buttonLabel="Soumissions" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSubmission && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-1 relative" data-testid="selected-submission-info">
                    <button
                      onClick={handleClearSubmission}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Annuler l'import"
                      data-testid="clear-submission-btn"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <p className="font-semibold text-orange-700 pr-6">Contact importé : {selectedSubmission.nom || 'Anonyme'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-orange-600">
                      {selectedSubmission.email && <span>{selectedSubmission.email}</span>}
                      {selectedSubmission.telephone && <span>{selectedSubmission.telephone}</span>}
                      {selectedSubmission.date_evenement && <span>{formatDateDisplay(selectedSubmission.date_evenement)}</span>}
                    </div>
                  </div>
                )}
                <div><Label htmlFor="recipient">Email du destinataire</Label><Input id="recipient" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="mt-1" data-testid="recipient-email-input" /></div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subject">Objet du mail</Label>
                    <VariableInsertMenu onInsert={handleInsertSubjectVariable} submissionData={selectedSubmission} />
                  </div>
                  <Input id="subject" ref={subjectInputRef} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="mt-1" data-testid="email-subject-input" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="body">Corps du message</Label>
                    <VariableInsertMenu onInsert={handleInsertVariable} submissionData={selectedSubmission} />
                  </div>
                  <div className="mt-1 bg-white rounded-md border" data-testid="email-body-editor">
                    <ReactQuill theme="snow" value={emailBody} onChange={setEmailBody} modules={quillModules} formats={quillFormats} style={{ minHeight: '180px' }} />
                  </div>
                </div>
                {selectedPages.length > 0 && eventDate && (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-4">
                    <p className="text-sm text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4 text-red-500" /><strong>Pièce jointe :</strong> Devis_RkeyProd_{eventDateType === 'full' ? eventDate.split('-').reverse().join('') : eventDate}.pdf</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-orange-500" />Templates Email</span>
                  <Button variant="outline" size="sm" onClick={() => openTemplateDialog()} data-testid="save-as-template-btn" disabled={!emailSubject && !emailBody}><Save className="w-4 h-4 mr-1" />Enregistrer comme template</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Aucun template. Créez-en un pour gagner du temps !</p>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          {template.is_default && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          <span className="font-medium">{template.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => applyTemplate(template)} className="text-green-600 hover:text-green-700 hover:bg-green-50">Utiliser</Button>
                          <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(template)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={sendEmail} disabled={selectedPages.length === 0 || !recipientEmail || !emailSubject || sendingEmail} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" data-testid="send-email-btn">
              {sendingEmail ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Envoi en cours...</>) : (<><Send className="w-5 h-5 mr-2" />Envoyer le Devis par Email</>)}
            </Button>
            <p className="text-xs text-gray-500 text-center">L'email sera envoyé depuis info@rkey-prod.fr avec une copie automatique</p>
          </div>
        </div>
        )}

        {/* Dialogs (composants extraits) */}
        <PdfPreviewDialog showPreview={showPreview} setShowPreview={setShowPreview} pdfPreview={pdfPreview} pdfBlobUrl={pdfBlobUrl} setPdfBlobUrl={setPdfBlobUrl} numPages={numPages} setNumPages={setNumPages} currentPage={currentPage} setCurrentPage={setCurrentPage} eventDate={eventDate} eventDateType={eventDateType} />
        <TemplateDialog showTemplateDialog={showTemplateDialog} setShowTemplateDialog={setShowTemplateDialog} editingTemplate={editingTemplate} templateForm={templateForm} setTemplateForm={setTemplateForm} saveTemplate={saveTemplate} savingTemplate={savingTemplate} />
        <EditPageDialog editingPage={editingPage} setEditingPage={setEditingPage} pageForm={pageForm} setPageForm={setPageForm} savePageEdit={savePageEdit} />
        <AddPageDialog showAddPageDialog={showAddPageDialog} setShowAddPageDialog={setShowAddPageDialog} pageForm={pageForm} setPageForm={setPageForm} newPageFile={newPageFile} setNewPageFile={setNewPageFile} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} uploadNewPage={uploadNewPage} uploadingPage={uploadingPage} />
        <PagePreviewDialog showPagePreview={showPagePreview} setShowPagePreview={setShowPagePreview} pagePreviewData={pagePreviewData} />
        <RelanceDialog showRelanceDialog={showRelanceDialog} setShowRelanceDialog={setShowRelanceDialog} selectedQuoteForRelance={selectedQuoteForRelance} setSelectedQuoteForRelance={setSelectedQuoteForRelance} relanceNote={relanceNote} setRelanceNote={setRelanceNote} addRelance={addRelance} />
        <NotesDialog showNotesDialog={showNotesDialog} setShowNotesDialog={setShowNotesDialog} selectedQuoteForNotes={selectedQuoteForNotes} setSelectedQuoteForNotes={setSelectedQuoteForNotes} notesText={notesText} setNotesText={setNotesText} saveNotes={saveNotes} />
        <ManualQuoteDialog showAddManualDialog={showAddManualDialog} setShowAddManualDialog={setShowAddManualDialog} manualQuoteForm={manualQuoteForm} setManualQuoteForm={setManualQuoteForm} manualQuoteFile={manualQuoteFile} setManualQuoteFile={setManualQuoteFile} manualFileInputRef={manualFileInputRef} addManualQuote={addManualQuote} savingManualQuote={savingManualQuote} initialFormValues={initialManualQuoteForm} />
      </div>
    </div>
  );
};

export default DevisEnvoiApp;
