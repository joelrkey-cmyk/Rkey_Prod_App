const fs = require('fs');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  const buffer = Buffer.from(base64, 'base64');
  
  // Let's parse ASN.1 step-by-step
  let offset = 0;
  
  function readTLV() {
    if (offset >= buffer.length) return null;
    const type = buffer[offset];
    offset++;
    
    let length = buffer[offset];
    offset++;
    
    if (length & 0x80) {
      const numBytes = length & 0x7f;
      length = 0;
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | buffer[offset];
        offset++;
      }
    }
    
    const value = buffer.subarray(offset, offset + length);
    offset += length;
    
    return { type, length, value };
  }
  
  const root = readTLV();
  offset = buffer.length - root.value.length;
  const version = readTLV();
  const algId = readTLV();
  const privKeyOctet = readTLV();
  
  if (privKeyOctet) {
    const innerBuffer = privKeyOctet.value;
    let innerOffset = 0;
    
    function readInnerTLV() {
      if (innerOffset >= innerBuffer.length) return null;
      const type = innerBuffer[innerOffset];
      innerOffset++;
      
      let length = innerBuffer[innerOffset];
      innerOffset++;
      
      if (length & 0x80) {
        const numBytes = length & 0x7f;
        length = 0;
        for (let i = 0; i < numBytes; i++) {
          length = (length << 8) | innerBuffer[innerOffset];
          innerOffset++;
        }
      }
      
      const value = innerBuffer.subarray(innerOffset, innerOffset + length);
      innerOffset += length;
      
      return { type, length, value };
    }
    
    const innerSeq = readInnerTLV();
    innerOffset = innerBuffer.length - innerSeq.value.length;
    
    const innerVersion = readInnerTLV();
    const modulus = readInnerTLV();
    const publicExponent = readInnerTLV();
    const privateExponent = readInnerTLV();
    const prime1 = readInnerTLV();
    const prime2 = readInnerTLV();
    const exponent1 = readInnerTLV();
    const exponent2 = readInnerTLV();
    
    const coefficient = readInnerTLV();
    console.log('Parsed Coefficient in broken key:', coefficient.value.toString('hex').substring(0, 40) + '...');
  }
} catch (e) {
  console.error(e);
}
