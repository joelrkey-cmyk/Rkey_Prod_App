const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  console.log('Trying standard crypto.createPrivateKey...');
  try {
    const key = crypto.createPrivateKey(pk);
    console.log('Success! Key is valid for Node crypto.');
  } catch (err) {
    console.error('Standard parse failed:', err.message);
  }

  console.log('\nTrying cleanups...');
  // Let's print the actual base64 lines to see if there are spaces or something
  const lines = pk.trim().split('\n');
  console.log('Number of lines:', lines.length);
  for (let i = 0; i < lines.length; i++) {
    console.log(`Line ${i}: length=${lines[i].length} content=${JSON.stringify(lines[i].substring(0, 10))}...${JSON.stringify(lines[i].substring(lines[i].length - 10))}`);
  }

} catch (e) {
  console.error('Error:', e.message);
}
