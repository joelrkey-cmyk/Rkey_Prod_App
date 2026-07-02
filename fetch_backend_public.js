const fetch = require('node-fetch');

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/public/dj-client/stefan-edison');
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Role:", data.role);
    console.log("DjName:", data.djName);
    console.log("Number of events:", data.events ? data.events.length : 0);
    if (data.events && data.events.length > 0) {
      console.log("First event keys:", Object.keys(data.events[0]));
      console.log("First event date:", data.events[0].event_date);
      console.log("First event client_info:", data.events[0].client_info);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
