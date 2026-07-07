const fs = require('fs');
console.log('google-credentials.json exists:', fs.existsSync('google-credentials.json'));
if (fs.existsSync('google-credentials.json')) {
  try {
    const creds = JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    console.log('google-credentials.json client_email:', creds.client_email);
    console.log('google-credentials.json project_id:', creds.project_id);
  } catch (e) {
    console.error('Error reading google-credentials.json:', e.message);
  }
}
