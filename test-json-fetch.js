const endpoints = [
  '/api/dj-client/admin/contracts',
  '/api/material-options',
  '/api/contract-options',
  '/api/cgv-templates',
];
const http = require('http');

for (const ep of endpoints) {
  http.get('http://localhost:3000' + ep, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        JSON.parse(data);
        console.log(`[OK] ${ep}`);
      } catch (e) {
        console.log(`[FAIL] ${ep} - ${e.message} - Data: ${data}`);
      }
    });
  });
}
