import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  ClipboardList, Plus, Search, Filter, Calendar, MapPin, User, Mail, Phone,
  Clock, Music, Sparkles, Building2, FileCheck, ArrowRight, Trash2, Edit3,
  Download, RefreshCw, ChevronLeft, CheckCircle2, FileText, ExternalLink,
  Info, AlertCircle, ShieldAlert
} from 'lucide-react';
import API_BASE_URL from '../utils/apiUrl';

const API = `${API_BASE_URL}/api`;

const MUSIC_STYLES_LIST = [
  "Rock n' roll", "Twist", "80's", "90's", "00's", "Pop", "Généraliste",
  "Latino", "Disco", "Electro / House", "RnB / Hip-Hop", "Funk", "Soleil / Zouk",
  "Allemand / Schlager", "Variété Française", "Rap Français", "Rock / Metal", "EDM"
];

const DEFAULT_OPTIONS = [
  { id: 'opt_ceremonie', name: 'Cérémonie extérieure (autonome)', price: 100 },
  { id: 'opt_bulles', name: 'Machine à bulles (x2)', price: 50 },
  { id: 'opt_etincelles', name: 'Machine à étincelles froides x2', price: 100 },
  { id: 'opt_eclairage', name: 'Éclairage salle (spots sur batterie)', price: 150 },
  { id: 'opt_fumee_lourde', name: 'Fumée lourde (Ouverture de bal)', price: 120 },
  { id: 'opt_videoproj', name: 'Vidéoprojecteur & Écran', price: 80 },
];

const TIMELINE_PRESETS = [
  "Apéritif", "Entrée des mariés", "Entrée", "Blind test", "Plat",
  "Quiz interactif", "Musique de repas", "Fromage", "Chasse au trésor",
  "Dessert", "Ouverture de bal", "Soirée dansante"
];

