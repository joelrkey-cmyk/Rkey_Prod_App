const { MongoClient } = require('mongodb');

async function run() {
  const MONGO_URL = process.env.MONGO_URL || process.env.DATABASE_URL || 'mongodb://localhost:27017';
  const DB_NAME = 'rkey_prod';
  const client = new MongoClient(MONGO_URL, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 10000,
  });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    const slug = "stefan-edison";
    
    const normalizeString = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, ''); // keep only alpha-numeric characters
    };

    const normalizedRequestedSlug = normalizeString(slug);
    console.log("normalizedRequestedSlug:", normalizedRequestedSlug);

    const contracts = await db.collection('contracts2').find({ status: { $in: ['sent', 'archived', 'completed'] } }, { projection: { _id: 0 } }).toArray();
    console.log("Total active contracts loaded:", contracts.length);

    const mappedEvents = contracts.map(c => {
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
      
      const djLogin = djName.toLowerCase().replace(/\s+/g, '-');
      const typeLower = eventType.split(' ')[0].toLowerCase().replace(/\s+/g, '-');
      const clientNameLower = clientName.toLowerCase().replace(/\s+/g, '-');
      const clientSlug = `${typeLower}-${clientNameLower}`;
      
      return {
        id: c.id,
        djLogin,
        clientSlug,
        ...c
      };
    });

    const djEvents = mappedEvents.filter(e => {
      const cond1 = normalizeString(e.djLogin) === normalizedRequestedSlug;
      const cond2 = normalizeString(e.dj_profile) === normalizedRequestedSlug;
      const cond3 = e.dj_profile_data?.nom_artistique && normalizeString(e.dj_profile_data.nom_artistique) === normalizedRequestedSlug;
      return cond1 || cond2 || cond3;
    });

    console.log(`Matched ${djEvents.length} events for Stefan Edison:`);
    djEvents.forEach(e => {
       console.log({
          id: e.id,
          dj_profile: e.dj_profile,
          djLogin: e.djLogin,
          client: e.client_name || e.client_info?.name
       });
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
