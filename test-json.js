const http = require('http');
http.get('http://localhost:3000/api/public/dj-client/non-existent-slug', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});
