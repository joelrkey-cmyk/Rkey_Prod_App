const { MongoClient } = require('mongodb');
require('dotenv').config();
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/rkeyprod');
  await client.connect();
  const db = client.db();
  const contracts = await db.collection('contracts2').find({}, { projection: { cgv_text: 0, predefined_notes: 0, _id: 0, signatures: 0 } }).toArray();
  let totalDocSize = 0;
  for(let c of contracts) {
     totalDocSize += JSON.stringify(c).length;
  }
  console.log("Total size:", totalDocSize);
  
  const contracts2 = await db.collection('contracts2').find({}, { projection: { cgv_text: 0, predefined_notes: 0, _id: 0, signatures: 0, 'event_documents.pdf_data': 0, 'chat_messages': 0 } }).toArray();
  let totalDocSize2 = 0;
  for(let c of contracts2) {
     totalDocSize2 += JSON.stringify(c).length;
  }
  console.log("Total size without pdf_data and chat_messages:", totalDocSize2);
  await client.close();
}
run().catch(console.error);
