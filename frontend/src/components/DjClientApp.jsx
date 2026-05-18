import React, { useState, useEffect, useRef } from 'react';
import { Users, Music, Clock, Settings, User, Eye, Plus, Shield, MessageSquare, Headphones, Trash2, ArrowUp, ArrowDown, Copy, Check, ChevronDown, ChevronRight, ArrowLeft, Filter, Link as LinkIcon, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const DjClientApp = () => {
  const SCHEDULE_CATEGORIES = [
    { title: "Événements du Repas", type: 'repas', options: ["Apéritif", "Entrée", "Plat", "Fromage", "Dessert"] },
    { title: "Musique", type: 'musique', options: ["Entrée des mariés", "Ouverture de bal", "Danse de couple", "Musique de 80 à début 2000", "Musique de 80 à aujourd'hui"] },
    { title: "Animations", type: 'animations', options: ["Blind test", "Chasse au trésor", "Quiz interactif", "Show hypnose", "Confessionnal"] }
  ];

  const [currentRoute, setCurrentRoute] = useState({ view: 'list', role: 'admin', eventId: null, mode: 'dashboard' });
  const [expandedSections, setExpandedSections] = useState({ past: false }); 
  const [djProfiles, setDjProfiles] = useState([]);
  const [selectedDjFilter, setSelectedDjFilter] = useState('all');

  useEffect(() => {
    fetchDjProfiles();
    fetchContractsAsEvents();
  }, []);

  const [events, setEvents] = useState([]);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const fetchDjProfiles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/api/dj-fiches`, { headers });
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

  const fetchContractsAsEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const [contractsRes, archivedRes, optionsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/contracts2`, { headers }),
          fetch(`${BACKEND_URL}/api/contracts2/archived`, { headers }),
          fetch(`${BACKEND_URL}/api/material-options`, { headers })
      ]);

      if (optionsRes.ok) {
          const opts = await optionsRes.json();
          setAvailableOptions(opts);
      } else {
          const fallbackRes = await fetch(`${BACKEND_URL}/api/contract-options`, { headers });
          if (fallbackRes.ok) {
              const fOpts = await fallbackRes.json();
              setAvailableOptions(fOpts.options || fOpts || []);
          }
      }
      
      let allContracts = [];
      if (contractsRes.ok) {
          const data = await contractsRes.json();
          const active = data.filter(c => !['deleted', 'archived'].includes(c.status));
          allContracts = [...allContracts, ...active];
      }
      if (archivedRes.ok) {
          const data = await archivedRes.json();
          allContracts = [...allContracts, ...data];
      }
      
      const mappedEvents = allContracts.map(c => {
         const info = c.client_info || {};
         const clientName = info.name || c.client_name || 'Client inconnu';
         const eventType = info.event_type || 'Événement';
         
         let djName = c.dj_profile_data?.nom_artistique || c.dj_profile || "DJ";
         const normalizedDjNameLower = djName.toLowerCase();
         if (normalizedDjNameLower === 'joel' || normalizedDjNameLower === 'joël') {
             djName = "Joël R'Key";
         } else if (normalizedDjNameLower === 'stephane' || normalizedDjNameLower === 'stéphane') {
             djName = "Stefan Edison";
         }

         return {
            id: c.id,
            name: `${eventType} - ${clientName}`,
            date: info.event_date || c.event_date || '1970-01-01',
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
               unlimited_time: info.unlimited_time || false
            },
            scheduleItems: c.event_order || [],
            djNotes: c.dj_notes || "",
            playlistLink: c.playlist_link || "",
            manualMustPlay: c.manual_must_play || "",
            blacklist: c.blacklist || "",
            selectedOptions: c.selected_options || [],
            requestedOptions: c.requested_options || [],
            chatMessages: c.chat_messages || [],
            notifications: c.notifications || { admin: {}, dj: {}, client: {} }
         };
      });
      
      mappedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(mappedEvents);
    } catch (error) {
      console.error("Error fetching contracts as events:", error);
      toast.error("Erreur lors du chargement des événements");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const [scheduleItems, setScheduleItems] = useState([]);
  
  const [notes, setNotes] = useState("");
  const [playlistLink, setPlaylistLink] = useState("");
  const [manualMustPlay, setManualMustPlay] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (currentRoute.eventId) {
      const ev = events.find(e => e.id === currentRoute.eventId);
      if (ev) {
        setScheduleItems(ev.scheduleItems || []);
        setNotes(ev.djNotes || "");
        setPlaylistLink(ev.playlistLink || "");
        setManualMustPlay(ev.manualMustPlay || "");
        setBlacklist(ev.blacklist || "");
        setChatMessages(ev.chatMessages || []);
      }
    }
  }, [currentRoute.eventId, events]);

  const updateContractDb = async (eventId, payload) => {
    try {
      const ev = events.find(e => e.id === eventId);
      const finalPayload = { ...payload };

      if (!payload.notifications) {
          let section = null;
          if ('chat_messages' in payload) section = 'chat';
          if ('requested_options' in payload) section = 'options';
          if ('playlist_link' in payload || 'manual_must_play' in payload || 'blacklist' in payload) section = 'playlist';
          if ('event_order' in payload || 'dj_notes' in payload || 'client_info' in payload) section = 'planning';
          
          if (section && currentRoute.role) {
              const rolesToNotify = ['admin', 'dj', 'client'].filter(r => r !== currentRoute.role);
              const newNotifs = ev && ev.notifications ? JSON.parse(JSON.stringify(ev.notifications)) : {admin:{}, dj:{}, client:{}};
              rolesToNotify.forEach(r => {
                  if (!newNotifs[r]) newNotifs[r] = {};
                  newNotifs[r][section] = true;
              });
              finalPayload.notifications = newNotifs;
          }
      }

      const token = localStorage.getItem('access_token');
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      await fetch(`${BACKEND_URL}/api/contracts2/${eventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(finalPayload)
      });
      fetchContractsAsEvents();
    } catch(e) {
      console.error("Erreur lors de la sauvegarde: ", e);
    }
  };
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
    return `rkeyprodapp.fr/${slug}`;
  };

  const getClientLink = (ev) => {
    const type = ev.name.split(' ')[0].toLowerCase().replace(/\s+/g, '-');
    const clientName = ev.client.name.toLowerCase().replace(/\s+/g, '-');
    return `rkeyprodapp.fr/${type}-${clientName}`;
  };

  const EventTable = ({ eventsList }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left bg-white">
        <thead>
          <tr className="border-b text-sm text-gray-500 bg-gray-50">
            <th className="py-3 px-4 rounded-tl-lg font-semibold">Événement</th>
            <th className="py-3 px-4 font-semibold">Date</th>
            <th className="py-3 px-4 font-semibold">Accès DJ</th>
            <th className="py-3 px-4 rounded-tr-lg font-semibold">Accès Client</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {eventsList.map(ev => {
            const notifCount = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]).length : 0;
            return (
              <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentRoute({ view: 'detail', role: 'admin', eventId: ev.id, mode: 'dashboard' })}
                    className="font-medium text-gray-900 hover:text-indigo-600 hover:underline transition-colors text-left relative"
                  >
                    {ev.name}
                  </button>
                  {notifCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm">
                      {notifCount}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                  {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}-${ev.date.split('-')[1]}-${ev.date.split('-')[0]}` : ev.date : ''}
                </td>
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
            </tr>
            );
          })}
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
          <button 
            onClick={() => window.location.href = '/contracts2'} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
          >
            <Plus className="w-5 h-5" /> Ajouter un événement
          </button>
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

    const ev = events.find(e => e.id === currentRoute.eventId);

    if (!canEdit && scheduleItems.length === 0 && !notes) return null;

    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 md:col-span-2 ${getSectionHighlightClass('planning')}`}>
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
                 onBlur={(e) => { if (currentRoute.eventId) updateContractDb(currentRoute.eventId, { dj_notes: e.target.value })}}
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
                    <div className="font-bold text-gray-700 w-16">{item.time || '--:--'}</div>
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
      <div className={`bg-white rounded-xl shadow-sm border p-6 md:col-span-2 ${getSectionHighlightClass('playlist')}`}>
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

    const generateClientPDF = () => {
      const doc = new jsPDF();
      let y = 15;

      // Header Orange
      doc.setFillColor(234, 88, 12); // Tailwind orange-600
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text(ev.name.split(' ')[0].toUpperCase() || "ÉVÉNEMENT", 105, 12, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Espace Client - ${ev.client.name}`, 105, 20, { align: 'center' });
      
      y = 40;
      doc.setTextColor(0, 0, 0);
      
      const clientScheduleItems = scheduleItems || [];
      if (clientScheduleItems.length > 0) {
        doc.setFontSize(16);
        doc.text("Déroulement de Soirée", 15, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99);
        clientScheduleItems.forEach(item => {
          const itemLabel = item.isSurprise ? "Surprise" : (item.label || item.description);
          doc.text(`${item.time || '--:--'} - ${itemLabel}`, 15, y);
          y += 6;
          if (y > 280) { doc.addPage(); y = 20; }
        });
        y += 5;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("Playlist & Recommandations", 15, y);
      y += 8;

      if (playlistLink) {
        doc.setFontSize(12); doc.setTextColor(0, 0, 0);
        doc.text("Lien playlist:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(playlistLink, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }
      
      if (manualMustPlay) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(21, 128, 61); // green-700
        doc.text("À passer absolument:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(manualMustPlay, 180);
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

      if (notes) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0, 0, 0);
        doc.text("Notes DJ:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(notes, 180);
        doc.text(splitText, 15, y);
      }

      doc.save(`Recapitulatif_${ev.client.name.replace(/\s+/g, '_')}.pdf`);
    };

    const generateDjPDF = () => {
      const doc = new jsPDF();
      let y = 15;

      // Header Yellow
      doc.setFillColor(202, 138, 4); // Tailwind yellow-600
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text(ev.name.split(' ')[0].toUpperCase() || "ÉVÉNEMENT", 105, 12, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Espace DJ - ${ev.dj.name}`, 105, 20, { align: 'center' });
      
      y = 40;
      doc.setTextColor(0, 0, 0);
      
      const info = ev.contractInfo;
      if (info) {
        doc.setFontSize(16);
        doc.text("Informations Client", 15, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99);
        doc.text(`Nom complet : ${info.name || '-'}`, 15, y); y += 6;
        if (info.company) { doc.text(`Entreprise : ${info.company}`, 15, y); y += 6; }
        doc.text(`Email : ${info.email || '-'}`, 15, y); y += 6;
        doc.text(`Téléphone : ${info.phone || '-'} ${info.phone2 ? '/ ' + info.phone2 : ''}`, 15, y); y += 6;
        doc.text(`Lieu : ${info.location || '-'}`, 15, y); y += 10;
      }

      if (scheduleItems && scheduleItems.length > 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text("Déroulement de Soirée", 15, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99);
        scheduleItems.forEach(item => {
          const surpriseText = item.isSurprise ? " (SURPRISE)" : "";
          doc.text(`${item.time || '--:--'} - ${item.label || item.description}${surpriseText}`, 15, y);
          y += 6;
          if (y > 280) { doc.addPage(); y = 20; }
        });
        y += 5;
      }
      
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("Playlist & Recommandations", 15, y);
      y += 8;

      if (playlistLink) {
        doc.setFontSize(12); doc.setTextColor(0, 0, 0);
        doc.text("Lien playlist:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        doc.text(playlistLink, 15, y); y += 10;
      }
      
      if (manualMustPlay) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(21, 128, 61);
        doc.text("À passer absolument:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(manualMustPlay, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }

      if (blacklist) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(185, 28, 28);
        doc.text("À éviter (Blacklist):", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(blacklist, 180);
        doc.text(splitText, 15, y); y += splitText.length * 5 + 5;
      }

      if (notes) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0, 0, 0);
        doc.text("Notes DJ:", 15, y); y += 6;
        doc.setFontSize(10); doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(notes, 180);
        doc.text(splitText, 15, y);
      }

      doc.save(`Fiche_DJ_${ev.client.name.replace(/\s+/g, '_')}.pdf`);
    };

    const ClientInfoSection = () => {
      const info = ev.contractInfo;
      if (!info) return null;
      return (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Informations Client
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <p className="font-medium text-gray-900">{info.email}</p>
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
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lieu de l'événement</p>
              <p className="font-medium text-gray-900">{info.location}</p>
            </div>
          </div>
        </div>
      );
    };

    const PlanningSection = () => {
      const info = ev.contractInfo;
      const role = currentRoute.role;
      if (!info) return null;
      
      const [localInfo, setLocalInfo] = useState({
        setup_date: info.setup_date || "",
        setup_time: info.setup_time || "",
        start_time: info.start_time || "",
        end_time: (info.unlimited_time ? "" : info.end_time) || "",
        unlimited_time: info.unlimited_time || false
      });
      
      useEffect(() => {
        setLocalInfo({
          setup_date: info.setup_date || "",
          setup_time: info.setup_time || "",
          start_time: info.start_time || "",
          end_time: (info.unlimited_time ? "" : info.end_time) || "",
          unlimited_time: info.unlimited_time || false
        });
      }, [info]);
      
      const formatPlanningDate = (dateStr) => {
        if (!dateStr) return "Non définie";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const handleUpdate = (field, value) => {
        const updated = { ...localInfo, [field]: value };
        setLocalInfo(updated);
        
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
        <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 ${getSectionHighlightClass('planning')}`}>
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
                   value={localInfo.setup_date} 
                   onChange={(e) => handleUpdate('setup_date', e.target.value)}
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{formatPlanningDate(localInfo.setup_date)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Heure d'installation</p>
              {canEditBasic ? (
                 <input 
                   type="text" 
                   value={localInfo.setup_time} 
                   onChange={(e) => setLocalInfo({...localInfo, setup_time: e.target.value})}
                   onBlur={(e) => handleUpdate('setup_time', e.target.value)}
                   placeholder="Ex: 14h00, À définir..."
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{localInfo.setup_time || "À définir"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Début de prestation</p>
              {canEditBasic ? (
                 <input 
                   type="time" 
                   value={localInfo.start_time} 
                   onChange={(e) => handleUpdate('start_time', e.target.value)}
                   className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white"
                 />
              ) : (
                <p className="font-medium text-gray-900">{localInfo.start_time || "--:--"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fin de prestation</p>
              {canEditEnd ? (
                 <div className="flex items-center gap-3">
                   <input 
                     type="time" 
                     value={localInfo.end_time} 
                     onChange={(e) => handleUpdate('end_time', e.target.value)}
                     disabled={localInfo.unlimited_time}
                     className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 bg-white disabled:opacity-50"
                   />
                   <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer shrink-0">
                     <input 
                       type="checkbox" 
                       checked={localInfo.unlimited_time}
                       onChange={(e) => handleUpdate('unlimited_time', e.target.checked)}
                       className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                     />
                     Illimité
                   </label>
                 </div>
              ) : (
                <p className="font-medium text-gray-900">{localInfo.unlimited_time ? "Illimité" : (localInfo.end_time || "--:--")}</p>
              )}
            </div>
          </div>
        </div>
      );
    };

    const OptionsSection = () => {
      const contractOptions = ev.selectedOptions || [];
      const requestedOptions = ev.requestedOptions || [];
      const eventType = ev.contractInfo?.event_type;
      
      const nonSelectedOptions = availableOptions.filter(opt => 
        !contractOptions.some(co => co.id === opt.id || co.name === opt.name) &&
        !requestedOptions.some(ro => ro.id === opt.id || ro.name === opt.name) &&
        (!opt.event_categories || opt.event_categories.length === 0 || opt.event_categories.includes(eventType))
      );
      const role = currentRoute.role;

      const [basket, setBasket] = useState([]);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const toggleBasket = (opt) => {
        if (basket.some(o => o.id === opt.id)) {
          setBasket(basket.filter(o => o.id !== opt.id));
        } else {
          setBasket([...basket, opt]);
        }
      };

      const submitRequest = async () => {
        if (basket.length === 0) return;
        setIsSubmitting(true);
        try {
          const updatedRequestedOptions = [...requestedOptions, ...basket];
          const payload = { requested_options: updatedRequestedOptions };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const res = await fetch(`${BACKEND_URL}/api/contracts2/${ev.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            setBasket([]);
            await fetchContractsAsEvents();
            toast.success("Demandes d'options envoyées");
          }
        } catch (e) {
          console.error("Error submitting requested options", e);
        } finally {
          setIsSubmitting(false);
        }
      };

      const cancelRequestedOption = async (optToRemove) => {
        setIsSubmitting(true);
        try {
          const updatedRequestedOptions = requestedOptions.filter(opt => opt.name !== optToRemove.name);
          const payload = { requested_options: updatedRequestedOptions };
          
          const token = localStorage.getItem('access_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const res = await fetch(`${BACKEND_URL}/api/contracts2/${ev.id}`, {
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
          setIsSubmitting(false);
        }
      };

      return (
        <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 ${getSectionHighlightClass('options')}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-400" />
            Options de l'Événement
          </h3>
          
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
                            <button
                              onClick={() => cancelRequestedOption(opt)}
                              disabled={isSubmitting}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50"
                              title="Annuler l'option"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                      const isSelected = basket.some(o => o.id === opt.id);
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

                  {role === 'client' && basket.length > 0 && (
                    <button
                      onClick={submitRequest}
                      disabled={isSubmitting}
                      className="w-full mt-4 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isSubmitting ? 'Envoi en cours...' : `Soumettre la demande (${basket.length} option${basket.length > 1 ? 's' : ''})`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Toutes les options disponibles ont été sélectionnées.</p>
              )}
            </div>
          </div>
        </div>
      );
    };

    const ChatSection = () => {
      const [newMessage, setNewMessage] = useState("");
      const messagesEndRef = useRef(null);
      
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      };

      useEffect(() => {
        scrollToBottom();
      }, [chatMessages]);

      const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg = {
          id: Date.now().toString(),
          text: newMessage,
          senderRole: currentRoute.role, // 'admin', 'dj', 'client'
          senderName: currentRoute.role === 'admin' ? "R'Key Prod" : (currentRoute.role === 'dj' ? (ev.dj?.name || 'DJ') : (ev.contractInfo?.company || ev.client?.name || 'Client')),
          timestamp: new Date().toISOString()
        };
        const updatedChat = [...chatMessages, msg];
        setChatMessages(updatedChat);
        setNewMessage("");
        
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

      return (
        <div className={`bg-orange-50 rounded-xl shadow-lg border border-orange-200 p-6 mb-6 mt-6 relative overflow-hidden ${getSectionHighlightClass('chat') ? getSectionHighlightClass('chat') : 'ring-4 ring-orange-500/10'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-orange-900">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              Espace Discussion
            </h3>
            {currentRoute.role === 'admin' && chatMessages.length > 0 && (
              <button onClick={downloadChat} className="text-sm font-medium text-orange-700 hover:text-orange-900 flex items-center gap-1 bg-white px-3 py-1.5 rounded-md shadow-sm border border-orange-100 transition-colors">
                <Download className="w-4 h-4" /> Exporter la conversation
              </button>
            )}
          </div>
          
          <div className="bg-white/80 rounded-lg p-4 h-64 overflow-y-auto flex flex-col gap-3 mb-4 border border-orange-100 shadow-inner">
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
            <div ref={messagesEndRef} />
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Écrivez votre message..."
              className="flex-1 border border-orange-200 rounded-md p-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none focus:border-orange-500 bg-white placeholder-orange-300"
            />
            <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-orange-600 text-white px-5 py-2.5 rounded-md font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm disabled:shadow-none font-semibold">
              Envoyer
            </button>
          </div>
        </div>
      );
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

        <ClientInfoSection />
        <ChatSection />
        <PlanningSection />
        <OptionsSection />

        {currentRoute.role === 'admin' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScheduleSection canEdit={true} />
              <PlaylistSection role="admin" />
            </div>
          </div>
        )}

        {currentRoute.role === 'dj' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-yellow-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Headphones className="w-8 h-8" />
                    Espace DJ - {ev.name}
                  </h2>
                  <div className="mt-4 flex gap-4 items-center">
                    <p className="opacity-90">Connecté en tant que: <span className="font-semibold">{ev.dj.name}</span></p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScheduleSection canEdit={true} />
              <PlaylistSection role="dj" />
            </div>
          </div>
        )}

        {currentRoute.role === 'client' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-green-600 text-white p-6 rounded-xl shadow-sm relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                   <div className="flex flex-col mb-2">
                     <span className="text-green-200 text-sm font-semibold uppercase tracking-wider">{ev.name.split(' ')[0]}</span>
                   </div>
                   <h2 className="text-2xl font-bold flex items-center gap-2">
                     <Users className="w-8 h-8" />
                     Espace Client - {ev.client.name}
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

    const futureByYear = future.reduce((acc, ev) => {
      const year = ev.date.substring(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(ev);
      return acc;
    }, {});

    const [expandedYears, setExpandedYears] = useState({});

    const toggleYear = (year) => {
      setExpandedYears(prev => ({ ...prev, [year]: prev[year] === false ? true : false }));
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
            {Object.keys(futureByYear).length > 0 ? (
                <div className="space-y-4">
                    {Object.keys(futureByYear).sort().map(year => (
                        <div key={year} className="bg-white border rounded-xl overflow-hidden shadow-sm">
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
                                {expandedYears[year] !== false ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            {expandedYears[year] !== false && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left bg-white">
                                        <thead className="bg-gray-50 text-sm text-gray-500 border-b border-t">
                                            <tr>
                                                <th className="p-4 font-semibold">Événement</th>
                                                <th className="p-4 font-semibold">Date</th>
                                                <th className="p-4 font-semibold">Client</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {futureByYear[year].map(ev => {
                                                const notifCount = ev.notifications && ev.notifications[currentRoute.role] ? Object.keys(ev.notifications[currentRoute.role]).length : 0;
                                                return (
                                                <tr key={ev.id} className="hover:bg-yellow-50 transition cursor-pointer group" onClick={() => setCurrentRoute({ view: 'detail', role: 'dj', eventId: ev.id, mode: 'standalone_dj', activeDj })}>
                                                    <td className="p-4 font-medium text-gray-900 group-hover:text-yellow-700 flex items-center gap-2">
                                                        {ev.name}
                                                        {notifCount > 0 && (
                                                            <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm">
                                                                {notifCount}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                                            {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}/${ev.date.split('-')[1]}/${ev.date.split('-')[0]}` : ev.date : ''}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-600">{ev.client.name}</td>
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
                            )}
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
                                    <td className="p-4 text-gray-600">
                                        {ev.date ? ev.date.split('-').length === 3 ? `${ev.date.split('-')[2]}-${ev.date.split('-')[1]}-${ev.date.split('-')[0]}` : ev.date : ''}
                                    </td>
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

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24 relative">
      {hasAnyNotifications() && (
          <div className="flex justify-end mb-4">
              <button onClick={clearAllNotifications} className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Marquer toutes les notifications comme lues
              </button>
          </div>
      )}
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
