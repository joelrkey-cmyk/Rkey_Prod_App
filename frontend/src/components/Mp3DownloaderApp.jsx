import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Disc3, Play, Pause, CheckCircle2,
  AlertCircle, RefreshCw, Trash2, FileArchive, 
  Link as LinkIcon, Sparkles, Sliders,
  Volume2, VolumeX, ListMusic, Check, ChevronRight,
  Headphones, Info, CheckSquare, Square, Image as ImageIcon,
  Edit2, Plus, Upload, X, Music, RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from '../services/axiosConfig';
import API_BASE_URL from '../utils/apiUrl';

export default function Mp3DownloaderApp() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'library' | 'settings'
  const [importMode, setImportMode] = useState('image'); // 'image' | 'link' | 'text'
  
  // Image mode state (OCR)
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Link mode state
  const [tidalUrl, setTidalUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [linkProtectedNotice, setLinkProtectedNotice] = useState(null);

  // Text mode state
  const [rawText, setRawText] = useState('');
  const [textPlaylistTitle, setTextPlaylistTitle] = useState('');
  const [parsingText, setParsingText] = useState(false);

  // Playlist & Tracks Workbench
  const [playlist, setPlaylist] = useState({
    title: "Ma Playlist Tidal",
    description: "Playlist prête pour encodage MP3 320 kbps",
    creator: "Tidal",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
    tracks: [
      {
        id: "t_demo_1",
        trackNumber: 1,
        title: "Des milliers de je t'aime",
        artist: "Slimane",
        album: "Chroniques d'un cupidon",
        duration: 213,
        year: 2022,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
        status: "pending"
      },
      {
        id: "t_demo_2",
        trackNumber: 2,
        title: "Sarà perché ti amo (feat. Ricchi E Poveri) (Anthem Mix)",
        artist: "DJ Matrix, Carolina Marquez, Ricchi E Poveri",
        album: "Sarà perché ti amo (feat. Ricchi E Poveri)",
        duration: 161,
        year: 2023,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
        status: "pending"
      },
      {
        id: "t_demo_3",
        trackNumber: 3,
        title: "Atemlos durch die Nacht",
        artist: "Helene Fischer",
        album: "Farbenspiel",
        duration: 220,
        year: 2013,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
        status: "pending"
      },
      {
        id: "t_demo_4",
        trackNumber: 4,
        title: "Tornerò",
        artist: "Ciao Italia !, The Italians",
        album: "Made in Italy: The Best of Italian Music",
        duration: 253,
        year: 2021,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
        status: "pending"
      }
    ]
  });

  const [selectedTracks, setSelectedTracks] = useState(new Set(["t_demo_1", "t_demo_2", "t_demo_3", "t_demo_4"]));
  const [editingTrackId, setEditingTrackId] = useState(null);

  // Settings
  const [bitrate, setBitrate] = useState('320k');
  const [namingPattern, setNamingPattern] = useState('number_artist_title');
  const [customToken, setCustomToken] = useState(() => localStorage.getItem('tidal_custom_token') || '');

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

  // Polling for download progress
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

  // Load library when switching tabs
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab]);

  // Global paste handler for screenshot capture
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setImportMode('image');
            handleImageSelected(file);
            toast.info("Capture d'écran collée depuis le presse-papier ! Cliquez sur 'Extraire' pour scanner.");
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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

  // Image Selection & OCR Trigger
  const handleImageSelected = (file) => {
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async () => {
    if (!imagePreview) {
      toast.error("Veuillez sélectionner ou coller une capture d'écran.");
      return;
    }

    setAnalyzingImage(true);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const res = await axios.post('/mp3/tidal/parse-image', {
        imageBase64: imagePreview,
        playlistTitle: "Playlist Tidal Extraite"
      });

      if (res.data && res.data.tracks && res.data.tracks.length > 0) {
        setPlaylist({
          title: res.data.title || "Playlist Tidal Capturée",
          description: "Extraite par Vision IA depuis votre capture d'écran",
          creator: "Tidal OCR",
          coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
          tracks: res.data.tracks
        });
        setSelectedTracks(new Set(res.data.tracks.map(t => t.id)));
        toast.success(`Vision IA : ${res.data.tracks.length} morceaux réels extraits avec fidélité !`);
      } else {
        toast.error("Aucun morceau n'a pu être reconnu sur l'image.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      toast.error(err.response?.data?.error || "Erreur lors de l'analyse visuelle de l'image.");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Analyze Link (Spotify, Deezer, Tidal)
  const handleAnalyzeLink = async (e) => {
    if (e) e.preventDefault();
    if (!tidalUrl.trim()) {
      toast.error("Veuillez saisir une URL de playlist (Spotify, Deezer, Tidal).");
      return;
    }

    setAnalyzing(true);
    setLinkProtectedNotice(null);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const res = await axios.post('/mp3/tidal/parse', {
        url: tidalUrl.trim(),
        customToken: customToken.trim() || undefined
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
            provider: res.data.provider || 'tidal'
          });
          toast.info("Tidal protège l'accès à sa liste de titres. Utilisez la capture d'écran pour 100% de fidélité !");
        }
      }
    } catch (err) {
      console.error("Analyze error:", err);
      toast.error(err.response?.data?.error || "Impossible d'analyser le lien.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Parse Raw Text with Gemini AI
  const handleParseText = async (e) => {
    if (e) e.preventDefault();
    if (!rawText.trim()) {
      toast.error("Veuillez coller le texte de votre tracklist.");
      return;
    }

    setParsingText(true);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const res = await axios.post('/mp3/tidal/parse-text', {
        rawText: rawText.trim(),
        playlistTitle: textPlaylistTitle.trim() || "Ma Playlist"
      });

      if (res.data && res.data.tracks) {
        setPlaylist(res.data);
        setSelectedTracks(new Set(res.data.tracks.map(t => t.id)));
        setLinkProtectedNotice(null);
        toast.success(`IA : ${res.data.tracks.length} morceaux extraits avec succès !`);
      }
    } catch (err) {
      console.error("Parse text error:", err);
      toast.error(err.response?.data?.error || "Erreur lors de l'analyse intelligente.");
    } finally {
      setParsingText(false);
    }
  };

  // Reset & Clear Playlist
  const handleResetPlaylist = (showToast = true) => {
    setPlaylist(null);
    setSelectedTracks(new Set());
    setTidalUrl('');
    setRawText('');
    setTextPlaylistTitle('');
    setSelectedImage(null);
    setImagePreview(null);
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

  // Start Batch Download
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
      const res = await axios.post('/mp3/download/start-batch', {
        playlistTitle: playlist.title || 'Playlist Tidal',
        playlistId: playlist.id || `pl_${Date.now()}`,
        tracks: tracksToDownload,
        bitrate: bitrate,
        namingPattern: namingPattern
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
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/file/${jobId}/${trackId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
  };

  // Download Complete ZIP
  const handleDownloadZip = (jobId) => {
    const targetJob = jobId || activeJobId || jobStatus?.id;
    if (!targetJob) {
      toast.error("Archive ZIP non disponible.");
      return;
    }
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/api/mp3/download/zip/${targetJob}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
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
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Headphones className="w-4 h-4" />
            <span>Moteur Qualité Pro : MP3 320 kbps ID3v2</span>
          </div>
        </div>

        {/* TAB 1: IMPORT & DOWNLOAD */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            
            {/* Import Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <button
                type="button"
                onClick={() => setImportMode('image')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  importMode === 'image'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${importMode === 'image' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900">Capture d'écran (Vision IA)</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">100% Fidèle</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Glisser ou coller (Ctrl+V) votre écran Tidal / DJ</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('link')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  importMode === 'link'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${importMode === 'link' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Lien URL (Tidal / Web)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Coller l'URL d'une playlist ou d'un album</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('text')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  importMode === 'text'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${importMode === 'text' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Copier-Coller Tracklist</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Coller une liste texte ou export Serato/VirtualDJ</p>
                  </div>
                </div>
              </button>
            </div>

            {/* INPUT PANELS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              
              {/* Active Playlist Banner with Quick Reset */}
              {playlist && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <ListMusic className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Playlist chargée : <strong className="font-bold">{playlist.title}</strong> ({playlist.tracks?.length || 0} titres)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPlaylist()}
                    className="h-7 px-2.5 text-rose-700 bg-white border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1 text-rose-600" />
                    Réinitialiser / Remise à zéro
                  </Button>
                </div>
              )}

              {/* IMAGE OCR MODE */}
              {importMode === 'image' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Extraction 100% Fidèle par Capture d'écran (Vision IA)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tidal protège l'accès direct aux listes de titres privées : faites simplement une capture d'écran de votre liste Tidal et collez-la avec <kbd className="px-1.5 py-0.5 text-[11px] bg-slate-100 border border-slate-300 rounded font-mono">Ctrl+V</kbd> ou glissez-la ici !
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleImageSelected(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl border-2 border-emerald-500 overflow-hidden max-h-64 bg-slate-950 flex items-center justify-center">
                        <img src={imagePreview} alt="Capture Tidal" className="max-h-64 object-contain w-full" />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(null); setSelectedImage(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition"
                          title="Supprimer l'image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={handleAnalyzeImage}
                          disabled={analyzingImage}
                          className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                        >
                          {analyzingImage ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Extraction Visuelle des Titres...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Extraire les Morceaux Réels de l'Image
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-11"
                        >
                          Changer d'image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Cliquez pour importer ou glissez votre capture d'écran Tidal</h4>
                      <p className="text-xs text-slate-500 mt-1">Vous pouvez aussi appuyer sur <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px]">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px]">Cmd+V</kbd> directement !</p>
                    </div>
                  )}
                </div>
              )}

              {/* LINK MODE */}
              {importMode === 'link' && (
                <form onSubmit={handleAnalyzeLink} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-semibold text-slate-800">
                        URL de la Playlist ou Album (Spotify, Deezer, Tidal)
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
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="space-y-2 text-xs text-amber-900">
                            <div className="font-bold text-sm text-amber-950">
                              Tidal protège l'accès à la liste de lecture « {linkProtectedNotice.title} »
                            </div>
                            <p className="leading-relaxed">
                              Tidal ne partage pas les morceaux des playlists créées par les utilisateurs sans connexion active à votre compte.
                              Pour obtenir <strong>100% de vos vrais morceaux</strong> sans erreur :
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setImportMode('image');
                                  fileInputRef.current?.click();
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3"
                              >
                                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                                Importer par Capture d'écran (Vision IA - Recommandé)
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setImportMode('text')}
                                className="border-amber-300 hover:bg-amber-100 text-amber-950 font-semibold text-xs h-8 px-3"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                Copier-Coller la liste de titres
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Example & Reset Helper */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Exemples 100% réels :</span>
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
                      {playlist && (
                        <button
                          type="button"
                          onClick={() => handleResetPlaylist()}
                          className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Vider pour une autre playlist
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}

              {/* TEXT MODE */}
              {importMode === 'text' && (
                <form onSubmit={handleParseText} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Titre de la Playlist
                    </label>
                    <Input
                      type="text"
                      value={textPlaylistTitle}
                      onChange={(e) => setTextPlaylistTitle(e.target.value)}
                      placeholder="Ex: Soirée Événement R'KEY"
                      className="h-11 rounded-xl mb-3"
                    />

                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Liste des morceaux (Texte brut, export CSV ou copier-coller)
                    </label>
                    <textarea
                      rows={5}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`1. Slimane - Des milliers de je t'aime
2. DJ Matrix, Carolina Marquez, Ricchi E Poveri - Sarà perché ti amo (Anthem Mix)
3. Helene Fischer - Atemlos durch die Nacht
4. Ciao Italia !, The Italians - Tornerò`}
                      className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={parsingText || !rawText.trim()}
                      className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
                    >
                      {parsingText ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Extraction IA en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extraire & Préparer la Playlist
                        </>
                      )}
                    </Button>
                    {(rawText || textPlaylistTitle) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setRawText(''); setTextPlaylistTitle(''); }}
                        className="h-11 text-xs text-slate-600"
                      >
                        Effacer le texte
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </div>

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

                    <div className="flex items-center gap-2">
                      {(jobStatus?.zipReady || jobStatus?.status === 'completed') && (
                        <Button
                          onClick={() => handleDownloadZip()}
                          className="flex-1 h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-xs animate-bounce"
                        >
                          <FileArchive className="w-4 h-4 mr-1.5" />
                          ZIP Complet (.ZIP + .M3U8)
                        </Button>
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
                      Ajouter un titre
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
                    <div className="p-8 text-center text-slate-500">
                      Aucun morceau dans la liste. Collez un lien Tidal ou ajoutez des morceaux manuellement.
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
                  Collez l'URL d'une playlist Tidal ci-dessus ou collez une liste de titres dans l'onglet texte pour préparer vos téléchargements MP3 320 kbps.
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
                        onClick={() => handleDownloadZip(item.id)}
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
    </div>
  );
}
