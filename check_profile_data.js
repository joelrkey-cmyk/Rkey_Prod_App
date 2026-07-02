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
    
    const contracts = await db.collection('contracts2').find({
      dj_profile: { $in: ['stephane', 'fab37720-9a79-489c-92bb-d41083acdb98'] }
    }).toArray();
    
    console.log(`Analyzing ${contracts.length} contracts for Stéphane:`);
    contracts.forEach(c => {
       console.log({
         id: c.id,
         status: c.status,
         dj_profile: c.dj_profile,
         has_dj_profile_data: !!c.dj_profile_data,
         dj_profile_data: c.dj_profile_data
       });
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
