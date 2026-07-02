const { MongoClient } = require('mongodb');

async function test() {
  const url = process.env.DATABASE_URL || process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!url) {
    console.error('No database URL found');
    return;
  }
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db('rkey_prod');
    console.log('Connected to rkey_prod');
    
    const contracts = await db.collection('contracts2').find({ status: { $in: ['sent', 'archived', 'completed'] } }).toArray();
    console.log('Total active contracts:', contracts.length);
    
    const targetSlug = 'mariage-stéphanie-mussler-et-corentin-christmann';
    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');
    };
    
    const normalizedTarget = normalizeString(targetSlug);
    console.log('Normalized target:', normalizedTarget);
    
    const allDjProfiles = await db.collection('dj_profiles').find({}).toArray();
    
    const found = [];
    for (const c of contracts) {
      const info = c.client_info || {};
      let clientName = info.name || c.client_name || 'Client inconnu';
      let eventType = info.event_type || 'Événement';
      
      const matchedProfile = allDjProfiles.find(p => p.id === c.dj_profile || p._id?.toString() === c.dj_profile);
      let djName = c.dj_profile_data?.nom_artistique || (matchedProfile ? (matchedProfile.nom_artistique || matchedProfile.nom_complet) : null) || c.dj_profile || "DJ";
      
      const djLogin = String(djName).toLowerCase().replace(/\s+/g, '-');
      const typeLower = String(eventType).split(' ')[0].toLowerCase().replace(/\s+/g, '-');
      const clientNameLower = String(clientName).toLowerCase().replace(/\s+/g, '-');
      const clientSlug = `${typeLower}-${clientNameLower}`;
      
      if (normalizeString(clientSlug) === normalizedTarget) {
        found.push({
          id: c.id,
          clientName,
          eventType,
          clientSlug,
          normalizedClientSlug: normalizeString(clientSlug),
          status: c.status,
          dj_profile: c.dj_profile,
          djName,
          c_keys: Object.keys(c)
        });
        console.log('FOUND CONTRACT DETAILS:', JSON.stringify(c, null, 2));
      }
    }
    
    console.log('Matching contracts:', found);
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await client.close();
  }
}

test();
