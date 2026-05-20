const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

async function check() {
  const BUCKET_NAME = 'rkey-prod-storage-01';
  let storage;
  const GOOGLE_CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    storage = new Storage({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) });
  } else if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    storage = new Storage({ keyFilename: GOOGLE_CREDENTIALS_PATH });
  } else {
    storage = new Storage();
  }
  
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file('test.txt');
  try {
    await file.save('public test');
    const [metadata] = await file.getMetadata();
    console.log(metadata.mediaLink);
    
    // check if it's public
    try {
      await file.makePublic();
      console.log('Made public! Public URL:', file.publicUrl());
    } catch(e) {
      console.log('Cannot make public:', e.message);
    }
  } catch(e) {
    console.error(e.message);
  }
}
check();
