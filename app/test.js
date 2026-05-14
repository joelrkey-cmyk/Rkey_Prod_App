require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkContracts() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return console.log("No MONGODB_URI");
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const contracts = await db.collection('contracts2').find({}).limit(5).toArray();
  console.log("Found", contracts.length, "contracts.");
  if (contracts.length > 0) {
    console.log(JSON.stringify(contracts[0], null, 2));
  }
  
  await client.close();
}
checkContracts();
