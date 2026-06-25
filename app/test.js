require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkReservations() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return console.log("No MONGODB_URI");
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const reservations = await db.collection('location_reservations').find({}).toArray();
  console.log("Total reservations in database:", reservations.length);
  if (reservations.length > 0) {
    const types = {};
    const sample = [];
    reservations.forEach(r => {
      types[r.booking_type] = (types[r.booking_type] || 0) + 1;
      if (sample.length < 5) {
        sample.push({
          id: r.id,
          booking_type: r.booking_type,
          client_name: r.client_name,
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status
        });
      }
    });
    console.log("Booking type counts:", types);
    console.log("Sample reservations:", JSON.stringify(sample, null, 2));
  }
  
  await client.close();
}
checkReservations();
