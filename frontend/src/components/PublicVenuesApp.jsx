import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import { 
  MapPin, Building2, Search, Wifi, Smartphone, VolumeX, Flame, 
  Image, Compass, HelpCircle, ArrowUpRight, ChevronLeft, ChevronRight, Download, X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';

const API_BASE_URL = '/api';

export default function PublicVenuesApp() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  // Lightbox / Image Previewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOpenLightbox = (images, index = 0) => {
    setLightboxImages(images || []);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  
  // Filters
  const [filterWifi, setFilterWifi] = useState(false);
  const [filter4g, setFilter4g] = useState(false);
  const [filterLimiter, setFilterLimiter] = useState(false);
  const [filterSmoke, setFilterSmoke] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/public/venues`);
      setVenues(response.data);
    } catch (err) {
      console.error('Error loading public venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(venues.map(v => v.department).filter(Boolean))].sort();
  const cities = [...new Set(venues.map(v => v.city).filter(Boolean))].sort();

  // Filter venues
  const filteredVenues = venues.filter(v => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (v.name || '').toLowerCase().includes(query);
    const cityMatch = (v.city || '').toLowerCase().includes(query);
    const deptMatch = (v.department || '').toLowerCase().includes(query);
    const textMatch = nameMatch || cityMatch || deptMatch;

    const matchesDept = !selectedDept || v.department === selectedDept;
    const matchesCity = !selectedCity || v.city === selectedCity;

    const matchesWifi = !filterWifi || v.has_wifi;
    const matches4g = !filter4g || v.has_4g_5g;
    const matchesLimiter = !filterLimiter || v.has_limiteur_son;
    const matchesSmoke = !filterSmoke || v.has_detecteur_fumee;

    return textMatch && matchesDept && matchesCity && matchesWifi && matches4g && matchesLimiter && matchesSmoke;
  });

  // Grouping structure: Department -> City -> Venues
  const groupedVenues = {};
  filteredVenues.forEach(v => {
    const dept = v.department || 'Non spécifié';
    const city = v.city || 'Non spécifié';
    if (!groupedVenues[dept]) groupedVenues[dept] = {};
    if (!groupedVenues[dept][city]) groupedVenues[dept][city] = [];
    groupedVenues[dept][city].push(v);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Brand Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white py-14 px-6 shadow-md mb-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-600/30 p-2.5 rounded-xl border border-indigo-500/30">
              <Compass className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest bg-indigo-900/40 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                Espace Public de Partage
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                Nos Lieux de Réception
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed mt-2">
            Consultez les informations et fiches techniques des plus beaux domaines et salles de réception partenaires pour votre prochain événement.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Search and Filters panel */}
        <div className="bg-white rounded-2xl border p-6 mb-10 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher une salle, ville, département..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-slate-200 focus:border-indigo-500 rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 h-11 font-medium text-slate-700 cursor-pointer"
              >
                <option value="">Tous les départements</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 h-11 font-medium text-slate-700 cursor-pointer"
              >
                <option value="">Toutes les villes</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-slate-100 text-xs sm:text-sm">
            <span className="font-semibold text-slate-500 self-center">Filtrer par équipement :</span>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
              <input type="checkbox" checked={filterWifi} onChange={(e) => setFilterWifi(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
              <span>Wi-Fi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
              <input type="checkbox" checked={filter4g} onChange={(e) => setFilter4g(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
              <span>Réseau 4G/5G</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
              <input type="checkbox" checked={filterLimiter} onChange={(e) => setFilterLimiter(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
              <span>Sans limiteur acoustique</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
              <input type="checkbox" checked={filterSmoke} onChange={(e) => setFilterSmoke(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
              <span>Sans détecteur de fumée</span>
            </label>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-semibold">Récupération des plus beaux lieux...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="bg-white rounded-2xl border p-16 text-center shadow-sm max-w-xl mx-auto mt-6">
            <Compass className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Aucun lieu disponible</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              Aucun lieu correspondant à vos filtres n'est publié pour le moment. Veuillez élargir vos critères de recherche.
            </p>
          </div>
        ) : (
          /* Structured Accordions / Sections (Sectorized by Department -> City) */
          <div className="space-y-10">
            {Object.entries(groupedVenues).map(([dept, citiesMap]) => (
              <div key={dept} className="space-y-6">
                <div className="bg-indigo-50/80 border border-indigo-100/50 px-4 py-2.5 rounded-xl text-indigo-900 font-black text-sm uppercase tracking-wider flex items-center gap-2 w-fit">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Département : {dept}
                </div>

                <div className="pl-4 sm:pl-6 space-y-8 border-l-2 border-indigo-100/80">
                  {Object.entries(citiesMap).map(([city, hallList]) => (
                    <div key={city} className="space-y-4">
                      <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                        <span className="bg-slate-200/80 text-slate-700 text-xs px-3 py-1.5 rounded-lg uppercase tracking-wide">
                          {city}
                        </span>
                      </h3>

                      <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                        {hallList.map((venue, idx) => {
                          return (
                            <div key={venue.id} className={`pt-6 first:pt-0 flex flex-col lg:flex-row gap-6 justify-between items-start`}>
                              {/* Left column / Details */}
                              <div className="flex-1 min-w-0 space-y-3">
                                <div>
                                  <h4 className="text-lg font-bold text-slate-900 tracking-tight">{venue.name}</h4>
                                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {venue.city} ({venue.department})
                                  </div>
                                </div>

                                {/* Characteristics checklist */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${venue.has_wifi ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 line-through'}`}>
                                    <Wifi className="w-3.5 h-3.5" /> Wi-Fi
                                  </span>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${venue.has_4g_5g ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 line-through'}`}>
                                    <Smartphone className="w-3.5 h-3.5" /> Réseau 4G/5G
                                  </span>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${venue.has_limiteur_son ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                    <VolumeX className="w-3.5 h-3.5" /> {venue.has_limiteur_son ? 'Limiteur Acoustique' : 'Aucun Limiteur'}
                                  </span>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${venue.has_detecteur_fumee ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                    <Flame className="w-3.5 h-3.5" /> {venue.has_detecteur_fumee ? 'Détecteur de Fumée' : 'Aucun Détecteur'}
                                  </span>
                                </div>

                                {/* Technical notes */}
                                {venue.notes && (
                                  <div className="bg-indigo-50/40 border border-indigo-100/40 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    <div className="font-extrabold text-indigo-950 flex items-center gap-1.5 mb-1.5 uppercase tracking-wider text-[10px]">
                                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                                      Indications & Notes techniques :
                                    </div>
                                    {venue.notes}
                                  </div>
                                )}
                              </div>

                              {/* Right column / Photos */}
                              <div className="w-full lg:w-48 xl:w-56 shrink-0">
                                {venue.venue_photos && venue.venue_photos.length > 0 ? (
                                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                                    {venue.venue_photos.slice(0, 3).map((photo, index) => (
                                      <div 
                                        key={photo.id} 
                                        className="relative aspect-video lg:aspect-[4/3] rounded-lg overflow-hidden border border-slate-100 cursor-pointer group"
                                        onClick={() => handleOpenLightbox(venue.venue_photos, index)}
                                      >
                                        <img src={photo.url} alt="Salle" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        {index === 2 && venue.venue_photos.length > 3 ? (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                                            +{venue.venue_photos.length - 3} Photos
                                          </div>
                                        ) : (
                                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-white bg-slate-900/65 px-2 py-1 rounded">Agrandir</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center bg-slate-50 flex flex-col items-center justify-center gap-1 h-24 lg:h-32">
                                    <Image className="w-5 h-5 text-slate-300" />
                                    <span className="text-[10px] text-slate-400 font-medium">Pas d'images</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Photo Preview Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-slate-950/95 border-none text-white overflow-hidden flex flex-col items-center justify-center min-h-[50vh] max-h-[90vh]">
          {lightboxImages.length > 0 && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header inside lightbox */}
              <div className="flex justify-between items-center p-4 bg-slate-900/85 z-10 w-full text-white border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Photo {lightboxIndex + 1} / {lightboxImages.length}
                </span>
                <div className="flex items-center gap-2">
                  <a 
                    href={lightboxImages[lightboxIndex].url} 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                    title="Télécharger la photo"
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

              {/* Image and navigation */}
              <div className="flex-1 flex items-center justify-between p-6 relative min-h-[350px] max-h-[60vh] overflow-hidden">
                {lightboxImages.length > 1 && (
                  <button
                    onClick={() => setLightboxIndex(prev => (prev === 0 ? lightboxImages.length - 1 : prev - 1))}
                    className="absolute left-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/95 text-white transition-colors border border-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                <div className="w-full h-full flex items-center justify-center">
                  <img 
                    src={lightboxImages[lightboxIndex].url} 
                    alt={`Photo ${lightboxIndex + 1}`} 
                    className="max-w-full max-h-[55vh] object-contain rounded select-none shadow-2xl" 
                  />
                </div>

                {lightboxImages.length > 1 && (
                  <button
                    onClick={() => setLightboxIndex(prev => (prev === lightboxImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/95 text-white transition-colors border border-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Thumbnails strip */}
              {lightboxImages.length > 1 && (
                <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex gap-2 items-center justify-center overflow-x-auto max-w-full">
                  {lightboxImages.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setLightboxIndex(idx)}
                      className={`relative w-12 h-12 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
