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
    
    // Fetch all active/archived/sent/completed contracts
    const contracts = await db.collection('contracts2').find({}).toArray();
    console.log(`Total contracts in DB: ${contracts.length}`);
    
    // Check contracts with Stephane/Stefan Edison
    const matching = contracts.filter(c => {
       const djName = c.dj_profile_data?.nom_artistique || c.dj_profile || "";
       const nameLower = djName.toLowerCase();
       return nameLower.includes('steph') || nameLower.includes('stef') || nameLower.includes('edison') || nameLower.includes('fab37720');
    });
    
    console.log(`Found ${matching.length} contracts for Stéphane/Stefan:`);
    matching.forEach(c => {
       console.log({
         id: c.id,
         status: c.status,
         dj_profile: c.dj_profile,
         dj_profile_name: c.dj_profile_data?.nom_artistique || c.dj_profile_data?.nom_complet,
         client_name: c.client_name || c.client_info?.name,
       });
    });
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
