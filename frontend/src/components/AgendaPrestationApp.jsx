import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { Trash2, Shield, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from './Navigation';
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
  const [settings, setSettings] = useState({ hidden_djs: [], deleted_djs: [] });
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  
  const [calendarView, setCalendarView] = useState('month');
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [settingsRes, djsRes, contractsRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/agenda-settings`),
        axios.get(`${API}/location/djs`),
        axios.get(`${API}/contracts2`),
        axios.get(`${API}/location/reservations`)
      ]);

      const loadedSettings = {
        hidden_djs: settingsRes.data.hidden_djs || [],
        deleted_djs: settingsRes.data.deleted_djs || []
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
          start: eventDate,
          end: eventDate,
          allDay: true,
          djId: officialId,
          djName: assignedDj.name,
          status: String(c.status)
        });
      });

      const allReservations = reservationsRes.data || [];
      const djReservations = allReservations.filter(r => r.booking_type === 'dj');

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
        
        let equipmentOpts = '';
        if (r.equipment && Array.isArray(r.equipment)) {
          const equips = r.equipment.map(e => typeof e === 'string' ? e : e.name).filter(Boolean);
          if (equips.length > 0) {
            equipmentOpts = `\nMatériel: ${equips.join(', ')}`;
          }
        }

        let pubTitle = r.event_name || r.event || 'Réservation DJ';

        let signature = `${officialId}_${startDate.toISOString().split('T')[0]}_reservation_${r.id}`;
        if (eventSignatures.has(signature)) return;
        eventSignatures.add(signature);

        parsedEvents.push({
          id: `res_${r.id}`,
          title: `[Matériel] ${pubTitle}${equipmentOpts}`,
          start: startDate,
          end: endDate,
          allDay: true,
          djId: officialId,
          djName: assignedDj.name,
          status: 'reservation'
        });
      });

      const availableDjs = Array.from(officialDjMap.values()).filter(d => !loadedSettings.deleted_djs.includes(d.id));
      setDjs(availableDjs);

      const filteredEvents = parsedEvents.filter(e => !loadedSettings.deleted_djs.includes(e.djId));
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

  const eventStyleGetter = (event) => {
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
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '4px 6px',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.3'
      }
    };
  };

  const displayedEvents = events.filter(e => !settings.hidden_djs.includes(e.djId));

  return (
    <div className="w-full flex-col h-screen bg-slate-50 text-left items-stretch overflow-hidden flex">
      <Navigation />
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
                      setCalendarDate(event.start);
                      setCalendarView('agenda');
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
                      toolbar: CustomToolbar
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
    </div>
  );
}