export default function VisitingSheetApp() {
  const [sheets, setSheets] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [currentSheet, setCurrentSheet] = useState(null); // null = list view, object = editing view
  const [activeTab, setActiveTab] = useState('client'); // client, timing, music, options, venue, dj_notes
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [converting, setConverting] = useState(false);

  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all visiting sheets & submissions
  const fetchSheets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/visiting-sheets`, { headers });
      setSheets(res.data || []);
    } catch (err) {
      console.error("Erreur chargement fiches de visite:", err);
      toast.error("Erreur lors du chargement des fiches de visite");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissionsAndForms = useCallback(async () => {
    try {
      const [subRes, formRes] = await Promise.all([
        axios.get(`${API}/form-submissions/all`, { headers }).catch(() => ({ data: { submissions: [] } })),
        axios.get(`${API}/forms`, { headers }).catch(() => ({ data: [] }))
      ]);
      setSubmissions(subRes.data?.submissions || []);
      setForms(formRes.data || []);
    } catch (err) {
      console.warn("Erreur chargement soumissions:", err);
    }
  }, []);

  useEffect(() => {
    fetchSheets();
    fetchSubmissionsAndForms();
  }, [fetchSheets, fetchSubmissionsAndForms]);

  // Create empty new sheet
  const handleCreateNewSheet = () => {
    setCurrentSheet({
      title: 'Nouvelle Fiche de Visite',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      event_date: '',
      event_type: 'Mariage',
      location_name: '',
      heure_installation: '11:00',
      heure_debut_prestation: '20:00',
      heure_fin_prestation: '04:00',
      deroulement: [
        { type: 'Apéritif', time: '18:30', description: 'Cocktail & Fond musical léger' },
        { type: 'Entrée des mariés', time: '20:00', description: 'Entrée dynamique' },
        { type: 'Repas', time: '20:30', description: 'Animation & Ambiance repas' },
        { type: 'Ouverture de bal', time: '23:30', description: 'Valse / Medley' },
        { type: 'Soirée dansante', time: '23:45', description: 'Mix Généraliste' }
      ],
      styles_musicaux: ["80's", "90's", "Pop", "Généraliste"],
      titres_phares: '',
      playlist_link: '',
      blacklist: '',
      dedicaces: '',
      selectedOptions: [],
      optionsTarifNotes: '',
      has_limiteur_son: false,
      has_detecteur_fumee: false,
      has_wifi: false,
      has_4g_5g: false,
      venue_notes: '',
      dj_notes: '',
      status: 'brouillon'
    });
    setActiveTab('client');
  };

  // Import from a form submission
  const handleImportSubmission = (sub) => {
    const data = sub.data || {};
    
    // Auto extract common field keys from form submission
    let clientName = sub.submitter_email || '';
    let clientEmail = sub.submitter_email || '';
    let clientPhone = '';
    let eventDate = '';
    let locationName = '';
    let eventType = 'Mariage';
    let notes = '';

    for (const [key, val] of Object.entries(data)) {
      const k = key.toLowerCase();
      if (!val) continue;
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

      if (k.includes('nom') || k.includes('prenom') || k.includes('client')) {
        if (!clientName || clientName === sub.submitter_email) clientName = strVal;
      }
      if (k.includes('email') || k.includes('mail')) {
        clientEmail = strVal;
      }
      if (k.includes('tel') || k.includes('phone') || k.includes('mobile')) {
        clientPhone = strVal;
      }
      if (k.includes('date')) {
        eventDate = strVal;
      }
      if (k.includes('lieu') || k.includes('salle') || k.includes('adresse') || k.includes('endroit')) {
        locationName = strVal;
      }
      if (k.includes('type') || k.includes('evenement') || k.includes('événement')) {
        eventType = strVal;
      }
      if (k.includes('message') || k.includes('note') || k.includes('remarque') || k.includes('commentaire')) {
        notes += `${key}: ${strVal}\n`;
      }
    }

    setCurrentSheet({
      submission_id: sub.id,
      title: `Fiche de Visite - ${clientName || 'Client Formulaire'}`,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_address: '',
      event_date: eventDate,
      event_type: eventType,
      location_name: locationName,
      heure_installation: '11:00',
      heure_debut_prestation: '20:00',
      heure_fin_prestation: '04:00',
      deroulement: [
        { type: 'Apéritif', time: '', description: '' },
        { type: 'Entrée des mariés', time: '', description: '' },
        { type: 'Ouverture de bal', time: '', description: '' },
        { type: 'Soirée dansante', time: '', description: '' }
      ],
      styles_musicaux: ["Généraliste"],
      titres_phares: '',
      playlist_link: '',
      blacklist: '',
      dedicaces: '',
      selectedOptions: [],
      optionsTarifNotes: '',
      has_limiteur_son: false,
      has_detecteur_fumee: false,
      has_wifi: false,
      has_4g_5g: false,
      venue_notes: '',
      dj_notes: notes ? `Importé depuis le formulaire:\n${notes}` : '',
      status: 'brouillon'
    });

    setShowImportModal(false);
    setActiveTab('client');
    toast.success(`Données importées depuis le formulaire "${sub.form_name || 'Prospect'}"`);
  };

  // Save current sheet
  const handleSaveSheet = async () => {
    if (!currentSheet) return;
    try {
      if (currentSheet.id) {
        const res = await axios.put(`${API}/visiting-sheets/${currentSheet.id}`, currentSheet, { headers });
        toast.success("Fiche de visite mise à jour !");
        setCurrentSheet(res.data);
      } else {
        const res = await axios.post(`${API}/visiting-sheets`, currentSheet, { headers });
        toast.success("Fiche de visite créée avec succès !");
        setCurrentSheet(res.data);
      }
      fetchSheets();
    } catch (err) {
      console.error("Erreur enregistrement fiche:", err);
      toast.error("Erreur lors de l'enregistrement de la fiche");
    }
  };

  // Delete sheet
  const handleDeleteSheet = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette fiche de visite ?")) return;
    try {
      await axios.delete(`${API}/visiting-sheets/${id}`, { headers });
      toast.success("Fiche de visite supprimée");
      if (currentSheet?.id === id) setCurrentSheet(null);
      fetchSheets();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Convert to contract
  const handleConvertToContract = async () => {
    if (!currentSheet) return;
    if (!currentSheet.id) {
      toast.info("Veuillez d'abord enregistrer la fiche de visite.");
      await handleSaveSheet();
    }

    try {
      setConverting(true);
      const res = await axios.post(`${API}/visiting-sheets/${currentSheet.id}/convert-to-contract`, {}, { headers });
      if (res.data?.success) {
        toast.success("Contrat généré avec succès dans l'application Contrats !");
        fetchSheets();
        if (window.confirm("Le contrat a été créé sous forme de brouillon dans l'application Contrats ! Voulez-vous y accéder immédiatement ?")) {
          window.location.href = `/contracts2`;
        }
      }
    } catch (err) {
      console.error("Erreur conversion contrat:", err);
      toast.error("Erreur lors de la création du contrat");
    } finally {
      setConverting(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!currentSheet) return;
    const s = currentSheet;

    const doc = new jsPDF();
    let y = 15;

    // Header Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59); // dark slate
    doc.text("FICHE DE VISITE & PRÉPARATION", 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - R'KEY PROD`, 15, y);
    y += 10;

    // Top horizontal divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 8;

    // 2-Column Info: Client & Planning
    const col1X = 15;
    const col2X = 110;
    let leftY = y;
    let rightY = y;

    // Col 1: Client Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Informations Client", col1X, leftY);
    leftY += 6;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Nom complet : ${s.client_name || 'Non renseigné'}`, col1X, leftY); leftY += 5;
    doc.text(`Email : ${s.client_email || 'Non renseigné'}`, col1X, leftY); leftY += 5;
    doc.text(`Téléphone : ${s.client_phone || 'Non renseigné'}`, col1X, leftY); leftY += 5;
    if (s.client_address) {
      doc.text(`Adresse : ${s.client_address}`, col1X, leftY); leftY += 5;
    }

    // Col 2: Event & Planning
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Événement & Planning", col2X, rightY);
    rightY += 6;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Type : ${s.event_type || 'Mariage'}`, col2X, rightY); rightY += 5;
    doc.text(`Date : ${s.event_date || 'A définir'}`, col2X, rightY); rightY += 5;
    doc.text(`Lieu : ${s.location_name || 'Non renseigné'}`, col2X, rightY); rightY += 5;
    doc.text(`Installation : ${s.heure_installation || '--:--'}`, col2X, rightY); rightY += 5;
    doc.text(`Prestation : ${s.heure_debut_prestation || '--:--'} à ${s.heure_fin_prestation || '--:--'}`, col2X, rightY); rightY += 5;

    y = Math.max(leftY, rightY) + 8;

    // Déroulement de soirée Table
    if (s.deroulement && s.deroulement.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Déroulement de Soirée", 15, y);
      y += 6;

      const tableBody = s.deroulement.map(item => [
        item.type || '',
        item.time || '',
        item.description || ''
      ]);

      doc.autoTable({
        startY: y,
        head: [["Type", "Horaire", "Descriptif / Ambiance"]],
        body: tableBody,
        theme: 'grid',
        styles: { cellPadding: 1.5, fontSize: 9 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        bodyStyles: { textColor: [51, 65, 85] },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25 } },
        margin: { left: 15, right: 15 }
      });

      y = (doc.lastAutoTable?.finalY || y) + 8;
    }

    // Playlist & Recommandations
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Préférences Musicales & Playlist", 15, y);
    y += 6;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    
    if (s.styles_musicaux && s.styles_musicaux.length > 0) {
      doc.text(`Styles abordés : ${s.styles_musicaux.join(', ')}`, 15, y); y += 5;
    }
    if (s.playlist_link) {
      doc.text(`Lien playlist : ${s.playlist_link}`, 15, y); y += 5;
    }
    if (s.titres_phares) {
      doc.setFont("helvetica", "bold");
      doc.text("Titres phares / À passer absolument :", 15, y); y += 5;
      doc.setFont("helvetica", "normal");
      const splitPhares = doc.splitTextToSize(s.titres_phares, 180);
      doc.text(splitPhares, 15, y); y += splitPhares.length * 4.5 + 2;
    }
    if (s.blacklist) {
      doc.setFont("helvetica", "bold");
      doc.text("À éviter (Blacklist) :", 15, y); y += 5;
      doc.setFont("helvetica", "normal");
      const splitBlack = doc.splitTextToSize(s.blacklist, 180);
      doc.text(splitBlack, 15, y); y += splitBlack.length * 4.5 + 2;
    }
    if (s.dedicaces) {
      doc.setFont("helvetica", "bold");
      doc.text("Dédicaces / Moments spécifiques :", 15, y); y += 5;
      doc.setFont("helvetica", "normal");
      const splitDedic = doc.splitTextToSize(s.dedicaces, 180);
      doc.text(splitDedic, 15, y); y += splitDedic.length * 4.5 + 2;
    }

    y += 4;

    // Options & Salle
    if (y > 220) { doc.addPage(); y = 15; }
    leftY = y;
    rightY = y;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Options & Matériel", col1X, leftY); leftY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (s.selectedOptions && s.selectedOptions.length > 0) {
      s.selectedOptions.forEach(opt => {
        doc.text(`- ${opt.name} (${opt.price}€)`, col1X, leftY); leftY += 4.5;
      });
    } else {
      doc.text("Aucune option sélectionnée", col1X, leftY); leftY += 4.5;
    }
    if (s.optionsTarifNotes) {
      const splitOptNotes = doc.splitTextToSize(`Notes: ${s.optionsTarifNotes}`, 85);
      doc.text(splitOptNotes, col1X, leftY); leftY += splitOptNotes.length * 4.5;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Caractéristiques de la Salle", col2X, rightY); rightY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`- Limiteur de son : ${s.has_limiteur_son ? 'OUI' : 'Non'}`, col2X, rightY); rightY += 4.5;
    doc.text(`- Détecteur de fumée : ${s.has_detecteur_fumee ? 'OUI' : 'Non'}`, col2X, rightY); rightY += 4.5;
    doc.text(`- Réseau Wifi : ${s.has_wifi ? 'OUI' : 'Non'}`, col2X, rightY); rightY += 4.5;
    doc.text(`- Réseau 4G/5G : ${s.has_4g_5g ? 'OUI' : 'Non'}`, col2X, rightY); rightY += 4.5;
    if (s.venue_notes) {
      const splitVenue = doc.splitTextToSize(`Obs: ${s.venue_notes}`, 85);
      doc.text(splitVenue, col2X, rightY); rightY += splitVenue.length * 4.5;
    }

    y = Math.max(leftY, rightY) + 6;

    if (s.dj_notes) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Notes DJ / Organisateur:", 15, y); y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const splitDj = doc.splitTextToSize(s.dj_notes, 180);
      doc.text(splitDj, 15, y);
    }

    doc.save(`Fiche_Visite_${(s.client_name || 'Client').replace(/\s+/g, '_')}.pdf`);
    toast.success("PDF téléchargé !");
  };

  // Filter sheets
  const filteredSheets = sheets.filter(sheet => {
    const matchesSearch = 
      (sheet.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sheet.client_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sheet.event_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sheet.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'brouillon') return matchesSearch && sheet.status !== 'convertie';
    if (filterStatus === 'convertie') return matchesSearch && sheet.status === 'convertie';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fiche de Visite Interactive</h1>
              <p className="text-sm text-slate-500">Préparation des rendez-vous clients, saisie des besoins et conversion en contrat.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentSheet ? (
              <>
                <button
                  onClick={() => setCurrentSheet(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Retour à la liste
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Imprimer / PDF
                </button>
                <button
                  onClick={handleSaveSheet}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  <FileCheck className="w-4 h-4" /> Enregistrer
                </button>
                <button
                  onClick={handleConvertToContract}
                  disabled={converting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {converting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Envoyer vers Contrats
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-indigo-600" /> Importer d'un Formulaire
                </button>
                <button
                  onClick={handleCreateNewSheet}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Nouvelle Fiche Vierge
                </button>
              </>
            )}
          </div>
        </div>

        {/* MAIN CONTENT VIEW */}
        {!currentSheet ? (
          /* LIST VIEW */
          <div className="space-y-6">
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un client, lieu, événement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Toutes ({sheets.length})
                </button>
                <button
                  onClick={() => setFilterStatus('brouillon')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    filterStatus === 'brouillon' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  En cours / Brouillons
                </button>
                <button
                  onClick={() => setFilterStatus('convertie')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    filterStatus === 'convertie' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Converties en Contrat
                </button>
              </div>
            </div>

            {/* SHEETS GRID */}
            {loading ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Chargement des fiches de visite...
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 text-slate-500 space-y-3">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-base font-semibold text-slate-700">Aucune fiche de visite trouvée</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Créez une nouvelle fiche vierge ou importez la soumission d'un formulaire client pour démarrer la préparation d'un rendez-vous.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                  >
                    Importer d'un formulaire
                  </button>
                  <button
                    onClick={handleCreateNewSheet}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                  >
                    Créer une fiche vierge
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSheets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSheet(s)}
                    className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 relative"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg">
                          {s.event_type || 'Mariage'}
                        </span>
                        {s.status === 'convertie' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Contrat créé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                            En préparation
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {s.client_name || 'Client sans nom'}
                      </h3>

                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.event_date || 'Date non définie'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{s.location_name || 'Lieu non renseigné'}</span>
                        </div>
                        {s.client_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{s.client_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Dernière modif : {new Date(s.updated_at || s.created_at).toLocaleDateString('fr-FR')}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleDeleteSheet(s.id, e)}
                          title="Supprimer la fiche"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* EDITOR VIEW */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* TABS NAVIGATION */}
            <div className="flex items-center gap-1 p-2 bg-slate-100/80 border-b border-slate-200 overflow-x-auto">
              {[
                { id: 'client', label: '1. Informations Client', icon: User },
                { id: 'timing', label: '2. Horaires & Déroulement', icon: Clock },
                { id: 'music', label: '3. Musique & Playlist', icon: Music },
                { id: 'options', label: '4. Options & Tarifs', icon: Sparkles },
                { id: 'venue', label: '5. Salle & Lieu', icon: Building2 },
                { id: 'dj_notes', label: '6. Notes DJ', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs md:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS */}
            <div className="p-6 md:p-8 space-y-6">

              {/* TAB 1: CLIENT & EVENT */}
              {activeTab === 'client' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">1. Informations Client & Événement</h2>
                    <p className="text-xs text-slate-500">Coordonnées du prospect/client et détails globaux de la prestation.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet du client / Mariés *</label>
                      <input
                        type="text"
                        placeholder="ex: Michaël Grissmer et Paula"
                        value={currentSheet.client_name || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, client_name: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'événement</label>
                      <select
                        value={currentSheet.event_type || 'Mariage'}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, event_type: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="Mariage">Mariage</option>
                        <option value="Anniversaire">Anniversaire</option>
                        <option value="Soirée d'entreprise">Soirée d'entreprise</option>
                        <option value="Cérémonie laïque">Cérémonie laïque</option>
                        <option value="Bal / Gala">Bal / Gala</option>
                        <option value="Autre prestation">Autre prestation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email</label>
                      <input
                        type="email"
                        placeholder="client@email.com"
                        value={currentSheet.client_email || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, client_email: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone(s)</label>
                      <input
                        type="text"
                        placeholder="06 00 00 00 00 / 06 00 00 00 00"
                        value={currentSheet.client_phone || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, client_phone: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date de l'événement</label>
                      <input
                        type="date"
                        value={currentSheet.event_date || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, event_date: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu / Nom de la salle</label>
                      <input
                        type="text"
                        placeholder="ex: Domaine de la Roseraie, Strasbourg"
                        value={currentSheet.location_name || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, location_name: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse postale du client</label>
                      <input
                        type="text"
                        placeholder="Adresse postale complète..."
                        value={currentSheet.client_address || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, client_address: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIMING & TIMELINE */}
              {activeTab === 'timing' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">2. Horaires & Déroulement de soirée</h2>
                    <p className="text-xs text-slate-500">Heures clés et étapes importantes de la soirée définies lors du rendez-vous.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Heure d'installation</label>
                      <input
                        type="text"
                        placeholder="ex: 11h"
                        value={currentSheet.heure_installation || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, heure_installation: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Heure de début de prestation</label>
                      <input
                        type="text"
                        placeholder="ex: 20:00"
                        value={currentSheet.heure_debut_prestation || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, heure_debut_prestation: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Heure de fin de prestation</label>
                      <input
                        type="text"
                        placeholder="ex: 04:00"
                        value={currentSheet.heure_fin_prestation || ''}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, heure_fin_prestation: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* TIMELINE TABLE */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">Tableau du Déroulement</h3>
                      <button
                        onClick={() => {
                          const deroulement = [...(currentSheet.deroulement || []), { type: '', time: '', description: '' }];
                          setCurrentSheet({ ...currentSheet, deroulement });
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 text-xs font-semibold text-slate-700 border-b border-slate-200">
                        <div className="col-span-3">Type / Étape</div>
                        <div className="col-span-3">Horaire</div>
                        <div className="col-span-5">Descriptif / Ambiance</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      <div className="divide-y divide-slate-200 bg-white">
                        {(currentSheet.deroulement || []).map((row, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center">
                            <div className="col-span-3">
                              <input
                                type="text"
                                placeholder="ex: Apéritif, Repas..."
                                list={`preset-types-${idx}`}
                                value={row.type || ''}
                                onChange={(e) => {
                                  const deroulement = [...currentSheet.deroulement];
                                  deroulement[idx].type = e.target.value;
                                  setCurrentSheet({ ...currentSheet, deroulement });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                              />
                              <datalist id={`preset-types-${idx}`}>
                                {TIMELINE_PRESETS.map((p) => <option key={p} value={p} />)}
                              </datalist>
                            </div>

                            <div className="col-span-3">
                              <input
                                type="text"
                                placeholder="ex: 20h - 21h30"
                                value={row.time || ''}
                                onChange={(e) => {
                                  const deroulement = [...currentSheet.deroulement];
                                  deroulement[idx].time = e.target.value;
                                  setCurrentSheet({ ...currentSheet, deroulement });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="col-span-5">
                              <input
                                type="text"
                                placeholder="Descriptif, consigne..."
                                value={row.description || ''}
                                onChange={(e) => {
                                  const deroulement = [...currentSheet.deroulement];
                                  deroulement[idx].description = e.target.value;
                                  setCurrentSheet({ ...currentSheet, deroulement });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="col-span-1 text-center">
                              <button
                                onClick={() => {
                                  const deroulement = currentSheet.deroulement.filter((_, i) => i !== idx);
                                  setCurrentSheet({ ...currentSheet, deroulement });
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 transition rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MUSIC & PLAYLIST */}
              {activeTab === 'music' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">3. Musique & Recommandations</h2>
                    <p className="text-xs text-slate-500">Styles musicaux souhaités, titres incontournables et musiques à éviter.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Styles Musicaux Abordés</label>
                    <div className="flex flex-wrap gap-2">
                      {MUSIC_STYLES_LIST.map((style) => {
                        const selected = (currentSheet.styles_musicaux || []).includes(style);
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => {
                              const currentStyles = currentSheet.styles_musicaux || [];
                              const styles_musicaux = selected
                                ? currentStyles.filter(s => s !== style)
                                : [...currentStyles, style];
                              setCurrentSheet({ ...currentSheet, styles_musicaux });
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                              selected
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {selected && '✓ '} {style}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lien Playlist (Spotify / Deezer / YouTube)</label>
                    <input
                      type="text"
                      placeholder="https://open.spotify.com/playlist/..."
                      value={currentSheet.playlist_link || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, playlist_link: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 mb-1">À passer absolument (Incontournables / Titres clés)</label>
                    <textarea
                      rows={4}
                      placeholder="Black Eyed Peas - Boom Boom Pow&#10;Lucenzo - Danza Kuduro&#10;Entrée des mariés: Dj Ska (jusqu'à 0:48)&#10;Ouverture de bal: Linh - J'avoue..."
                      value={currentSheet.titres_phares || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, titres_phares: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-emerald-300 bg-emerald-50/30 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-800 mb-1">À éviter (Blacklist)</label>
                    <textarea
                      rows={3}
                      placeholder="Frankie Vincent, Claude François, Chanson allemande..."
                      value={currentSheet.blacklist || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, blacklist: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-rose-300 bg-rose-50/30 rounded-xl focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-indigo-800 mb-1">Dédicaces & Demandes particulières pendant la soirée</label>
                    <textarea
                      rows={3}
                      placeholder="Louane - Secret pour Patience&#10;Marina - Las Ketchup..."
                      value={currentSheet.dedicaces || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, dedicaces: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-indigo-200 bg-indigo-50/20 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: OPTIONS & PRICING */}
              {activeTab === 'options' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">4. Options & Matériel</h2>
                    <p className="text-xs text-slate-500">Sélection des options techniques et prestations complémentaires abordées lors du rendez-vous.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">Options Sélectionnées</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {DEFAULT_OPTIONS.map((opt) => {
                        const isSelected = (currentSheet.selectedOptions || []).some(o => o.id === opt.id || o.name === opt.name);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              const currentOpt = currentSheet.selectedOptions || [];
                              const selectedOptions = isSelected
                                ? currentOpt.filter(o => o.id !== opt.id && o.name !== opt.name)
                                : [...currentOpt, opt];
                              setCurrentSheet({ ...currentSheet, selectedOptions });
                            }}
                            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by div click
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                              />
                              <span className="text-xs font-semibold">{opt.name}</span>
                            </div>
                            <span className="text-xs font-bold text-indigo-600">{opt.price} €</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Précisions sur les tarifs & options</label>
                    <textarea
                      rows={3}
                      placeholder="Commentaires sur les options choisies ou en attente..."
                      value={currentSheet.optionsTarifNotes || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, optionsTarifNotes: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: VENUE FEATURES */}
              {activeTab === 'venue' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">5. Caractéristiques de la Salle</h2>
                    <p className="text-xs text-slate-500">Spécificités techniques du lieu de réception et contraintes logistiques.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={currentSheet.has_limiteur_son || false}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, has_limiteur_son: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">Présence d'un limiteur de son</span>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={currentSheet.has_detecteur_fumee || false}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, has_detecteur_fumee: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">Présence d'un détecteur de fumée</span>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={currentSheet.has_wifi || false}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, has_wifi: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">Accès réseau Wifi dans la salle</span>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={currentSheet.has_4g_5g || false}
                        onChange={(e) => setCurrentSheet({ ...currentSheet, has_4g_5g: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">Réseau mobile 4G/5G accessible</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Observations sur la salle / accès / prises électriques</label>
                    <textarea
                      rows={4}
                      placeholder="Détails sur l'emplacement DJ, accès déchargement, nombre de marches, prise 16A dédiée..."
                      value={currentSheet.venue_notes || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, venue_notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: DJ NOTES */}
              {activeTab === 'dj_notes' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">6. Notes internes DJ & Organisateur</h2>
                    <p className="text-xs text-slate-500">Notes confidentielles visibles uniquement par le DJ et R'Key Prod.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Consignes confidentielles</label>
                    <textarea
                      rows={6}
                      placeholder="Remarques particulières, style d'animation souhaité, sonorité ou matériel spécifique à prévoir..."
                      value={currentSheet.dj_notes || ''}
                      onChange={(e) => setCurrentSheet({ ...currentSheet, dj_notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* BOTTOM ACTIONS BAR */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Status: <span className="font-semibold text-slate-700 uppercase">{currentSheet.status || 'Brouillon'}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={handleSaveSheet}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Enregistrer
                  </button>
                  <button
                    onClick={handleConvertToContract}
                    disabled={converting}
                    className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    {converting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Envoyer vers Contrats
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL: IMPORT FROM FORM SUBMISSION */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Importer une soumission de formulaire</h3>
                <p className="text-xs text-slate-300">Sélectionnez la réponse d'un prospect pour pré-remplir la fiche de visite.</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <input
                type="text"
                placeholder="Rechercher par email, nom ou nom de formulaire..."
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Aucune soumission de formulaire disponible.
                </div>
              ) : (
                submissions
                  .filter(sub => {
                    if (!importSearch) return true;
                    const search = importSearch.toLowerCase();
                    return (
                      (sub.form_name || '').toLowerCase().includes(search) ||
                      (sub.submitter_email || '').toLowerCase().includes(search) ||
                      JSON.stringify(sub.data || {}).toLowerCase().includes(search)
                    );
                  })
                  .map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => handleImportSubmission(sub)}
                      className="p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{sub.form_name || 'Formulaire'}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(sub.submitted_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-indigo-600">{sub.submitter_email || 'Sans email'}</p>
                        <div className="text-[11px] text-slate-500 truncate max-w-md">
                          {Object.entries(sub.data || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </div>
                      </div>

                      <button className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition whitespace-nowrap">
                        Importer
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
