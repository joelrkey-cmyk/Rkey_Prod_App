import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { Trash2, Shield, CalendarDays, Loader2, X, User, Tag, Key, Info, HelpCircle, RotateCw, Plus, MapPin, Edit, Phone } from 'lucide-react';
import { toast } from 'sonner';
import API_BASE_URL from '../utils/apiUrl';

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const API = `${API_BASE_URL}/api`;

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToToday = () => toolbar.onNavigate('TODAY');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-1 bg-white rounded-lg border p-1 shadow-sm">
        <button className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition" onClick={goToToday}>Aujourd'hui</button>
        <button className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition" onClick={goToBack}>&lt;</button>
        <button className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition" onClick={goToNext}>&gt;</button>
      </div>
      <div className="text-lg font-bold text-slate-800 capitalize">
        {toolbar.label}
      </div>
      <div className="flex items-center gap-1 bg-white rounded-lg border p-1 shadow-sm">
        {['month', 'agenda'].map(v => (
          <button 
            key={v}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition capitalize ${toolbar.view === v ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => toolbar.onView(v)}
          >
            {v === 'month' ? 'Mois' : 'Planning'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function AgendaPrestationApp() {
  const [events, setEvents] = useState([]);
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ hidden_djs: [], deleted_djs: [], deleted_events: [] });
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [undoableEvent, setUndoableEvent] = useState(null);
  const [undoSeconds, setUndoSeconds] = useState(5);
  const undoRef = useRef(null);
  const timerRef = useRef(null);
  
  const [calendarView, setCalendarView] = useState('month');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // State variables for manually added options and events
  const [addEventDate, setAddEventDate] = useState(null);
  const [addEventType, setAddEventType] = useState('option'); // 'option' or 'event'
  const [customEventForm, setCustomEventForm] = useState({ title: '', clientName: '', clientPhone: '', djId: '', eventType: '', details: '', location: '' });
  const [editingCustomEventId, setEditingCustomEventId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [settingsRes, djsRes, contractsRes, reservationsRes, customEventsRes] = await Promise.all([
        axios.get(`${API}/agenda-settings`),
        axios.get(`${API}/location/djs`),
        axios.get(`${API}/contracts2`),
        axios.get(`${API}/location/reservations`),
        axios.get(`${API}/agenda-custom-events`).catch(() => ({ data: [] }))
      ]);

      const loadedSettings = {
        hidden_djs: settingsRes.data.hidden_djs || [],
        deleted_djs: settingsRes.data.deleted_djs || [],
        deleted_events: settingsRes.data.deleted_events || []
      };
      setSettings(loadedSettings);
      
      const locationDjs = djsRes.data || [];
      const officialDjMap = new Map();
      
      const normalize = (str) => {
        if (!str) return "";
        return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      };
      
      const nameToOfficialId = new Map();
      
      locationDjs.forEach(d => {
        const id = String(d.id);
        const name = typeof d.name === 'string' ? d.name : (d.nom_artistique || String(d.name || d.id || 'DJ Inconnu'));
        officialDjMap.set(id, { ...d, id, name, active: true });
        
        const cleanName = normalize(name);
        nameToOfficialId.set(cleanName, id);
        
        const firstWord = cleanName.split(/[\s-]/)[0];
        if (firstWord && !nameToOfficialId.has(firstWord)) {
          nameToOfficialId.set(firstWord, id);
        }
      });
      // Mappings de rattrapage
      const joelId = nameToOfficialId.get(normalize("Joël R'Key"));
      if (joelId) nameToOfficialId.set("joel", joelId);
      
      const stefanId = nameToOfficialId.get(normalize("Stefan Edison"));
      if (stefanId) nameToOfficialId.set("stephane", stefanId);

      const allContracts = (contractsRes.data || []).filter(c => !['deleted', 'trash', 'draft'].includes(c.status));
      
      const parsedEvents = [];
      const eventSignatures = new Set();
      
      allContracts.forEach(c => {
        let rawDjId = typeof c.dj_profile === 'string' ? c.dj_profile : (c.dj_profile_data?.id || c.dj_profile?.id);
        let rawDjName = c.dj_profile_data?.nom_artistique || (typeof c.dj_profile === 'string' ? c.dj_profile : c.dj_profile?.nom_artistique || c.dj_profile?.name || "");
        
        let targetId = String(rawDjId || "");
        
        let officialId = null;
        if (officialDjMap.has(targetId)) {
          officialId = targetId;
        } else {
          let cleanName = normalize(rawDjName);
          if (nameToOfficialId.has(cleanName)) {
            officialId = nameToOfficialId.get(cleanName);
          } else {
            let firstWord = cleanName.split(/[\s-]/)[0];
            if (nameToOfficialId.has(firstWord)) {
              officialId = nameToOfficialId.get(firstWord);
            }
          }
        }
        
        // Uniquement les DJs officiels
        if (!officialId) return;

        let assignedDj = officialDjMap.get(officialId);

        let dateStr = c.client_info?.event_date || c.created_at;
        if (!dateStr) return;
        
        let eventDate = new Date(dateStr);
        if (isNaN(eventDate)) return;

        let type = c.client_info?.event_type || 'Événement';
        if (type && typeof type === 'string' && type.toLowerCase() === 'custom') {
          type = c.client_info?.custom_event_type || 'Événement Personnalisé';
        }
        if (typeof type !== 'string') type = 'Événement';
        
        let client = c.client_info?.name || c.client_name || '';
        if (typeof client !== 'string') {
          client = client.name || client.nom || 'Client Inconnu';
        }
        
        let title = String(`${type} - ${client}`.trim());
        if (title === '-') title = 'Événement sans nom';

        let optionsDetails = '';
        if (c.selected_options && Array.isArray(c.selected_options)) {
          const opts = c.selected_options.map(o => typeof o === 'string' ? o : o.name).filter(Boolean);
          if (opts.length > 0) {
            optionsDetails = `\nOptions: ${opts.join(', ')}`;
          }
        } else if (c.requested_options && Array.isArray(c.requested_options)) {
          const opts = c.requested_options.map(o => typeof o === 'string' ? o : o.name).filter(Boolean);
          if (opts.length > 0) {
            optionsDetails = `\nOptions: ${opts.join(', ')}`;
          }
        }
        
        let fullTitle = `${title}${optionsDetails}`;
        
        // Prevent duplicate mapping if somehow necessary, but contracts are unique by ID
        let signature = `${officialId}_${eventDate.toISOString().split('T')[0]}_contract_${c.id}`;
        if (eventSignatures.has(signature)) return;
        eventSignatures.add(signature);

        parsedEvents.push({
          id: `contract_${c.id}`,
          title: fullTitle,
          cleanTitle: title,
          start: eventDate,
          end: eventDate,
          allDay: true,
          djId: officialId,
          djName: assignedDj.name,
          clientName: client,
          clientPhone: c.client_info?.phone || c.phone || '',
          clientPhone2: c.client_info?.phone2 || '',
          eventType: type,
          status: String(c.status),
          type: 'Contrat Prestation',
          details: optionsDetails ? optionsDetails.trim() : '',
          location: c.client_info?.event_location || ''
        });
      });

      // Désactivation de l'affichage des réservations matériel [Matériel] sur l'agenda prestation
      const djReservations = [];

      djReservations.forEach(r => {
        let officialId = null;
        let cleanName = normalize(r.dj_name || '');
        if (nameToOfficialId.has(cleanName)) {
          officialId = nameToOfficialId.get(cleanName);
        } else {
          let firstWord = cleanName.split(/[\s-]/)[0];
          if (nameToOfficialId.has(firstWord)) {
            officialId = nameToOfficialId.get(firstWord);
          }
        }
        
        if (!officialId) return;
        
        let assignedDj = officialDjMap.get(officialId);
        
        let startDate = new Date(r.start_date);
        let endDate = new Date(r.end_date);
        if (isNaN(startDate) || isNaN(endDate)) return;
        
        const itemsList = r.equipment_items || r.items || [];
        const itemRefs = [];
        if (Array.isArray(itemsList)) {
          itemsList.forEach(item => {
            const ref = item.reference || '';
            if (ref && !itemRefs.includes(ref)) {
              itemRefs.push(ref);
            }
          });
        }
        
        let refsText = itemRefs.join('/');
        
        let equipmentOpts = '';
        if (Array.isArray(itemsList) && itemsList.length > 0) {
          const equips = itemsList.map(item => {
            const name = item.equipment_name || item.name || '';
            const qty = item.quantity || 1;
            const ref = item.reference || '';
            return `${name}${ref ? ` [${ref}]` : ''} (x${qty})`;
          }).filter(Boolean);
          if (equips.length > 0) {
            equipmentOpts = `\nMatériel: ${equips.join(', ')}`;
          }
        } else if (r.equipment && Array.isArray(r.equipment)) {
          const equips = r.equipment.map(e => typeof e === 'string' ? e : e.name).filter(Boolean);
          if (equips.length > 0) {
            equipmentOpts = `\nMatériel: ${equips.join(', ')}`;
          }
        }

        let pubTitle = r.event_name || r.event || 'Réservation DJ';
        let fullTitle = `[Matériel] ${refsText ? `${refsText} - ` : ''}${pubTitle}${equipmentOpts}`;

        let signature = `${officialId}_${startDate.toISOString().split('T')[0]}_reservation_${r.id}`;
        if (eventSignatures.has(signature)) return;
        eventSignatures.add(signature);

        parsedEvents.push({
          id: `res_${r.id}`,
          title: fullTitle,
          cleanTitle: pubTitle,
          start: startDate,
          end: endDate,
          allDay: true,
          djId: officialId,
          djName: assignedDj.name,
          clientName: r.client_name || r.client?.name || r.user_name || 'Client Réservation',
          eventType: 'Réservation Matériel',
          status: 'reservation',
          type: 'Réservation Matériel',
          details: refsText ? `Référence: ${refsText}${equipmentOpts ? ` | ${equipmentOpts.trim()}` : ''}` : (equipmentOpts ? equipmentOpts.trim() : '')
        });
      });

      // Parse custom manual events and options
      const customEventsList = customEventsRes?.data || [];
      customEventsList.forEach(item => {
        let eventDate = new Date(item.date);
        if (isNaN(eventDate)) return;

        parsedEvents.push({
          id: `custom_${item._id || item.id}`,
          title: item.title,
          cleanTitle: item.title,
          start: eventDate,
          end: eventDate,
          allDay: true,
          djId: item.isOption ? 'option_black' : (item.djId || ""),
          djName: item.isOption ? 'Option' : (item.djName || 'Non assigné'),
          clientName: item.clientName || '',
          clientPhone: item.clientPhone || '',
          eventType: item.eventType || (item.isOption ? 'Option' : 'Événement'),
          status: item.isOption ? 'option' : 'custom_event',
          type: item.isOption ? 'Option Soirée' : 'Événement Manuel',
          details: item.details || '',
          location: item.location || '',
          isOption: !!item.isOption
        });
      });

      const availableDjs = Array.from(officialDjMap.values()).filter(d => !loadedSettings.deleted_djs.includes(d.id));
      setDjs(availableDjs);

      const filteredEvents = parsedEvents
        .filter(e => e.isOption || !loadedSettings.deleted_djs.includes(e.djId))
        .filter(e => !loadedSettings.deleted_events.includes(e.id));
      setEvents(filteredEvents);

    } catch (error) {
      console.error("Error fetching agenda data:", error);
      toast.error("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDj = async (djId) => {
    try {
      const newHidden = settings.hidden_djs.includes(djId)
        ? settings.hidden_djs.filter(id => id !== djId)
        : [...settings.hidden_djs, djId];
        
      const newSettings = { ...settings, hidden_djs: newHidden };
      setSettings(newSettings);
      
      await axios.put(`${API}/agenda-settings`, newSettings);
    } catch (error) {
      toast.error("Erreur de sauvegarde");
    }
  };

  const handleDeleteDj = async (djId) => {
    try {
      const newDeleted = [...settings.deleted_djs, djId];
      const newSettings = { ...settings, deleted_djs: newDeleted };
      setSettings(newSettings);
      
      setDjs(djs.filter(d => d.id !== djId));
      setShowConfirmDelete(null);
      
      await axios.put(`${API}/agenda-settings`, newSettings);
      toast.success("Agenda supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeleteEvent = async (event) => {
    setSelectedEvent(null);
    
    if (event.id && event.id.startsWith('custom_')) {
      const customId = event.id.replace('custom_', '');
      try {
        await axios.delete(`${API}/agenda-custom-events/${customId}`);
        setEvents(prev => prev.filter(e => e.id !== event.id));
        toast.success("Option/Événement supprimé avec succès !");
      } catch (err) {
        console.error("Error deleting custom event:", err);
        toast.error("Erreur lors de la suppression définitive.");
      }
      return;
    }

    if (undoRef.current) {
      commitDeletion(undoRef.current);
    }
    
    undoRef.current = event;
    setUndoableEvent(event);
    setUndoSeconds(5);
    
    setEvents(prev => prev.filter(e => e.id !== event.id));
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setUndoSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          commitDeletion(undoRef.current);
          setUndoableEvent(null);
          undoRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveCustomEvent = async (e) => {
    e.preventDefault();
    if (!customEventForm.title || !customEventForm.title.trim()) {
      toast.error("Veuillez saisir un titre / nom d'événement.");
      return;
    }
    if (addEventType === 'event' && !customEventForm.djId) {
      toast.error("Veuillez attribuer un DJ.");
      return;
    }

    const payload = {
      title: customEventForm.title.trim(),
      date: format(addEventDate, 'yyyy-MM-dd'),
      isOption: addEventType === 'option',
      djId: addEventType === 'event' ? customEventForm.djId : null,
      djName: addEventType === 'event' ? djs.find(d => d.id === customEventForm.djId)?.name : '',
      clientName: addEventType === 'event' ? customEventForm.clientName.trim() : '',
      clientPhone: (customEventForm.clientPhone || '').trim(),
      eventType: addEventType === 'event' ? customEventForm.eventType.trim() : 'Option',
      details: customEventForm.details.trim(),
      location: (customEventForm.location || '').trim()
    };

    try {
      setLoading(true);
      if (editingCustomEventId) {
        const res = await axios.put(`${API}/agenda-custom-events/${editingCustomEventId}`, payload);
        if (res.data.success) {
          toast.success("Événement / Option modifié avec succès !");
          setCustomEventForm({ title: '', clientName: '', clientPhone: '', djId: '', eventType: '', details: '', location: '' });
          setAddEventDate(null);
          setEditingCustomEventId(null);
          await fetchData();
        } else {
          toast.error("Erreur lors de la modification.");
        }
      } else {
        const res = await axios.post(`${API}/agenda-custom-events`, payload);
        if (res.data.success) {
          toast.success(addEventType === 'option' ? "Option de soirée enregistrée avec succès !" : "Événement enregistré avec succès !");
          setCustomEventForm({ title: '', clientName: '', clientPhone: '', djId: '', eventType: '', details: '', location: '' });
          setAddEventDate(null);
          await fetchData();
        } else {
          toast.error("Erreur lors de l'enregistrement.");
        }
      }
    } catch (err) {
      console.error("Error saving custom event:", err);
      toast.error("Une erreur s'est produite lors de la communication de l'API.");
    } finally {
      setLoading(false);
    }
  };

  const handleUndoDelete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (undoRef.current) {
      const restored = undoRef.current;
      setEvents(prev => [...prev, restored]);
      toast.success("Suppression annulée !");
    }
    setUndoableEvent(null);
    undoRef.current = null;
  };

  const commitDeletion = async (eventToDelete) => {
    if (!eventToDelete) return;
    try {
      const updatedDeletedEvents = [...(settings.deleted_events || []), eventToDelete.id];
      const updatedSettings = { ...settings, deleted_events: updatedDeletedEvents };
      setSettings(updatedSettings);
      
      await axios.put(`${API}/agenda-settings`, updatedSettings);
      toast.info("L'événement a été retiré de l'agenda.");
    } catch (err) {
      console.error("Error committing event deletion:", err);
      toast.error("Erreur technique lors de la suppression définitive.");
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const eventStyleGetter = (event) => {
    if (event.isOption) {
      return {
        style: {
          backgroundColor: '#000000',
          borderRadius: '4px',
          opacity: 0.95,
          color: '#ffffff',
          border: '1px solid #111111',
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.2px',
          padding: '4px 8px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.4'
        }
      };
    }
    if (settings.hidden_djs.includes(event.djId)) {
      return { style: { display: 'none' } };
    }
    const dj = djs.find(d => d.id === event.djId);
    const backgroundColor = dj?.color || '#3174ad';
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#fff',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        fontWeight: '500',
        letterSpacing: '0.2px',
        padding: '4px 8px',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4'
      }
    };
  };

  const displayedEvents = events.filter(e => e.isOption || !settings.hidden_djs.includes(e.djId));

  return (
    <div className="w-full flex-col h-screen bg-slate-50 text-left items-stretch overflow-hidden flex">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Agenda Prestation</h1>
              <p className="text-sm text-slate-500">Vue globale des événements signés</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-150 disabled:opacity-50 text-indigo-700 font-semibold rounded-lg text-sm transition shadow-sm"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Sidebar DJs */}
          <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Agendas DJs
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : djs.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 italic">Aucun agenda disponible</div>
              ) : (
                <div className="space-y-1">
                  {djs.map(dj => (
                    <div key={dj.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                      <label className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden">
                        <input 
                          type="checkbox" 
                          checked={!settings.hidden_djs.includes(dj.id)} 
                          onChange={() => handleToggleDj(dj.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                        />
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dj.color || '#ccc' }}></div>
                        <span className="text-sm font-medium text-slate-700 truncate">{dj.name}</span>
                      </label>
                      <button 
                        onClick={() => setShowConfirmDelete(dj.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition flex-shrink-0"
                        title="Supprimer l'agenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendar View */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 overflow-hidden flex flex-col">
             {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-medium text-sm">Chargement du calendrier...</p>
                  </div>
                </div>
             ) : (
                <div className="flex-1">
                  <Calendar
                    localizer={localizer}
                    events={displayedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={calendarView}
                    date={calendarDate}
                    onView={setCalendarView}
                    onNavigate={setCalendarDate}
                    onDrillDown={(newDate) => {
                      setCalendarDate(newDate);
                      setCalendarView('agenda');
                    }}
                    onSelectEvent={(event) => {
                      setSelectedEvent(event);
                    }}
                    length={calendarView === 'agenda' ? 1 : undefined}
                    messages={{
                      next: "Suivant",
                      previous: "Précédent",
                      today: "Aujourd'hui",
                      month: "Mois",
                      week: "Semaine",
                      day: "Jour",
                      agenda: "Mode Liste",
                      noEventsInRange: "Aucun événement sur cette période.",
                      showMore: total => `+ ${total} de plus`
                    }}
                    culture="fr"
                    eventPropGetter={eventStyleGetter}
                    components={{
                      toolbar: CustomToolbar,
                      month: {
                        dateHeader: ({ date, label }) => {
                          return (
                            <div className="flex items-center justify-between w-full px-2 py-0.5 shrink-0 select-none">
                              <span className="text-sm font-semibold text-slate-700">{label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAddEventDate(date);
                                  setAddEventType('option');
                                  setCustomEventForm({ title: '', clientName: '', djId: '', eventType: '', details: '' });
                                }}
                                className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-300 hover:border-slate-900 flex items-center justify-center text-slate-600 transition-colors shrink-0 text-xs font-bold cursor-pointer"
                                title="Ajouter une option de soirée ou un événement"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }
                      }
                    }}
                    popup
                    dayLayoutAlgorithm="no-overlap"
                    views={['month', 'agenda']}
                  />
                </div>
             )}
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirmer la suppression</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Êtes-vous sûr de vouloir masquer et supprimer cet agenda DJ de cette vue ? Il ne s'affichera plus ici. 
              (L'artiste ne sera pas supprimé des autres applications).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmDelete(null)}
                className="px-4 py-2 font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleDeleteDj(showConfirmDelete)}
                className="px-4 py-2 font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-md">
                {selectedEvent.type || 'Événement'}
              </span>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950 leading-tight">
                  {selectedEvent.cleanTitle || selectedEvent.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                  {format(selectedEvent.start, 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="w-4.5 h-4.5 text-slate-400" />
                  <span className="text-slate-500">Client :</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.clientName || 'Inconnu'}</span>
                </div>

                {(selectedEvent.clientPhone || selectedEvent.clientPhone2) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4.5 h-4.5 text-indigo-500" />
                    <span className="text-slate-500">Téléphone :</span>
                    <div className="flex flex-wrap gap-x-2 text-indigo-600 font-semibold">
                      {selectedEvent.clientPhone && (
                        <a href={`tel:${selectedEvent.clientPhone}`} className="hover:underline">
                          {selectedEvent.clientPhone}
                        </a>
                      )}
                      {selectedEvent.clientPhone && selectedEvent.clientPhone2 && <span className="text-slate-300">/</span>}
                      {selectedEvent.clientPhone2 && (
                        <a href={`tel:${selectedEvent.clientPhone2}`} className="hover:underline">
                          {selectedEvent.clientPhone2}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2.5 text-sm">
                  <Shield className="w-4.5 h-4.5 text-slate-400" />
                  <span className="text-slate-500">DJ assigné :</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.djName}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4.5 h-4.5 text-slate-400" />
                    <span className="text-slate-500">Lieu :</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.details && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px] mb-1">Détails de la prestation / Matériel</span>
                    {selectedEvent.details}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with actions */}
            <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    if (window.confirm("Masquer définitivement cet événement du planning de prestation ? (Le contrat d'origine ou la réservation ne seront pas modifiés)")) {
                      handleDeleteEvent(selectedEvent);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 hover:text-red-700 rounded-lg text-sm font-semibold transition"
                  title="Supprime cet événement uniquement de la vue Prestation"
                >
                  <Trash2 className="w-4 h-4" />
                  Masquer
                </button>

                {selectedEvent.id && selectedEvent.id.startsWith('custom_') && (
                  <button 
                    onClick={() => {
                      setCustomEventForm({
                        title: selectedEvent.cleanTitle || selectedEvent.title || '',
                        clientName: selectedEvent.clientName || '',
                        clientPhone: selectedEvent.clientPhone || '',
                        djId: selectedEvent.djId === 'option_black' ? '' : (selectedEvent.djId || ''),
                        eventType: selectedEvent.eventType || '',
                        details: selectedEvent.details || '',
                        location: selectedEvent.location || ''
                      });
                      setAddEventDate(selectedEvent.start);
                      setAddEventType(selectedEvent.isOption ? 'option' : 'event');
                      setEditingCustomEventId(selectedEvent.id.replace('custom_', ''));
                      setSelectedEvent(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-650 hover:text-blue-700 rounded-lg text-sm font-semibold transition animate-shake"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-250 hover:bg-slate-350 text-slate-800 rounded-lg text-sm font-semibold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {undoableEvent && (
        <div className="fixed bottom-6 right-6 md:right-1/2 md:translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 min-w-[320px] max-w-md">
          <div className="flex-1 text-sm font-medium text-left">
            <div>Événement masqué avec succès</div>
            <div className="text-xs text-slate-350 mt-1 truncate max-w-[240px]">{undoableEvent.cleanTitle || undoableEvent.title}</div>
          </div>
          <button 
            onClick={handleUndoDelete}
            className="text-xs font-bold uppercase text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-750 rounded-lg transition-all"
          >
            Annuler ({undoSeconds}s)
          </button>
        </div>
      )}

      {addEventDate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CalendarDays className="w-4.5 h-4.5 text-indigo-500" />
                <span>{editingCustomEventId ? "Modifier l'événement du" : "Planifier pour le"} {format(addEventDate, 'dd MMMM yyyy', { locale: fr })}</span>
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setAddEventDate(null);
                  setEditingCustomEventId(null);
                  setCustomEventForm({ title: '', clientName: '', clientPhone: '', djId: '', eventType: '', details: '', location: '' });
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSaveCustomEvent} className="p-6 space-y-4">
              {/* Selector / Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => setAddEventType('option')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${addEventType === 'option' ? 'bg-black text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Tag className="w-4 h-4" />
                  Option de soirée
                </button>
                <button
                  type="button"
                  onClick={() => setAddEventType('event')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${addEventType === 'event' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <User className="w-4 h-4" />
                  Événement Manuel
                </button>
              </div>

              {addEventType === 'option' ? (
                // OPTION FORM
                <div className="space-y-4">
                  <div className="text-xs bg-slate-50 border border-slate-150 text-slate-650 p-3 rounded-lg leading-relaxed">
                    Les <strong>options de soirée</strong> sont marquées en <strong>noir et blanc</strong> et s'affichent par défaut pour tout le monde pour bloquer une date ou noter une possibilité.
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Titre de l'option / Client *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Option Mariage Dupuis ou Option Soirée Privée"
                      value={customEventForm.title}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone du client</label>
                    <input
                      type="text"
                      placeholder="Ex: 06 12 34 56 78"
                      value={customEventForm.clientPhone}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lieu de l'événement</label>
                    <input
                      type="text"
                      placeholder="Ex: Château de Versailles, Villebon..."
                      value={customEventForm.location}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Détails / Notes optionnelles</label>
                    <textarea
                      placeholder="Notes ou remarques particulières..."
                      rows={3}
                      value={customEventForm.details}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm resize-none"
                    />
                  </div>
                </div>
              ) : (
                // EVENT FORM
                <div className="space-y-4">
                  <div className="text-xs bg-indigo-50/50 border border-indigo-100 text-indigo-700 p-3 rounded-lg leading-relaxed">
                    Les <strong>événements manuels</strong> vous permettent d'enregistrer une prestation directement dans l'agenda sans générer de contrat et d'attribuer un DJ.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom de l'événement *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Soirée Entreprise Décathlon ou Mariage Julie"
                      value={customEventForm.title}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Attribuer un DJ / Artiste *</label>
                    {djs.length === 0 ? (
                      <div className="text-xs text-red-500 italic">Aucun DJ disponible. Veuillez d'abord en configurer un.</div>
                    ) : (
                      <select
                        required
                        value={customEventForm.djId}
                        onChange={(e) => setCustomEventForm(prev => ({ ...prev, djId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white shadow-sm"
                      >
                        <option value="">-- Sélectionnez un DJ --</option>
                        {djs.map(dj => (
                          <option key={dj.id} value={dj.id}>
                            {dj.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom du client</label>
                      <input
                        type="text"
                        placeholder="Dupuis"
                        value={customEventForm.clientName}
                        onChange={(e) => setCustomEventForm(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Type de soirée</label>
                      <input
                        type="text"
                        placeholder="Mariage, Anniversaire, Gala"
                        value={customEventForm.eventType}
                        onChange={(e) => setCustomEventForm(prev => ({ ...prev, eventType: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lieu de l'événement</label>
                    <input
                      type="text"
                      placeholder="Ex: Château de Versailles, Villebon..."
                      value={customEventForm.location}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone du client</label>
                    <input
                      type="text"
                      placeholder="Ex: 06 12 34 56 78"
                      value={customEventForm.clientPhone}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Détails de l'événement</label>
                    <textarea
                      placeholder="Remarques techniques, horaires, etc..."
                      rows={2}
                      value={customEventForm.details}
                      onChange={(e) => setCustomEventForm(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-gray-400 bg-white shadow-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-4 border-t flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAddEventDate(null);
                    setEditingCustomEventId(null);
                    setCustomEventForm({ title: '', clientName: '', clientPhone: '', djId: '', eventType: '', details: '', location: '' });
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-semibold rounded-lg text-white transition flex items-center justify-center gap-1.5 shadow-md ${addEventType === 'option' ? 'bg-black hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {editingCustomEventId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingCustomEventId ? "Modifier" : "Enregistrer"} {addEventType === 'option' ? "l'option" : "l'événement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
