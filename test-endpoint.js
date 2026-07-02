const { MongoClient } = require('mongodb');

async function testEndpoint() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rkey_prod";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const slug = decodeURIComponent("mariage-stéphanie-mussler-et-corentin-christmann").toLowerCase();
    console.log("Raw decoded slug to test:", slug);

    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, ''); // keep only alpha-numeric characters
    };

    const normalizedRequestedSlug = normalizeString(slug);
    console.log("Normalized requested slug:", normalizedRequestedSlug);

    // Fetch DJ profiles
    const allDjProfiles = await db.collection('dj_profiles').find({}).toArray();
    const matchedDjProfile = allDjProfiles.find(p => {
      return normalizeString(p.nom_artistique) === normalizedRequestedSlug ||
             normalizeString(p.nom_complet) === normalizedRequestedSlug ||
             normalizeString(p.id) === normalizedRequestedSlug;
    });
    console.log("Matched DJ profile:", matchedDjProfile ? matchedDjProfile.nom_artistique : "None");

    // Fetch contracts
    const contracts = await db.collection('contracts2').find({ status: { $in: ['sent', 'archived', 'completed'] } }).toArray();
    console.log("Found contracts with status sent/archived/completed:", contracts.length);
    
    const mappedEvents = contracts.map(c => {
      const info = c.client_info || {};
      let clientName = info.name || c.client_name || 'Client inconnu';
      if (typeof clientName !== 'string') {
        clientName = String(clientName || 'Client inconnu');
      }
      let eventType = info.event_type || 'Événement';
      if (typeof eventType !== 'string') {
        eventType = String(eventType || 'Événement');
      }
      
      const matchedProfile = allDjProfiles.find(p => p.id === c.dj_profile || p._id?.toString() === c.dj_profile);
      
      let djName = c.dj_profile_data?.nom_artistique || (matchedProfile ? (matchedProfile.nom_artistique || matchedProfile.nom_complet) : null) || c.dj_profile || "DJ";
      if (typeof djName !== 'string') {
        djName = String(djName || "DJ");
      }
      const normalizedDjNameLower = djName.toLowerCase();
      if (normalizedDjNameLower === 'joel' || normalizedDjNameLower === 'joël') {
        djName = "Joël R'Key";
      } else if (normalizedDjNameLower === 'stephane' || normalizedDjNameLower === 'stéphane') {
        djName = "Stefan Edison";
      }
      
      const djLogin = djName.toLowerCase().replace(/\s+/g, '-');
      const typeLower = eventType.split(' ')[0].toLowerCase().replace(/\s+/g, '-');
      const clientNameLower = clientName.toLowerCase().replace(/\s+/g, '-');
      const clientSlug = `${typeLower}-${clientNameLower}`;
      
      return {
        id: c.id || c._id?.toString(),
        djLogin,
        clientSlug,
        djName,
        clientName,
        eventType,
        status: c.status
      };
    });

    console.log("First 3 mapped events clientSlugs:");
    mappedEvents.slice(0, 3).forEach(e => {
      console.log(`- clientSlug: "${e.clientSlug}", normalized: "${normalizeString(e.clientSlug)}"`);
    });

    // Check if it's a DJ slug
    const djEvents = mappedEvents.filter(e => {
      return normalizeString(e.djLogin) === normalizedRequestedSlug || 
             normalizeString(e.dj_profile) === normalizedRequestedSlug ||
             (e.dj_profile_data?.nom_artistique && normalizeString(e.dj_profile_data.nom_artistique) === normalizedRequestedSlug) ||
             (matchedDjProfile && (
               e.dj_profile === matchedDjProfile.id ||
               e.dj_profile === matchedDjProfile._id?.toString()
             ));
    });
    console.log("Matched DJ events:", djEvents.length);

    // Check if it's a Client slug
    const clientEvents = mappedEvents.filter(e => {
      return normalizeString(e.clientSlug) === normalizedRequestedSlug;
    });
    console.log("Matched client events:", clientEvents.length);
    if (clientEvents.length > 0) {
      console.log("Match Details:", clientEvents[0]);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

testEndpoint();
