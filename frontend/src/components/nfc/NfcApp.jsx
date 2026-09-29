import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Save, Smartphone, QrCode, Upload, Download, 
  CheckCircle, ExternalLink, Loader2, Info, Globe, Camera, RefreshCw, Eye,
  MessageSquare, Instagram, Linkedin
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
    socials: {
      linkedin: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      youtube: ''
    }
  });

  const [nfcWriting, setNfcWriting] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/nfc-cards/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        handleInputChange('avatarUrl', data.url);
        toast.success("Photo de profil enregistrée sur Google Cloud Storage");
      } else {
        toast.error("Erreur de téléchargement");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'upload");
    } finally {
      setUploading(false);
    }
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

  // Web NFC writing logic using standard window.NDEFReader
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
            Configurez vos profils de cartes de visite virtuelles et programmez vos puces NFC physiques directement depuis votre smartphone.
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

        {/* CENTER COLUMN: Edit Form */}
        <div className="lg:col-span-5">
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
              <div className="flex flex-col md:flex-row gap-4 items-start border-b pb-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {formState.avatarUrl ? (
                      <img src={formState.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <MyDjLogo className="w-full h-full p-2" glow={false} />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  )}
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

              {/* Bio area */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Biographie</label>
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
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Réseaux Sociaux</h3>
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
            <div className="mt-6 bg-white rounded-2xl border p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#e86405]" /> Programmation NFC & Code QR
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

        {/* RIGHT COLUMN: Mobile Simulator Live Preview */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-full max-w-[320px] sticky top-6">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest text-center mb-3 flex items-center justify-center gap-1">
              <Smartphone className="w-4 h-4 text-gray-400" /> Rendu Mobile Live
            </h3>
            
            {/* Phone Device container mockup */}
            <div className="relative border-[8px] border-slate-900 rounded-[36px] shadow-2xl overflow-hidden aspect-[9/18.5] w-full bg-[#0B0F19] flex flex-col">
              
              {/* Speaker Bar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center">
                <span className="w-10 h-0.5 bg-gray-800 rounded-full" />
                <span className="w-2 h-2 bg-gray-900 rounded-full ml-2 border border-gray-800/10" />
              </div>

              {/* Scrollable mockup content */}
              <div className="w-full h-full overflow-y-auto pt-7 flex flex-col items-center pb-5 text-white text-center relative z-10 scrollbar-none">
                
                {/* Banner mockup */}
                <div className="w-full h-20 bg-gradient-to-r from-[#e86405] to-[#FF7A00] flex-shrink-0" />

                {/* Profile Circle mockup */}
                <div className="w-20 h-20 rounded-full border-4 border-[#0B0F19] bg-[#1F2937] shadow-lg overflow-hidden flex items-center justify-center -mt-10 mb-2 flex-shrink-0">
                  {formState.avatarUrl ? (
                    <img src={formState.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MyDjLogo className="w-full h-full p-1.5 animate-pulse" glow={false} />
                  )}
                </div>

                {/* Details mockup */}
                <div className="px-4 w-full">
                  <h4 className="text-xs font-bold truncate">
                    {formState.firstName || 'Prénom'} {formState.lastName || 'Nom'}
                  </h4>
                  <p className="text-[9px] text-[#e86405] font-bold uppercase tracking-wider mb-1 truncate">
                    {formState.role || "Titre / Rôle"}
                  </p>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[8px] text-gray-400 truncate">
                    <span className="font-semibold text-gray-300">{formState.company || "R'KEY PROD"}</span>
                    {formState.location && (
                      <>
                        <span>·</span>
                        <span>{formState.location}</span>
                      </>
                    )}
                  </div>

                  {formState.bio && (
                    <p className="mt-2 text-[9px] text-gray-300 bg-gray-900/50 border border-gray-800/40 p-2 rounded-xl italic leading-relaxed text-left max-h-16 overflow-y-auto">
                      {formState.bio}
                    </p>
                  )}
                </div>

                {/* Main Action mockup */}
                <div className="w-full px-4 mt-3 flex-shrink-0">
                  <button
                    type="button"
                    className="w-full h-8 rounded-xl bg-gradient-to-r from-[#e86405] to-[#FF7A00] text-white font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    Ajouter aux contacts
                  </button>
                </div>

                {/* Communication mockup */}
                <div className="w-full px-4 mt-3 text-left flex-shrink-0">
                  <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Accès Rapide</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1 p-1 bg-gray-900/60 border border-gray-800/40 rounded-lg">
                      <div className="p-1 bg-blue-500/10 text-blue-400 rounded-md">
                        <Smartphone className="w-2.5 h-2.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[7px] text-gray-500 leading-none">Appel</span>
                        <span className="block text-[8px] font-bold truncate text-gray-300">{formState.phone || 'Non configuré'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-gray-900/60 border border-gray-800/40 rounded-lg">
                      <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md">
                        <MessageSquare className="w-2.5 h-2.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[7px] text-gray-500 leading-none">WhatsApp</span>
                        <span className="block text-[8px] font-bold truncate text-gray-300">Envoi</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social media mockup */}
                {Object.values(formState.socials).some(Boolean) && (
                  <div className="w-full px-4 mt-3 text-left flex-1">
                    <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Réseaux</span>
                    <div className="space-y-1">
                      {formState.socials.instagram && (
                        <div className="flex items-center justify-between p-1 bg-gray-900/40 border border-gray-800/30 rounded-lg text-[8px]">
                          <span className="flex items-center gap-1 text-gray-300 font-semibold"><Instagram className="w-3 h-3 text-pink-400" /> Instagram</span>
                        </div>
                      )}
                      {formState.socials.linkedin && (
                        <div className="flex items-center justify-between p-1 bg-gray-900/40 border border-gray-800/30 rounded-lg text-[8px]">
                          <span className="flex items-center gap-1 text-gray-300 font-semibold"><Linkedin className="w-3 h-3 text-blue-400" /> LinkedIn</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer mockup */}
                <div className="w-full border-t border-gray-800/40 pt-2 mt-3 text-center flex-shrink-0">
                  <span className="text-[6px] text-gray-500 font-medium block">R'KEY PROD © {new Date().getFullYear()}</span>
                </div>

              </div>

              {/* Bottom Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-full z-30" />

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
