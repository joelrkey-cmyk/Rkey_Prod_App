import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Music, Clock, Settings, User, Eye, Plus, Shield, MessageSquare, Headphones, Trash2, ArrowUp, ArrowDown, Copy, Check, ChevronDown, ChevronRight, ArrowLeft, Filter, Link as LinkIcon, ExternalLink, Download, RefreshCw, Upload, Search, MapPin, Loader2, Utensils, CheckCircle, XCircle, EyeOff, X, FileText, FileSearch, Bell, Gift, Smartphone, DownloadCloud, Share2, Info, Calendar, Edit3, Sparkles, Mail, Phone, Youtube, Camera, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateMandatHTML, generateEntrepriseHTML, generateArtisteHTML } from './contracts2/mandatHtmlGenerator';
import { isContractDirigeant, calculateContractDepositAmount, calculateContractRemainingBalance } from './contracts2/calculations';
import { defaultCompanySettings, musicStyles as availableMusicStyles } from './contracts2/constants';
import MyDjLogo from './MyDjLogo';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import CameraCaptureModal from './CameraCaptureModal';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const fixMangledFilenameDisplay = (str) => {
  if (!str) return '';
  try {
    const hasMangled = /([\u00C0-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2})/.test(str);
    if (hasMangled) {
      const rawBytes = Array.from(str).map(c => c.charCodeAt(0));
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(new Uint8Array(rawBytes));
      if (!decoded.includes('\uFFFD')) {
        return decoded;
      }
    }
    return str;
  } catch (e) {
    return str;
  }
};

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  let videoId = null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
  } catch (e) {
    console.error("Error parsing youtube URL:", e);
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const DjClientApp = ({ isPublic = false }) => {
  const { slug } = useParams();
  
  // -- Lifted States for Inner Render Functions --
  const [scheduleCustomItem, setScheduleCustomItem] = useState("");
  const [clientPhotoUploading, setClientPhotoUploading] = useState(false);
  const [planningLocalInfo, setPlanningLocalInfo] = useState({});
  const [docsUploading, setDocsUploading] = useState(false);
  const [docsUploadCategory, setDocsUploadCategory] = useState("Administrative");
  const [previewDoc, setPreviewDoc] = useState(null); // { title: string, url: string, type: 'pdf' | 'html' }
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [loadingPreviewBlob, setLoadingPreviewBlob] = useState(false);
  const [previewBlobError, setPreviewBlobError] = useState(null);
  const [previewNumPages, setPreviewNumPages] = useState(null);
  const [optionsBasket, setOptionsBasket] = useState([]);
  const [optionsSubmitting, setOptionsSubmitting] = useState(false);
  const [chatNewMessage, setChatNewMessage] = useState("");
  const chatContainerRef = useRef(null);
  const [venueUploading, setVenueUploading] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraSessionPhotos, setCameraSessionPhotos] = useState([]);
  const [djStandaloneExpandedYears, setDjStandaloneExpandedYears] = useState({});
  const [isEditingClientInfo, setIsEditingClientInfo] = useState(false);
  const [clientInfoEditData, setClientInfoEditData] = useState({});
  
  const SCHEDULE_CATEGORIES = [
    { title: "Événements du Repas", type: 'repas', options: ["Apéritif", "Entrée", "Plat", "Fromage", "Dessert"] },
    { title: "Musique", type: 'musique', options: ["Entrée des mariés", "Ouverture de bal", "Danse de couple", "Musique de 80 à début 2000", "Musique de 80 à aujourd'hui"] },
    { title: "Animations", type: 'animations', options: ["Blind test", "Chasse au trésor", "Quiz interactif", "Show hypnose", "Confessionnal"] }
  ];

  const [currentRoute, setCurrentRoute] = useState({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' });
  const [expandedSections, setExpandedSections] = useState({ past: false }); 
  const [djProfiles, setDjProfiles] = useState([]);
  const [selectedDjFilter, setSelectedDjFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [events, setEvents] = useState([]);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [pdfNotes, setPdfNotes] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [companySettings, setCompanySettings] = useState(defaultCompanySettings);

  // Lightbox / Image Previewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOpenLightbox = (images, index = 0) => {
    setLightboxImages(images || []);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // PWA Support States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstallTip, setShowIOSInstallTip] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission;
      }
    } catch (e) {
      console.warn("Notification permission check blocked:", e);
    }
    return 'default';
  });
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [dismissedPwa, setDismissedPwa] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('rkey_dismiss_pwa') === 'true';
      }
    } catch (e) {
      console.warn("localStorage read blocked in this context:", e);
    }
    return false;
  });

  const dismissPwaBanner = () => {
    setDismissedPwa(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rkey_dismiss_pwa', 'true');
      }
    } catch (e) {
      console.warn("localStorage write blocked in this context:", e);
    }
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
        toast.success("Installation lancée ! Merci 🎉");
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        setShowIOSInstallTip(true);
      } else {
        toast.info(
          "Pour installer l'application sur votre appareil : cliquez sur l'icône de partage ou les 3 points du navigateur, puis sélectionnez 'Ajouter à l'écran d'accueil' ou 'Installer'."
        );
      }
    }
  };

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

  const subscribeUserToPush = async (reg) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
      const { publicKey } = await res.json();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('access_token') ? { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } : {})
        },
        body: JSON.stringify({
          subscription,
          role: currentRoute.role, // 'admin', 'dj', 'client'
          eventId: currentRoute.eventId // if viewing a specific event
        })
      });
      console.log('User is subscribed to Web Push backend.');
    } catch (e) {
      console.error('Failed to subscribe the user: ', e);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("Votre navigateur ou appareil ne prend pas en charge les notifications natives.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success("Notifications push activées avec succès ! 🔔");
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            subscribeUserToPush(reg);
            reg.showNotification("Application R'Key Prod", {
              body: "Félicitations ! Vous recevrez désormais les notifications en direct (même l'application fermée). 🎧",
              icon: '/favicon.svg',
              badge: '/favicon.svg'
            });
          });
        } else {
          new Notification("Application R'Key Prod", {
            body: "Félicitations ! Vous recevrez désormais les notifications en direct. 🎧",
            icon: '/favicon.svg'
          });
        }
      } else {
        toast.info("Notifications refusées.");
      }
    } catch (e) {
      console.error("Permission request failed", e);
    }
  };

  // Attempt to restore background push notifications automatically if permission previously granted
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            subscribeUserToPush(reg);
          }).catch(err => console.warn("SW ready check rejected:", err));
        }
      }
    } catch (e) {
      console.warn("Auto background push check failed or blocked:", e);
    }
  }, [currentRoute.role, currentRoute.eventId]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkStandalone = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        setIsStandalone(true);
      }
    };
    checkStandalone();
    window.addEventListener('resize', checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkStandalone);
    };
  }, []);

  // Fetch and manage local blob URLs for PDF previews to avoid iframe security/cookie blocks
  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

    if (previewDoc && previewDoc.type === 'pdf') {
      setLoadingPreviewBlob(true);
      setPreviewBlobError(null);
      setPreviewBlobUrl(null);
      setPreviewNumPages(null);

      fetch(previewDoc.url)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Erreur lors du chargement (HTTP ${res.status})`);
          }
          const blob = await res.blob();
          if (active) {
            const objectUrl = URL.createObjectURL(blob);
            urlToRevoke = objectUrl;
            setPreviewBlobUrl(objectUrl);
            setLoadingPreviewBlob(false);
          }
        })
        .catch((err) => {
          console.error("Error fetching preview PDF blob:", err);
          if (active) {
            setPreviewBlobError(err.message || "Impossible de charger le PDF");
            setLoadingPreviewBlob(false);
          }
        });
    } else {
      setPreviewBlobUrl(null);
      setLoadingPreviewBlob(false);
      setPreviewBlobError(null);
      setPreviewNumPages(null);
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [previewDoc]);

  // Monitor updates of notifications to trigger local pushes
  useEffect(() => {
    const currentUnreadCount = events.reduce((sum, ev) => {
      const roleNotifs = ev.notifications && ev.notifications[currentRoute.role] 
        ? Object.keys(ev.notifications[currentRoute.role]) 
        : [];
      return sum + roleNotifs.length;
    }, 0);

    // Update document title badger
    if (currentUnreadCount > 0) {
      document.title = `(${currentUnreadCount}) R'Key Prod App`;
    } else {
      document.title = "R'Key Prod App";
    }

    // Trigger local push notification on new updates
    if (currentUnreadCount > lastNotificationCount) {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const msg = `Nouveau message ou modification dans votre portail R'Key Prod !`;
          let hasServiceWorker = false;
          try {
            hasServiceWorker = 'serviceWorker' in navigator;
          } catch (e) {}
          if (hasServiceWorker) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification("✨ Mise à jour R'Key Prod", {
                body: msg,
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                vibrate: [100, 50, 100]
              });
            }).catch(err => console.warn("SW notification trigger rejected:", err));
          } else {
            new Notification("✨ Mise à jour R'Key Prod", {
              body: msg,
              icon: '/favicon.svg'
            });
          }
        }
      } catch (e) {
        console.warn("Failed to trigger local notification in iframe:", e);
      }
    }
    setLastNotificationCount(currentUnreadCount);
  }, [events, currentRoute.role]);

  const renderStandalonePushBanner = () => {
    // Push notifications deactivated and invitation canceled by user request
    return null;
  };

  const renderPWABanner = () => {
    return null;
  };

  const renderIOSInstallModal = () => {
    return null;
  };

  useEffect(() => {
    if (isPublic && slug) {
      const manifestLink = document.querySelector("link[rel='manifest']");
      const originalHref = manifestLink ? manifestLink.getAttribute('href') : '/manifest.json';
      
      if (manifestLink) {
        manifestLink.setAttribute('href', `/api/pwa-manifest?slug=${encodeURIComponent(slug)}`);
      }
      
      const originalTitle = document.title;
      const formattedName = slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/\bEt\b/gi, 'Et');
      document.title = `My DJ - ${formattedName}`;

      return () => {
        document.title = originalTitle;
        const resetLink = document.querySelector("link[rel='manifest']");
        if (resetLink) {
          resetLink.setAttribute('href', originalHref);
        }
      };
    }
  }, [isPublic, slug]);

  useEffect(() => {
    fetchDjProfiles();
    fetchContractsAsEvents();
    fetchPdfNotes();
    fetchGlobalSettingsAdmin();
  }, []);

  const fetchGlobalSettingsAdmin = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/global-settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCompanySettings({
            company_name: data.company_name || "R'KEY PROD",
            bank_name: data.bank_name || "Tiime",
            bank_iban: data.bank_iban || "",
            bank_bic: data.bank_bic || "",
            bank_titulaire: data.bank_titulaire || "R'KEY PROD",
            youtube_tutorial_url: data.youtube_tutorial_url || "",
          });
        }
      }
    } catch (e) {
      console.error("Error fetching admin global settings", e);
    }
  };

  const fetchPdfNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/contract-pdf-notes`);
      if (res.ok) {
        const data = await res.json();
        setPdfNotes(data || []);
      }
    } catch (e) {
      console.error("Error fetching PDF notes:", e);
    }
  };

  const fetchDjProfiles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      let response = await fetch(`${BACKEND_URL}/api/dj-fiches`, { headers });
      if (!response.ok) {
        response = await fetch(`${BACKEND_URL}/api/dj-fiches/public`);
      }
      if (response.ok) {
        const data = await response.json();
        const normalizedData = data.map(dj => {
          const djNameLower = (dj.nom_artistique || '').toLowerCase();
          if (djNameLower === 'joel' || djNameLower === 'joël') return { ...dj, nom_artistique: "Joël R'Key" };
          if (djNameLower === 'stephane' || djNameLower === 'stéphane') return { ...dj, nom_artistique: "Stefan Edison" };
          return dj;
        });
        setDjProfiles(normalizedData);
      }
    } catch (error) {
      console.error("Error fetching dj profiles:", error);
    }
  };

  const fetchContractsAsEvents = async (silent = false) => {
    if (!silent) setIsLoadingEvents(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      let allContracts = [];
      
      if (isPublic && slug) {
         const publicRes = await fetch(`${BACKEND_URL}/api/public/dj-client/${slug}`);
         if (publicRes.ok) {
             const data = await publicRes.json();
             allContracts = data.events || [];
             if (data.companySettings) {
                 setCompanySettings(data.companySettings);
             }
             if (!silent) setAvailableOptions(data.availableOptions || []);
             if (!silent && currentRoute.view === 'list') {
                 if (data.role === 'client') {
                     if (allContracts.length > 0) {
                         setCurrentRoute({ view: 'detail', role: 'client', eventId: allContracts[0].id, mode: 'standalone_client' });
                     } else {
                         setCurrentRoute({ view: 'detail', role: 'client', eventId: null, mode: 'standalone_client' });
                     }
                 } else if (data.role === 'dj') {
                     const djName = data.djName || (allContracts[0]?.dj_profile_data?.nom_artistique || allContracts[0]?.dj_profile || slug);
                     setCurrentRoute({ view: 'dj-list', role: 'dj', activeDj: { name: djName }, mode: 'standalone_dj' });
                 }
             }
         }
      } else {
          const [archivedRes, optionsRes] = await Promise.all([
              fetch(`${BACKEND_URL}/api/contracts2/archived`, { headers }),
              fetch(`${BACKEND_URL}/api/material-options`, { headers })
          ]);

          if (optionsRes.ok) {
              const opts = await optionsRes.json();
              if (!silent) setAvailableOptions(opts);
          } else {
              const fallbackRes = await fetch(`${BACKEND_URL}/api/contract-options`, { headers });
              if (fallbackRes.ok) {
                  const fOpts = await fallbackRes.json();
                  if (!silent) setAvailableOptions(fOpts.options || fOpts || []);
              }
          }
          
          if (archivedRes.ok) {
              const data = await archivedRes.json();
              allContracts = [...allContracts, ...data];
          }
      }
      
      const mappedEvents = (allContracts || []).filter(Boolean).map(c => {
         const info = c.client_info || {};
         let clientName = c.clientName || info.name || c.client_name || 'Client inconnu';
         if (typeof clientName !== 'string') {
             clientName = String(clientName || 'Client inconnu');
         }
         const eventType = c.eventType || info.event_type || 'Événement';
         
         let djName = c.djName || c.dj_profile_data?.nom_artistique || c.dj_profile || "DJ";
         if (typeof djName !== 'string') {
             djName = String(djName || "DJ");
         }
         const normalizedDjNameLower = djName.toLowerCase();
         if (normalizedDjNameLower === 'joel' || normalizedDjNameLower === 'joël') {
             djName = "Joël R'Key";
         } else if (normalizedDjNameLower === 'stephane' || normalizedDjNameLower === 'stéphane') {
             djName = "Stefan Edison";
         }

         let rawDate = info.event_date || c.event_date || '1970-01-01';
         if (rawDate instanceof Date) {
             rawDate = rawDate.toISOString();
         } else if (typeof rawDate === 'number') {
             rawDate = new Date(rawDate).toISOString();
         } else if (typeof rawDate !== 'string') {
             rawDate = String(rawDate || '1970-01-01');
         }
         if (rawDate.includes('T')) {
             rawDate = rawDate.split('T')[0];
         }

         return {
            id: c.id,
            rawContractData: c,
            eventType: eventType,
            name: `${eventType} - ${clientName}`,
            date: rawDate,
            dj: { 
                name: djName, 
                login: djName.toLowerCase().replace(/\s+/g, '-')
            },
            client: {
                name: clientName,
                login: clientName.toLowerCase().replace(/\s+/g, '-')
            },
            rawClientInfo: info,
            contractInfo: {
               name: clientName,
               company: info.company || "",
               email: info.email || "Non qualifié",
               phone: info.phone || "Non qualifié",
               phone2: info.phone2 || "",
               location: info.event_location || "Lieu non défini",
               event_type: info.event_type || "",
               setup_date: info.setup_date || "",
               setup_time: info.setup_time || "",
               start_time: info.start_time || "",
               end_time: info.unlimited_time ? "Illimité" : (info.end_time || ""),
               unlimited_time: info.unlimited_time || false,
               guest_count: info.guest_count || ""
            },
            scheduleItems: c.event_order || [],
            djNotes: c.dj_notes || "",
            playlistLink: c.playlist_link || "",
            manualMustPlay: c.manual_must_play || "",
            blacklist: c.blacklist || "",
            entreeMaries: c.entree_maries || "",
            entreeMariesNotes: c.entree_maries_notes || "",
            ouvertureBal: c.ouverture_bal || "",
            ouvertureBalNotes: c.ouverture_bal_notes || "",
            dessert: c.dessert || "",
            dessertNotes: c.dessert_notes || "",
            dedicaces: c.dedicaces || "",
            customWeddingEvents: c.custom_wedding_events || [],
            selectedOptions: c.selected_options || [],
            requestedOptions: c.requested_options || [],
            chatMessages: c.chat_messages || [],
            selectedPdfNotes: c.selected_pdf_notes || [],
            eventDocuments: c.event_documents || [],
            notifications: c.notifications || { admin: {}, dj: {}, client: {} },
            cateringNotes: c.catering_notes || "",
            cateringDrinks: c.catering_drinks || false,
            cateringHotMealNoTable: c.catering_hot_meal_no_table || false,
            cateringHotMealNoTableQty: c.catering_hot_meal_no_table_qty !== undefined ? c.catering_hot_meal_no_table_qty : "",
            selectedMusicStyles: c.selected_music_styles || [],
            backgroundMusicAperitif: c.background_music_aperitif || "",
            showMusicStylesToClient: c.show_music_styles_to_client !== undefined ? c.show_music_styles_to_client : false,
            showFondSonoreToClient: c.show_fond_sonore_to_client !== undefined ? c.show_fond_sonore_to_client : false,
            showMandatToClient: c.show_mandat_to_client !== undefined ? c.show_mandat_to_client : false,
            showArtisteToClient: c.show_artiste_to_client !== undefined ? c.show_artiste_to_client : false,
            showEntrepriseToClient: c.show_entreprise_to_client !== undefined ? c.show_entreprise_to_client : false,
            client_photo: c.client_photo || null,
            venue_photos: c.venue_photos || [],
            venue_notes: c.venue_notes || "",
            has_limiteur_son: c.has_limiteur_son || false,
            has_detecteur_fumee: c.has_detecteur_fumee || false,
            has_no_limiteur_ni_detecteur: c.has_no_limiteur_ni_detecteur || false,
            has_wifi: c.has_wifi || false,
            has_4g_5g: c.has_4g_5g || false,
            optionsTarifNotes: c.options_tarif_notes || "",
            showOptionsTarifNotesToClient: c.show_options_tarif_notes_to_client !== undefined ? c.show_options_tarif_notes_to_client : false,
            playlistAudioFiles: c.playlist_audio_files || []
         };
      });
      
      mappedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      if (silent) {
        setEvents(prev => {
          if (JSON.stringify(prev.map(e => e.chatMessages)) !== JSON.stringify(mappedEvents.map(e => e.chatMessages)) ||
              JSON.stringify(prev.map(e => e.notifications)) !== JSON.stringify(mappedEvents.map(e => e.notifications))) {
            return mappedEvents;
          }
          return prev;
        });
      } else {
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error("Error fetching contracts as events:", error, "URL used:", BACKEND_URL);
      if (!silent) toast.error("Erreur lors du chargement des événements. Veuillez réessayer ou vérifier la connexion réseau.");
    } finally {
      if (!silent) setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    // Only start polling when data is fully loaded and user is authenticated/public
    if (isLoadingEvents) return;
    
    // Poll every 5 seconds to pull new chat messages & notifications silently
    const chatPollInterval = setInterval(() => {
      fetchContractsAsEvents(true); // silent fetch
    }, 5000);
    
    return () => clearInterval(chatPollInterval);
  }, [isLoadingEvents, isPublic, slug, currentRoute.role]);

  const [scheduleItems, setScheduleItems] = useState([]);
  
  const [notes, setNotes] = useState("");
  const [playlistLink, setPlaylistLink] = useState("");
  const [manualMustPlay, setManualMustPlay] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [entreeMaries, setEntreeMaries] = useState("");
  const [entreeMariesNotes, setEntreeMariesNotes] = useState("");
  const [ouvertureBal, setOuvertureBal] = useState("");
  const [ouvertureBalNotes, setOuvertureBalNotes] = useState("");
  const [dessert, setDessert] = useState("");
  const [dessertNotes, setDessertNotes] = useState("");
  const [dedicaces, setDedicaces] = useState("");
  const [customWeddingEvents, setCustomWeddingEvents] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const lastLoadedEventIdRef = useRef(null);

  useEffect(() => {
    if (currentRoute.eventId) {
      const ev = events.find(e => e.id === currentRoute.eventId);
      if (ev) {
        if (lastLoadedEventIdRef.current !== currentRoute.eventId) {
          lastLoadedEventIdRef.current = currentRoute.eventId;
          setScheduleItems(ev.scheduleItems || []);
          setNotes(ev.djNotes || "");
          setPlaylistLink(ev.playlistLink || "");
          setManualMustPlay(ev.manualMustPlay || "");
          setBlacklist(ev.blacklist || "");
          setEntreeMaries(ev.entreeMaries || "");
          setEntreeMariesNotes(ev.entreeMariesNotes || "");
          setOuvertureBal(ev.ouvertureBal || "");
          setOuvertureBalNotes(ev.ouvertureBalNotes || "");
          setDessert(ev.dessert || "");
          setDessertNotes(ev.dessertNotes || "");
          setDedicaces(ev.dedicaces || "");
          setCustomWeddingEvents(ev.customWeddingEvents || []);
          setChatMessages(ev.chatMessages || []);
          setAppointmentDate(ev.next_appointment_date || "");
          setAppointmentTime(ev.next_appointment_time || "");
          setIsEditingAppointment(false);
          
          // Initialize Planning info to stay synced with contracts
          setPlanningLocalInfo({
            setup_date: ev.contractInfo?.setup_date || "",
            setup_time: ev.contractInfo?.setup_time || "",
            start_time: ev.contractInfo?.start_time || "",
            end_time: ev.contractInfo?.end_time === "Illimité" ? "" : (ev.contractInfo?.end_time || ""),
            unlimited_time: ev.contractInfo?.unlimited_time || false
          });
          
          setIsEditingClientInfo(false);
          setClientInfoEditData({
            name: ev.contractInfo?.name || "",
            company: ev.contractInfo?.company || "",
            email: ev.contractInfo?.email || "",
            phone: ev.contractInfo?.phone || "",
            phone2: ev.contractInfo?.phone2 || "",
            guest_count: ev.rawClientInfo?.guest_count || "",
            event_location: ev.contractInfo?.location || ""
          });
        } else {
          // Keep chat messages alive and synced with background refetches
          setChatMessages(ev.chatMessages || []);
          if (!isEditingAppointment) {
            setAppointmentDate(ev.next_appointment_date || "");
            setAppointmentTime(ev.next_appointment_time || "");
          }
        }
      }
    } else {
      lastLoadedEventIdRef.current = null;
    }
  }, [currentRoute.eventId, events]);

  const updateContractDb = async (eventId, payload) => {
    try {
      const ev = events.find(e => e.id === eventId);
      const finalPayload = { ...payload };

      let section = null;
      let targetRolesToNotify = [];
      let titleForPush = "Nouvelle mise à jour";

      if (!payload.notifications) {
          if ('chat_messages' in payload) { section = 'chat'; titleForPush = "Nouveau message"; }
          if ('requested_options' in payload || 'options_tarif_notes' in payload || 'show_options_tarif_notes_to_client' in payload) section = 'options';
          if ('playlist_link' in payload || 'manual_must_play' in payload || 'blacklist' in payload || 'selected_music_styles' in payload || 'background_music_aperitif' in payload || 'playlist_audio_files' in payload || 'dedicaces' in payload) section = 'playlist';
          if ('event_order' in payload || 'dj_notes' in payload || 'client_info' in payload || 'entree_maries' in payload || 'entree_maries_notes' in payload || 'ouverture_bal' in payload || 'ouverture_bal_notes' in payload || 'dessert' in payload || 'dessert_notes' in payload || 'custom_wedding_events' in payload) section = 'planning';
          if ('client_photo' in payload || 'next_appointment_date' in payload || 'next_appointment_time' in payload) section = 'client_info';
          if ('selected_pdf_notes' in payload) section = 'documents';
          if ('venue_photos' in payload || 'venue_notes' in payload || 'has_limiteur_son' in payload || 'has_detecteur_fumee' in payload || 'has_no_limiteur_ni_detecteur' in payload || 'has_wifi' in payload || 'has_4g_5g' in payload) section = 'venue';
          if ('catering_notes' in payload || 'catering_drinks' in payload || 'catering_hot_meal_no_table' in payload || 'catering_hot_meal_no_table_qty' in payload) section = 'catering';
          
          if (section && currentRoute.role) {
              const rolesToNotify = ['admin', 'dj', 'client'].filter(r => r !== currentRoute.role);
              const newNotifs = ev && ev.notifications ? JSON.parse(JSON.stringify(ev.notifications)) : {admin:{}, dj:{}, client:{}};
              rolesToNotify.forEach(r => {
                  if (!newNotifs[r]) newNotifs[r] = {};
                  newNotifs[r][section] = true;
              });
              finalPayload.notifications = newNotifs;
              targetRolesToNotify = rolesToNotify;
          }
      }

      const token = localStorage.getItem('access_token');
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const endpoint = isPublic ? `/api/public/dj-client/${eventId}` : `/api/contracts2/${eventId}`;
      await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(finalPayload)
      });
      
      if (!payload.notifications && targetRolesToNotify.length > 0) {
        fetch(`${BACKEND_URL}/api/push/notify`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             eventId,
             targetRoles: targetRolesToNotify,
             title: titleForPush,
             body: "Il y a du nouveau sur l'application My DJ concernant votre événement.",
             url: window.location.href
           })
        }).catch(err => console.error("Push notify trigger failed:", err));
      }

      fetchContractsAsEvents();
    } catch(e) {
      console.error("Erreur lors de la sauvegarde: ", e);
    }
  };

  const handleAddCustomWeddingEvent = () => {
    const newItem = {
      id: "cw-" + Date.now(),
      title: "",
      track: "",
      notes: ""
    };
    const updated = [...customWeddingEvents, newItem];
    setCustomWeddingEvents(updated);
    if (currentRoute.eventId) {
      updateContractDb(currentRoute.eventId, { custom_wedding_events: updated });
    }
  };

  const handleUpdateCustomWeddingEvent = (id, field, value) => {
    const updated = customWeddingEvents.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setCustomWeddingEvents(updated);
  };

  const handleSaveCustomWeddingEvents = () => {
    if (currentRoute.eventId) {
      updateContractDb(currentRoute.eventId, { custom_wedding_events: customWeddingEvents });
    }
  };

  const handleDeleteCustomWeddingEvent = (id) => {
    const updated = customWeddingEvents.filter(item => item.id !== id);
    setCustomWeddingEvents(updated);
    if (currentRoute.eventId) {
      updateContractDb(currentRoute.eventId, { custom_wedding_events: updated });
    }
    toast.success("Événement de mariage personnalisé supprimé");
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  
  const filteredEvents = events.filter(e => {
    let djMatch = true;
    if (selectedDjFilter !== 'all') {
      const djNameFilter = selectedDjFilter.toLowerCase();
      const evDjName = e.dj.name.toLowerCase();
      djMatch = evDjName.includes(djNameFilter) || djNameFilter.includes(evDjName);
    }
    
    let searchMatch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      searchMatch = 
        (e.client?.name || '').toLowerCase().includes(q) ||
        (e.contractInfo?.company || '').toLowerCase().includes(q) ||
        (e.contractInfo?.location || '').toLowerCase().includes(q);
    }

    return djMatch && searchMatch;
  });

  const priorityEvents = filteredEvents.filter(e => {
    const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
    return notifs.length > 0;
  });

  const remainingEvents = filteredEvents.filter(e => {
    const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
    return notifs.length === 0;
  });

  const pastEvents = remainingEvents.filter(e => e.date < today);
  const futureEvents = remainingEvents.filter(e => e.date >= today);
  
  const futureByYear = futureEvents.reduce((acc, ev) => {
    const year = ev.date.substring(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(ev);
    return acc;
  }, {});

  const toggleSection = (key) => setExpandedSections(prev => ({...prev, [key]: !prev[key]}));
  const goToList = () => setCurrentRoute({ view: 'list', role: 'admin', eventId: null });
  const goToDetail = (eventId, role) => setCurrentRoute({ view: 'detail', role, eventId });

  const addScheduleItem = (description, type = 'custom') => {
    const newItem = { key: `dj-custom-${Date.now()}`, time: "", label: description, type, icon: "" };
    const newItems = [...scheduleItems, newItem];
    setScheduleItems(newItems);
    if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { event_order: newItems });
  };

  const removeScheduleItem = (key) => {
    const newItems = scheduleItems.filter(item => item.key !== key);
    setScheduleItems(newItems);
    if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { event_order: newItems });
  };

  const moveScheduleItem = (index, dir) => {
    if (index + dir < 0 || index + dir >= scheduleItems.length) return;
    const newItems = [...scheduleItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + dir];
    newItems[index + dir] = temp;
    setScheduleItems(newItems);
    if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { event_order: newItems });
  };

  const updateScheduleItem = (key, field, value) => {
    const newItems = scheduleItems.map(item => item.key === key ? { ...item, [field]: value } : item);
    setScheduleItems(newItems);
  };

  const handleUpdateScheduleItemBlur = () => {
    if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { event_order: scheduleItems });
  };

  const getDjLink = (dj) => {
    const slug = dj.login || dj.name.toLowerCase().replace(/\s+/g, '-');
    const host = 'rkeyprodapp.fr';
    return `${host}/${slug}`;
  };

  const getClientLink = (ev) => {
    const type = ev.name ? ev.name.split(' ')[0].toLowerCase().replace(/\s+/g, '-') : 'event';
    const clientName = (ev.client?.name || ev.contractInfo?.name || 'Client').toLowerCase().replace(/\s+/g, '-');
    const host = 'rkeyprodapp.fr';
    return `${host}/${type}-${clientName}`;
  };

  const EventTable = ({ eventsList }) => {
    const sectionNamesFr = {
      chat: "Discussion",
      options: "Tarifs & Options",
      playlist: "Playlist & Styles",
      planning: "Déroulement / Planning",
      client_info: "Infos Client",
      documents: "Documents administratifs",
      venue: "Fiche Technique Salle",
      catering: "Repas Artiste"
    };

    return (
      <div className="w-full">
        {/* Mobile View: Cards layout */}
        <div className="md:hidden space-y-3 p-1">
          {eventsList.map(ev => {
            const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
            const notifCount = notifKeys.length;
            const hasChatNotif = notifKeys.includes('chat');
            const listFr = notifKeys.map(k => sectionNamesFr[k] || k).join(', ');
            const isRowHighlit = notifCount > 0 && currentRoute.role === 'admin';

            return (
              <div 
                key={ev.id}
                className={`p-4 rounded-xl border transition-all duration-200 bg-white shadow-xs ${
                  isRowHighlit 
                    ? "border-red-300 bg-red-50/10 ring-1 ring-red-100" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <button 
                      onClick={() => setCurrentRoute({ view: 'detail', role: 'admin', eventId: ev.id, mode: 'dashboard' })}
                      className="text-sm font-extrabold text-slate-900 hover:text-indigo-600 hover:underline transition-colors text-left leading-tight pr-1"
                    >
                      {ev.name}
                    </button>
                    {ev.client?.name && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Client : <span className="font-semibold text-slate-700">{ev.client?.name}</span>
                      </div>
                    )}
                    {notifCount > 0 && (
                      <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-700 bg-red-50/80 px-2 py-0.5 rounded-md border border-red-100 animate-pulse">
                        <Bell className="w-3 h-3 text-red-500 shrink-0" />
                        Changements : {listFr}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="inline-block text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-3 pt-3 border-t border-dashed border-slate-100">
                  {/* DJ Access */}
                  <div className="bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Artiste/DJ</span>
                      <div className="font-bold text-slate-800 text-xs truncate">{ev.dj?.name || 'Non assigné'}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(`https://${getDjLink(ev.dj)}`); toast.success("Lien DJ copié"); }} 
                        className="p-1 px-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200 transition text-[10px] font-bold flex items-center gap-1"
                        title="Copier le lien DJ"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copier
                      </button>
                      <button 
                        onClick={() => setCurrentRoute({ view: 'dj-list', role: 'dj', eventId: null, mode: 'standalone_dj', activeDj: ev.dj })} 
                        className="p-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded border border-yellow-200 transition" 
                        title="Ouvrir le portail DJ"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Client Access */}
                  <div className="bg-green-50/30 p-2 rounded-lg border border-green-100/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Client</span>
                      <div className="font-bold text-slate-800 text-xs truncate">{ev.client?.name || 'Inconnu'}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(`https://${getClientLink(ev)}`); toast.success("Lien Client copié"); }} 
                        className="p-1 px-2 bg-white text-green-700 hover:bg-green-50 rounded border border-green-200 transition text-[10px] font-bold flex items-center gap-1"
                        title="Copier le lien Client"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copier
                      </button>
                      <button 
                        onClick={() => setCurrentRoute({ view: 'detail', role: 'client', eventId: ev.id, mode: 'standalone_client' })} 
                        className="p-1 bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 transition" 
                        title="Ouvrir le portail Client"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {eventsList.length === 0 && (
            <div className="py-8 text-center text-gray-500 italic bg-white rounded-xl border">Aucun événement.</div>
          )}
        </div>

        {/* Desktop View: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left bg-white">
            <thead>
              <tr className="border-b text-sm text-gray-500 bg-gray-50">
                <th className="py-3 px-4 rounded-tl-lg font-semibold">Événement</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 rounded-tr-lg font-semibold">Accès Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eventsList.map(ev => {
                const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
                const notifCount = notifKeys.length;
                const hasChatNotif = notifKeys.includes('chat');
                const isRowHighlit = notifCount > 0 && currentRoute.role === 'admin';

                const rowBg = isRowHighlit 
                  ? "bg-rose-50/40 group-hover/row:bg-rose-50/80 transition-all duration-200" 
                  : "hover:bg-gray-50 transition-all duration-200";

                const cellBorder = "py-4";
                const firstCellBorder = "pl-4 py-4";
                const lastCellBorder = "pr-4 py-4";

                return (
                  <tr 
                    key={ev.id} 
                    className={`transition-all duration-200 group/row border-b border-gray-100 last:border-b-0 ${isRowHighlit ? 'bg-rose-50/20' : ''}`}
                  >
                    <td className={`px-4 flex items-center gap-2 ${rowBg} ${firstCellBorder}`}>
                      <button 
                        onClick={() => setCurrentRoute({ view: 'detail', role: 'admin', eventId: ev.id, mode: 'dashboard' })}
                        className="font-bold text-gray-900 hover:text-indigo-600 hover:underline transition-colors text-left relative"
                      >
                        {ev.name}
                      </button>
                      {notifCount > 0 && (
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className={`flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[11px] font-black rounded-full shadow-sm ${hasChatNotif ? 'animate-pulse' : ''}`}>
                            {notifCount}
                          </span>
                          {isRowHighlit && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                              Nouveau
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 text-gray-600 whitespace-nowrap min-w-[125px] ${rowBg} ${cellBorder}`}>
                      {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}-${ev.date.split('-')[1]}-${ev.date.split('-')[0]}` : ev.date : ''}
                    </td>
                    <td className={`px-4 ${rowBg} ${lastCellBorder}`}>
                      <div className="text-sm font-medium mb-1">{ev.client?.name || ev.contractInfo?.name || 'Inconnu'}</div>
                      <div className="flex items-center gap-1">
                        <div className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded truncate max-w-[150px]">
                          {getClientLink(ev)}
                        </div>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(`https://${getClientLink(ev)}`); toast.success("Lien Client copié"); }} 
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition" 
                          title="Copier le lien Client"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setCurrentRoute({ view: 'detail', role: 'client', eventId: ev.id, mode: 'standalone_client' })} 
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition" 
                          title="Ouvrir le portail Client"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {eventsList.length === 0 && (
                <tr><td colSpan="3" className="py-8 text-center text-gray-500 italic">Aucun événement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const AdminListView = () => (
    <div className="space-y-6">
      <div className="flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            Mirador Administrateur - DJ/Client
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center flex-1 justify-end ml-4">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Nom, entreprise ou lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => window.location.href = '/contracts2'} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" /> Ajouter un événement
            </button>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg w-full sm:w-auto">
              <Filter className="w-5 h-5 text-gray-500" />
              <select 
                value={selectedDjFilter}
                onChange={(e) => setSelectedDjFilter(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 outline-none"
              >
                <option value="all">Tous les artistes</option>
                {djProfiles.map(dj => (
                  <option key={dj.id} value={dj.nom_artistique}>{dj.nom_artistique}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {djProfiles.length > 0 && (
          <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              Accès Artistes (Clic pour copier) :
            </span>
            <div className="flex flex-wrap gap-2">
              {djProfiles.map(dj => {
                const name = dj.nom_artistique || '';
                const slug = name.toLowerCase().replace(/\s+/g, '-');
                const link = `rkeyprodapp.fr/${slug}`;
                return (
                  <button
                    key={dj.id || name}
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${link}`);
                      toast.success(`Lien de l'artiste ${name} copié !`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition shadow-xs cursor-pointer group active:scale-95"
                    title={`Copier le lien direct de ${name}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors"></span>
                    <span>{name}</span>
                    <Copy className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 ml-0.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0 mt-0.5 border border-red-100">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800">Vidéo d'explication de l'interface (Tutoriel Client)</h4>
              <p className="text-xs text-gray-500 mt-0.5">Saisissez un lien YouTube pour guider vos clients dans l'utilisation de leur espace.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto md:max-w-md shrink-0">
            <input
              type="text"
              placeholder="Ex: https://www.youtube.com/watch?v=..."
              value={companySettings.youtube_tutorial_url || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, youtube_tutorial_url: e.target.value }))}
              className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            />
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token');
                  const response = await fetch(`${BACKEND_URL}/api/global-settings`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      ...companySettings,
                      youtube_tutorial_url: companySettings.youtube_tutorial_url
                    })
                  });
                  if (response.ok) {
                    toast.success("Lien de la vidéo tutoriel enregistré avec succès !");
                  } else {
                    toast.error("Erreur lors de l'enregistrement du lien.");
                  }
                } catch (err) {
                  console.error(err);
                  toast.error("Erreur lors de l'enregistrement du lien.");
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm shrink-0 active:scale-95 cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 text-slate-900">
        
        {/* Événements avec Notifications (Prioritaires) */}
        {priorityEvents.length > 0 && (
          <div className="mb-8 border-2 border-red-200 bg-red-50/20 rounded-2xl p-5 shadow-sm relative overflow-hidden animate-in fade-in duration-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2.5 text-red-700">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <Bell className="w-5 h-5 text-red-500 animate-bounce" />
              Notifications en cours
              <span className="bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center border border-red-600 shadow-sm min-w-6 h-6 px-1.5 animate-pulse">
                {priorityEvents.length}
              </span>
            </h3>
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-xs text-slate-900">
              {EventTable({ eventsList: priorityEvents })}
            </div>
          </div>
        )}

        {/* Réservé et À venir (Par Année) */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-6 ml-2 text-gray-800">Événements en cours ou à venir</h3>
          {Object.keys(futureByYear).sort().map(year => (
            <div key={year} className="mb-4 bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => toggleSection(year)}
                className="flex items-center gap-2 w-full text-left font-bold text-indigo-800 bg-indigo-50 p-4 hover:bg-indigo-100 transition-colors"
              >
                {expandedSections[year] !== false ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-indigo-600" />}
                Année {year} 
                <span className="ml-2 bg-indigo-200 text-indigo-800 text-xs py-1 px-2 rounded-full font-medium">
                  {futureByYear[year].length} événement(s)
                </span>
              </button>
              {expandedSections[year] !== false && (
                <div className="p-4 bg-white">
                  {EventTable({ eventsList: futureByYear[year] })}
                </div>
              )}
            </div>
          ))}
          {Object.keys(futureByYear).length === 0 && (
            <p className="text-gray-500 p-4 border rounded-xl text-center italic bg-gray-50">Aucun événement à venir.</p>
          )}
        </div>

        {/* Événements Passés */}
        <div>
          <button 
            onClick={() => toggleSection('past')}
            className="flex items-center gap-2 w-full text-left font-semibold text-gray-600 bg-gray-100 p-4 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {expandedSections['past'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Historique & Événements Passés
            <span className="ml-2 bg-gray-300 text-gray-700 text-xs py-1 px-2 rounded-full font-medium">
              {pastEvents.length}
            </span>
          </button>
          {expandedSections['past'] && (
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
              {EventTable({ eventsList: pastEvents })}
            </div>
          )}
        </div>

      </div>
    </div>
  );

  const ScheduleSection = ({ canEdit }) => {
    const ev = events.find(e => e.id === currentRoute.eventId);

    if (!canEdit && scheduleItems.length === 0 && !notes) return null;

    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 md:col-span-2 text-slate-900 ${getSectionHighlightClass('planning')}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Déroulement de Soirée
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {canEdit ? "Organisez les événements et animations de votre soirée" : "Aperçu du déroulement préparé par votre DJ"}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-2 text-sm flex items-center gap-1.5">
              Note DJ (visible uniquement par le DJ et R'Key Prod)
            </h4>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { dj_notes: e.target.value })}}
              className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              placeholder="Ajoutez ici des indications spécifiques..."
            />
          </div>
        )}

        {canEdit && <hr className="my-6 border-gray-200" />}

        {canEdit && (
          <div className="space-y-6 mb-8">
            {SCHEDULE_CATEGORIES.map(category => (
              <div key={category.type}>
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">{category.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {category.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => addScheduleItem(opt, category.type)}
                      className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-colors bg-white hover:bg-indigo-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={scheduleCustomItem}
                  onChange={(e) => setScheduleCustomItem(e.target.value)}
                  placeholder="Autre événement..." 
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  onKeyDown={e => { if(e.key === 'Enter' && scheduleCustomItem) { addScheduleItem(scheduleCustomItem); setScheduleCustomItem(''); } }}
                />
                <button 
                  onClick={() => { if(scheduleCustomItem) { addScheduleItem(scheduleCustomItem); setScheduleCustomItem(''); } }}
                  className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {canEdit && <hr className="my-6 border-gray-200" />}

        <div>
          <h4 className="font-semibold text-gray-800 mb-4">{canEdit ? 'Votre Programme' : 'Le Programme Prévu'}</h4>
          {scheduleItems.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun événement défini pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {scheduleItems.map((item, originalIdx) => {
                const idx = scheduleItems.findIndex(x => x.key === item.key);
                return (
                <div key={item.key} className={`flex items-center gap-3 p-3 rounded-lg border bg-gray-50`}>
                  {canEdit && (
                    <div className="flex flex-col gap-1 items-center px-2 border-r pr-4">
                      <button onClick={() => moveScheduleItem(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveScheduleItem(idx, +1)} disabled={idx === scheduleItems.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {canEdit ? (
                    <input 
                      type="time" 
                      value={item.time}
                      onChange={(e) => updateScheduleItem(item.key, 'time', e.target.value)}
                      onBlur={() => handleUpdateScheduleItemBlur()}
                      className="border rounded px-2 py-1 text-sm font-medium w-24 bg-white"
                      placeholder="HH:MM"
                    />
                  ) : (
                    item.time ? <div className="font-bold text-gray-700 w-16">{item.time}</div> : null
                  )}

                  {canEdit ? (
                    <input 
                      type="text" 
                      value={item.label}
                      onChange={(e) => updateScheduleItem(item.key, 'label', e.target.value)}
                      onBlur={() => handleUpdateScheduleItemBlur()}
                      className="flex-1 border rounded px-3 py-1 text-sm bg-white"
                    />
                  ) : (
                    <div className="flex-1 font-medium italic text-gray-700">
                      {item.isSurprise ? "Surprise" : item.label}
                      {item.isSurprise && <span className="ml-2 text-xs text-indigo-500">🎁</span>}
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 cursor-pointer bg-white px-2 py-1.5 rounded border border-gray-200">
                        <input
                          type="checkbox"
                          checked={item.isSurprise || false}
                          onChange={(e) => {
                            updateScheduleItem(item.key, 'isSurprise', e.target.checked);
                            handleUpdateScheduleItemBlur(); // We might need to handle this differently, but blur shouldn't be strictly necessary for checkbox.
                            if (currentRoute.eventId) {
                               const newItems = scheduleItems.map(i => i.key === item.key ? { ...i, isSurprise: e.target.checked } : i);
                               updateContractDb(currentRoute.eventId, { event_order: newItems });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        Surprise
                      </label>
                      <button 
                        onClick={() => removeScheduleItem(item.key)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded bg-white border border-gray-200 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PlaylistSection = ({ role }) => {
    const handleCopy = () => {
      if (playlistLink) {
        navigator.clipboard.writeText(playlistLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    };

    const ev = events.find(e => e.id === currentRoute.eventId);
    if (!ev) return null;
    const isMariage = ev && ev.eventType && ev.eventType.toLowerCase().includes('mariage');
    const isClient = role === 'client';
    const isAdminOrDj = role === 'admin' || role === 'dj';

    const allAudioFiles = ev.playlistAudioFiles || [];
    const audioFiles = isClient ? allAudioFiles.filter(a => !a.isSurprise) : allAudioFiles;

    const handleUploadAudio = async (file) => {
      const isAudio = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
      if (!isAudio) {
        toast.error("Format non supporté (MP3 ou WAV uniquement)");
        return;
      }

      setAudioUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${BACKEND_URL}/api/public/upload/audio`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (response.ok && data.url) {
          const newAudioFile = {
            id: 'audio-' + Date.now(),
            name: data.originalName || file.name,
            url: data.url,
            isSurprise: true,
            note: '',
            uploadedAt: new Date().toISOString()
          };
          const updatedList = [...allAudioFiles, newAudioFile];
          
          const newEvents = [...events];
          const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
          if (idx !== -1) {
            newEvents[idx].playlistAudioFiles = updatedList;
            setEvents(newEvents);
          }
          updateContractDb(currentRoute.eventId, { playlist_audio_files: updatedList });
          toast.success("Fichier audio ajouté !");
        } else {
          toast.error(data.detail || "Erreur de chargement du fichier");
        }
      } catch (err) {
        console.error("Audio Upload error: ", err);
        toast.error("Erreur de connexion au serveur");
      } finally {
        setAudioUploading(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadAudio(e.dataTransfer.files[0]);
      }
    };

    const handleDeleteAudio = async (audioId) => {
      if (!window.confirm("Voulez-vous vraiment supprimer ce fichier ?")) return;
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/playlist-audio/${audioId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const updatedList = allAudioFiles.filter(a => a.id !== audioId);
          const newEvents = [...events];
          const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
          if (idx !== -1) {
            newEvents[idx].playlistAudioFiles = updatedList;
            setEvents(newEvents);
          }
          toast.success("Fichier audio supprimé !");
        } else {
          const errData = await response.json();
          toast.error(errData.error || "Erreur lors de la suppression du fichier");
        }
      } catch (err) {
        console.error("Error deleting audio file:", err);
        toast.error("Erreur de connexion au serveur");
      }
    };

    const handleNoteUpdate = (audioId, newNote) => {
      const updatedList = allAudioFiles.map(a => a.id === audioId ? { ...a, note: newNote } : a);
      const newEvents = [...events];
      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
      if (idx !== -1) {
        newEvents[idx].playlistAudioFiles = updatedList;
        setEvents(newEvents);
      }
    };

    const handleNoteBlur = (audioId, finalNote) => {
      const updatedList = allAudioFiles.map(a => a.id === audioId ? { ...a, note: finalNote } : a);
      updateContractDb(currentRoute.eventId, { playlist_audio_files: updatedList });
    };

    const handleToggleAudioSurprise = (audioId) => {
      const updatedList = allAudioFiles.map(a => a.id === audioId ? { ...a, isSurprise: !a.isSurprise } : a);
      const newEvents = [...events];
      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
      if (idx !== -1) {
        newEvents[idx].playlistAudioFiles = updatedList;
        setEvents(newEvents);
      }
      updateContractDb(currentRoute.eventId, { playlist_audio_files: updatedList });
      toast.success("Statut Surprise du fichier mis à jour !");
    };

    const handleMusicStyleToggle = (style) => {
      if (!isAdminOrDj) return;
      const currentStyles = ev.selectedMusicStyles || [];
      const isSelected = currentStyles.includes(style);
      const newStyles = isSelected 
        ? currentStyles.filter(s => s !== style)
        : [...currentStyles, style];
      
      updateContractDb(currentRoute.eventId, { selected_music_styles: newStyles });
      const newEvents = [...events];
      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
      newEvents[idx].selectedMusicStyles = newStyles;
      setEvents(newEvents);
    };

    const selectAllMusicStyles = () => {
      if (!isAdminOrDj) return;
      updateContractDb(currentRoute.eventId, { selected_music_styles: [...availableMusicStyles] });
      const newEvents = [...events];
      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
      newEvents[idx].selectedMusicStyles = [...availableMusicStyles];
      setEvents(newEvents);
    };

    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 md:col-span-2 text-slate-900 ${getSectionHighlightClass('playlist')}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-600" />
            Playlist et Styles Musicaux
          </h3>
        </div>
        
        <div className="space-y-6">
          
           {/* FOND SONORE APPENDED HERE */}
          {(!isClient || ev.showFondSonoreToClient) && (
            <div className="border rounded-lg p-5 bg-indigo-50 border-indigo-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-indigo-700 text-base">Fond Sonore (Apéritif / Accueil)</h4>
                {isAdminOrDj && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 bg-white py-1.5 px-3 rounded-full border border-gray-200 hover:bg-gray-50 transition">
                    <input 
                      type="checkbox" 
                      checked={ev.showFondSonoreToClient || false} 
                      onChange={e => {
                        const val = e.target.checked;
                        updateContractDb(currentRoute.eventId, { show_fond_sonore_to_client: val });
                        const newEvents = [...events];
                        const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                        newEvents[idx].showFondSonoreToClient = val;
                        setEvents(newEvents);
                      }} 
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" 
                    />
                    {!ev.showFondSonoreToClient ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-green-600" />}
                    Montrer au client
                  </label>
                )}
              </div>
              <div>
                {isAdminOrDj ? (
                  <input
                    type="text"
                    value={ev.backgroundMusicAperitif || ''}
                    onChange={e => {
                      const newEvents = [...events];
                      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                      newEvents[idx].backgroundMusicAperitif = e.target.value;
                      setEvents(newEvents);
                    }}
                    onBlur={e => updateContractDb(currentRoute.eventId, { background_music_aperitif: e.target.value })}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    placeholder="Ex: Jazz instrumental, Lounge, Chill-out..."
                  />
                ) : (
                  <p className="font-medium text-gray-900 bg-white p-3 rounded border border-indigo-100 min-h-[44px]">
                    {ev.backgroundMusicAperitif || "Aucun fond sonore spécifique renseigné."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STYLES MUSICAUX ABORDES */}
          {(!isClient || ev.showMusicStylesToClient) && (
            <div className="border rounded-lg p-5 bg-gray-50 border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700 text-base">Styles Musicaux Abordés</h4>
                <div className="flex items-center gap-2">
                  {isAdminOrDj && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 bg-white py-1.5 px-3 rounded-full border border-gray-200 hover:bg-gray-50 transition mr-2">
                        <input 
                          type="checkbox" 
                          checked={ev.showMusicStylesToClient || false} 
                          onChange={e => {
                            const val = e.target.checked;
                            updateContractDb(currentRoute.eventId, { show_music_styles_to_client: val });
                            const newEvents = [...events];
                            const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                            newEvents[idx].showMusicStylesToClient = val;
                            setEvents(newEvents);
                          }} 
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" 
                        />
                        {!ev.showMusicStylesToClient ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-green-600" />}
                        Montrer au client
                      </label>
                      <button type="button" onClick={selectAllMusicStyles} className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200 transition">
                        Tout sélectionner
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {availableMusicStyles.map((style) => (
                  <div 
                    key={style} 
                    className={`p-2 px-4 rounded-lg border-2 transition-all text-center text-sm ${
                      (ev.selectedMusicStyles || []).includes(style) 
                        ? "border-purple-500 bg-purple-50 text-purple-700 font-medium cursor-pointer" 
                        : "border-slate-200 bg-white text-slate-500"
                    } ${isAdminOrDj ? "cursor-pointer hover:border-slate-300" : ""}`} 
                    onClick={() => handleMusicStyleToggle(style)}
                  >
                    {style}
                  </div>
                ))}
              </div>
              
              {isClient && (!ev.selectedMusicStyles || ev.selectedMusicStyles.length === 0) && (
                <p className="text-gray-500 text-sm italic mt-2">Le DJ n'a pas encore défini de styles musicaux.</p>
              )}
            </div>
          )}

          <div className="border rounded-lg p-5 bg-gray-50 border-gray-200">
            <h4 className="font-semibold text-green-700 mb-3 text-base">À passer absolument</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lien de la playlist (Recommandé - Spotify, Deezer, Apple Music...)
              </label>
              {role === 'client' || role === 'admin' ? (
                <input 
                  type="url"
                  value={playlistLink}
                  onChange={(e) => setPlaylistLink(e.target.value)}
                  onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { playlist_link: e.target.value })}}
                  placeholder="https://..."
                  className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-white border p-2 rounded-md flex-1 text-sm text-gray-600 truncate">
                    {playlistLink || "Aucun lien fourni par le client"}
                  </div>
                  {playlistLink && (
                    <button 
                      onClick={handleCopy}
                      className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md transition flex-shrink-0 flex items-center justify-center w-10 h-10 shadow-sm"
                      title="Copier le lien"
                    >
                      {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Titres et chansons (saisie manuelle)
               </label>
               <textarea
                 value={manualMustPlay}
                 onChange={(e) => setManualMustPlay(e.target.value)}
                 onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { manual_must_play: e.target.value })}}
                 disabled={playlistLink.trim().length > 0}
                 className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-75"
                 placeholder={playlistLink.trim().length > 0 ? "Non disponible lorsqu'un lien de playlist est fourni." : "Ajoutez des titres manuellement ici..."}
               />
            </div>
          </div>

          {isMariage && (
            <div className="border rounded-lg p-5 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2">
                <h4 className="font-semibold text-indigo-700 text-base">Section Mariage</h4>
                  <button 
                    type="button"
                    onClick={handleAddCustomWeddingEvent}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un moment
                  </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrée des mariés</label>
                  <input
                    type="text"
                    value={entreeMaries}
                    onChange={(e) => setEntreeMaries(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { entree_maries: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    placeholder="Titre exact (ex: Bruno Mars - Marry You)"
                  />
                  <input
                    type="text"
                    value={entreeMariesNotes}
                    onChange={(e) => setEntreeMariesNotes(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { entree_maries_notes: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 mt-2 text-gray-600"
                    placeholder="Observations (ex: Lancer à 0:34)..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ouverture de bal</label>
                  <input
                    type="text"
                    value={ouvertureBal}
                    onChange={(e) => setOuvertureBal(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { ouverture_bal: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    placeholder="Titre exact (ex: Ed Sheeran - Perfect)"
                  />
                  <input
                    type="text"
                    value={ouvertureBalNotes}
                    onChange={(e) => setOuvertureBalNotes(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { ouverture_bal_notes: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 mt-2 text-gray-600"
                    placeholder="Observations..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dessert (facultatif)</label>
                  <input
                    type="text"
                    value={dessert}
                    onChange={(e) => setDessert(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { dessert: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    placeholder="Titre exact ou laissez vide si géré par le DJ"
                  />
                  <input
                    type="text"
                    value={dessertNotes}
                    onChange={(e) => setDessertNotes(e.target.value)}
                    onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { dessert_notes: e.target.value })}}
                    className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 mt-2 text-gray-600"
                    placeholder="Observations..."
                  />
                </div>

                {/* Custom Wedding Events */}
                {customWeddingEvents.map((item) => (
                  <div key={item.id} className="relative border-t border-indigo-200/60 pt-4 mt-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 mr-2">
                        <label className="block text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-1">Nom du moment</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateCustomWeddingEvent(item.id, 'title', e.target.value)}
                          onBlur={handleSaveCustomWeddingEvents}
                          placeholder="Ex: Danse avec le papa"
                          className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-gray-800 placeholder-gray-400 bg-white"
                        />
                      </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomWeddingEvent(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-all mt-5"
                          title="Supprimer ce moment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Titre exact du morceau</label>
                        <input
                          type="text"
                          value={item.track}
                          onChange={(e) => handleUpdateCustomWeddingEvent(item.id, 'track', e.target.value)}
                          onBlur={handleSaveCustomWeddingEvents}
                          className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                          placeholder="Ex: Henri Salvador - Jardin d'hiver"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Observation / Note</label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleUpdateCustomWeddingEvent(item.id, 'notes', e.target.value)}
                          onBlur={handleSaveCustomWeddingEvents}
                          className="w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 text-gray-600"
                          placeholder="Observations..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-lg p-5 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-700 mb-3 text-base">Dédicaces dans la soirée</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">
               Titres à dédicacer (issus de votre playlist)
            </label>
            <textarea
              value={dedicaces}
              onChange={(e) => setDedicaces(e.target.value)}
              onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { dedicaces: e.target.value })}}
              className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Ex: ACDC - Highway to hell pour tonton Xavier"
            />
          </div>
          
          <div className="border rounded-lg p-5 bg-red-50 border-red-100">
            <h4 className="font-semibold text-red-700 mb-3 text-base">À éviter (Blacklist)</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">
               Styles, artistes ou titres à ne pas passer
            </label>
            <textarea
              value={blacklist}
              onChange={(e) => setBlacklist(e.target.value)}
              onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { blacklist: e.target.value })}}
              className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              placeholder="Ex: Pas de hard rock, éviter The Black Eyed Peas..."
            />
          </div>

          {/* Section d'upload de fichiers audio */}
          <div className="border rounded-lg p-5 bg-indigo-50/40 border-indigo-200 mt-6" id="section-audio-upload">
            <h4 className="font-bold text-indigo-800 mb-1 text-base flex items-center gap-2">
              🎵 Dépôt de Fichiers Audio (MP3 / WAV)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Idéal pour fournir des versions spécifiques de morceaux, des montages, des audios d'interventions ou de surprises.
            </p>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragOver
                  ? "border-indigo-600 bg-indigo-50/80 scale-[1.01]"
                  : "border-indigo-200 bg-white hover:bg-slate-50 hover:border-indigo-400"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".mp3,.wav,audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadAudio(e.target.files[0]);
                  }
                }}
              />
              
              {audioUploading ? (
                <div className="flex flex-col items-center gap-2 animate-pulse">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-sm font-medium text-indigo-700 font-sans">Téléversement du fichier en cours...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-indigo-500" />
                  <span className="text-sm font-medium text-slate-700 font-sans">
                    Déposez votre fichier ici, ou <span className="text-indigo-600 underline cursor-pointer">parcourez vos fichiers</span>
                  </span>
                  <span className="text-xs text-slate-400">MP3 ou WAV uniquement</span>
                </div>
              )}
            </div>

            {/* Audio Files List */}
            {audioFiles.length > 0 && (
              <div className="mt-6 space-y-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fichiers téléversés ({audioFiles.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {audioFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between relative group hover:border-indigo-300 transition-all ${
                        file.isSurprise 
                          ? "bg-purple-50/30 border-purple-200" 
                          : "bg-white border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Music className={`w-4 h-4 flex-shrink-0 ${file.isSurprise ? "text-purple-500" : "text-indigo-500"}`} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-semibold truncate text-slate-800" title={file.name}>
                              {file.name}
                            </span>
                            {file.isSurprise && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                  <Gift className="w-3 h-3" /> Surprise
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isAdminOrDj && (
                            <button
                              type="button"
                              onClick={() => handleToggleAudioSurprise(file.id)}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                file.isSurprise 
                                  ? "text-purple-600 bg-purple-100/60 hover:bg-purple-100 border-purple-200" 
                                  : "text-slate-400 hover:text-purple-600 hover:bg-slate-100 border-transparent"
                              }`}
                              title={file.isSurprise ? "Rendre visible au client (Actuellement Surprise)" : "Masquer pour le client (Définir comme Surprise)"}
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAudio(file.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                            title="Supprimer le fichier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Native Audio Preview */}
                      <div className="my-2">
                        <audio src={file.url.startsWith('http') ? file.url : `${BACKEND_URL}${file.url}`} controls className="w-full h-8" />
                      </div>

                      {/* Note Input */}
                      <div className="mt-2.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Note / Description de cet audio :
                        </label>
                        <input
                          type="text"
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 hover:bg-white focus:bg-white"
                          placeholder="À quoi sert ce fichier ? (ex: Musique d'arrivée du gâteau)"
                          value={file.note || ''}
                          onChange={(e) => handleNoteUpdate(file.id, e.target.value)}
                          onBlur={(e) => handleNoteBlur(file.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DetailView = () => {
    const ev = events.find(e => e.id === currentRoute.eventId) || events[0];
    if (!ev) return <div>Chargement...</div>;
    
    const isDashboard = currentRoute.mode === 'dashboard';
    const isDjStandalone = currentRoute.mode === 'standalone_dj';
    const isClientStandalone = currentRoute.mode === 'standalone_client';

    const handleBack = () => {
      if (isDjStandalone) {
        setCurrentRoute({ view: 'dj-list', role: 'dj', eventId: null, mode: 'standalone_dj', activeDj: ev.dj });
      } else {
        goToList();
      }
    };

    const generateClientPDF = (shouldPreviewParam = false) => {
      const shouldPreview = typeof shouldPreviewParam === 'boolean' ? shouldPreviewParam : false;
      const doc = new jsPDF();
      
      let y = 20;
      
      const rawInfo = ev.rawClientInfo || {};
      const formatDate = (dateStr) => {
        if (!dateStr) return "Non définie";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      if (rawInfo.setup_date || rawInfo.setup_time || rawInfo.start_time || rawInfo.end_time || rawInfo.unlimited_time) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text("Planning de la prestation", 15, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99);
        doc.text(`Date d'installation : ${formatDate(rawInfo.setup_date)}`, 15, y); y += 6;
        doc.text(`Heure d'installation : ${rawInfo.setup_time || "À définir"}`, 15, y); y += 6;
        doc.text(`Début de prestation : ${rawInfo.start_time || "--:--"}`, 15, y); y += 6;
        doc.text(`Fin de prestation : ${rawInfo.unlimited_time ? "Illimité" : (rawInfo.end_time || "--:--")}`, 15, y); y += 10;
      }

      const clientScheduleItems = scheduleItems || [];
      if (clientScheduleItems.length > 0) {
        doc.setFontSize(16);
        doc.text("Déroulement de Soirée", 15, y);
        y += 4;
        
        const tableBody = clientScheduleItems.map(item => {
          const itemLabel = item.isSurprise ? "Surprise" : (item.label || item.description || "");
          return [
            item.isSurprise ? "Surprise" : "",
            item.time || "",
            itemLabel
          ];
        });
        
        autoTable(doc, {
          startY: y,
          head: [["Type", "Horaire", "Descriptif"]],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200], fontStyle: 'bold' },
          bodyStyles: { textColor: [75, 85, 99], lineWidth: 0.1, lineColor: [229, 231, 235] },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 22 }
          },
          margin: { left: 15, right: 15 },
          tableLineWidth: 0.1,
          tableLineColor: [229, 231, 235],
        });
        
        y = (doc.lastAutoTable?.finalY || (doc.autoTable && doc.autoTable.previous ? doc.autoTable.previous.finalY : null) || y) + 10;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("Playlist & Recommandations", 15, y);
      y += 8;

      doc.setFontSize(12); doc.setTextColor(0, 0, 0);
      doc.text(`Lien playlist: ${playlistLink ? "Oui" : "Non"}`, 15, y); y += 10;
      
      if (manualMustPlay) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(21, 128, 61); // green-700
        doc.text("À passer absolument:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(manualMustPlay, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }

      if (ev && ev.eventType && ev.eventType.toLowerCase().includes('mariage')) {
        if (entreeMaries) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(12); doc.setTextColor(67, 56, 202); // indigo-700
          doc.text("Entrée des mariés:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(entreeMaries, 180);
          doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
        }
        if (ouvertureBal) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(12); doc.setTextColor(67, 56, 202); 
          doc.text("Ouverture de bal:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(ouvertureBal, 180);
          doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
        }
        if (dessert) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(12); doc.setTextColor(67, 56, 202);
          doc.text("Dessert:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(dessert, 180);
          doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
        }
        if (customWeddingEvents && customWeddingEvents.length > 0) {
          customWeddingEvents.forEach(item => {
            if (item.title || item.track || item.notes) {
              if (y > 270) { doc.addPage(); y = 20; }
              const dispTitle = item.title || "Événement personnalisé";
              doc.setFontSize(12); doc.setTextColor(67, 56, 202); 
              doc.text(`${dispTitle}:`, 15, y); y += 6;
              
              if (item.track) {
                doc.setFontSize(10); doc.setTextColor(75, 85, 99);
                const splitTrack = doc.splitTextToSize(`Musique: ${item.track}`, 180);
                doc.text(splitTrack, 15, y); y += splitTrack.length * 5;
              }
              if (item.notes) {
                doc.setFontSize(10); doc.setTextColor(75, 85, 99);
                const splitNotes = doc.splitTextToSize(`Observation: ${item.notes}`, 180);
                doc.text(splitNotes, 15, y); y += splitNotes.length * 5;
              }
              y += 5;
            }
          });
        }
      }

      if (dedicaces) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(29, 78, 216); // blue-700
        doc.text("Dédicaces dans la soirée:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(dedicaces, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }

      if (blacklist) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(185, 28, 28); // red-700
        doc.text("À éviter (Blacklist):", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(blacklist, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }

      const contractOptions = ev.selectedOptions || [];
      const requestedOptions = ev.requestedOptions || [];
      
      if (contractOptions.length > 0 || requestedOptions.length > 0 || (ev.optionsTarifNotes && ev.showOptionsTarifNotesToClient)) {
        if (y > 250) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFontSize(14); doc.setTextColor(0, 0, 0);
        doc.text("Tarifs & Options:", 15, y); y += 8;
        
        if (contractOptions.length > 0) {
          doc.setFontSize(11); doc.setTextColor(0, 0, 0);
          doc.text("Options validées au contrat:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          contractOptions.forEach(opt => {
             doc.text(`- ${opt.name} (${opt.price}€)`, 15, y); y += 5;
          });
          y += 2;
        }
        
        if (requestedOptions.length > 0) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(11); doc.setTextColor(0, 0, 0);
          doc.text("Options en attente de validation:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          requestedOptions.forEach(opt => {
             doc.text(`- ${opt.name} (${opt.price}€)`, 15, y); y += 5;
          });
          y += 2;
        }

        if (ev.optionsTarifNotes && ev.showOptionsTarifNotesToClient) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(11); doc.setTextColor(0, 0, 0);
          doc.text("Notes sur les tarifs:", 15, y); y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitNotes = doc.splitTextToSize(ev.optionsTarifNotes, 180);
          doc.text(splitNotes, 15, y); y += splitNotes.length * 5 + 5;
        }
      }

      if (shouldPreview) {
        return doc.output('bloburl');
      } else {
        const safeName = (ev.contractInfo?.name || ev.name || 'Client').replace(/\s+/g, '_');
        doc.save(`Recapitulatif_${safeName}.pdf`);
      }
    };

    const generateDjPDF = (shouldPreviewParam = false) => {
      const shouldPreview = typeof shouldPreviewParam === 'boolean' ? shouldPreviewParam : false;
      const doc = new jsPDF();
      
      let y = 10;
      const startY = 10;
      let leftY = startY;
      let rightY = startY;
      
      const info = ev.contractInfo;
      if (info) {
        doc.setFontSize(14);
        doc.text("Informations Client", 15, leftY);
        leftY += 8;
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(`Nom complet : ${info.name || '-'}`, 15, leftY); leftY += 6;
        if (info.company) { doc.text(`Entreprise : ${info.company}`, 15, leftY); leftY += 6; }
        doc.text(`Email : ${info.email || '-'}`, 15, leftY); leftY += 6;
        doc.text(`Téléphone : ${info.phone || '-'} ${info.phone2 ? '/ ' + info.phone2 : ''}`, 15, leftY); leftY += 6;
        doc.text(`Lieu : ${info.location || '-'}`, 15, leftY); leftY += 6;
      }
      
      const rawInfo = ev.rawClientInfo || {};
      const formatDate = (dateStr) => {
        if (!dateStr) return "Non définie";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      if (rawInfo.setup_date || rawInfo.setup_time || rawInfo.start_time || rawInfo.end_time || rawInfo.unlimited_time) {
        const rightColX = 110;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Planning de la prestation", rightColX, rightY);
        rightY += 8;
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(`Date d'installation : ${formatDate(rawInfo.setup_date)}`, rightColX, rightY); rightY += 6;
        doc.text(`Heure d'installation : ${rawInfo.setup_time || "À définir"}`, rightColX, rightY); rightY += 6;
        doc.text(`Début de prestation : ${rawInfo.start_time || "--:--"}`, rightColX, rightY); rightY += 6;
        doc.text(`Fin de prestation : ${rawInfo.unlimited_time ? "Illimité" : (rawInfo.end_time || "--:--")}`, rightColX, rightY); rightY += 6;
      }

      y = Math.max(leftY, rightY) + 6;
      
      if (scheduleItems && scheduleItems.length > 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        doc.text("Déroulement de Soirée", 15, y);
        y += 4;
        
        const tableBody = scheduleItems.map(item => [
          item.isSurprise ? "Surprise" : "",
          item.time || "",
          item.label || item.description || ""
        ]);
        
        autoTable(doc, {
          startY: y,
          head: [["Type", "Horaire", "Descriptif"]],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200], fontStyle: 'bold' },
          bodyStyles: { textColor: [75, 85, 99], lineWidth: 0.1, lineColor: [229, 231, 235] },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 22 }
          },
          margin: { left: 15, right: 15 },
          tableLineWidth: 0.1,
          tableLineColor: [229, 231, 235],
        });
        
        y = (doc.lastAutoTable?.finalY || (doc.autoTable && doc.autoTable.previous ? doc.autoTable.previous.finalY : null) || y) + 14;
      }
      
      if (y > 240) { doc.addPage(); y = 10; }
      
      // --- Centered Section: Playlist & Recommandations ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Playlist & Recommandations", 105, y, { align: 'center' });
      y += 6;

      doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      doc.text(`Lien playlist: ${playlistLink ? "Oui" : "Non"}`, 105, y, { align: 'center' });
      y += 6;
      
      if (ev && ev.selectedMusicStyles && ev.selectedMusicStyles.length > 0) {
        if (y > 280) { doc.addPage(); y = 10; }
        doc.setFontSize(11); doc.setTextColor(0, 0, 0);
        doc.text("Styles Musicaux Abordés:", 105, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(ev.selectedMusicStyles.join(', '), 180);
        splitText.forEach(line => {
          if (y > 285) { doc.addPage(); y = 10; }
          doc.text(line, 105, y, { align: 'center' });
          y += 5;
        });
        y += 3;
      }
      
      if (manualMustPlay) {
        if (y > 280) { doc.addPage(); y = 10; }
        doc.setFontSize(11); doc.setTextColor(21, 128, 61); // green-700
        doc.text("À passer absolument:", 105, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(manualMustPlay, 180);
        splitText.forEach(line => {
          if (y > 285) { doc.addPage(); y = 10; }
          doc.text(line, 105, y, { align: 'center' });
          y += 5;
        });
        y += 3;
      }

      if (ev && ev.eventType && ev.eventType.toLowerCase().includes('mariage')) {
        if (entreeMaries) {
          if (y > 280) { doc.addPage(); y = 10; }
          doc.setFontSize(11); doc.setTextColor(67, 56, 202); // indigo-700
          doc.text("Entrée des mariés:", 105, y, { align: 'center' });
          y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(entreeMaries, 180);
          splitText.forEach(line => {
            if (y > 285) { doc.addPage(); y = 10; }
            doc.text(line, 105, y, { align: 'center' });
            y += 5;
          });
          if (entreeMariesNotes) {
            const splitNotes = doc.splitTextToSize(`Observation: ${entreeMariesNotes}`, 180);
            splitNotes.forEach(line => {
              if (y > 285) { doc.addPage(); y = 10; }
              doc.text(line, 105, y, { align: 'center' });
              y += 5;
            });
          }
          y += 3;
        }
        if (ouvertureBal) {
          if (y > 280) { doc.addPage(); y = 10; }
          doc.setFontSize(11); doc.setTextColor(67, 56, 202); 
          doc.text("Ouverture de bal:", 105, y, { align: 'center' });
          y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(ouvertureBal, 180);
          splitText.forEach(line => {
            if (y > 285) { doc.addPage(); y = 10; }
            doc.text(line, 105, y, { align: 'center' });
            y += 5;
          });
          if (ouvertureBalNotes) {
            const splitNotes = doc.splitTextToSize(`Observation: ${ouvertureBalNotes}`, 180);
            splitNotes.forEach(line => {
              if (y > 285) { doc.addPage(); y = 10; }
              doc.text(line, 105, y, { align: 'center' });
              y += 5;
            });
          }
          y += 3;
        }
        if (dessert) {
          if (y > 280) { doc.addPage(); y = 10; }
          doc.setFontSize(11); doc.setTextColor(67, 56, 202);
          doc.text("Dessert:", 105, y, { align: 'center' });
          y += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(dessert, 180);
          splitText.forEach(line => {
            if (y > 285) { doc.addPage(); y = 10; }
            doc.text(line, 105, y, { align: 'center' });
            y += 5;
          });
          if (dessertNotes) {
            const splitNotes = doc.splitTextToSize(`Observation: ${dessertNotes}`, 180);
            splitNotes.forEach(line => {
              if (y > 285) { doc.addPage(); y = 10; }
              doc.text(line, 105, y, { align: 'center' });
              y += 5;
            });
          }
          y += 3;
        }
        if (customWeddingEvents && customWeddingEvents.length > 0) {
          customWeddingEvents.forEach(item => {
            if (item.title || item.track || item.notes) {
              if (y > 280) { doc.addPage(); y = 10; }
              const dispTitle = item.title || "Evénement personnalisé";
              doc.setFontSize(11); doc.setTextColor(67, 56, 202); 
              doc.text(`${dispTitle}:`, 105, y, { align: 'center' });
              y += 6;
              
              if (item.track) {
                doc.setFontSize(10); doc.setTextColor(75, 85, 99);
                const splitTrack = doc.splitTextToSize(`Musique: ${item.track}`, 180);
                splitTrack.forEach(line => {
                  if (y > 285) { doc.addPage(); y = 10; }
                  doc.text(line, 105, y, { align: 'center' });
                  y += 5;
                });
              }
              if (item.notes) {
                doc.setFontSize(10); doc.setTextColor(75, 85, 99);
                const splitNotes = doc.splitTextToSize(`Observation: ${item.notes}`, 180);
                splitNotes.forEach(line => {
                  if (y > 285) { doc.addPage(); y = 10; }
                  doc.text(line, 105, y, { align: 'center' });
                  y += 5;
                });
              }
              y += 3;
            }
          });
        }
      }

      if (dedicaces) {
        if (y > 280) { doc.addPage(); y = 10; }
        doc.setFontSize(11); doc.setTextColor(29, 78, 216);
        doc.text("Dédicaces dans la soirée:", 105, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(dedicaces, 180);
        splitText.forEach(line => {
          if (y > 285) { doc.addPage(); y = 10; }
          doc.text(line, 105, y, { align: 'center' });
          y += 5;
        });
        y += 3;
      }

      if (blacklist) {
        if (y > 280) { doc.addPage(); y = 10; }
        doc.setFontSize(11); doc.setTextColor(185, 28, 28);
        doc.text("À éviter (Blacklist):", 105, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(blacklist, 180);
        splitText.forEach(line => {
          if (y > 285) { doc.addPage(); y = 10; }
          doc.text(line, 105, y, { align: 'center' });
          y += 5;
        });
        y += 3;
      }

      // --- NEXT PAGE (Page suivante) for Tarifs & Options and Caractéristiques de la salle ---
      doc.addPage();
      const startColY = 10;
      leftY = startColY;
      rightY = startColY;
      const leftColX = 15;
      const rightColX = 110;
      const colWidth = 85;

      // Left Column: Tarifs & Options
      const contractOptions = ev.selectedOptions || [];
      const requestedOptions = ev.requestedOptions || [];
      
      doc.setFontSize(16); doc.setTextColor(0, 0, 0);
      doc.text("Tarifs & Options", leftColX, leftY); leftY += 8;
      
      if (contractOptions.length > 0 || requestedOptions.length > 0 || ev.optionsTarifNotes) {
        if (contractOptions.length > 0) {
          doc.setFontSize(12); doc.setTextColor(0, 0, 0);
          doc.text("Options validées:", leftColX, leftY); leftY += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          contractOptions.forEach(opt => {
             const splitOpt = doc.splitTextToSize(`- ${opt.name} (${opt.price}€)`, colWidth);
             doc.text(splitOpt, leftColX, leftY); leftY += splitOpt.length * 5;
          });
          leftY += 4;
        }
        
        if (requestedOptions.length > 0) {
          doc.setFontSize(12); doc.setTextColor(0, 0, 0);
          doc.text("Options en attente:", leftColX, leftY); leftY += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          requestedOptions.forEach(opt => {
             const splitOpt = doc.splitTextToSize(`- ${opt.name} (${opt.price}€)`, colWidth);
             doc.text(splitOpt, leftColX, leftY); leftY += splitOpt.length * 5;
          });
          leftY += 4;
        }

        if (ev.optionsTarifNotes) {
          doc.setFontSize(12); doc.setTextColor(0, 0, 0);
          doc.text("Notes sur les tarifs:", leftColX, leftY); leftY += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitNotes = doc.splitTextToSize(ev.optionsTarifNotes, colWidth);
          doc.text(splitNotes, leftColX, leftY); leftY += splitNotes.length * 5 + 5;
        }
      } else {
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        doc.text("Aucun tarif ou option spécifique renseigné.", leftColX, leftY); leftY += 6;
      }

      // Right Column: Caractéristiques de la salle
      const hasVenueFeatures = ev.has_limiteur_son || ev.has_detecteur_fumee || ev.has_wifi || ev.has_4g_5g;
      
      doc.setFontSize(16); doc.setTextColor(0, 0, 0);
      doc.text("Caractéristiques de la salle", rightColX, rightY); rightY += 8;
      
      if (hasVenueFeatures || ev.venue_notes) {
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        if (ev.has_limiteur_son) { doc.text("- Présence d'un limiteur de son", rightColX, rightY); rightY += 5; }
        if (ev.has_detecteur_fumee) { doc.text("- Présence d'un détecteur de fumée", rightColX, rightY); rightY += 5; }
        if (ev.has_wifi) { doc.text("- Wi-Fi disponible", rightColX, rightY); rightY += 5; }
        if (ev.has_4g_5g) { doc.text("- Réseau 4G/5G accessible", rightColX, rightY); rightY += 5; }
        
        if (ev.venue_notes) {
          rightY += 4;
          doc.setFontSize(12); doc.setTextColor(0, 0, 0);
          doc.text("Observations sur la salle:", rightColX, rightY); rightY += 6;
          doc.setFontSize(10); doc.setTextColor(75, 85, 99);
          const splitText = doc.splitTextToSize(ev.venue_notes, colWidth);
          doc.text(splitText, rightColX, rightY); rightY += splitText.length * 5 + 5;
        }
      } else {
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        doc.text("Aucune caractéristique spécifique renseignée.", rightColX, rightY); rightY += 6;
      }

      y = Math.max(leftY, rightY) + 12;

      if (notes) {
        if (y > 275) { doc.addPage(); y = 10; }
        doc.setFontSize(14); doc.setTextColor(0, 0, 0);
        doc.text("Notes DJ:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(notes, 180);
        doc.text(splitText, 15, y);
      }

      if (shouldPreview) {
        return doc.output('bloburl');
      } else {
        const safeName = (ev.contractInfo?.name || ev.name || 'Client').replace(/\s+/g, '_');
        doc.save(`Fiche_DJ_${safeName}.pdf`);
      }
    };

    const AppointmentBannerSection = () => {
      const hasDefinedAppointment = !!ev.next_appointment_date;
      const isAdminOrDj = currentRoute.role === 'admin' || currentRoute.role === 'dj';

      const handleSaveAppointment = async () => {
        try {
          await updateContractDb(ev.id, {
            next_appointment_date: appointmentDate,
            next_appointment_time: appointmentTime
          });
          setIsEditingAppointment(false);
          toast.success("Date du rendez-vous enregistrée !");
        } catch (err) {
          toast.error("Erreur de sauvegarde");
        }
      };

      const handleClearAppointment = async () => {
        if (window.confirm("Réinitialiser le rendez-vous à la valeur par défaut ?")) {
          try {
            await updateContractDb(ev.id, {
              next_appointment_date: null,
              next_appointment_time: null
            });
            setAppointmentDate("");
            setAppointmentTime("");
            setIsEditingAppointment(false);
            toast.success("Rendez-vous réinitialisé.");
          } catch (err) {
            toast.error("Erreur lors de la réinitialisation");
          }
        }
      };

      const formatAppointmentDate = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const handleCancelAppointment = () => {
        setAppointmentDate(ev.next_appointment_date || "");
        setAppointmentTime(ev.next_appointment_time || "");
        setIsEditingAppointment(false);
      };

      return (
        <div className="bg-red-700/90 text-white rounded-xl p-4 shadow-md flex flex-col gap-3 border border-red-800/10 mb-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 text-white rounded-lg shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Prochain rendez-vous
                </h4>
                <p className="text-xs text-red-100 mt-0.5 font-medium">
                  {hasDefinedAppointment ? (
                    <span>
                      🗓️ Votre prochain rendez-vous de préparation est fixé le <span className="font-bold underline">{formatAppointmentDate(ev.next_appointment_date)}</span>
                      {ev.next_appointment_time && (
                        <span> à <span className="font-bold underline">{ev.next_appointment_time}</span></span>
                      )}
                    </span>
                  ) : (
                    <span>🔴 Le prochain rendez-vous se fera dans la semaine de l'événement.</span>
                  )}
                </p>
              </div>
            </div>

            {isAdminOrDj && !isEditingAppointment && (
              <button
                onClick={() => {
                  setAppointmentDate(ev.next_appointment_date || "");
                  setAppointmentTime(ev.next_appointment_time || "");
                  setIsEditingAppointment(true);
                }}
                className="bg-white hover:bg-stone-50 text-red-800 font-extrabold py-1.5 px-3 rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap self-stretch sm:self-auto select-none"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Modifier la date du rendez-vous
              </button>
            )}
          </div>

          {isEditingAppointment && (
            <div className="bg-red-800/30 p-3 rounded-lg border border-white/10 flex flex-col gap-3 mt-1 animate-in fade-in duration-200">
              <p className="text-xs text-red-100 font-semibold">Saisir les informations du prochain rendez-vous (DJ / Admin) :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-red-200 uppercase font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full text-slate-900 bg-white border border-red-300 rounded-lg p-2 text-xs focus:ring-red-500 focus:border-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-red-200 uppercase font-bold mb-1">Heure / Précisions</label>
                  <input
                    type="text"
                    placeholder="Ex: 18h35"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full text-slate-900 bg-white border border-red-300 rounded-lg p-2 text-xs focus:ring-red-500 focus:border-red-500 font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                {hasDefinedAppointment && (
                  <button
                    onClick={handleClearAppointment}
                    className="mr-auto px-3 py-1.5 bg-red-800/60 hover:bg-red-900/60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Réinitialiser par défaut
                  </button>
                )}
                <button
                  onClick={handleCancelAppointment}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-950/40 text-red-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-red-500/30"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAppointment}
                  className="px-4 py-1.5 bg-white hover:bg-stone-50 text-red-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" /> Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    const DjInfoSection = () => {
      const getPhotoSrc = (url) => {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        const base = BACKEND_URL || '';
        if (url.startsWith('/')) {
          return `${base}${url}`;
        }
        return `${base}/${url}`;
      };

      const getCleanAvatar = (name) => {
        if (!name) return 'DJ';
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return initials;
      };

      const djProfileKey = ev.rawContractData?.dj_profile || '';
      
      const currentDjProfile = djProfiles.find(p => {
        if (!p) return false;
        const pId = String(p.id || '').toLowerCase();
        const pDbId = String(p._id || '').toLowerCase();
        const pArtistLower = String(p.nom_artistique || '').toLowerCase();
        const pCompletLower = String(p.nom_complet || '').toLowerCase();
        const keyLower = String(djProfileKey).toLowerCase();

        // Exact matches
        if (pId === keyLower || pDbId === keyLower || pArtistLower === keyLower) {
          return true;
        }

        // Robust matches
        if (keyLower === 'joel' || keyLower === 'joël') {
          return pArtistLower.includes('joel') || pArtistLower.includes('joël') || pArtistLower.includes("r'key") || pArtistLower.includes("rkey") || pCompletLower.includes('ruttkay');
        }
        if (keyLower === 'stephane' || keyLower === 'stéphane') {
          return pArtistLower.includes('stephane') || pArtistLower.includes('stéphane') || pArtistLower.includes('stefan') || pArtistLower.includes('edison') || pCompletLower.includes('jacoby');
        }

        if (pArtistLower.includes(keyLower) || keyLower.includes(pArtistLower)) {
          return true;
        }

        return false;
      });
      
      const djSnapshot = ev.rawContractData?.dj_profile_data || {};
      
      const rawStageName = currentDjProfile?.nom_artistique || djSnapshot.nom_artistique || ev.dj?.name || 'Artiste DJ';
      const fullName = currentDjProfile?.nom_complet || djSnapshot.nom_complet || '';

      const isJoel = String(djProfileKey).toLowerCase().includes('joel') || 
                     String(djProfileKey).toLowerCase().includes('joël') || 
                     String(rawStageName).toLowerCase().includes("r'key") || 
                     String(rawStageName).toLowerCase().includes("rkey") ||
                     String(fullName).toLowerCase().includes("ruttkay");

      const isStephane = String(djProfileKey).toLowerCase().includes('stephane') || 
                        String(djProfileKey).toLowerCase().includes('stéphane') || 
                        String(rawStageName).toLowerCase().includes('edison') ||
                        String(fullName).toLowerCase().includes('jacoby');

      let stageName = rawStageName;
      let email = currentDjProfile?.email || djSnapshot.email || '';
      let phone = currentDjProfile?.telephone || djSnapshot.phone || '';
      let titre = currentDjProfile?.titre || djSnapshot.titre || 'Animateur DJ';
      let photoUrl = currentDjProfile?.photo_url || djSnapshot.photo_url || '';

      if (isJoel) {
        stageName = "Joël R'Key";
        email = "info@rkey-prod.fr";
        phone = "07 83 55 36 74";
        titre = "Gérant de R'KEY PROD";
      } else if (isStephane) {
        stageName = "Stefan Edison";
        email = "stephane@rkey-prod.fr";
        phone = "06 31 21 61 14";
        titre = "Animateur DJ";
      }

      return (
        <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/30 rounded-xl shadow-sm border border-indigo-100 p-6 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-950">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              Votre DJ pour l'événement
            </h3>
            <span className="text-xs bg-indigo-100/70 border border-indigo-200/50 text-indigo-700 font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs shadow-xs">
              {titre}
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="flex-shrink-0 flex items-center justify-center mx-auto md:mx-0">
              {photoUrl ? (
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-md border-2 border-indigo-200 bg-white flex-shrink-0">
                  <img 
                    src={getPhotoSrc(photoUrl)} 
                    alt={stageName} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.getElementById('dj-photo-fallback-circle-detail');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div 
                    id="dj-photo-fallback-circle-detail" 
                    className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center select-none"
                    style={{ display: 'none' }}
                  >
                    <span className="text-white text-2xl font-black tracking-wider">
                      {getCleanAvatar(stageName)}
                    </span>
                    <span className="text-[9px] text-indigo-200 font-bold uppercase mt-1 tracking-widest leading-none">
                      DJ
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md border-2 border-indigo-200 flex flex-col items-center justify-center select-none flex-shrink-0">
                  <span className="text-white text-2xl font-black tracking-wider">
                    {getCleanAvatar(stageName)}
                  </span>
                  <span className="text-[9px] text-indigo-200 font-bold uppercase mt-1 tracking-widest leading-none">
                    DJ
                  </span>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-2/3 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white/70 backdrop-blur-xs p-6 rounded-2xl border border-indigo-100/50 shadow-xs">
                <div>
                  <p className="text-[10px] font-bold text-indigo-950/40 uppercase tracking-widest mb-1">Nom d'artiste</p>
                  <p className="font-semibold text-slate-800 text-base leading-tight">{stageName}</p>
                </div>
                
                {email && (
                  <div className="sm:col-span-1">
                    <p className="text-[10px] font-bold text-indigo-950/40 uppercase tracking-widest mb-1">Adresse Email</p>
                    <a href={`mailto:${email}`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-sm leading-tight break-all inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {email}
                    </a>
                  </div>
                )}
                
                {phone && (
                  <div className="sm:col-span-1">
                    <p className="text-[10px] font-bold text-indigo-950/40 uppercase tracking-widest mb-1">Téléphone</p>
                    <a href={`tel:${phone}`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-sm leading-tight inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const ClientInfoSection = () => {
      const info = ev.contractInfo;
      
      if (!info) return null;
      
      const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setClientPhotoUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await fetch(`${BACKEND_URL}/api/public/upload/photo`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          if (response.ok && data.url) {
            updateContractDb(currentRoute.eventId, { client_photo: data.url });
            toast.success("Photo mise à jour");
          } else {
            toast.error("Erreur d'upload");
          }
        } catch (err) {
          toast.error("Erreur serveur");
        }
        setClientPhotoUploading(false);
      };

      const handleDeletePhoto = () => {
        if (!window.confirm("Supprimer cette photo ?")) return;
        updateContractDb(currentRoute.eventId, { client_photo: null });
      };

      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 text-slate-900 ${getSectionHighlightClass('client_info')}`} onClick={() => { if (ev.notifications && ev.notifications[currentRoute.role] && ev.notifications[currentRoute.role]['client_info']) toggleSection('client_info'); }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Informations Client
            </h3>
            {currentRoute.role === 'admin' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditingClientInfo) {
                    setIsEditingClientInfo(false);
                    setClientInfoEditData({
                      name: ev.contractInfo?.name || "",
                      company: ev.contractInfo?.company || "",
                      email: ev.contractInfo?.email || "",
                      phone: ev.contractInfo?.phone || "",
                      phone2: ev.contractInfo?.phone2 || "",
                      guest_count: ev.rawClientInfo?.guest_count || "",
                      event_location: ev.contractInfo?.location || ""
                    });
                  } else {
                    setIsEditingClientInfo(true);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm border ${
                  isEditingClientInfo 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' 
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
              >
                {isEditingClientInfo ? "Annuler" : "Modifier les infos (Admin)"}
              </button>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 max-w-[240px] flex flex-col mx-auto md:mx-0">
              {ev.client_photo ? (
                <div className="relative group w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  <img src={ev.client_photo.startsWith('http') ? ev.client_photo : `${BACKEND_URL}${ev.client_photo}`} alt="Client" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {currentRoute.role === 'client' && (
                      <button onClick={handleDeletePhoto} className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition shadow-lg" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <a href={ev.client_photo.startsWith('http') ? `${ev.client_photo}?download=true` : `${BACKEND_URL}${ev.client_photo}?download=true`} download target="_blank" rel="noreferrer" className="bg-blue-500 text-white p-2.5 rounded-full hover:bg-blue-600 transition shadow-lg" title="Télécharger">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[4/5] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4 text-center">
                  <User className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500 mb-1">Aucune photo</p>
                  {currentRoute.role === 'client' && <p className="text-xs text-gray-400">Portrait ou paysage accepté</p>}
                </div>
              )}
              
              {currentRoute.role === 'client' ? (
                <label className="mt-4 w-full text-center bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition cursor-pointer flex justify-center items-center gap-2">
                  {clientPhotoUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Upload...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> {ev.client_photo ? "Modifier" : "Ajouter"} une photo</>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={clientPhotoUploading} />
                </label>
              ) : (
                ev.client_photo && (
                  <a href={ev.client_photo.startsWith('http') ? `${ev.client_photo}?download=true` : `${BACKEND_URL}${ev.client_photo}?download=true`} download target="_blank" rel="noreferrer" className="mt-4 w-full flex text-center bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition justify-center items-center gap-2">
                    <Download className="w-4 h-4" /> Télécharger la photo
                  </a>
                )
              )}
            </div>
            
            <div className="w-full md:w-2/3 flex-1 flex flex-col justify-center">
              {isEditingClientInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nom & Prénom</label>
                    <input
                      type="text"
                      value={clientInfoEditData.name || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Entreprise</label>
                    <input
                      type="text"
                      value={clientInfoEditData.company || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, company: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Email</label>
                    <input
                      type="email"
                      value={clientInfoEditData.email || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Téléphone 1</label>
                    <input
                      type="text"
                      value={clientInfoEditData.phone || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Téléphone 2</label>
                    <input
                      type="text"
                      value={clientInfoEditData.phone2 || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, phone2: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nbre d'invités attendus</label>
                    <input
                      type="text"
                      value={clientInfoEditData.guest_count || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, guest_count: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Lieu de l'événement</label>
                    <input
                      type="text"
                      value={clientInfoEditData.event_location || ''}
                      onChange={(e) => setClientInfoEditData({ ...clientInfoEditData, event_location: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingClientInfo(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const mergedClientInfo = {
                          ...ev.rawClientInfo,
                          name: clientInfoEditData.name || "",
                          company: clientInfoEditData.company || "",
                          email: clientInfoEditData.email || "",
                          phone: clientInfoEditData.phone || "",
                          phone2: clientInfoEditData.phone2 || "",
                          event_location: clientInfoEditData.event_location || "",
                          guest_count: clientInfoEditData.guest_count || ""
                        };
                        await updateContractDb(ev.id, { client_info: mergedClientInfo });
                        setIsEditingClientInfo(false);
                        toast.success("Informations client sauvegardées !");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Nom & Prénom</p>
                    <p className="font-medium text-gray-900">{info.name}</p>
                  </div>
                  {info.company && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entreprise</p>
                      <p className="font-medium text-gray-900">{info.company}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="font-medium text-gray-900 break-all">{info.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Téléphone 1</p>
                    <p className="font-medium text-gray-900">{info.phone}</p>
                  </div>
                  {info.phone2 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Téléphone 2</p>
                      <p className="font-medium text-gray-900">{info.phone2}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Nombre d'invités attendus</p>
                    <p className="font-medium text-gray-900">{ev.rawClientInfo?.guest_count || "Non précisé"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lieu de l'événement</p>
                    <p className="font-medium text-gray-900">{info.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    const PlanningSection = () => {
      const info = ev.contractInfo;
      const role = currentRoute.role;
      if (!info) return null;

      // Effect lifted to top level DjClientApp
      
      const formatPlanningDate = (dateStr) => {
        if (!dateStr) return "Non définie";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const handleUpdate = (field, value) => {
        const updated = { ...planningLocalInfo, [field]: value };
        setPlanningLocalInfo(updated);
        
        const payloadInfo = { 
          ...ev.rawClientInfo, 
          setup_date: updated.setup_date,
          setup_time: updated.setup_time,
          start_time: updated.start_time,
          end_time: updated.unlimited_time ? null : updated.end_time,
          unlimited_time: updated.unlimited_time
        };
        
        ev.contractInfo.setup_date = updated.setup_date;
        ev.contractInfo.setup_time = updated.setup_time;
        ev.contractInfo.start_time = updated.start_time;
        ev.contractInfo.end_time = updated.unlimited_time ? "Illimité" : updated.end_time;
        ev.contractInfo.unlimited_time = updated.unlimited_time;
        ev.rawClientInfo = payloadInfo;

        updateContractDb(currentRoute.eventId, { client_info: payloadInfo });
      };

      const canEditBasic = role === 'admin' || role === 'dj';
      const canEditEnd = role === 'admin';

      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 text-slate-900 ${getSectionHighlightClass('planning')}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Planning de la prestation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date d'installation</p>
              {canEditBasic ? (
                 <input 
                   type="date" 
                   value={planningLocalInfo.setup_date} 
                   onChange={(e) => handleUpdate('setup_date', e.target.value)}
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{formatPlanningDate(planningLocalInfo.setup_date)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Heure d'installation</p>
              {canEditBasic ? (
                 <input 
                   type="text" 
                   value={planningLocalInfo.setup_time} 
                   onChange={(e) => setPlanningLocalInfo({...planningLocalInfo, setup_time: e.target.value})}
                   onBlur={(e) => handleUpdate('setup_time', e.target.value)}
                   placeholder="Ex: 14h00, À définir..."
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{planningLocalInfo.setup_time || "À définir"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Début de prestation</p>
              {canEditBasic ? (
                 <input 
                   type="time" 
                   value={planningLocalInfo.start_time} 
                   onChange={(e) => handleUpdate('start_time', e.target.value)}
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{planningLocalInfo.start_time || "--:--"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fin de prestation</p>
              {canEditEnd ? (
                 <div className="flex items-center gap-3">
                   <input 
                     type="time" 
                     value={planningLocalInfo.end_time} 
                     onChange={(e) => handleUpdate('end_time', e.target.value)}
                     disabled={planningLocalInfo.unlimited_time}
                     className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white disabled:opacity-50"
                   />
                   <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer shrink-0">
                     <input 
                       type="checkbox" 
                       checked={planningLocalInfo.unlimited_time}
                       onChange={(e) => handleUpdate('unlimited_time', e.target.checked)}
                       className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                     />
                     Illimité
                   </label>
                 </div>
              ) : (
                <p className="font-medium text-gray-900">{planningLocalInfo.unlimited_time ? "Illimité" : (planningLocalInfo.end_time || "--:--")}</p>
              )}
            </div>
          </div>
        </div>
      );
    };

    const DocumentsTipsSection = () => {
      const selectedPdfs = ev.selectedPdfNotes || [];
      const eventDocuments = ev.eventDocuments || [];
      const isAdminOrDj = currentRoute.role === 'admin' || currentRoute.role === 'dj';

      const handleTogglePdf = (id) => {
        if (!isAdminOrDj) return;
        const newSelected = selectedPdfs.includes(id) ? selectedPdfs.filter(i => i !== id) : [...selectedPdfs, id];
        ev.selectedPdfNotes = newSelected;
        if (currentRoute.eventId) {
          updateContractDb(currentRoute.eventId, { selected_pdf_notes: newSelected });
        }
        const updatedEvents = [...events];
        const idx = updatedEvents.findIndex(e => e.id === ev.id);
        if (idx !== -1) {
            updatedEvents[idx].selectedPdfNotes = newSelected;
            setEvents(updatedEvents);
        }
      };

      const handleDownloadPdf = async (pdfId) => {
        try {
          toast.info("Téléchargement en cours...", { duration: 2000 });
          const doc = pdfNotes?.find(d => d.id === pdfId);
          const filename = doc ? (doc.title || doc.filename || "document") : "document";
          const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
          const downloadUrl = `${BACKEND_URL}/api/public/contract-pdf-notes/${pdfId}/download`;
          
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = localUrl;
          a.download = finalFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(localUrl);
        } catch (err) {
          console.error("Download failed:", err);
          toast.error("Échec du téléchargement du document.");
        }
      };
      
      const exportHTMLToPDF = async (htmlContent, fileName) => {
        try {
          toast.info("Génération PDF du contrat en cours...", { duration: 3000 });
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
          const tempContainer = document.createElement('div');
          tempContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:white;padding:20px;';
          tempContainer.innerHTML = htmlContent;
          document.body.appendChild(tempContainer);
          await new Promise(r => setTimeout(r, 1500));
          const { default: html2canvas } = await import('html2canvas');
          const allPages = tempContainer.querySelectorAll('[id^="pdf-page-"]');
          const pageIds = Array.from(allPages).map(el => el.id).sort((a, b) => {
            const order = id => id === 'pdf-page-1' ? 1 : id === 'pdf-page-cgv' ? 999 : 2;
            return order(a) - order(b);
          });
          let added = false;
          for (const pageId of pageIds) {
            const el = tempContainer.querySelector(`#${pageId}`);
            if (!el || !el.innerHTML.trim()) continue;
            if (added) pdf.addPage();
            const canvas = await html2canvas(el, { scale: 1.4, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: 794, logging: false });
            const imgW = 190, imgH = (canvas.height * imgW) / canvas.width;
            const imgData = canvas.toDataURL('image/jpeg', 0.88);
            pdf.addImage(imgData, 'JPEG', 10, 10, imgW, Math.min(imgH, 277), undefined, 'FAST');
            added = true;
          }
          document.body.removeChild(tempContainer);
          pdf.save(fileName);
          toast.success("Contrat téléchargé !");
        } catch (error) {
          console.error('Erreur PDF:', error);
          toast.error("Erreur génération contrat : " + error.message);
        }
      };

      const getProfileDataForContract = (profileKey) => {
        if (profileKey === 'joel') return { name: "Joël RUTTKAY (Joël R'Key)", nom_complet: "Joël RUTTKAY", nom_artistique: "Joël R'Key", email: "info@rkey-prod.fr", phone: "07 83 55 36 74", address: "5 rue du Hohlandsbourg, 67390 Marckolsheim", siret: "99992355000019", titre: "Gérant de R'KEY PROD", statut_artiste: "dirigeant", iban: "", bic: "" };
        if (profileKey === 'stephane') return { name: "Stéphane JACOBY (Stefan Edison)", nom_complet: "Stéphane JACOBY", nom_artistique: "Stefan Edison", email: "stephane@rkey-prod.fr", phone: "06 31 21 61 14", address: "5 rue du Hohlandsbourg, 67390 Marckolsheim", siret: "42121827200019", titre: "Animateur DJ", statut_artiste: "freelance", iban: "FR76 4061 8804 8700 0401 4272 395", bic: "" };
        if (Array.isArray(djProfiles)) {
          if (typeof profileKey === 'number' && djProfiles[profileKey]) {
            const p = djProfiles[profileKey];
            return {
              name: p.nom_complet || p.nom_artistique || '',
              nom_complet: p.nom_complet || '',
              nom_artistique: p.nom_artistique || '',
              email: p.email || '',
              phone: p.telephone || '',
              address: p.adresse || '',
              siret: p.siret || '',
              titre: p.titre || 'Animateur DJ',
              statut_artiste: p.statut_artiste || 'freelance',
              iban: p.iban || '',
              bic: p.bic || ''
            };
          }
          const found = djProfiles.find(p => p.nom_artistique?.toLowerCase() === profileKey?.toLowerCase() || p._id === profileKey);
          if (found) {
            return {
              name: found.nom_complet || found.nom_artistique || '',
              nom_complet: found.nom_complet || '',
              nom_artistique: found.nom_artistique || '',
              email: found.email || '',
              phone: found.telephone || '',
              address: found.adresse || '',
              siret: found.siret || '',
              titre: found.titre || 'Animateur DJ',
              statut_artiste: found.statut_artiste || 'freelance',
              iban: found.iban || '',
              bic: found.bic || ''
            };
          }
        }
        return { name: "", nom_complet: "", nom_artistique: "", email: "", phone: "", address: "", siret: "", titre: "Animateur DJ", statut_artiste: "dirigeant", iban: "", bic: "" };
      };

      const resolveProfileForContract = (contract) => {
        const snapshot = contract.dj_profile_data && (contract.dj_profile_data.name || contract.dj_profile_data.nom_complet)
          ? contract.dj_profile_data
          : getProfileDataForContract(contract.dj_profile);
        const current = getProfileDataForContract(contract.dj_profile);
        return { ...current, ...snapshot, bic: snapshot.bic || current.bic || "" };
      };

      const handleDownloadMandat = async () => {
        if (!ev || !ev.rawContractData) {
          toast.error("Données du contrat indisponibles.");
          return;
        }
        const data = ev.rawContractData;
        const html = generateMandatHTML(data, companySettings);
        let cName = (data.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        await exportHTMLToPDF(html, `Contrat_Mandat_RKeyProd_${cName}.pdf`);
      };

      const handleDownloadArtiste = async () => {
        if (!ev || !ev.rawContractData) {
          toast.error("Données du contrat indisponibles.");
          return;
        }
        const data = ev.rawContractData;
        const html = generateArtisteHTML(data, resolveProfileForContract);
        let cName = (data.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        const profile = resolveProfileForContract(data);
        const artistName = (profile.nom_artistique || profile.nom_complet || 'Artiste').replace(/[^a-zA-Z0-9]/g, '_');
        await exportHTMLToPDF(html, `Contrat_Artiste_${artistName}_${cName}.pdf`);
      };

      const handleDownloadEntreprise = async () => {
        if (!ev || !ev.rawContractData) {
          toast.error("Données du contrat indisponibles.");
          return;
        }
        const data = ev.rawContractData;
        const html = generateEntrepriseHTML(data, companySettings);
        let cName = (data.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        await exportHTMLToPDF(html, `Contrat_Prestation_RKeyProd_${cName}.pdf`);
      };

      const handleDownloadClientContract = async () => {
        if (!ev || !ev.rawContractData) {
            toast.error("Données du contrat indisponibles.");
            return;
        }
        const data = ev.rawContractData;
        
        let html;
        let cName = (data.client_info?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        let filename;
        if (data.contract_mode === 'entreprise') {
            html = generateEntrepriseHTML(data, companySettings);
            filename = `Contrat_RKeyProd_${cName}.pdf`;
        } else {
            html = generateMandatHTML(data, companySettings);
            filename = `Contrat_RKeyProd_${cName}.pdf`;
        }
        await exportHTMLToPDF(html, filename);
      };

      const handleDownloadEventDoc = async (docId) => {
        try {
          toast.info("Téléchargement en cours...", { duration: 2000 });
          const doc = ev?.eventDocuments?.find(d => d.id === docId);
          const filename = doc?.filename || "document.pdf";
          const downloadUrl = `${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/documents/${docId}`;
          
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = localUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(localUrl);
        } catch (err) {
          console.error("Download failed:", err);
          toast.error("Échec du téléchargement du document.");
        }
      };
      
      const handleDeleteEventDoc = async (docId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;
        try {
          const endpoint = `/api/public/dj-client/${currentRoute.eventId}/documents/${docId}`;
          const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'DELETE' });
          if (res.ok) {
            const newEventDocs = ev.eventDocuments.filter(d => d.id !== docId);
            const updatedEvents = [...events];
            const idx = updatedEvents.findIndex(e => e.id === ev.id);
            if (idx !== -1) {
              ev.eventDocuments = newEventDocs;
              updatedEvents[idx].eventDocuments = newEventDocs;
              setEvents(updatedEvents);
            }
            toast.success("Document supprimé avec succès.");
          } else {
            toast.error("Erreur lors de la suppression du document.");
          }
        } catch (e) {
          toast.error("Erreur lors de la suppression.");
        }
      };

      const handleToggleEventDocVisibility = (docId) => {
        if (!isAdminOrDj) return;
        const newEventDocs = eventDocuments.map(d => {
          if (d.id === docId) {
            return { ...d, hiddenForClient: !d.hiddenForClient };
          }
          return d;
        });

        const updatedEvents = [...events];
        const idx = updatedEvents.findIndex(e => e.id === ev.id);
        if (idx !== -1) {
          ev.eventDocuments = newEventDocs;
          updatedEvents[idx].eventDocuments = newEventDocs;
          setEvents(updatedEvents);
        }

        if (currentRoute.eventId) {
          updateContractDb(currentRoute.eventId, { event_documents: newEventDocs });
        }
        toast.success("Visibilité du document mise à jour.");
      };
      
      const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
          toast.error("Veuillez sélectionner un fichier PDF.");
          return;
        }
        
        setDocsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", docsUploadCategory);

        try {
          const response = await fetch(`${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/documents`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Upload failed");

          const result = await response.json();
          if (result.success) {
            toast.success("Document ajouté avec succès.");
            const newDoc = result.document;
            const newEventDocs = [...eventDocuments, newDoc];
            ev.eventDocuments = newEventDocs;
            
            const updatedEvents = [...events];
            const idx = updatedEvents.findIndex(e => e.id === ev.id);
            if (idx !== -1) {
                updatedEvents[idx].eventDocuments = newEventDocs;
                setEvents(updatedEvents);
            }
          }
        } catch (error) {
          console.error("Error uploading document:", error);
          toast.error("Erreur lors de l'envoi du document.");
        } finally {
          setDocsUploading(false);
          event.target.value = null; // Reset input
        }
      };

      const handleVisitSheetUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        const allowedTypes = [
          "application/pdf", 
          "image/png", 
          "image/jpeg", 
          "image/jpg", 
          "image/heic", 
          "image/heif"
        ];

        setDocsUploading(true);
        let successCount = 0;
        let localEventDocs = [...(ev.eventDocuments || [])];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop().toLowerCase();
          const isHeic = fileExt === 'heic' || fileExt === 'heif';
          
          if (!allowedTypes.includes(file.type) && !isHeic) {
            toast.error(`Format non supporté pour "${file.name}". Veuillez choisir un PDF, PNG, JPG ou HEIC.`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("category", docsUploadCategory);

          try {
            const response = await fetch(`${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/documents/convert-visit-sheet`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || "Upload failed");
            }

            const result = await response.json();
            if (result.success) {
              successCount++;
              const newDoc = result.document;
              localEventDocs.push(newDoc);
              
              ev.eventDocuments = [...localEventDocs];
              setEvents(prevEvents => {
                const updatedEvents = [...prevEvents];
                const idx = updatedEvents.findIndex(e => e.id === ev.id);
                if (idx !== -1) {
                  updatedEvents[idx].eventDocuments = [...localEventDocs];
                }
                return updatedEvents;
              });
            }
          } catch (error) {
            console.error(`Error uploading "${file.name}":`, error);
            toast.error(`Erreur lors de l'envoi de "${file.name}" : ` + error.message);
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} document(s) ajouté(s) avec succès.`);
        }

        setDocsUploading(false);
        event.target.value = null; // Reset input
      };

      const visibleDocs = pdfNotes;
      const displayGlobalDocs = isAdminOrDj ? visibleDocs : visibleDocs.filter(doc => selectedPdfs.includes(doc.id));
      
      const visibleEventDocs = isAdminOrDj 
        ? eventDocuments 
        : eventDocuments.filter(d => !d.hiddenForClient);

      const isAdministrativeDoc = (doc) => {
        if (!doc.category) return false;
        const cat = doc.category.toLowerCase();
        return cat.includes('administrative') || cat.includes('contrat') || cat.includes('administratif');
      };

      const administrativeDocs = visibleEventDocs.filter(isAdministrativeDoc);
      const animationEventDocs = visibleEventDocs.filter(d => !isAdministrativeDoc(d));
      
      const hasAnyDocs = displayGlobalDocs.length > 0 || visibleEventDocs.length > 0;

      return (
        <div className={`bg-white rounded-xl shadow-lg border p-6 mb-6 mt-6 transition-all ring-1 ring-slate-100 text-slate-900 ${getSectionHighlightClass('documents') ? getSectionHighlightClass('documents') : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex flex-col sm:flex-row sm:items-center gap-2 text-slate-800">
               <div className="flex items-center gap-2">
                 <ExternalLink className="w-6 h-6 text-indigo-500" />
                 Documents et Types d'animations
               </div>
            </h3>
            
            {isAdminOrDj && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
               <select 
                 className="text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
                 value={docsUploadCategory}
                 onChange={(e) => setDocsUploadCategory(e.target.value)}
                 title="Catégorie pour le prochain upload"
               >
                 <option value="Administrative">Administratif</option>
                 <option value="Animations et interventions">Animations</option>
               </select>
               <label className={`cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md shadow-sm text-sm font-medium transition flex items-center justify-center gap-2 ${docsUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                 {docsUploading ? (
                    <><RefreshCw className="animate-spin w-4 h-4" /> Envoi...</>
                 ) : (
                    <><Upload className="w-4 h-4" /> Ajouter document (PDF et images)</>
                  )}
                 <input type="file" accept="application/pdf, image/png, image/jpeg, image/jpg, .heic, .heif" className="hidden" onChange={handleVisitSheetUpload} disabled={docsUploading} multiple />
               </label>
            </div>
            )}
          </div>
          
          <div className="space-y-8">
            {/* SECTION ADMINISTRATIVE */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Administratif</h4>
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden divide-y divide-slate-200/60 shadow-xs">
                {!(ev && ev.rawContractData) && administrativeDocs.length === 0 && (
                  <p className="text-sm text-slate-500 italic p-4">Aucun document administratif.</p>
                )}
                
                {/* Contrat raccourci */}
                {ev && ev.rawContractData && (() => {
                  const c = ev.rawContractData || {};
                  const isDirigeant = isContractDirigeant(c);

                  const isEntreprise = c.contract_mode === 'entreprise' || c.contractMode === 'entreprise';
                  const isMandatMode = !isDirigeant && !isEntreprise;

                  if (isMandatMode) {
                    const renderMandat = isAdminOrDj || ev.showMandatToClient;
                    const renderArtiste = isAdminOrDj || ev.showArtisteToClient;

                    if (!renderMandat && !renderArtiste) return null;

                    return (
                      <>
                        {/* 1. Mandat R'Key Prod */}
                        {renderMandat && (
                          <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-200 flex-shrink-0">
                                <FileText className="w-5 h-5 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-800 text-sm leading-tight truncate" title={`Mandat R'Key Prod - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`}>
                                    Mandat R'Key Prod (Frais de mandat & gestion)
                                  </p>
                                  <span className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full border">Généré</span>
                                  {isAdminOrDj && (
                                    !ev.showMandatToClient ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                        <EyeOff className="w-2.5 h-2.5" /> Client : Masqué
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                        <Eye className="w-2.5 h-2.5" /> Client : Visible
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Contrat de mandat sans signature</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const html = generateMandatHTML(ev.rawContractData, companySettings);
                                  setPreviewDoc({ 
                                    title: `Mandat R'Key Prod - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`, 
                                    type: 'html', 
                                    url: html 
                                  }); 
                                }} 
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                title="Aperçu rapide"
                              >
                                <FileSearch className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadMandat(); }} 
                                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {isAdminOrDj && (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const val = !ev.showMandatToClient;
                                    updateContractDb(currentRoute.eventId, { show_mandat_to_client: val });
                                    const newEvents = [...events];
                                    const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                                    newEvents[idx].showMandatToClient = val;
                                    setEvents(newEvents);
                                  }}
                                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                  title={!ev.showMandatToClient ? "Rendre visible au client (Actuellement masqué)" : "Masquer pour le client (Actuellement visible)"}
                                >
                                  {!ev.showMandatToClient ? (
                                    <EyeOff className="w-4 h-4 text-rose-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-emerald-600" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. Engagement Artiste */}
                        {renderArtiste && (
                          <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-50 border border-violet-200 flex-shrink-0">
                                <FileText className="w-5 h-5 text-violet-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-800 text-sm leading-tight truncate" title={`Contrat Artiste DJ - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`}>
                                    Contrat Artiste (Engagement DJ)
                                  </p>
                                  <span className="bg-violet-50 text-violet-700 border-violet-100 text-[10px] font-bold px-2 py-0.5 rounded-full border">Généré</span>
                                  {isAdminOrDj && (
                                    !ev.showArtisteToClient ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                        <EyeOff className="w-2.5 h-2.5" /> Client : Masqué
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                        <Eye className="w-2.5 h-2.5" /> Client : Visible
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Contrat d'engagement de l'artiste DJ</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const html = generateArtisteHTML(ev.rawContractData, resolveProfileForContract);
                                  setPreviewDoc({ 
                                    title: `Contrat Artiste DJ - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`, 
                                    type: 'html', 
                                    url: html 
                                  }); 
                                }} 
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                title="Aperçu rapide"
                              >
                                <FileSearch className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadArtiste(); }} 
                                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {isAdminOrDj && (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const val = !ev.showArtisteToClient;
                                    updateContractDb(currentRoute.eventId, { show_artiste_to_client: val });
                                    const newEvents = [...events];
                                    const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                                    newEvents[idx].showArtisteToClient = val;
                                    setEvents(newEvents);
                                  }}
                                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                  title={!ev.showArtisteToClient ? "Rendre visible au client (Actuellement masqué)" : "Masquer pour le client (Actuellement visible)"}
                                >
                                  {!ev.showArtisteToClient ? (
                                    <EyeOff className="w-4 h-4 text-rose-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-emerald-600" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  }

                  // Non-mandat: Entreprise
                  const renderEntreprise = isAdminOrDj || ev.showEntrepriseToClient;
                  if (!renderEntreprise) return null;

                  return (
                    <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-200 flex-shrink-0">
                          <FileText className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate" title={`Contrat Prestation - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`}>
                              Contrat Prestation R'Key Prod
                            </p>
                            <span className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full border">Généré</span>
                            {isAdminOrDj && (
                              !ev.showEntrepriseToClient ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                  <EyeOff className="w-2.5 h-2.5" /> Client : Masqué
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                  <Eye className="w-2.5 h-2.5" /> Client : Visible
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Contrat original sans signature</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const html = generateEntrepriseHTML(ev.rawContractData, companySettings);
                            setPreviewDoc({ 
                              title: `Contrat - ${ev.rawContractData.client_info?.company || ev.rawContractData.client_info?.name || 'Client'}`, 
                              type: 'html', 
                              url: html 
                            }); 
                          }} 
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Aperçu rapide"
                        >
                          <FileSearch className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadEntreprise(); }} 
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdminOrDj && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const val = !ev.showEntrepriseToClient;
                              updateContractDb(currentRoute.eventId, { show_entreprise_to_client: val });
                              const newEvents = [...events];
                              const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                              newEvents[idx].showEntrepriseToClient = val;
                              setEvents(newEvents);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title={!ev.showEntrepriseToClient ? "Rendre visible au client (Actuellement masqué)" : "Masquer pour le client (Actuellement visible)"}
                          >
                            {!ev.showEntrepriseToClient ? (
                              <EyeOff className="w-4 h-4 text-rose-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {administrativeDocs.map((doc) => (
                  <div 
                    key={doc.id}
                    className={`flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150 ${
                      doc.hiddenForClient && isAdminOrDj ? "bg-rose-50/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        doc.hiddenForClient && isAdminOrDj ? "bg-rose-50 border border-rose-100" : "bg-slate-50 border border-slate-100"
                      }`}>
                        <FileText className={`w-5 h-5 ${doc.hiddenForClient && isAdminOrDj ? "text-rose-500" : "text-slate-500"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm leading-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md lg:max-w-lg" title={fixMangledFilenameDisplay(doc.filename)}>
                            {fixMangledFilenameDisplay(doc.filename)}
                          </p>
                          {isAdminOrDj && (
                            doc.hiddenForClient ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                <EyeOff className="w-2.5 h-2.5" /> Client : Masqué
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                <Eye className="w-2.5 h-2.5" /> Client : Visible
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Ajouté le {doc.uploaded_at ? doc.uploaded_at.substring(0,10) : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const previewUrl = `${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/documents/${doc.id}?preview=true`;
                          setPreviewDoc({ 
                            title: doc.filename, 
                            type: 'pdf', 
                            url: previewUrl 
                          }); 
                        }} 
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        title="Aperçu rapide"
                      >
                        <FileSearch className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadEventDoc(doc.id); }} 
                        className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {isAdminOrDj && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleEventDocVisibility(doc.id); }}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title={doc.hiddenForClient ? "Montrer au client (Actuellement masqué)" : "Masquer pour le client (Actuellement visible)"}
                        >
                          {doc.hiddenForClient ? (
                            <EyeOff className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      )}
                      {currentRoute.role === 'admin' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEventDoc(doc.id); }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer ce document"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION ANIMATIONS ET INTERVENTIONS */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Animations et interventions</h4>
              {(displayGlobalDocs.length === 0 && animationEventDocs.length === 0 && !isAdminOrDj) ? (
                 <p className="text-sm text-slate-500 italic">Aucun document d'animation pour cet événement.</p>
              ) : (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden divide-y divide-slate-200/60 shadow-xs">
                  
                  {/* Event Specific Animation Docs */}
                  {animationEventDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className={`flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150 ${
                        doc.hiddenForClient && isAdminOrDj ? "bg-rose-50/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.hiddenForClient && isAdminOrDj ? "bg-rose-50 border border-rose-100" : "bg-slate-50 border border-slate-100"
                        }`}>
                          <FileText className={`w-5 h-5 ${doc.hiddenForClient && isAdminOrDj ? "text-rose-500" : "text-slate-500"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md lg:max-w-lg" title={fixMangledFilenameDisplay(doc.filename)}>
                              {fixMangledFilenameDisplay(doc.filename)}
                            </p>
                            {isAdminOrDj && (
                              doc.hiddenForClient ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                  <EyeOff className="w-2.5 h-2.5" /> Client : Masqué
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                  <Eye className="w-2.5 h-2.5" /> Client : Visible
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Ajouté le {doc.uploaded_at ? doc.uploaded_at.substring(0,10) : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const previewUrl = `${BACKEND_URL}/api/public/dj-client/${currentRoute.eventId}/documents/${doc.id}?preview=true`;
                            setPreviewDoc({ 
                              title: doc.filename, 
                              type: 'pdf', 
                              url: previewUrl 
                            }); 
                          }} 
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Aperçu rapide"
                        >
                          <FileSearch className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadEventDoc(doc.id); }} 
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdminOrDj && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleEventDocVisibility(doc.id); }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title={doc.hiddenForClient ? "Montrer au client (Actuellement masqué)" : "Masquer pour le client (Actuellement visible)"}
                          >
                            {doc.hiddenForClient ? (
                              <EyeOff className="w-4 h-4 text-rose-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                        )}
                        {currentRoute.role === 'admin' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteEventDoc(doc.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer ce document"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Global Tips (Existing feature) */}
                  {displayGlobalDocs.map((doc) => {
                    const isSelected = selectedPdfs.includes(doc.id);
                    return (
                      <div 
                        key={doc.id}
                        onClick={() => { if (isAdminOrDj) handleTogglePdf(doc.id); }}
                        className={`flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition duration-150 ${isAdminOrDj ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isAdminOrDj && (
                            <div className="flex items-center justify-center flex-shrink-0">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => {}} 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none" 
                              />
                            </div>
                          )}
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-200 flex-shrink-0">
                            <FileText className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate" title={fixMangledFilenameDisplay(doc.title || doc.filename)}>
                              {fixMangledFilenameDisplay(doc.title || doc.filename)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Guide/Tips PDF</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const previewUrl = `${BACKEND_URL}/api/public/contract-pdf-notes/${doc.id}/download?preview=true`;
                              setPreviewDoc({ 
                                title: doc.title || doc.filename, 
                                type: 'pdf', 
                                url: previewUrl 
                              }); 
                            }} 
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="Aperçu rapide"
                          >
                            <FileSearch className="w-4 h-4" />
                          </button>
                          {(currentRoute.role !== 'admin' && (!isAdminOrDj || isSelected)) && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(doc.id); }} 
                              className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    const ClientTutorialVideoSection = () => {
      if (currentRoute.role !== 'client') return null;
      
      const embedUrl = getYoutubeEmbedUrl(companySettings.youtube_tutorial_url);
      if (!embedUrl) return null;

      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
          <div className="p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4">
              <Youtube className="w-6 h-6 text-red-600" />
              Tutoriel d'utilisation de votre espace client
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Regardez cette courte vidéo pour comprendre en détails comment compléter votre profil, choisir vos options, planifier le déroulement de votre soirée et interagir avec votre DJ.
            </p>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md border border-slate-200">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title="Tutoriel de l'interface client"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      );
    };

    const OptionsSection = () => {
      const c = ev.rawContractData || {};
      
      const isDirigeant = isContractDirigeant(c);

      const basePrice = Number(c.base_price) || 0;
      const fraisMandat = Number(c.frais_mandat) || 0;
      const cachetArtiste = Number(c.cachet_artiste) || 0;
      const discountAmount = Number(c.discount_amount) || 0;

      // Base rate parsing with fallback for legacy/migrated contracts
      let baseRate = 0;
      const isEntreprise = c.contract_mode === 'entreprise' || c.contractMode === 'entreprise';
      const isMandatMode = !isDirigeant && !isEntreprise;
      
      if (isDirigeant) {
        baseRate = basePrice;
      } else if (isEntreprise) {
        baseRate = basePrice;
      } else {
        // Mode mandataire
        const mandataireRate = fraisMandat + cachetArtiste;
        if (mandataireRate === 0 && basePrice > 0) {
          baseRate = basePrice;
        } else {
          baseRate = mandataireRate;
        }
      }

      const handleFraisChange = (valStr) => {
        const newFrais = Number(valStr) || 0;
        const refPrice = basePrice || baseRate;
        const calculatedCachet = Math.max(0, refPrice - newFrais);
        
        setEvents(prevEvents => {
          return prevEvents.map(item => {
            if (item.id === ev.id) {
              const currentRaw = item.rawContractData || {};
              return {
                ...item,
                rawContractData: {
                  ...currentRaw,
                  frais_mandat: newFrais,
                  cachet_artiste: calculatedCachet
                }
              };
            }
            return item;
          });
        });
      };

      const saveFraisToDb = (valStr) => {
        const newFrais = Number(valStr) || 0;
        const refPrice = basePrice || baseRate;
        const calculatedCachet = Math.max(0, refPrice - newFrais);
        
        updateContractDb(ev.id, {
          frais_mandat: newFrais,
          cachet_artiste: calculatedCachet
        }).then(() => {
          toast.success("Frais de mandat & Cachet artiste enregistrés !");
        }).catch(err => {
          console.error("Erreur mise à jour:", err);
          toast.error("Erreur lors de la sauvegarde.");
        });
      };

      const contractOptions = ev.selectedOptions || [];
      const optionsTotal = contractOptions.reduce((acc, opt) => acc + (Number(opt.price) || 0), 0);

      // Calcul du total
      const totalPrestation = Math.max(0, baseRate + optionsTotal - discountAmount);

      // Distinguer les options qui sont des ajouts après signature pour ne pas recalculer l'acompte à la hausse (ce qui fausserait le solde restant dû)
      const additions = contractOptions.filter(opt => opt.is_addition_post_signature || opt.added_post_signature);
      const additionsTotal = additions.reduce((acc, opt) => acc + (Number(opt.price) || 0), 0);
      const originalOptionsTotal = optionsTotal - additionsTotal;

      // Calcul de l'acompte (deposit)
      let depositAmount = 0;
      if (c.no_deposit_required) {
        depositAmount = 0;
      } else if (isMandatMode) {
        depositAmount = fraisMandat;
      } else {
        const tempContract = {
          ...c,
          selected_options: contractOptions.map(opt => ({
            ...opt,
            selected: opt.selected !== false,
            price: Number(opt.price) || 0
          }))
        };
        depositAmount = calculateContractDepositAmount(tempContract);
      }

      // L'acompte est versé si expressément coché OU si le contrat est déjà signé / archivé / complété
      const isDepositPaid = c.deposit_paid || c.status === 'signed' || c.status === 'archived' || c.status === 'completed';

      // Montant déjà réglé
      let amountPaid = 0;
      if (isMandatMode) {
        amountPaid = fraisMandat; // For mandate mode, the already paid amount corresponds to the mandate and management fees
      } else if (isDepositPaid) {
        amountPaid = depositAmount > 0 ? depositAmount : 0;
      }

      // Total de la prestation d'origine (sans les ajouts post-signature)
      const originalTotalPrestation = Math.max(0, baseRate + originalOptionsTotal - discountAmount);
      // Solde d'origine restant (hors ajouts)
      const originalRemainingBalance = Math.max(0, originalTotalPrestation - amountPaid);

      // Solde restant
      const remainingBalance = Math.max(0, totalPrestation - amountPaid);

      const requestedOptions = ev.requestedOptions || [];
      const eventType = ev.contractInfo?.event_type;
      
      const nonSelectedOptions = availableOptions.filter(opt => 
        !contractOptions.some(co => co.id === opt.id || co.name === opt.name) &&
        !requestedOptions.some(ro => ro.id === opt.id || ro.name === opt.name) &&
        (!opt.event_categories || opt.event_categories.length === 0 || opt.event_categories.includes(eventType))
      );
      
      const isEntrepriseFreelance = isEntreprise && !isDirigeant;
      let cachetDJVal = cachetArtiste;
      
      if (isEntrepriseFreelance) {
        const optionsTotalForMargin = contractOptions
          .filter(option => option.selected !== false && !option.is_addition_post_signature && !option.added_post_signature)
          .reduce((sum, option) => sum + (Number(option.price) || 0), 0);

        const baseTTC = Math.max(0, basePrice - discountAmount);
        const baseHT = baseTTC / 1.2;

        const optionsTTC = optionsTotalForMargin;
        const optionsHT = optionsTTC / 1.2;

        const totalTTC = baseTTC + optionsTTC;
        const totalHT = totalTTC / 1.2;

        let baseCachetDJ = 0;
        if (totalTTC > 1500) {
          baseCachetDJ = 900;
        } else {
          baseCachetDJ = baseHT * 0.6428;
        }

        const optionsCachetDJ = optionsHT * 0.20;
        const cachetDJRaw = baseCachetDJ + optionsCachetDJ;
        let computedCachetDJ = Math.floor(cachetDJRaw / 10) * 10;
        
        const freelanceCachetCap = c.freelance_cachet_cap !== undefined ? c.freelance_cachet_cap : 800;
        if (computedCachetDJ > freelanceCachetCap) {
          computedCachetDJ = freelanceCachetCap;
        }
        cachetDJVal = computedCachetDJ;
      }

      const role = currentRoute.role;

      const toggleBasket = (opt) => {
        if (optionsBasket.some(o => o.id === opt.id)) {
          setOptionsBasket(optionsBasket.filter(o => o.id !== opt.id));
        } else {
          setOptionsBasket([...optionsBasket, opt]);
        }
      };

      const submitRequest = async () => {
        if (optionsBasket.length === 0) return;
        setOptionsSubmitting(true);
        try {
          const updatedRequestedOptions = [...requestedOptions, ...optionsBasket];
          const payload = { requested_options: updatedRequestedOptions };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const endpoint = isPublic ? `/api/public/dj-client/${ev.id}` : `/api/contracts2/${ev.id}`;
          const res = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            setOptionsBasket([]);
            await fetchContractsAsEvents();
            toast.success("Demandes d'options envoyées");
          }
        } catch (e) {
          console.error("Error submitting requested options", e);
        } finally {
          setOptionsSubmitting(false);
        }
      };

      const cancelRequestedOption = async (optToRemove) => {
        setOptionsSubmitting(true);
        try {
          const updatedRequestedOptions = requestedOptions.filter(opt => opt.name !== optToRemove.name);
          const payload = { requested_options: updatedRequestedOptions };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const endpoint = isPublic ? `/api/public/dj-client/${ev.id}` : `/api/contracts2/${ev.id}`;
          const res = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            await fetchContractsAsEvents();
            toast.success("Demande d'option annulée");
          } else {
             toast.error("Erreur lors de l'annulation de l'option");
          }
        } catch (e) {
          console.error("Error canceling requested option", e);
          toast.error("Erreur de connexion");
        } finally {
          setOptionsSubmitting(false);
        }
      };

      const validateRequestedOption = async (optToValidate) => {
        setOptionsSubmitting(true);
        try {
          // Extraire et filtrer l'option des demandes en attente
          const updatedRequestedOptions = requestedOptions.filter(opt => opt.name !== optToValidate.name);
          
          // L'ajouter au choix validé (selected_options) s'il n'y est pas déjà
          const alreadySelected = contractOptions.some(opt => opt.name === optToValidate.name);
          const updatedContractOptions = alreadySelected 
            ? contractOptions 
            : [...contractOptions, { ...optToValidate, is_addition_post_signature: true, added_post_signature: true }];

          const payload = { 
            requested_options: updatedRequestedOptions,
            selected_options: updatedContractOptions
          };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const endpoint = isPublic ? `/api/public/dj-client/${ev.id}` : `/api/contracts2/${ev.id}`;
          const res = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            await fetchContractsAsEvents();
            toast.success("Option validée et ajoutée au contrat !");
          } else {
             toast.error("Erreur lors de la validation de l'option");
          }
        } catch (e) {
          console.error("Error validating requested option", e);
          toast.error("Erreur de connexion");
        } finally {
          setOptionsSubmitting(false);
        }
      };

      const removePostSignatureOption = async (optToRemove) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'option "${optToRemove.name}" ?`)) return;
        setOptionsSubmitting(true);
        try {
          const updatedContractOptions = contractOptions.filter(opt => opt.name !== optToRemove.name);
          const payload = { 
            selected_options: updatedContractOptions
          };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const endpoint = isPublic ? `/api/public/dj-client/${ev.id}` : `/api/contracts2/${ev.id}`;
          const res = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            await fetchContractsAsEvents();
            toast.success("Option supprimée avec succès !");
          } else {
            toast.error("Erreur lors de la suppression de l'option");
          }
        } catch (e) {
          console.error("Error removing post signature option", e);
          toast.error("Erreur de connexion");
        } finally {
          setOptionsSubmitting(false);
        }
      };

      // Vue spéciale DJ en mode entreprise : uniquement le cachet DJ (violet) et les options sans prix
      if (role === 'dj' && isEntrepriseFreelance) {
        return (
          <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 text-slate-900 ${getSectionHighlightClass('options')}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-gray-400" />
              Tarifs et Options de l'Événement
            </h3>

            {/* Custom purple card for DJ view in corporate freelance mode */}
            <div className="bg-purple-50/70 p-6 rounded-xl border border-purple-200 shadow-sm flex flex-col items-center justify-center text-center max-w-md mx-auto my-6">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-2">Cachet DJ à facturer à R'Key Prod</span>
              <span className="text-4xl font-extrabold text-purple-600 mb-2">{cachetDJVal.toFixed(2)} €</span>
              <p className="text-xs text-purple-500 italic px-4">
                Conformément au mode entreprise pour freelances, ce montant correspond à votre cachet d'artiste DJ que vous devez facturer directement à l'entreprise R'Key Prod.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Options d'animation de l'événement</h4>
                {contractOptions.length > 0 ? (
                  <ul className="space-y-2">
                    {contractOptions.map((opt, idx) => (
                      <li key={idx} className="flex items-center justify-between text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 font-medium">
                          <Check className="w-4 h-4 text-green-500" />
                          {opt.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucune option validée sur ce contrat.</p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Vue normale pour Admin et pour Client (la vue client n'affiche pas les détails internes)
      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 text-slate-900 ${getSectionHighlightClass('options')}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-400" />
            Tarifs et Options de l'Événement
          </h3>

          {/* Tableaux de bord financier simple & esthétique */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            {/* Total prestation */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Montant Prestation TTC</span>
                <span className="text-xl font-bold text-slate-800">{totalPrestation.toFixed(2)} €</span>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-0.5">
                {isEntrepriseFreelance ? (
                  <div className="flex justify-between">
                    <span>Tarif de base :</span>
                    <span>{baseRate.toFixed(2)} €</span>
                  </div>
                ) : isMandatMode ? (
                  <>
                    <div className="flex justify-between items-center py-0.5" onClick={(e) => e.stopPropagation()}>
                      <span>Frais de mandat & gestion :</span>
                      {role === 'admin' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={fraisMandat === 0 ? "" : fraisMandat}
                            onChange={(e) => {
                              handleFraisChange(e.target.value);
                            }}
                            onBlur={(e) => {
                              saveFraisToDb(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-16 px-1.5 py-0.5 text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded text-right focus:ring-1 focus:ring-indigo-500 transition outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[10px] font-bold text-slate-400">€</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">{fraisMandat.toFixed(2)} €</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span>Cachet DJ/Artiste :</span>
                      <span className="font-semibold text-slate-700">{cachetArtiste.toFixed(2)} €</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Tarif de base :</span>
                    <span>{baseRate.toFixed(2)} €</span>
                  </div>
                )}
                {optionsTotal > 0 && (
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Options :</span>
                    <span>+{optionsTotal.toFixed(2)} €</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>Remise :</span>
                    <span>-{discountAmount.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>

            {/* Déjà réglé (Acompte / Mandat) */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {isEntrepriseFreelance ? "Acompte payé à R'Key Prod" : (isMandatMode ? "Frais de mandat & gestion (Réglé)" : "Paiement déjà versé")}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-emerald-600">
                    {amountPaid > 0 ? `${amountPaid.toFixed(2)} €` : "0,00 €"}
                  </span>
                  {(isDepositPaid || isMandatMode) && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                      Reçu
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 italic leading-tight">
                {c.no_deposit_required ? (
                  <span className="text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded block">
                    Confiance / Externe (Aucun acompte requis)
                  </span>
                ) : isEntrepriseFreelance ? (
                  isDepositPaid ? (
                    <span className="text-emerald-700 font-medium block">
                      Acompte perçu par R'Key Prod.
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium block">
                      Acompte de {depositAmount.toFixed(2)} € restant à régler.
                    </span>
                  )
                ) : isMandatMode ? (
                  <span className="text-emerald-700 font-medium block">
                    Frais de mandat perçus à la création du contrat.
                  </span>
                ) : isDepositPaid ? (
                  <span className="text-emerald-700 font-medium block">
                    Acompte perçu à la signature du contrat.
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium block">
                    Acompte de {depositAmount.toFixed(2)} € en attente.
                  </span>
                )}
              </div>
            </div>

            {/* Solde restant (Cachet) */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {isEntrepriseFreelance ? "Solde restant à régler à R'Key Prod" : (isMandatMode ? "Cachet Artiste restants" : "Solde restant dû")}
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {remainingBalance.toFixed(2)} €
                </span>
                
                {additions.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-dashed border-slate-200 pt-1.5">
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Solde initial :</span>
                      <span>{originalRemainingBalance.toFixed(2)} €</span>
                    </div>
                    {additions.map((opt, index) => (
                      <div key={index} className="flex justify-between items-center text-[11px] text-slate-600 font-medium">
                        <span className="truncate max-w-[140px] text-amber-600" title={opt.name}>+ {opt.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-600">+{Number(opt.price).toFixed(2)} €</span>
                          <button
                            onClick={() => removePostSignatureOption(opt)}
                            disabled={optionsSubmitting}
                            title="Supprimer cette option"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded transition-colors focus:outline-none"
                          >
                            <X className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Options Validées au Contrat</h4>
                {contractOptions.length > 0 ? (
                  <ul className="space-y-2">
                    {contractOptions.map((opt, idx) => (
                      <li key={idx} className="flex items-center justify-between text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {opt.name}
                        </div>
                        <span className="font-semibold">{opt.price} €</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucune option validée sur ce contrat.</p>
                )}
              </div>

              {requestedOptions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-orange-600">
                    <Clock className="w-4 h-4" />
                    En attente de validation
                  </h4>
                  <ul className="space-y-2">
                    {requestedOptions.map((opt, idx) => (
                      <li key={idx} className="flex items-center justify-between text-orange-800 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          {opt.name}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{opt.price} €</span>
                          {(role === 'dj' || role === 'admin') && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => validateRequestedOption(opt)}
                                disabled={optionsSubmitting}
                                className="text-green-600 hover:text-green-800 hover:bg-green-100/50 p-1.5 rounded transition-colors disabled:opacity-50"
                                title="Valider l'option"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => cancelRequestedOption(opt)}
                                disabled={optionsSubmitting}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100/50 p-1.5 rounded transition-colors disabled:opacity-50"
                                title="Refuser / Annuler l'option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Autres Options Disponibles</h4>
              {role === 'dj' && (
                <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200 mb-3">
                  Note pour le DJ : Pour toute demande d'ajout d'option, veuillez en faire la demande à R'Key Prod directement.
                </p>
              )}
              {role === 'client' && (
                <p className="text-sm text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 mb-3">
                  Ce que vous voyez dans cette section sont les options supplémentaires possibles pour votre événement. Vous souhaitez en ajouter une ? Cochez-la ci-dessous et validez !
                </p>
              )}
              {nonSelectedOptions.length > 0 ? (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {nonSelectedOptions.map((opt, idx) => {
                      const isSelected = optionsBasket.some(o => o.id === opt.id);
                      return (
                        <li 
                          key={idx} 
                          onClick={() => role === 'client' && toggleBasket(opt)}
                          className={`flex flex-col text-sm bg-white px-3 py-2 rounded-lg border shadow-sm transition-colors ${role === 'client' ? 'cursor-pointer hover:border-indigo-300' : ''} ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {role === 'client' && (
                                <input 
                                  type="checkbox" 
                                  readOnly 
                                  checked={isSelected} 
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                              )}
                              <span className={`font-medium ${isSelected ? 'text-indigo-800' : 'text-gray-800'}`}>{opt.name}</span>
                            </div>
                            <span className="font-semibold whitespace-nowrap ml-2 text-indigo-600">{opt.price} €</span>
                          </div>
                          {opt.description && <span className={`mt-1 ${role === 'client' ? 'pl-6' : ''} ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>{opt.description}</span>}
                        </li>
                      );
                    })}
                  </ul>

                  {role === 'client' && optionsBasket.length > 0 && (
                    <button
                      onClick={submitRequest}
                      disabled={optionsSubmitting}
                      className="w-full mt-4 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {optionsSubmitting ? 'Envoi en cours...' : `Soumettre la demande (${optionsBasket.length} option${optionsBasket.length > 1 ? 's' : ''})`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Toutes les options disponibles ont été sélectionnées.</p>
              )}
            </div>
          </div>

          {/* Note sur les tarifs */}
          {role === 'client' ? (
            ev.showOptionsTarifNotesToClient && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  📝 Note sur les tarifs (optionnel)
                </h4>
                {ev.optionsTarifNotes ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {ev.optionsTarifNotes}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aucune note spécifique sur les tarifs.</p>
                )}
              </div>
            )
          ) : (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  📝 Note sur les tarifs (optionnel)
                </h4>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    checked={ev.showOptionsTarifNotesToClient || false}
                    onChange={e => {
                      const val = e.target.checked;
                      const newEvents = [...events];
                      const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                      if (idx !== -1) {
                        newEvents[idx].showOptionsTarifNotesToClient = val;
                        setEvents(newEvents);
                      }
                      updateContractDb(currentRoute.eventId, { show_options_tarif_notes_to_client: val });
                    }}
                  />
                  Rendre visible pour le client
                </label>
              </div>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ajouter des notes sur les tarifs ou sur un accord particulier..."
                value={ev.optionsTarifNotes || ''}
                onChange={e => {
                  const newEvents = [...events];
                  const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                  if (idx !== -1) {
                    newEvents[idx].optionsTarifNotes = e.target.value;
                    setEvents(newEvents);
                  }
                }}
                onBlur={e => updateContractDb(currentRoute.eventId, { options_tarif_notes: e.target.value })}
              />
            </div>
          )}
        </div>
      );
    };

    const ChatSection = () => {
      // Set to chatContainerRef defined at top-level
      
      const handleSendMessage = () => {
        if (!chatNewMessage.trim()) return;
        const msg = {
          id: Date.now().toString(),
          text: chatNewMessage,
          senderRole: currentRoute.role, // 'admin', 'dj', 'client'
          senderName: currentRoute.role === 'admin' ? "R'Key Prod" : (currentRoute.role === 'dj' ? (ev.dj?.name || 'DJ') : (ev.contractInfo?.company || ev.client?.name || 'Client')),
          timestamp: new Date().toISOString()
        };
        const updatedChat = [...chatMessages, msg];
        setChatMessages(updatedChat);
        setChatNewMessage("");
        
        ev.chatMessages = updatedChat;
        if (currentRoute.eventId) {
            updateContractDb(currentRoute.eventId, { chat_messages: updatedChat });
        }
      };

      const downloadChat = () => {
          const content = chatMessages.map(m => {
             const date = new Date(m.timestamp).toLocaleString('fr-FR');
             return `[${date}] ${m.senderName} (${m.senderRole}): ${m.text}`;
          }).join('\n');
          
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `chat_${ev.id}.txt`;
          link.click();
          URL.revokeObjectURL(url);
      };

      const resetChat = () => {
        if (window.confirm("Êtes-vous sûr de vouloir vider l'historique de cette discussion ? Tous les messages seront supprimés.")) {
          setChatMessages([]);
          ev.chatMessages = [];
          if (currentRoute.eventId) {
              updateContractDb(currentRoute.eventId, { chat_messages: [] });
          }
        }
      };

      return (
        <div className={`bg-orange-50 rounded-xl shadow-lg border border-orange-200 p-6 mb-6 mt-6 relative overflow-hidden ${getSectionHighlightClass('chat') ? getSectionHighlightClass('chat') : 'ring-4 ring-orange-500/10'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-orange-900">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              Espace Discussion
            </h3>
            {currentRoute.role === 'admin' && chatMessages.length > 0 && (
              <div className="flex gap-2">
                <button onClick={downloadChat} className="text-sm font-medium text-orange-700 hover:text-orange-900 flex items-center gap-1 bg-white px-3 py-1.5 rounded-md shadow-sm border border-orange-100 transition-colors">
                  <Download className="w-4 h-4" /> Exporter
                </button>
                <button onClick={resetChat} className="text-sm font-medium text-red-700 hover:text-red-900 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-md shadow-sm border border-red-100 transition-colors" title="Remettre à zéro la conversation">
                  <Trash2 className="w-4 h-4" /> Vider
                </button>
              </div>
            )}
          </div>
          
          <div ref={chatContainerRef} className="bg-white/80 rounded-lg p-4 h-64 overflow-y-auto flex flex-col gap-3 mb-4 border border-orange-100 shadow-inner">
            {chatMessages.length === 0 ? (
              <p className="text-center text-orange-400/80 italic my-auto font-medium">Aucun message pour le moment. Commencez la discussion !</p>
            ) : (
               chatMessages.map(msg => {
                 const isMe = msg.senderRole === currentRoute.role;
                 return (
                   <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                     <span className="text-xs text-orange-800/60 mb-1 px-1 font-medium">{msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                     <div className={`p-3 text-sm ${isMe ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none shadow-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none shadow-sm break-words'}`}>
                       {msg.text}
                     </div>
                   </div>
                 );
               })
            )}
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text"
              value={chatNewMessage}
              onChange={(e) => setChatNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Écrivez votre message..."
              className="flex-1 border border-orange-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none focus:border-orange-500 bg-white placeholder-orange-300 min-w-0"
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!chatNewMessage.trim()} 
              className="bg-orange-600 text-white px-3 sm:px-5 py-2.5 rounded-md text-xs sm:text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm disabled:shadow-none font-semibold whitespace-nowrap flex-shrink-0 flex items-center justify-center"
            >
              Envoyer
            </button>
          </div>
        </div>
      );
    };

    const CateringSection = () => {
      const ev = events.find(e => e.id === currentRoute.eventId);
      if (!ev) return null;
      
      const isClient = currentRoute.role === 'client';
      const isDj = currentRoute.role === 'dj';
      const isAdmin = currentRoute.role === 'admin';
      
      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mt-6 text-slate-900 ${getSectionHighlightClass('catering')}`} id="section-catering">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-600" />
              Catering & Repas
            </h3>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              {(isAdmin || (ev.cateringNotes && ev.cateringNotes.trim())) && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Conditions de repas (selon contrat)</p>
                  {isAdmin ? (
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px] bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                      placeholder="Précisez les conditions de repas convenues..."
                      value={ev.cateringNotes || ''}
                      onChange={e => {
                        const newEvents = [...events];
                        const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                        newEvents[idx].cateringNotes = e.target.value;
                        setEvents(newEvents);
                      }}
                      onBlur={e => updateContractDb(currentRoute.eventId, { catering_notes: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium text-gray-900 bg-white p-3 rounded border border-gray-200 min-h-[60px] whitespace-pre-wrap">
                      {ev.cateringNotes}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-3">
                {isAdmin ? (
                   <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white p-3 rounded-xl border border-gray-200 shadow-xs w-full select-none">
                     <input type="checkbox" checked={ev.cateringDrinks || false} onChange={e => {
                       const val = e.target.checked;
                       updateContractDb(currentRoute.eventId, { catering_drinks: val });
                       const newEvents = [...events];
                       const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                       newEvents[idx].cateringDrinks = val;
                       setEvents(newEvents);
                     }} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                     Boissons comprises
                   </label>
                ) : (
                   <div className="flex items-center gap-2 font-medium text-gray-700 bg-white p-3 rounded-xl border border-gray-200 shadow-xs w-full">
                     {ev.cateringDrinks ? (
                       <><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> Boissons comprises dans le catering</>
                     ) : (
                       <><XCircle className="w-5 h-5 text-red-500 flex-shrink-0" /> Boissons non comprises (hors catering)</>
                     )}
                   </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isAdmin ? (
                   <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs w-full">
                     {/* Quantité input box in front of the checkbox */}
                     <div className="flex items-center gap-1 flex-shrink-0">
                       <span className="text-[10px] uppercase font-bold text-slate-400">Qté:</span>
                       <input 
                         type="number"
                         min="0"
                         placeholder="0"
                         value={ev.cateringHotMealNoTableQty === 0 && !ev.cateringHotMealNoTable ? "" : ev.cateringHotMealNoTableQty}
                         onChange={e => {
                           const valStr = e.target.value;
                           const valNum = valStr === '' ? 0 : (parseInt(valStr, 10) || 0);
                           
                           const newEvents = [...events];
                           const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                           newEvents[idx].cateringHotMealNoTableQty = valNum;
                           
                           if (valNum > 0 && !newEvents[idx].cateringHotMealNoTable) {
                             newEvents[idx].cateringHotMealNoTable = true;
                           }
                           setEvents(newEvents);
                         }}
                         onBlur={e => {
                           const valStr = e.target.value;
                           const valNum = valStr === '' ? 0 : (parseInt(valStr, 10) || 0);
                           const isChecked = valNum > 0 || ev.cateringHotMealNoTable;
                           updateContractDb(currentRoute.eventId, { 
                             catering_hot_meal_no_table_qty: valNum,
                             catering_hot_meal_no_table: isChecked
                           });
                         }}
                         className="w-12 px-1.5 py-1 text-xs font-bold text-center text-indigo-900 bg-gray-50 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       />
                     </div>
                     <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 select-none text-sm flex-1">
                       <input 
                         type="checkbox" 
                         checked={ev.cateringHotMealNoTable || false} 
                         onChange={e => {
                           const val = e.target.checked;
                           const newEvents = [...events];
                           const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                           newEvents[idx].cateringHotMealNoTable = val;
                           
                           let newQty = newEvents[idx].cateringHotMealNoTableQty;
                           if (val && (!newQty || Number(newQty) === 0)) {
                             newQty = 1;
                             newEvents[idx].cateringHotMealNoTableQty = 1;
                           }
                           
                           updateContractDb(currentRoute.eventId, { 
                             catering_hot_meal_no_table: val,
                             catering_hot_meal_no_table_qty: newQty
                           });
                           setEvents(newEvents);
                         }}
                         className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                       />
                       repas chaud (pas de place à table)
                     </label>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 font-medium text-gray-700 bg-white p-3 rounded-xl border border-gray-200 shadow-xs w-full">
                     {ev.cateringHotMealNoTable ? (
                       <><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> {ev.cateringHotMealNoTableQty || 0} repas chaud(s) (pas de place à table)</>
                     ) : (
                       <><XCircle className="w-5 h-5 text-red-500 flex-shrink-0" /> Pas de repas chaud (pas de place à table)</>
                     )}
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const VenueSection = () => {
      const ev = events.find(e => e.id === currentRoute.eventId);
      if (!ev) return null;
      
      const isClient = currentRoute.role === 'client';
      const isDashboard = window.location.pathname === '/';
      const token = localStorage.getItem('access_token');
      
      const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setVenueUploading(true);
        
        let successCount = 0;
        const uploadedPhotos = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file);
          try {
            const response = await fetch(`${BACKEND_URL}/api/public/upload/photo`, {
              method: 'POST',
              body: formData
            });
            const data = await response.json();
            if (response.ok && data.url) {
              uploadedPhotos.push({ url: data.url, id: Date.now() + i });
              successCount++;
            }
          } catch (err) {
            console.error("Error uploading file", file.name, err);
          }
        }
        
        if (successCount > 0) {
          const currentPhotos = ev.venue_photos || [];
          await updateContractDb(currentRoute.eventId, { 
            venue_photos: [...currentPhotos, ...uploadedPhotos] 
          });
          toast.success(`${successCount} photo(s) ajoutée(s)`);
        } else {
          toast.error("Erreur upload");
        }
        setVenueUploading(false);
      };

      const handleDeletePhoto = (photoId) => {
        if (!window.confirm("Supprimer cette photo ?")) return;
        const newPhotos = (ev.venue_photos || []).filter(p => p.id !== photoId);
        updateContractDb(currentRoute.eventId, { venue_photos: newPhotos });
      };

      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mt-6 text-slate-900 ${getSectionHighlightClass('venue')}`} id="section-venue">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Lieu de réception {isClient && <span className="text-xs font-normal text-gray-500 italic mt-1">(Facultatif mais apprécié)</span>}
            </h3>
          </div>
          
          <div className="space-y-6">
            {/* Checkboxes from Contracts */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Contraintes Techniques de la salle</h4>
                <div className="flex gap-4 flex-wrap mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ev.has_limiteur_son || false} onChange={e => {
                      const val = e.target.checked;
                      updateContractDb(currentRoute.eventId, { has_limiteur_son: val, ...(val ? {has_no_limiteur_ni_detecteur: false} : {}) });
                    }} />
                    Limiteur de son
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ev.has_detecteur_fumee || false} onChange={e => {
                      const val = e.target.checked;
                      updateContractDb(currentRoute.eventId, { has_detecteur_fumee: val, ...(val ? {has_no_limiteur_ni_detecteur: false} : {}) });
                    }} />
                    Détecteur de fumée
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ev.has_no_limiteur_ni_detecteur || false} onChange={e => {
                      const val = e.target.checked;
                      updateContractDb(currentRoute.eventId, { has_no_limiteur_ni_detecteur: val, ...(val ? {has_limiteur_son: false, has_detecteur_fumee: false} : {}) });
                    }} />
                    Aucun
                  </label>
                </div>

                <h4 className="font-semibold text-gray-700 mb-3">Connectivité de la salle</h4>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ev.has_wifi || false} onChange={e => {
                      const val = e.target.checked;
                      updateContractDb(currentRoute.eventId, { has_wifi: val });
                    }} />
                    Wi-Fi
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ev.has_4g_5g || false} onChange={e => {
                      const val = e.target.checked;
                      updateContractDb(currentRoute.eventId, { has_4g_5g: val });
                    }} />
                    4G/5G
                  </label>
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Photos de la salle</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(ev.venue_photos || []).map(photo => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                      <img src={photo.url.startsWith('http') ? photo.url : `${BACKEND_URL}${photo.url}`} alt="Venue" className="w-full h-32 object-cover" crossOrigin="anonymous" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenLightbox((ev.venue_photos || []).map(p => ({
                            ...p,
                            url: p.url.startsWith('http') ? p.url : `${BACKEND_URL}${p.url}`
                          })), (ev.venue_photos || []).findIndex(p => p.id === photo.id))} 
                          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700" 
                          title="Aperçu"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePhoto(photo.id)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {currentRoute.role !== 'client' && (
                          <a href={photo.url.startsWith('http') ? `${photo.url}?download=true` : `${BACKEND_URL}${photo.url}?download=true`} download target="_blank" rel="noreferrer" className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600" title="Télécharger">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Upload button wrapper */}
                  <label className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center relative hover:bg-gray-50 transition cursor-pointer text-center p-2">
                    {venueUploading ? (
                      <span className="text-gray-500 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Upload...
                      </span>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                        <span className="text-sm font-semibold text-slate-800">Uploader photo(s)</span>
                        <span className="text-xs text-slate-400">Sélectionner ou Glisser</span>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} multiple />
                      </>
                    )}
                  </label>

                  {/* Live Camera Capture Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setCameraSessionPhotos([]);
                      setIsCameraModalOpen(true);
                    }}
                    className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition cursor-pointer text-center p-2"
                  >
                    <Camera className="w-6 h-6 text-indigo-500 mb-1" />
                    <span className="text-sm font-semibold text-slate-800">Prendre photo(s)</span>
                    <span className="text-xs text-slate-400 font-normal">Caméra en direct</span>
                  </button>
                </div>
              </div>

              {/* Observations */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Observations sur la salle</h4>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
                  placeholder="Notes, accès, particularités du lieu de réception..."
                  value={ev.venue_notes || ''}
                  onChange={e => {
                    const newEvents = [...events];
                    const idx = newEvents.findIndex(x => x.id === currentRoute.eventId);
                    newEvents[idx].venue_notes = e.target.value;
                    setEvents(newEvents);
                  }}
                  onBlur={e => updateContractDb(currentRoute.eventId, { venue_notes: e.target.value })}
                />
              </div>

          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 text-slate-900">
        {!isClientStandalone && (
          <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${isNightBg ? 'bg-slate-900/60 border-slate-800 backdrop-blur-md' : 'bg-gray-50 border-gray-200'}`}>
            <button onClick={handleBack} className={`flex items-center gap-2 font-bold px-3 py-2 rounded-md transition ${isNightBg ? 'text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/40' : 'text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100'}`}>
              <ArrowLeft className="w-5 h-5" /> {isDjStandalone ? "Retour à mes événements" : "Retour à la liste"}
            </button>
            
            {!isPublic && (
              <div className="flex gap-2">
                {isDashboard && (
                  <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'admin' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'admin' ? 'bg-indigo-600 text-white shadow' : (isNightBg ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-gray-600 border hover:bg-gray-50')}`}>Vue Admin</button>
                )}
                
                {(isDashboard || isDjStandalone) && (
                  <>
                    <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'dj' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'dj' ? 'bg-yellow-600 text-white shadow' : (isNightBg ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-gray-600 border hover:bg-gray-50')}`}>Vue DJ</button>
                    <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'client' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'client' ? 'bg-green-600 text-white shadow' : (isNightBg ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-gray-600 border hover:bg-gray-50')}`}>Vue Client</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {currentRoute.role === 'admin' && (
          <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Espace Admin - {ev.name}
            </h2>
            <div className="flex gap-2 relative z-10">
              <button onClick={generateDjPDF} className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <Download className="w-4 h-4" /> PDF DJ
              </button>
              <button onClick={generateClientPDF} className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <Download className="w-4 h-4" /> PDF Client
              </button>
            </div>
          </div>
        )}

        {currentRoute.role === 'dj' && (
          <div className="bg-yellow-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden animate-in fade-in duration-300">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Headphones className="w-8 h-8" />
                  Espace DJ - {ev.name}
                </h2>
                <div className="mt-4 flex gap-4 items-center">
                  <p className="opacity-90">Connecté en tant que: <span className="font-semibold">{ev.dj?.name || 'DJ'}</span></p>
                </div>
              </div>
              <button onClick={generateDjPDF} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 w-fit">
                <Download className="w-5 h-5" /> Télécharger mon récap' PDF
              </button>
            </div>
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
              <Headphones className="w-48 h-48" />
            </div>
          </div>
        )}

        {currentRoute.role === 'client' && (
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden animate-in fade-in duration-300">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-col mb-2">
                  <span className="text-green-200 text-sm font-semibold uppercase tracking-wider">{ev.name.split(' ')[0]}</span>
                </div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-8 h-8" />
                  Espace Client - {ev.contractInfo?.name || ev.client?.name || ev.name}
                </h2>
              </div>
              <button onClick={generateClientPDF} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 w-fit">
                <Download className="w-5 h-5" /> Télécharger mon récap' PDF
              </button>
            </div>
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
              <Users className="w-48 h-48" />
            </div>
          </div>
        )}

        {(() => {
          const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
          if (notifKeys.length === 0) return null;
          
          const sectionNamesFr = {
            chat: "Discussion",
            options: "Tarifs & Options",
            playlist: "Playlist & Styles",
            planning: "Déroulement / Planning",
            client_info: "Infos Client",
            documents: "Documents administratifs",
            venue: "Fiche Technique Salle",
            catering: "Repas Artiste"
          };
          
          const listFr = notifKeys.map(k => sectionNamesFr[k] || k).join(', ');
          
          return (
            <div className="bg-red-50 border-2 border-red-200 text-red-950 px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-800 text-sm">Nouvelles notifications sur cet événement !</h4>
                  <p className="text-xs text-red-700 mt-1">
                    Changements détectés dans : <span className="font-semibold">{listFr}</span> (voir les encadrés entourés en rouge ci-dessous).
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const updatedNotifs = { ...ev.notifications, [currentRoute.role]: {} };
                  setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, notifications: updatedNotifs } : e));
                  updateContractDb(ev.id, { notifications: updatedNotifs });
                  toast.success("Notifications marquées comme lues !");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex-shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-center"
              >
                <Check className="w-4 h-4" />
                Marquer comme lu
              </button>
            </div>
          );
        })()}

        {AppointmentBannerSection()}
        {ClientTutorialVideoSection()}
        {DjInfoSection()}
        {ClientInfoSection()}
        {ChatSection()}
        {PlanningSection()}
        {DocumentsTipsSection()}
        {OptionsSection()}

        {currentRoute.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {ScheduleSection({ canEdit: true })}
            {PlaylistSection({ role: "admin" })}
          </div>
        )}

        {currentRoute.role === 'dj' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {ScheduleSection({ canEdit: true })}
            {PlaylistSection({ role: "dj" })}
          </div>
        )}

        {currentRoute.role === 'client' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {ScheduleSection({ canEdit: false })}
            {PlaylistSection({ role: "client" })}
          </div>
        )}

        {CateringSection()}
        {VenueSection()}
      </div>
    );
  };

  const DjStandaloneListView = () => {
    const activeDj = currentRoute.activeDj || { name: 'DJ' };
    
    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, ''); // keep only alpha-numeric characters
    };

    const sectionNamesFr = {
      chat: "Discussion",
      options: "Tarifs & Options",
      playlist: "Playlist & Styles",
      planning: "Déroulement / Planning",
      client_info: "Infos Client",
      documents: "Documents administratifs",
      venue: "Fiche Technique Salle",
      catering: "Repas Artiste"
    };
    
    const activeDjNorm = normalizeString(activeDj.name);
    
    const myEvents = events.filter(e => {
      if (!e.dj) return false;
      return normalizeString(e.dj.name) === activeDjNorm || 
             normalizeString(e.dj.login) === activeDjNorm ||
             (e.rawContractData && (
                normalizeString(e.rawContractData.dj_profile) === activeDjNorm ||
                (e.rawContractData.dj_profile_data && normalizeString(e.rawContractData.dj_profile_data.nom_artistique) === activeDjNorm)
             ));
    });

    const priorityDjEvents = myEvents.filter(e => {
      const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
      return notifs.length > 0;
    });

    const remainingDjEvents = myEvents.filter(e => {
      const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
      return notifs.length === 0;
    });

    const past = remainingDjEvents.filter(e => e.date < today);
    const future = remainingDjEvents.filter(e => e.date >= today);

    const futureByYear = future.reduce((acc, ev) => {
      const year = ev.date.substring(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(ev);
      return acc;
    }, {});

    const toggleYear = (year) => {
      setDjStandaloneExpandedYears(prev => ({ ...prev, [year]: prev[year] === false ? true : false }));
    };

    return (
      <div className="space-y-6">
        <div className="bg-yellow-600 text-white p-6 rounded-xl shadow-sm border border-yellow-700 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Headphones className="w-8 h-8" />
                Portail DJ - {activeDj.name}
              </h2>
              <p className="mt-2 text-yellow-100">Retrouvez ci-dessous l'ensemble de vos prestations.</p>
            </div>
            {!isPublic && (
              <button 
                onClick={() => setCurrentRoute({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' })} 
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-800 rounded-lg text-sm transition-colors shadow flex items-center gap-2 w-fit"
              >
                <Eye className="w-4 h-4" /> Fermer l'aperçu
              </button>
            )}
           </div>
           <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
             <Headphones className="w-48 h-48" />
           </div>
        </div>

        <div className="grid gap-6">
            {priorityDjEvents.length > 0 && (
                <div className="border-2 border-red-200 bg-red-50/20 rounded-2xl p-5 shadow-sm relative overflow-hidden animate-in fade-in duration-300">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2.5 text-red-700">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <Bell className="w-5 h-5 text-red-500 animate-bounce" />
                      Notifications en cours
                      <span className="bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center border border-red-600 shadow-sm min-w-6 h-6 px-1.5 animate-pulse">
                        {priorityDjEvents.length}
                      </span>
                    </h3>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto bg-white border border-red-100 rounded-xl shadow-xs text-slate-900">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-sm text-gray-500 border-b">
                                <tr>
                                    <th className="p-4 font-semibold">Événement</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {priorityDjEvents.map(ev => {
                                    const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
                                    const notifCount = notifKeys.length;
                                    const hasChatNotif = notifKeys.includes('chat');
                                    return (
                                    <tr key={ev.id} className="hover:bg-yellow-50/50 transition cursor-pointer group" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                                        <td className="p-4 font-bold text-gray-950 flex items-center gap-2">
                                            {ev.name}
                                            {notifCount > 0 && (
                                                <span className={`flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm ${hasChatNotif ? 'animate-pulse' : ''}`}>
                                                    {notifCount}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 min-w-[125px]">
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                                {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-yellow-600 font-bold text-sm flex items-center justify-end gap-1 w-full group-hover:text-yellow-700">
                                                Ouvrir <ChevronRight className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {priorityDjEvents.map(ev => {
                            const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
                            const notifCount = notifKeys.length;
                            const listFr = notifKeys.map(k => sectionNamesFr[k] || k).join(', ');
                            return (
                                <div 
                                    key={ev.id} 
                                    onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}
                                    className="p-4 bg-white rounded-xl border border-red-200 shadow-xs hover:border-red-300 transition-all flex flex-col gap-1.5 cursor-pointer text-left text-slate-900"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                                {ev.name}
                                            </h4>
                                            {ev.client?.name && (
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Client : <span className="font-semibold text-slate-700">{ev.client?.name}</span>
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                            {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50/50 py-1 px-2.5 rounded-lg border border-red-100 mt-1">
                                        <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse flex-shrink-0" />
                                        <span>Modifié : <span className="font-bold">{listFr}</span></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <h3 className={`text-xl font-bold ${isNightBg ? 'text-slate-100' : 'text-gray-800'}`}>Vos événements à venir</h3>
            {Object.keys(futureByYear).length > 0 ? (
                <div className="space-y-4">
                    {Object.keys(futureByYear).sort().map(year => (
                        <div key={year} className="bg-white border rounded-xl overflow-hidden shadow-sm text-slate-900">
                            <button 
                                onClick={() => toggleYear(year)}
                                className="flex items-center justify-between w-full p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left font-bold text-yellow-800"
                            >
                                <span className="flex items-center gap-2">
                                    Année {year}
                                    <span className="bg-yellow-200 text-yellow-800 text-xs py-1 px-2 rounded-full font-medium">
                                        {futureByYear[year].length} événement(s)
                                    </span>
                                </span>
                                {djStandaloneExpandedYears[year] !== false ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            {djStandaloneExpandedYears[year] !== false && (
                                <div className="w-full">
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left bg-white">
                                            <thead className="bg-gray-50 text-sm text-gray-500 border-b border-t">
                                                <tr>
                                                    <th className="p-4 font-semibold">Événement</th>
                                                    <th className="p-4 font-semibold">Date</th>
                                                    <th className="p-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {futureByYear[year].map(ev => {
                                                    const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
                                                    const notifCount = notifKeys.length;
                                                    const hasChatNotif = notifKeys.includes('chat');
                                                    return (
                                                    <tr key={ev.id} className="hover:bg-yellow-50 transition cursor-pointer group" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                                                        <td className="p-4 font-medium text-gray-900 group-hover:text-yellow-700 flex items-center gap-2">
                                                            {ev.name}
                                                            {notifCount > 0 && (
                                                                <span className={`flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm ${hasChatNotif ? 'animate-pulse' : ''}`}>
                                                                    {notifCount}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 min-w-[125px]">
                                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                                                {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button className="text-yellow-600 font-medium text-sm flex items-center justify-end gap-1 w-full group-hover:text-yellow-700">
                                                                Ouvrir <ChevronRight className="w-4 h-4"/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards View */}
                                    <div className="md:hidden p-4 space-y-3 bg-white text-slate-900">
                                        {futureByYear[year].map(ev => {
                                            const notifKeys = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]) : [];
                                            const notifCount = notifKeys.length;
                                            const listFr = notifKeys.map(k => sectionNamesFr[k] || k).join(', ');
                                            return (
                                                <div 
                                                    key={ev.id} 
                                                    onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}
                                                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col gap-1.5 cursor-pointer text-left text-slate-900"
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                                                {ev.name}
                                                            </h4>
                                                            {ev.client?.name && (
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    Client : <span className="font-semibold text-slate-700">{ev.client?.name}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                                            {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                                        </span>
                                                    </div>
                                                    {notifCount > 0 && (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50/50 py-1 px-2.5 rounded-lg border border-red-100 mt-1">
                                                            <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse flex-shrink-0" />
                                                            <span>Notif : <span className="font-bold">{listFr}</span></span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">Aucun événement à venir.</p>
            )}

            <h3 className={`text-xl font-bold mt-6 ${isNightBg ? 'text-slate-100' : 'text-gray-800'}`}>Historique</h3>
            {past.length > 0 ? (
                <div className="bg-white rounded-xl border overflow-hidden shadow-sm text-slate-900">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-gray-50 text-sm text-gray-500 border-b">
                                <tr><th className="p-4 font-semibold">Événement</th><th className="p-4 font-semibold">Date</th><th className="p-4"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {past.map(ev => (
                                    <tr key={ev.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                                        <td className="p-4 font-medium">{ev.name}</td>
                                        <td className="p-4 text-gray-600 min-w-[125px]">
                                            {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}-${ev.date.split('-')[1]}-${ev.date.split('-')[0]}` : ev.date : ''}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-yellow-600 hover:underline text-sm font-medium">Consulter</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-100 bg-white text-slate-900">
                        {past.map(ev => (
                            <div 
                                key={ev.id} 
                                onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}
                                className="p-4 hover:bg-gray-50 transition cursor-pointer flex justify-between items-center gap-2 text-left"
                            >
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-sm text-slate-800 leading-tight">
                                        {ev.name}
                                    </h4>
                                    {ev.client?.name && (
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Client : <span className="font-semibold text-slate-600">{ev.client?.name}</span>
                                        </p>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                    {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">Aucun historique.</p>
            )}
        </div>
      </div>
    );
  };

  const clearAllNotifications = () => {
    let eventsToUpdate = [];
    const newEvents = events.map(ev => {
      if (ev.notifications && ev.notifications[currentRoute.role] && Object.keys(ev.notifications[currentRoute.role]).length > 0) {
        const updatedNotifs = { ...ev.notifications, [currentRoute.role]: {} };
        eventsToUpdate.push({ id: ev.id, notifications: updatedNotifs });
        return { ...ev, notifications: updatedNotifs };
      }
      return ev;
    });
    
    if (eventsToUpdate.length > 0) {
      setEvents(newEvents);
      eventsToUpdate.forEach(({ id, notifications }) => {
        updateContractDb(id, { notifications });
      });
    }
  };

  const getUnreadSections = (ev) => {
      if (!ev || !ev.notifications || !ev.notifications[currentRoute.role]) return {};
      return ev.notifications[currentRoute.role];
  };

  const hasAnyNotifications = () => {
      return events.some(ev => ev.notifications && ev.notifications[currentRoute.role] && Object.keys(ev.notifications[currentRoute.role]).length > 0);
  };

  const getSectionHighlightClass = (section) => {
    const ev = currentRoute.eventId ? events.find(e => e.id === currentRoute.eventId) : null;
    const notifs = getUnreadSections(ev);
    if (!notifs[section]) return '';
    return currentRoute.role === 'client' 
      ? 'ring-4 ring-red-500 border-red-500 shadow-xl relative' 
      : 'ring-2 ring-red-400 border-red-400 relative';
  };

  const isNightBg = currentRoute.role === 'client' || currentRoute.role === 'dj';

  useEffect(() => {
    // Dynamically toggle global .App wrapper backgrounds to prevent seams on mobile bounce
    const appEl = document.querySelector('.App');
    if (appEl) {
      if (isNightBg) {
        appEl.classList.remove('bg-gradient-to-br', 'from-orange-50', 'via-white', 'to-amber-50');
        appEl.classList.add('bg-[#070811]');
      } else {
        appEl.classList.remove('bg-[#070811]');
        appEl.classList.add('bg-gradient-to-br', 'from-orange-50', 'via-white', 'to-amber-50');
      }
    }
    return () => {
      if (appEl) {
        appEl.classList.remove('bg-[#070811]');
        appEl.classList.add('bg-gradient-to-br', 'from-orange-50', 'via-white', 'to-amber-50');
      }
    };
  }, [isNightBg]);

  if (isPublic && isLoadingEvents) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950 select-none">
        <div className="flex flex-col items-center space-y-8 text-center max-w-sm">
          {/* Logo component */}
          <MyDjLogo className="w-56 h-56" glow={true} />
          
          <div className="space-y-3 mt-4">
            <h3 className="text-white text-xl font-bold tracking-wide">Accès Sécurisé</h3>
            <p className="text-slate-400 text-sm">
              Connexion sécurisée à votre espace événementiel...
            </p>
          </div>
          
          {/* Visual premium spinner */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 shadow-xl">
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-300">Chargement de vos données...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isPublic && events.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950 select-none">
        <div className="flex flex-col items-center space-y-6 text-center max-w-md bg-slate-900/40 backdrop-blur-md p-8 rounded-3xl border border-slate-900 shadow-2xl relative">
          <div className="absolute inset-0 bg-red-600/5 blur-3xl rounded-3xl pointer-events-none" />
          
          {/* Logo without heavy pulses */}
          <MyDjLogo className="w-36 h-36" glow={false} />
          
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
            <Shield className="w-6 h-6" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h3 className="text-white text-xl font-bold">Espace introuvable</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ce lien d'accès n'est pas actif ou l'événement associé a expiré. Veuillez contacter directement votre DJ ou l'équipe de production pour renouveler vos accès.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${isNightBg ? 'bg-[#070811] text-slate-100' : ''} -m-6 p-6 overflow-x-hidden`}>
      {isNightBg && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#070811] transition-opacity duration-500">
          {/* Nightlife party spotlights with high blur */}
          <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[55%] rounded-full bg-fuchsia-600/10 blur-[140px] animate-pulse duration-[12s]" />
          <div className="absolute top-[20%] right-[-10%] w-[55%] h-[55%] rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="absolute bottom-[-15%] left-[5%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[150px] animate-pulse duration-[15s]" />
          <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-pink-500/8 blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[45%] h-[45%] rounded-full bg-purple-500/5 blur-[110px]" />
          {/* Starry starry night backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>
      )}

      <div className="p-6 max-w-6xl mx-auto pb-24 relative z-10">
      {renderPWABanner()}
      {renderStandalonePushBanner()}
      {renderIOSInstallModal()}
      {hasAnyNotifications() && (
          <div className="flex justify-end mb-4">
              <button onClick={clearAllNotifications} className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Marquer toutes les notifications comme lues
              </button>
          </div>
      )}
      {!isPublic && currentRoute.view === 'list' && currentRoute.mode !== 'standalone_dj' && AdminListView()}
      {currentRoute.view === 'dj-list' && currentRoute.mode === 'standalone_dj' && DjStandaloneListView()}
      {currentRoute.view === 'detail' && DetailView()}
      
      {!isPublic && currentRoute.mode === 'standalone_client' && (
         <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setCurrentRoute({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' })} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4" /> Fermer l'aperçu Client (Admin)
            </button>
         </div>
      )}

      {/* Dynamic Document Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 flex-shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-800 truncate" title={previewDoc.title}>
                  Aperçu : {previewDoc.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {previewDoc.type === 'pdf' && (
                  <>
                    <button 
                      onClick={() => {
                        window.open(previewDoc.url.replace('?preview=true', '').replace('&preview=true', ''), '_blank');
                      }}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      title="Ouvrir le document dans un nouvel onglet"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans un onglet
                    </button>
                    <button 
                      onClick={() => {
                        if (previewBlobUrl) {
                          const a = document.createElement('a');
                          a.href = previewBlobUrl;
                          a.download = previewDoc.title.endsWith('.pdf') ? previewDoc.title : `${previewDoc.title}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } else {
                          // Fallback
                          window.open(previewDoc.url.replace('?preview=true', '').replace('&preview=true', ''), '_blank');
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content of preview */}
            <div className="flex-1 bg-slate-100 overflow-y-auto relative min-h-0">
              {previewDoc.type === 'pdf' ? (
                loadingPreviewBlob ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-slate-600">Chargement sécurisé du PDF en cours...</p>
                  </div>
                ) : previewBlobError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3 p-6 text-center">
                    <p className="text-red-500 font-semibold">Une erreur s'est produite lors du chargement du document.</p>
                    <p className="text-xs text-slate-500 max-w-md">{previewBlobError}</p>
                    <button 
                      onClick={() => {
                        setPreviewDoc({ ...previewDoc });
                      }}
                      className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : (
                  <div className="min-h-full flex flex-col items-center bg-slate-100 py-6 overflow-x-auto">
                    <Document
                      file={previewBlobUrl}
                      onLoadSuccess={({ numPages: n }) => setPreviewNumPages(n)}
                      loading={
                        <div className="flex flex-col items-center justify-center p-12 bg-white gap-3 rounded-xl shadow-xs">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          <p className="text-sm text-slate-500 font-medium">Chargement des pages du PDF...</p>
                        </div>
                      }
                      error={
                        <div className="flex flex-col items-center justify-center p-12 bg-white gap-3 text-red-500 rounded-xl shadow-xs text-center max-w-md">
                          <p className="font-semibold">Erreur lors de l'affichage du PDF</p>
                          <p className="text-xs text-slate-500">Utilisez le bouton "Télécharger" ou "Ouvrir dans un onglet" ci-dessus pour lire ou télécharger ce document.</p>
                        </div>
                      }
                    >
                      <div className="flex flex-col items-center gap-6">
                        {previewNumPages && Array.from({ length: previewNumPages }, (_, i) => (
                          <div key={i} className="shadow-lg bg-white border border-slate-200/80 rounded-sm overflow-hidden" style={{ width: 'fit-content' }}>
                            <Page 
                              pageNumber={i + 1} 
                              renderTextLayer={false} 
                              renderAnnotationLayer={false} 
                              width={720} 
                              className="max-w-full"
                            />
                            <div className="bg-slate-50 text-center py-1.5 border-t text-[10px] font-bold text-slate-500">
                              Page {i + 1} sur {previewNumPages}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Document>
                  </div>
                )
              ) : (
                <div className="max-w-4xl mx-auto my-6 bg-white p-6 sm:p-10 shadow-md border rounded-xl overflow-x-auto select-text font-serif text-slate-900 leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: previewDoc.url }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Live Camera Capture Modal */}
      {isCameraModalOpen && (
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onPhotosSaved={async (newPhotos) => {
            const ev = events.find(e => e.id === currentRoute.eventId);
            if (ev) {
              const currentPhotos = ev.venue_photos || [];
              await updateContractDb(currentRoute.eventId, { 
                venue_photos: [...currentPhotos, ...newPhotos] 
              });
              toast.success(`${newPhotos.length} photo(s) ajoutée(s) !`);
            }
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}

      {/* Lightbox / Photo Preview Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col justify-between text-white select-none">
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-slate-900/80 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">
              Photo {lightboxIndex + 1} / {lightboxImages.length}
            </span>
            <div className="flex items-center gap-3">
              <a 
                href={lightboxImages[lightboxIndex].url} 
                download 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
              </a>
              <button 
                onClick={() => setLightboxOpen(false)} 
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Stage with navigation */}
          <div className="flex-1 flex items-center justify-between p-4 relative overflow-hidden">
            {lightboxImages.length > 1 && (
              <button
                onClick={() => setLightboxIndex(prev => (prev === 0 ? lightboxImages.length - 1 : prev - 1))}
                className="absolute left-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors border border-slate-800"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={lightboxImages[lightboxIndex].url} 
                alt={`Photo ${lightboxIndex + 1}`} 
                className="max-w-full max-h-[70vh] object-contain rounded shadow-2xl" 
              />
            </div>

            {lightboxImages.length > 1 && (
              <button
                onClick={() => setLightboxIndex(prev => (prev === lightboxImages.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors border border-slate-800"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnails strip */}
          {lightboxImages.length > 1 && (
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex gap-2 items-center justify-center overflow-x-auto max-w-full">
              {lightboxImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${
                    idx === lightboxIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default DjClientApp;
