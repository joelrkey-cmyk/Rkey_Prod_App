const { MongoClient } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
  await client.connect();
  const db = client.db('rkey-prod');
  
  const reservations = await db.collection('location_reservations').find({}).sort({created_at: -1}).limit(5).toArray();
  for (let r of reservations) {
    console.log(r.id, r.b_type, r.client_name, "start:", r.start_date, "end:", r.end_date, "googleId:", r.google_event_id);
  }
  
  client.close();
}
test();
