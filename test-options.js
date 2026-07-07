const http = require('http');
http.get('http://localhost:3000/api/material-options', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Material Options Response:', data));
});
http.get('http://localhost:3000/api/contract-options', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Contract Options Response:', data));
});
