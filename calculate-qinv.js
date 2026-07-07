const fs = require('fs');
require('dotenv').config({ override: true });

// Modular inverse using Extended Euclidean Algorithm for BigInt
function modInverse(a, m) {
  let m0 = m;
  let y = 0n, x = 1n;

  if (m === 1n) return 0n;

  while (a > 1n) {
    let q = a / m;
    let t = m;

    m = a % m;
    a = t;
    t = y;

    y = x - q * y;
    x = t;
  }

  if (x < 0n) x = x + m0;

  return x;
}

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
    
    // Convert prime1 and prime2 values to BigInt
    const p = BigInt('0x' + prime1.value.toString('hex'));
    const q = BigInt('0x' + prime2.value.toString('hex'));
    
    console.log('Prime 1 (p) is:', p.toString(16).substring(0, 40) + '...');
    console.log('Prime 2 (q) is:', q.toString(16).substring(0, 40) + '...');
    
    // Mathematically calculate qInv = q^(-1) mod p
    const qInvCalculated = modInverse(q, p);
    console.log('Calculated qInv is:', qInvCalculated.toString(16).substring(0, 40) + '...');
    
    // Let's convert qInv to bytes
    let hex = qInvCalculated.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    
    // Check if high bit of first byte is set. If so, ASN.1 INTEGER requires prepending 0x00
    let qInvBytes = Buffer.from(hex, 'hex');
    if ((qInvBytes[0] & 0x80) !== 0) {
      qInvBytes = Buffer.concat([Buffer.from([0x00]), qInvBytes]);
    }
    
    console.log('Expected ASN.1 INTEGER payload for qInv:', qInvBytes.toString('hex').substring(0, 40) + '...');
    console.log('Expected ASN.1 INTEGER payload length:', qInvBytes.length);
    
    // Let's rebuild the entire inner buffer with the correct qInv!
    // An ASN.1 TLV for qInv:
    // Type: 0x02 (INTEGER)
    // Length: qInvBytes.length
    // Value: qInvBytes
    let qInvLengthBytes;
    if (qInvBytes.length < 128) {
      qInvLengthBytes = Buffer.from([qInvBytes.length]);
    } else {
      qInvLengthBytes = Buffer.from([0x81, qInvBytes.length]);
    }
    const qInvTLV = Buffer.concat([Buffer.from([0x02]), qInvLengthBytes, qInvBytes]);
    
    // Reconstruct the inner buffer up to exponent2
    const beforeQInv = innerBuffer.subarray(0, innerOffset);
    const reconstructedInnerSeqValue = Buffer.concat([beforeQInv, qInvTLV]);
    
    // Wrap in SEQUENCE
    let innerSeqLengthBytes;
    if (reconstructedInnerSeqValue.length < 128) {
      innerSeqLengthBytes = Buffer.from([reconstructedInnerSeqValue.length]);
    } else if (reconstructedInnerSeqValue.length < 256) {
      innerSeqLengthBytes = Buffer.from([0x81, reconstructedInnerSeqValue.length]);
    } else {
      innerSeqLengthBytes = Buffer.from([0x82, reconstructedInnerSeqValue.length >> 8, reconstructedInnerSeqValue.length & 0xff]);
    }
    const reconstructedInnerSeq = Buffer.concat([Buffer.from([0x48]), innerSeqLengthBytes, reconstructedInnerSeqValue]);
    // Note: Type 0x30 is Sequence. But wait, in the parse output, Inner SEQUENCE was type 48 (which is 0x30 in hex). Yes!
    
    // Let's do a complete, clean rebuild of the entire PKCS#8 DER buffer!
    // Let's write a script that does this!
  }
} catch (e) {
  console.error(e);
}
