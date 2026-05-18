import React, { useState, useEffect } from 'react';
import { Users, Music, Clock, Settings, User, Eye, Plus, Shield, MessageSquare, Headphones, Trash2, ArrowUp, ArrowDown, Copy, Check, ChevronDown, ChevronRight, ArrowLeft, Filter, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const DjClientApp = () => {
  const SCHEDULE_CATEGORIES = [
    { title: "Événements du Repas", type: 'repas', options: ["Apéritif", "Entrée", "Plat", "Fromage", "Dessert"] },
    { title: "Musique", type: 'musique', options: ["Entrée des mariés", "Ouverture de bal", "Danse de couple", "Musique de 80 à début 2000", "Musique de 80 à aujourd'hui"] },
    { title: "Animations", type: 'animations', options: ["Blind test", "Chasse au trésor", "Quiz interactif", "Show hypnose"] }
  ];

  const [currentRoute, setCurrentRoute] = useState({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' });
  const [expandedSections, setExpandedSections] = useState({ past: false }); 
  const [djProfiles, setDjProfiles] = useState([]);
  const [selectedDjFilter, setSelectedDjFilter] = useState('all');

  useEffect(() => {
    fetchDjProfiles();
  }, []);

  const fetchDjProfiles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/dj-fiches`, { headers });
      if (response.ok) {
        const data = await response.json();
        setDjProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching dj profiles:", error);
    }
  };

  // Données mockées pour la démonstration
  const [events, setEvents] = useState([
    {
      id: 1,
      name: "Mariage Sophie & Thomas",
      date: "2026-07-15",
      dj: { name: "DJ Mike", login: "dj.mike" },
      client: { name: "Sophie Dupont", login: "sophie.d" }
    },
    {
      id: 2,
      name: "Anniversaire Marc",
      date: "2025-11-20",
      dj: { name: "DJ Mike", login: "dj.mike" },
      client: { name: "Marc T.", login: "marc.t" }
    },
    {
      id: 3,
      name: "Gala d'Entreprise",
      date: "2026-12-10",
      dj: { name: "DJ Alex", login: "dj.alex" },
      client: { name: "Entreprise XYZ", login: "entreprise.xyz" }
    },
    {
      id: 4,
      name: "Nouvel An",
      date: "2027-12-31",
      dj: { name: "DJ Mike", login: "dj.mike" },
      client: { name: "Mairie", login: "mairie" }
    }
  ]);

  const [scheduleItems, setScheduleItems] = useState([
    { id: 1, time: "18:00", description: "Arrivée invités & Cocktail", type: "repas" },
    { id: 2, time: "20:00", description: "Entrée des mariés", type: "musique" },
    { id: 3, time: "23:00", description: "Ouverture du bal", type: "musique" }
  ]);
  
  const [notes, setNotes] = useState("");
  const [playlistLink, setPlaylistLink] = useState("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  const [manualMustPlay, setManualMustPlay] = useState("Shape of You - Ed Sheeran\nBillie Jean - Michael Jackson");
  const [blacklist, setBlacklist] = useState("Macarena\nLes démons de minuit");
  const [copiedLink, setCopiedLink] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  const filteredEvents = events.filter(e => {
    if (selectedDjFilter === 'all') return true;
    const djNameFilter = selectedDjFilter.toLowerCase();
    const evDjName = e.dj.name.toLowerCase();
    return evDjName.includes(djNameFilter) || djNameFilter.includes(evDjName);
  });

  const pastEvents = filteredEvents.filter(e => e.date < today);
  const futureEvents = filteredEvents.filter(e => e.date >= today);
  
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
    setScheduleItems([...scheduleItems, { id: Date.now(), time: "", description, type }]);
  };

  const removeScheduleItem = (id) => {
    setScheduleItems(scheduleItems.filter(item => item.id !== id));
  };

  const moveScheduleItem = (index, dir) => {
    if (index + dir < 0 || index + dir >= scheduleItems.length) return;
    const newItems = [...scheduleItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + dir];
    newItems[index + dir] = temp;
    setScheduleItems(newItems);
  };

  const updateScheduleItem = (id, field, value) => {
    setScheduleItems(scheduleItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const getDjLink = (dj) => {
    const slug = dj.login || dj.name.toLowerCase().replace(/\s+/g, '-');
    return `rkeprodapp.fr/${slug}`;
  };

  const getClientLink = (ev) => {
    const type = ev.name.split(' ')[0].toLowerCase().replace(/\s+/g, '-');
    const clientName = ev.client.name.toLowerCase().replace(/\s+/g, '-');
    return `rkeprodapp.fr/${type}-${clientName}`;
  };

  const EventTable = ({ eventsList }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left bg-white">
        <thead>
          <tr className="border-b text-sm text-gray-500 bg-gray-50">
            <th className="py-3 px-4 rounded-tl-lg font-semibold">Événement</th>
            <th className="py-3 px-4 font-semibold">Date</th>
            <th className="py-3 px-4 font-semibold">Accès DJ</th>
            <th className="py-3 px-4 font-semibold">Accès Client</th>
            <th className="py-3 px-4 text-right rounded-tr-lg font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {eventsList.map(ev => (
            <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-medium text-gray-900">{ev.name}</td>
              <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{ev.date}</td>
              <td className="py-4 px-4">
                <div className="text-sm font-medium mb-1">{ev.dj.name}</div>
                <div className="flex items-center gap-1">
                  <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded truncate max-w-[150px]">
                    {getDjLink(ev.dj)}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(`https://${getDjLink(ev.dj)}`); toast.success("Lien DJ copié"); }} 
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" 
                    title="Copier le lien DJ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setCurrentRoute({ view: 'dj-list', role: 'dj', eventId: null, mode: 'standalone_dj', activeDj: ev.dj })} 
                    className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition" 
                    title="Ouvrir le portail DJ"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="text-sm font-medium mb-1">{ev.client.name}</div>
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
              <td className="py-4 px-4 flex justify-end">
                <button 
                  onClick={() => setCurrentRoute({ view: 'detail', role: 'admin', eventId: ev.id, mode: 'dashboard' })}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                >
                  Gérer
                </button>
              </td>
            </tr>
          ))}
          {eventsList.length === 0 && (
            <tr><td colSpan="5" className="py-8 text-center text-gray-500 italic">Aucun événement.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const AdminListView = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-indigo-600" />
          Mirador Administrateur - DJ/Client
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 bg-gray-50 border p-2 rounded-lg">
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

      <div className="bg-white rounded-xl shadow-sm border p-6">
        
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
                  <EventTable eventsList={futureByYear[year]} />
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
              <EventTable eventsList={pastEvents} />
            </div>
          )}
        </div>

      </div>
    </div>
  );

  const ScheduleSection = ({ canEdit }) => {
    const [customItem, setCustomItem] = useState("");

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 md:col-span-2">
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
          <div className="space-y-6 mb-8 border-b pb-8">
            {SCHEDULE_CATEGORIES.map(category => (
              <div key={category.type}>
                <h4 className="font-semibold text-gray-800 mb-3">{category.title}</h4>
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
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  placeholder="Autre événement..." 
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={e => { if(e.key === 'Enter' && customItem) { addScheduleItem(customItem); setCustomItem(''); } }}
                />
                <button 
                  onClick={() => { if(customItem) { addScheduleItem(customItem); setCustomItem(''); } }}
                  className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
               <h4 className="font-semibold text-gray-800 mb-3 text-sm">Notes et observations pour le déroulement</h4>
               <textarea 
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 placeholder="Ajoutez ici des indications spécifiques..."
               />
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-800 mb-4">{canEdit ? 'Votre Programme' : 'Le Programme Prévu'}</h4>
          {scheduleItems.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun événement défini pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {scheduleItems.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-gray-50`}>
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
                      onChange={(e) => updateScheduleItem(item.id, 'time', e.target.value)}
                      className="border rounded px-2 py-1 text-sm font-medium w-24 bg-white"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <div className="font-bold text-gray-700 w-16">{item.time || '--:--'}</div>
                  )}

                  {canEdit ? (
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={(e) => updateScheduleItem(item.id, 'description', e.target.value)}
                      className="flex-1 border rounded px-3 py-1 text-sm bg-white"
                    />
                  ) : (
                    <div className="flex-1 font-medium">{item.description}</div>
                  )}

                  {canEdit && (
                    <button 
                      onClick={() => removeScheduleItem(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!canEdit && notes && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
              <span className="font-semibold block mb-1">Notes du DJ :</span>
              {notes}
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

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 md:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-600" />
            Playlist & Recommandations
          </h3>
        </div>
        
        <div className="space-y-6">
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
                 className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                 placeholder="Ajoutez des titres manuellement ici..."
               />
            </div>
          </div>
          
          <div className="border rounded-lg p-5 bg-red-50 border-red-100">
            <h4 className="font-semibold text-red-700 mb-3 text-base">À éviter (Blacklist)</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">
               Styles, artistes ou titres à ne pas passer
            </label>
            <textarea
              value={blacklist}
              onChange={(e) => setBlacklist(e.target.value)}
              className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              placeholder="Ex: Pas de hard rock, éviter The Black Eyed Peas..."
            />
          </div>
        </div>
      </div>
    );
  };

  const DetailView = () => {
    const ev = events.find(e => e.id === currentRoute.eventId) || events[0];
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

    return (
      <div className="space-y-6">
        {!isClientStandalone && (
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
            <button onClick={handleBack} className="flex items-center gap-2 text-indigo-700 hover:text-indigo-800 font-bold px-3 py-2 rounded-md hover:bg-indigo-100 transition">
              <ArrowLeft className="w-5 h-5" /> {isDjStandalone ? "Retour à mes événements" : "Retour à la liste"}
            </button>
            
            <div className="flex gap-2">
              {isDashboard && (
                <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'admin' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'admin' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Vue Admin</button>
              )}
              
              {(isDashboard || isDjStandalone) && (
                <>
                  <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'dj' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'dj' ? 'bg-yellow-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Vue DJ</button>
                  <button onClick={() => setCurrentRoute({ ...currentRoute, role: 'client' })} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute.role === 'client' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Vue Client</button>
                </>
              )}
            </div>
          </div>
        )}

        {currentRoute.role === 'admin' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-sm">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Espace Admin - {ev.name}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScheduleSection canEdit={true} />
              <PlaylistSection role="admin" />
            </div>
          </div>
        )}

        {currentRoute.role === 'dj' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-yellow-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Headphones className="w-8 h-8" />
                  Espace DJ - {ev.name}
                </h2>
                <div className="mt-4 flex gap-4 items-center">
                  <p className="opacity-90">Connecté en tant que: <span className="font-semibold">{ev.dj.name}</span></p>
                </div>
              </div>
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                <Headphones className="w-48 h-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScheduleSection canEdit={true} />
              <PlaylistSection role="dj" />
            </div>
          </div>
        )}

        {currentRoute.role === 'client' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-green-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                 <div className="flex flex-col mb-2">
                   <span className="text-green-200 text-sm font-semibold uppercase tracking-wider">{ev.name.split(' ')[0]}</span>
                 </div>
                 <h2 className="text-2xl font-bold flex items-center gap-2">
                   <Users className="w-8 h-8" />
                   Espace Client - {ev.client.name}
                 </h2>
               </div>
               <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                 <Users className="w-48 h-48" />
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScheduleSection canEdit={false} />
              <PlaylistSection role="client" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const DjStandaloneListView = () => {
    const activeDj = currentRoute.activeDj || { name: 'DJ' };
    const myEvents = events.filter(e => e.dj.name === activeDj.name);
    const past = myEvents.filter(e => e.date < today);
    const future = myEvents.filter(e => e.date >= today);

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
            <button 
              onClick={() => setCurrentRoute({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' })} 
              className="px-4 py-2 bg-yellow-700 hover:bg-yellow-800 rounded-lg text-sm transition-colors shadow flex items-center gap-2 w-fit"
            >
              <Eye className="w-4 h-4" /> Fermer l'aperçu
            </button>
           </div>
           <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
             <Headphones className="w-48 h-48" />
           </div>
        </div>

        <div className="grid gap-6">
            <h3 className="text-xl font-bold text-gray-800">Vos événements à venir</h3>
            {future.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {future.map(ev => (
                        <div key={ev.id} className="bg-white p-5 rounded-xl border shadow-sm hover:border-yellow-400 hover:shadow-md cursor-pointer transition group" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg text-gray-900 group-hover:text-yellow-600 transition-colors">{ev.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">{ev.date}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">Client : <span className="font-medium text-gray-800">{ev.client.name}</span></p>
                            <button className="text-yellow-600 font-medium text-sm flex items-center gap-1 group-hover:text-yellow-700">Ouvrir l'événement <ChevronRight className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">Aucun événement à venir.</p>
            )}

            <h3 className="text-xl font-bold text-gray-800 mt-6">Historique</h3>
            {past.length > 0 ? (
                <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-sm text-gray-500 border-b">
                            <tr><th className="p-4 font-semibold">Événement</th><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Client</th><th className="p-4"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {past.map(ev => (
                                <tr key={ev.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                                    <td className="p-4 font-medium">{ev.name}</td>
                                    <td className="p-4 text-gray-600">{ev.date}</td>
                                    <td className="p-4 text-gray-600">{ev.client.name}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-yellow-600 hover:underline text-sm font-medium">Consulter</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500">Aucun historique.</p>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      {currentRoute.view === 'list' && currentRoute.mode !== 'standalone_dj' && <AdminListView />}
      {currentRoute.view === 'dj-list' && currentRoute.mode === 'standalone_dj' && <DjStandaloneListView />}
      {currentRoute.view === 'detail' && <DetailView />}
      
      {currentRoute.mode === 'standalone_client' && (
         <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setCurrentRoute({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' })} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4" /> Fermer l'aperçu Client (Admin)
            </button>
         </div>
      )}
    </div>
  );
};

export default DjClientApp;
