const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  const buffer = Buffer.from(base64, 'base64');
  
  console.log('Trying to parse DER buffer as pkcs8 private key...');
  try {
    const key = crypto.createPrivateKey({
      key: buffer,
      format: 'der',
      type: 'pkcs8'
    });
    console.log('Success! DER buffer was parsed perfectly as pkcs8 key!');
  } catch (err) {
    console.error('DER pkcs8 parse failed:', err.message);
  }

  console.log('Trying to parse DER buffer as pkcs1 private key...');
  try {
    const key = crypto.createPrivateKey({
      key: buffer,
      format: 'der',
      type: 'pkcs1'
    });
    console.log('Success! DER buffer was parsed perfectly as pkcs1 key!');
  } catch (err) {
    console.error('DER pkcs1 parse failed:', err.message);
  }

  console.log('Trying to re-encode DER to PEM and parse...');
  const pem = `-----BEGIN PRIVATE KEY-----\n${buffer.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
  try {
    const key = crypto.createPrivateKey(pem);
    console.log('Success! Re-encoded PEM was parsed perfectly!');
  } catch (err) {
    console.error('Re-encoded PEM parse failed:', err.message);
  }
} catch (e) {
  console.error('Error:', e.message);
}
