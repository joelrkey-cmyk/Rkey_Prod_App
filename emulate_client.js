const fetch = require('node-fetch');

const today = new Date().toISOString().split('T')[0];

function normalizeString(str) {
  if (!str) return '';
  return String(str).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

async function run() {
  try {
    const slug = "mariage-stéphanie-mussler-et-corentin-christmann";
    const res = await fetch('http://localhost:3000/api/public/dj-client/' + encodeURIComponent(slug));
    if (!res.ok) {
      throw new Error("Failed to fetch public dj-client API");
    }
    const data = await res.json();
    console.log(`Loaded client event.`);

    // Simulate DjClientApp state init
    const contract = data.events[0];
    const availableOptions = data.availableOptions;
    
    console.log("Raw contract info:", contract.client_info?.name);

    const mappedEvent = (() => {
        const c = contract;
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
           rawContractData: c,
           eventType: eventType,
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
              unlimited_time: info.unlimited_time || false,
              guest_count: info.guest_count || ""
           },
           scheduleItems: c.event_order || [],
           djNotes: c.dj_notes || "",
           playlistLink: c.playlist_link || "",
           manualMustPlay: c.manual_must_play || "",
           blacklist: c.blacklist || "",
           entreeMaries: c.entree_maries || "",
           entreeMariesNotes: c.entree_maries_notes || "",
           ouvertureBal: c.ouverture_bal || "",
           ouvertureBalNotes: c.ouverture_bal_notes || "",
           dessert: c.dessert || "",
           dessertNotes: c.dessert_notes || "",
           dedicaces: c.dedicaces || "",
           customWeddingEvents: c.custom_wedding_events || [],
           selectedOptions: c.selected_options || [],
           requestedOptions: c.requested_options || [],
           chatMessages: c.chat_messages || [],
           selectedPdfNotes: c.selected_pdf_notes || [],
           eventDocuments: c.event_documents || [],
           notifications: c.notifications || { admin: {}, dj: {}, client: {} },
           cateringNotes: c.catering_notes || "",
           cateringDrinks: c.catering_drinks || false,
           cateringHotMealNoTable: c.catering_hot_meal_no_table || false,
           cateringHotMealNoTableQty: c.catering_hot_meal_no_table_qty !== undefined ? c.catering_hot_meal_no_table_qty : "",
           selectedMusicStyles: c.selected_music_styles || [],
           backgroundMusicAperitif: c.background_music_aperitif || "",
           showMusicStylesToClient: c.show_music_styles_to_client !== undefined ? c.show_music_styles_to_client : false,
           showFondSonoreToClient: c.show_fond_sonore_to_client !== undefined ? c.show_fond_sonore_to_client : false,
           showMandatToClient: c.show_mandat_to_client !== undefined ? c.show_mandat_to_client : false,
           showArtisteToClient: c.show_artiste_to_client !== undefined ? c.show_artiste_to_client : false,
           showEntrepriseToClient: c.show_entreprise_to_client !== undefined ? c.show_entreprise_to_client : false,
           client_photo: c.client_photo || null,
           venue_photos: c.venue_photos || [],
           venue_notes: c.venue_notes || "",
           has_limiteur_son: c.has_limiteur_son || false,
           has_detecteur_fumee: c.has_detecteur_fumee || false,
           has_no_limiteur_ni_detecteur: c.has_no_limiteur_ni_detecteur || false,
           has_wifi: c.has_wifi || false,
           has_4g_5g: c.has_4g_5g || false,
           optionsTarifNotes: c.options_tarif_notes || "",
           showOptionsTarifNotesToClient: c.show_options_tarif_notes_to_client !== undefined ? c.show_options_tarif_notes_to_client : false,
           playlistAudioFiles: c.playlist_audio_files || []
        };
    })();

    console.log("Mapped event successfully:", mappedEvent.name);

    // Any functions that could crash when rendering client view?
    // Let's check format functions
    const formatDateObj = (dateStr) => {
        if (!dateStr) return { dayOfWeek: '', dayNumber: '', month: '', year: '' };
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return { dayOfWeek: '', dayNumber: '', month: '', year: '' };
            const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
            const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
            return {
                dayOfWeek: days[date.getDay()],
                dayNumber: date.getDate(),
                month: months[date.getMonth()],
                year: date.getFullYear()
            };
        } catch (e) {
            console.error("FORMAT CRASH", e);
            return { dayOfWeek: '', dayNumber: '', month: '', year: '' };
        }
    };

    console.log("Date parsing:", formatDateObj(mappedEvent.date));

    // Sort chat messages?
    const sortedChat = [...mappedEvent.chatMessages].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log("Chat messages:", sortedChat.length);

    console.log("Client emulation passed.");

  } catch (err) {
    console.error("FAIL:", err);
  }
}
run();
