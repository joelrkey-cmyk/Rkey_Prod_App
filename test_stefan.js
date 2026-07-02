const https = require('https');

https.get('https://rkeyprodapp.fr/api/public/dj-client/stefan-edison', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Success! Role:', parsed.role);
      console.log('Events count:', parsed.events ? parsed.events.length : 'none');
      if (parsed.events) {
        console.log('Sample event IDs:', parsed.events.map(e => e.id));
      }
    } catch (e) {
      console.log('Failed to parse JSON, raw data length:', data.length);
      console.log('Raw sample:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err);
});
