const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

async function testGCS() {
  const BUCKET_NAME = 'rkey-prod-storage-01';
  let storage = null;
  let bucket = null;

  try {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      storage = new Storage({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) });
    } else {
      console.log('Using default credentials');
      storage = new Storage();
    }
    
    bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();
    console.log('Bucket exists:', exists);
    
    if (exists) {
      const file = bucket.file('test.txt');
      await file.save('hello world');
      console.log('Write test success');
    }
  } catch (err) {
    console.error('GCS Error:', err.message);
  }
}

testGCS();
