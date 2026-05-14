import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, Code, User, Music, Award, Instagram, Facebook, Youtube, Globe, Mail, Phone, X, Eye, Upload, Image } from "lucide-react";
import { toast } from "sonner";

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

// Composant iframe aperçu avec auto-resize via postMessage
const WidgetPreviewIframe = ({ profileId }) => {
  const iframeRef = React.useRef(null);
  const [height, setHeight] = React.useState(400);

  React.useEffect(() => {
    const handler = (e) => {
      if (
        iframeRef.current &&
        e.source === iframeRef.current.contentWindow &&
        e.data &&
        e.data.type === 'rkey-widget-resize' &&
        e.data.height > 50
      ) {
        setHeight(e.data.height);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`${BACKEND_URL}/api/widgets/dj-profile.html?id=${profileId}`}
      title="Aperçu du profil DJ"
      className="w-full border-0 rounded-lg"
      style={{ height: `${height}px`, transition: 'height 0.3s ease' }}
      scrolling="no"
      frameBorder="0"
      data-testid="widget-preview-iframe"
    />
  );
};

const musicStylesList = [
  "Pop", "Rock", "Électro", "House", "Hip-Hop", "R&B", "Disco", "Funk",
  "80s", "90s", "2000s", "Hits actuels", "Latino", "Reggaeton", "Afro",
  "Variété française", "Lounge", "Jazz", "Soul", "Classique", "World Music"
];

const specialitesList = [
  "Mariage", "Anniversaire", "Comité d'entreprise", "Événement associatif",
  "Soirée privée", "Gala", "Festival", "Club"
];

const DjProfilesApp = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [selectedProfileForWidget, setSelectedProfileForWidget] = useState(null);
  const [selectedProfileForPreview, setSelectedProfileForPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    nom_artistique: "",
    nom_complet: "",
    titre: "Animateur DJ",
    sous_titre: "Animateur DJ",
    photo_url: "",
    logo_url: "",
    biographie: "",
    email: "",
    telephone: "",
    siret: "",
    adresse_postale: "",
    statut_artiste: "dirigeant",
    iban: "",
    bic: "",
    annees_experience: 0,
    nombre_evenements: 0,
    nombre_mariages: 0,
    styles_musicaux: [],
    specialites: [],
    points_forts: "",
    lien_instagram: "",
    lien_facebook: "",
    lien_youtube: "",
    lien_tiktok: "",
    actif: true
  });

  const [customStyleInput, setCustomStyleInput] = useState("");
  const [customSpecialiteInput, setCustomSpecialiteInput] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/dj-fiches`, { headers });
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Erreur lors du chargement des profils");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProfileForm({
      nom_artistique: "",
      nom_complet: "",
      titre: "Animateur DJ",
      sous_titre: "Animateur DJ",
      photo_url: "",
      logo_url: "",
      biographie: "",
      email: "",
      telephone: "",
      siret: "",
      adresse_postale: "",
      annees_experience: 0,
      nombre_evenements: 0,
      nombre_mariages: 0,
      styles_musicaux: [],
      specialites: [],
      points_forts: "",
      lien_instagram: "",
      lien_facebook: "",
      lien_youtube: "",
      lien_tiktok: "",
      actif: true
    });
    setEditingProfile(null);
    setCustomStyleInput("");
    setCustomSpecialiteInput("");
  };

  const handleEditProfile = (profile) => {
    setProfileForm({
      nom_artistique: profile.nom_artistique || "",
      nom_complet: profile.nom_complet || "",
      titre: profile.titre || "Animateur DJ",
      sous_titre: profile.sous_titre || "Animateur DJ",
      photo_url: profile.photo_url || "",
      logo_url: profile.logo_url || "",
      biographie: profile.biographie || "",
      email: profile.email || "",
      telephone: profile.telephone || "",
      siret: profile.siret || "",
      adresse_postale: profile.adresse_postale || "",
      statut_artiste: profile.statut_artiste || "dirigeant",
      iban: profile.iban || "",
      bic: profile.bic || "",
      annees_experience: profile.annees_experience || 0,
      nombre_evenements: profile.nombre_evenements || 0,
      nombre_mariages: profile.nombre_mariages || 0,
      styles_musicaux: profile.styles_musicaux || [],
      specialites: profile.specialites || [],
      points_forts: profile.points_forts || "",
      lien_instagram: profile.lien_instagram || "",
      lien_facebook: profile.lien_facebook || "",
      lien_youtube: profile.lien_youtube || "",
      lien_tiktok: profile.lien_tiktok || "",
      actif: profile.actif !== false
    });
    setEditingProfile(profile);
    setCustomStyleInput("");
    setCustomSpecialiteInput("");
    setShowProfileDialog(true);
  };

  // Fonction pour gérer l'upload d'image et la convertir en base64
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Redimensionner l'image avant de la convertir en base64
      const resizedBase64 = await resizeImage(file, 400, 400);
      setProfileForm(prev => ({ ...prev, photo_url: resizedBase64 }));
      toast.success("Photo uploadée avec succès");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Fonction pour gérer l'upload du logo (format paysage, max 600x200)
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Veuillez sélectionner une image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Le logo ne doit pas dépasser 2 Mo"); return; }
    try {
      const resizedBase64 = await resizeImage(file, 600, 200);
      setProfileForm(prev => ({ ...prev, logo_url: resizedBase64 }));
      toast.success("Logo uploadé avec succès");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors de l'upload du logo");
    }
  };


  // Fonction pour redimensionner l'image
  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculer les nouvelles dimensions en conservant le ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir en base64 avec compression JPEG
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProfile = async () => {
    if (!profileForm.nom_artistique.trim()) {
      toast.error("Le nom artistique est requis");
      return;
    }

    try {
      const profileData = {
        ...profileForm,
        id: editingProfile?.id || undefined
      };

      const url = editingProfile 
        ? `${BACKEND_URL}/api/dj-fiches/${editingProfile.id}`
        : `${BACKEND_URL}/api/dj-fiches`;
      
      const method = editingProfile ? "PUT" : "POST";

      const token = localStorage.getItem('access_token');
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        toast.success(editingProfile ? "Profil mis à jour !" : "Profil créé !");
        setShowProfileDialog(false);
        resetForm();
        fetchProfiles();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/dj-fiches/${profileId}`, {
        method: "DELETE",
        headers
      });

      if (response.ok) {
        toast.success("Profil supprimé !");
        fetchProfiles();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleMusicStyle = (style) => {
    setProfileForm(prev => ({
      ...prev,
      styles_musicaux: prev.styles_musicaux.includes(style)
        ? prev.styles_musicaux.filter(s => s !== style)
        : [...prev.styles_musicaux, style]
    }));
  };

  const toggleSpecialite = (spec) => {
    setProfileForm(prev => ({
      ...prev,
      specialites: prev.specialites.includes(spec)
        ? prev.specialites.filter(s => s !== spec)
        : [...prev.specialites, spec]
    }));
  };

  const addCustomStyle = () => {
    const style = customStyleInput.trim();
    if (style && !profileForm.styles_musicaux.includes(style)) {
      setProfileForm(prev => ({
        ...prev,
        styles_musicaux: [...prev.styles_musicaux, style]
      }));
      setCustomStyleInput("");
    }
  };

  const addCustomSpecialite = () => {
    const spec = customSpecialiteInput.trim();
    if (spec && !profileForm.specialites.includes(spec)) {
      setProfileForm(prev => ({
        ...prev,
        specialites: [...prev.specialites, spec]
      }));
      setCustomSpecialiteInput("");
    }
  };

  const removeStyle = (style) => {
    setProfileForm(prev => ({
      ...prev,
      styles_musicaux: prev.styles_musicaux.filter(s => s !== style)
    }));
  };

  const removeSpecialite = (spec) => {
    setProfileForm(prev => ({
      ...prev,
      specialites: prev.specialites.filter(s => s !== spec)
    }));
  };

  const openWidgetDialog = (profile) => {
    setSelectedProfileForWidget(profile);
    setShowWidgetDialog(true);
  };

  const openPreviewDialog = (profile) => {
    setSelectedProfileForPreview(profile);
    setShowPreviewDialog(true);
  };

  const generateWidgetCode = (profile) => {
    const productionUrl = window.location.origin;
    const uid = 'rkey-dj-' + profile.id.substring(0, 8);
    const src = `${productionUrl}/api/widgets/dj-profile.html?id=${profile.id}`;
    
    return `<!-- Widget Profil DJ - ${profile.nom_artistique} -->
<div style="width:100%;position:relative;">
  <iframe id="${uid}" src="${src}" 
    style="width:100%;border:none;min-height:200px;display:block;" 
    scrolling="no" frameborder="0" allowtransparency="true">
  </iframe>
</div>
<script>
(function(){
  var f=document.getElementById('${uid}');
  if(!f)return;
  window.addEventListener('message',function(e){
    if(e.source===f.contentWindow&&e.data&&e.data.type==='rkey-widget-resize'&&e.data.height>50){
      f.style.height=e.data.height+'px';
    }
  });
})();
</script>`;
  };

  const copyWidgetCode = () => {
    if (selectedProfileForWidget) {
      navigator.clipboard.writeText(generateWidgetCode(selectedProfileForWidget));
      toast.success("Code copié dans le presse-papier !");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <User className="w-10 h-10 text-yellow-600" />
            Profils DJ
          </h1>
          <p className="text-gray-600">Gérez vos profils DJ et générez des widgets pour votre site</p>
        </div>

        {/* Actions */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => {
                  resetForm();
                  setShowProfileDialog(true);
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau profil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profiles Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des profils...</p>
          </div>
        ) : profiles.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white/80">
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun profil DJ</h3>
              <p className="text-gray-500 mb-4">Créez votre premier profil DJ pour commencer</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowProfileDialog(true);
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un profil
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <Card key={profile.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {profile.photo_url ? (
                        <img
                          src={profile.photo_url}
                          alt={profile.nom_artistique}
                          className="w-16 h-16 rounded-full object-cover border-2 border-yellow-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-400 flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl">{profile.nom_artistique}</CardTitle>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.actif 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {profile.actif ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Styles musicaux */}
                  {profile.styles_musicaux?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">🎵 Styles musicaux</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.styles_musicaux.slice(0, 5).map((style) => (
                          <span key={style} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                            {style}
                          </span>
                        ))}
                        {profile.styles_musicaux.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{profile.styles_musicaux.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Réseaux sociaux */}
                  {(profile.lien_instagram || profile.lien_facebook || profile.lien_youtube || profile.lien_tiktok) && (
                    <div className="flex items-center gap-3 pt-2">
                      {profile.lien_instagram && (
                        <a 
                          href={profile.lien_instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-pink-500 hover:text-pink-600 transition-colors"
                          title="Instagram"
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {profile.lien_facebook && (
                        <a 
                          href={profile.lien_facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="Facebook"
                        >
                          <Facebook className="w-5 h-5" />
                        </a>
                      )}
                      {profile.lien_youtube && (
                        <a 
                          href={profile.lien_youtube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="YouTube"
                        >
                          <Youtube className="w-5 h-5" />
                        </a>
                      )}
                      {profile.lien_tiktok && (
                        <a 
                          href={profile.lien_tiktok} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-800 hover:text-black transition-colors"
                          title="TikTok"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProfile(profile)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPreviewDialog(profile)}
                      className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Aperçu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWidgetDialog(profile)}
                      className="flex-1 border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Code className="w-4 h-4 mr-1" />
                      Widget
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog Création/Édition */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? "Modifier le profil" : "Nouveau profil DJ"}
              </DialogTitle>
              <DialogDescription>
                {editingProfile 
                  ? "Modifiez les informations du profil DJ"
                  : "Créez un nouveau profil DJ avec toutes ses informations"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Identité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom artistique * (visible publiquement)</Label>
                  <Input
                    value={profileForm.nom_artistique}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nom_artistique: e.target.value }))}
                    placeholder="Ex: Joël R'Key"
                    data-testid="input-nom-artistique"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom complet (privé - contrats uniquement)</Label>
                  <Input
                    value={profileForm.nom_complet}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nom_complet: e.target.value }))}
                    placeholder="Ex: Joël RUTTKAY"
                    data-testid="input-nom-complet"
                  />
                </div>
              </div>

              {/* Coordonnées privées */}
              <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">Informations privées (contrats uniquement, jamais publiées)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemple.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={profileForm.telephone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="06 00 00 00 00"
                      data-testid="input-telephone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° SIRET</Label>
                    <Input
                      value={profileForm.siret}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, siret: e.target.value }))}
                      placeholder="00000000000000"
                      data-testid="input-siret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse postale</Label>
                    <Input
                      value={profileForm.adresse_postale}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, adresse_postale: e.target.value }))}
                      placeholder="5 rue du Hohlandsbourg, 67390 Marckolsheim"
                      data-testid="input-adresse"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <select
                      value={profileForm.statut_artiste}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, statut_artiste: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                      data-testid="select-statut-artiste"
                    >
                      <option value="dirigeant">Dirigeant</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN / RIB personnel {profileForm.statut_artiste === 'freelance' ? '(pour le solde)' : ''}</Label>
                    <Input
                      value={profileForm.iban}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                      data-testid="input-iban"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BIC</Label>
                    <Input
                      value={profileForm.bic}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bic: e.target.value }))}
                      placeholder="XXXXXXXX"
                      data-testid="input-bic"
                    />
                  </div>
                </div>
              </div>

              {/* Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Photo du DJ</Label>
                  <div className="flex items-center gap-4">
                    {/* Prévisualisation */}
                    {profileForm.photo_url ? (
                      <div className="relative">
                        <img 
                          src={profileForm.photo_url} 
                          alt="Aperçu" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-yellow-200"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileForm(prev => ({ ...prev, photo_url: '' }))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    {/* Bouton d'upload */}
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {uploadingPhoto ? 'Upload...' : 'Choisir une photo'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG (max 2 Mo)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo de l'artiste (pour contrats mandataire) */}
              <div className="space-y-2">
                <Label className="font-semibold">Logo de l'artiste <span className="text-xs text-gray-400 font-normal">(pour contrats en mode mandataire)</span></Label>
                <div className="flex items-center gap-4">
                  {profileForm.logo_url ? (
                    <div className="relative">
                      <img src={profileForm.logo_url} alt="Logo" className="h-12 max-w-[200px] object-contain rounded border border-gray-200 bg-white p-1" />
                      <button
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, logo_url: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >×</button>
                    </div>
                  ) : (
                    <div className="h-12 w-[120px] rounded bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <span className="text-xs text-gray-400">Aucun logo</span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors border border-amber-200">
                      <Upload className="w-3 h-3" />
                      <span className="text-xs font-medium">Choisir un logo</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-500">JPG, PNG (max 2 Mo) — Apparaîtra en en-tête du contrat prestation</p>
              </div>


              {/* Titre et sous-titre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titre (badge sur la photo)</Label>
                  <Input
                    value={profileForm.titre}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, titre: e.target.value }))}
                    placeholder="Ex: Fondateur, Animateur DJ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre (sous le nom)</Label>
                  <Input
                    value={profileForm.sous_titre}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, sous_titre: e.target.value }))}
                    placeholder="Ex: Animateur DJ & Fondateur"
                  />
                </div>
              </div>

              {/* Biographie */}
              <div className="space-y-2">
                <Label>Biographie</Label>
                <Textarea
                  value={profileForm.biographie}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, biographie: e.target.value }))}
                  placeholder="Présentez-vous en quelques lignes..."
                  rows={4}
                />
              </div>

              {/* Spécialités */}
              <div className="space-y-3">
                <Label>🎯 Spécialités</Label>
                
                {/* Spécialités sélectionnées */}
                {profileForm.specialites.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-pink-50 rounded-lg">
                    {profileForm.specialites.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-pink-500 text-white rounded-full text-sm"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => removeSpecialite(spec)}
                          className="hover:bg-pink-600 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Spécialités prédéfinies */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {specialitesList.filter(s => !profileForm.specialites.includes(s)).map((spec) => (
                    <div
                      key={spec}
                      className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50 transition-all cursor-pointer text-center text-sm"
                      onClick={() => toggleSpecialite(spec)}
                    >
                      {spec}
                    </div>
                  ))}
                </div>
                
                {/* Ajouter une spécialité personnalisée */}
                <div className="flex gap-2">
                  <Input
                    value={customSpecialiteInput}
                    onChange={(e) => setCustomSpecialiteInput(e.target.value)}
                    placeholder="Ajouter une spécialité personnalisée..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialite())}
                  />
                  <Button type="button" onClick={addCustomSpecialite} variant="outline" className="shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Réseaux sociaux
                </Label>
                <p className="text-sm text-gray-500 -mt-2">Les icônes s'afficheront uniquement si vous renseignez une URL</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </Label>
                    <Input
                      value={profileForm.lien_instagram}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lien_instagram: e.target.value }))}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </Label>
                    <Input
                      value={profileForm.lien_facebook}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lien_facebook: e.target.value }))}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      YouTube
                    </Label>
                    <Input
                      value={profileForm.lien_youtube}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lien_youtube: e.target.value }))}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </Label>
                    <Input
                      value={profileForm.lien_tiktok}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lien_tiktok: e.target.value }))}
                      placeholder="https://tiktok.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Actif */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actif"
                  checked={profileForm.actif}
                  onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, actif: checked }))}
                />
                <Label htmlFor="actif">Profil actif (visible sur le widget public)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="bg-gradient-to-r from-yellow-500 to-amber-500"
              >
                {editingProfile ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Widget */}
        <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                🎧 Widget Profil - {selectedProfileForWidget?.nom_artistique}
              </DialogTitle>
              <DialogDescription>
                Copiez ce code HTML et collez-le sur votre site pour afficher ce profil DJ
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                  <code>{selectedProfileForWidget && generateWidgetCode(selectedProfileForWidget)}</code>
                </pre>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">📌 Instructions :</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Copiez le code ci-dessus</li>
                  <li>Collez-le dans le HTML de votre site (bloc "Code HTML personnalisé")</li>
                  <li>Le profil DJ s'affichera automatiquement</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
                Fermer
              </Button>
              <Button
                onClick={copyWidgetCode}
                className="bg-gradient-to-r from-yellow-500 to-amber-500"
              >
                <Code className="mr-2 h-4 w-4" />
                Copier le code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Aperçu */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden" data-testid="preview-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Aperçu - {selectedProfileForPreview?.nom_artistique}
              </DialogTitle>
              <DialogDescription>
                Rendu tel qu'il apparaîtra sur votre site
              </DialogDescription>
            </DialogHeader>

            <div className="bg-gray-200 rounded-lg p-3 overflow-auto" style={{ maxHeight: '65vh' }}>
              {selectedProfileForPreview && (
                <WidgetPreviewIframe profileId={selectedProfileForPreview.id} />
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setShowPreviewDialog(false);
                  openWidgetDialog(selectedProfileForPreview);
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-500"
              >
                <Code className="mr-2 h-4 w-4" />
                Obtenir le code widget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DjProfilesApp;
