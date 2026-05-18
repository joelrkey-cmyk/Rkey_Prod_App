import React, { useState, useEffect, useRef } from "react";
import axios from "../services/axiosConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Ticket, Plus, Edit, Trash2, Calendar, MapPin, Clock, ExternalLink, Code, Copy, Timer, Upload, Phone, Tag, X, Eye } from "lucide-react";
import { toast } from "sonner";

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

// Composant iframe aperçu avec auto-resize via postMessage
const BilletteriePreviewIframe = ({ type }) => {
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

  const src = type
    ? `${BACKEND_URL}/api/widgets/billetterie.html?type=${type}`
    : `${BACKEND_URL}/api/widgets/billetterie.html`;

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Aperçu du widget événements"
      className="w-full border-0 rounded-lg"
      style={{ height: `${height}px`, transition: 'height 0.3s ease' }}
      scrolling="no"
      frameBorder="0"
      data-testid="billetterie-preview-iframe"
    />
  );
};

function BilletterieApp() {
  const [events, setEvents] = useState([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewType, setPreviewType] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [eventForm, setEventForm] = useState({
    titre: "",
    type: "dj",
    date: "",
    date_fin: "",
    heure: "",
    duree: "",
    lieu: "",
    descriptif: "",
    photo_url: "",
    lien_reservation: "",
    telephone_reservation: "",
    etiquette: ""
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await axios.get(`${API}/billetterie/events`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Erreur lors du chargement des événements");
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.titre.trim() || !eventForm.date || !eventForm.lieu.trim()) {
      toast.error("Les champs titre, date de début et lieu sont requis");
      return;
    }

    try {
      if (editingEvent) {
        await axios.put(`${API}/billetterie/events/${editingEvent.id}`, {
          ...editingEvent,
          ...eventForm,
          date_fin: eventForm.date_fin || null
        });
        toast.success("Événement mis à jour !");
      } else {
        await axios.post(`${API}/billetterie/events`, {
          ...eventForm,
          date_fin: eventForm.date_fin || null
        });
        toast.success("Événement créé !");
      }
      
      loadEvents();
      setShowEventDialog(false);
      resetEventForm();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF.");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5 Mo)");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/billetterie/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setEventForm(prev => ({ ...prev, photo_url: response.data.image_url }));
        toast.success("Image uploadée !");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Supprimer cet événement ?")) return;

    try {
      await axios.delete(`${API}/billetterie/events/${eventId}`);
      toast.success("Événement supprimé");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetEventForm = () => {
    setEventForm({
      titre: "",
      type: "dj",
      date: "",
      date_fin: "",
      heure: "",
      duree: "",
      lieu: "",
      descriptif: "",
      photo_url: "",
      lien_reservation: "",
      telephone_reservation: "",
      etiquette: ""
    });
    setEditingEvent(null);
  };

  const openEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      titre: event.titre,
      type: event.type,
      date: event.date,
      date_fin: event.date_fin || "",
      heure: event.heure || "",
      duree: event.duree || "",
      lieu: event.lieu,
      descriptif: event.descriptif || "",
      photo_url: event.photo_url || "",
      lien_reservation: event.lien_reservation || "",
      telephone_reservation: event.telephone_reservation || "",
      etiquette: event.etiquette || ""
    });
    setShowEventDialog(true);
  };

  const duplicateEvent = (event) => {
    // Créer une copie de l'événement sans l'ID (pour créer un nouvel événement)
    setEditingEvent(null); // Important: null pour créer un nouvel événement
    setEventForm({
      titre: event.titre + " (copie)",
      type: event.type,
      date: "", // Vider la date pour forcer l'utilisateur à choisir une nouvelle date
      date_fin: "",
      heure: event.heure || "",
      duree: event.duree || "",
      lieu: event.lieu,
      descriptif: event.descriptif || "",
      photo_url: event.photo_url || "",
      lien_reservation: event.lien_reservation || "",
      telephone_reservation: event.telephone_reservation || "",
      etiquette: event.etiquette || ""
    });
    setShowEventDialog(true);
    toast.info("Événement dupliqué - Modifiez la date et les détails");
  };

  // Fonction pour formater l'affichage de la date/période
  const formatEventDate = (event, detailed = false) => {
    const startDate = new Date(event.date);
    const options = detailed 
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    
    if (event.date_fin) {
      const endDate = new Date(event.date_fin);
      if (detailed) {
        return `Du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', options)}`;
      }
      return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', options)}`;
    }
    return startDate.toLocaleDateString('fr-FR', options);
  };

  // Fonction pour obtenir l'URL complète de l'image
  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http') || photoUrl.startsWith('data:')) return photoUrl;
    return `${BACKEND_URL}${photoUrl}`;
  };

  const getTypeBadge = (type) => {
    if (type === "dj") {
      return <Badge className="bg-orange-500 hover:bg-orange-500 text-white">🎵 DJ</Badge>;
    } else if (type === "formation") {
      return <Badge className="bg-green-500 hover:bg-green-500 text-white">📚 Formation</Badge>;
    } else {
      return <Badge className="bg-purple-500 hover:bg-purple-500 text-white">🎭 Hypnose</Badge>;
    }
  };

  const filteredEvents = events.filter(event => {
    if (typeFilter === "all") return true;
    return event.type === typeFilter;
  });

  const futureEvents = filteredEvents.filter(event => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Un événement est "à venir" si sa date de fin (ou date unique) est >= aujourd'hui
    const endDate = event.date_fin ? new Date(event.date_fin) : new Date(event.date);
    return endDate >= today;
  });

  const pastEvents = filteredEvents.filter(event => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = event.date_fin ? new Date(event.date_fin) : new Date(event.date);
    return endDate < today;
  });

  const generateWidgetCode = (type = null) => {
    let productionUrl = window.location.origin;
    if (productionUrl.includes('ais-dev')) {
        productionUrl = productionUrl.replace('ais-dev', 'ais-pre');
    }
    const widgetUrl = type 
      ? `${productionUrl}/api/widgets/billetterie.html?type=${type}`
      : `${productionUrl}/api/widgets/billetterie.html`;
    const uid = 'rkey-evt-' + (type || 'all') + '-' + Date.now().toString(36);
    
    const widgetCode = `<!-- Widget Événements R'Key Prod${type ? ` - ${type.toUpperCase()}` : ''} -->
<div style="width:100%;position:relative;">
  <iframe id="${uid}" src="${widgetUrl}" 
    style="width:100%;border:none;min-height:400px;display:block;" 
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

    return widgetCode;
  };

  const [widgetType, setWidgetType] = useState(null);

  const openWidgetDialog = (type = null) => {
    setWidgetType(type);
    setShowWidgetDialog(true);
  };

  const copyWidgetCode = () => {
    const code = generateWidgetCode(widgetType);
    navigator.clipboard.writeText(code);
    toast.success("Code copié dans le presse-papier !");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            📅 Événements
          </h1>
          <p className="text-gray-600">Gérez vos événements et générez votre widget</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-700 to-gray-900 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Événements à venir</p>
                  <p className="text-3xl font-bold">{futureEvents.length}</p>
                </div>
                <Ticket className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Événements passés</p>
                  <p className="text-3xl font-bold">{pastEvents.length}</p>
                </div>
                <Calendar className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total événements</p>
                  <p className="text-3xl font-bold">{events.length}</p>
                </div>
                <Ticket className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="dj">🎵 DJ</SelectItem>
                  <SelectItem value="hypnose">🎭 Hypnose</SelectItem>
                  <SelectItem value="formation">📚 Formation</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2 flex-1 flex-wrap">
                <Button 
                  onClick={() => {
                    resetEventForm();
                    setShowEventDialog(true);
                  }}
                  className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel événement
                </Button>

                <Button
                  onClick={() => { setPreviewType(null); setShowPreviewDialog(true); }}
                  variant="outline"
                  className="border-blue-400 text-blue-600 hover:bg-blue-50"
                  data-testid="preview-all-btn"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Aperçu
                </Button>
                
                <Button 
                  onClick={() => openWidgetDialog('dj')}
                  variant="outline"
                  className="border-gray-700 text-gray-700 hover:bg-gray-100"
                >
                  <Code className="mr-2 h-4 w-4" />
                  DJ
                </Button>

                <Button 
                  onClick={() => openWidgetDialog('hypnose')}
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <Code className="mr-2 h-4 w-4" />
                  Hypnose
                </Button>

                <Button 
                  onClick={() => openWidgetDialog('formation')}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Code className="mr-2 h-4 w-4" />
                  Formation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des événements à venir */}
        {futureEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Événements à venir</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {futureEvents.map(event => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow relative">
                  {/* Étiquette/Badge en diagonale */}
                  {event.etiquette && (
                    <div className="absolute -top-2 -right-2 z-20 overflow-hidden" style={{ width: '130px', height: '130px' }}>
                      <div className="absolute bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold py-1.5 text-center shadow-lg uppercase tracking-wider transform rotate-45"
                           style={{ width: '180px', top: '28px', right: '-42px' }}>
                        {event.etiquette}
                      </div>
                    </div>
                  )}
                  
                  {/* Image */}
                  {event.photo_url && (
                    <div className="relative overflow-hidden">
                      <img src={getImageUrl(event.photo_url)} alt={event.titre} className="w-full h-48 object-cover" />
                    </div>
                  )}
                  
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {getTypeBadge(event.type)}
                        <h3 className="text-xl font-bold text-gray-800 mt-2">{event.titre}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateEvent(event)}
                          title="Dupliquer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditEvent(event)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event, true)}
                      </div>
                      {event.heure && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {event.heure}
                        </div>
                      )}
                      {event.duree && (
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4" />
                          {event.duree}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.lieu}
                      </div>
                    </div>

                    {event.descriptif && (
                      <p className="text-sm text-gray-700 mb-4 line-clamp-3">{event.descriptif}</p>
                    )}

                    <div className="space-y-2">
                      {event.lien_reservation && (
                        <Button 
                          onClick={() => window.open(event.lien_reservation, '_blank')}
                          className="w-full bg-gray-800 hover:bg-gray-900"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Réserver en ligne
                        </Button>
                      )}
                      {event.telephone_reservation && (
                        <Button 
                          onClick={() => window.open(`tel:${event.telephone_reservation}`, '_self')}
                          className={`w-full ${!event.lien_reservation 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                            : 'border-gray-600 text-gray-600 hover:bg-gray-50'}`}
                          variant={event.lien_reservation ? "outline" : "default"}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          {event.telephone_reservation}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Liste des événements passés */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-400 mb-4">Événements passés</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
              {pastEvents.map(event => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {getTypeBadge(event.type)}
                        <h3 className="text-xl font-bold text-gray-800 mt-2">{event.titre}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateEvent(event)}
                          title="Dupliquer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.lieu}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {futureEvents.length === 0 && pastEvents.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun événement trouvé</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Événement */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Modifier l'événement" : "Nouvel événement"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l'événement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="titre">Titre de l'événement *</Label>
              <Input
                id="titre"
                value={eventForm.titre}
                onChange={(e) => setEventForm(prev => ({ ...prev, titre: e.target.value }))}
                placeholder="Ex: Show Hypnose à Colmar"
              />
            </div>

            <div>
              <Label htmlFor="type">Type d'événement *</Label>
              <Select 
                value={eventForm.type} 
                onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value, heure: value === 'formation' ? '' : prev.heure, duree: value === 'formation' ? '' : prev.duree }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dj">🎵 Soirée DJ</SelectItem>
                  <SelectItem value="hypnose">🎭 Show Hypnose</SelectItem>
                  <SelectItem value="formation">📚 Formation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date de début *</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="date_fin">Date de fin (optionnel)</Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={eventForm.date_fin}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date_fin: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pour une période (ex: tout l'été)
                </p>
              </div>
            </div>

            {/* Heure et Durée - masqués pour les formations */}
            {eventForm.type !== 'formation' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="heure">Heure</Label>
                  <Input
                    id="heure"
                    type="time"
                    value={eventForm.heure}
                    onChange={(e) => setEventForm(prev => ({ ...prev, heure: e.target.value }))}
                    placeholder="20:30"
                  />
                </div>
                <div>
                  <Label htmlFor="duree">Durée du show</Label>
                  <Input
                    id="duree"
                    value={eventForm.duree}
                    onChange={(e) => setEventForm(prev => ({ ...prev, duree: e.target.value }))}
                    placeholder="Ex: 1h30, 2h"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="lieu">Lieu *</Label>
              <Input
                id="lieu"
                value={eventForm.lieu}
                onChange={(e) => setEventForm(prev => ({ ...prev, lieu: e.target.value }))}
                placeholder="Ex: Salle des fêtes, Colmar"
              />
            </div>

            <div>
              <Label htmlFor="descriptif">Descriptif</Label>
              <Textarea
                id="descriptif"
                value={eventForm.descriptif}
                onChange={(e) => setEventForm(prev => ({ ...prev, descriptif: e.target.value }))}
                placeholder="Description de l'événement..."
                rows={4}
              />
            </div>

            {/* Upload d'image */}
            <div>
              <Label>Photo de l'événement</Label>
              <div className="mt-2 space-y-3">
                {eventForm.photo_url && (
                  <div className="relative inline-block">
                    <img 
                      src={getImageUrl(eventForm.photo_url)} 
                      alt="Aperçu" 
                      className="w-40 h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      onClick={() => setEventForm(prev => ({ ...prev, photo_url: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingImage ? 'Upload...' : 'Choisir une image'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  JPG, PNG, WebP ou GIF (max 5 Mo)
                </p>
              </div>
            </div>

            {/* Étiquette/Badge */}
            <div>
              <Label htmlFor="etiquette">Étiquette (optionnel)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="etiquette"
                  value={eventForm.etiquette}
                  onChange={(e) => setEventForm(prev => ({ ...prev, etiquette: e.target.value }))}
                  placeholder="Ex: À ne pas louper, Gratuit, Nouveauté"
                />
                <div className="flex gap-1 flex-shrink-0">
                  {['Gratuit', 'Nouveauté', 'Complet'].map(tag => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setEventForm(prev => ({ ...prev, etiquette: tag }))}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Affiché en ruban sur la carte de l'événement
              </p>
            </div>

            <div>
              <Label htmlFor="lien_reservation">Lien de réservation</Label>
              <Input
                id="lien_reservation"
                value={eventForm.lien_reservation}
                onChange={(e) => setEventForm(prev => ({ ...prev, lien_reservation: e.target.value }))}
                placeholder="https://weezevent.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Lien vers votre système de billetterie (Weezevent, etc.)
              </p>
            </div>

            <div>
              <Label htmlFor="telephone_reservation">Téléphone de réservation</Label>
              <Input
                id="telephone_reservation"
                value={eventForm.telephone_reservation}
                onChange={(e) => setEventForm(prev => ({ ...prev, telephone_reservation: e.target.value }))}
                placeholder="07 83 55 36 74"
              />
              <p className="text-xs text-gray-500 mt-1">
                Numéro de téléphone pour réserver (optionnel)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveEvent}
              className="bg-gradient-to-r from-gray-700 to-gray-900"
            >
              {editingEvent ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Widget */}
      <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {widgetType === 'hypnose' ? 'Widget Hypnose' : 'Widget DJ'}
            </DialogTitle>
            <DialogDescription>
              {widgetType === 'hypnose' 
                ? 'Ce widget affichera uniquement vos événements Hypnose.'
                : 'Ce widget affichera uniquement vos soirées DJ.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                <code>{generateWidgetCode(widgetType)}</code>
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Instructions :</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Copiez le code ci-dessus</li>
                <li>Collez-le dans un bloc "Code HTML personnalisé" sur votre site</li>
                <li>Le widget s'affiche automatiquement avec vos événements</li>
                <li>Les événements passés disparaissent automatiquement</li>
              </ol>
            </div>

            <div className={`${widgetType === 'hypnose' ? 'bg-purple-50 border-purple-200' : widgetType === 'formation' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
              <h3 className="font-semibold text-sm mb-2">Options personnalisables :</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><code className={`${widgetType === 'hypnose' ? 'bg-purple-100' : widgetType === 'formation' ? 'bg-green-100' : 'bg-gray-100'} px-1 rounded`}>data-height="800"</code> → Hauteur du widget (en pixels)</li>
                <li><code className={`${widgetType === 'hypnose' ? 'bg-purple-100' : widgetType === 'formation' ? 'bg-green-100' : 'bg-gray-100'} px-1 rounded`}>data-width="100%"</code> → Largeur du widget</li>
                <li><code className={`${widgetType === 'hypnose' ? 'bg-purple-100' : widgetType === 'formation' ? 'bg-green-100' : 'bg-gray-100'} px-1 rounded`}>data-resize="1"</code> → Redimensionnement auto (1 = oui, 0 = non)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
              Fermer
            </Button>
            <Button 
              onClick={copyWidgetCode}
              className={widgetType === 'hypnose' ? 'bg-gradient-to-r from-purple-600 to-violet-600' : widgetType === 'formation' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-gray-700 to-gray-900'}
            >
              <Code className="mr-2 h-4 w-4" />
              Copier le code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aperçu */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" data-testid="billetterie-preview-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Aperçu du widget {previewType ? `- ${previewType.toUpperCase()}` : '- Tous'}
            </DialogTitle>
            <DialogDescription>
              Rendu tel qu'il apparaîtra sur votre site
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-200 rounded-lg p-3 overflow-auto" style={{ maxHeight: '65vh' }}>
            <BilletteriePreviewIframe type={previewType} />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                setShowPreviewDialog(false);
                openWidgetDialog(previewType);
              }}
              className="bg-gradient-to-r from-gray-700 to-gray-900"
            >
              <Code className="mr-2 h-4 w-4" />
              Obtenir le code widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BilletterieApp;
