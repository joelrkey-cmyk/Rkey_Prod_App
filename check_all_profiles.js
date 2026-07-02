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
    
    const profiles = await db.collection('dj_profiles').find({}).toArray();
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
       console.log({
         id: p.id,
         nom_complet: p.nom_complet,
         nom_artistique: p.nom_artistique,
         actif: p.actif,
         role: p.role,
         email: p.email
       });
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
