const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
(async () => {
    const client = new MongoClient(uri);
    await client.connect();
    // In server.js, the db is determined by MONGODB_URI DB name. Let's see what DB name it uses.
    // Actually, server.js does `const db = client.db();` without arguments to use the default from URI.
    const db = client.db();
    const items = await db.collection('location_equipment').find({publier_catalogue: true}).toArray();
    for (let item of items) {
        if (!item.photo_url) continue;
        console.log(item.name, item.photo_url);
    }
    await client.close();
})();
