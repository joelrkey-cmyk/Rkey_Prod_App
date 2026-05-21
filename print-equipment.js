const { MongoClient } = require('mongodb');
require('dotenv').config({ override: true });

const MONGO_URL = process.env.DATABASE_URL || process.env.MONGO_URL || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'rkey_prod';

async function run() {
  if (!MONGO_URL) {
    console.log('No MONGO_URL found in environment.');
    process.exit(1);
  }
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    console.log('Connecting to:', DB_NAME);
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    console.log('Collections in:', DB_NAME, collections.map(c => c.name));
    
    for (const coll of collections) {
      if (coll.name === 'location_equipment') {
        const count = await db.collection(coll.name).countDocuments({});
        console.log(`- ${coll.name}: ${count} documents`);
        const items = await db.collection(coll.name).find({}).toArray();
        for (const item of items) {
          console.log(`  Item: "${item.name}" (id: ${item.id}), Photo URL: "${item.photo_url}"`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}
run();
