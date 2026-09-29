import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Save, Smartphone, QrCode, Upload, Download, 
  CheckCircle, ExternalLink, Loader2, Info, Globe, Camera, RefreshCw, Eye,
  MessageSquare, Instagram, Linkedin, Users, Calendar, Mail, Phone, Building,
  Youtube, Facebook, MessageCircle, Star, Navigation
} from 'lucide-react';
import MyDjLogo from '../MyDjLogo';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export default function NfcApp() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Leads state
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Local card form state
  const [formState, setFormState] = useState({
    id: '',
    slug: '',
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
    email: '',
    website: 'https://rkeyprod.fr',
    company: "R'KEY PROD",
    location: 'Strasbourg, France',
    bio: '',
    avatarUrl: '',
    googleReviewsUrl: '',
    socials: {
      linkedin: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      youtube: ''
    }
  });

  const [nfcWriting, setNfcWriting] = useState(false);

  // Cropper states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState('');
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [originalFileName, setOriginalFileName] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      fetchLeads(selectedCard.id || selectedCard._id);
    } else {
      setLeads([]);
    }
  }, [selectedCard]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/nfc-cards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data);
        if (data.length > 0 && !selectedCard) {
          setSelectedCard(data[0]);
          populateForm(data[0]);
        }
      } else {
        toast.error("Impossible de récupérer les cartes NFC");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async (cardId) => {
    try {
      setLoadingLeads(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/nfc-cards/${cardId}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const populateForm = (card) => {
    setFormState({
      id: card.id || card._id,
      slug: card.slug || '',
      firstName: card.firstName || '',
      lastName: card.lastName || '',
      role: card.role || '',
      phone: card.phone || '',
      email: card.email || '',
      website: card.website || 'https://rkeyprod.fr',
      company: card.company || "R'KEY PROD",
      location: card.location || 'Strasbourg, France',
      bio: card.bio || '',
      avatarUrl: card.avatarUrl || '',
      googleReviewsUrl: card.googleReviewsUrl || '',
      socials: {
        linkedin: card.socials?.linkedin || '',
        instagram: card.socials?.instagram || '',
        facebook: card.socials?.facebook || '',
        tiktok: card.socials?.tiktok || '',
        youtube: card.socials?.youtube || ''
      }
    });
  };

  const handleCreateNew = () => {
    const newCard = {
      id: '',
      slug: '',
      firstName: '',
      lastName: '',
      role: 'DJ / Directeur Artistique',
      phone: '',
      email: '',
      website: 'https://rkeyprod.fr',
      company: "R'KEY PROD",
      location: 'Strasbourg, France',
      bio: '',
      avatarUrl: '',
      googleReviewsUrl: '',
      socials: {
        linkedin: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        youtube: ''
      }
    };
    setSelectedCard(null);
    setFormState(newCard);
    setIsEditing(true);
  };

  const handleCardSelect = (card) => {
    setSelectedCard(card);
    populateForm(card);
    setIsEditing(false);
  };

  const handleInputChange = (field, val) => {
    setFormState(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSocialChange = (field, val) => {
    setFormState(prev => ({
      ...prev,
      socials: {
        ...prev.socials,
        [field]: val
      }
    }));
  };

  // Image Selection & Cropping Modal logic
  const handlePhotoSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOriginalFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result);
      setZoom(1);
      setPosX(0);
      setPosY(0);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset file input value so user can reselect the same file
    e.target.value = '';
  };

  const handleCropSubmit = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = originalImage;
    img.onload = () => {
      // Set pure black background (matches dark theme of cards)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 400, 400);

      const imgAspect = img.width / img.height;
      let baseWidth = 400;
      let baseHeight = 400;
      
      // Exact contain logic mirroring object-fit contain on 256px preview
      if (imgAspect > 1) {
        baseHeight = 400 / imgAspect;
      } else {
        baseWidth = 400 * imgAspect;
      }

      // Apply zoom magnification
      const drawWidth = baseWidth * zoom;
      const drawHeight = baseHeight * zoom;

      // Translate 256px screen coordinates to 400px canvas coordinates
      const scaleFactor = 400 / 256;

      // Centered positions with precise zoom translation offset mapping
      const dx = 200 - (drawWidth / 2) + (posX * scaleFactor * zoom);
      const dy = 200 - (drawHeight / 2) + (posY * scaleFactor * zoom);

      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      // Convert canvas to jpeg blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Échec du recadrage.");
          return;
        }

        const croppedFile = new File([blob], originalFileName || 'avatar.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', croppedFile);

        try {
          setUploading(true);
          setCropModalOpen(false);
          const token = localStorage.getItem('access_token');
          const res = await fetch('/api/nfc-cards/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            handleInputChange('avatarUrl', data.url);
            toast.success("Photo de profil recadrée et enregistrée !");
          } else {
            toast.error("Erreur d'upload");
          }
        } catch (err) {
          console.error(err);
          toast.error("Erreur réseau");
        } finally {
          setUploading(false);
        }
      }, 'image/jpeg', 0.92);
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formState.slug) {
      toast.error("Le slug d'URL est requis (ex: joel)");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/nfc-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formState)
      });

      if (res.ok) {
        const savedCard = await res.json();
        toast.success("Carte NFC sauvegardée avec succès !");
        setIsEditing(false);
        fetchCards();
        setSelectedCard(savedCard);
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Erreur d'enregistrement");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de communication");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Voulez-vous supprimer cette carte de visite ?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/nfc-cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Carte supprimée.");
        setSelectedCard(null);
        fetchCards();
      } else {
        toast.error("Impossible de supprimer.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de connexion");
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("Voulez-vous supprimer ce contact reçu ?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/nfc-leads/${leadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Contact supprimé");
        if (selectedCard) {
          fetchLeads(selectedCard.id || selectedCard._id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    }
  };

  const handleDownloadLeadVCard = (lead) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lead.lastName || ''};${lead.firstName || ''};;;`,
      `FN:${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    ];
    if (lead.company) lines.push(`ORG:${lead.company}`);
    if (lead.phone) lines.push(`TEL;TYPE=CELL,VOICE:${lead.phone}`);
    if (lead.email) lines.push(`EMAIL;TYPE=PREF,INTERNET:${lead.email}`);
    if (lead.note) lines.push(`NOTE:${lead.note.replace(/\n/g, '\\n')}`);
    lines.push('END:VCARD');

    const vcardStr = lines.join('\n');
    const blob = new Blob([vcardStr], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contact_${lead.firstName || 'client'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Web NFC programming using standard window.NDEFReader
  const handleWriteToNFC = async (publicUrl) => {
    if (!('NDEFReader' in window)) {
      toast.error("Le Web NFC n'est pas supporté par ce navigateur ou cet appareil. Veuillez utiliser Google Chrome sur Android.", {
        duration: 6000
      });
      return;
    }

    try {
      setNfcWriting(true);
      toast.info("Prêt à programmer ! Approchez une puce NFC réinscriptible du dos de votre smartphone...", {
        duration: 10000
      });
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [
          { recordType: "url", data: publicUrl }
        ]
      });
      toast.success("La puce NFC a été programmée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error(`Échec de la programmation: ${err.message}`);
    } finally {
      setNfcWriting(false);
    }
  };

  const getPublicUrl = (slugValue) => {
    const domain = window.location.origin;
    return `${domain}/card/${slugValue || 'preview'}`;
  };

  const publicUrl = formState.slug ? getPublicUrl(formState.slug) : '';
  const qrCodeUrl = publicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}` : '';

  return (
    <div className="container mx-auto p-4 max-w-7xl text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-[#e86405]" />
            NFC
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Configurez vos fiches connectées R'KEY PROD, écrivez sur vos puces NFC physiques et suivez les coordonnées partagées par vos clients.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-[#e86405] hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nouveau Profil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Profiles List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 text-xs mb-3 uppercase tracking-wider">Profils de Cartes</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#e86405]" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">Aucun profil configuré.</p>
                <button 
                  onClick={handleCreateNew}
                  className="mt-3 text-xs text-[#e86405] font-semibold hover:underline"
                >
                  Ajouter un profil
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {cards.map(c => {
                  const isActive = selectedCard && (selectedCard.id === c.id || selectedCard._id === c._id);
                  return (
                    <div 
                      key={c.id || c._id}
                      onClick={() => handleCardSelect(c)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive 
                          ? 'border-[#e86405] bg-orange-50/40 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <MyDjLogo className="w-full h-full p-0.5" glow={false} />
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{c.firstName} {c.lastName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.role || "R'KEY PROD"}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(c.id || c._id);
                        }}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed">
            <h4 className="font-bold text-gray-800 flex items-center gap-1 mb-1.5">
              <Info className="w-3.5 h-3.5 text-[#e86405]" /> Guide NFC Tactile
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Configurez et enregistrez votre profil.</li>
              <li>Ouvrez cette application sur votre smartphone Chrome.</li>
              <li>Approchez une puce NFC réinscriptible et appuyez sur <strong>Programmer la puce NFC</strong>.</li>
            </ul>
          </div>
        </div>

        {/* CENTER COLUMN: Edit Form & Tools */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                {formState.id ? 'Éditer les Informations' : 'Nouveau Profil'}
              </h2>
              {formState.id && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#e86405] font-bold flex items-center gap-1 hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modifier
                </button>
              )}
            </div>

            <fieldset disabled={!isEditing && formState.id} className="space-y-4 disabled:opacity-85">
              
              {/* Photo & Slug Profile Row */}
              <div className="flex flex-col md:flex-row gap-4 items-center border-b pb-4">
                
                {/* Photo box layout with crop click integration */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    onClick={() => {
                      if (!isEditing && formState.id) {
                        setIsEditing(true);
                      }
                      setTimeout(() => {
                        const elem = document.getElementById('avatar-input');
                        if (elem) elem.click();
                      }, 50);
                    }}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#e86405] bg-gray-50 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer group transition-all"
                  >
                    {formState.avatarUrl ? (
                      <img src={formState.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-gray-400">
                        <Camera className="w-6 h-6 mb-1 text-gray-400 group-hover:text-[#e86405]" />
                        <span className="text-[10px] font-bold group-hover:text-[#e86405]">Ajouter</span>
                      </div>
                    )}
                    
                    {/* Dark overlay on hover */}
                    {formState.avatarUrl && (isEditing || !formState.id) && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                        <Camera className="w-4 h-4 mb-1" />
                        Recadrer
                      </div>
                    )}
                  </div>
                  
                  {(isEditing || !formState.id) && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-input').click()}
                      className="text-[10px] text-[#e86405] hover:underline font-bold"
                    >
                      {formState.avatarUrl ? "Modifier/Recadrer" : "Importer une photo"}
                    </button>
                  )}
                  
                  <input 
                    id="avatar-input"
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoSelected} 
                    className="hidden" 
                  />
                </div>

                <div className="flex-1 w-full space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Slug de la carte (URL publique) *
                    </label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm focus-within:border-[#e86405] transition-colors">
                      <span className="bg-gray-100 text-gray-400 text-xs px-2.5 flex items-center border-r font-mono">
                        /card/
                      </span>
                      <input
                        type="text"
                        placeholder="ex: joel"
                        value={formState.slug}
                        onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                        className="w-full px-3 py-1.5 text-xs font-semibold focus:outline-none bg-white font-mono"
                        required
                        disabled={formState.id}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid: Firstname & Lastname */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prénom</label>
                  <input
                    type="text"
                    value={formState.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="Joël"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom</label>
                  <input
                    type="text"
                    value={formState.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="R"
                    required
                  />
                </div>
              </div>

              {/* Grid: Role & Company */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rôle</label>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="DJ & Directeur Artistique"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Entreprise</label>
                  <input
                    type="text"
                    value={formState.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                  />
                </div>
              </div>

              {/* Grid: Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="joel.rkey@gmail.com"
                  />
                </div>
              </div>

              {/* Grid: Website & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Site Web</label>
                  <input
                    type="url"
                    value={formState.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Localisation</label>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                    placeholder="Strasbourg, France"
                  />
                </div>
              </div>

              {/* Grid: Google Reviews Link */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lien Avis Google (Avis clients)</label>
                <input
                  type="url"
                  placeholder="https://g.page/r/.../review ou lien Google Maps"
                  value={formState.googleReviewsUrl || ''}
                  onChange={(e) => handleInputChange('googleReviewsUrl', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                />
              </div>

              {/* Bio area */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 font-sans">Biographie</label>
                <textarea
                  value={formState.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#e86405]"
                  placeholder="Présentez-vous brièvement..."
                />
              </div>

              {/* Social links block */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Liens Réseaux Sociaux</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">Instagram URL</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={formState.socials.instagram}
                      onChange={(e) => handleSocialChange('instagram', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={formState.socials.linkedin}
                      onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">Facebook URL</label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/..."
                      value={formState.socials.facebook}
                      onChange={(e) => handleSocialChange('facebook', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                   <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">TikTok URL</label>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@..."
                      value={formState.socials.tiktok}
                      onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">YouTube URL</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={formState.socials.youtube}
                      onChange={(e) => handleSocialChange('youtube', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

            </fieldset>

            {/* Submit Bar */}
            {(isEditing || !formState.id) && (
              <div className="flex items-center gap-3 border-t pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#e86405] hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
                {formState.id && (
                  <button
                    type="button"
                    onClick={() => {
                      populateForm(selectedCard);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            )}
          </form>

          {/* NFC & QR Tools Panel */}
          {formState.id && (
            <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-2 flex items-center justify-between gap-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#e86405]" /> Programmation NFC & Code QR
                </span>
                {selectedCard && (
                  <span className="text-[10px] bg-orange-50 text-[#e86405] border border-orange-100 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 select-none">
                    <Eye className="w-3.5 h-3.5" />
                    {selectedCard.viewsCount || 0} Scans / Visites
                  </span>
                )}
              </h3>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* QR Code image */}
                <div className="bg-slate-50 border p-2.5 rounded-2xl flex flex-col items-center flex-shrink-0">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-24 h-24 object-contain"
                  />
                  <a
                    href={qrCodeUrl}
                    download={`${formState.slug}_qrcode.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-[9px] font-bold text-gray-500 hover:text-[#e86405] flex items-center gap-0.5"
                  >
                    <Download className="w-2.5 h-2.5" /> Image QR
                  </a>
                </div>

                <div className="flex-1 space-y-3 w-full text-center md:text-left">
                  <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 text-xs">
                    <p className="font-bold text-gray-600 text-[10px] uppercase">Lien public de la carte :</p>
                    <a 
                      href={publicUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#e86405] font-semibold break-all hover:underline flex items-center gap-1 justify-center md:justify-start mt-0.5"
                    >
                      {publicUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Native Web NFC call */}
                    <button
                      type="button"
                      onClick={() => handleWriteToNFC(publicUrl)}
                      disabled={nfcWriting}
                      className="flex-1 h-9 px-3 rounded-xl border border-[#e86405] text-[#e86405] hover:bg-orange-50 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${nfcWriting ? 'animate-spin' : ''}`} />
                      Programmer puce NFC
                    </button>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Voir l'Aperçu
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Mobile Simulator Live Preview & Leads list */}
        <div className="lg:col-span-4 space-y-6 flex flex-col items-center">
          
          {/* Mobile Preview container */}
          <div className="w-full max-w-[320px]">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest text-center mb-3 flex items-center justify-center gap-1">
              <Smartphone className="w-4 h-4 text-gray-400" /> Rendu Mobile
            </h3>
            
            {/* Phone Device container mockup */}
            <div className="relative border-[8px] border-slate-900 rounded-[36px] shadow-2xl overflow-hidden aspect-[9/18.5] w-full bg-black flex flex-col">
              
              {/* Speaker Bar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center">
                <span className="w-10 h-0.5 bg-gray-800 rounded-full" />
                <span className="w-2 h-2 bg-gray-900 rounded-full ml-2 border border-gray-800/10" />
              </div>

              {/* Scrollable mockup content - custom styled scrollbar */}
              <div className="w-full h-full overflow-y-auto pt-14 flex flex-col items-center pb-5 text-white text-center relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 bg-black">
                
                {/* Banner mockup (curved floating design) */}
                <div className="w-[calc(100%-20px)] h-16 bg-gradient-to-r from-[#e86405] to-[#FF7A00] rounded-xl flex-shrink-0 mx-2.5" />

                {/* Profile Circle mockup (extended/overlapping above top edge of the banner) */}
                <div className="w-28 h-28 rounded-full border-4 border-black bg-zinc-900 shadow-lg overflow-hidden flex items-center justify-center -mt-20 mb-2 flex-shrink-0 z-20">
                  {formState.avatarUrl ? (
                    <img src={formState.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MyDjLogo className="w-full h-full p-1.5 animate-pulse" glow={false} />
                  )}
                </div>

                {/* Details mockup */}
                <div className="px-4 w-full flex-shrink-0">
                  <h4 className="text-xs font-bold truncate">
                    {formState.firstName || 'Prénom'} {formState.lastName || 'Nom'}
                  </h4>
                  <p className="text-[9px] text-[#e86405] font-bold uppercase tracking-wider mb-1 truncate">
                    {formState.role || "Titre / Rôle"}
                  </p>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[8px] text-zinc-500 truncate">
                    <span className="font-semibold text-zinc-400">{formState.company || "R'KEY PROD"}</span>
                    {formState.location && (
                      <>
                        <span>·</span>
                        <span>{formState.location}</span>
                      </>
                    )}
                  </div>

                  {formState.googleReviewsUrl && (
                    <div className="mt-1 flex justify-center">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[8px] text-yellow-500 font-bold">
                        <div className="flex gap-0.5">
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                        </div>
                        <span>Avis Google</span>
                      </div>
                    </div>
                  )}

                  {formState.bio && (
                    <p className="mt-2 text-[9px] text-zinc-300 bg-zinc-950/80 border border-zinc-800/60 p-2 rounded-xl italic leading-relaxed text-left max-h-16 overflow-y-auto">
                      {formState.bio}
                    </p>
                  )}
                </div>

                {/* Main Action mockup */}
                <div className="w-full px-4 mt-3 flex-shrink-0 space-y-1.5">
                  <button
                    type="button"
                    className="w-full h-8 rounded-xl bg-gradient-to-r from-[#e86405] to-[#FF7A00] text-white font-bold text-[9px] flex items-center justify-center gap-1"
                  >
                    Enregistrer le contact
                  </button>
                  <button
                    type="button"
                    className="w-full h-8 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-[9px] font-bold flex items-center justify-center gap-1"
                  >
                    Échanger nos coordonnées
                  </button>
                </div>

                {/* Communication mockup */}
                <div className="w-full px-4 mt-3 text-left flex-shrink-0">
                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Accès Rapide</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {formState.phone && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <div className="p-1 bg-blue-500/10 text-blue-400 rounded-md">
                          <Phone className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">Appel</span>
                          <span className="block text-[7px] font-bold truncate text-zinc-300">{formState.phone}</span>
                        </div>
                      </div>
                    )}

                    {formState.phone && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <div className="p-1 bg-yellow-500/10 text-yellow-400 rounded-md">
                          <MessageCircle className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">SMS</span>
                          <span className="block text-[7px] font-bold truncate text-zinc-300">SMS</span>
                        </div>
                      </div>
                    )}

                    {formState.phone && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md">
                          <MessageSquare className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">WhatsApp</span>
                          <span className="block text-[7px] font-bold truncate text-zinc-300">Message</span>
                        </div>
                      </div>
                    )}

                    {formState.email && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <div className="p-1 bg-red-500/10 text-red-400 rounded-md">
                          <Mail className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">Email</span>
                          <span className="block text-[7px] font-bold truncate text-zinc-300">{formState.email}</span>
                        </div>
                      </div>
                    )}

                    {formState.website && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg col-span-2">
                        <div className="p-1 bg-orange-500/10 text-[#e86405] rounded-md">
                          <Globe className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">Site Web</span>
                          <span className="block text-[7px] font-bold truncate text-[#e86405]">{formState.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </div>
                      </div>
                    )}

                    {formState.location && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg col-span-2">
                        <div className="p-1 bg-cyan-500/10 text-cyan-400 rounded-md">
                          <Navigation className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[6px] text-zinc-500 leading-none">Calculer l'itinéraire</span>
                          <span className="block text-[7px] font-bold truncate text-cyan-400">Let's Go !</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social media mockup preview */}
                {Object.values(formState.socials || {}).some(Boolean) && (
                  <div className="w-full px-4 mt-3 text-center flex-shrink-0">
                    <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Réseaux</span>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {formState.socials.linkedin && (
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center" title="LinkedIn">
                          <Linkedin className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      {formState.socials.instagram && (
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center" title="Instagram">
                          <Instagram className="w-4 h-4 text-pink-400" />
                        </div>
                      )}
                      {formState.socials.facebook && (
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center" title="Facebook">
                          <Facebook className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                      {formState.socials.tiktok && (
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center" title="TikTok">
                          <span className="font-bold text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-pink-500">TT</span>
                        </div>
                      )}
                      {formState.socials.youtube && (
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center" title="YouTube">
                          <Youtube className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer mockup */}
                <div className="w-full border-t border-zinc-800 pt-2 mt-4 text-center flex-shrink-0">
                  <span className="text-[6px] text-zinc-500 font-medium block">R'KEY PROD © {new Date().getFullYear()}</span>
                </div>

              </div>

              {/* Bottom Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-full z-30" />

            </div>
          </div>

          {/* TWO-WAY LEADS MANAGEMENT LIST PANEL */}
          {selectedCard && (
            <div className="w-full bg-white rounded-2xl border p-4 shadow-sm text-left">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#e86405]" /> Contacts Reçus (Échanges)
              </h3>

              {loadingLeads ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#e86405]" />
                </div>
              ) : leads.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucun contact reçu pour le moment via cette carte.</p>
              ) : (
                <div className="mt-3 space-y-3 max-h-[300px] overflow-y-auto">
                  {leads.map(lead => (
                    <div key={lead.id} className="p-3 bg-slate-50 border rounded-xl relative group text-xs text-slate-700 space-y-1.5">
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="font-bold text-gray-800 text-sm pr-6">
                        {lead.firstName} {lead.lastName}
                      </div>

                      {lead.company && (
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                          <Building className="w-3.5 h-3.5 flex-shrink-0" /> {lead.company}
                        </div>
                      )}

                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {lead.phone}
                        </div>
                      )}

                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-gray-600 text-[11px] truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {lead.email}
                        </div>
                      )}

                      {lead.note && (
                        <p className="p-2 bg-white border border-slate-100 rounded-lg italic text-[11px] text-slate-500">
                          "{lead.note}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-[10px] text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        
                        <button
                          onClick={() => handleDownloadLeadVCard(lead)}
                          className="text-[10px] text-[#e86405] font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Exporter vCard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* --- PREMIUM HTML5 CLIENT-SIDE IMAGE CROPPING MODAL --- */}
      {cropModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-zinc-800/80 rounded-[32px] max-w-md w-full p-6 text-white space-y-6 shadow-2xl text-center">
            
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Recadrer la photo</h3>
              <p className="text-xs text-gray-400 mt-1">Ajustez le zoom et déplacez l'image pour un cadrage parfait.</p>
            </div>

            {/* Visual crop masking circle viewport */}
            <div className="relative w-64 h-64 mx-auto rounded-full border-2 border-[#e86405] overflow-hidden bg-zinc-950 flex items-center justify-center">
              <img
                src={originalImage}
                alt="Crop Target"
                style={{
                  transform: `scale(${zoom}) translate(${posX}px, ${posY}px)`,
                  transition: 'transform 0.05s ease-out',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                className="pointer-events-none select-none"
              />
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            </div>

            {/* Sizing & Translation Sliders */}
            <div className="space-y-4">
              
              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Grossissement</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#e86405] bg-zinc-800 rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

              {/* Translation X Axis */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Axe Horizontal (Gauche/Droite)</span>
                  <span>{posX}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={posX}
                  onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                  className="w-full accent-[#e86405] bg-zinc-800 rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

              {/* Translation Y Axis */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Axe Vertical (Haut/Bas)</span>
                  <span>{posY}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={posY}
                  onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                  className="w-full accent-[#e86405] bg-zinc-800 rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

            </div>

            {/* Validation & Revert buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCropSubmit}
                className="flex-1 h-11 bg-gradient-to-r from-[#e86405] to-[#FF7A00] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#e86405]/15 active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Appliquer et Sauvegarder
              </button>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="px-4 h-11 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Annuler
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
