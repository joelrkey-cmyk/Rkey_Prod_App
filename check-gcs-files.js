const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const BUCKET_NAME = 'rkey-prod-storage-01';
const GOOGLE_CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

function getGoogleCredentials() {
  if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    return JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
  }
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  return null;
}

async function run() {
  const creds = getGoogleCredentials();
  if (!creds) {
    console.log('No Google credentials found!');
    return;
  }
  
  const storage = new Storage({
    projectId: creds.project_id,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key
    }
  });
  
  const bucket = storage.bucket(BUCKET_NAME);
  
  const filesToCheck = [
    'location-photos/ad0f7dc9-7fc6-4a0d-84d6-c16cf1881b4c.png', // Casque Silent Party
    'location-photos/21654fd0-3a46-48df-874c-8ed4ba9c1fc3.png'  // Sonorisation LD MAUI G3
  ];
  
  for (const f of filesToCheck) {
    const file = bucket.file(f);
    const [exists] = await file.exists();
    console.log(`File "${f}" exists in bucket:`, exists);
  }
}

run().catch(console.error);
