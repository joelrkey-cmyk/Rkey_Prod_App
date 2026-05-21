const http = require('http');

const req = http.get('http://localhost:3000/api/gcs/location-photos/ad0f7dc9-7fc6-4a0d-84d6-c16cf1881b4c.png', (res) => {
  console.log('STATUS CODE:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const body = Buffer.concat(chunks);
    console.log('BODY LENGTH:', body.length);
    if (res.statusCode !== 200) {
      console.log('BODY CONTENT (UTF8):', body.toString('utf8'));
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});
