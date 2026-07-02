const fetch = require('node-fetch');

// Emulate some react state set functions
const today = new Date().toISOString().split('T')[0];

function normalizeString(str) {
  if (!str) return '';
  return String(str).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ''); // keep only alpha-numeric characters
}

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/public/dj-client/stefan-edison');
    if (!res.ok) {
      throw new Error("Failed to fetch public dj-client API");
    }
    const data = await res.json();
    const allContracts = data.events || [];
    console.log(`Loaded ${allContracts.length} contracts.`);

    // 1. Emulate mappedEvents mapping
    console.log("Emulating mappedEvents mapping...");
    const mappedEvents = allContracts.map((c, idx) => {
      try {
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
      } catch (err) {
        console.error(`CRITICAL error mapping event index ${idx}:`, err);
        throw err;
      }
    });
    console.log("Mapping completed successfully.");

    // 2. Emulate DjStandaloneListView variables computation
    console.log("Emulating DjStandaloneListView computation...");
    const activeDj = { name: data.djName || 'Stefan Edison' };
    const currentRoute = { role: 'dj', view: 'dj-list' };
    const activeDjNorm = normalizeString(activeDj.name);

    const myEvents = mappedEvents.filter((e, idx) => {
      try {
        if (!e.dj) return false;
        return normalizeString(e.dj.name) === activeDjNorm || 
               normalizeString(e.dj.login) === activeDjNorm ||
               (e.rawContractData && (
                  normalizeString(e.rawContractData.dj_profile) === activeDjNorm ||
                  (e.rawContractData.dj_profile_data && normalizeString(e.rawContractData.dj_profile_data.nom_artistique) === activeDjNorm)
               ));
      } catch (err) {
        console.error(`CRITICAL error filtering event index ${idx}:`, err);
        throw err;
      }
    });

    console.log(`Filtering completed. Found ${myEvents.length} events for ${activeDj.name}.`);

    const priorityDjEvents = myEvents.filter((e, idx) => {
      try {
        const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
        return notifs.length > 0;
      } catch (err) {
        console.error(`CRITICAL error getting priority events for index ${idx}:`, err);
        throw err;
      }
    });

    const remainingDjEvents = myEvents.filter((e, idx) => {
      try {
        const notifs = e.notifications && e.notifications[currentRoute.role] ? Object.keys(e.notifications[currentRoute.role]) : [];
        return notifs.length === 0;
      } catch (err) {
        console.error(`CRITICAL error getting remaining events for index ${idx}:`, err);
        throw err;
      }
    });

    console.log(`Priority events: ${priorityDjEvents.length}, Remaining: ${remainingDjEvents.length}`);

    const past = remainingDjEvents.filter(e => e.date < today);
    const future = remainingDjEvents.filter(e => e.date >= today);

    console.log(`Past: ${past.length}, Future: ${future.length}`);

    const futureByYear = future.reduce((acc, ev, idx) => {
      try {
        const year = ev.date.substring(0, 4);
        if (!acc[year]) acc[year] = [];
        acc[year].push(ev);
        return acc;
      } catch (err) {
        console.error(`CRITICAL error grouping future event index ${idx}, date="${ev.date}":`, err);
        throw err;
      }
    }, {});

    console.log("Years found:", Object.keys(futureByYear));

    console.log("SUCCESS! NO CRASHES DETECTED IN EMULATION!");
  } catch (err) {
    console.error("FAIL:", err);
  }
}

run();
