const http = require('http');

http.get('http://localhost:3000/api/public/dj-client/stefan-edison', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.events && parsed.events.length > 0) {
        console.log("Full Event Keys:", Object.keys(parsed.events[0]));
        console.log("Full Event details:", JSON.stringify(parsed.events[0], null, 2).slice(0, 2000));
      } else {
        console.log("No events found");
      }
    } catch (e) {
      console.log('Error parsing:', e);
    }
  });
});
