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
  console.log('Total buffer length:', buffer.length);
  
  // Let's parse ASN.1 TLV (Type-Length-Value)
  let offset = 0;
  
  function readTLV() {
    if (offset >= buffer.length) {
      console.log('EOF reached.');
      return null;
    }
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
  
  // 1. Root Sequence
  const root = readTLV();
  console.log('Root SEQUENCE:', root ? { type: root.type, length: root.length, valueLength: root.value.length } : 'null');
  
  // Reset offset to read children of the root sequence
  offset = root ? (buffer.length - root.value.length) : 0;
  console.log('Root children offset start:', offset);
  
  // 2. Version (INTEGER)
  const version = readTLV();
  console.log('Version:', version ? { type: version.type, length: version.length, value: version.value } : 'null');
  
  // 3. Algorithm Identifier (SEQUENCE)
  const algId = readTLV();
  console.log('AlgId SEQUENCE:', algId ? { type: algId.type, length: algId.length, valueLength: algId.value.length } : 'null');
  
  // 4. Private Key (OCTET STRING)
  const privKeyOctet = readTLV();
  console.log('Private Key OCTET STRING:', privKeyOctet ? { type: privKeyOctet.type, length: privKeyOctet.length, valueLength: privKeyOctet.value.length } : 'null');
  
  if (privKeyOctet) {
    // Inside the OCTET STRING, there is the RSAPrivateKey SEQUENCE
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
    console.log('Inner SEQUENCE:', innerSeq ? { type: innerSeq.type, length: innerSeq.length, valueLength: innerSeq.value.length } : 'null');
    
    if (innerSeq) {
      innerOffset = innerBuffer.length - innerSeq.value.length;
      console.log('Inner children offset start:', innerOffset);
      
      // Read inner elements: Version, Modulus, Public Exponent, Private Exponent, Prime1, Prime2, Exponent1, Exponent2, Coefficient
      const names = ['Version', 'Modulus', 'PublicExponent', 'PrivateExponent', 'Prime1', 'Prime2', 'Exponent1', 'Exponent2', 'Coefficient'];
      for (const name of names) {
        const tlv = readInnerTLV();
        console.log(`  - ${name}:`, tlv ? { type: tlv.type, length: tlv.length, valueLength: tlv.value.length } : 'null');
        if (tlv && tlv.value.length !== tlv.length) {
          console.log(`    WARNING: Value length mismatch! Expected ${tlv.length} but got ${tlv.value.length}`);
        }
      }
    }
  }

} catch (e) {
  console.error('Crash:', e);
}
