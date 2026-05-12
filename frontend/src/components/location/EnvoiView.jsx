// EnvoiView - Module Location
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateQuotePDF } from './devisQuotePdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { useEmailSignature } from '../../hooks/useEmailSignature';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { CalendarIcon, Package, Users, FileText, BarChart3, Plus, Edit, Trash2, Download, Check, AlertCircle, Copy, RefreshCw, CheckCircle, Clock, Printer, Archive, Headphones, BookOpen, Home, User, Settings, Target, Calendar as CalendarIcon2, Menu, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, Upload, Image, Sparkles, Eye, EyeOff, X, Send, ArrowLeft, Zap, UserPlus, Truck, MapPin } from 'lucide-react';
import { generateCompleteReservationDocuments, generateWithdrawalSlip, calculateGuaranteeDeposit } from '../../utils/pdfGenerator';
import { 
  DEGRESSION_COEFFICIENTS, 
  DELIVERY_ZONES, 
  getDegressionInfo, 
  calculateDeliveryPrice,
  isWeekendPeriod,
  calculateDeposit,
  calculateGuarantee,
  calculateInstallationCost,
  INSTALLATION_HOURLY_RATE
} from '../../utils/pricingUtils';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Toaster } from '../ui/sonner';
import { API, BACKEND_URL, formatDateLocal, axios } from './helpers';

// Variables spécifiques aux devis de location
const LOCATION_VARIABLES = [
  { key: '{nom_client}', label: 'Nom client', desc: 'Nom du client' },
  { key: '{email_client}', label: 'Email client', desc: 'Email du client' },
  { key: '{date_debut}', label: 'Date début', desc: 'Début de location (JJ-MM-AAAA)' },
  { key: '{date_fin}', label: 'Date fin', desc: 'Fin de location (JJ-MM-AAAA)' },
  { key: '{montant_ttc}', label: 'Montant TTC', desc: 'Total TTC du devis' },
  { key: '{montant_ht}', label: 'Montant HT', desc: 'Total HT du devis' },
];

