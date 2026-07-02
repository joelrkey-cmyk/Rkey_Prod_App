const { MongoClient } = require('mongodb');

async function run() {
  const url = process.env.DATABASE_URL || process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/rkeyprod";
  console.log("Connecting to MongoDB at:", url);
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db();
    const contracts = await db.collection('contracts2').find({
      $or: [
        { dj_profile: /stephane/i },
        { dj_profile: /stéphane/i },
        { "dj_profile_data.nom_artistique": /stéphane/i },
        { "dj_profile_data.nom_artistique": /stephane/i }
      ]
    }).toArray();
    console.log(`Found ${contracts.length} contracts for Stefan.`);
    for (const c of contracts) {
      console.log(`Contract ID: ${c.id}, client_name: ${c.client_name}, event_date: ${c.event_date} (type: ${typeof c.event_date}), client_info.event_date: ${c.client_info?.event_date} (type: ${typeof c.client_info?.event_date})`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
