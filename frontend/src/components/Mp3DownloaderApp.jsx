import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Disc3, Play, Pause, CheckCircle2,
  AlertCircle, RefreshCw, Trash2, FileArchive, 
  Link as LinkIcon, Sparkles, Sliders,
  Volume2, VolumeX, ListMusic, Check, ChevronRight,
  Headphones, Info, CheckSquare, Square,
  Edit2, Plus, X, Music, RotateCcw, Search, ShieldAlert,
  Key, ShieldCheck, HelpCircle, ExternalLink, UserCheck,
  Layers, FolderArchive, Clock, ChevronDown, ChevronUp,
  Copy, LogIn, Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from '../services/axiosConfig';
import API_BASE_URL from '../utils/apiUrl';

export default function Mp3DownloaderApp() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'library' | 'settings'

  // Link mode state (Exclusive URL import)
  const [tidalUrl, setTidalUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [linkProtectedNotice, setLinkProtectedNotice] = useState(null);

  // Tidal Library & Source Mode state
  const [importSource, setImportSource] = useState(() => {
    return localStorage.getItem('tidal_custom_token') ? 'tidal_library' : 'link';
  });
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingUserPlaylists, setLoadingUserPlaylists] = useState(false);
  const [playlistSearchFilter, setPlaylistSearchFilter] = useState('');
  const [selectedPlaylistsForBatch, setSelectedPlaylistsForBatch] = useState(new Set());

  // Tidal OAuth & Session state
  const [oauthStatus, setOauthStatus] = useState({ configured: false, redirectUri: '' });
  const [startingOAuth, setStartingOAuth] = useState(false);
  const [showOAuthSetupGuide, setShowOAuthSetupGuide] = useState(false);
  const [showManualTokenSection, setShowManualTokenSection] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Multi-Playlists Download State
  const [multiJobId, setMultiJobId] = useState(null);
  const [multiJobStatus, setMultiJobStatus] = useState(null);
  const [downloadingMulti, setDownloadingMulti] = useState(false);
  const [showMultiJobModal, setShowMultiJobModal] = useState(false);

  // Playlist & Tracks Workbench (Starts empty by default in simplified view)
  const [playlist, setPlaylist] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [editingTrackId, setEditingTrackId] = useState(null);

  // Track Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const [trackSearchResults, setTrackSearchResults] = useState([]);
  const [searchingTrack, setSearchingTrack] = useState(false);

  // Settings & Tidal Account
  const [bitrate, setBitrate] = useState('320k');
  const [namingPattern, setNamingPattern] = useState('number_artist_title');
  const [customToken, setCustomToken] = useState(() => localStorage.getItem('tidal_custom_token') || '');
  const [showTidalModal, setShowTidalModal] = useState(false);
  const [tidalTokenInput, setTidalTokenInput] = useState(() => localStorage.getItem('tidal_custom_token') || '');
  const [verifyingTidal, setVerifyingTidal] = useState(false);
  const [tidalAccountInfo, setTidalAccountInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('tidal_account_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Download & Job state
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Library state
  const [library, setLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Audio Player State
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Polling for download progress (single playlist)
  useEffect(() => {
    let interval = null;
    if (activeJobId && downloading) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/mp3/download/status/${activeJobId}`);
          setJobStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'error') {
            setDownloading(false);
            if (res.data.status === 'completed') {
              toast.success("Téléchargement de la playlist terminé avec succès ! Archive ZIP prête.");
              loadLibrary();
            } else {
              toast.error("Le téléchargement s'est terminé avec des erreurs.");
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJobId, downloading]);

  // Polling for multi-playlist batch download progress
  useEffect(() => {
    let interval = null;
    if (multiJobId && downloadingMulti) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/mp3/download/multi-status/${multiJobId}`);
          setMultiJobStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'error') {
            setDownloadingMulti(false);
            if (res.data.status === 'completed') {
              toast.success("Toutes vos playlists ont été téléchargées ! Archive groupée ZIP prête.");
              loadLibrary();
            } else {
              toast.error("Le téléchargement groupé s'est terminé avec des alertes.");
            }
          }
        } catch (err) {
          console.error("Multi-job polling error:", err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [multiJobId, downloadingMulti]);

  // Load library when switching tabs
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab]);

  // Auto-fetch user playlists from Tidal if account connected
  const loadUserPlaylists = async (tokenOverride) => {
    const token = (tokenOverride !== undefined ? tokenOverride : customToken || '').trim();
    if (!token) {
      setUserPlaylists([]);
      return;
    }
    setLoadingUserPlaylists(true);
    try {
      const res = await axios.post('/mp3/tidal/my-playlists', { token });
      if (res.data?.expired) {
        setCustomToken('');
        setTidalTokenInput('');
        setTidalAccountInfo(null);
        setUserPlaylists([]);
        setImportSource('link');
        localStorage.removeItem('tidal_custom_token');
        localStorage.removeItem('tidal_account_info');
        toast.info("Votre session Tidal a expiré. Vous pouvez continuer par lien ou reconnecter votre compte.");
        return;
      }
      const pls = res.data?.playlists || [];
      setUserPlaylists(pls);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setCustomToken('');
        setTidalTokenInput('');
        setTidalAccountInfo(null);
        setUserPlaylists([]);
        setImportSource('link');
        localStorage.removeItem('tidal_custom_token');
        localStorage.removeItem('tidal_account_info');
        toast.info("Session Tidal expirée. Vous pouvez continuer par lien ou reconnecter votre compte.");
      } else {
        console.warn("Load user playlists warning:", err.message);
      }
    } finally {
      setLoadingUserPlaylists(false);
    }
  };

  useEffect(() => {
    if (customToken) {
      loadUserPlaylists(customToken);
    }
  }, [customToken]);

  // Fetch Tidal OAuth status on mount
  useEffect(() => {
    const fetchOAuthStatus = async () => {
      try {
        const res = await axios.get('/mp3/tidal/oauth-status');
        if (res.data) {
          setOauthStatus(res.data);
        }
      } catch (err) {
        console.warn("Tidal OAuth status fetch error:", err.message);
      }
    };
    fetchOAuthStatus();
  }, []);

  // Listen to OAuth popup postMessage events
  useEffect(() => {
    const handleOAuthMessage = (event) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'TIDAL_OAUTH_SUCCESS') {
        const { token, refreshToken, user } = event.data;
        if (token) {
          setCustomToken(token);
          setTidalTokenInput(token);
          localStorage.setItem('tidal_custom_token', token);
          if (refreshToken) {
            localStorage.setItem('tidal_refresh_token', refreshToken);
          }
          const info = {
            userId: user?.userId || 'Utilisateur Tidal',
            countryCode: user?.countryCode || 'FR',
            connectedAt: new Date().toISOString()
          };
          setTidalAccountInfo(info);
          localStorage.setItem('tidal_account_info', JSON.stringify(info));
          setShowTidalModal(false);
          toast.success(`Compte Tidal connecté avec succès ! (${info.userId})`);
          loadUserPlaylists(token);
          setImportSource('tidal_library');
          if (tidalUrl.trim()) {
            handleAnalyzeLinkWithToken(token);
          }
        }
      } else if (event.data?.type === 'TIDAL_OAUTH_ERROR') {
        toast.error(event.data.error || "La connexion Tidal a été annulée ou a échoué.");
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [tidalUrl]);

  const handleStartTidalOAuth = async () => {
    setStartingOAuth(true);
    try {
      const res = await axios.get('/mp3/tidal/auth-url');
      if (res.data?.url) {
        const popup = window.open(
          res.data.url,
          'tidal_oauth_popup',
          'width=600,height=750,menubar=no,toolbar=no,location=no,status=no'
        );
        if (!popup) {
          toast.error("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour vous connecter à Tidal.");
        }
      }
    } catch (err) {
      if (err.response?.status === 400 && !err.response?.data?.configured) {
        setOauthStatus(prev => ({
          ...prev,
          configured: false,
          redirectUri: err.response?.data?.redirectUri || prev.redirectUri
        }));
        setShowOAuthSetupGuide(true);
        toast.info("Connexion en 1 clic : ajoutez votre TIDAL_CLIENT_ID gratuit dans les paramètres.");
      } else {
        toast.error(err.response?.data?.error || "Impossible d'initier la connexion Tidal.");
      }
    } finally {
      setStartingOAuth(false);
    }
  };

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await axios.get('/mp3/library');
      setLibrary(res.data || []);
    } catch (err) {
      console.error("Error loading library:", err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('tidal_custom_token', customToken);
    toast.success("Paramètres enregistrés !");
  };

  const handleVerifyAndSaveTidalToken = async (candidateToken) => {
    const token = (candidateToken !== undefined ? candidateToken : tidalTokenInput).trim();
    if (!token) {
      toast.error("Veuillez saisir votre token de session Tidal.");
      return;
    }

    setVerifyingTidal(true);
    try {
      const res = await axios.post('/mp3/tidal/verify-token', { token });
      if (res.data && res.data.valid) {
        setCustomToken(token);
        localStorage.setItem('tidal_custom_token', token);
        const info = {
          userId: res.data.userId || 'Utilisateur Tidal',
          sessionId: res.data.sessionId || null,
          countryCode: res.data.countryCode || 'FR',
          connectedAt: new Date().toISOString()
        };
        setTidalAccountInfo(info);
        localStorage.setItem('tidal_account_info', JSON.stringify(info));
        toast.success(`Compte Tidal connecté avec succès ! (Utilisateur: ${info.userId}, Pays: ${info.countryCode})`);

        // Load user's playlist library
        loadUserPlaylists(token);
        setImportSource('tidal_library');

        // If a private playlist was waiting, re-analyze it automatically with the new token
        if (tidalUrl.trim()) {
          setShowTidalModal(false);
          toast.info("Analyse immédiate de votre playlist avec le compte Tidal connecté...");
          handleAnalyzeLinkWithToken(token);
        } else {
          setShowTidalModal(false);
        }
      }
    } catch (err) {
      console.warn("Tidal verify warning:", err.message);
      toast.error(err.response?.data?.error || "Token Tidal non reconnu ou expiré.");
    } finally {
      setVerifyingTidal(false);
    }
  };

  const handleDisconnectTidal = () => {
    setCustomToken('');
    setTidalTokenInput('');
    setTidalAccountInfo(null);
    setUserPlaylists([]);
    setSelectedPlaylistsForBatch(new Set());
    setImportSource('link');
    localStorage.removeItem('tidal_custom_token');
    localStorage.removeItem('tidal_account_info');
    toast.success("Compte Tidal déconnecté.");
  };

  // Tidal Library actions
  const handleLoadTidalPlaylist = async (pl) => {
    setAnalyzing(true);
    setLinkProtectedNotice(null);
    setJobStatus(null);
    setActiveJobId(null);
    toast.info(`Chargement des titres de « ${pl.title} »...`);

    try {
      const res = await axios.post('/mp3/tidal/parse', {
        url: pl.uuid || pl.id,
        customToken: customToken.trim() || undefined
      });

      if (res.data && res.data.tracks && res.data.tracks.length > 0) {
        setPlaylist({
          ...res.data,
          title: pl.title || res.data.title,
          coverUrl: pl.coverUrl || res.data.coverUrl,
          id: pl.uuid || pl.id
        });
        setSelectedTracks(new Set(res.data.tracks.map(t => t.id)));
        setLinkProtectedNotice(null);
        toast.success(`« ${pl.title} » chargée (${res.data.tracks.length} morceaux) !`);
      } else {
        toast.warning("Aucun morceau trouvé ou playlist protégée.");
      }
    } catch (err) {
      console.error("Load playlist error:", err);
      toast.error(err.response?.data?.error || "Erreur lors du chargement des morceaux.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Direct single download of a Tidal playlist from library
  const handleQuickDownloadTidalPlaylist = async (pl) => {
    toast.info(`Préparation du téléchargement de « ${pl.title} »...`);
    try {
      const res = await axios.post('/mp3/tidal/parse', {
        url: pl.uuid || pl.id,
        customToken: customToken.trim() || undefined
      });

      if (res.data && res.data.tracks && res.data.tracks.length > 0) {
        setPlaylist({
          ...res.data,
          title: pl.title || res.data.title,
          coverUrl: pl.coverUrl || res.data.coverUrl,
          id: pl.uuid || pl.id
        });
        setSelectedTracks(new Set(res.data.tracks.map(t => t.id)));

        // Launch download immediately
        setDownloading(true);
        const batchRes = await axios.post('/mp3/download/start-batch', {
          playlistTitle: pl.title || res.data.title || 'Playlist Tidal',
          playlistId: pl.uuid || pl.id,
          tracks: res.data.tracks,
          bitrate,
          namingPattern
        });

        if (batchRes.data?.jobId) {
          setActiveJobId(batchRes.data.jobId);
          toast.success(`Téléchargement de « ${pl.title} » lancé (${res.data.tracks.length} morceaux) !`);
        }
      } else {
        toast.warning("Impossible de récupérer les titres de cette playlist.");
      }
    } catch (err) {
      console.error("Quick download error:", err);
      toast.error(err.response?.data?.error || "Erreur lors du lancement du téléchargement.");
    }
  };

  // Launch multi-playlists batch download
  const handleStartMultiDownload = async (targetPlaylists) => {
    const list = targetPlaylists || userPlaylists.filter(p => selectedPlaylistsForBatch.has(p.id));
    if (!list || list.length === 0) {
      toast.error("Veuillez sélectionner au moins une playlist.");
      return;
    }

    setDownloadingMulti(true);
    setShowMultiJobModal(true);
    try {
      const res = await axios.post('/mp3/download/start-multi-playlists', {
        playlists: list.map(p => ({
          id: p.id || p.uuid,
          title: p.title,
          coverUrl: p.coverUrl,
          numberOfTracks: p.numberOfTracks
        })),
        customToken: customToken.trim() || undefined,
        bitrate,
        namingPattern
      });

      if (res.data?.multiJobId) {
        setMultiJobId(res.data.multiJobId);
        toast.success(`Téléchargement groupé lancé pour ${list.length} playlist(s) !`);
      }
    } catch (err) {
      console.error("Start multi-download error:", err);
      setDownloadingMulti(false);
      toast.error(err.response?.data?.error || "Erreur lors du lancement du téléchargement groupé.");
    }
  };

  // Multi-selection helpers
  const toggleSelectPlaylistForBatch = (id) => {
    setSelectedPlaylistsForBatch(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPlaylistsForBatch = (filteredList) => {
    const list = filteredList || userPlaylists;
    setSelectedPlaylistsForBatch(new Set(list.map(p => p.id)));
  };

  const deselectAllPlaylistsForBatch = () => {
    setSelectedPlaylistsForBatch(new Set());
  };

  // Secure Blob-based File Downloader to avoid proxy HTML interception and guarantee valid MP3 / ZIP downloads
  const downloadFileViaBlob = async (url, fallbackFilename, loadingMessage) => {
    const toastId = toast.loading(loadingMessage || "Téléchargement en cours...");
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });

      if (!response.ok) {
        let errMessage = "Erreur lors du téléchargement";
        try {
          const errData = await response.json();
          errMessage = errData.error || errData.detail || errMessage;
        } catch {
          errMessage = `Erreur HTTP ${response.status}`;
        }
        toast.dismiss(toastId);
        toast.error(errMessage);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        toast.dismiss(toastId);
        toast.error("Le serveur a renvoyé une page d'authentification ou d'erreur HTML au lieu du fichier binaire. Veuillez rafraîchir la page.");
        return;
      }

      // Determine clean filename from Content-Disposition header
      let filename = fallbackFilename;
      const disposition = response.headers.get('content-disposition');
      if (disposition) {
        const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (matchUtf8 && matchUtf8[1]) {
          filename = decodeURIComponent(matchUtf8[1]);
        } else {
          const matchRegular = disposition.match(/filename="?([^";]+)"?/i);
          if (matchRegular && matchRegular[1]) {
            filename = matchRegular[1];
          }
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      toast.dismiss(toastId);
      toast.success(`Fichier ${filename} téléchargé avec succès !`);
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Download error:", err);
      toast.error("Erreur de connexion lors de la récupération du fichier.");
    }
  };

  const handleDownloadMasterZip = (mJobId) => {
    const target = mJobId || multiJobId || multiJobStatus?.id;
    if (!target) {
      toast.error("Archive non disponible.");
      return;
    }
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/multi-zip/${target}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    downloadFileViaBlob(url, `Playlists_MP3_${target}.zip`, "Téléchargement de l'archive ZIP principale en cours...");
  };

  const handleDownloadMultiSubZip = (mJobId, playlistId) => {
    const target = mJobId || multiJobId || multiJobStatus?.id;
    if (!target || !playlistId) return;
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/multi-zip/${target}/${playlistId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    downloadFileViaBlob(url, `Playlist_${playlistId}_MP3.zip`, "Téléchargement de l'archive ZIP en cours...");
  };

  const handleAnalyzeLinkWithToken = async (forcedToken) => {
    if (!tidalUrl.trim()) return;
    setAnalyzing(true);
    setLinkProtectedNotice(null);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const activeTok = forcedToken !== undefined ? forcedToken : customToken;
      const res = await axios.post('/mp3/tidal/parse', {
        url: tidalUrl.trim(),
        customToken: activeTok.trim() || undefined
      });

      if (res.data) {
        if (res.data.tracks && res.data.tracks.length > 0) {
          setPlaylist(res.data);
          setSelectedTracks(new Set(res.data.tracks.map(t => t.id)));
          setLinkProtectedNotice(null);
          toast.success(`${res.data.tracks.length} morceaux réels importés depuis ${res.data.provider || 'la plateforme'} !`);
        } else if (res.data.isProtected || res.data.tracks?.length === 0) {
          setPlaylist(res.data);
          setLinkProtectedNotice({
            title: res.data.title || "Playlist Tidal",
            provider: res.data.provider || 'tidal',
            expectedCount: res.data.expectedCount
          });
          toast.warning("Tidal protège l'accès à cette playlist. Connectez votre compte Tidal pour débloquer les morceaux.");
        }
      }
    } catch (err) {
      console.error("Analyze error:", err);
      toast.error(err.response?.data?.error || "Impossible d'analyser le lien.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze Link (Spotify, Deezer, Tidal)
  const handleAnalyzeLink = async (e) => {
    if (e) e.preventDefault();
    if (!tidalUrl.trim()) {
      toast.error("Veuillez saisir une URL de playlist (Spotify, Deezer, Tidal).");
      return;
    }
    await handleAnalyzeLinkWithToken(customToken);
  };

  // Reset & Clear Playlist
  const handleResetPlaylist = (showToast = true) => {
    setPlaylist(null);
    setSelectedTracks(new Set());
    setTidalUrl('');
    setLinkProtectedNotice(null);
    setJobStatus(null);
    setActiveJobId(null);
    setDownloading(false);
    setEditingTrackId(null);
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
    setPlayingTrack(null);
    if (showToast) {
      toast.success("Playlist réinitialisée ! Vous pouvez en charger une nouvelle.");
    }
  };

  const handleCreateEmptyPlaylist = () => {
    const newId = `custom_${Date.now()}`;
    const initialTrack = {
      id: newId,
      trackNumber: 1,
      title: "Nouveau Morceau",
      artist: "Artiste",
      album: "Nouvelle Playlist",
      duration: 180,
      year: new Date().getFullYear(),
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      status: "pending"
    };
    setPlaylist({
      title: "Nouvelle Playlist Manuelle",
      description: "Playlist créée manuellement",
      creator: "DJ",
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      tracks: [initialTrack]
    });
    setSelectedTracks(new Set([newId]));
    setEditingTrackId(newId);
    toast.success("Nouvelle playlist vide créée. Ajoutez ou éditez vos morceaux !");
  };

  // Track manipulation (Edit, Add, Delete)
  const handleUpdateTrack = (id, field, value) => {
    setPlaylist(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tracks: (prev.tracks || []).map(t => t.id === id ? { ...t, [field]: value } : t)
      };
    });
  };

  const handleAddTrack = () => {
    if (!playlist) {
      handleCreateEmptyPlaylist();
      return;
    }
    const newId = `custom_${Date.now()}`;
    const newTrack = {
      id: newId,
      trackNumber: (playlist.tracks?.length || 0) + 1,
      title: "Nouveau Morceau",
      artist: "Artiste",
      album: playlist.title || "Playlist",
      duration: 200,
      year: new Date().getFullYear(),
      coverUrl: playlist.coverUrl,
      status: "pending"
    };

    setPlaylist(prev => ({
      ...prev,
      tracks: [...(prev.tracks || []), newTrack]
    }));
    setSelectedTracks(prev => new Set([...prev, newId]));
    setEditingTrackId(newId);
  };

  const handleDeleteTrack = (id) => {
    setPlaylist(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== id)
    }));
    setSelectedTracks(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Toggle selection
  const toggleTrack = (id) => {
    const next = new Set(selectedTracks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTracks(next);
  };

  const selectAllTracks = () => {
    if (!playlist?.tracks) return;
    setSelectedTracks(new Set(playlist.tracks.map(t => t.id)));
  };

  const deselectAllTracks = () => {
    setSelectedTracks(new Set());
  };

  const handleSearchTrack = async (e) => {
    if (e) e.preventDefault();
    if (!trackSearchQuery.trim()) return;
    setSearchingTrack(true);
    try {
      const res = await axios.get(`/mp3/search-track?q=${encodeURIComponent(trackSearchQuery.trim())}`);
      setTrackSearchResults(res.data?.results || []);
    } catch (err) {
      console.error("Track search error:", err);
      toast.error("Erreur lors de la recherche du morceau");
    } finally {
      setSearchingTrack(false);
    }
  };

  const handleAddSearchResult = (track) => {
    const newId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTrack = {
      ...track,
      id: newId,
      trackNumber: (playlist?.tracks?.length || 0) + 1,
      status: 'pending'
    };
    setPlaylist(prev => {
      if (!prev) {
        return {
          title: "Ma Playlist",
          description: "Playlist MP3",
          tracks: [newTrack]
        };
      }
      return {
        ...prev,
        tracks: [...(prev.tracks || []), newTrack]
      };
    });
    setSelectedTracks(prev => new Set([...prev, newId]));
    toast.success(`« ${track.title} » ajouté à la playlist`);
  };
  const handleStartDownload = async () => {
    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
      toast.error("Aucune playlist chargée.");
      return;
    }

    const tracksToDownload = playlist.tracks.filter(t => selectedTracks.has(t.id));
    if (tracksToDownload.length === 0) {
      toast.error("Veuillez sélectionner au moins un morceau à télécharger.");
      return;
    }

    setDownloading(true);
    try {
      const activeTok = customToken?.trim() || localStorage.getItem('tidal_custom_token')?.trim() || undefined;
      const res = await axios.post('/mp3/download/start-batch', {
        playlistTitle: playlist.title || 'Playlist Tidal',
        playlistId: playlist.id || `pl_${Date.now()}`,
        tracks: tracksToDownload,
        bitrate: bitrate,
        namingPattern: namingPattern,
        customToken: activeTok
      });

      if (res.data.jobId) {
        setActiveJobId(res.data.jobId);
        toast.success(`Téléchargement lancé pour ${tracksToDownload.length} morceaux en MP3 ${bitrate} !`);
      }
    } catch (err) {
      console.error("Start download error:", err);
      setDownloading(false);
      toast.error(err.response?.data?.error || "Erreur lors du lancement du téléchargement.");
    }
  };

  // Single Track Download
  const handleDownloadSingle = (trackId) => {
    const jobId = activeJobId || jobStatus?.id;
    if (!jobId) {
      toast.error("Veuillez lancer le téléchargement d'abord.");
      return;
    }
    const track = jobStatus?.tracks?.find(t => String(t.id) === String(trackId));
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/file/${jobId}/${trackId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const fallback = track?.filename || `track_${trackId}.mp3`;
    downloadFileViaBlob(url, fallback, `Téléchargement de ${fallback}...`);
  };

  // Download Complete ZIP (Exclusively MP3 audio files)
  const handleDownloadZip = (jobId, explicitTitle) => {
    const targetJob = jobId || activeJobId || jobStatus?.id;
    if (!targetJob) {
      toast.error("Archive ZIP non disponible.");
      return;
    }
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/zip/${targetJob}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const libItem = library.find(l => l.id === targetJob);
    const title = explicitTitle || libItem?.playlistTitle || jobStatus?.playlistTitle || 'Playlist';
    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fallback = `${cleanTitle}_MP3_${jobStatus?.bitrate || libItem?.bitrate || '320k'}.zip`;
    downloadFileViaBlob(url, fallback, "Téléchargement de l'archive ZIP MP3 en cours...");
  };

  // Download Standalone DJ M3U8 Playlist file
  const handleDownloadM3u = (jobId, explicitTitle) => {
    const targetJob = jobId || activeJobId || jobStatus?.id;
    if (!targetJob) {
      toast.error("Fichier M3U8 non disponible.");
      return;
    }
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/m3u/${targetJob}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const libItem = library.find(l => l.id === targetJob);
    const title = explicitTitle || libItem?.playlistTitle || jobStatus?.playlistTitle || 'Playlist';
    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fallback = `${cleanTitle}.m3u8`;
    downloadFileViaBlob(url, fallback, "Téléchargement de la playlist M3U8...");
  };

  // Audio Playback
  const handlePlayAudio = (track) => {
    const jobId = activeJobId || jobStatus?.id;
    if (!jobId || track.status !== 'completed') {
      toast.info("Le morceau doit être téléchargé pour pouvoir être écouté.");
      return;
    }

    if (playingTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setPlayingTrack(track);
    setIsPlaying(true);
    if (audioRef.current) {
      const token = localStorage.getItem('access_token');
      audioRef.current.src = `${API_BASE_URL}/api/mp3/download/stream/${jobId}/${track.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      audioRef.current.volume = isMuted ? 0 : playerVolume;
      audioRef.current.play().catch(e => console.log("Play error:", e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlayerProgress(audioRef.current.currentTime);
      setPlayerDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setPlayerProgress(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setPlayerVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (vol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = playerVolume;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const handleDeleteLibraryItem = async (jobId) => {
    if (!window.confirm("Supprimer cette archive et ses fichiers MP3 ?")) return;
    try {
      await axios.delete(`/mp3/library/${jobId}`);
      toast.success("Téléchargement supprimé");
      loadLibrary();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const completedCount = jobStatus?.completedTracks || 0;
  const totalCount = jobStatus?.totalTracks || selectedTracks.size || 1;
  const progressPercent = Math.min(100, Math.round((completedCount / totalCount) * 100)) || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Hidden Audio Player Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => console.log("Audio tag error:", e)}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Playlist MP3</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'library'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Disc3 className="w-4 h-4" />
              <span>Archives Téléchargées (.ZIP)</span>
              {library.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'library' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {library.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Paramètres Audio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTidalTokenInput(customToken || '');
                setShowTidalModal(true);
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                customToken
                  ? 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Key className={`w-4 h-4 ${customToken ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{customToken ? 'Compte Tidal Connecté' : 'Connexion Compte Tidal'}</span>
              {customToken ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse ml-0.5" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Requis pour privé</span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Headphones className="w-4 h-4" />
            <span>Moteur Qualité Pro : MP3 320 kbps ID3v2</span>
          </div>
        </div>

        {/* TAB 1: IMPORT & DOWNLOAD */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            
            {/* Active Playlist Banner with Quick Reset */}
            {playlist && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <ListMusic className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Playlist active en atelier : <strong className="font-bold">{playlist.title}</strong> ({playlist.tracks?.length || 0} titres)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPlaylist()}
                    className="h-7 px-2.5 text-rose-700 bg-white border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1 text-rose-600" />
                    Fermer l'atelier
                  </Button>
                </div>
              </div>
            )}

            {/* SOURCE SELECTOR BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportSource('tidal_library')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    importSource === 'tidal_library'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Disc3 className="w-4 h-4 text-cyan-400" />
                  <span>Ma Bibliothèque Tidal</span>
                  {userPlaylists.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-500/25 text-cyan-300 text-[10px] font-extrabold">
                      {userPlaylists.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setImportSource('link')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    importSource === 'link'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <LinkIcon className="w-4 h-4 text-emerald-400" />
                  <span>Lien Direct (Spotify, Deezer, Tidal)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-amber-500" />
                  <span>Recherche par Titre</span>
                </button>
              </div>

              {/* Account Quick Status */}
              {customToken ? (
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Compte : <strong>{tidalAccountInfo?.userId || 'Connecté'}</strong></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadUserPlaylists()}
                    disabled={loadingUserPlaylists}
                    className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                    title="Actualiser la liste de mes playlists Tidal"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUserPlaylists ? 'animate-spin' : ''}`} />
                    <span className="ml-1 hidden sm:inline">Actualiser</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowTidalModal(true)}
                  className="h-8 px-3 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl"
                >
                  <Key className="w-3.5 h-3.5 mr-1.5" />
                  Connecter mon compte Tidal
                </Button>
              )}
            </div>

            {/* SOURCE 1: TIDAL ACCOUNT LIBRARY */}
            {importSource === 'tidal_library' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                {!customToken ? (
                  /* Not connected card */
                  <div className="text-center py-10 px-4 space-y-4 max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto">
                      <Disc3 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Connectez votre compte Tidal</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Accédez automatiquement à l'ensemble de vos playlists personnelles et titres favoris sans avoir à copier d'URL. Vous pourrez choisir les playlists à télécharger une par une ou toutes d'un coup !
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => setShowTidalModal(true)}
                        className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white text-xs h-10 px-5 font-bold rounded-xl shadow-sm"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Connecter mon compte Tidal
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setImportSource('link')}
                        className="w-full sm:w-auto text-xs h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                      >
                        <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                        Utiliser un lien direct à la place
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Connected Library View */
                  <div className="space-y-4">
                    {/* Header Controls & Batch Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">Playlists de votre Compte Tidal</h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-xs font-bold border border-cyan-200">
                            {userPlaylists.length} playlist{userPlaylists.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sélectionnez les playlists que vous souhaitez télécharger en MP3 320 kbps, ou lancez un téléchargement complet.
                        </p>
                      </div>

                      {/* Filter Search Input */}
                      <div className="relative w-full lg:w-72">
                        <Input
                          type="text"
                          value={playlistSearchFilter}
                          onChange={(e) => setPlaylistSearchFilter(e.target.value)}
                          placeholder="Filtrer mes playlists..."
                          className="h-9 pl-9 pr-8 text-xs rounded-xl border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        {playlistSearchFilter && (
                          <button
                            type="button"
                            onClick={() => setPlaylistSearchFilter('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Batch Actions Bar */}
                    {userPlaylists.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = userPlaylists.filter(pl => {
                                if (!playlistSearchFilter.trim()) return true;
                                const q = playlistSearchFilter.toLowerCase();
                                return (pl.title && pl.title.toLowerCase().includes(q)) || (pl.creator && pl.creator.toLowerCase().includes(q));
                              });
                              if (selectedPlaylistsForBatch.size === filtered.length) {
                                deselectAllPlaylistsForBatch();
                              } else {
                                selectAllPlaylistsForBatch(filtered);
                              }
                            }}
                            className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
                          >
                            {selectedPlaylistsForBatch.size > 0 && selectedPlaylistsForBatch.size === userPlaylists.length ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                              {selectedPlaylistsForBatch.size === userPlaylists.length ? "Tout désélectionner" : "Tout sélectionner"}
                            </span>
                          </button>

                          {selectedPlaylistsForBatch.size > 0 && (
                            <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-md text-[11px]">
                              {selectedPlaylistsForBatch.size} sélectionnée{selectedPlaylistsForBatch.size > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Batch Download Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedPlaylistsForBatch.size > 0 && (
                            <Button
                              type="button"
                              onClick={() => handleStartMultiDownload()}
                              disabled={downloadingMulti}
                              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Télécharger la sélection ({selectedPlaylistsForBatch.size})
                            </Button>
                          )}

                          <Button
                            type="button"
                            onClick={() => handleStartMultiDownload(userPlaylists)}
                            disabled={downloadingMulti}
                            className="h-8 px-3.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs"
                          >
                            <FolderArchive className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                            Télécharger TOUTES mes playlists ({userPlaylists.length})
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Playlists Grid */}
                    {loadingUserPlaylists ? (
                      <div className="py-14 text-center space-y-3">
                        <RefreshCw className="w-7 h-7 animate-spin text-cyan-600 mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">Récupération des playlists de votre compte Tidal...</p>
                      </div>
                    ) : userPlaylists.length === 0 ? (
                      <div className="py-10 text-center space-y-3">
                        <Disc3 className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">Aucune playlist trouvée sur ce compte</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Créez ou ajoutez des playlists dans votre application Tidal puis cliquez sur Actualiser.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                        {userPlaylists
                          .filter(pl => {
                            if (!playlistSearchFilter.trim()) return true;
                            const q = playlistSearchFilter.toLowerCase();
                            return (pl.title && pl.title.toLowerCase().includes(q)) || (pl.creator && pl.creator.toLowerCase().includes(q));
                          })
                          .map((pl) => {
                            const isSelected = selectedPlaylistsForBatch.has(pl.id);
                            return (
                              <div
                                key={pl.id}
                                className={`group relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-cyan-50/40 border-cyan-300 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                                }`}
                              >
                                <div className="space-y-3">
                                  {/* Top Row: Selection Checkbox & Track count badge */}
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleSelectPlaylistForBatch(pl.id)}
                                      className="p-1 -ml-1 text-slate-400 hover:text-slate-600"
                                      title={isSelected ? "Désélectionner" : "Sélectionner pour téléchargement groupé"}
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-5 h-5 text-cyan-600" />
                                      ) : (
                                        <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                                      )}
                                    </button>

                                    <div className="flex items-center gap-1">
                                      {pl.isFavorites && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                                          ★ Favoris
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                                        {pl.numberOfTracks || 0} titres
                                      </span>
                                    </div>
                                  </div>

                                  {/* Playlist Info with Cover */}
                                  <div className="flex items-center gap-3">
                                    {pl.coverUrl ? (
                                      <img
                                        src={pl.coverUrl}
                                        alt={pl.title}
                                        className="w-14 h-14 rounded-xl object-cover shadow-2xs border border-slate-100 flex-shrink-0"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0">
                                        <Music className="w-6 h-6 text-white/80" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-sm text-slate-900 truncate" title={pl.title}>
                                        {pl.title}
                                      </h4>
                                      <p className="text-xs text-slate-500 truncate">
                                        {pl.creator || "Ma Playlist Tidal"}
                                      </p>
                                      {pl.duration > 0 && (
                                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                          <Clock className="w-3 h-3" />
                                          {Math.round(pl.duration / 60)} min
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions on this playlist */}
                                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleLoadTidalPlaylist(pl)}
                                    disabled={analyzing}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs h-8 rounded-xl shadow-none"
                                    title="Ouvrir les morceaux dans l'atelier pour écouter ou personnaliser"
                                  >
                                    <Sliders className="w-3.5 h-3.5 mr-1 text-slate-600" />
                                    Ouvrir
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleQuickDownloadTidalPlaylist(pl)}
                                    disabled={downloading || downloadingMulti}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl shadow-xs"
                                    title="Télécharger directement cette playlist en MP3"
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Télécharger
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SOURCE 2: EXCLUSIVE URL IMPORT */}
            {importSource === 'link' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <form onSubmit={handleAnalyzeLink} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-slate-800">
                        Lien URL de la Playlist ou Album (Spotify, Deezer, Tidal)
                      </label>
                      <span className="text-xs text-slate-400">Spotify & Deezer supportent l'extraction 100% directe</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          value={tidalUrl}
                          onChange={(e) => setTidalUrl(e.target.value)}
                          placeholder="https://open.spotify.com/playlist/... ou https://www.deezer.com/playlist/... ou https://tidal.com/playlist/..."
                          className="h-12 pl-10 pr-10 text-sm rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                        {tidalUrl && (
                          <button
                            type="button"
                            onClick={() => { setTidalUrl(''); setLinkProtectedNotice(null); }}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                            title="Effacer l'URL"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={analyzing || !tidalUrl.trim()}
                        className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Analyse de la playlist...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Charger la Playlist
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Tidal Protected Explanation Banner */}
                    {linkProtectedNotice && (
                      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div className="space-y-2 text-xs text-amber-900">
                            <div className="font-bold text-sm text-amber-950">
                              Playlist Tidal privée détectée : « {linkProtectedNotice.title} » {linkProtectedNotice.expectedCount ? `(${linkProtectedNotice.expectedCount} morceaux réels)` : ''}
                            </div>
                            <p className="leading-relaxed">
                              Tidal bloque l'accès public aux morceaux des playlists créées par les utilisateurs sans session active connectée.
                              Pour débloquer directement tous les morceaux réels de votre playlist :
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setTidalTokenInput(customToken || '');
                                  setShowTidalModal(true);
                                }}
                                className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs h-8 px-3.5 shadow-xs"
                              >
                                <Key className="w-3.5 h-3.5 mr-1.5" />
                                {customToken ? "Vérifier mon compte Tidal" : "Connecter mon compte Tidal"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowSearchModal(true)}
                                className="bg-white border-amber-300 hover:bg-amber-100 text-slate-800 font-semibold text-xs h-8 px-3"
                              >
                                <Search className="w-3.5 h-3.5 mr-1 text-amber-700" />
                                Rechercher & Ajouter des titres
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Example & Reset Helper */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Exemples réels :</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTidalUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
                        >
                          Spotify (Top Hits)
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTidalUrl('https://www.deezer.com/playlist/908622995');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
                        >
                          Deezer (En mode 60)
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* PLAYLIST WORKBENCH / TRACKS LIST */}
            {playlist ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Playlist Header Banner */}
                <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center">
                    <img
                      src={playlist.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"; }}
                    />
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      PLAYLIST MP3 320 KBPS
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <input
                        type="text"
                        value={playlist.title}
                        onChange={(e) => setPlaylist({ ...playlist, title: e.target.value })}
                        className="text-2xl sm:text-3xl font-bold tracking-tight text-white bg-transparent border-b border-transparent hover:border-white/40 focus:border-emerald-400 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-sm text-slate-300">{playlist.description || "Extraction fidèle des morceaux & encodage haute résolution"}</p>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ListMusic className="w-4 h-4 text-emerald-400" />
                        <strong>{playlist.tracks?.length || 0}</strong> morceaux
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Disc3 className="w-4 h-4 text-emerald-400" />
                        Qualité : <strong>{bitrate.toUpperCase()} MP3</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileArchive className="w-4 h-4 text-emerald-400" />
                        Taille estimée : <strong>~{Math.round((playlist.tracks?.length || 0) * 8.5)} Mo</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex flex-col gap-2.5 w-full md:w-auto">
                    <Button
                      onClick={handleStartDownload}
                      disabled={downloading || selectedTracks.size === 0}
                      className="w-full md:w-auto h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md text-sm transition-all"
                    >
                      {downloading ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Téléchargement ({completedCount}/{totalCount})...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-2" />
                          Télécharger la Playlist ({selectedTracks.size} morceaux)
                        </>
                      )}
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {(jobStatus?.zipReady || jobStatus?.status === 'completed') && (
                        <>
                          <Button
                            type="button"
                            onClick={() => handleDownloadZip()}
                            className="flex-1 min-w-[170px] h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center justify-center gap-1.5 animate-bounce"
                            title="Télécharger l'archive ZIP contenant tous vos morceaux en MP3 320 kbps"
                          >
                            <FileArchive className="w-4 h-4 mr-1 text-white" />
                            Télécharger les MP3 (.ZIP)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDownloadM3u()}
                            className="h-10 px-3 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1"
                            title="Exporter la playlist M3U8 pour logiciels DJ (Rekordbox, VirtualDJ, Serato)"
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                            M3U8
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleResetPlaylist()}
                        className="flex-1 h-10 px-3 bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium rounded-xl text-xs backdrop-blur-sm transition-all flex items-center justify-center gap-1.5"
                        title="Vider et réinitialiser la playlist pour en rentrer une autre"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-white/80" />
                        Réinitialiser
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (when downloading or completed) */}
                {(downloading || jobStatus) && (
                  <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1.5">
                      <span className="flex items-center gap-2">
                        {jobStatus?.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Traitement terminé ! Morceaux encodés en MP3 320k avec jaquettes et tags ID3v2.
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                            Téléchargement & encodage en cours : {completedCount} sur {totalCount} morceaux prêts
                          </>
                        )}
                      </span>
                      <span className="font-bold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-emerald-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Controls Bar */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center space-x-2">
                    <button
                      type="button"
                      onClick={selectAllTracks}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded bg-emerald-100/60"
                    >
                      Tout sélectionner ({playlist.tracks?.length})
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllTracks}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-200/60"
                    >
                      Désélectionner
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTrack}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded bg-white border border-slate-200 shadow-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter manuellement
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSearchModal(true)}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-emerald-600" />
                      Rechercher un morceau
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPlaylist()}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors"
                      title="Remettre à zéro et vider la playlist"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      Réinitialiser la playlist
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-600">
                    <span className="font-medium">
                      Sélectionnés pour le ZIP : <strong>{selectedTracks.size}</strong> / {playlist.tracks?.length}
                    </span>
                  </div>
                </div>

                {/* Tracks Table */}
                <div className="divide-y divide-slate-100 overflow-x-auto max-h-[600px] overflow-y-auto">
                  {playlist.tracks && playlist.tracks.length > 0 ? (
                    playlist.tracks.map((track, idx) => {
                      const isSelected = selectedTracks.has(track.id);
                      const jobTrack = jobStatus?.tracks?.find(t => String(t.id) === String(track.id));
                      const trackState = jobTrack?.status || track.status || 'pending';
                      const isThisPlaying = playingTrack?.id === track.id && isPlaying;
                      const isEditing = editingTrackId === track.id;

                      return (
                        <div
                          key={track.id || idx}
                          className={`flex items-center px-4 sm:px-6 py-3.5 transition-colors ${
                            isSelected ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="mr-3 flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTrack(track.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                            />
                          </div>

                          {/* Index */}
                          <span className="w-7 text-xs font-bold text-slate-400 text-center">
                            {String(track.trackNumber || idx + 1).padStart(2, '0')}
                          </span>

                          {/* Cover Thumbnail / Play Button */}
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-900 mr-3.5 border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
                            <img
                              src={track.coverUrl || playlist.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"; }}
                            />
                            {trackState === 'completed' && (
                              <button
                                onClick={() => handlePlayAudio(jobTrack || track)}
                                className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all"
                                title="Écouter le MP3"
                              >
                                {isThisPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                              </button>
                            )}
                          </div>

                          {/* Title, Artist, Album with Inline Editing */}
                          <div className="flex-1 min-w-0 pr-4">
                            {isEditing ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  value={track.title}
                                  onChange={(e) => handleUpdateTrack(track.id, 'title', e.target.value)}
                                  placeholder="Titre de la chanson"
                                  className="h-8 text-xs font-bold"
                                />
                                <Input
                                  value={track.artist}
                                  onChange={(e) => handleUpdateTrack(track.id, 'artist', e.target.value)}
                                  placeholder="Artiste(s)"
                                  className="h-8 text-xs"
                                />
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={track.album}
                                    onChange={(e) => handleUpdateTrack(track.id, 'album', e.target.value)}
                                    placeholder="Album"
                                    className="h-8 text-xs"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => setEditingTrackId(null)}
                                    className="h-8 px-2 bg-emerald-600 text-white text-xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {track.title}
                                  </p>
                                  <button
                                    onClick={() => setEditingTrackId(track.id)}
                                    className="text-slate-300 hover:text-slate-600 p-0.5 rounded transition"
                                    title="Modifier le titre / artiste"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  <strong className="text-slate-700">{track.artist}</strong> • <span className="text-slate-400">{track.album || "Album Tidal"}</span>
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Year / Duration */}
                          <div className="hidden sm:block text-right pr-4">
                            <span className="text-xs text-slate-500 font-mono font-medium">
                              {formatSeconds(track.duration)}
                            </span>
                            {track.year && (
                              <p className="text-[10px] text-slate-400 font-medium">{track.year}</p>
                            )}
                          </div>

                          {/* Status Badge & Actions */}
                          <div className="flex items-center space-x-2">
                            {trackState === 'completed' && (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  320k Prêt
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadSingle(track.id)}
                                  className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Télécharger ce morceau en MP3"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {trackState === 'downloading' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Extraction 320k...
                              </span>
                            )}

                            {trackState === 'error' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800" title={jobTrack?.error}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Échec
                              </span>
                            )}

                            {trackState === 'pending' && (
                              <button
                                onClick={() => handleDeleteTrack(track.id)}
                                className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                                title="Supprimer de la liste"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center bg-slate-50/50">
                      {playlist.isProtected ? (
                        <div className="max-w-lg mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
                            <ShieldAlert className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Playlist Tidal privée : « {playlist.title} » {playlist.expectedCount ? `(${playlist.expectedCount} titres)` : ''}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Tidal bloque la lecture des morceaux des playlists personnelles sans connexion à votre compte.
                            Vous pouvez ajouter des morceaux manuellement ou essayer un lien de playlist publique (Deezer, Spotify, ou album Tidal direct).
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                            <Button
                              type="button"
                              onClick={() => setShowSearchModal(true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-xs"
                            >
                              <Search className="w-4 h-4 mr-1.5" />
                              Rechercher des morceaux à ajouter
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-sm">
                          Aucun morceau dans la liste. Collez l'URL d'une playlist ci-dessus ou recherchez des morceaux.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <ListMusic className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Aucune playlist en cours (Remise à zéro active)</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Collez l'URL d'une playlist ou d'un album (Spotify, Deezer, Tidal) ci-dessus pour préparer vos téléchargements MP3 320 kbps.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateEmptyPlaylist}
                  className="text-xs h-9 px-4 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Créer une playlist manuelle
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIBRARY / DOWNLOADED ARCHIVES */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Archives et Playlists Téléchargées</h2>
                <p className="text-xs text-slate-500">Retrouvez et téléchargez vos archives .ZIP et fichiers MP3 320 kbps</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLibrary}
                disabled={loadingLibrary}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingLibrary ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {loadingLibrary ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-sm text-slate-500">Chargement de votre bibliothèque...</p>
              </div>
            ) : library.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <FileArchive className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Aucun téléchargement enregistré</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vos playlists téléchargées et leurs archives ZIP apparaîtront ici pour un accès direct.
                </p>
                <Button
                  onClick={() => setActiveTab('import')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs mt-2"
                >
                  Télécharger ma première playlist
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {library.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                            <Disc3 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{item.playlistTitle}</h3>
                            <p className="text-xs text-slate-500">
                              {new Date(item.startedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteLibraryItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                          title="Supprimer l'archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-4 my-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <ListMusic className="w-3.5 h-3.5 text-emerald-600" />
                          <strong>{item.completedTracks || item.totalTracks}</strong> pistes
                        </span>
                        <span className="flex items-center gap-1">
                          <Disc3 className="w-3.5 h-3.5 text-emerald-600" />
                          <strong>{item.bitrate || '320k'}</strong>
                        </span>
                        {item.zipSize > 0 && (
                          <span className="flex items-center gap-1">
                            <FileArchive className="w-3.5 h-3.5 text-emerald-600" />
                            <strong>{Math.round(item.zipSize / (1024 * 1024))} Mo</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        onClick={() => handleDownloadZip(item.id, item.playlistTitle)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                      >
                        <FileArchive className="w-3.5 h-3.5 mr-1.5" />
                        Télécharger ZIP Complet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Paramètres d'Encodage & Nommage DJ</h2>
              <p className="text-xs text-slate-500">Configurez la qualité des fichiers MP3 et la convention de nommage des fichiers</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Débit binaire MP3 (Qualité audio)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: '320k', label: '320 kbps (CBR)', desc: 'Qualité DJ Maximale (Recommandé)' },
                    { val: '256k', label: '256 kbps', desc: 'Haute qualité & taille optimisée' },
                    { val: '192k', label: '192 kbps', desc: 'Taille minimale standard' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setBitrate(opt.val)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        bitrate === opt.val
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Format de nommage des fichiers MP3
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'number_artist_title', example: '01. Daft Punk - One More Time.mp3', label: 'Numéro + Artiste - Titre (Ordre de la playlist)' },
                    { id: 'artist_title', example: 'Daft Punk - One More Time.mp3', label: 'Artiste - Titre' },
                    { id: 'title_artist', example: 'One More Time - Daft Punk.mp3', label: 'Titre - Artiste' }
                  ].map(pattern => (
                    <button
                      key={pattern.id}
                      type="button"
                      onClick={() => setNamingPattern(pattern.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        namingPattern === pattern.id
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{pattern.label}</div>
                        <div className="text-[11px] font-mono text-emerald-700 mt-0.5">{pattern.example}</div>
                      </div>
                      {namingPattern === pattern.id && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tidal Account Connection Section */}
              <div className="pt-5 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-sky-600" />
                    <label className="text-sm font-semibold text-slate-800">
                      Compte & Authentification Tidal
                    </label>
                  </div>
                  {customToken ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Session Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                      Non connecté
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Permet de charger directement les morceaux de vos <strong>playlists Tidal personnelles privées</strong>.
                  Sans compte connecté, Tidal bloque l'accès aux morceaux des playlists utilisateur.
                </p>

                {tidalAccountInfo && (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Compte connecté : {tidalAccountInfo.userId}</p>
                      <p className="text-[11px] text-sky-700">Région : {tidalAccountInfo.countryCode || 'FR'}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectTidal}
                      className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Déconnecter
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => {
                      setTidalTokenInput(customToken || '');
                      setShowTidalModal(true);
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    {customToken ? "Modifier / Re-vérifier mon compte Tidal" : "Connecter mon compte Tidal"}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Button
                  onClick={saveSettings}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Enregistrer les paramètres
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING BOTTOM AUDIO PLAYER */}
      {playingTrack && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white px-4 py-3 z-50 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Track Info Left */}
            <div className="flex items-center space-x-3 w-1/4 min-w-0">
              <img
                src={playingTrack.coverUrl || playlist?.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"}
                alt={playingTrack.title}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{playingTrack.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{playingTrack.artist}</p>
              </div>
            </div>

            {/* Playback Controls Center */}
            <div className="flex-1 max-w-md flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handlePlayAudio(playingTrack)}
                  className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>

              <div className="w-full flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                <span>{formatSeconds(playerProgress)}</span>
                <input
                  type="range"
                  min={0}
                  max={playerDuration || 100}
                  value={playerProgress}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span>{formatSeconds(playerDuration)}</span>
              </div>
            </div>

            {/* Volume & Close */}
            <div className="flex items-center space-x-3 justify-end w-1/4">
              <div className="hidden sm:flex items-center space-x-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white">
                  {isMuted || playerVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : playerVolume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  audioRef.current?.pause();
                  setPlayingTrack(null);
                  setIsPlaying(false);
                }}
                className="text-slate-400 hover:text-white p-1"
                title="Fermer le lecteur"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH TRACK MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rechercher & Ajouter un morceau</h3>
                  <p className="text-xs text-slate-500">Trouvez instantanément des morceaux officiels et ajoutez-les à la playlist</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowSearchModal(false); setTrackSearchResults([]); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchTrack} className="flex gap-2">
              <Input
                type="text"
                autoFocus
                value={trackSearchQuery}
                onChange={(e) => setTrackSearchQuery(e.target.value)}
                placeholder="Titre, artiste (ex: Daft Punk One More Time, Slimane...)"
                className="h-11 text-sm rounded-xl"
              />
              <Button
                type="submit"
                disabled={searchingTrack || !trackSearchQuery.trim()}
                className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0"
              >
                {searchingTrack ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Chercher"}
              </Button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1">
              {trackSearchResults.length > 0 ? (
                trackSearchResults.map((track) => (
                  <div
                    key={track.id}
                    className="pt-2 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={track.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60"}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{track.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{track.artist} {track.album ? `• ${track.album}` : ''}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddSearchResult(track)}
                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                ))
              ) : trackSearchQuery && !searchingTrack ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Aucun résultat trouvé pour « {trackSearchQuery} ». Essayez d'autres mots-clés.
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tapez le nom d'un morceau ou d'un artiste ci-dessus pour rechercher.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TIDAL AUTHENTICATION MODAL */}
      {showTidalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connexion au Compte Tidal</h3>
                  <p className="text-xs text-slate-500">Accédez directement à vos playlists privées sans copier de token</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTidalModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status if already connected */}
            {customToken && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Session Tidal active et opérationnelle
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold">
                    Connecté
                  </span>
                </div>
                {tidalAccountInfo && (
                  <div className="text-xs text-emerald-800 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>Identifiant : <strong>{tidalAccountInfo.userId}</strong></span>
                    <span>Pays : <strong>{tidalAccountInfo.countryCode}</strong></span>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadUserPlaylists(customToken);
                      toast.success("Playlists rechargées !");
                    }}
                    className="text-xs h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Actualiser mes playlists
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectTidal}
                    className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg"
                  >
                    Se déconnecter
                  </Button>
                </div>
              </div>
            )}

            {/* MÉTHODE 1: CONNEXION EN 1 CLIC (GOOGLE / TIDAL SSO) */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <LogIn className="w-4 h-4 text-sky-400" />
                  <span>Connexion en 1 clic (via Google / Tidal)</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full">
                  Automatique
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connectez-vous directement via la fenêtre sécurisée de Tidal. Vous pouvez cliquer sur <strong>« Continuer avec Google »</strong> comme d'habitude. L'application récupère automatiquement votre session sans manipulation manuelle !
              </p>

              <div className="pt-1">
                <Button
                  type="button"
                  onClick={handleStartTidalOAuth}
                  disabled={startingOAuth}
                  className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold h-11 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {startingOAuth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Ouverture de Tidal en cours...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-slate-950" />
                      <span>Se connecter à Tidal avec Google</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Developer / Setup toggle if OAuth credentials not yet in .env */}
              {!oauthStatus.configured && (
                <div className="pt-2 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setShowOAuthSetupGuide(!showOAuthSetupGuide)}
                    className="w-full flex items-center justify-between text-[11px] text-sky-300 hover:text-sky-200 transition-colors py-1"
                  >
                    <span>Configuration de l'accès direct Tidal OAuth (2 min)</span>
                    {showOAuthSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showOAuthSetupGuide && (
                    <div className="mt-2.5 p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-150">
                      <p className="leading-relaxed">
                        Pour lier le bouton à votre compte, Tidal requiert un identifiant d'application gratuit sur leur portail développeur :
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed text-[11px]">
                        <li>
                          Ouvrez <a href="https://developer.tidal.com" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold inline-flex items-center gap-0.5">developer.tidal.com <ExternalLink className="w-3 h-3" /></a> et créez une application.
                        </li>
                        <li>
                          Renseignez comme <strong>Redirect URI</strong> l'adresse exacte suivante :
                        </li>
                      </ol>

                      <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-700">
                        <code className="text-[11px] font-mono text-sky-300 truncate flex-1 select-all">
                          {oauthStatus.redirectUri || `${window.location.origin}/api/mp3/tidal/callback`}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            const uri = oauthStatus.redirectUri || `${window.location.origin}/api/mp3/tidal/callback`;
                            navigator.clipboard.writeText(uri);
                            setCopiedRedirectUri(true);
                            toast.success("URL de redirection copiée !");
                            setTimeout(() => setCopiedRedirectUri(false), 2500);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 shrink-0"
                        >
                          {copiedRedirectUri ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedRedirectUri ? "Copié !" : "Copier"}</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        3. Ajoutez ensuite le <code className="text-sky-300 font-mono">TIDAL_CLIENT_ID</code> obtenu dans les paramètres d'environnement pour activer la connexion instantanée.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MÉTHODE 2: ASTUCE ZÉRO TOKEN & ZÉRO CONNEXION (100% IMMÉDIAT) */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Astuce : Téléchargez sans aucun compte ni token !
                </span>
                <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                  100% Direct
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Si vous souhaitez télécharger les MP3 d'une playlist Tidal spécifique, <strong>vous n'avez pas besoin de connecter votre compte</strong> :
              </p>
              <ul className="list-disc list-inside text-xs text-emerald-900/90 space-y-1 pl-1">
                <li>Dans Tidal, cliquez sur <strong>Partager ➜ Copier le lien</strong> de votre playlist.</li>
                <li>Collez simplement ce lien dans l'onglet <strong>Lien URL</strong> de cette application.</li>
              </ul>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTidalModal(false);
                    setImportSource('link');
                  }}
                  className="text-xs font-semibold h-8 bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl shadow-2xs"
                >
                  <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Utiliser un lien Tidal sans connexion
                </Button>
              </div>
            </div>

            {/* MÉTHODE 3 (OPTIONNELLE): SAISIE MANUELLE DU TOKEN */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowManualTokenSection(!showManualTokenSection)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Option alternative : Saisie manuelle d'un token de session
                </span>
                {showManualTokenSection ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showManualTokenSection && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Token de session Tidal (copié depuis listen.tidal.com)
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={tidalTokenInput}
                        onChange={(e) => setTidalTokenInput(e.target.value)}
                        placeholder="Collez ici votre token (ex: eyJhbGciOiJIUzI1Ni...)"
                        className="font-mono text-xs h-10 pr-20 rounded-xl border-slate-300 bg-white"
                      />
                      {navigator.clipboard && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setTidalTokenInput(text.trim());
                                toast.success("Token collé depuis le presse-papier !");
                              }
                            } catch {
                              toast.error("Impossible de lire le presse-papier.");
                            }
                          }}
                          className="absolute right-2 top-1.5 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Coller
                        </button>
                      )}
                    </div>

                    <div className="pt-1">
                      <Button
                        type="button"
                        disabled={verifyingTidal || !tidalTokenInput.trim()}
                        onClick={() => handleVerifyAndSaveTidalToken(tidalTokenInput)}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-9 rounded-xl text-xs"
                      >
                        {verifyingTidal ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Vérification du token...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Vérifier & Enregistrer ce token
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Rappel pour trouver ce token sur votre navigateur :</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-500 pl-1 leading-relaxed text-[11px]">
                      <li>Allez sur <a href="https://tidal.com" target="_blank" rel="noreferrer" className="text-sky-600 underline font-medium">tidal.com</a> et ouvrez les outils développeur (<kbd className="px-1 py-0.2 bg-slate-100 border rounded text-[10px] font-mono">F12</kbd>).</li>
                      <li>Cliquez sur l'onglet <strong>Network</strong> (Réseau) et filtrez sur <code className="bg-slate-100 px-1 rounded text-[10px] font-mono">api</code>.</li>
                      <li>Rechargez la page (<kbd className="px-1 py-0.2 bg-slate-100 border rounded text-[10px] font-mono">F5</kbd>), cliquez sur une requête et copiez la valeur de l'en-tête <strong>Authorization</strong> (commençant par <code className="font-mono text-slate-800">eyJ...</code>).</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400">
              <span>🔒 Données sécurisées et stockées exclusivement dans votre navigateur.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTidalModal(false)}
                className="text-xs text-slate-600 rounded-xl"
              >
                Fermer
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* MULTI-PLAYLISTS BATCH DOWNLOAD MODAL */}
      {showMultiJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                  multiJobStatus?.status === 'completed'
                    ? 'bg-emerald-600 shadow-emerald-200'
                    : 'bg-slate-900 shadow-slate-300'
                } shadow-md`}>
                  {multiJobStatus?.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {multiJobStatus?.status === 'completed'
                      ? 'Téléchargement Groupé Terminé !'
                      : 'Téléchargement de vos Playlists Tidal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {multiJobStatus?.status === 'completed'
                      ? `${multiJobStatus.totalPlaylists} playlists converties avec succès en MP3 320 kbps avec tags ID3v2`
                      : `Traitement de ${multiJobStatus?.totalPlaylists || 0} playlists en tâche de fond`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMultiJobModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Progress Gauge */}
            {multiJobStatus && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Progression Globale</span>
                  <span className="text-emerald-700 font-mono">
                    {Math.round(((multiJobStatus.completedTracks || 0) / Math.max(1, multiJobStatus.totalTracks || 1)) * 100)}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((multiJobStatus.completedTracks || 0) / Math.max(1, multiJobStatus.totalTracks || 1)) * 100))}%`
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                  <span>
                    Morceaux : <strong className="text-slate-900">{multiJobStatus.completedTracks || 0}</strong> / {multiJobStatus.totalTracks || 0}
                  </span>
                  <span>
                    Playlists achevées : <strong className="text-slate-900">{multiJobStatus.completedPlaylists || 0}</strong> / {multiJobStatus.totalPlaylists || 0}
                  </span>
                </div>

                {multiJobStatus.status !== 'completed' && multiJobStatus.currentPlaylistTitle && (
                  <div className="pt-2 text-xs text-slate-600 border-t border-slate-200/60 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin shrink-0" />
                    <span>En cours d'extraction : <strong className="text-slate-900 font-semibold">{multiJobStatus.currentPlaylistTitle}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Grand Zip Master Download Button (When completed) */}
            {multiJobStatus?.status === 'completed' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-emerald-700" />
                    Grand Pack ZIP Tout-en-un
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Contient chaque playlist rangée dans son propre sous-dossier avec exclusivement vos fichiers MP3 320 kbps.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleDownloadMasterZip(multiJobStatus.multiJobId || multiJobId)}
                  className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm shrink-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le Pack Complet (.ZIP)
                </Button>
              </div>
            )}

            {/* Playlists Breakdown List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Détail des Playlists ({multiJobStatus?.playlists?.length || 0})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {(multiJobStatus?.playlists || []).map((pl, idx) => (
                  <div
                    key={pl.id || idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                        <h5 className="font-bold text-slate-900 truncate" title={pl.title}>
                          {pl.title}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {pl.trackCount || pl.totalTracks || 0} morceau{(pl.trackCount || pl.totalTracks || 0) > 1 ? 'x' : ''}
                      </p>
                    </div>

                    {/* Status Pill & Action */}
                    <div className="flex items-center gap-2">
                      {(pl.status === 'done' || pl.status === 'completed') ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Prête
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDownloadMultiSubZip(multiJobStatus.multiJobId || multiJobId, pl.id)}
                            className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                            title="Télécharger cette playlist seule en MP3"
                          >
                            <Download className="w-3 h-3 mr-1 text-emerald-600" />
                            ZIP MP3
                          </button>
                        </div>
                      ) : pl.status === 'downloading' ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-cyan-600" /> En cours
                        </span>
                      ) : pl.status === 'error' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Erreur
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                          En file d'attente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px]">
                {multiJobStatus?.status === 'completed'
                  ? 'Toutes les archives sont prêtes au téléchargement.'
                  : 'Vous pouvez laisser cette fenêtre ouverte ou la fermer, le téléchargement continue en tâche de fond.'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMultiJobModal(false)}
                className="text-xs h-8 px-4"
              >
                Fermer
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
