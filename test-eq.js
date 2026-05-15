require('dotenv').config();
const { MongoClient } = require('mongodb');

async function test() {
  const uri = process.env.DATABASE_URL || process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) return console.log("No auth");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('rkey_prod');
  const items = await db.collection('location_equipment').find({ name: /led bar/i }).toArray();
  console.log(items);
  await client.close();
}
test();