// Mini composant popover pour insérer des variables
function VariableMenu({ onInsert, quoteData }) {
  const [open, setOpen] = React.useState(false);
  const getPreview = (key) => {
    if (!quoteData) return '';
    const fmtDate = (d) => { if (!d) return ''; try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; } catch { return d; } };
    const map = {
      '{nom_client}': quoteData.client_contact_name || quoteData.client_name || '',
      '{email_client}': quoteData.client_email || '',
      '{date_debut}': fmtDate(quoteData.start_date),
      '{date_fin}': fmtDate(quoteData.end_date),
      '{montant_ttc}': quoteData.total_amount ? `${quoteData.total_amount.toFixed(2)}€` : '',
      '{montant_ht}': quoteData.total_amount ? `${(quoteData.total_amount / 1.2).toFixed(2)}€` : '',
    };
    return map[key] || '';
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="location-variable-insert-btn">
          <Zap className="w-3.5 h-3.5" />
          Variables
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wider">Insérer une variable</p>
        <div className="space-y-0.5 mt-1">
          {LOCATION_VARIABLES.map((v) => {
            const preview = getPreview(v.key);
            return (
              <button key={v.key} onClick={() => { onInsert(v.key); setOpen(false); toast.success(`Variable ${v.key} insérée`); }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-purple-50 transition-colors text-left group"
                data-testid={`loc-var-${v.key.replace(/[{}]/g, '')}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-purple-600 bg-purple-50 px-1 py-0.5 rounded">{v.key}</code>
                    <span className="text-xs text-gray-500">{v.label}</span>
                  </div>
                  {preview && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{preview}</p>}
                </div>
                <Copy className="w-3 h-3 text-gray-300 group-hover:text-purple-500 flex-shrink-0" />
              </button>
            );
          })}
        </div>
        {quoteData && <p className="text-[10px] text-gray-400 px-2 pt-2 border-t mt-2">Les variables seront remplacées lors de l'envoi</p>}
      </PopoverContent>
    </Popover>
  );
}

function EnvoiView({ pendingQuoteToSend, setPendingQuoteToSend }) {
  const BACKEND_URL = (window.location.hostname === 'rkeyprodapp.fr' || window.location.hostname === 'www.rkeyprodapp.fr') ? window.location.origin : (process.env.REACT_APP_BACKEND_URL || window.location.origin);
  const API = `${BACKEND_URL}/api/location`;
  
  // Email signature loaded from Global Settings (reduced 40%)
  const { signatureHtml } = useEmailSignature();
  
  // Quill editor modules
  const quillModules = {
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
  
  const quillFormats = [
    'header', 'bold', 'italic', 'underline',
    'color', 'background', 'list', 'bullet', 'align', 'image'
  ];

  // Email states
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pdfFilename, setPdfFilename] = useState("");

  // Quote selection states
  const [availableQuotes, setAvailableQuotes] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedQuoteData, setSelectedQuoteData] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState("");  // Recherche de devis

  // Template states
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', is_default: false });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Refs pour l'insertion au curseur
  const quillRef = useRef(null);
  const subjectInputRef = useRef(null);
  const subjectCursorPos = useRef(0);
  
  // PDF Preview states
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Fetch quotes and templates on mount
  useEffect(() => {
    fetchAvailableQuotes();
    fetchTemplates();
  }, []);

  // Initialize email body with signature when loaded
  useEffect(() => {
    if (signatureHtml && !emailBody) {
      setEmailBody(signatureHtml);
    }
  }, [signatureHtml]);

  // Si un devis a été passé depuis "Sauvegarder et Envoyer", le pré-sélectionner
  useEffect(() => {
    if (pendingQuoteToSend) {
      setSelectedQuoteId(pendingQuoteToSend.id);
      setSelectedQuoteData(pendingQuoteToSend);
      setRecipientEmail(pendingQuoteToSend.client_email || "");
      
      // Format filename: DevisLoc_NomClient_DateDebutLoc.pdf
      let startDateFormatted = '';
      if (pendingQuoteToSend.start_date) {
        try {
          const date = new Date(pendingQuoteToSend.start_date);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          startDateFormatted = `${day}-${month}-${year}`;
        } catch {
          const now = new Date();
          startDateFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        }
      } else {
        const now = new Date();
        startDateFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      }
      const clientNameForFile = (pendingQuoteToSend.client_name || 'Client').replace(/[^a-zA-Z0-9À-ÿ]/g, '').substring(0, 30);
      setPdfFilename(`DevisLoc_${clientNameForFile}_${startDateFormatted}.pdf`);
      
      // Réinitialiser après utilisation
      setPendingQuoteToSend(null);
    }
  }, [pendingQuoteToSend]);

  const fetchAvailableQuotes = async () => {
    try {
      setLoadingQuotes(true);
      // Utiliser le même endpoint que la vue Devis pour avoir les mêmes données
      const [quotesResponse, clientsResponse] = await Promise.all([
        axios.get(`${API}/quotes`),
        axios.get(`${API}/clients`)
      ]);
      
      const quotes = quotesResponse.data || [];
      const clientsList = clientsResponse.data || [];
      
      // Enrichir les devis avec les informations client
      const enrichedQuotes = quotes.map(quote => {
        const client = clientsList.find(c => c.id === quote.client_id);
        return {
          ...quote,
          client_name: client ? (client.company_name || client.name) : (quote.client_name || 'Client inconnu'),
          client_contact_name: client ? client.name : (quote.client_name || 'Client inconnu'),
          client_email: client ? client.email : ''
        };
      });
      
      // Trier par date de création (plus récent en premier)
      enrichedQuotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setAvailableQuotes(enrichedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/rental-quote-emails/templates`);
      setTemplates(response.data.templates || []);
      
      const defaultTemplate = response.data.templates?.find(t => t.is_default);
      if (defaultTemplate && (!emailBody || emailBody === signatureHtml)) {
        setEmailSubject(defaultTemplate.subject);
        setEmailBody((defaultTemplate.body || '') + signatureHtml);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleQuoteSelect = (quoteId) => {
    setSelectedQuoteId(quoteId);
    const quote = availableQuotes.find(q => q.id === quoteId);
    if (quote) {
      setSelectedQuoteData(quote);
      setRecipientEmail(quote.client_email || "");
      // Format filename: DevisLoc_NomClient_DateDebutLoc.pdf
      let startDateFormatted = '';
      if (quote.start_date) {
        try {
          const date = new Date(quote.start_date);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          startDateFormatted = `${day}-${month}-${year}`;
        } catch {
          const now = new Date();
          startDateFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        }
      } else {
        const now = new Date();
        startDateFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      }
      const clientNameForFile = (quote.client_name || 'Client').replace(/[^a-zA-Z0-9À-ÿ]/g, '').substring(0, 30);
      setPdfFilename(`DevisLoc_${clientNameForFile}_${startDateFormatted}.pdf`);
    } else {
      setSelectedQuoteData(null);
      setRecipientEmail("");
      setPdfFilename("");
    }
  };

  const applyTemplate = (template) => {
    setEmailSubject(template.subject);
    setEmailBody((template.body || '') + signatureHtml);
    toast.success(`Template "${template.name}" appliqué`);
  };

  const openTemplateDialog = (template = null) => {
    if (template) {
      // Mode édition : utiliser les valeurs du template existant
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        is_default: template.is_default
      });
    } else {
      // Mode création : utiliser l'objet et le corps actuels du formulaire
      setEditingTemplate(null);
      setTemplateForm({ 
        name: '', 
        subject: emailSubject, 
        body: emailBody, 
        is_default: false 
      });
    }
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name) {
      toast.error('Veuillez saisir un nom pour le template');
      return;
    }
    
    // Vérifier qu'il y a du contenu à sauvegarder
    if (!templateForm.subject && !templateForm.body) {
      toast.error('Le template doit avoir un objet ou un corps de message');
      return;
    }

    try {
      setSavingTemplate(true);
      if (editingTemplate) {
        await axios.put(`${BACKEND_URL}/api/rental-quote-emails/templates/${editingTemplate.id}`, templateForm);
        toast.success('Template mis à jour');
      } else {
        await axios.post(`${BACKEND_URL}/api/rental-quote-emails/templates`, templateForm);
        toast.success('Template créé');
      }
      fetchTemplates();
      setShowTemplateDialog(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/rental-quote-emails/templates/${templateId}`);
      toast.success('Template supprimé');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Fonction pour générer l'aperçu PDF
  const generatePdfPreview = async () => {
    if (!selectedQuoteId) {
      toast.error('Veuillez sélectionner un devis pour prévisualiser');
      return;
    }

    try {
      setGeneratingPreview(true);
      
      // Récupérer les détails complets du devis
      const response = await axios.get(`${API}/quotes/${selectedQuoteId}`);
      const quote = response.data;
      
      // Récupérer les équipements et clients
      const [equipmentRes, clientsRes] = await Promise.all([
        axios.get(`${API}/equipment`),
        axios.get(`${API}/clients`)
      ]);
      const equipmentList = equipmentRes.data || [];
      const clientsList = clientsRes.data || [];
      
      // Générer le PDF en mémoire (sans télécharger)
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // En-tête
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("R'KEY PROD", margin, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("5 rue du Hohlandsbourg", margin, yPos);
      yPos += 4;
      doc.text("67390 Marckolsheim", margin, yPos);
      yPos += 4;
      doc.text("Tel: 07 83 55 36 74", margin, yPos);
      yPos += 4;
      doc.text("Email: info@rkey-prod.fr", margin, yPos);
      yPos += 4;
      doc.text("SIRET: 99992355000019", margin, yPos);
      yPos += 12;

      // Titre
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("DEVIS DE LOCATION DE MATÉRIEL", pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const quoteDate = quote.created_at ? new Date(quote.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
      doc.text(`Date: ${quoteDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Client
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("CLIENT:", margin, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const client = clientsList.find(c => c.id === quote.client_id);
      if (client) {
        const clientName = client.company_name || client.name;
        doc.text(clientName, margin, yPos);
        yPos += 5;
        if (client.address) {
          doc.text(client.address, margin, yPos);
          yPos += 5;
        }
      } else {
        doc.text(quote.client_name || "(Devis rapide)", margin, yPos);
        yPos += 5;
      }
      yPos += 5;

      // Période
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("PÉRIODE DE LOCATION:", margin, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const startDate = new Date(quote.start_date).toLocaleDateString('fr-FR');
      const endDate = new Date(quote.end_date).toLocaleDateString('fr-FR');
      doc.text(`Du ${startDate} au ${endDate}`, margin, yPos);
      yPos += 10;

      // Tableau matériel (simplifié pour l'aperçu)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
      doc.text("MATÉRIEL", margin + 2, yPos);
      doc.text("TOTAL", pageWidth - margin - 20, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      let subtotal = 0;
      (quote.items || []).forEach(item => {
        const eq = equipmentList.find(e => e.id === item.equipment_id);
        if (eq) {
          const lineTotal = item.total_price || (eq.daily_price * item.quantity);
          subtotal += lineTotal;
          doc.text(eq.name.substring(0, 45), margin + 2, yPos);
          doc.text(`${lineTotal.toFixed(2)}€`, pageWidth - margin - 20, yPos);
          yPos += 6;
        }
      });
      
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Totaux
      const rightAlignX = pageWidth - margin;
      const labelX = margin + 90;
      
      doc.text("Sous-total matériel:", labelX, yPos);
      doc.text(`${subtotal.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 6;

      // Livraison
      const deliveryCost = quote.delivery_cost || 0;
      const deliveryZone = quote.delivery_zone || '';
      let deliveryLabel = "Forfait livraison";
      if (deliveryZone === 'zone1') deliveryLabel = "Livraison Zone 1 (Local)";
      else if (deliveryZone === 'zone2') deliveryLabel = "Livraison Zone 2";
      else if (deliveryZone === 'zone3') deliveryLabel = "Livraison Zone 3";
      
      doc.text(`${deliveryLabel}:`, labelX, yPos);
      doc.text(deliveryCost === 0 && deliveryZone === 'zone1' ? "GRATUIT" : `${deliveryCost.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 6;

      // Installation
      const installCost = quote.installation_cost || 0;
      doc.text("Frais d'installation:", labelX, yPos);
      doc.text(`${installCost.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 8;

      // TVA et Total
      const finalTotal = quote.total_amount || 0;
      const totalHT = finalTotal / 1.20;
      const tvaAmount = finalTotal - totalHT;
      
      doc.line(labelX, yPos - 2, rightAlignX, yPos - 2);
      
      doc.text("Total HT:", labelX, yPos);
      doc.text(`${totalHT.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 6;
      
      doc.text("TVA (20%):", labelX, yPos);
      doc.text(`${tvaAmount.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("TOTAL TTC:", labelX, yPos);
      doc.text(`${finalTotal.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 12;

      // ==============================
      // LAYOUT 2 COLONNES : Livraison (gauche) + Caution/Signature (droite)
      // ==============================
      const colLeftX = margin;
      const colRightX = margin + 97;
      const colLeftWidth = 92;
      const colRightWidth = pageWidth - 2 * margin - colLeftWidth - 5;
      let yLeft = yPos;
      let yRight = yPos;

      // --- COLONNE GAUCHE : Livraison & Retour ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("LIVRAISON & RETOUR", colLeftX, yLeft);
      yLeft += 2;
      doc.setDrawColor(234, 88, 12);
      doc.setLineWidth(0.5);
      doc.line(colLeftX, yLeft, colLeftX + 50, yLeft);
      doc.setLineWidth(0.2);
      doc.setDrawColor(0, 0, 0);
      yLeft += 5;

      doc.setFontSize(9);
      const hasDelivInfo = quote.delivery_address || quote.pickup_by_us || quote.pickup_by_client;
      if (hasDelivInfo) {
        if (quote.delivery_address) {
          doc.setFont('helvetica', 'bold');
          doc.text("Adresse de livraison :", colLeftX, yLeft);
          yLeft += 4;
          doc.setFont('helvetica', 'normal');
          const delivLines = doc.splitTextToSize(quote.delivery_address, colLeftWidth);
          delivLines.forEach(line => { doc.text(line, colLeftX + 3, yLeft); yLeft += 4; });
          yLeft += 2;
        }
        if (quote.pickup_by_us) {
          doc.setFont('helvetica', 'bold');
          doc.text("Retour du matériel :", colLeftX, yLeft);
          yLeft += 4;
          doc.setFont('helvetica', 'normal');
          doc.text("Retrait par nos soins", colLeftX + 3, yLeft);
          yLeft += 5;
          const pickupAddr = quote.pickup_address || quote.delivery_address;
          if (pickupAddr) {
            doc.setFont('helvetica', 'bold');
            doc.text("Adresse de retrait :", colLeftX, yLeft);
            yLeft += 4;
            doc.setFont('helvetica', 'normal');
            const pLines = doc.splitTextToSize(pickupAddr, colLeftWidth);
            pLines.forEach(line => { doc.text(line, colLeftX + 3, yLeft); yLeft += 4; });
          }
        } else if (quote.pickup_by_client) {
          doc.setFont('helvetica', 'bold');
          doc.text("Retour du matériel :", colLeftX, yLeft);
          yLeft += 4;
          doc.setFont('helvetica', 'normal');
          doc.text("Le client ramène le matériel", colLeftX + 3, yLeft);
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text("Aucune information de livraison", colLeftX, yLeft);
        doc.setTextColor(0, 0, 0);
      }

      // --- COLONNE DROITE : Acompte + Caution ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      let depositAmount = quote.deposit_amount || 0;
      let guaranteeAmount = quote.guarantee_amount || 0;
      const isTrustedClient = quote.trusted_client || false;
      
      if (depositAmount === 0 && subtotal > 0) {
        depositAmount = Math.ceil(subtotal * 0.30 / 10) * 10;
      }
      if (!isTrustedClient && guaranteeAmount === 0 && subtotal > 0) {
        const rawGuarantee = subtotal < 150 ? 350 : 350 + subtotal;
        guaranteeAmount = Math.ceil(rawGuarantee / 50) * 50;
      }
      
      const cautionBoxH = isTrustedClient ? 24 : 20;
      doc.setFillColor(245, 245, 220);
      doc.rect(colRightX, yRight - 4, colRightWidth, cautionBoxH, 'F');
      doc.setDrawColor(200, 180, 100);
      doc.rect(colRightX, yRight - 4, colRightWidth, cautionBoxH, 'S');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Acompte :", colRightX + 3, yRight + 1);
      doc.text(`${depositAmount.toFixed(2)}€`, colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
      yRight += 7;
      
      if (isTrustedClient) {
        doc.text("Caution :", colRightX + 3, yRight + 1);
        doc.setTextColor(34, 139, 34);
        doc.text("0.00€", colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yRight += 5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(34, 139, 34);
        doc.text("Client de confiance", colRightX + 3, yRight + 1);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text("Caution :", colRightX + 3, yRight + 1);
        doc.text(`${guaranteeAmount.toFixed(2)}€`, colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
        yRight += 5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text("(Empreinte CB - sans prélèvement)", colRightX + 3, yRight + 1);
        doc.setTextColor(0, 0, 0);
      }

      // Convertir en blob URL pour l'aperçu
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(blobUrl);
      setShowPdfPreview(true);
      
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      toast.error('Erreur lors de la génération de l\'aperçu');
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Nettoyer l'URL du blob à la fermeture
  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setShowPdfPreview(false);
  };

  const sendEmail = async () => {
    if (!recipientEmail) {
      toast.error('Veuillez saisir l\'email du destinataire');
      return;
    }
    if (!emailSubject) {
      toast.error('Veuillez saisir l\'objet du mail');
      return;
    }
    if (!selectedQuoteId) {
      toast.error('Veuillez sélectionner un devis');
      return;
    }

    try {
      setSendingEmail(true);
      toast.info("Génération et envoi du devis en cours...", { duration: 3000 });

      // Fetch full quote data, equipment and clients for PDF generation
      const [quoteRes, equipmentRes, clientsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/quotes/${selectedQuoteId}`),
        axios.get(`${API}/equipment`),
        axios.get(`${API}/clients`),
        axios.get(`${BACKEND_URL}/api/global-settings`).catch(() => ({ data: [] }))
      ]);
      const quote = quoteRes.data;
      const equipmentList = equipmentRes.data || [];
      const clientsList = clientsRes.data || [];
      const settings = Array.isArray(settingsRes.data) ? settingsRes.data : [];
      const companySettings = settings.find(s => s.type === 'company') || {};

      // Generate the beautiful PDF as base64
      const pdfResult = generateQuotePDF(quote, clientsList, equipmentList, companySettings, { returnBase64: true });
      if (!pdfResult || !pdfResult.base64) {
        toast.error('Erreur lors de la génération du PDF');
        return;
      }

      const response = await axios.post(`${BACKEND_URL}/api/rental-quote-emails/send`, {
        quote_id: selectedQuoteId,
        recipient_email: recipientEmail,
        email_subject: replaceVariables(emailSubject),
        email_body: replaceVariables(emailBody),
        pdf_base64: pdfResult.base64,
        pdf_filename: pdfResult.filename
      });

      if (response.data.success) {
        toast.success(response.data.message);
        if (response.data.pdf_filename) {
          setPdfFilename(response.data.pdf_filename);
        }
        // Reset form
        setSelectedQuoteId("");
        setSelectedQuoteData(null);
        setRecipientEmail("");
        setEmailSubject("");
        setEmailBody(signatureHtml);
        setPdfFilename("");
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const formatDateVar = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    } catch { return dateStr; }
  };

  // Insertion de variable dans l'objet (au curseur)
  const handleInsertSubjectVariable = (varKey) => {
    const input = subjectInputRef.current;
    if (!input) { setEmailSubject(prev => prev + varKey); return; }
    const pos = subjectCursorPos.current || 0;
    const before = emailSubject.slice(0, pos);
    const after = emailSubject.slice(pos);
    setEmailSubject(before + varKey + after);
    setTimeout(() => {
      const newPos = pos + varKey.length;
      input.setSelectionRange(newPos, newPos);
      input.focus();
      subjectCursorPos.current = newPos;
    }, 0);
  };

  // Insertion de variable dans le corps Quill (au curseur)
  const handleInsertBodyVariable = (varKey) => {
    const editor = quillRef.current?.getEditor?.();
    if (editor) {
      const range = editor.getSelection(true);
      const pos = range ? range.index : editor.getLength() - 1;
      editor.insertText(pos, varKey);
      editor.setSelection(pos + varKey.length, 0);
    } else {
      setEmailBody(prev => prev + varKey);
    }
  };

  // Remplacer les variables par les vraies valeurs avant envoi
  const replaceVariables = (text) => {
    if (!selectedQuoteData || !text) return text;
    const map = {
      '{nom_client}': selectedQuoteData.client_contact_name || selectedQuoteData.client_name || '',
      '{email_client}': selectedQuoteData.client_email || '',
      '{date_debut}': formatDateVar(selectedQuoteData.start_date),
      '{date_fin}': formatDateVar(selectedQuoteData.end_date),
      '{montant_ttc}': selectedQuoteData.total_amount ? `${selectedQuoteData.total_amount.toFixed(2)}€` : '',
      '{montant_ht}': selectedQuoteData.total_amount ? `${(selectedQuoteData.total_amount / 1.2).toFixed(2)}€` : '',
    };
    let result = text;
    for (const [k, v] of Object.entries(map)) { result = result.split(k).join(v); }
    return result;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Send className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Envoi de Devis</h1>
          <p className="text-sm text-gray-500">Envoyer un devis de location par email</p>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 1. Quote Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-purple-500" />
              Sélectionner un devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuotes ? (
              <div className="flex items-center gap-2 text-purple-600 py-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Chargement des devis...
              </div>
            ) : availableQuotes.length === 0 ? (
              <p className="text-gray-500 py-4">Aucun devis disponible. Créez d'abord un devis dans la section Devis.</p>
            ) : (
              <div className="space-y-3">
                {/* Barre de recherche */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="🔍 Rechercher par client, date, montant..."
                    value={quoteSearchTerm}
                    onChange={(e) => setQuoteSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-8"
                  />
                  {quoteSearchTerm && (
                    <button
                      onClick={() => setQuoteSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Liste des devis filtrés */}
                <select
                  value={selectedQuoteId}
                  onChange={(e) => handleQuoteSelect(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  size={Math.min(8, availableQuotes.filter(quote => {
                    if (!quoteSearchTerm) return true;
                    const search = quoteSearchTerm.toLowerCase();
                    const clientName = (quote.client_name || '').toLowerCase();
                    const quoteNumber = (quote.quote_number || '').toLowerCase();
                    const startDate = formatDate(quote.start_date).toLowerCase();
                    const endDate = formatDate(quote.end_date).toLowerCase();
                    const amount = (quote.total_amount?.toFixed(2) || '0').toLowerCase();
                    return clientName.includes(search) || 
                           quoteNumber.includes(search) || 
                           startDate.includes(search) || 
                           endDate.includes(search) || 
                           amount.includes(search);
                  }).length + 1)}
                >
                  <option value="">-- Choisir un devis --</option>
                  {availableQuotes
                    .filter(quote => {
                      if (!quoteSearchTerm) return true;
                      const search = quoteSearchTerm.toLowerCase();
                      const clientName = (quote.client_name || '').toLowerCase();
                      const quoteNumber = (quote.quote_number || '').toLowerCase();
                      const startDate = formatDate(quote.start_date).toLowerCase();
                      const endDate = formatDate(quote.end_date).toLowerCase();
                      const amount = (quote.total_amount?.toFixed(2) || '0').toLowerCase();
                      return clientName.includes(search) || 
                             quoteNumber.includes(search) || 
                             startDate.includes(search) || 
                             endDate.includes(search) || 
                             amount.includes(search);
                    })
                    .map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.client_name} ({formatDate(quote.start_date)} → {formatDate(quote.end_date)}) - {quote.total_amount?.toFixed(2)}€
                      </option>
                    ))
                  }
                </select>
                
                {/* Indicateur de résultats */}
                {quoteSearchTerm && (
                  <p className="text-sm text-gray-500">
                    {availableQuotes.filter(quote => {
                      const search = quoteSearchTerm.toLowerCase();
                      const clientName = (quote.client_name || '').toLowerCase();
                      const quoteNumber = (quote.quote_number || '').toLowerCase();
                      const startDate = formatDate(quote.start_date).toLowerCase();
                      const endDate = formatDate(quote.end_date).toLowerCase();
                      const amount = (quote.total_amount?.toFixed(2) || '0').toLowerCase();
                      return clientName.includes(search) || 
                             quoteNumber.includes(search) || 
                             startDate.includes(search) || 
                             endDate.includes(search) || 
                             amount.includes(search);
                    }).length} devis trouvé(s) sur {availableQuotes.length}
                  </p>
                )}
              </div>
            )}

            {/* Selected Quote Summary */}
            {selectedQuoteData && (
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Devis sélectionné</h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p><strong>Client :</strong> {selectedQuoteData.client_name || "Non renseigné"}</p>
                  <p><strong>Email :</strong> {selectedQuoteData.client_email || "Non renseigné"}</p>
                  <p><strong>Période :</strong> {formatDate(selectedQuoteData.start_date)} → {formatDate(selectedQuoteData.end_date)}</p>
                  <p><strong>Montant :</strong> {selectedQuoteData.total_amount?.toFixed(2) || "0.00"}€</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Email Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-500" />
              Configuration Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipient">Email du destinataire *</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="subject">Objet du mail *</Label>
                <VariableMenu onInsert={handleInsertSubjectVariable} quoteData={selectedQuoteData} />
              </div>
              <Input
                id="subject"
                ref={subjectInputRef}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                onSelect={(e) => { subjectCursorPos.current = e.target.selectionStart; }}
                onClick={(e) => { subjectCursorPos.current = e.target.selectionStart; }}
                onKeyUp={(e) => { subjectCursorPos.current = e.target.selectionStart; }}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Corps du message</Label>
                <VariableMenu onInsert={handleInsertBodyVariable} quoteData={selectedQuoteData} />
              </div>
              <div className="bg-white rounded-md border" style={{ minHeight: '250px' }}>
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={emailBody}
                  onChange={setEmailBody}
                  modules={quillModules}
                  formats={quillFormats}
                  style={{ height: '200px' }}
                />
              </div>
            </div>

            {/* PDF Filename Display with Preview Button */}
            {pdfFilename && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <strong>Pièce jointe :</strong> {pdfFilename}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePdfPreview}
                    disabled={generatingPreview || !selectedQuoteId}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Prévisualiser le PDF"
                  >
                    {generatingPreview ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Aperçu</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Send Button */}
            <Button 
              onClick={sendEmail}
              disabled={sendingEmail || !recipientEmail || !emailSubject || !selectedQuoteId}
              className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
              size="lg"
            >
              {sendingEmail ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer le devis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 3. Templates Email */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-amber-500" />
                Templates Email
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openTemplateDialog()}
                disabled={!emailSubject && !emailBody}
              >
                <Check className="w-4 h-4 mr-1" />
                Enregistrer comme template
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                <Target className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Aucun template. Créez-en un pour gagner du temps !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                  >
                    <div className="flex items-center gap-3">
                      {template.is_default && (
                        <CheckCircle className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <span className="font-medium">{template.name}</span>
                        <p className="text-sm text-gray-500">{template.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => applyTemplate(template)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Utiliser
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openTemplateDialog(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le Template' : 'Enregistrer comme template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Nom du template *</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            {/* Aperçu du contenu qui sera sauvegardé */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Contenu qui sera sauvegardé :</p>
              <div className="text-sm text-gray-600">
                <p><strong>Objet :</strong> {templateForm.subject || <span className="italic text-gray-400">(vide)</span>}</p>
                <p><strong>Corps :</strong> {templateForm.body ? 
                  <span className="text-green-600">✓ Contenu HTML avec mise en forme</span> : 
                  <span className="italic text-gray-400">(vide)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="template-default"
                checked={templateForm.is_default}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked })}
              />
              <Label htmlFor="template-default" className="cursor-pointer">
                Définir comme template par défaut
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={saveTemplate} 
              disabled={savingTemplate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {savingTemplate ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour aperçu PDF */}
      <Dialog open={showPdfPreview} onOpenChange={closePdfPreview}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Aperçu du PDF - {pdfFilename}
            </DialogTitle>
            <DialogDescription>
              Prévisualisation du devis qui sera envoyé en pièce jointe
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg border bg-gray-100" style={{ height: 'calc(85vh - 140px)' }}>
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full"
                title="Aperçu PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Chargement...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePdfPreview}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnvoiView;
