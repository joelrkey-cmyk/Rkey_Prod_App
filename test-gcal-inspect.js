const fs = require('fs');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  // Inspect the first line and second line exactly
  console.log('PK as JSON string:', JSON.stringify(pk));
  console.log('Any carriage returns? (\\r):', pk.includes('\r'));
} catch (e) {
  console.error('Error:', e.message);
}
