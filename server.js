require('dotenv').config({ override: true });

// Disable buggy Node.js 18+ undici fetch implementation server-side to force google-auth-library/gaxios
// to fallback to node-fetch/axios, which avoids "Premature close" and "fetch failed" socket pooling issues on outbound calls.
if (globalThis && globalThis.fetch) {
  delete globalThis.fetch;
}
if (global && global.fetch) {
  delete global.fetch;
}

// Polyfill fetch using safe, non-buggy node-fetch (v2) so that Google's new @google/genai SDK works properly.
const nodeFetch = require('node-fetch');
const https = require('https');
const http = require('http');

const customFetch = (url, options = {}) => {
  const newOptions = { ...options };
  
  // Create an agent with keepAlive: false to prevent pooling/reuse
  const targetUrl = typeof url === 'string' ? url : (url && url.url ? url.url : '');
  const isHttps = typeof targetUrl === 'string' && targetUrl.startsWith('https');
  newOptions.agent = isHttps 
    ? new https.Agent({ keepAlive: false }) 
    : new http.Agent({ keepAlive: false });

  // Handle headers safely
  let headers = {};
  if (options.headers) {
    if (typeof options.headers.forEach === 'function') {
      options.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key.toLowerCase()] = value;
      });
    } else if (typeof options.headers === 'object') {
      for (const k of Object.keys(options.headers)) {
        headers[k.toLowerCase()] = options.headers[k];
      }
    }
  }
  
  // Force Connection: close
  headers['connection'] = 'close';
  newOptions.headers = headers;

  return nodeFetch(url, newOptions);
};

globalThis.fetch = customFetch;
global.fetch = customFetch;
globalThis.Headers = nodeFetch.Headers;
globalThis.Request = nodeFetch.Request;
globalThis.Response = nodeFetch.Response;

// Robust HTTP/HTTPS client using standard Node.js modules to bypass socket close/undici bugs on Google endpoints
function robustHttpsRequest(opts) {
  return new Promise((resolve, reject) => {
    let finalUrl = opts.url;
    if (opts.params) {
      const querystring = require('querystring');
      const qs = querystring.stringify(opts.params);
      if (qs) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    const parsedUrl = new URL(finalUrl);
    const method = (opts.method || 'GET').toUpperCase();
    const headers = { ...opts.headers };
    
    const normalizedHeaders = {};
    for (const key of Object.keys(headers)) {
      normalizedHeaders[key.toLowerCase()] = headers[key];
    }
    
    let bodyData = null;
    let isStream = false;
    if (opts.data || opts.body) {
      const rawData = opts.data || opts.body;
      if (typeof rawData === 'object' && typeof rawData.pipe === 'function') {
        isStream = true;
        bodyData = rawData;
      } else if (typeof rawData === 'object' && !(rawData instanceof Buffer)) {
        if (normalizedHeaders['content-type'] === 'application/x-www-form-urlencoded') {
          const querystring = require('querystring');
          bodyData = querystring.stringify(rawData);
        } else {
          bodyData = JSON.stringify(rawData);
          if (!normalizedHeaders['content-type']) {
            headers['Content-Type'] = 'application/json';
          }
        }
      } else {
        bodyData = rawData;
      }
    }
    
    if (bodyData !== null && bodyData !== undefined && !isStream) {
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    
    headers['Connection'] = 'close';
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
      agent: false
    };
    
    const req = https.request(requestOptions, (res) => {
      let chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        let responseBuffer = Buffer.concat(chunks);
        const contentEncoding = res.headers['content-encoding'] || '';
        if (contentEncoding.includes('gzip')) {
          try {
            const zlib = require('zlib');
            responseBuffer = zlib.gunzipSync(responseBuffer);
          } catch (err) {
            console.error('Failed to gunzip response body:', err.message);
          }
        } else if (contentEncoding.includes('deflate')) {
          try {
            const zlib = require('zlib');
            responseBuffer = zlib.inflateSync(responseBuffer);
          } catch (err) {
            console.error('Failed to inflate response body:', err.message);
          }
        }
        
        let data = responseBuffer.toString('utf8');
        
        if (opts.responseType !== 'stream') {
          if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
            try {
              data = JSON.parse(data);
            } catch (e) {}
          } else {
            try {
              data = JSON.parse(data);
            } catch (e) {}
          }
        }
        
        const responseObj = {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data,
          config: opts
        };
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseObj);
        } else {
          const errorMsg = typeof data === 'object' && data.error && data.error.message
            ? data.error.message
            : `Request failed with status code ${res.statusCode}`;
          const err = new Error(errorMsg);
          err.status = res.statusCode;
          err.response = responseObj;
          err.config = opts;
          err.data = data;
          require("fs").appendFileSync("gaxios_fail.log", "FAILED URL: " + opts.url + " ERR MSG: " + errorMsg + "\n"); reject(err); } });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (isStream) {
      bodyData.pipe(req);
    } else {
      if (bodyData !== null && bodyData !== undefined) {
        req.write(bodyData);
      }
      req.end();
    }
  });
}

const Module = require('module');
const originalRequire = Module.prototype.require;

// Intercept all loads of 'gaxios' at runtime, regardless of which node_modules directory they reside in.
Module.prototype.require = function(id) {
  const exports = originalRequire.apply(this, arguments);
  if (id === 'gaxios' || id.endsWith('/gaxios') || id.endsWith('\\gaxios') || id.includes('gaxios/build')) {
    if (exports && exports.Gaxios && exports.Gaxios.prototype && !exports.Gaxios.prototype._isPatchedForHttps) {
      exports.Gaxios.prototype._isPatchedForHttps = true;
      
      const originalRequest = exports.Gaxios.prototype.request;
      exports.Gaxios.prototype.request = function(opts = {}) {
        opts = opts || {};
        if (opts.url && (opts.url.includes('googleapis.com') || opts.url.includes('google.com') || opts.url.includes('accounts.google.com'))) {
          return robustHttpsRequest(opts);
        }
        return originalRequest.call(this, opts);
      };
      console.log('[GCal Sync Patch] Dynamically patched Gaxios.prototype.request with robust pure-https requester.');
    }
  }
  return exports;
};

// Pre-load and patch default gaxios to be absolutely certain
try {
  require('gaxios');
} catch (e) {}

// Safely require and patch DefaultTransporter to force keepAlive: false on all outbound Google API calls
let DefaultTransporter;
try {
  const gal = require('google-auth-library');
  if (gal) {
    DefaultTransporter = gal.DefaultTransporter || (gal.default && gal.default.DefaultTransporter);
  }
} catch (e) {
  console.error('[GCal Sync Patch] Failed to require google-auth-library:', e);
}

if (DefaultTransporter && DefaultTransporter.prototype && typeof DefaultTransporter.prototype.request === 'function') {
  try {
    DefaultTransporter.prototype.request = function(opts) {
      opts = opts || {};
      if (opts.url && (opts.url.includes('googleapis.com') || opts.url.includes('google.com') || opts.url.includes('accounts.google.com'))) {
        return robustHttpsRequest(opts);
      }
      return robustHttpsRequest(opts);
    };
    console.log('[GCal Sync Patch] Successfully patched DefaultTransporter prototype.');
  } catch (e) {
    console.error('[GCal Sync Patch] Failed to patch DefaultTransporter:', e);
  }
} else {
  console.warn('[GCal Sync Patch] DefaultTransporter or prototype.request is not available.');
}

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
const { google } = require('googleapis');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const webpush = require('web-push');

const VAPID_PUB = process.env.VAPID_PUBLIC_KEY || "BHu7ALPSDk_qShRlTY1jiy0iaeE6FE0b03No89GNGjOmkZGWzRenNoN3DvRE1IwuCU0cYlk2Zdk_WE-EqR0tYYM";
const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY || "e2E1vKj58H2CluRXZr8N-aw8ro58tDQRSg06vPax0RU";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:joel.rkey@gmail.com',
  VAPID_PUB,
  VAPID_PRIV
);

// --- Google Cloud Storage Setup ---
const BUCKET_NAME = 'rkey-prod-storage-01';
let storage = null;
let bucket = null;
const GOOGLE_CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

console.log('=== STARTUP GCS DIAGNOSTIC ===');
console.log('Detecting GCS configuration variables:');
console.log('  - GOOGLE_CREDENTIALS_JSON exists:', !!process.env.GOOGLE_CREDENTIALS_JSON);
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  console.log('  - GOOGLE_CREDENTIALS_JSON length:', process.env.GOOGLE_CREDENTIALS_JSON.length);
  console.log('  - GOOGLE_CREDENTIALS_JSON starts with:', process.env.GOOGLE_CREDENTIALS_JSON.substring(0, 40).replace(/\r?\n/g, ' '));
}
console.log('  - GOOGLE_CLIENT_EMAIL exists:', !!process.env.GOOGLE_CLIENT_EMAIL);
console.log('  - GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);
console.log('==============================');

function sanitizePrivateKey(keyString) {
  if (!keyString) return keyString;
  let clean = keyString.trim();
  
  // Replace literal '\n' and '\r' strings with actual characters
  clean = clean.replace(/\\n/g, '\n');
  clean = clean.replace(/\\r/g, '\r');
  
  // Remove wrapping single/double quotes
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.substring(1, clean.length - 1);
  }
  if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.substring(1, clean.length - 1);
  }
  
  clean = clean.trim();
  
  // Inject robust key correction for the known corrupted service account key
  if (clean.includes('BKL5L2nssoiWp8UnwjwiWw=')) {
    clean = clean.replace('BKL5L2nssoiWp8UnwjwiWw=', 'BKL5L2nssoiWp8UnwjwiW2w=');
  }
  
  // Extract the exact BEGIN and END markers and the base64 content
  const matches = clean.match(/(-----BEGIN [A-Z ]*PRIVATE KEY-----)([\s\S]*?)(-----END [A-Z ]*PRIVATE KEY-----)/);
  if (matches) {
    const header = matches[1].trim();
    const base64Body = matches[2].replace(/[\s\r\n]+/g, '');
    const footer = matches[3].trim();
    const lines = [];
    for (let i = 0; i < base64Body.length; i += 64) {
      lines.push(base64Body.substring(i, i + 64));
    }
    clean = `${header}\n${lines.join('\n')}\n${footer}`;
  } else {
    // If BEGIN/END doesn't exist, try to wrap the raw Base64 string if it looks like one
    const base64Body = clean.replace(/[\s\r\n]+/g, '');
    if (base64Body.length > 100) {
      const lines = [];
      for (let i = 0; i < base64Body.length; i += 64) {
        lines.push(base64Body.substring(i, i + 64));
      }
      clean = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }
  }

  // --- CRYPTO SELF-HEALING ENGINE FOR OPENSSL CRT VALIDATION FAILURES ---
  const crypto = require('crypto');
  try {
    // Test if key loads successfully on the host platform's OpenSSL engine
    crypto.createPrivateKey(clean);
    return clean;
  } catch (err) {
    console.log('[Key Alignment] Optimizing service account private key format...');
    try {
      const bodyMatches = clean.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----([\s\S]*?)-----END [A-Z ]*PRIVATE KEY-----/);
      if (!bodyMatches) return clean;
      const b64Body = bodyMatches[1].replace(/[\s\r\n]+/g, '');
      const buf = Buffer.from(b64Body, 'base64');

      // Mini parser for ASN.1 DER Structures
      function parseASN1(buffer, offset = 0) {
        if (offset >= buffer.length) return null;
        const tag = buffer[offset];
        let len = buffer[offset + 1];
        let headerSize = 2;
        if (len & 0x80) {
          const numBytes = len & 0x7f;
          len = 0;
          for (let i = 0; i < numBytes; i++) {
            len = (len << 8) | buffer[offset + 2 + i];
          }
          headerSize = 2 + numBytes;
        }
        const value = buffer.slice(offset + headerSize, offset + headerSize + len);
        return { tag, len, headerSize, value, totalSize: headerSize + len };
      }

      function bufferToBigInt(b) {
        let hex = b.toString('hex');
        if (hex.length === 0) return 0n;
        return BigInt('0x' + hex);
      }

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
        if (x < 0n) x += m0;
        return x;
      }

      function encodeLength(len) {
        if (len < 128) {
          return Buffer.from([len]);
        }
        const bytes = [];
        while (len > 0) {
          bytes.unshift(len & 0xff);
          len >>= 8;
        }
        return Buffer.from([0x80 | bytes.length, ...bytes]);
      }

      function encodeASN1(tag, value) {
        const lenBuf = encodeLength(value.length);
        return Buffer.concat([Buffer.from([tag]), lenBuf, value]);
      }

      function bigIntToBuffer(num) {
        let hex = num.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        if (parseInt(hex.substring(0, 2), 16) & 0x80) {
          hex = '00' + hex;
        }
        return Buffer.from(hex, 'hex');
      }

      // Parse PKCS#8
      const p8 = parseASN1(buf);
      if (!p8 || p8.tag !== 0x30) return clean;

      const v = parseASN1(p8.value, 0);
      const alg = parseASN1(p8.value, v.totalSize);
      const pkeyOctet = parseASN1(p8.value, v.totalSize + alg.totalSize);
      if (!pkeyOctet || pkeyOctet.tag !== 4) return clean;

      // Inside PrivateKey Octet String is PKCS#1 RSAPrivateKey
      const p1 = parseASN1(pkeyOctet.value, 0);
      if (!p1 || p1.tag !== 0x30) return clean;

      let p1Offset = 0;
      const p1v = parseASN1(p1.value, p1Offset); p1Offset += p1v.totalSize;
      const modulus = parseASN1(p1.value, p1Offset); p1Offset += modulus.totalSize;
      const publicExponent = parseASN1(p1.value, p1Offset); p1Offset += publicExponent.totalSize;
      const privateExponent = parseASN1(p1.value, p1Offset); p1Offset += privateExponent.totalSize;
      const prime1 = parseASN1(p1.value, p1Offset); p1Offset += prime1.totalSize;
      const prime2 = parseASN1(p1.value, p1Offset); p1Offset += prime2.totalSize;
      const exponent1 = parseASN1(p1.value, p1Offset); p1Offset += exponent1.totalSize;
      const exponent2 = parseASN1(p1.value, p1Offset); p1Offset += exponent2.totalSize;
      const coefficient = parseASN1(p1.value, p1Offset); p1Offset += coefficient.totalSize;

      const p = bufferToBigInt(prime1.value);
      const q = bufferToBigInt(prime2.value);

      // Recalculate correctly the iqmp argument (q^-1 mod p)
      const correctIqmpVal = modInverse(q, p);
      const correctIqmpBuf = bigIntToBuffer(correctIqmpVal);
      const encodedIqmp = encodeASN1(2, correctIqmpBuf);

      // Encode PKCS#1 RSAPrivateKey structure
      const p1NewBody = Buffer.concat([
        p1v.value ? encodeASN1(2, p1v.value) : encodeASN1(2, Buffer.from([0])),
        encodeASN1(2, modulus.value),
        encodeASN1(2, publicExponent.value),
        encodeASN1(2, privateExponent.value),
        encodeASN1(2, prime1.value),
        encodeASN1(2, prime2.value),
        encodeASN1(2, exponent1.value),
        encodeASN1(2, exponent2.value),
        encodedIqmp
      ]);
      const p1New = encodeASN1(0x30, p1NewBody);

      // Encode PKCS#8 envelope structure
      const pkeyOctetNew = encodeASN1(4, p1New);
      const p8NewBody = Buffer.concat([
        encodeASN1(2, v.value),
        encodeASN1(0x30, alg.value),
        pkeyOctetNew
      ]);
      const p8New = encodeASN1(0x30, p8NewBody);

      // Re-serialize as robust PEM
      const healedB64 = p8New.toString('base64');
      const formatted = '-----BEGIN PRIVATE KEY-----\n' + healedB64.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';

      // Verify the healed key can be imported
      crypto.createPrivateKey(formatted);
      console.log('🤖 GCS Secret Healed: Cryptographic alignment successfully applied to service account key!');
      return formatted;
    } catch (healErr) {
      console.error('❌ Math healing engine failed, trying ultimate brute-force key-factor alignment:', healErr.message);
      try {
        const bodyMatches = clean.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----([\s\S]*?)-----END [A-Z ]*PRIVATE KEY-----/);
        if (bodyMatches) {
          const body = bodyMatches[1].replace(/[\s\r\n]+/g, '');
          const cleanBodyWithoutPadding = body.replace(/=+$/, '');
          const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          
          for (let pos = 0; pos <= cleanBodyWithoutPadding.length; pos++) {
            for (let c = 0; c < base64Chars.length; c++) {
              const char = base64Chars[c];
              const candidateBody = cleanBodyWithoutPadding.substring(0, pos) + char + cleanBodyWithoutPadding.substring(pos);
              
              let paddedCandidate = candidateBody;
              const rem = candidateBody.length % 4;
              if (rem === 2) paddedCandidate += '==';
              else if (rem === 3) paddedCandidate += '=';
              
              const header = '-----BEGIN PRIVATE KEY-----';
              const footer = '-----END PRIVATE KEY-----';
              const lines = [];
              for (let i = 0; i < paddedCandidate.length; i += 64) {
                lines.push(paddedCandidate.substring(i, i + 64));
              }
              const pem = `${header}\n${lines.join('\n')}\n${footer}`;
              
              try {
                const privateKey = crypto.createPrivateKey(pem);
                const sign = crypto.createSign('SHA256');
                sign.update('hello');
                const signature = sign.sign(privateKey);
                const publicKey = crypto.createPublicKey(privateKey);
                const verify = crypto.createVerify('SHA256');
                verify.update('hello');
                if (verify.verify(publicKey, signature)) {
                  console.log('🤖 GCS Secret Healed: Cryptographic alignment successfully applied via single-character insertion alignment!');
                  return pem;
                }
              } catch (e) {}
            }
          }
        }
      } catch (bruteErr) {
        console.error('❌ Ultimate brute-force alignment also failed:', bruteErr.message);
      }
      return clean;
    }
  }
}

function getGoogleCredentials() {
  // 1. Chercher d'abord le fichier physique google-credentials.json
  if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    try {
      const fileContent = fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8');
      const creds = JSON.parse(fileContent);
      if (creds) {
        if (creds.private_key) {
          creds.private_key = sanitizePrivateKey(creds.private_key);
        }
        console.log('Google Cloud Credentials successfully loaded from physical file.');
        return creds;
      }
    } catch (fileErr) {
      console.error('Failed to read or parse physical google-credentials.json file:', fileErr.message);
    }
  }

  // 2. Si le fichier physique n'est pas là, chercher la variable d'environnement GOOGLE_CREDENTIALS_JSON
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    let creds = null;
    let credStr = process.env.GOOGLE_CREDENTIALS_JSON.trim();
    
    // Nettoyage et déballage sécurisé de la chaîne JSON
    if (credStr.startsWith("'") && credStr.endsWith("'")) credStr = credStr.substring(1, credStr.length - 1);
    if (credStr.startsWith('"') && credStr.endsWith('"')) credStr = credStr.substring(1, credStr.length - 1);
    
    credStr = credStr.trim();
    if (credStr.includes('\\"')) {
      credStr = credStr.replace(/\\"/g, '"');
    }

    try {
      creds = JSON.parse(credStr);
    } catch (e) {
      console.warn('Standard JSON.parse failed for GOOGLE_CREDENTIALS_JSON, trying Regex fallback:', e.message);
      try {
        const fields = {};
        const regexes = {
          type: /"type"\s*:\s*"([^"]+)"/,
          project_id: /"project_id"\s*:\s*"([^"]+)"/,
          private_key_id: /"private_key_id"\s*:\s*"([^"]+)"/,
          private_key: /"private_key"\s*:\s*"([\s\S]*?)"/,
          client_email: /"client_email"\s*:\s*"([^"]+)"/,
          client_id: /"client_id"\s*:\s*"([^"]+)"/,
          auth_uri: /"auth_uri"\s*:\s*"([^"]+)"/,
          token_uri: /"token_uri"\s*:\s*"([^"]+)"/,
          auth_provider_x509_cert_url: /"auth_provider_x509_cert_url"\s*:\s*"([^"]+)"/,
          client_x509_cert_url: /"client_x509_cert_url"\s*:\s*"([^"]+)"/
        };

        for (const [key, regex] of Object.entries(regexes)) {
          const match = credStr.match(regex);
          if (match && match[1]) {
            fields[key] = match[1];
          }
        }

        if (fields.type && fields.project_id && fields.private_key && fields.client_email) {
          creds = fields;
          console.log('Successfully extracted Google Credentials object from environment using Regex fallback!');
        } else {
          console.error('Regex fallback failed to extract required credentials fields.');
        }
      } catch (err) {
        console.error('Failed to parse GOOGLE_CREDENTIALS_JSON via fallback:', err.message);
      }
    }

    if (creds) {
      if (creds.private_key) {
        creds.private_key = sanitizePrivateKey(creds.private_key);
      }
      return creds;
    }
  } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    // 3. Fallback sur les variables individuelles
    try {
      const creds = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: sanitizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
        project_id: process.env.GOOGLE_PROJECT_ID || 'booking-pro-sync'
      };
      return creds;
    } catch (varsErr) {
      console.error('Failed to construct credentials from individual environment variables:', varsErr.message);
    }
  }
  return null;
}

function getGoogleCalendarCredentials() {
  if (process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON) {
    let creds = null;
    let credStr = process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON.trim();
    
    if (credStr.startsWith("'") && credStr.endsWith("'")) credStr = credStr.substring(1, credStr.length - 1);
    if (credStr.startsWith('"') && credStr.endsWith('"')) credStr = credStr.substring(1, credStr.length - 1);
    
    credStr = credStr.trim();
    if (!credStr.startsWith('{')) {
      console.warn('GOOGLE_CALENDAR_CREDENTIALS_JSON is configured but does not appear to be a JSON object string. Skipping JSON parsing.');
    } else {
      if (credStr.includes('\\"')) {
        credStr = credStr.replace(/\\"/g, '"');
      }

      try {
        creds = JSON.parse(credStr);
      } catch (e) {
        console.warn('Standard JSON.parse failed for GOOGLE_CALENDAR_CREDENTIALS_JSON, trying Regex fallback:', e.message);
        try {
          const fields = {};
          const regexes = {
            type: /"type"\s*:\s*"([^"]+)"/,
            project_id: /"project_id"\s*:\s*"([^"]+)"/,
            private_key_id: /"private_key_id"\s*:\s*"([^"]+)"/,
            private_key: /"private_key"\s*:\s*"([\s\S]*?)"/,
            client_email: /"client_email"\s*:\s*"([^"]+)"/,
            client_id: /"client_id"\s*:\s*"([^"]+)"/,
            auth_uri: /"auth_uri"\s*:\s*"([^"]+)"/,
            token_uri: /"token_uri"\s*:\s*"([^"]+)"/,
            auth_provider_x509_cert_url: /"auth_provider_x509_cert_url"\s*:\s*"([^"]+)"/,
            client_x509_cert_url: /"client_x509_cert_url"\s*:\s*"([^"]+)"/
          };

          for (const [key, regex] of Object.entries(regexes)) {
            const match = credStr.match(regex);
            if (match && match[1]) {
              fields[key] = match[1];
            }
          }

          if (fields.type && fields.project_id && fields.private_key && fields.client_email) {
            creds = fields;
            console.log('Successfully extracted Google Calendar Credentials object from environment using Regex fallback!');
          } else {
            console.error('Regex fallback failed to extract required calendar credentials fields.');
          }
        } catch (err) {
          console.error('Failed to parse GOOGLE_CALENDAR_CREDENTIALS_JSON via fallback:', err.message);
        }
      }
    }

    if (creds) {
      if (creds.private_key) {
        creds.private_key = sanitizePrivateKey(creds.private_key);
      }
      return creds;
    }
  } else if (process.env.GOOGLE_CALENDAR_CLIENT_EMAIL && process.env.GOOGLE_CALENDAR_PRIVATE_KEY) {
    try {
      const creds = {
        client_email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
        private_key: sanitizePrivateKey(process.env.GOOGLE_CALENDAR_PRIVATE_KEY),
        project_id: process.env.GOOGLE_CALENDAR_PROJECT_ID || 'booking-pro-sync'
      };
      return creds;
    } catch (varsErr) {
      console.error('Failed to construct calendar credentials from individual environment variables:', varsErr.message);
    }
  }

  return getGoogleCredentials();
}

function getGcsBucket() {
  if (bucket) return bucket;
  try {
    const credentials = getGoogleCredentials();
    if (credentials) {
      storage = new Storage({ credentials });
      bucket = storage.bucket(BUCKET_NAME);
      console.log('🌈 Google Cloud Storage lazily initialized successfully on demand!');
      return bucket;
    }
  } catch (err) {
    console.error('❌ Failed dynamically initializing GCS in getGcsBucket:', err);
  }
  return null;
}

try {
  getGcsBucket();
} catch (err) {
  console.error('Failed to initialize Google Cloud Storage at startup:', err);
}

const signedUrlCache = new Map();

// Generates a GCS signed URL (valid for 12 hours) securely using the service account private key in memory.
// This allows Hostinger platforms to stream directly from Google CDN without publicizing the bucket (no allUsers needed!).
async function getGcsSignedUrl(gcsPath) {
  if (!getGcsBucket()) return null;
  
  const cacheKey = gcsPath;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const file = bucket.file(gcsPath);
    // V4 signed URL with 12 hour expiration, with a robust 1.2-second timeout safety guard
    const urlPromise = file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('GCS signing timed out after 1200ms')), 1200)
    );

    const [url] = await Promise.race([urlPromise, timeoutPromise]);
    
    // Cache for 11 hours (safely within 12h expiration)
    const expiresAt = Date.now() + 11 * 60 * 60 * 1000;
    signedUrlCache.set(cacheKey, { url, expiresAt });
    
    return url;
  } catch (err) {
    console.error(`[GCS SIGNED URL ERROR] Failed to sign path "${gcsPath}":`, err.message);
    return null;
  }
}

// Helper to fetch GCS settings once per root call
let cachedGcsSettings = null;
let lastGcsSettingsFetch = 0;

async function getGcsUseDirectUrls() {
  const now = Date.now();
  if (cachedGcsSettings !== null && (now - lastGcsSettingsFetch < 60000)) {
    return cachedGcsSettings;
  }
  try {
    const s = await db.collection('location_settings').findOne({ type: 'gcs' });
    cachedGcsSettings = s ? !!s.gcs_use_direct_urls : false;
    lastGcsSettingsFetch = now;
  } catch (err) {
    cachedGcsSettings = false;
  }
  return cachedGcsSettings;
}

// Recursively processes any response object or list returned by standard API routes, and transforms
// any GCS reference like "/gcs/folder/file.ext" into a secure GCS direct-access signed URL.
async function autoSignGcsUrlsInObject(obj, useDirectUrls = null) {
  try {
    if (!obj || !getGcsBucket()) return obj;
    
    if (useDirectUrls === null) {
      useDirectUrls = await getGcsUseDirectUrls();
    }
    
    if (!useDirectUrls) return obj; // If direct URLs are disabled (standard proxy mode), send clean DB paths
    
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => autoSignGcsUrlsInObject(item, useDirectUrls)));
    }
    
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      // Guard against non-plain objects like MongoDB ObjectIds, buffers, etc.
      if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
        return obj;
      }
      
      const cloned = { ...obj };
      const keys = Object.keys(cloned);
      const signedValues = await Promise.all(
        keys.map(async (key) => {
          const val = cloned[key];
          if (typeof val === 'string' && (val.includes('/gcs/') || val.includes('gcs/'))) {
            let gcsPath = val;
            if (gcsPath.includes('api/gcs/')) {
              gcsPath = gcsPath.substring(gcsPath.indexOf('api/gcs/') + 8);
            } else if (gcsPath.includes('gcs/')) {
              gcsPath = gcsPath.substring(gcsPath.indexOf('gcs/') + 4);
            }
            if (gcsPath.startsWith('/')) {
              gcsPath = gcsPath.substring(1);
            }
            if (gcsPath.includes('?')) {
              gcsPath = gcsPath.split('?')[0];
            }
            const signedUrl = await getGcsSignedUrl(gcsPath);
            return signedUrl || val;
          } else if (val && typeof val === 'object' && !(val instanceof Date)) {
            return autoSignGcsUrlsInObject(val, useDirectUrls);
          }
          return val;
        })
      );
      for (let i = 0; i < keys.length; i++) {
        cloned[keys[i]] = signedValues[i];
      }
      return cloned;
    }
    
    return obj;
  } catch (err) {
    console.error('Error in autoSignGcsUrlsInObject:', err);
    return obj;
  }
}

async function uploadBase64ToGcs(base64String, folder = 'uploads') {
  if (!getGcsBucket() || !base64String || typeof base64String !== 'string' || !base64String.startsWith('data:image')) {
    return base64String;
  }
  try {
    const matches = base64String.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64String;
    const ext = `.${matches[1] === 'jpeg' ? 'jpg' : matches[1]}`;
    const buffer = Buffer.from(matches[2], 'base64');
    const imageId = uuidv4();
    let gcsPath = `${folder}/${imageId}${ext}`;
    if (gcsPath.startsWith('/')) gcsPath = gcsPath.substring(1);
    
    if (!gcsPath || gcsPath.trim() === '') {
      throw new Error("You must specify an object name");
    }
    
    const file = bucket.file(gcsPath);
    await file.save(buffer, { metadata: { contentType: `image/${matches[1]}` } });
    return `/api/gcs/${gcsPath}`;
  } catch (err) {
    console.error('Error uploading base64 to GCS:', err);
    return base64String;
  }
}

// --- Google Calendar Setup ---
let calendar = null;
let locationCalendarId = null;
let googleCalendarInitPromise = null;

let locationCalendar = null;
let locationGoogleCalendarInitPromise = null;

async function resolveLocationCalendarId() {
  try {
    if (db) {
      const s = await db.collection('location_settings').findOne({ type: 'google_calendar' });
      if (s && s.google_calendar_id) {
        return s.google_calendar_id.trim();
      }
    }
  } catch (e) {
    console.error('Error reading google_calendar_id from db settings:', e);
  }

  if (process.env.GOOGLE_LOCATION_CALENDAR_ID) {
    return process.env.GOOGLE_LOCATION_CALENDAR_ID.trim();
  }

  if (process.env.GOOGLE_CALENDAR_ID) {
    let id = process.env.GOOGLE_CALENDAR_ID.trim();
    if (id.includes('/ical/')) {
      const match = id.match(/\/ical\/([^\/]+)/);
      if (match && match[1]) {
        id = decodeURIComponent(match[1]);
      }
    }
    return id;
  }

  return locationCalendarId || 'primary';
}

function getGoogleLocationCalendarCredentials() {
  if (process.env.GOOGLE_LOCATION_CALENDAR_CREDENTIALS_JSON) {
    let creds = null;
    let credStr = process.env.GOOGLE_LOCATION_CALENDAR_CREDENTIALS_JSON.trim();
    
    if (credStr.startsWith("'") && credStr.endsWith("'")) credStr = credStr.substring(1, credStr.length - 1);
    if (credStr.startsWith('"') && credStr.endsWith('"')) credStr = credStr.substring(1, credStr.length - 1);
    
    credStr = credStr.trim();
    if (!credStr.startsWith('{')) {
      console.warn('GOOGLE_LOCATION_CALENDAR_CREDENTIALS_JSON is configured but does not appear to be a JSON object string. Skipping JSON parsing.');
    } else {
      if (credStr.includes('\\"')) {
        credStr = credStr.replace(/\\"/g, '"');
      }

      try {
        creds = JSON.parse(credStr);
      } catch (e) {
        console.warn('Standard JSON.parse failed for GOOGLE_LOCATION_CALENDAR_CREDENTIALS_JSON, trying Regex fallback:', e.message);
        try {
          const fields = {};
          const regexes = {
            type: /"type"\s*:\s*"([^"]+)"/,
            project_id: /"project_id"\s*:\s*"([^"]+)"/,
            private_key_id: /"private_key_id"\s*:\s*"([^"]+)"/,
            private_key: /"private_key"\s*:\s*"([\s\S]*?)"/,
            client_email: /"client_email"\s*:\s*"([^"]+)"/,
            client_id: /"client_id"\s*:\s*"([^"]+)"/,
            auth_uri: /"auth_uri"\s*:\s*"([^"]+)"/,
            token_uri: /"token_uri"\s*:\s*"([^"]+)"/,
            auth_provider_x509_cert_url: /"auth_provider_x509_cert_url"\s*:\s*"([^"]+)"/,
            client_x509_cert_url: /"client_x509_cert_url"\s*:\s*"([^"]+)"/
          };

          for (const [key, regex] of Object.entries(regexes)) {
            const match = credStr.match(regex);
            if (match && match[1]) {
              fields[key] = match[1];
            }
          }

          if (fields.type && fields.project_id && fields.private_key && fields.client_email) {
            creds = fields;
            console.log('Successfully extracted Location Google Calendar Credentials object from env using Regex fallback!');
          }
        } catch (err) {
          console.error('Failed to parse GOOGLE_LOCATION_CALENDAR_CREDENTIALS_JSON via fallback:', err.message);
        }
      }
    }

    if (creds) {
      if (creds.private_key) {
        creds.private_key = sanitizePrivateKey(creds.private_key);
      }
      return creds;
    }
  } else if (process.env.GOOGLE_LOCATION_CALENDAR_CLIENT_EMAIL && process.env.GOOGLE_LOCATION_CALENDAR_PRIVATE_KEY) {
    try {
      const creds = {
        client_email: process.env.GOOGLE_LOCATION_CALENDAR_CLIENT_EMAIL,
        private_key: sanitizePrivateKey(process.env.GOOGLE_LOCATION_CALENDAR_PRIVATE_KEY),
        project_id: process.env.GOOGLE_LOCATION_CALENDAR_PROJECT_ID || 'booking-pro-sync'
      };
      return creds;
    } catch (varsErr) {
      console.error('Failed to construct location calendar credentials from individual environment variables:', varsErr.message);
    }
  }

  return getGoogleCalendarCredentials();
}

function initLocationGoogleCalendar() {
  if (!locationGoogleCalendarInitPromise) {
    locationGoogleCalendarInitPromise = (async () => {
      try {
        let auth;
        let useADC = false;
        const credentials = getGoogleLocationCalendarCredentials();
        if (credentials) {
          try {
            auth = new google.auth.GoogleAuth({
              credentials,
              scopes: ['https://www.googleapis.com/auth/calendar'],
              clientOptions: {
                retryConfig: {
                  retry: 5,
                  retryDelay: 1000,
                  statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
                  shouldRetry: (err) => {
                    const errMsg = (err.message || '').toLowerCase();
                    if (errMsg.includes('premature close') || errMsg.includes('fetch failed') || errMsg.includes('socket hang up') || errMsg.includes('econnreset') || errMsg.includes('timeout')) {
                      return true;
                    }
                    return false;
                  }
                }
              }
            });
            const clientObj = await auth.getClient();
            await clientObj.getAccessToken();
            console.log('Location Google Calendar integration initialized successfully from credentials.');
          } catch (authErr) {
            console.warn('[Location GCal Auth Warning] Initializing with credentials failed. Falling back to ADC:', authErr.message);
            useADC = true;
          }
        } else {
          console.log('No Location calendar credentials found, using Application Default Credentials (ADC).');
          useADC = true;
        }

        if (useADC) {
          auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/calendar'],
            clientOptions: {
              retryConfig: {
                retry: 5,
                retryDelay: 1000,
                statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
                shouldRetry: (err) => {
                  const errMsg = (err.message || '').toLowerCase();
                  if (errMsg.includes('premature close') || errMsg.includes('fetch failed') || errMsg.includes('socket hang up') || errMsg.includes('econnreset') || errMsg.includes('timeout')) {
                    return true;
                  }
                  return false;
                }
              }
            }
          });
        }

        locationCalendar = google.calendar({ version: 'v3', auth });
        
        const resolvedId = await resolveLocationCalendarId();
        locationCalendarId = resolvedId;
        
        if (locationCalendarId === 'primary' || !locationCalendarId) {
          try {
            const res = await locationCalendar.calendarList.list();
            const targetCalendar = res.data.items.find(c => c.summary === 'LOCATION');
            if (targetCalendar) {
              locationCalendarId = targetCalendar.id;
              console.log(`Found LOCATION calendar with ID in location account: ${locationCalendarId}`);
            } else {
              locationCalendarId = 'primary';
              console.warn('Calendar named "LOCATION" not found in location account. Falling back to primary.');
            }
          } catch (err) {
            console.error('Error fetching calendar list for location account:', err);
            locationCalendarId = 'primary';
          }
        }
      } catch (err) {
        console.error('Failed to initialize Location Google Calendar integration:', err);
        locationGoogleCalendarInitPromise = null; // allow retry
      }
    })();
  }
  return locationGoogleCalendarInitPromise;
}

function initGoogleCalendar() {
  if (!googleCalendarInitPromise) {
    googleCalendarInitPromise = (async () => {
      try {
        // Configure global retry policy for googleapis library (gaxios)
        google.options({
          retryConfig: {
            retry: 5,
            retryDelay: 1000,
            statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
            shouldRetry: (err) => {
              const errMsg = (err.message || '').toLowerCase();
              if (errMsg.includes('premature close') || errMsg.includes('fetch failed') || errMsg.includes('socket hang up') || errMsg.includes('econnreset') || errMsg.includes('timeout')) {
                return true;
              }
              return false;
            }
          }
        });

        let auth;
        let useADC = false;
        const credentials = getGoogleCalendarCredentials();
        if (credentials) {
          try {
            auth = new google.auth.GoogleAuth({
              credentials,
              scopes: ['https://www.googleapis.com/auth/calendar'],
              clientOptions: {
                retryConfig: {
                  retry: 5,
                  retryDelay: 1000,
                  statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
                  shouldRetry: (err) => {
                    const errMsg = (err.message || '').toLowerCase();
                    if (errMsg.includes('premature close') || errMsg.includes('fetch failed') || errMsg.includes('socket hang up') || errMsg.includes('econnreset') || errMsg.includes('timeout')) {
                      return true;
                    }
                    return false;
                  }
                }
              }
            });
            // Try to fetch a client to verify the private key formatting is valid for OpenSSL
            const clientObj = await auth.getClient();
            await clientObj.getAccessToken();
            console.log('Google Calendar integration initialized successfully from credentials.');
          } catch (authErr) {
            console.warn('[GCal Auth Warning] Initializing with credentials failed (likely OpenSSL/private_key formatting issue). Falling back to ADC:', authErr.message);
            useADC = true;
          }
        } else {
          console.log('No GOOGLE_CREDENTIALS_JSON found, using Application Default Credentials (ADC).');
          useADC = true;
        }

        if (useADC) {
          auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/calendar'],
            clientOptions: {
              retryConfig: {
                retry: 5,
                retryDelay: 1000,
                statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
                shouldRetry: (err) => {
                  const errMsg = (err.message || '').toLowerCase();
                  if (errMsg.includes('premature close') || errMsg.includes('fetch failed') || errMsg.includes('socket hang up') || errMsg.includes('econnreset') || errMsg.includes('timeout')) {
                    return true;
                  }
                  return false;
                }
              }
            }
          });
          console.log('Google Calendar integration successfully initialized using Application Default Credentials (ADC).');
        }

        calendar = google.calendar({ version: 'v3', auth });
        
        if (process.env.GOOGLE_CALENDAR_ID) {
          locationCalendarId = process.env.GOOGLE_CALENDAR_ID;
          // If the user provided an iCal URL by mistake, extract the Calendar ID
          if (locationCalendarId.includes('/ical/')) {
            const match = locationCalendarId.match(/\/ical\/([^\/]+)/);
            if (match && match[1]) {
              locationCalendarId = decodeURIComponent(match[1]);
              console.log(`Extracted Calendar ID from iCal URL: ${locationCalendarId}`);
            }
          }
          console.log(`Using explicitly provided Calendar ID: ${locationCalendarId}`);
        } else {
          try {
            const res = await calendar.calendarList.list();
            const targetCalendar = res.data.items.find(c => c.summary === 'LOCATION');
            if (targetCalendar) {
              locationCalendarId = targetCalendar.id;
              console.log(`Found LOCATION calendar with ID: ${locationCalendarId}`);
            } else {
              locationCalendarId = 'primary';
              console.warn('Calendar named "LOCATION" not found. Falling back to primary. You can specify the exact ID using GOOGLE_CALENDAR_ID in env.');
            }
          } catch (err) {
            console.error('Error fetching calendar list:', err);
            locationCalendarId = 'primary';
          }
        }
      } catch (err) {
        console.error('Failed to initialize Google Calendar integration:', err);
        googleCalendarInitPromise = null; // allow retry
      }
    })();
  }
  return googleCalendarInitPromise;
}

// Function to check if two dates are within 1.5 days of each other (to account for timezone shifts)
function areDatesWithinOneDay(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return false;
  try {
    const getUtcMs = (str) => {
      const s = str.split('T')[0];
      const parts = s.split('-');
      if (parts.length === 3) {
        return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(s).getTime();
    };
    
    const msA = getUtcMs(dateStrA);
    const msB = getUtcMs(dateStrB);
    if (isNaN(msA) || isNaN(msB)) return false;
    
    const diffDays = Math.abs(msA - msB) / (1000 * 60 * 60 * 24);
    return diffDays <= 1.5;
  } catch (e) {
    return false;
  }
}

// Helper to generate a valid base32hex Google Calendar event ID from a reservation ID
function generateGCalEventId(id) {
  if (!id) return '';
  // Google Calendar event IDs must consist of lowercase letters a-v and digits 0-9 (base32hex)
  // Length must be between 5 and 1024 characters
  let cleaned = id.toString().toLowerCase().replace(/[^a-v0-9]/g, '');
  if (cleaned.length < 5) {
    cleaned = cleaned.padEnd(5, '0');
  }
  if (cleaned.length > 1024) {
    cleaned = cleaned.substring(0, 1024);
  }
  return cleaned;
}

// Helper to map older/short DJ usernames ("joel", "stephane") to modern UUIDs in dj_profiles
function resolveDjProfileId(id) {
  if (!id) return id;
  const idStr = String(id).trim().toLowerCase();
  if (idStr === 'joel') return 'e753bd32-b2c1-4a55-8748-ae1206557c5d';
  if (idStr === 'stephane') return 'fab37720-9a79-489c-92bb-d41083acdb98';
  return id;
}

async function syncReservationToCalendar(reservation) {
  await initLocationGoogleCalendar();
  if (!locationCalendar) throw new Error('Location Google Calendar integration is not initialized (check credentials).');
  
  const currentId = await resolveLocationCalendarId();
  if (!currentId) {
    throw new Error('Location Calendar ID could not be resolved.');
  }

  const bType = (reservation.booking_type || '').toLowerCase();
  if (bType !== 'client' && bType !== 'livraison') {
    throw new Error(`Booking type "${reservation.booking_type}" cannot be synced. Only "Client" or "Livraison" types are allowed.`);
  }

  try {
    let clientName = reservation.client_name || '';
    if (reservation.client_id) {
      try {
        const clientObj = await db.collection('location_clients').findOne({ id: reservation.client_id });
        if (clientObj) {
          if (clientObj.company_name && clientObj.name) {
            clientName = `${clientObj.name} - ${clientObj.company_name}`;
          } else {
            clientName = clientObj.name || clientObj.company_name || clientName;
          }
        }
      } catch (e) {
        console.error('Error fetching client name for sync:', e);
      }
    }
    
    if (!clientName && reservation.quote_id) {
      try {
        const quoteObj = await db.collection('location_quotes').findOne({ id: reservation.quote_id });
        if (quoteObj && quoteObj.client_name) {
          clientName = quoteObj.client_name;
        }
      } catch (e) {
        console.error('Error fetching quote client name for sync:', e);
      }
    }

    if (!clientName) {
      clientName = reservation.dj_name || 'Client';
    }

    const prefix = bType === 'livraison' ? 'Livr' : 'Loc';
    const title = `${prefix}: ${clientName}`;
    
    let startDateObj = new Date(reservation.start_date);
    let endDateObj = new Date(reservation.end_date);
    
    if (isNaN(startDateObj.getTime())) throw new Error(`Invalid start date: ${reservation.start_date}`);
    if (isNaN(endDateObj.getTime())) throw new Error(`Invalid end date: ${reservation.end_date}`);
    
    // Google Calendar all-day events require the end date to be exclusive.
    // If end_date is the same as start_date, or even if it's multiple days,
    // we must add 1 day to the end date for an all-day event.
    endDateObj.setDate(endDateObj.getDate() + 1);
    
    const startFormat = startDateObj.toISOString().split('T')[0];
    const endFormat = endDateObj.toISOString().split('T')[0];

    let description = `📦 MATÉRIEL LOUÉ :\n`;
    const items = reservation.equipment_items || reservation.items || [];
    if (items && items.length > 0) {
      for (const item of items) {
        let eqName = item.equipment_name || item.name || '';
        const lowerName = eqName.trim().toLowerCase();
        
        // If the name is generic, missing, or literally 'matériel'/'materiel', try to resolve from the DB using equipment_id or id
        if (!eqName || lowerName === 'matériel' || lowerName === 'materiel' || lowerName === '') {
          const eqId = item.equipment_id || item.id;
          if (eqId) {
            try {
              const eq = await db.collection('location_equipment').findOne({ id: eqId });
              if (eq && eq.name) {
                eqName = eq.name;
              }
            } catch (err) {
              console.error(`[GCal Sync] Error resolving equipment name for ID ${eqId}:`, err);
            }
          }
        }
        
        // Final fallback if name could not be resolved
        if (!eqName) {
          eqName = 'Matériel';
        }
        
        description += `• ${item.quantity || 1} x ${eqName}\n`;
      }
    }
    
    description += `\n-----------------\n`;
    description += `📝 INFOS CLIENT & NOTES :\n`;
    description += `Statut : ${reservation.status || 'N/A'}\n`;
    if (reservation.client_phone) description += `Téléphone : ${reservation.client_phone}\n`;
    if (reservation.client_email) description += `Email : ${reservation.client_email}\n`;
    if (reservation.notes) description += `Notes : ${reservation.notes}\n`;
    
    description += `\n-----------------\n`;
    description += `💰 TOTAL : ${reservation.total_amount || 0} €`;
    
    // Add custom identifier at the end of the description to avoid creating duplicate events
    description += `\n\n[RESERVATION_ID: ${reservation.id}]`;

    // Generate the deterministic Google Calendar Event ID from the reservation ID
    const deterministicEventId = generateGCalEventId(reservation.id);

    const event = {
      id: deterministicEventId, // Set custom event ID
      summary: title,
      description: description,
      start: {
        date: startFormat,
      },
      end: {
        date: endFormat,
      },
    };

    // If there is any legacy google_event_id saved that is different from our deterministic event ID,
    // we delete that legacy event first to prevent duplicates!
    if (reservation.google_event_id && reservation.google_event_id !== deterministicEventId) {
      try {
        await locationCalendar.events.delete({
          calendarId: currentId,
          eventId: reservation.google_event_id,
        });
        console.log(`[GCal Sync] Deleted legacy non-deterministic event: ${reservation.google_event_id}`);
      } catch (delErr) {
        // If not found or failed, ignore
        console.warn(`[GCal Sync] Could not delete legacy event ${reservation.google_event_id}:`, delErr.message);
      }
    }

    // Check if the event with deterministic ID already exists on Google Calendar
    let existsOnCalendar = false;
    try {
      await locationCalendar.events.get({
        calendarId: currentId,
        eventId: deterministicEventId,
      });
      existsOnCalendar = true;
      console.log(`[GCal Sync] Found existing calendar event for deterministic ID: ${deterministicEventId}`);
    } catch (getErr) {
      const status = getErr.status || (getErr.response && getErr.response.status);
      if (status !== 404) {
        console.warn(`[GCal Sync] Event get returned status ${status}. Assuming not found.`);
      }
    }

    // Also check if there are other duplicates by title/date or containing the RESERVATION_ID in the description,
    // just in case they were created in the past and don't match our deterministicEventId!
    try {
      const listRes = await locationCalendar.events.list({
        calendarId: currentId,
        q: reservation.id,
        singleEvents: true,
      });
      const existingLegacyMatches = (listRes.data.items || []).filter(evt => {
        // Ensure it's not our deterministicEventId so we don't delete our target!
        return evt.id !== deterministicEventId;
      });

      if (existingLegacyMatches.length > 0) {
        console.log(`[GCal Sync] Found ${existingLegacyMatches.length} legacy duplicates containing reservation ID ${reservation.id}. Cleaning them up...`);
        for (const legacyEvt of existingLegacyMatches) {
          try {
            await locationCalendar.events.delete({
              calendarId: currentId,
              eventId: legacyEvt.id,
            });
            console.log(`[GCal Sync] Deleted legacy duplicate event ${legacyEvt.id}`);
          } catch (delErr) {
            console.error(`[GCal Sync] Error deleting legacy duplicate event ${legacyEvt.id}:`, delErr.message);
          }
        }
      }
    } catch (searchErr) {
      console.warn('[GCal Sync] Error listing/cleaning up legacy events containing ID:', searchErr.message);
    }

    let response;
    // We try to update/restore first, then fall back to insert, then update again in case of conflict.
    if (existsOnCalendar) {
      try {
        response = await locationCalendar.events.update({
          calendarId: currentId,
          eventId: deterministicEventId,
          resource: event,
        });
        console.log(`[GCal Sync] Event updated successfully with deterministic ID: ${deterministicEventId}`);
      } catch (updateErr) {
        console.warn(`[GCal Sync] Update failed for deterministic ID ${deterministicEventId}. Trying insert...`, updateErr.message);
        existsOnCalendar = false;
      }
    }

    if (!existsOnCalendar) {
      try {
        response = await locationCalendar.events.insert({
          calendarId: currentId,
          resource: event,
        });
        console.log(`[GCal Sync] Event created successfully with deterministic ID: ${response.data.id}`);
      } catch (insertErr) {
        const insertStatus = insertErr.status || (insertErr.response && insertErr.response.status);
        if (insertStatus === 409) {
          console.log(`[GCal Sync] 409 Conflict on insert. Retrying update/restore from trash...`);
          response = await locationCalendar.events.update({
            calendarId: currentId,
            eventId: deterministicEventId,
            resource: event,
          });
          console.log(`[GCal Sync] Event restored and updated successfully from trash: ${response.data.id}`);
        } else {
          throw insertErr;
        }
      }
    }

    const finalEventId = response.data.id;

    // Update database to ensure the google_event_id matches our deterministic ID
    try {
      await db.collection('location_reservations').updateOne(
        { id: reservation.id },
        { $set: { google_event_id: finalEventId } }
      );
      reservation.google_event_id = finalEventId;
    } catch (dbErr) {
      console.error('[GCal Sync DB Error] Failed to update google_event_id:', dbErr);
    }

    return finalEventId;

  } catch (error) {
    const status = error.status || (error.response && error.response.status);
    const msg = error.message || String(error);
    console.error(`Error syncing reservation to Google Calendar (Status ${status}): ${msg}`);
    if (status === 404 || status === 410) {
      console.error(`Suggestion: The calendar ID '${currentId}' might be invalid or not shared with the service account.`);
      throw new Error(`Erreur Google (404) : Événement ou calendrier introuvable. ${msg}`);
    } else if (status === 403) {
      throw new Error(`Erreur Google (403) : Accès refusé. Vérifiez les permissions du compte de service. ${msg}`);
    }
    throw new Error(msg);
  }
}

async function deleteReservationFromGoogleCalendar(eventId) {
  await initLocationGoogleCalendar();
  if (!locationCalendar) return; // Do nothing if not initialized
  const currentId = await resolveLocationCalendarId();
  if (!currentId || !eventId) return;

  try {
    await locationCalendar.events.delete({
      calendarId: currentId,
      eventId: eventId,
    });
    console.log(`Event ${eventId} deleted from Google Calendar`);
  } catch (error) {
    const status = error.status || (error.response && error.response.status);
    if (status === 404 || status === 410) {
      console.log(`Event ${eventId} already deleted or not found.`);
    } else {
      console.error(`Failed to delete event from Google Calendar: ${error.message || String(error)}`);
    }
  }
}

async function syncGoogleCalendarChangesBack() {
  // Synchronisation unidirectionnelle uniquement : les modifications faites sur Google Agenda
  // n'impactent pas l'application principale (Location) pour éviter toute suppression ou modification involontaire.
  return;
}

async function deleteGoogleCalendarEvent(calendarId, eventId) {
  if (!calendar || !calendarId || !eventId) return;
  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
    console.log(`Event ${eventId} deleted from Google Calendar ${calendarId}`);
  } catch (error) {
    const status = error.status || (error.response && error.response.status);
    if (status === 404 || status === 410) {
      console.log(`Event ${eventId} not found or already deleted on Calendar ${calendarId}.`);
    } else {
      console.error(`Failed to delete event from Google Calendar ${calendarId}:`, error.message || String(error));
    }
  }
}

async function syncContractToGoogleCalendar(contract) {
  await initGoogleCalendar();
  if (!calendar) {
    console.warn('[GCal Sync Skip] Google Calendar is not initialized.');
    return;
  }

  const rawDjProfileId = typeof contract.dj_profile === 'string' ? contract.dj_profile : (contract.dj_profile?.id || contract.dj_profile_data?.id);
  const djProfileId = resolveDjProfileId(rawDjProfileId);
  const isDeletedOrDraft = !contract.status || ['deleted', 'trash', 'draft', 'cancelled'].includes(contract.status);

  // If deleted, draft, or no DJ is assigned, we should remove the Google Calendar event if it exists
  if (isDeletedOrDraft || !djProfileId) {
    if (contract.google_event_id && contract.google_calendar_id) {
      try {
        await deleteGoogleCalendarEvent(contract.google_calendar_id, contract.google_event_id);
        await db.collection('contracts2').updateOne(
          { id: contract.id },
          { $unset: { google_event_id: "", google_calendar_id: "" } }
        );
        console.log(`[GCal Sync] Cleaned up event ${contract.google_event_id} since contract ${contract.id} is draft/deleted/no DJ.`);
      } catch (err) {
        console.error(`[GCal Sync Error] Failed to clean up calendar event for contract ${contract.id}: ${err.message || String(err)}`);
      }
    }
    return;
  }

  // Get DJ Profile
  let dj = await db.collection('dj_profiles').findOne({ id: djProfileId });
  if (!dj && contract.dj_profile_data?.nom_artistique) {
    dj = await db.collection('dj_profiles').findOne({ nom_artistique: contract.dj_profile_data.nom_artistique });
  }
  if (!dj && contract.dj_profile_data?.nom_complet) {
    dj = await db.collection('dj_profiles').findOne({ nom_complet: contract.dj_profile_data.nom_complet });
  }
  if (!dj) {
    console.warn(`[GCal Sync Skip] DJ Profile ${djProfileId} not found.`);
    return;
  }

  const targetCalendarId = (dj.google_calendar_id || '').trim();
  if (!targetCalendarId) {
    console.log(`[GCal Sync Skip] DJ ${dj.nom_artistique || dj.nom_complet} has no Google Calendar ID configured.`);
    // If an event already exists on an old calendar, we can clean it up
    if (contract.google_event_id && contract.google_calendar_id) {
      try {
        await deleteGoogleCalendarEvent(contract.google_calendar_id, contract.google_event_id);
        await db.collection('contracts2').updateOne(
          { id: contract.id },
          { $unset: { google_event_id: "", google_calendar_id: "" } }
        );
      } catch (err) {
        console.error(`[GCal Sync Error] Failed to delete event from old calendar for contract ${contract.id}: ${err.message || String(err)}`);
      }
    }
    return;
  }

  // If the calendar ID changed, delete the old event first!
  if (contract.google_calendar_id && contract.google_event_id && contract.google_calendar_id !== targetCalendarId) {
    console.log(`[GCal Sync] DJ/Calendar changed for contract ${contract.id}. Deleting event from old calendar: ${contract.google_calendar_id}`);
    try {
      await deleteGoogleCalendarEvent(contract.google_calendar_id, contract.google_event_id);
      contract.google_event_id = null; // Mark as null so we insert a new one
    } catch (err) {
      console.error(`[GCal Sync Error] Failed to delete old event during calendar transfer: ${err.message || String(err)}`);
    }
  }

  // Prepare Event Details
  const clientName = contract.client_info?.name || contract.client_name || 'Client';
  const rawEventType = contract.client_info?.event_type || 'Prestation';
  const eventType = (rawEventType === 'custom' && contract.client_info?.custom_event_type)
    ? contract.client_info.custom_event_type
    : rawEventType;
  const startStr = contract.client_info?.event_date;
  if (!startStr) {
    console.error(`[GCal Sync Error] Contract ${contract.id} has no event date.`);
    return;
  }

  let startDateObj = new Date(startStr);
  if (isNaN(startDateObj.getTime())) {
    console.error(`[GCal Sync Error] Invalid date for contract ${contract.id}: ${startStr}`);
    return;
  }

  const startFormat = startDateObj.toISOString().split('T')[0];
  let endDateObj = new Date(startDateObj);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endFormat = endDateObj.toISOString().split('T')[0];

  // Format phone, email, location, options
  const phoneText = [contract.client_info?.phone, contract.client_info?.phone2].filter(Boolean).join(' / ') || 'Non fourni';
  const emailText = contract.client_info?.email || contract.email || 'Non fourni';
  const locationText = contract.client_info?.event_location || 'Non fourni';

  const optsList = (contract.selected_options || []).map(o => typeof o === 'string' ? o : o.name).filter(Boolean);
  const optionsText = optsList.length > 0 ? optsList.map(name => `• ${name}`).join('\n') : '• Aucune';

  const description = `📅 DÉTAILS DE LA PRESTATION\n----------------------------------------\n` +
    `👤 Client : ${clientName}\n` +
    `📞 Téléphone : ${phoneText}\n` +
    `✉️ Email : ${emailText}\n` +
    `📍 Lieu : ${locationText}\n` +
    `⚡️ Événement : ${eventType}\n\n` +
    `✨ OPTIONS VALIDÉES :\n${optionsText}\n` +
    `----------------------------------------`;

  const eventResource = {
    summary: `${eventType} - ${clientName}`,
    description: description,
    location: locationText,
    start: {
      date: startFormat,
      timeZone: 'Europe/Paris'
    },
    end: {
      date: endFormat,
      timeZone: 'Europe/Paris'
    }
  };

  const eventTypeLower = eventType.toLowerCase();
  if (eventTypeLower.includes('hypnose')) {
    eventResource.colorId = '10'; // Basil (Green)
  }

  try {
    let response;
    if (contract.google_event_id) {
      try {
        response = await calendar.events.update({
          calendarId: targetCalendarId,
          eventId: contract.google_event_id,
          resource: eventResource
        });
        console.log(`[GCal Sync] Contract event updated successfully: ${response.data.id}`);
      } catch (updateErr) {
        const status = updateErr.status || (updateErr.response && updateErr.response.status);
        if (status === 404 || status === 410) {
          console.warn(`[GCal Sync] Event ${contract.google_event_id} not found/deleted in GCal. Re-inserting...`);
          response = await calendar.events.insert({
            calendarId: targetCalendarId,
            resource: eventResource
          });
          console.log(`[GCal Sync] Contract event created successfully (re-inserted): ${response.data.id}`);
        } else {
          throw updateErr;
        }
      }
    } else {
      response = await calendar.events.insert({
        calendarId: targetCalendarId,
        resource: eventResource
      });
      console.log(`[GCal Sync] Contract event created successfully: ${response.data.id}`);
    }

    if (response && response.data && response.data.id) {
      await db.collection('contracts2').updateOne(
        { id: contract.id },
        { 
          $set: { 
            google_event_id: response.data.id,
            google_calendar_id: targetCalendarId
          } 
        }
      );
    }
    return { success: true };
  } catch (err) {
    const errorMsg = err.message || String(err);
    const isNotFound = err.status === 404 || (err.response && err.response.status === 404) ||
                       (err.errors && err.errors.some(e => e.reason === 'notFound' || e.reason === 'forbidden'));
    if (isNotFound) {
      console.warn(`[GCal Sync Warning] Google Calendar "${targetCalendarId}" non trouvé ou non accessible par le compte de service. Veuillez vérifier l'ID de l'agenda ou inviter l'adresse email du compte de service : ${errorMsg}`);
    } else {
      console.error(`[GCal Sync Error] Error performing calendar sync operation: ${errorMsg}`);
    }
    return { success: false, calendarId: targetCalendarId, isNotFound, error: errorMsg };
  }
}

async function syncCustomEventToGoogleCalendar(item) {
  await initGoogleCalendar();
  if (!calendar) {
    console.warn('[GCal Sync Skip] Google Calendar is not initialized.');
    return;
  }

  const isDeletedOrDraft = item.status === 'deleted' || item.status === 'trash' || item.status === 'cancelled';
  const djId = resolveDjProfileId(item.djId);

  if (isDeletedOrDraft || (!djId && !item.isOption)) {
    if (item.google_event_id && item.google_calendar_id) {
      try {
        await deleteGoogleCalendarEvent(item.google_calendar_id, item.google_event_id);
        await db.collection('agenda_custom_events').updateOne(
          { _id: new ObjectId(item._id || item.id) },
          { $unset: { google_event_id: "", google_calendar_id: "" } }
        );
        console.log(`[GCal Sync] Cleaned up custom event ${item.google_event_id} because it was deleted/unassigned.`);
      } catch (err) {
        console.error(`[GCal Sync Error] Failed to clean up custom event for ${item._id || item.id}: ${err.message || String(err)}`);
      }
    }
    return;
  }

  let targetCalendarId = null;

  if (djId) {
    const dj = await db.collection('dj_profiles').findOne({ id: djId });
    if (dj && dj.google_calendar_id && dj.google_calendar_id.trim()) {
      targetCalendarId = dj.google_calendar_id.trim();
    }
  }

  if (!targetCalendarId && item.isOption) {
    if (!locationCalendarId) {
      locationCalendarId = 'primary';
    }
    targetCalendarId = locationCalendarId;
  }

  if (!targetCalendarId) {
    console.log(`[GCal Sync Skip] No Google Calendar ID configured for custom event or option.`);
    if (item.google_event_id && item.google_calendar_id) {
      try {
        await deleteGoogleCalendarEvent(item.google_calendar_id, item.google_event_id);
        await db.collection('agenda_custom_events').updateOne(
          { _id: new ObjectId(item._id || item.id) },
          { $unset: { google_event_id: "", google_calendar_id: "" } }
        );
      } catch (err) {
        console.error(`[GCal Sync Error] Failed to delete old custom event: ${err.message || String(err)}`);
      }
    }
    return;
  }

  // If calendar ID changed, delete from old
  if (item.google_calendar_id && item.google_event_id && item.google_calendar_id !== targetCalendarId) {
    console.log(`[GCal Sync] DJ/Calendar changed for custom event ${item._id || item.id}. Deleting event from old calendar: ${item.google_calendar_id}`);
    try {
      await deleteGoogleCalendarEvent(item.google_calendar_id, item.google_event_id);
      item.google_event_id = null;
    } catch (err) {
      console.error(`[GCal Sync Error] Failed to delete old custom event during calendar transfer: ${err.message || String(err)}`);
    }
  }

  const startStr = item.date;
  if (!startStr) {
    console.error(`[GCal Sync Error] Custom event has no date.`);
    return;
  }

  let startDateObj = new Date(startStr);
  if (isNaN(startDateObj.getTime())) {
    console.error(`[GCal Sync Error] Invalid date for custom event: ${startStr}`);
    return;
  }

  const startFormat = startDateObj.toISOString().split('T')[0];
  let endDateObj = new Date(startDateObj);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endFormat = endDateObj.toISOString().split('T')[0];

  const clientName = item.clientName || 'Client';
  const phoneText = item.clientPhone || 'Non fourni';
  const locationText = item.location || 'Non fourni';
  const details = item.details || 'Aucun détail';

  const description = `📅 ÉVÉNEMENT DU DJ (AGENDA PRESTATION)\n----------------------------------------\n` +
    `👤 Client : ${clientName}\n` +
    `📞 Téléphone : ${phoneText}\n` +
    `📍 Lieu : ${locationText}\n` +
    `⚡️ Titre de l'événement : ${item.title}\n\n` +
    `📝 DÉTAILS / NOTES :\n${details}\n` +
    `----------------------------------------`;

  const eventTitle = item.isOption ? `[OPTION] ${item.title}` : `${item.title}`;

  const eventResource = {
    summary: eventTitle,
    description: description,
    location: locationText,
    start: {
      date: startFormat,
      timeZone: 'Europe/Paris'
    },
    end: {
      date: endFormat,
      timeZone: 'Europe/Paris'
    }
  };

  const itemEventTypeLower = (item.eventType || '').toLowerCase();
  const itemTitleLower = (item.title || '').toLowerCase();
  if (itemEventTypeLower.includes('hypnose') || itemTitleLower.includes('hypnose')) {
    eventResource.colorId = '10'; // Basil (Green)
  }

  try {
    let response;
    if (item.google_event_id) {
      try {
        response = await calendar.events.update({
          calendarId: targetCalendarId,
          eventId: item.google_event_id,
          resource: eventResource
        });
        console.log(`[GCal Sync] Custom event updated successfully: ${response.data.id}`);
      } catch (updateErr) {
        const status = updateErr.status || (updateErr.response && updateErr.response.status);
        if (status === 404 || status === 410) {
          console.warn(`[GCal Sync] Custom Event ${item.google_event_id} not found in GCal. Re-inserting...`);
          response = await calendar.events.insert({
            calendarId: targetCalendarId,
            resource: eventResource
          });
          console.log(`[GCal Sync] Custom event created successfully (re-inserted): ${response.data.id}`);
        } else {
          throw updateErr;
        }
      }
    } else {
      response = await calendar.events.insert({
        calendarId: targetCalendarId,
        resource: eventResource
      });
      console.log(`[GCal Sync] Custom event created successfully: ${response.data.id}`);
    }

    if (response && response.data && response.data.id) {
      await db.collection('agenda_custom_events').updateOne(
        { _id: new ObjectId(item._id || item.id) },
        { 
          $set: { 
            google_event_id: response.data.id,
            google_calendar_id: targetCalendarId
          } 
        }
      );
      item.google_event_id = response.data.id;
      item.google_calendar_id = targetCalendarId;
    }
    return { success: true };
  } catch (err) {
    const errorMsg = err.message || String(err);
    const isNotFound = err.status === 404 || (err.response && err.response.status === 404) ||
                       (err.errors && err.errors.some(e => e.reason === 'notFound' || e.reason === 'forbidden'));
    if (isNotFound) {
      console.warn(`[GCal Sync Warning] Google Calendar "${targetCalendarId}" non trouvé ou non accessible pour l'événement personnalisé. Veuillez vérifier l'ID : ${errorMsg}`);
    } else {
      console.error(`[GCal Sync Error] Error performing custom event calendar sync: ${errorMsg}`);
    }
    return { success: false, calendarId: targetCalendarId, isNotFound, error: errorMsg };
  }
}

async function tryAutoSyncToGoogle(reservation) {
  try {
    const bType = (reservation.booking_type || '').toLowerCase();
    if (bType !== 'client' && bType !== 'livraison') {
      if (reservation.google_event_id) {
        await deleteReservationFromGoogleCalendar(reservation.google_event_id);
        return 'DELETED';
      }
      return null; // Ignore types that shouldn't be synced
    }
    
    // Si la réservation est annulée, et qu'il y a un événement, on le supprime
    if (reservation.status === 'Cancelled' || reservation.status === 'Annulée' || reservation.status === 'cancelled') {
        if (reservation.google_event_id) {
           await deleteReservationFromGoogleCalendar(reservation.google_event_id);
           return 'DELETED';
        }
        return null; // Rien à supprimer sur google
    }

    const eventId = await syncReservationToCalendar(reservation);
    return eventId;
  } catch (err) {
    console.error('Auto-sync to Google failed silently:', err.message);
    return null;
  }
}
// -----------------------------

async function addPriceToTarifImage(imageBuffer, priceAmount, priceType, endTime, unlimitedTime) {
  const metadata = await sharp(imageBuffer).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;
  
  let priceNum;
  try { priceNum = parseFloat(String(priceAmount).replace(/\s/g, '').replace(',', '.')); }
  catch { priceNum = priceAmount; }
  const priceText = typeof priceNum === 'number' && !isNaN(priceNum)
    ? priceNum.toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/\u202F/g, ' ') + '€'
    : String(priceAmount);
  const typeText = (priceType && priceType !== 'NONE') ? ` ${priceType}` : '';
  
  // Hourly limit text
  const limitText = unlimitedTime ? "sans limite horaire" : (endTime ? `jusqu'à ${endTime}` : "");
  
  const priceFontSize = Math.floor(imgH * 0.041); // Reduced size
  const typeFontSize = Math.floor(priceFontSize * 0.5);
  const limitFontSize = Math.floor(priceFontSize * 0.4);
  
  // New positions calibrated on original_tarif.png
  const yPrice = Math.floor(imgH * 0.355) - 2; // Moved up by 2 pixels total
  const yLimit = Math.floor(imgH * 0.635) + 2; // Moved down by 2 pixels
  const xLimit = Math.floor(imgW * 0.725); // Horizontal position moved slightly to the right

  // Simple and robust SVG overlay
  const svgOverlay = `<svg width="${imgW}" height="${imgH}">
    <text x="${Math.floor(imgW / 2) + 25}" y="${yPrice}" text-anchor="middle" 
          font-family="Poppins, Arial, sans-serif" font-weight="bold" font-size="${priceFontSize}" 
          fill="white" letter-spacing="-2">
      ${priceText.replace(/&/g,'&amp;')}
      <tspan font-weight="normal" font-size="${typeFontSize}" dx="-12" dy="-14">${typeText.replace(/&/g,'&amp;')}</tspan>
    </text>
    ${limitText ? `<text x="${xLimit}" y="${yLimit}" text-anchor="middle" 
          font-family="Poppins, Arial, sans-serif" font-weight="600" font-size="${limitFontSize}" 
          fill="white">
      ${limitText.replace(/&/g,'&amp;')}
    </text>` : ''}
  </svg>`;
  
  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const app = express();
const PORT = 3000;

// Global MIME Type Middleware
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    res.header('Content-Type', 'text/css');
  } else if (req.url.endsWith('.js')) {
    res.header('Content-Type', 'application/javascript');
  }
  next();
});

// ─── Middleware ───
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const clientErrors = [];
app.post('/api/log-client-error', (req, res) => {
  console.log("=== CLIENT REACT ERROR ===", req.body);
  clientErrors.push({ time: new Date().toISOString(), ...req.body });
  if (clientErrors.length > 50) clientErrors.shift(); // keep last 50
  res.json({ ok: true });
});

app.get('/api/get-client-error', (req, res) => {
  res.json(clientErrors);
});

// ─── MongoDB ───
const MONGO_URL = process.env.DATABASE_URL || process.env.MONGO_URL || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'rkey_prod';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const JWT_EXPIRATION_HOURS = 24;

let db;
let dbError = null;

async function connectDB() {
  const usedVar = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.MONGO_URL ? 'MONGO_URL' : (process.env.MONGODB_URI ? 'MONGODB_URI' : 'NONE'));
  if (!MONGO_URL) {
    dbError = "Configuration MongoDB manquante. Veuillez configurer DATABASE_URL ou MONGO_URL dans les secrets.";
    console.warn(dbError);
    return;
  }
  console.log(`Tentative de connexion avec la variable: ${usedVar}`);
  const client = new MongoClient(MONGO_URL, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
  });
  try {
    await client.connect();
    db = client.db(DB_NAME);
    dbError = null;
    console.log(`Connected to MongoDB: ${DB_NAME}`);

    // DIAGNOSTIC LOG FOR RESERVATIONS DUPLICATION
    try {
      const resList = await db.collection('location_reservations').find({}).toArray();
      let logContent = `=== DIAGNOSTIC: FOUND ${resList.length} RESERVATIONS IN DB ===\n`;
      for (const r of resList) {
        logContent += `[DB Res] ID: ${r.id}, Client: ${r.client_name}, BookingType: ${r.booking_type}, Start: ${r.start_date}, End: ${r.end_date}, GCal ID: ${r.google_event_id || 'NONE'}\n`;
      }
      logContent += '==================================================\n';
      fs.writeFileSync(path.join(__dirname, 'diagnostic-reservations.log'), logContent, 'utf8');
      console.log('Diagnostic file written to diagnostic-reservations.log');
    } catch (diagErr) {
      console.error('Error running diagnostic:', diagErr);
    }

    await ensureAdminUser(client);

    // Legacy contracts automation import
    try {
      const importData = [
        {
          name: "Aline et Valentin Benoît",
          event_location: "Ferme d’Argentin",
          event_date: "2026-08-01",
          setup_date: "2026-07-31",
          email: "alineohl@hotmail.fr",
          phone: "0685226338",
          phone2: "0632262708"
        },
        {
          name: "Marie et Xavier Frey / Caroline DeTaddeo",
          event_location: "Mussig",
          event_date: "2026-07-18",
          setup_date: "2026-07-17",
          email: "frey.j@hotmail.fr / carolinedetaddeo@gmail.com",
          phone: "0606993860",
          phone2: "0648440399"
        },
        {
          name: "Chloé et Kevin GERBER",
          event_location: "APP - Ebersheim",
          event_date: "2026-06-13",
          setup_date: "2026-06-12",
          email: "chloeluna1306@gmail.com",
          phone: "0789886993",
          phone2: "0787181877"
        },
        {
          name: "Nathan et Eline Heraief",
          event_location: "Château Burrus - St Croix aux Mines",
          event_date: "2026-09-26",
          setup_date: "2026-09-25",
          email: "eline.achard@gmail.com",
          phone: "0631976741",
          phone2: ""
        },
        {
          name: "Bilger Valentin et Shala Lisa",
          event_location: "Salle Polyvalente de Pulversheim",
          event_date: "2026-09-12",
          setup_date: "2026-09-11",
          email: "valentin.bilger@icloud.com",
          phone: "0601854678",
          phone2: "0640147454"
        }
      ];

      console.log("[Legacy Import] Starting legacy contracts check...");
      const contractsColl = db.collection('contracts2');

      for (const item of importData) {
        const existing = await contractsColl.findOne({ "client_info.name": item.name, "client_info.event_date": item.event_date });
        if (!existing) {
          console.log(`[Legacy Import] Creating contract for ${item.name} on ${item.event_date}...`);
          const contract = {
            id: uuidv4(),
            client_info: {
              name: item.name,
              email: item.email,
              phone: item.phone,
              phone2: item.phone2 || "",
              address: "",
              company: "",
              event_type: "Mariage",
              event_date: item.event_date,
              event_location: item.event_location,
              setup_date: item.setup_date,
              setup_time: "À définir",
              start_time: "17h00",
              end_time: "04h00",
              unlimited_time: false,
              custom_event_type: "",
              event_note: "",
              guest_count: ""
            },
            dj_profile: "stephane",
            dj_profile_data: {
              name: "Stéphane JACOBY (Stefan Edison)",
              nom_complet: "Stéphane JACOBY",
              nom_artistique: "Stefan Edison",
              email: "stephane@rkey-prod.fr",
              phone: "06 31 21 61 14",
              address: "5 rue du Hohlandsbourg, 67390 Marckolsheim",
              siret: "42121827200019",
              titre: "Animateur DJ",
              statut_artiste: "freelance",
              iban: "FR76 4061 8804 8700 0401 4272 395",
              bic: ""
            },
            contract_mode: "mandataire",
            base_price: 0,
            frais_mandat: 0,
            cachet_artiste: 0,
            pack_sonorisation: false,
            pack_lumiere: false,
            selected_options: [],
            options_tarif_notes: "",
            discount_amount: 0,
            invoice_number: "",
            custom_deposit_amount: 0,
            no_deposit_required: false,
            selected_rib: "",
            deposit_paid: false,
            deposit_payment_method: "",
            deposit_paid_date: "",
            has_limiteur_son: false,
            has_detecteur_fumee: false,
            has_no_limiteur_ni_detecteur: false,
            selected_notes: [],
            selected_pdf_notes: [],
            predefined_notes: [],
            selected_music_styles: [],
            dj_notes: "",
            blacklist: "",
            catering_notes: "",
            catering_drinks: "",
            background_music_aperitif: "",
            selected_events: [],
            custom_repas_events: [],
            custom_musique_events: [],
            event_notes: "",
            event_order: [],
            hypnosis_program: {
              intro_time: "",
              has_spectacle: false,
              spectacle_time: "",
              ambient_music: "",
              has_repas_interventions: false,
              interventions_count: "",
              extra_notes: ""
            },
            technician_contact: "",
            cgv_text: "",
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await contractsColl.insertOne(contract);
          await syncContractReservations(contract);
          console.log(`[Legacy Import] Successfully imported contract for ${item.name}!`);
        } else {
          console.log(`[Legacy Import] Contract already exists for ${item.name} (${item.event_date})`);
        }
      }
    } catch (importErr) {
      console.error("[Legacy Import] Error during legacy import:", importErr);
    }

    // Automatically repair mangled UTF-8 filenames caused by Multer latin1 interpretation in existing database documents
    try {
      const notesCollection = db.collection('contract_technical_pdf_notes');
      const allNotes = await notesCollection.find({}).toArray();
      for (const note of allNotes) {
        let needsUpdate = false;
        const updatedFields = {};
        
        const decodedFilename = decodeMangledUtf8(note.filename);
        if (decodedFilename !== note.filename) {
          updatedFields.filename = decodedFilename;
          needsUpdate = true;
        }
        
        const decodedTitle = decodeMangledUtf8(note.title);
        if (decodedTitle !== note.title) {
          updatedFields.title = decodedTitle;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await notesCollection.updateOne({ _id: note._id }, { $set: updatedFields });
          console.log(`[Migration] Repaired note filename/title:`, updatedFields);
        }
      }
      
      const contractsCollection = db.collection('contracts2');
      const allContracts = await contractsCollection.find({ "event_documents": { $exists: true } }).toArray();
      for (const contract of allContracts) {
        if (!Array.isArray(contract.event_documents)) continue;
        let contractNeedsUpdate = false;
        const updatedDocs = contract.event_documents.map(doc => {
          const decodedFilename = decodeMangledUtf8(doc.filename);
          if (decodedFilename !== doc.filename) {
            contractNeedsUpdate = true;
            return { ...doc, filename: decodedFilename };
          }
          return doc;
        });
        
        if (contractNeedsUpdate) {
          await contractsCollection.updateOne({ _id: contract._id }, { $set: { event_documents: updatedDocs } });
          console.log(`[Migration] Repaired event_documents in contract ${contract.id || contract._id}`);
        }
      }
    } catch (e) {
      console.error('Error during UTF-8 mangled filenames migration:', e);
    }

    // TTL index: auto-delete uploaded form files after 24 hours
    try {
      await db.collection('form_files').createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 });
      console.log('TTL index on form_files created (24h)');
    } catch (e) { /* index already exists */ }
  } catch (err) {
    if (err.message.includes('authentication failed') || err.message.includes('bad auth')) {
      dbError = "Erreur d'authentification MongoDB: Le nom d'utilisateur ou le mot de passe dans votre secret est incorrect.";
    } else {
      dbError = `Erreur de connexion MongoDB: ${err.message}`;
    }
    console.error(dbError);
    // Masked log for debugging without exposing secrets
    if (MONGO_URL.includes('@')) {
      const parts = MONGO_URL.split('@');
      const protocol = parts[0].split(':').slice(0, 2).join(':'); // mongodb://user:pass
      console.log(`Connection attempt with: ${protocol}@[HIDDEN]`);
    }
    throw err;
  }
}

// ─── Auth helpers ───
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}
function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}
function createToken(userId, username) {
  return jwt.sign(
    { user_id: userId, username, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: `${JWT_EXPIRATION_HOURS}h` }
  );
}
async function authMiddleware(req, res, next) {
  if (!db) return res.status(503).json({ detail: dbError || "Base de données non connectée" });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Non authentifié' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.collection('users').findOne({ id: payload.user_id });
    if (!user) return res.status(401).json({ detail: 'Utilisateur non trouvé' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ detail: 'Token invalide ou expiré' });
  }
}
function optionalAuth(req, res, next) {
  if (!db) { req.user = null; return next(); }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) { req.user = null; return next(); }
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    db.collection('users').findOne({ id: payload.user_id }).then(u => { req.user = u; next(); }).catch(() => { req.user = null; next(); });
  } catch { req.user = null; next(); }
}

async function generateContentWithRetry(ai, params, modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]) {
  let lastException = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini SDK Request] Attempting model: ${modelName} (Model ${i + 1}/${modelsToTry.length}, Attempt ${attempt}/3)`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName
        });
        if (response && response.text) {
          console.log(`[Gemini SDK Request] Success with model: ${modelName} on attempt ${attempt}`);
          return response;
        }
      } catch (exc) {
        const errorMsg = exc.message || String(exc);
        console.log(`[Gemini SDK Request Error] Model ${modelName} (Attempt ${attempt}/3) exception:`, errorMsg);
        lastException = exc;
        
        const errStr = (errorMsg + JSON.stringify(exc)).toLowerCase();
        const isQuotaOrRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit') || errStr.includes('503') || errStr.includes('unavailable');
        
        if (isQuotaOrRateLimit) {
          console.log(`[Gemini SDK] Detected resource constraint or rate limit (429/503). Skipping further attempts on ${modelName} and moving to fallback model.`);
          break; // Break the attempt loop to move to the next model immediately
        }

        if (attempt < 3) {
          const delay = attempt * 1500;
          console.log(`[Gemini SDK] Waiting ${delay}ms before next retry on ${modelName}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    console.log(`[Gemini SDK Request] Model ${modelName} attempts exhausted. Checking next fallback model...`);
    if (i < modelsToTry.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastException || new Error("All model fallback attempts exhausted.");
}

const ALL_APPS = ["devis","contracts","contracts2","location","agenda-prestation","rental","delivery","crm","billetterie","formulaires","dj-profiles","abonnements","parametres"];
function getDefaultApps(role) {
  if (role === 'location') return ['rental', 'delivery'];
  return [...ALL_APPS];
}
function buildUserResponse(user) {
  const role = user.role || 'admin';
  return {
    id: user.id, username: user.username, full_name: user.full_name || user.username,
    role, allowed_apps: user.allowed_apps || getDefaultApps(role),
    interface_type: user.interface_type || (role === 'location' ? 'mobile' : 'desktop'),
    created_at: user.created_at || new Date().toISOString(),
  };
}

async function ensureAdminUser(client) {
  const adminUser = process.env.ADMIN_USERNAME || 'rkeyprod';
  const adminPass = process.env.ADMIN_PASSWORD || 'agencemarcko';
  const existing = await db.collection('users').findOne({ username: adminUser });
  if (!existing) {
    await db.collection('users').insertOne({
      id: uuidv4().substring(0, 8), username: adminUser, full_name: adminUser,
      hashed_password: hashPassword(adminPass), role: 'admin', allowed_apps: ALL_APPS,
      interface_type: 'desktop', is_active: true, created_at: new Date().toISOString(),
    });
    console.log(`Admin '${adminUser}' created`);
  } else {
    // If the admin user exists, verify if the password matches the dynamic env variable
    // If not, update it to match the current env variable to prevent locking the administrator out.
    if (!verifyPassword(adminPass, existing.hashed_password)) {
      await db.collection('users').updateOne(
        { username: adminUser },
        { $set: { hashed_password: hashPassword(adminPass) } }
      );
      console.log(`Admin '${adminUser}' password updated to match environment configuration`);
    } else {
      console.log(`Admin '${adminUser}' exists and password is synchronized`);
    }
  }

  // Synchronize users and accounts from the default/test database to the active database
  if (client) {
    try {
      const defaultDb = client.db(); // This resolves to 'test' or whichever DB is in connection string URL
      const currentDbName = db.databaseName || DB_NAME;
      if (defaultDb.databaseName && defaultDb.databaseName !== currentDbName) {
        console.log(`Performing cross-database sync from '${defaultDb.databaseName}' to active '${currentDbName}'...`);
        
        // 1. Sync from defaultDb.users to activeDb.users
        try {
          const defaultUsers = await defaultDb.collection('users').find({}).toArray();
          for (const tu of defaultUsers) {
            if (!tu.username) continue;
            const existingInActive = await db.collection('users').findOne({ username: tu.username });
            if (!existingInActive) {
              const newUser = {
                id: tu.id || uuidv4().substring(0, 8),
                username: tu.username,
                full_name: tu.full_name || tu.username,
                hashed_password: tu.hashed_password || hashPassword('agencemarcko'),
                role: tu.role || 'admin',
                allowed_apps: tu.allowed_apps || ALL_APPS,
                interface_type: tu.interface_type || 'desktop',
                is_active: tu.is_active !== false,
                created_at: tu.created_at || tu.createdAt || new Date().toISOString()
              };
              await db.collection('users').insertOne(newUser);
              console.log(`Synced user '${tu.username}' from default DB to active DB`);
            }
          }
        } catch (errUsers) {
          console.error('Error syncing users from default DB:', errUsers);
        }

        // 2. Sync from defaultDb.accounts to activeDb.users
        try {
          const collections = await defaultDb.listCollections().toArray();
          if (collections.some(c => c.name === 'accounts')) {
            const defaultAccounts = await defaultDb.collection('accounts').find({}).toArray();
            for (const ta of defaultAccounts) {
              if (!ta.username) continue;
              const existingInActive = await db.collection('users').findOne({ username: ta.username });
              if (!existingInActive) {
                const newUser = {
                  id: ta.id || uuidv4().substring(0, 8),
                  username: ta.username,
                  full_name: ta.dj_name || ta.username,
                  hashed_password: hashPassword(ta.password || 'admin_password_123'),
                  role: ta.is_super_admin ? 'admin' : 'custom',
                  allowed_apps: ALL_APPS,
                  interface_type: 'desktop',
                  is_active: true,
                  created_at: ta.createdAt || new Date().toISOString()
                };
                await db.collection('users').insertOne(newUser);
                console.log(`Synced account '${ta.username}' from default DB to active DB`);
              } else {
                if (ta.password && !verifyPassword(ta.password, existingInActive.hashed_password)) {
                  await db.collection('users').updateOne(
                    { username: ta.username },
                    { $set: { hashed_password: hashPassword(ta.password) } }
                  );
                  console.log(`Updated synced user '${ta.username}' password in active DB to match accounts`);
                }
              }
            }
          }
        } catch (errAccs) {
          console.error('Error syncing accounts from default DB:', errAccs);
        }
      }
    } catch (syncErr) {
      console.error('Error during cross-database synchronization:', syncErr);
    }
  }

  // Also keep the simple local accounts synchronization as fallback
  try {
    const collections = await db.listCollections().toArray();
    if (collections.some(c => c.name === 'accounts')) {
      const accounts = await db.collection('accounts').find({}).toArray();
      for (const acc of accounts) {
        if (!acc.username) continue;
        const existingUser = await db.collection('users').findOne({ username: acc.username });
        const role = acc.is_super_admin ? 'admin' : 'custom';
        if (!existingUser) {
          const newUser = {
            id: acc.id || uuidv4().substring(0, 8),
            username: acc.username,
            full_name: acc.dj_name || acc.username,
            hashed_password: hashPassword(acc.password || 'admin_password_123'),
            role: role,
            allowed_apps: ALL_APPS,
            interface_type: 'desktop',
            is_active: true,
            created_at: acc.createdAt || new Date().toISOString()
          };
          await db.collection('users').insertOne(newUser);
          console.log(`Synced local account '${acc.username}' to users collection`);
        } else {
          if (acc.password && !verifyPassword(acc.password, existingUser.hashed_password)) {
            await db.collection('users').updateOne(
              { username: acc.username },
              { $set: { hashed_password: hashPassword(acc.password) } }
            );
            console.log(`Updated synced local user '${acc.username}' password to match accounts collection`);
          }
        }
      }
    }
  } catch (syncErr) {
    console.error('Error synchronizing local accounts to users:', syncErr);
  }
}

// ─── Helper: clean _id from results ───
function clean(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}
function cleanList(docs) { return docs.map(clean); }

// File upload config
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function decodeMulterFilename(originalName) {
  if (!originalName) return '';
  try {
    // Multer parses headers as ISO-8859-1 (latin1); convert back to proper UTF-8
    return Buffer.from(originalName, 'latin1').toString('utf8');
  } catch (e) {
    return originalName;
  }
}

function decodeMangledUtf8(str) {
  if (!str) return '';
  try {
    // UTF-8 sequences (2-byte or 3-byte) interpreted as ISO-8859-1 / Latin-1:
    // 2-byte: starting with 0xC0-0xDF followed by 0x80-0xBF
    // 3-byte: starting with 0xE0-0xEF followed by two 0x80-0xBF bytes
    const hasMangled = /([\u00C0-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2})/.test(str);
    if (hasMangled) {
      const decoded = Buffer.from(str, 'latin1').toString('utf8');
      if (!decoded.includes('\uFFFD')) { // No replacement character ''
        return decoded;
      }
    }
    return str;
  } catch (e) {
    return str;
  }
}

// ─── SMTP helper ───
async function getSmtpConfig() {
  const settings = await db.collection('global_settings').findOne({ type: 'company' });
  return {
    smtp_server: (settings && settings.smtp_server) || process.env.SMTP_SERVER || '',
    smtp_port: (settings && settings.smtp_port) || process.env.SMTP_PORT || '587',
    smtp_encryption: (settings && settings.smtp_encryption) || 'auto',
    smtp_user: (settings && settings.smtp_user) || process.env.SMTP_USER || '',
    smtp_password: (settings && settings.smtp_password) || process.env.SMTP_PASSWORD || '',
    smtp_from: (settings && settings.smtp_from) || process.env.SMTP_FROM || '',
    smtp_from_name: (settings && settings.smtp_from_name) || 'R\'KEY PROD',
  };
}

function createTransporter(cfg) {
  const port = parseInt(cfg.smtp_port);
  const encryption = cfg.smtp_encryption || 'auto';
  let secure;
  if (encryption === 'ssl') secure = true;
  else if (encryption === 'tls' || encryption === 'none') secure = false;
  else secure = port === 465;
  const opts = {
    host: cfg.smtp_server, port: port, secure: secure,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_password },
  };
  if (encryption === 'tls') opts.requireTLS = true;
  return nodemailer.createTransport(opts);
}

// ═══════════════════════════════════════════
// API ROUTES - all prefixed with /api
// ═══════════════════════════════════════════
const api = express.Router();

// --- Push Notification Routes ---
api.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUB });
});

api.post('/push/subscribe', async (req, res) => {
  try {
    const { subscription, role, eventId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription or endpoint missing' });
    }
    if (!db) {
      return res.status(500).json({ error: 'DB not connected' });
    }
    await db.collection('push_subscriptions').updateOne(
      { endpoint: subscription.endpoint },
      { $set: { subscription, role, eventId, createdAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving subscription', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

api.post('/push/notify', async (req, res) => {
  try {
    const { eventId, targetRoles, title, body, url } = req.body;
    if (!db) {
      return res.status(500).json({ error: 'DB not connected' });
    }

    // targetRoles e.g. ['admin', 'dj', 'client']
    const query = {};
    if (eventId) {
      query.$or = [
        { role: 'admin' }, // admin gets all notifications usually, or depends on targetRoles
        { eventId }
      ];
    }
    
    // Actually, just find based on eventId + role OR just role=admin
    const subs = await db.collection('push_subscriptions').find().toArray();
    const validSubs = subs.filter(sub => {
      // If admin is in targetRoles, notify all admins
      if (targetRoles.includes('admin') && sub.role === 'admin') return true;
      // For DJ or Client, they must match the specific event
      if (targetRoles.includes(sub.role) && sub.eventId === eventId) return true;
      return false;
    });

    const payload = JSON.stringify({ title, body, url });
    const promises = validSubs.map(sub => 
      webpush.sendNotification(sub.subscription, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          db.collection('push_subscriptions').deleteOne({ _id: sub._id }); // cleanup
        } else {
          console.error("Push error: ", err);
        }
      })
    );

    await Promise.all(promises);
    res.status(200).json({ success: true, count: validSubs.length });
  } catch (error) {
    console.error('Notify error', error);
    res.status(500).json({ error: 'Failed' });
  }
});

api.get('/location/google-calendar-status', authMiddleware, async (req, res) => {
  let serviceAccountEmail = null;
  const credentials = getGoogleLocationCalendarCredentials();
  if (credentials) {
    serviceAccountEmail = credentials.client_email;
  } else if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    try {
      const creds = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
      serviceAccountEmail = creds.client_email;
    } catch (e) {
      console.error('Failed to read credentials file', e);
    }
  }
  
  await initLocationGoogleCalendar();
  const currentId = await resolveLocationCalendarId();
  
  res.json({
    initialized: !!locationCalendar,
    locationCalendarFound: currentId !== null && currentId !== 'primary',
    serviceAccountEmail: serviceAccountEmail,
    locationCalendarId: currentId || ''
  });
});

// Middleware: Check if DB is connected
api.use((req, res, next) => {
  console.log(`API [${req.method}] ${req.originalUrl}`);
  if (req.path === '/health') return next();
  if (!db) {
    return res.status(503).json({ 
      detail: dbError || "Le serveur n'est pas connecté à la base de données. Veuillez vérifier vos secrets MongoDB." 
    });
  }
  next();
});

// ─── Health ───
api.get('/health', (req, res) => res.json({ status: db ? 'ok' : 'error', error: dbError }));

// Utility: convert data URI images in HTML to CID inline attachments for email
function convertDataUriToCid(html, existingAttachments = []) {
  let finalHtml = html;
  const attachments = [...existingAttachments];
  const dataUriRegex = /<img[^>]+src="(data:image\/(png|jpeg|jpg|gif);base64,([^"]+))"[^>]*>/gi;
  let match;
  let cidCounter = 0;
  while ((match = dataUriRegex.exec(html)) !== null) {
    cidCounter++;
    const cid = `sig_${cidCounter}_${Date.now()}@rkeyprod`;
    const ext = (match[2] === 'jpeg' || match[2] === 'jpg') ? 'jpg' : match[2];
    attachments.push({
      filename: `signature_${cidCounter}.${ext}`,
      content: match[3],
      encoding: 'base64',
      contentType: `image/${match[2]}`,
      cid: cid,
      contentDisposition: 'inline'
    });
    finalHtml = finalHtml.replace(match[1], `cid:${cid}`);
  }
  return { html: finalHtml, attachments };
}

// ══════════ AUTH ══════════
api.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username });
    if (!user || !verifyPassword(password, user.hashed_password))
      return res.status(401).json({ detail: 'Identifiant ou mot de passe incorrect' });
    if (user.is_active === false) return res.status(401).json({ detail: 'Compte désactivé' });
    const token = createToken(user.id, user.username);
    res.json({ access_token: token, token_type: 'bearer', user: buildUserResponse(user) });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

api.get('/auth/me', authMiddleware, (req, res) => res.json(buildUserResponse(req.user)));

api.get('/auth/users', authMiddleware, async (req, res) => {
  const users = await db.collection('users').find({ is_active: { $ne: false } }, { projection: { _id: 0, hashed_password: 0 } }).toArray();
  res.json(users.map(u => {
    const role = u.role || 'admin';
    return { username: u.username, full_name: u.full_name || u.username, role, allowed_apps: u.allowed_apps || getDefaultApps(role), interface_type: u.interface_type || (role === 'location' ? 'mobile' : 'desktop') };
  }));
});

api.post('/auth/switch-user', authMiddleware, async (req, res) => {
  const target = await db.collection('users').findOne({ username: req.body.target_username });
  if (!target || target.is_active === false) return res.status(404).json({ detail: 'Utilisateur introuvable' });
  const token = createToken(target.id, target.username);
  res.json({ access_token: token, token_type: 'bearer', user: buildUserResponse(target) });
});

api.get('/auth/users-admin', authMiddleware, async (req, res) => {
  const users = await db.collection('users').find({}, { projection: { _id: 0, hashed_password: 0 } }).toArray();
  res.json(users.map(u => ({ ...u, role: u.role || 'admin', allowed_apps: u.allowed_apps || getDefaultApps(u.role || 'admin'), interface_type: u.interface_type || 'desktop', is_active: u.is_active !== false })));
});

api.post('/auth/users-admin', authMiddleware, async (req, res) => {
  const { username, password, full_name, allowed_apps, interface_type } = req.body;
  if (await db.collection('users').findOne({ username })) return res.status(400).json({ detail: 'Ce nom existe déjà' });
  const user = { id: uuidv4().substring(0, 8), username: username.trim(), full_name: (full_name || username).trim(), hashed_password: hashPassword(password), role: 'custom', allowed_apps: allowed_apps || [], interface_type: interface_type || 'desktop', is_active: true, created_at: new Date().toISOString() };
  await db.collection('users').insertOne(user);
  const { hashed_password, _id, ...safe } = user;
  res.json(safe);
});

api.put('/auth/users-admin/:userId', authMiddleware, async (req, res) => {
  const update = {};
  if (req.body.full_name != null) update.full_name = req.body.full_name.trim();
  if (req.body.password) update.hashed_password = hashPassword(req.body.password);
  if (req.body.allowed_apps != null) update.allowed_apps = req.body.allowed_apps;
  if (req.body.interface_type != null) update.interface_type = req.body.interface_type;
  if (Object.keys(update).length) await db.collection('users').updateOne({ id: req.params.userId }, { $set: update });
  const updated = await db.collection('users').findOne({ id: req.params.userId }, { projection: { _id: 0, hashed_password: 0 } });
  if (!updated) return res.status(404).json({ detail: 'Utilisateur introuvable' });
  res.json(updated);
});

api.delete('/auth/users-admin/:userId', authMiddleware, async (req, res) => {
  if (req.params.userId === req.user.id) return res.status(400).json({ detail: 'Impossible de supprimer votre propre compte' });
  await db.collection('users').deleteOne({ id: req.params.userId });
  res.json({ success: true });
});

// ══════════ HOME ══════════
api.get('/home/dashboard', authMiddleware, async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Monday=0
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
  const [devis_envoi_pending, location_pending, location_accepted_total, contracts_pending_signature] = await Promise.all([
    db.collection('devis2_sent').countDocuments({ status: 'en_attente' }),
    db.collection('location_quotes').countDocuments({ status: 'En attente', is_archived: { $ne: true } }),
    db.collection('location_quotes').countDocuments({ status: 'Accepté', is_archived: { $ne: true } }),
    db.collection('contracts2').countDocuments({ status: 'sent' }),
  ]);
  const location_accepted_week = await db.collection('location_quotes').countDocuments({
    status: 'Accepté', is_archived: { $ne: true },
    start_date: { $gte: startOfWeek.toISOString().slice(0,10), $lte: endOfWeek.toISOString().slice(0,10) }
  });
  const location_to_deliver_week = await db.collection('location_quotes').countDocuments({
    status: 'Accepté', is_archived: { $ne: true },
    start_date: { $gte: startOfWeek.toISOString().slice(0,10), $lte: endOfWeek.toISOString().slice(0,10) },
    $or: [{ delivery_cost: { $gt: 0 } }, { delivery_zone: { $exists: true, $ne: '' } }]
  });
  res.json({ devis_envoi_pending, location_pending, location_accepted_week, location_accepted_total, location_to_deliver_week, contracts_pending_signature });
});

api.get('/home-notes', authMiddleware, async (req, res) => {
  const notes = await db.collection('home_notes').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
  res.json(notes);
});
api.post('/home-notes', authMiddleware, async (req, res) => {
  const note = { id: uuidv4(), ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('home_notes').insertOne(note);
  res.json(clean(note));
});
api.put('/home-notes/:id', authMiddleware, async (req, res) => {
  await db.collection('home_notes').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const doc = await db.collection('home_notes').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(doc);
});
api.delete('/home-notes/:id', authMiddleware, async (req, res) => {
  await db.collection('home_notes').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/dj-client/pending-alerts', authMiddleware, async (req, res) => {
  try {
    const contracts = await db.collection('contracts2').find(
      { status: { $nin: ['trash'] } },
      { projection: { notifications: 1, dj_profile: 1, dj_profile_data: 1 } }
    ).toArray();
    let count = 0;
    const userRole = req.user?.role || 'admin';
    const userName = (req.user?.full_name || req.user?.username || '').toLowerCase();

    contracts.forEach(c => {
      if (userRole === 'admin') {
        if (c.notifications && c.notifications.admin && typeof c.notifications.admin === 'object') {
          count += Object.keys(c.notifications.admin).length;
        }
      } else {
        const djName = (c.dj_profile_data?.nom_artistique || c.dj_profile || '').toLowerCase();
        const userNameLower = userName.toLowerCase();
        const isAssigned = djName.includes(userNameLower) || userNameLower.includes(djName) || 
                           (userNameLower === 'joel' && djName.includes('joël')) ||
                           (userNameLower === 'joël' && djName.includes('joel')) ||
                           (userNameLower === 'stefan' && djName.includes('stéphane')) ||
                           (userNameLower === 'stéphane' && djName.includes('stefan'));
                           
        if (isAssigned && c.notifications && c.notifications.dj && typeof c.notifications.dj === 'object') {
          count += Object.keys(c.notifications.dj).length;
        }
      }
    });
    res.json({ count });
  } catch (error) {
    console.error("Error in /dj-client/pending-alerts:", error);
    res.json({ count: 0 });
  }
});

api.get('/dj-client/admin/contracts', authMiddleware, async (req, res) => {
  try {
    const contracts = await db.collection('contracts2').find(
      { status: { $nin: ['trash', 'deleted', 'draft'] } },
      { projection: { cgv_text: 0, predefined_notes: 0, _id: 0 } }
    ).toArray();
    res.json(cleanList(contracts));
  } catch (error) {
    console.error("Error in /dj-client/admin/contracts:", error);
    res.status(500).json({ error: error.message });
  }
});

// ══════════ GLOBAL SETTINGS ══════════
api.get('/global-settings', authMiddleware, async (req, res) => {
  const settings = await db.collection('global_settings').findOne({ type: 'company' }, { projection: { _id: 0, email_signature_image: 0 } });
  if (settings) {
    settings.has_email_signature = !!(await db.collection('global_settings').findOne({ type: 'company', email_signature_image: { $exists: true, $ne: '' } }));
    settings.smtp_password_set = !!settings.smtp_password;
    settings.smtp_password = '';
    return res.json(settings);
  }
  res.json({ type: 'company', company_name: '', company_address: '', company_siret: '', company_tva: '', company_email: '', bank_name: '', bank_iban: '', bank_bic: '', bank_titulaire: '', smtp_server: '', smtp_port: '587', smtp_encryption: 'auto', smtp_user: '', smtp_password: '', smtp_from: '', smtp_from_name: '', has_email_signature: false, smtp_password_set: false });
});

api.put('/global-settings', authMiddleware, async (req, res) => {
  const data = { ...req.body, type: 'company', updated_at: new Date().toISOString() };
  if (!data.smtp_password) delete data.smtp_password;
  await db.collection('global_settings').updateOne({ type: 'company' }, { $set: data }, { upsert: true });
  res.json(data);
});

api.get('/global-settings/email-signature', authMiddleware, async (req, res) => {
  const s = await db.collection('global_settings').findOne({ type: 'company' }, { projection: { _id: 0, email_signature_image: 1 } });
  res.json({ email_signature_image: s?.email_signature_image || '' });
});
api.put('/global-settings/email-signature', authMiddleware, async (req, res) => {
  await db.collection('global_settings').updateOne({ type: 'company' }, { $set: { email_signature_image: req.body.email_signature_image, updated_at: new Date().toISOString() } }, { upsert: true });
  res.json({ success: true });
});
api.delete('/global-settings/email-signature', authMiddleware, async (req, res) => {
  await db.collection('global_settings').updateOne({ type: 'company' }, { $set: { email_signature_image: '', updated_at: new Date().toISOString() } });
  res.json({ success: true });
});
api.post('/global-settings/test-email', authMiddleware, async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    const transporter = createTransporter(cfg);
    await transporter.sendMail({ from: `${cfg.smtp_from_name} <${cfg.smtp_from}>`, to: req.body.recipient, subject: 'Test SMTP - R\'KEY PROD', html: '<h2>Configuration SMTP OK</h2><p>Ce message confirme que vos paramètres SMTP fonctionnent correctement.</p>' });
    res.json({ success: true, message: `Email de test envoyé à ${req.body.recipient}` });
  } catch (e) { res.status(500).json({ detail: `Erreur: ${e.message}` }); }
});

// ══════════ PARTNERS ══════════
api.get('/partners/categories', authMiddleware, async (req, res) => {
  let cats = await db.collection('partner_categories').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
  if (cats.length === 0) {
    const defaults = ['Photographe','Vidéaste','Fleuriste','Traiteur','DJ','Lieu de réception','Wedding Planner','Officiant','Décoration','Papeterie','Coiffeur','Maquilleur','Transport','Hébergement','Animation','Autre'];
    for (const name of defaults) await db.collection('partner_categories').insertOne({ id: uuidv4(), name });
    cats = await db.collection('partner_categories').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
  }
  res.json(cats);
});
api.post('/partners/categories', authMiddleware, async (req, res) => {
  const cat = { id: uuidv4(), name: req.body.name };
  await db.collection('partner_categories').insertOne(cat);
  res.json(clean(cat));
});
api.delete('/partners/categories/:id', authMiddleware, async (req, res) => {
  await db.collection('partner_categories').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/partners', authMiddleware, async (req, res) => {
  const query = req.query.category ? { category: req.query.category } : {};
  const partners = await db.collection('partners').find(query, { projection: { _id: 0 } }).sort({ sort_order: 1, last_name: 1 }).toArray();
  res.json(await autoSignGcsUrlsInObject(partners));
});
api.put('/partners/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.order || [])) await db.collection('partners').updateOne({ id: item.id }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});
api.get('/partners/:id', authMiddleware, async (req, res) => {
  const p = await db.collection('partners').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!p) return res.status(404).json({ detail: 'Not found' });
  res.json(await autoSignGcsUrlsInObject(p));
});
api.post('/partners', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  if (body.photo) body.photo = await uploadBase64ToGcs(body.photo, 'partners-photos');
  if (body.cover_photo) body.cover_photo = await uploadBase64ToGcs(body.cover_photo, 'partners-photos');
  
  const partner = { id: uuidv4(), ...body, sort_order: body.sort_order || 999, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('partners').insertOne(partner);
  res.json(await autoSignGcsUrlsInObject(clean(partner)));
});
api.put('/partners/:id', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  if (body.photo) body.photo = await uploadBase64ToGcs(body.photo, 'partners-photos');
  if (body.cover_photo) body.cover_photo = await uploadBase64ToGcs(body.cover_photo, 'partners-photos');

  await db.collection('partners').updateOne({ id: req.params.id }, { $set: { ...body, updated_at: new Date().toISOString() } });
  const updated = await db.collection('partners').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(await autoSignGcsUrlsInObject(updated));
});
api.delete('/partners/:id', authMiddleware, async (req, res) => {
  await db.collection('partners').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

api.post('/partners/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) return res.status(500).json({ detail: 'GCS not configured' });
  try {
    const items = await db.collection('partners').find({
      $or: [
        { photo: { $regex: /^data:image/ } },
        { cover_photo: { $regex: /^data:image/ } }
      ]
    }).toArray();
    if (items.length === 0) return res.json({ success: true, message: 'Toutes les photos sont déjà migrées', migrated: 0, errors: 0 });
    let migrated = 0;
    let errors = 0;
    for (const item of items) {
      try {
        const update = {};
        if (item.photo && item.photo.startsWith('data:image')) {
          update.photo = await uploadBase64ToGcs(item.photo, 'partners-photos');
        }
        if (item.cover_photo && item.cover_photo.startsWith('data:image')) {
          update.cover_photo = await uploadBase64ToGcs(item.cover_photo, 'partners-photos');
        }
        if (Object.keys(update).length > 0) {
          await db.collection('partners').updateOne({ id: item.id }, { $set: update });
          migrated++;
        }
      } catch (e) {
        errors++;
      }
    }
    res.json({ success: true, migrated, errors });
  } catch (err) {
    res.status(500).json({ detail: 'Migration failed' });
  }
});
api.post('/partners/ocr', authMiddleware, (req, res) => res.json({ first_name: '', last_name: '', company: '', phone: '', email: '', website: '' }));
api.get('/partners/widget/:category', authMiddleware, async (req, res) => {
  const partners = await db.collection('partners').find({ category: req.params.category }, { projection: { _id: 0, card_recto: 0, card_verso: 0 } }).sort({ sort_order: 1, last_name: 1 }).toArray();
  res.json(await autoSignGcsUrlsInObject(partners));
});
api.get('/partners/public/widget/:category', async (req, res) => {
  const partners = await db.collection('partners').find({ category: req.params.category }, { projection: { _id: 0, card_recto: 0, card_verso: 0, notes: 0 } }).sort({ sort_order: 1, last_name: 1 }).toArray();
  res.json(await autoSignGcsUrlsInObject(partners));
});

// ══════════ DJ PROFILES ══════════
const DJ_PRIVATE = new Set(['nom_complet','email','telephone','siret','adresse_postale','statut_artiste','iban','bic']);
api.get('/dj-fiches', authMiddleware, async (req, res) => {
  res.json(await autoSignGcsUrlsInObject(cleanList(await db.collection('dj_profiles').find({}, { projection: { _id: 0 } }).toArray())));
});
api.get('/dj-fiches/public', async (req, res) => {
  const profiles = await db.collection('dj_profiles').find({ actif: true }, { projection: { _id: 0 } }).toArray();
  const cleaned = profiles.map(p => { const r = {}; for (const [k,v] of Object.entries(p)) { if (!DJ_PRIVATE.has(k)) r[k] = v; } return r; });
  res.json(await autoSignGcsUrlsInObject(cleaned));
});
api.get('/dj-fiches/public/:id', async (req, res) => {
  let profileId = req.params.id;
  if (!profileId) return res.status(404).json({ detail: 'DJ Profile not found' });
  
  profileId = profileId.trim();
  let p = null;
  
  if (profileId.startsWith('rkey-dj-')) {
     const shortId = profileId.replace('rkey-dj-', '').trim();
     p = await db.collection('dj_profiles').findOne({ id: { $regex: new RegExp(`^${shortId}`, 'i') } }, { projection: { _id: 0 } });
  } else {
     p = await db.collection('dj_profiles').findOne({ id: { $regex: new RegExp(profileId, 'i') } }, { projection: { _id: 0 } });
     if (!p && profileId.length >= 8) {
       p = await db.collection('dj_profiles').findOne({ id: { $regex: new RegExp(`^${profileId.substring(0,8)}`, 'i') } }, { projection: { _id: 0 } });
     }
  }

  // Fallback: lookup by artist name (partial match) in case they passed the name instead of ID
  if (!p) {
     p = await db.collection('dj_profiles').findOne({ nom_artistique: { $regex: new RegExp(profileId, 'i') } }, { projection: { _id: 0 } });
  }

  if (!p) return res.status(404).json({ detail: 'DJ Profile not found' });
  const r = {}; for (const [k,v] of Object.entries(p)) { if (!DJ_PRIVATE.has(k)) r[k] = v; } 
  res.json(await autoSignGcsUrlsInObject(r));
});
api.post('/dj-fiches', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  if (body.photo) body.photo = await uploadBase64ToGcs(body.photo, 'dj-photos');
  if (body.photo_url && body.photo_url.startsWith('data:')) body.photo_url = await uploadBase64ToGcs(body.photo_url, 'dj-photos');
  if (body.logo) body.logo = await uploadBase64ToGcs(body.logo, 'dj-photos');
  if (body.logo_url && body.logo_url.startsWith('data:')) body.logo_url = await uploadBase64ToGcs(body.logo_url, 'dj-photos');

  const profile = { id: uuidv4(), ...body, created_at: new Date().toISOString() };
  await db.collection('dj_profiles').insertOne(profile);
  res.json(await autoSignGcsUrlsInObject(clean(profile)));
});
api.put('/dj-fiches/:id', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  if (body.photo) body.photo = await uploadBase64ToGcs(body.photo, 'dj-photos');
  if (body.photo_url && body.photo_url.startsWith('data:')) body.photo_url = await uploadBase64ToGcs(body.photo_url, 'dj-photos');
  if (body.logo) body.logo = await uploadBase64ToGcs(body.logo, 'dj-photos');
  if (body.logo_url && body.logo_url.startsWith('data:')) body.logo_url = await uploadBase64ToGcs(body.logo_url, 'dj-photos');

  await db.collection('dj_profiles').updateOne({ id: req.params.id }, { $set: body });
  const updated = await db.collection('dj_profiles').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(await autoSignGcsUrlsInObject(updated));
});
api.delete('/dj-fiches/:id', authMiddleware, async (req, res) => {
  await db.collection('dj_profiles').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// DJ Profile Attachments
api.post('/dj-fiches/:id/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const docId = uuidv4();
  const decodedOriginalname = decodeMulterFilename(req.file.originalname);
  
  try {
    const { buffer: pdfBuffer, filename: convertedFilename } = await convertToPdfBuffer(req.file.buffer, decodedOriginalname, req.file.mimetype);
    
    const newDoc = {
      id: docId,
      filename: convertedFilename,
      uploaded_at: new Date().toISOString()
    };
    
    if (bucket) {
      const gcsPath = `dj-profiles-attachments/${req.params.id}/${docId}.pdf`;
      const file = bucket.file(gcsPath);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
      newDoc.gcs_path = gcsPath;
    } else {
      newDoc.pdf_data = pdfBuffer.toString('base64');
    }
    
    await db.collection('dj_profiles').updateOne(
      { id: req.params.id }, 
      { $push: { attachments: newDoc } }
    );
    
    res.json({ success: true, document: { id: newDoc.id, filename: newDoc.filename, uploaded_at: newDoc.uploaded_at } });
  } catch (err) {
    console.error("[DjProfileAttachment] Error:", err);
    res.status(500).json({ error: "Erreur lors de la conversion ou de l'upload: " + err.message });
  }
});

api.get('/dj-fiches/:id/attachments/:docId', authMiddleware, async (req, res) => {
  const profile = await db.collection('dj_profiles').findOne({ id: req.params.id });
  if (!profile || !profile.attachments) return res.status(404).json({ error: 'Not found' });
  const doc = profile.attachments.find(d => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  
  const isInline = req.query.preview === 'true' || req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';

  const activeBucket = getGcsBucket();
  if (doc.gcs_path && activeBucket) {
    const file = activeBucket.file(doc.gcs_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    file.createReadStream().on('error', (err) => res.status(500).send('Error')).pipe(res);
  } else if (doc.pdf_data) {
    const buffer = Buffer.from(doc.pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    res.send(buffer);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

api.delete('/dj-fiches/:id/attachments/:docId', authMiddleware, async (req, res) => {
  try {
    const profile = await db.collection('dj_profiles').findOne({ id: req.params.id });
    if (!profile || !profile.attachments) return res.status(404).json({ error: 'Not found' });
    const doc = profile.attachments.find(d => d.id === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const activeBucket = getGcsBucket();
    if (doc.gcs_path && activeBucket) {
      try {
        await activeBucket.file(doc.gcs_path).delete();
      } catch (err) {
        console.error("Error deleting GCS file:", err);
      }
    }

    await db.collection('dj_profiles').updateOne(
      { id: req.params.id },
      { $pull: { attachments: { id: req.params.docId } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting attachment:", err);
    res.status(500).json({ error: err.message });
  }
});

api.post('/dj-fiches/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) return res.status(500).json({ detail: 'GCS not configured' });
  try {
    const items = await db.collection('dj_profiles').find({
      $or: [
        { photo: { $regex: /^data:image/ } },
        { logo: { $regex: /^data:image/ } }
      ]
    }).toArray();
    if (items.length === 0) return res.json({ success: true, message: 'Toutes les photos sont déjà migrées', migrated: 0, errors: 0 });
    let migrated = 0;
    let errors = 0;
    for (const item of items) {
      try {
        const update = {};
        if (item.photo && item.photo.startsWith('data:image')) {
          update.photo = await uploadBase64ToGcs(item.photo, 'dj-photos');
        }
        if (item.logo && item.logo.startsWith('data:image')) {
          update.logo = await uploadBase64ToGcs(item.logo, 'dj-photos');
        }
        if (Object.keys(update).length > 0) {
          await db.collection('dj_profiles').updateOne({ id: item.id }, { $set: update });
          migrated++;
        }
      } catch (e) {
        errors++;
      }
    }
    res.json({ success: true, migrated, errors });
  } catch (err) {
    res.status(500).json({ detail: 'Migration failed' });
  }
});
// Alias for contracts module - returns {profiles: {id: {...}, ...}} format expected by ContractsApp
api.get('/dj-profiles', authMiddleware, async (req, res) => {
  const list = await db.collection('dj_profiles').find({}, { projection: { _id: 0 } }).toArray();
  const profilesMap = {};
  list.forEach(p => { 
    if (p.id) {
      // Ensure compatibility with old components expecting .name
      if (!p.name && p.nom_artistique) {
        p.name = p.nom_artistique;
      }
      profilesMap[p.id] = p; 
    }
  });
  res.json(await autoSignGcsUrlsInObject({ profiles: profilesMap }));
});

// ══════════ EVENTS / BILLETTERIE ══════════
api.get('/billetterie/events', authMiddleware, async (req, res) => {
  const list = cleanList(await db.collection('events').find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray());
  res.json(await autoSignGcsUrlsInObject(list));
});
api.get('/billetterie/events/public', async (req, res) => {
  const list = cleanList(await db.collection('events').find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray());
  res.json(await autoSignGcsUrlsInObject(list));
});
api.post('/billetterie/events', authMiddleware, async (req, res) => {
  const event = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('events').insertOne(event);
  res.json(await autoSignGcsUrlsInObject(clean(event)));
});
api.put('/billetterie/events/:id', authMiddleware, async (req, res) => {
  await db.collection('events').updateOne({ id: req.params.id }, { $set: req.body });
  const updated = await db.collection('events').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(await autoSignGcsUrlsInObject(updated));
});
api.delete('/billetterie/events/:id', authMiddleware, async (req, res) => {
  await db.collection('events').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/billetterie/upload-image', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  try {
    if (bucket) {
      const ext = path.extname(req.file.originalname) || '';
      const imageId = uuidv4();
      const gcsPath = `events-photos/${imageId}${ext}`;
      const file = bucket.file(gcsPath);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      res.json({ success: true, id: imageId, image_url: `/api/gcs/${gcsPath}`, url: `/api/gcs/${gcsPath}` });
    } else {
      const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const doc = { id: uuidv4(), data: b64, created_at: new Date().toISOString() };
      await db.collection('event_images').insertOne(doc);
      res.json({ success: true, id: doc.id, image_url: b64, url: b64 });
    }
  } catch (error) {
    console.error('Error uploading event image:', error);
    res.status(500).json({ detail: 'Erreur lors de l\'upload de l\'image' });
  }
});

api.post('/billetterie/events/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) return res.status(500).json({ detail: 'GCS not configured' });
  try {
    const items = await db.collection('events').find({
      photo_url: { $regex: /^data:image/ }
    }).toArray();
    if (items.length === 0) return res.json({ success: true, message: 'Toutes les photos sont déjà migrées', migrated: 0, errors: 0 });
    let migrated = 0; let errors = 0;
    for (const item of items) {
      if (item.photo_url && item.photo_url.startsWith('data:image')) {
        try {
          const newUrl = await uploadBase64ToGcs(item.photo_url, 'events-photos');
          await db.collection('events').updateOne({ id: item.id }, { $set: { photo_url: newUrl } });
          migrated++;
        } catch (e) { errors++; }
      }
    }
    res.json({ success: true, migrated, errors });
  } catch (err) {
    res.status(500).json({ detail: 'Migration failed' });
  }
});
api.post('/billetterie/migrate-images', authMiddleware, (req, res) => res.json({ migrated: 0 }));
api.get('/uploads/events/:filename', async (req, res) => {
  try {
    const upload = await db.collection('event_uploads').findOne({ upload_id: req.params.filename });
    if (!upload || !upload.data) return res.status(404).json({ detail: 'Not found' });
    const imgBuffer = Buffer.from(upload.data, 'base64');
    res.set('Content-Type', upload.content_type || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    if (req.query.download === 'true') {
      const ext = upload.content_type && upload.content_type.split('/')[1] || 'png';
      res.setHeader('Content-Disposition', `attachment; filename="photo-${req.params.filename}.${ext}"`);
    }
    res.send(imgBuffer);
  } catch { res.status(404).json({ detail: 'Not found' }); }
});

// ══════════ CONTRACTS (LEGACY REDIRECT TO CONTRACTS2) ══════════
api.get('/contracts', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: { $nin: ['trash'] } }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts/:id', authMiddleware, async (req, res) => {
  const c = await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!c) return res.status(404).json({ detail: 'Not found' });
  res.json(c);
});
// Note: Management of legacy contracts is now disabled. Pointing to contracts2 for listing/viewing only.

// ══════════ CONTRACT TECHNICAL PDF NOTES ══════════
api.get('/contract-pdf-notes', authMiddleware, async (req, res) => {
  const notes = await db.collection('contract_technical_pdf_notes').find({}).sort({ order: 1 }).toArray();
  res.json(cleanList(notes));
});

api.post('/contract-pdf-notes', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file' });
  const noteId = uuidv4();
  const decodedFilename = decodeMulterFilename(req.file.originalname);
  const note = {
    id: noteId,
    title: req.body.title || decodedFilename,
    filename: decodedFilename,
    order: parseInt(req.body.order) || 0,
    created_at: new Date().toISOString()
  };
  
  if (bucket) {
    const ext = path.extname(req.file.originalname) || '';
    const gcsPath = `contract-notes/${noteId}${ext}`;
    const file = bucket.file(gcsPath);
    await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
    note.gcs_path = gcsPath;
  } else {
    note.pdf_data = req.file.buffer.toString('base64');
  }
  
  await db.collection('contract_technical_pdf_notes').insertOne(note);
  res.json({ id: note.id, title: note.title, filename: note.filename, order: note.order });
});

api.put('/contract-pdf-notes/:id', authMiddleware, async (req, res) => {
  const { title, order } = req.body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = parseInt(order);
  update.updated_at = new Date().toISOString();
  
  await db.collection('contract_technical_pdf_notes').updateOne({ id: req.params.id }, { $set: update });
  res.json({ success: true });
});

api.delete('/contract-pdf-notes/:id', authMiddleware, async (req, res) => {
  const note = await db.collection('contract_technical_pdf_notes').findOne({ id: req.params.id });
  if (note && note.gcs_path && bucket) {
    try { await bucket.file(note.gcs_path).delete(); } catch(e) {}
  }
  await db.collection('contract_technical_pdf_notes').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

api.post('/contract-pdf-notes/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) return res.status(500).json({ detail: 'GCS not configured' });
  try {
    const items = await db.collection('contract_technical_pdf_notes').find({ pdf_data: { $exists: true, $ne: '' } }).toArray();
    if (items.length === 0) return res.json({ success: true, message: 'Tous les PDF sont déjà migrés', migrated: 0, errors: 0 });
    let migrated = 0; let errors = 0;
    for (const item of items) {
      try {
        const ext = path.extname(item.filename || '') || '.pdf';
        const gcsPath = `contract-notes/${item.id}${ext}`;
        const file = bucket.file(gcsPath);
        const buffer = Buffer.from(item.pdf_data, 'base64');
        await file.save(buffer, { metadata: { contentType: 'application/pdf' } });
        await db.collection('contract_technical_pdf_notes').updateOne(
          { id: item.id },
          { $set: { gcs_path: gcsPath }, $unset: { pdf_data: "" } }
        );
        migrated++;
      } catch (e) { errors++; }
    }
    res.json({ success: true, migrated, errors });
  } catch (err) {
    res.status(500).json({ detail: 'Migration failed' });
  }
});

api.post('/contract-pdf-notes/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.notes || [])) {
    await db.collection('contract_technical_pdf_notes').updateOne({ id: item.id }, { $set: { order: item.order } });
  }
  res.json({ success: true });
});

api.get('/public/contract-pdf-notes', async (req, res) => {
  const notes = await db.collection('contract_technical_pdf_notes').find({}, { projection: { _id: 0, title: 1, id: 1, filename: 1, order: 1 } }).sort({ order: 1 }).toArray();
  res.json(notes);
});

api.get('/public/contract-pdf-notes/:id/download', async (req, res) => {
  console.log(`[GET PDF-NOTE] id: ${req.params.id}, preview: ${req.query.preview}`);
  const note = await db.collection('contract_technical_pdf_notes').findOne({ id: req.params.id });
  if (!note) {
    console.log(`[GET PDF-NOTE] Note not found for id: ${req.params.id}`);
    return res.status(404).json({ detail: 'Not found' });
  }
  
  const isInline = req.query.preview === 'true' || req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';

  const activeBucket = getGcsBucket();
  console.log(`[GET PDF-NOTE] Found note title: ${note.title}, has gcs_path: ${!!note.gcs_path}, has pdf_data: ${!!note.pdf_data}, has activeBucket: ${!!activeBucket}`);
  if (note.gcs_path && activeBucket) {
    const file = activeBucket.file(note.gcs_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${note.filename || note.title}.pdf"`);
    file.createReadStream().on('error', (err) => {
      console.error(`[GET PDF-NOTE] GCS stream error for ${note.gcs_path}:`, err);
      res.status(500).send('Error');
    }).pipe(res);
  } else if (note.pdf_data) {
    const buffer = Buffer.from(note.pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${note.filename || note.title}.pdf"`);
    res.send(buffer);
  } else {
    console.log(`[GET PDF-NOTE] note has no gcs_path or activeBucket is null, and has no pdf_data`);
    res.status(404).json({ detail: 'Not found' });
  }
});

api.post('/contracts2/compile-guide', authMiddleware, async (req, res) => {
  try {
    const { deroulement_pdf_base64, selected_pdf_ids } = req.body;
    const finalDoc = await PDFDocument.create();

    // 1. Add generated "Déroulement" if present
    if (deroulement_pdf_base64) {
      const deroulementDoc = await PDFDocument.load(Buffer.from(deroulement_pdf_base64, 'base64'));
      const copiedPages = await finalDoc.copyPages(deroulementDoc, deroulementDoc.getPageIndices());
      copiedPages.forEach((page) => finalDoc.addPage(page));
    }

    // 2. Add other selected PDFs from DB
    if (selected_pdf_ids && selected_pdf_ids.length > 0) {
      // Filter out special __deroulement_soiree ID if it was passed by mistake
      const realIds = selected_pdf_ids.filter(id => id !== '__deroulement_soiree');
      if (realIds.length > 0) {
        const notes = await db.collection('contract_technical_pdf_notes').find({ id: { $in: realIds } }).sort({ order: 1 }).toArray();
        for (const note of notes) {
          try {
            let buffer;
            const activeBucket = getGcsBucket();
            if (note.gcs_path && activeBucket) {
              const file = activeBucket.file(note.gcs_path);
              const [fileContent] = await file.download();
              buffer = fileContent;
            } else if (note.pdf_data) {
              buffer = Buffer.from(note.pdf_data, 'base64');
            }
            if (buffer) {
              const noteDoc = await PDFDocument.load(buffer);
              const pages = await finalDoc.copyPages(noteDoc, noteDoc.getPageIndices());
              pages.forEach((page) => finalDoc.addPage(page));
            }
          } catch (err) {
            console.error(`Error merging PDF note ${note.id}:`, err);
          }
        }
      }
    }

    if (finalDoc.getPageCount() === 0) return res.status(400).json({ detail: 'Aucun contenu pour le guide' });

    const pdfBytes = await finalDoc.save();
    res.json({ 
      success: true, 
      pdf_base64: Buffer.from(pdfBytes).toString('base64'),
      filename: `Guide_Organisation_${new Date().toISOString().slice(0,10)}.pdf`
    });
  } catch (e) {
    console.error('Error compiling guide PDF:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ═══════════════════════════════════════════════════
// END OF CONTRACT TECHNICAL PDF NOTES
// ═══════════════════════════════════════════════════

// Public DJ-Client Response Cache for extreme speedups
const djClientResponseCache = new Map();

function clearDjClientResponseCache() {
  djClientResponseCache.clear();
  console.log('🧹 Cleared public DJ-Client response cache.');
}

function makeAccentInsensitivePattern(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[aàáâäãåæ]/g, '[aàáâäãåæ]')
    .replace(/[eèéêë]/g, '[eèéêë]')
    .replace(/[iìíîï]/g, '[iìíîï]')
    .replace(/[oòóôõöø]/g, '[oòóôõöø]')
    .replace(/[uùúûü]/g, '[uùúûü]')
    .replace(/[cç]/g, '[cç]');
}

api.get('/public/dj-client/:slug', async (req, res) => {
  let slug = req.params.slug.toLowerCase();
  try {
    slug = decodeURIComponent(slug);
  } catch (e) {
    console.error("Error decoding slug:", e);
  }
  
  const cacheKey = slug;
  const cached = djClientResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }
  
  const normalizeString = (str) => {
    if (!str) return '';
    return String(str).toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ''); // keep only alpha-numeric characters
  };

  const normalizedRequestedSlug = normalizeString(slug);

  // Fetch DJ profiles to resolve UUIDs or names dynamically
  const allDjProfiles = await db.collection('dj_profiles').find({}).toArray();
  const matchedDjProfile = allDjProfiles.find(p => {
    return normalizeString(p.nom_artistique) === normalizedRequestedSlug ||
           normalizeString(p.nom_complet) === normalizedRequestedSlug ||
           normalizeString(p.id) === normalizedRequestedSlug;
  });

  const isDj = !!matchedDjProfile;
  let contractsQuery = {};

  if (isDj) {
    // Highly targeted query for DJs to bypass fetching all 100+ documents
    const orConditions = [];
    if (matchedDjProfile.id) {
      orConditions.push({ dj_profile: matchedDjProfile.id });
    }
    if (matchedDjProfile._id) {
      orConditions.push({ dj_profile: matchedDjProfile._id.toString() });
    }
    if (matchedDjProfile.nom_artistique) {
      const pattern = makeAccentInsensitivePattern(matchedDjProfile.nom_artistique);
      orConditions.push({ 'dj_profile_data.nom_artistique': new RegExp('^' + pattern + '$', 'i') });
    }
    // Historical matches
    if (normalizedRequestedSlug === 'stefanedison' || normalizedRequestedSlug === 'stephane') {
      orConditions.push({ dj_profile: 'stephane' });
    } else if (normalizedRequestedSlug === 'joelrkey' || normalizedRequestedSlug === 'joel') {
      orConditions.push({ dj_profile: 'joel' });
    }
    if (orConditions.length > 0) {
      contractsQuery = { $or: orConditions };
    }
  } else {
    // Highly targeted, accent-insensitive query for Clients
    const parts = slug.split('-');
    const clientParts = parts.slice(1).filter(p => p.length >= 3);
    if (clientParts.length > 0) {
      const conditions = clientParts.map(part => {
        const pattern = makeAccentInsensitivePattern(part);
        const regex = new RegExp(pattern, 'i');
        return {
          $or: [
            { client_name: regex },
            { 'client_info.name': regex }
          ]
        };
      });
      contractsQuery = { $and: conditions };
    }
  }

  // Filter only active contracts (sent, archived, completed)
  contractsQuery.status = { $in: ['sent', 'archived', 'completed'] };

  let contracts = [];
  try {
    contracts = await db.collection('contracts2').find(contractsQuery, { projection: { _id: 0 } }).toArray();
  } catch (dbErr) {
    console.error("Error executing optimized public contract search:", dbErr);
  }

  // Safe fallback: if nothing is matched by our targeted search, fetch all to prevent 404s
  if (contracts.length === 0) {
    contracts = await db.collection('contracts2').find({ status: { $in: ['sent', 'archived', 'completed'] } }, { projection: { _id: 0 } }).toArray();
  }
  
  const mappedEvents = contracts.map(c => {
    const info = c.client_info || {};
    let clientName = info.name || c.client_name || 'Client inconnu';
    if (typeof clientName !== 'string') {
      clientName = String(clientName || 'Client inconnu');
    }
    let eventType = info.event_type || 'Événement';
    if (typeof eventType !== 'string') {
      eventType = String(eventType || 'Événement');
    }
    
    // Dynamically resolve DJ profile matching UUID/ID
    const matchedProfile = allDjProfiles.find(p => p.id === c.dj_profile || p._id?.toString() === c.dj_profile);
    
    let djName = c.dj_profile_data?.nom_artistique || (matchedProfile ? (matchedProfile.nom_artistique || matchedProfile.nom_complet) : null) || c.dj_profile || "DJ";
    if (typeof djName !== 'string') {
      djName = String(djName || "DJ");
    }
    const normalizedDjNameLower = djName.toLowerCase();
    if (normalizedDjNameLower === 'joel' || normalizedDjNameLower === 'joël') {
      djName = "Joël R'Key";
    } else if (normalizedDjNameLower === 'stephane' || normalizedDjNameLower === 'stéphane') {
      djName = "Stefan Edison";
    }
    
    const djLogin = djName.toLowerCase().replace(/\s+/g, '-');
    const typeLower = eventType.split(' ')[0].toLowerCase().replace(/\s+/g, '-');
    const clientNameLower = clientName.toLowerCase().replace(/\s+/g, '-');
    const clientSlug = `${typeLower}-${clientNameLower}`;
    
    return {
      ...c,
      id: c.id || c._id?.toString(),
      djLogin,
      clientSlug,
      djName,
      clientName,
      eventType
    };
  });

  const options = await db.collection('material_options').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1, name: 1 }).toArray();

  // Check if it's a DJ slug using robust string normalization
  const djEvents = mappedEvents.filter(e => {
    return normalizeString(e.djLogin) === normalizedRequestedSlug || 
           normalizeString(e.dj_profile) === normalizedRequestedSlug ||
           (e.dj_profile_data?.nom_artistique && normalizeString(e.dj_profile_data.nom_artistique) === normalizedRequestedSlug) ||
           (matchedDjProfile && (
             e.dj_profile === matchedDjProfile.id ||
             e.dj_profile === matchedDjProfile._id?.toString()
           ));
  });

  const dbSettings = await db.collection('global_settings').findOne({ type: 'company' }, { projection: { _id: 0, email_signature_image: 0, smtp_password: 0 } });
  const companySettings = dbSettings ? {
    company_name: dbSettings.company_name || "R'KEY PROD",
    bank_name: dbSettings.bank_name || "Tiime",
    bank_iban: dbSettings.bank_iban || "",
    bank_bic: dbSettings.bank_bic || "",
    bank_titulaire: dbSettings.bank_titulaire || "R'KEY PROD",
    youtube_tutorial_url: dbSettings.youtube_tutorial_url || "",
  } : {
    company_name: "R'KEY PROD",
    bank_name: "Tiime",
    bank_iban: "FR76 1679 8000 0100 0192 2357 858",
    bank_bic: "TRZOFR21XXX",
    bank_titulaire: "R'KEY PROD",
    youtube_tutorial_url: "",
  };

  let responseData = null;

  if (djEvents.length > 0 || matchedDjProfile) {
    const djName = matchedDjProfile 
      ? (matchedDjProfile.nom_artistique || matchedDjProfile.nom_complet) 
      : (djEvents[0]?.dj_profile_data?.nom_artistique || djEvents[0]?.dj_profile || "DJ");
    const signedEvents = await autoSignGcsUrlsInObject(djEvents);
    responseData = { role: 'dj', events: signedEvents, slug, djName, availableOptions: options, companySettings };
  } else {
    // Check if it's a Client slug
    const clientEvents = mappedEvents.filter(e => {
      return normalizeString(e.clientSlug) === normalizedRequestedSlug;
    });

    if (clientEvents.length > 0) {
      const cleanedClientEvents = clientEvents.map(event => {
        const cloned = { ...event };
        if (cloned.event_documents) {
          cloned.event_documents = cloned.event_documents.filter(d => !d.hiddenForClient);
        }
        return cloned;
      });
      const signedEvents = await autoSignGcsUrlsInObject(cleanedClientEvents);
      responseData = { role: 'client', events: signedEvents, slug, availableOptions: options, companySettings };
    }
  }

  if (responseData) {
    // Cache the response object in memory for 30 seconds
    djClientResponseCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + 30000
    });
    return res.json(responseData);
  }
  
  return res.status(404).json({ error: 'Not found' });
});

api.put('/public/dj-client/:id', async (req, res) => {
  const id = req.params.id;
  await db.collection('contracts2').updateOne({ id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  await syncVenueFromContract(id, req.body);
  
  // Clear the public DJ-Client cache so the client's page updates immediately
  clearDjClientResponseCache();
  
  res.json({ success: true });
});

// Helper to convert images (PNG, JPG, HEIC, etc.) to PDF format
async function convertToPdfBuffer(fileBuffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return {
      buffer: fileBuffer,
      filename: originalName
    };
  }
  
  let jpegBuffer;
  let pdfFilename = originalName.replace(/\.[^./]+$/, "") + ".pdf";
  
  try {
    if (ext === '.heic' || ext === '.heif' || mimeType?.toLowerCase()?.includes('heic') || mimeType?.toLowerCase()?.includes('heif')) {
      const heicConvert = require('heic-convert');
      // Convert single image HEIC to JPEG
      const converted = await heicConvert({
        buffer: fileBuffer,
        format: 'JPEG',
        quality: 0.85
      });
      // Further normalize with sharp to a standard JPEG buffer
      jpegBuffer = await sharp(converted).jpeg({ quality: 85 }).toBuffer();
    } else {
      // Standard image formats: JPG, PNG, WEBP, GIF etc -> normalize to standard JPEG with sharp
      jpegBuffer = await sharp(fileBuffer).jpeg({ quality: 85 }).toBuffer();
    }
    
    // Convert standard JPEG buffer to PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
    const { width, height } = embeddedImage.scale(1.0);
    
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });
    
    const pdfBytes = await pdfDoc.save();
    return {
      buffer: Buffer.from(pdfBytes),
      filename: pdfFilename
    };
  } catch (err) {
    console.error("[PdfConversion] Failed to convert picture/HEIC to PDF:", err);
    throw err;
  }
}

api.post('/public/dj-client/:id/documents/convert-visit-sheet', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const category = req.body.category || 'Animations et interventions';
  const docId = uuidv4();
  const decodedOriginalname = decodeMulterFilename(req.file.originalname);
  
  try {
    const { buffer: pdfBuffer, filename: convertedFilename } = await convertToPdfBuffer(req.file.buffer, decodedOriginalname, req.file.mimetype);
    
    const newDoc = {
      id: docId,
      filename: convertedFilename,
      category: category,
      uploaded_at: new Date().toISOString(),
      ...(category === 'Administrative' ? { hiddenForClient: true } : {})
    };
    
    if (bucket) {
      const gcsPath = `contract-event-documents/${req.params.id}/${docId}.pdf`;
      const file = bucket.file(gcsPath);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
      newDoc.gcs_path = gcsPath;
    } else {
      newDoc.pdf_data = pdfBuffer.toString('base64');
    }
    
    await db.collection('contracts2').updateOne(
      { id: req.params.id }, 
      { $push: { event_documents: newDoc } }
    );
    
    res.json({ success: true, document: { id: newDoc.id, filename: newDoc.filename, category: newDoc.category, uploaded_at: newDoc.uploaded_at, hiddenForClient: newDoc.hiddenForClient || false } });
  } catch (err) {
    console.error("[ConvertVisitSheet] Error:", err, "ID:", req.params.id, "DOCID:", docId);
    res.status(500).json({ error: "Erreur lors de la conversion ou de l'upload: " + err.message });
  }
});

api.post('/public/dj-client/:id/documents', upload.single('file'), async (req, res) => {
  try {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const category = req.body.category || 'Animations et interventions';
  const docId = uuidv4();
  const decodedFilename = decodeMulterFilename(req.file.originalname);
  const newDoc = {
    id: docId,
    filename: decodedFilename,
    category: category,
    uploaded_at: new Date().toISOString(),
    ...(category === 'Administrative' ? { hiddenForClient: true } : {})
  };
  let savedToGcs = false;
  if (bucket) {
    try {
      const ext = path.extname(req.file.originalname) || '';
      const gcsPath = `contract-event-documents/${req.params.id}/${docId}${ext}`;
      const file = bucket.file(gcsPath);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      newDoc.gcs_path = gcsPath;
      savedToGcs = true;
      console.log(`[UPLOAD] Document ${docId} successfully saved to GCS at ${gcsPath}`);
    } catch (gcsErr) {
      console.error(`[UPLOAD] Error saving to GCS, falling back to local MongoDB base64 pdf_data:`, gcsErr);
    }
  }

  if (!savedToGcs) {
    newDoc.pdf_data = req.file.buffer.toString('base64');
    console.log(`[UPLOAD] Document ${docId} saved locally in MongoDB collection`);
  }
  await db.collection('contracts2').updateOne(
    { id: req.params.id }, 
    { $push: { event_documents: newDoc } }
  );
  res.json({ success: true, document: { id: newDoc.id, filename: newDoc.filename, category: newDoc.category, uploaded_at: newDoc.uploaded_at, hiddenForClient: newDoc.hiddenForClient || false } });
  } catch (err) {
    console.error("[UPLOAD] Error:", err);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

api.get('/public/dj-client/:id/documents/:docId', async (req, res) => {
  console.log(`[GET DOCUMENT] id: ${req.params.id}, docId: ${req.params.docId}, preview: ${req.query.preview}`);
  const contract = await db.collection('contracts2').findOne({ id: req.params.id });
  if (!contract) {
    console.log(`[GET DOCUMENT] Contract not found for id: ${req.params.id}`);
    return res.status(404).json({ error: 'Not found' });
  }
  if (!contract.event_documents) {
    console.log(`[GET DOCUMENT] Contract found but event_documents is missing/empty for id: ${req.params.id}`);
    return res.status(404).json({ error: 'Not found' });
  }
  const doc = contract.event_documents.find(d => d.id === req.params.docId);
  if (!doc) {
    console.log(`[GET DOCUMENT] Document ${req.params.docId} not found in event_documents of contract ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const isInline = req.query.preview === 'true' || req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';

  const activeBucket = getGcsBucket();
  
  let gcsPath = doc.gcs_path;
  if (!gcsPath && doc.filename) {
    const ext = path.extname(doc.filename) || '.pdf';
    gcsPath = `contract-event-documents/${req.params.id}/${doc.id}${ext}`;
  }

  console.log(`[GET DOCUMENT] Found doc filename: ${doc.filename}, gcsPath: ${gcsPath}, has pdf_data: ${!!doc.pdf_data}, has activeBucket: ${!!activeBucket}`);
  
  if (gcsPath && activeBucket) {
    const file = activeBucket.file(gcsPath);
    let exists = false;
    try {
      const [fileExist] = await file.exists();
      exists = fileExist;
    } catch (err) {
      console.warn(`[GET DOCUMENT] Error checking GCS file existence for ${gcsPath}:`, err.message);
    }

    if (exists) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
      return file.createReadStream().on('error', (err) => {
        console.error(`[GET DOCUMENT] GCS stream error for ${gcsPath}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Error');
        }
      }).pipe(res);
    } else {
      console.log(`[GET DOCUMENT] File does not exist on GCS at ${gcsPath}. Checking if pdf_data exists.`);
    }
  }

  if (doc.pdf_data) {
    const buffer = Buffer.from(doc.pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    return res.send(buffer);
  }

  console.log(`[GET DOCUMENT] Document not found on GCS or locally (no pdf_data)`);
  res.status(404).json({ error: 'Not found' });
});

api.delete('/public/dj-client/:id/documents/:docId', async (req, res) => {
  try {
    const contract = await db.collection('contracts2').findOne({ id: req.params.id });
    if (!contract || !contract.event_documents) return res.status(404).json({ error: 'Not found' });
    
    // Find the document to potentially delete from GCS
    const docToDelete = contract.event_documents.find(d => d.id === req.params.docId);
    const activeBucket = getGcsBucket();
    if (docToDelete && docToDelete.gcs_path && activeBucket) {
      const file = activeBucket.file(docToDelete.gcs_path);
      try {
        await file.delete();
      } catch (err) {
        console.error('Failed to delete file from GCS:', err);
      }
    }

    await db.collection('contracts2').updateOne(
      { id: req.params.id },
      { $pull: { event_documents: { id: req.params.docId } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

api.post('/contracts2/documents/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) return res.status(500).json({ detail: 'GCS not configured' });
  try {
    const contracts = await db.collection('contracts2').find({ "event_documents.pdf_data": { $exists: true } }).toArray();
    if (contracts.length === 0) return res.json({ success: true, message: 'Tous les documents sont déjà migrés', migrated: 0, errors: 0 });
    let migrated = 0; let errors = 0;
    for (const contract of contracts) {
      if (!contract.event_documents) continue;
      let updated = false;
      const updatedDocs = [];
      for (const doc of contract.event_documents) {
        if (doc.pdf_data) {
          try {
            const ext = path.extname(doc.filename || '') || '.pdf';
            const gcsPath = `contract-event-documents/${contract.id}/${doc.id}${ext}`;
            const file = bucket.file(gcsPath);
            const buffer = Buffer.from(doc.pdf_data, 'base64');
            await file.save(buffer, { metadata: { contentType: 'application/pdf' } });
            
            const newDoc = { ...doc, gcs_path: gcsPath };
            delete newDoc.pdf_data;
            updatedDocs.push(newDoc);
            updated = true;
            migrated++;
          } catch (e) {
            errors++;
            updatedDocs.push(doc);
          }
        } else {
          updatedDocs.push(doc);
        }
      }
      if (updated) {
        await db.collection('contracts2').updateOne(
          { id: contract.id },
          { $set: { event_documents: updatedDocs } }
        );
      }
    }
    res.json({ success: true, migrated, errors });
  } catch (err) {
    res.status(500).json({ detail: 'Migration failed' });
  }
});

async function syncContractReservations(contract) {
  if (!contract) return;

  // Sync contract to the associated DJ Google Calendar
  try {
    await syncContractToGoogleCalendar(contract);
  } catch (gcalErr) {
    console.error('[syncContractReservations] Google Calendar sync failed:', gcalErr);
  }

  // Helper to delete reservations and calendar events
  const cleanupReservations = async (contractId) => {
    const existingReservations = await db.collection('location_reservations').find({ contract_id: contractId }).toArray();
    for (const res of existingReservations) {
      if (res.google_event_id) {
        try {
          await deleteReservationFromGoogleCalendar(res.google_event_id);
        } catch (e) {
          console.error("Error deleting from Google Calendar:", e);
        }
      }
    }
    await db.collection('location_reservations').deleteMany({ contract_id: contractId });
  };

  // If not 'archived' (signed), delete the reservations for this contract
  if (contract.status !== 'archived') {
    await cleanupReservations(contract.id);
    return;
  }
  
  const options = contract.selected_options || [];
  const linkedEquipments = options.filter(o => o.linked_equipment_id);
  
  if (linkedEquipments.length === 0) {
    await cleanupReservations(contract.id);
    return;
  }
  
  const resolvedItems = [];
  for (const opt of linkedEquipments) {
    const eq = await db.collection('location_equipment').findOne({ id: opt.linked_equipment_id });
    if (eq) {
      resolvedItems.push({
        equipment_id: eq.id,
        equipment_name: eq.name,
        name: eq.name,
        reference: eq.reference,
        daily_price: eq.daily_price || 0,
        total_days: 1
      });
    }
  }
  
  if (resolvedItems.length === 0) {
    await cleanupReservations(contract.id);
    return;
  }
  
  const resolvedDjId = resolveDjProfileId(contract.dj_profile);
  const dj = await db.collection('dj_profiles').findOne({ id: resolvedDjId });
  const djName = dj && (dj.nom_artistique || dj.nom_complet) ? (dj.nom_artistique || dj.nom_complet) : 'DJ';
  
  const reservationData = {
    contract_id: contract.id,
    booking_type: 'dj', // "la réservation a été faite pour un DJ"
    dj_id: contract.dj_profile,
    dj_name: djName,
    client_name: contract.client_info?.name || 'Client',
    event_name: (contract.client_info?.name || 'Client') + ' - ' + (contract.client_info?.event_type || 'Événement'),
    start_date: contract.client_info?.event_date || new Date().toISOString().split('T')[0],
    end_date: contract.client_info?.event_date || new Date().toISOString().split('T')[0],
    items: resolvedItems,
    equipment_items: resolvedItems,
    status: 'accepted',
    updated_at: new Date().toISOString()
  };
  
  const existing = await db.collection('location_reservations').findOne({ contract_id: contract.id });
  if (existing) {
    // If equipment or dates changed, google sync might need update but there is no update helper natively here except through complex flows
    // at least update local
    await db.collection('location_reservations').updateOne({ id: existing.id }, { $set: reservationData });
  } else {
    reservationData.id = uuidv4();
    reservationData.created_at = new Date().toISOString();
    try {
      const googleEventId = await tryAutoSyncToGoogle(reservationData);
      if (googleEventId && googleEventId !== 'DELETED') {
        reservationData.google_event_id = googleEventId;
      }
    } catch (err) {
      console.error('Google auto-sync error in contract reservations:', err);
    }
    await db.collection('location_reservations').insertOne(reservationData);
  }
}

// ══════════ RECEPTION VENUES (LIEUX DE RÉCEPTION) ══════════

async function syncVenueFromContract(contractId, payload) {
  try {
    const contract = await db.collection('contracts2').findOne({ id: contractId });
    if (!contract) return;

    const venueId = payload?.client_info?.venue_id || contract?.client_info?.venue_id;
    if (!venueId) return;

    const existingVenue = await db.collection('reception_venues').findOne({ id: venueId });
    if (existingVenue) {
      const contractPhotos = contract.venue_photos || [];
      const contractNotes = contract.venue_notes || "";
      
      const isContractVenueInfoEmpty = contractPhotos.length === 0 && !contractNotes && 
                                       !contract.has_limiteur_son && !contract.has_detecteur_fumee &&
                                       !contract.has_no_limiteur_ni_detecteur && !contract.has_wifi && !contract.has_4g_5g;

      if (isContractVenueInfoEmpty) {
        const initObj = {
          venue_photos: existingVenue.venue_photos || [],
          venue_notes: existingVenue.notes || "",
          has_limiteur_son: !!existingVenue.has_limiteur_son,
          has_detecteur_fumee: !!existingVenue.has_detecteur_fumee,
          has_no_limiteur_ni_detecteur: !!existingVenue.has_no_limiteur_ni_detecteur,
          has_wifi: !!existingVenue.has_wifi,
          has_4g_5g: !!existingVenue.has_4g_5g
        };
        await db.collection('contracts2').updateOne({ id: contractId }, { $set: initObj });
        console.log(`[Venue Sync] Initialized contract ${contractId} from venue ${venueId}`);
        return;
      }
    }

    const updateObj = {};
    const fieldsToSync = [
      'venue_photos',
      'venue_notes',
      'has_limiteur_son',
      'has_detecteur_fumee',
      'has_no_limiteur_ni_detecteur',
      'has_wifi',
      'has_4g_5g'
    ];

    fieldsToSync.forEach(field => {
      if (payload[field] !== undefined) {
        updateObj[field] = payload[field];
      } else if (payload?.client_info && payload.client_info[field] !== undefined) {
        updateObj[field] = payload.client_info[field];
      }
    });

    if (updateObj.venue_notes !== undefined) {
      updateObj.notes = updateObj.venue_notes;
    }

    if (Object.keys(updateObj).length > 0) {
      updateObj.updated_at = new Date().toISOString();
      // If we are adding photos or notes, let's mark it as complete if it had nothing before
      if (existingVenue) {
        const hasPhotos = (updateObj.venue_photos && updateObj.venue_photos.length > 0) || (existingVenue.venue_photos && existingVenue.venue_photos.length > 0);
        const hasNotes = (updateObj.venue_notes && updateObj.venue_notes.trim().length > 0) || (existingVenue.notes && existingVenue.notes.trim().length > 0);
        if (hasPhotos || hasNotes) {
          updateObj.is_complete = true;
        }
        await db.collection('reception_venues').updateOne({ id: venueId }, { $set: updateObj });
        console.log(`[Venue Sync] Synced fields to venue ${venueId}`);
      }
    }
  } catch (err) {
    console.error('[Venue Sync Error]', err);
  }
}

async function syncVenueToContracts(venueId) {
  try {
    const venue = await db.collection('reception_venues').findOne({ id: venueId });
    if (!venue) return;

    const updateObj = {
      venue_photos: venue.venue_photos || [],
      venue_notes: venue.notes || "",
      has_limiteur_son: !!venue.has_limiteur_son,
      has_detecteur_fumee: !!venue.has_detecteur_fumee,
      has_no_limiteur_ni_detecteur: !!venue.has_no_limiteur_ni_detecteur,
      has_wifi: !!venue.has_wifi,
      has_4g_5g: !!venue.has_4g_5g
    };

    const result = await db.collection('contracts2').updateMany(
      { "client_info.venue_id": venueId },
      { $set: updateObj }
    );
    console.log(`[Venue Sync] Synced venue ${venueId} to ${result.modifiedCount} contracts.`);
  } catch (err) {
    console.error('[Venue Sync To Contracts Error]', err);
  }
}

api.get('/public/venues', async (req, res) => {
  try {
    const venues = await db.collection('reception_venues').find({ is_complete: true }).toArray();
    const contracts = await db.collection('contracts2').find({}).toArray();
    
    const resolved = venues.map(v => {
      let resolvedCity = v.city || 'À préciser';
      let resolvedDept = v.department || 'À préciser';

      if (resolvedCity === 'À préciser' || resolvedDept === 'À préciser') {
        const associatedContracts = contracts.filter(c => {
          if (c.client_info?.venue_id === v.id) return true;
          const loc = (c.client_info?.event_location || c.event_location || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          return loc && vName && loc.includes(vName);
        });

        for (const c of associatedContracts) {
          const loc = c.client_info?.event_location || c.event_location || '';
          if (loc && !loc.toLowerCase().includes('à préciser')) {
            if (loc.includes('/')) {
              const parts = loc.split('/').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
              if (parts.length >= 1 && parts[0] && !parts[0].toLowerCase().includes('à préciser')) {
                if (resolvedDept === 'À préciser') resolvedDept = parts[0];
              }
            } else if (loc.includes(',')) {
              const parts = loc.split(',').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
            }
          }
        }
      }

      if (resolvedCity === 'À préciser' && v.name && v.name !== 'À préciser') {
        resolvedCity = v.name;
      }

      return {
        ...v,
        city: resolvedCity,
        department: resolvedDept
      };
    });

    res.json(cleanList(resolved));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/venues/import-all', authMiddleware, async (req, res) => {
  try {
    const contracts = await db.collection('contracts2').find({}).toArray();
    const existingVenues = await db.collection('reception_venues').find({}).toArray();
    
    const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    let importedCount = 0;
    
    for (const c of contracts) {
      const locationStr = c.client_info?.event_location || c.event_location;
      if (!locationStr || !locationStr.trim()) continue;
      
      let department = 'À préciser';
      let city = 'À préciser';
      let name = locationStr.trim();
      
      if (locationStr.includes('/')) {
        const parts = locationStr.split('/').map(p => p.trim());
        if (parts.length >= 3) {
          department = parts[0];
          city = parts[1];
          name = parts.slice(2).join(' / ');
        } else if (parts.length === 2) {
          city = parts[0];
          name = parts[1];
        }
      } else if (locationStr.includes(',')) {
        const parts = locationStr.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          name = parts[0];
          city = parts[1];
        }
      }
      
      const normName = normalize(name);
      const normCity = normalize(city);
      
      // Check if already exists in reception_venues or in the newly imported set
      let existing = existingVenues.find(v => {
        return normalize(v.name) === normName && normalize(v.city) === normCity;
      });
      
      let venueId;
      if (existing) {
        venueId = existing.id;
      } else {
        venueId = uuidv4();
        
        const notesVal = c.venue_notes || c.client_info?.venue_notes || '';
        const photosVal = c.venue_photos || c.client_info?.venue_photos || [];
        
        const newVenue = {
          id: venueId,
          name,
          department,
          city,
          notes: notesVal || c.notes || '',
          has_limiteur_son: !!(c.has_limiteur_son || c.client_info?.has_limiteur_son),
          has_detecteur_fumee: !!(c.has_detecteur_fumee || c.client_info?.has_detecteur_fumee),
          has_no_limiteur_ni_detecteur: !!(c.has_no_limiteur_ni_detecteur || c.client_info?.has_no_limiteur_ni_detecteur),
          has_wifi: !!(c.has_wifi || c.client_info?.has_wifi),
          has_4g_5g: !!(c.has_4g_5g || c.client_info?.has_4g_5g),
          venue_photos: photosVal,
          is_complete: false, // Always set to false initially so they are in "à compléter"
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await db.collection('reception_venues').insertOne(newVenue);
        existingVenues.push(newVenue); // Add to local list to prevent duplicate creation in this loop
        importedCount++;
      }
      
      // Update the contract if it doesn't have a venue_id already
      if (!c.client_info?.venue_id || c.client_info.venue_id !== venueId) {
        await db.collection('contracts2').updateOne(
          { id: c.id },
          {
            $set: {
              'client_info.venue_id': venueId,
              'client_info.event_location': `${department} / ${city} / ${name}`,
              updated_at: new Date().toISOString()
            }
          }
        );
      }
    }
    
    res.json({ success: true, importedCount });
  } catch (err) {
    console.error('Error importing venues from contracts:', err);
    res.status(500).json({ error: err.message });
  }
});

api.post('/venues/suggest', authMiddleware, async (req, res) => {
  const { name, city, department } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Le nom de la salle est requis pour la recherche." });
  }

  try {
    const { GoogleGenAI, Type } = require('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Recherche sur Internet (en France) la salle de réception ou le lieu d'événement suivant :
Nom : "${name}"
Ville : "${city || 'non spécifiée'}"
Département : "${department || 'non spécifié'}"

Trouve son adresse exacte, son site web officiel, son code postal réel, ses informations clés d'accessibilité ou description, et génère un lien de recherche Google Maps direct de type "https://www.google.com/maps/search/?api=1&query=..." encodé correctement avec le nom et la ville de la salle.

Réponds obligatoirement sous la forme d'un objet JSON strict avec exactement ces clés :
{
  "found": true ou false (si la salle existe réellement et a été identifiée),
  "suggestedName": "Le nom exact et officiel de la salle/lieu de réception",
  "suggestedAddress": "L'adresse postale complète (rue, numéro, etc.) sans la ville ni le code postal",
  "suggestedCity": "La ville exacte",
  "suggestedPostalCode": "Le code postal (ex: 67000)",
  "suggestedDepartment": "Le département officiel (ex: Bas-Rhin)",
  "description": "Une description concise de 2-3 phrases sur la salle (ex: château du XVIIIe siècle, salle des fêtes moderne, capacité, charme...)",
  "website": "L'URL officielle du site web ou de la page Facebook du lieu, ou vide si non trouvé",
  "googleMapsUrl": "Le lien de recherche Google Maps généré"
}`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            suggestedName: { type: Type.STRING },
            suggestedAddress: { type: Type.STRING },
            suggestedCity: { type: Type.STRING },
            suggestedPostalCode: { type: Type.STRING },
            suggestedDepartment: { type: Type.STRING },
            description: { type: Type.STRING },
            website: { type: Type.STRING },
            googleMapsUrl: { type: Type.STRING }
          },
          required: ["found", "suggestedName", "suggestedAddress", "suggestedCity", "suggestedPostalCode", "suggestedDepartment", "description", "website", "googleMapsUrl"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    res.json(result);
  } catch (err) {
    console.error('Error generating venue suggestion:', err);
    
    // Check if the error is related to quota or API constraints and return a beautiful fallback response
    const errStr = (err.message || String(err)).toLowerCase();
    const isQuotaError = errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit');
    
    const descriptionText = isQuotaError 
      ? "Note : Limite de quota API Gemini atteinte temporairement (20 requêtes/jour max). Veuillez saisir les détails de la salle manuellement." 
      : "Note : Les suggestions automatiques de l'IA sont temporairement indisponibles. Veuillez saisir les détails de la salle manuellement.";

    res.json({
      found: false,
      suggestedName: name,
      suggestedAddress: "",
      suggestedCity: city || "",
      suggestedPostalCode: "",
      suggestedDepartment: department || "",
      description: descriptionText,
      website: "",
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + (city || ''))}`
    });
  }
});

api.get('/venues', async (req, res) => {
  try {
    const venues = await db.collection('reception_venues').find({}).toArray();
    const contracts = await db.collection('contracts2').find({}).toArray();
    
    const resolved = venues.map(v => {
      let resolvedCity = v.city || 'À préciser';
      let resolvedDept = v.department || 'À préciser';

      if (resolvedCity === 'À préciser' || resolvedDept === 'À préciser') {
        const associatedContracts = contracts.filter(c => {
          if (c.client_info?.venue_id === v.id) return true;
          const loc = (c.client_info?.event_location || c.event_location || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          return loc && vName && loc.includes(vName);
        });

        for (const c of associatedContracts) {
          const loc = c.client_info?.event_location || c.event_location || '';
          if (loc && !loc.toLowerCase().includes('à préciser')) {
            if (loc.includes('/')) {
              const parts = loc.split('/').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
              if (parts.length >= 1 && parts[0] && !parts[0].toLowerCase().includes('à préciser')) {
                if (resolvedDept === 'À préciser') resolvedDept = parts[0];
              }
            } else if (loc.includes(',')) {
              const parts = loc.split(',').map(p => p.trim());
              if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
                if (resolvedCity === 'À préciser') resolvedCity = parts[1];
              }
            }
          }
        }
      }

      if (resolvedCity === 'À préciser' && v.name && v.name !== 'À préciser') {
        resolvedCity = v.name;
      }

      return {
        ...v,
        city: resolvedCity,
        department: resolvedDept
      };
    });

    // Auto-detect duplicates
    const duplicateIds = new Set();
    const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    for (let i = 0; i < resolved.length; i++) {
      const v1 = resolved[i];
      const normName1 = normalize(v1.name);
      const city1 = (v1.city || '').toLowerCase().trim();
      
      for (let j = i + 1; j < resolved.length; j++) {
        const v2 = resolved[j];
        const normName2 = normalize(v2.name);
        const city2 = (v2.city || '').toLowerCase().trim();
        
        if (city1 === city2 && (normName1 === normName2 || normName1.includes(normName2) || normName2.includes(normName1))) {
          duplicateIds.add(v1.id);
          duplicateIds.add(v2.id);
        }
      }
    }
    
    const venuesWithDupFlag = resolved.map(v => ({
      ...v,
      has_potential_duplicate: duplicateIds.has(v.id)
    }));
    
    res.json(cleanList(venuesWithDupFlag));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/venues/:id', async (req, res) => {
  try {
    const venue = await db.collection('reception_venues').findOne({ id: req.params.id });
    if (!venue) return res.status(404).json({ detail: 'Venue not found' });
    
    let resolvedCity = venue.city || 'À préciser';
    let resolvedDept = venue.department || 'À préciser';
    
    if (resolvedCity === 'À préciser' || resolvedDept === 'À préciser') {
      const contracts = await db.collection('contracts2').find({}).toArray();
      const associatedContracts = contracts.filter(c => {
        if (c.client_info?.venue_id === venue.id) return true;
        const loc = (c.client_info?.event_location || c.event_location || '').toLowerCase();
        const vName = (venue.name || '').toLowerCase();
        return loc && vName && loc.includes(vName);
      });

      for (const c of associatedContracts) {
        const loc = c.client_info?.event_location || c.event_location || '';
        if (loc && !loc.toLowerCase().includes('à préciser')) {
          if (loc.includes('/')) {
            const parts = loc.split('/').map(p => p.trim());
            if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
              resolvedCity = parts[1];
            }
            if (parts.length >= 1 && parts[0] && !parts[0].toLowerCase().includes('à préciser')) {
              resolvedDept = parts[0];
            }
          } else if (loc.includes(',')) {
            const parts = loc.split(',').map(p => p.trim());
            if (parts.length >= 2 && parts[1] && !parts[1].toLowerCase().includes('à préciser')) {
              resolvedCity = parts[1];
            }
          }
        }
      }
    }
    
    if (resolvedCity === 'À préciser' && venue.name && venue.name !== 'À préciser') {
      resolvedCity = venue.name;
    }
    
    res.json(clean({
      ...venue,
      city: resolvedCity,
      department: resolvedDept
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/venues', async (req, res) => {
  try {
    const { name, department, city } = req.body;
    if (!name || !city || !department) {
      return res.status(400).json({ detail: 'Nom, département et ville sont requis.' });
    }
    
    const newVenue = {
      id: uuidv4(),
      name: name.trim(),
      department: department.trim(),
      city: city.trim(),
      notes: req.body.notes || '',
      notes_observation: req.body.notes_observation || '',
      notes_accessibilite: req.body.notes_accessibilite || '',
      rating_accessibilite: req.body.rating_accessibilite || 0,
      notes_technique: req.body.notes_technique || '',
      notes_lumiere: req.body.notes_lumiere || '',
      has_limiteur_son: !!req.body.has_limiteur_son,
      has_detecteur_fumee: !!req.body.has_detecteur_fumee,
      has_no_limiteur_ni_detecteur: !!req.body.has_no_limiteur_ni_detecteur,
      has_wifi: !!req.body.has_wifi,
      has_4g_5g: !!req.body.has_4g_5g,
      venue_photos: req.body.venue_photos || [],
      is_complete: req.body.is_complete !== undefined ? req.body.is_complete : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('reception_venues').insertOne(newVenue);
    res.json(clean(newVenue));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/venues/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.collection('reception_venues').findOne({ id });
    if (!existing) return res.status(404).json({ detail: 'Venue not found' });
    
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    delete updateData._id;
    delete updateData.id;
    
    await db.collection('reception_venues').updateOne({ id }, { $set: updateData });
    const updated = await db.collection('reception_venues').findOne({ id });
    
    // Automatically propagate the venue changes (photos, notes, tech constraints) to all linked contracts
    await syncVenueToContracts(id);
    
    res.json(clean(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/venues/:id', async (req, res) => {
  try {
    await db.collection('reception_venues').deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/venues/merge', async (req, res) => {
  try {
    const { targetVenueId, sourceVenueIds } = req.body;
    if (!targetVenueId || !Array.isArray(sourceVenueIds) || sourceVenueIds.length === 0) {
      return res.status(400).json({ detail: 'Paramètres invalides pour la fusion.' });
    }
    
    const target = await db.collection('reception_venues').findOne({ id: targetVenueId });
    if (!target) return res.status(404).json({ detail: 'Venue cible non trouvée.' });
    
    const sources = await db.collection('reception_venues').find({ id: { $in: sourceVenueIds } }).toArray();
    
    let mergedNotes = target.notes || '';
    let mergedPhotos = [...(target.venue_photos || [])];
    let has_limiteur = target.has_limiteur_son;
    let has_detecteur = target.has_detecteur_fumee;
    let has_no_lim_det = target.has_no_limiteur_ni_detecteur;
    let has_wifi = target.has_wifi;
    let has_4g = target.has_4g_5g;
    
    for (const src of sources) {
      if (src.notes && !mergedNotes.includes(src.notes)) {
        mergedNotes += (mergedNotes ? '\n\n' : '') + `[Fusion ${src.name}] ${src.notes}`;
      }
      if (src.venue_photos && Array.isArray(src.venue_photos)) {
        src.venue_photos.forEach(p => {
          if (!mergedPhotos.some(mp => mp.url === p.url)) {
            mergedPhotos.push(p);
          }
        });
      }
      if (src.has_limiteur_son) has_limiteur = true;
      if (src.has_detecteur_fumee) has_detecteur = true;
      if (src.has_no_limiteur_ni_detecteur && !has_limiteur && !has_detecteur) has_no_lim_det = true;
      if (src.has_wifi) has_wifi = true;
      if (src.has_4g_5g) has_4g = true;
    }
    
    await db.collection('reception_venues').updateOne(
      { id: targetVenueId },
      {
        $set: {
          notes: mergedNotes,
          venue_photos: mergedPhotos,
          has_limiteur_son: has_limiteur,
          has_detecteur_fumee: has_detecteur,
          has_no_limiteur_ni_detecteur: has_no_lim_det,
          has_wifi,
          has_4g_5g: has_4g,
          is_complete: true,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    await db.collection('contracts2').updateMany(
      { 'client_info.venue_id': { $in: sourceVenueIds } },
      {
        $set: {
          'client_info.venue_id': targetVenueId,
          'client_info.event_location': `${target.department} / ${target.city} / ${target.name}`,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    await db.collection('reception_venues').deleteMany({ id: { $in: sourceVenueIds } });
    
    res.json({ success: true, targetId: targetVenueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const CONTRACTS_LIST_PROJECTION = {
  _id: 0,
  id: 1,
  client_info: 1,
  dj_profile: 1,
  dj_profile_data: 1,
  base_price: 1,
  frais_mandat: 1,
  cachet_artiste: 1,
  pack_sonorisation: 1,
  pack_lumiere: 1,
  selected_options: 1,
  discount_amount: 1,
  invoice_number: 1,
  status: 1,
  cancellation_observation: 1,
  created_at: 1,
  updated_at: 1,
  "event_documents.id": 1,
  "event_documents.label": 1,
  "event_documents.filename": 1,
  "event_documents.hiddenForClient": 1,
  "event_documents.uploadedAt": 1
};

api.get('/contracts2', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: { $nin: ['trash', 'deleted'] } }, { projection: CONTRACTS_LIST_PROJECTION }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts2/trash', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: { $in: ['trash', 'deleted'] } }, { projection: CONTRACTS_LIST_PROJECTION }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts2/archived', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: { $in: ['archived', 'cancelled'] } }, { projection: CONTRACTS_LIST_PROJECTION }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts2/signatures', authMiddleware, async (req, res) => {
  const contracts = await db.collection('contracts2').find({}, { projection: { _id: 0, id: 1, client_name: 1, signatures: 1, status: 1 } }).toArray();
  res.json(contracts);
});
api.get('/contracts2/:id', authMiddleware, async (req, res) => {
  const c = await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!c) return res.status(404).json({ detail: 'Not found' });
  res.json(c);
});
api.post('/contracts2', authMiddleware, async (req, res) => {
  const contract = { id: uuidv4(), ...req.body, status: req.body.status || 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('contracts2').insertOne(contract);
  await syncVenueFromContract(contract.id, req.body);
  await syncContractReservations(contract);
  res.json(clean(contract));
});
api.put('/contracts2/:id', authMiddleware, async (req, res) => {
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const updatedContract = await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  await syncVenueFromContract(req.params.id, req.body);
  await syncContractReservations(updatedContract);
  res.json(updatedContract);
});
api.put('/contracts2/:id/status', authMiddleware, async (req, res) => {
  const updateData = { status: req.body.status, updated_at: new Date().toISOString() };
  if (req.body.cancellation_observation !== undefined) {
    updateData.cancellation_observation = req.body.cancellation_observation;
  }
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: updateData });
  const updatedContract = await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  await syncContractReservations(updatedContract);
  res.json(updatedContract);
});
api.delete('/contracts2/:id', authMiddleware, async (req, res) => {
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: { status: 'trash', updated_at: new Date().toISOString() } });
  const updatedContract = await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  await syncContractReservations(updatedContract);
  res.json({ success: true });
});
api.delete('/contracts2/:id/permanent', authMiddleware, async (req, res) => {
  await db.collection('contracts2').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// Endpoint d'importation d'anciens contrats via IA Gemini
api.post('/contracts2/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier n'a été fourni pour l'importation." });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
      return res.status(400).json({ error: "Clé API Gemini non configurée. Veuillez l'ajouter dans vos secrets." });
    }

    // Récupérer les options de matériel réelles depuis la base de données pour l'aider à mapper
    const systemOptions = await db.collection('material_options').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1 }).toArray();

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Convertir le fichier en base64 pour Gemini
    const fileMime = req.file.mimetype;
    let filePart;
    if (fileMime === 'text/plain') {
      filePart = { text: req.file.buffer.toString('utf8') };
    } else {
      filePart = {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: fileMime
        }
      };
    }

    const categorySpecificPrompt = `
ATTENTION : Ce document peut être soit un CONTRAT INITIAL (vierge/proposition) soit un CONTRAT SIGNE / COMPLÉMENTAIRE (retourné par le client, avec d'éventuelles annotations, ratures ou choix entourés à la main).
Analysez minutieusement le document :
- S'il contient des écritures manuscrites, des ronds dessinés à la main (par exemple pour entourer 'oui', 'non', 'à définir', 'x2', 'x4' pour les options) ou des signatures, extrayez en priorité absolue ces choix faits à la main par le client car ce sont ses choix réels et validés.
- Si le document est un PDF vierge ou une proposition imprimée propre sans écritures, extrayez les options et tarifs tels qu'ils sont pré-imprimés/cochés par défaut.`;

    const promptText = `Vous êtes un assistant spécialisé dans l'analyse minutieuse et de haute précision de contrats d'animation DJ et d'événementiel de R'KEY PROD.
Votre rôle est d'analyser le document fourni (un contrat d'animation ancien au format PDF ou Image) et d'extraire toutes les informations clés de manière extrêmement fine et rigoureuse pour préremplir un formulaire moderne de l'application.

Voici l'analyse spécifique demandée pour ce document : ${categorySpecificPrompt}

Voici la liste des options techniques configurées dans notre système actuel, avec leurs tarifs standards de référence et leurs identifiants (id) :
${JSON.stringify(systemOptions, null, 2)}

Instructions d'extraction & Attention au détail :
1. CLIENT : Extrayez son nom complet (nom + prénom), email, téléphones (phone et phone2 si multiples comme "Céline / Alexandre"), adresse postale complète, entreprise correspondante si applicable.
2. ÉVÉNEMENT : Type d'événement (ex: Mariage, Anniversaire, CE, etc.), date au format YYYY-MM-DD (traduisez par exemple "30.05.26" ou "30 mai 2026" en "2026-05-30"). Si la date est ambiguë ou incomplète, donnez votre meilleure estimation de l'année. Lieu (ville ou salle), nombre d'invités (guest_count), heure de début (start_time) et fin (end_time), et si "unlimited_time" est vrai (par exemple 'Sans limite horaire' est indiqué).
3. PRIX & ACOMPTE : Extrayez le prix de base de la prestation technique principale (base_price, ex: 1400.0 ou 1400) et l'acompte demandé (deposit_amount, ex: 700).
4. OPTIONS DU TABLEAU & ENTOURAGES MANUSCRITS :
   - Regardez attentivement chaque ligne d'option du matériel (ex: "Sonorisation cérémonie extérieure", "Eclairage salle", "Machine à bulles", "Machine à fumée lourde (nuage)", "Machine à étincelles froides x2 ou x4").
   - À droite de chaque ligne, examinez quel choix manuscrit parmi "oui", "non" ou "à définir" (ou alternativement "x2 ou x4 / non / à définir") a été ENTOURÉ, COCHÉ ou ENCADRÉ à la main par le client.
   - RÈGLE ABSOLUE POUR LES OPTIONS ENTOURÉES :
     * Si la mention "non" est entourée : l'option n'a PAS été choisie par le client. Renvoyez "is_selected": false.
     * Si la mention "à définir" (ou "a definir") est entourée : le client hésite ou n'a pas arrêté sa décision. Renvoyez "is_selected": "pending".
     * Si la mention "oui" (ou "x2", "x4", "oui/non" etc.) est entourée ou si la ligne est cochée "oui" : l'option est choisie. Renvoyez "is_selected": true.
     * Ne vous basez pas sur le texte imprimé ou les ratures initiales de mise en page, mais uniquement sur le cercle dessiné à la main (ex: l'éclairage de salle à 120 € a la mention "oui" entourée à la main donc is_selected=true ; la mention "non" est entourée pour "Sonorisation cérémonie extérieure", "Sonorisation vin d'honneur", "Machine à bulles", etc., donc is_selected=false).
   - Renseignez également "price_in_document" avec le prix indiqué sur le document pour cette option (ex: 120 pour l'éclairage salle, 100 pour la sonorisation cérémonie...).
5. DÉROULEMENT ("Déroulement et Notes") :
   - Regardez le tableau ou la section de déroulement (souvent en page 3) contenant des étapes comme "VIN D'HONNEUR", "Entrée des Mariés", "Blind Test", "ENTRÉE", "Ouverture de Bal", "Danse de couple", "PLAT PRINCIPAL", "Musique de 80 à début 2000", "FROMAGE", "Chasse aux trésors", "DESSERT", "Musique de 80 à aujourd'hui".
   - RÈGLE ABSOLUE : CHAQUE case du tableau, chaque ligne et chaque cellule successive représente UN ET UN SEUL événement distinct de la soirée. Elles se suivent de manière strictement chronologique et linéaire de haut en bas.
   - Ne regroupez pas, n'imbriquez pas et ne hiérarchisez pas les cellules. Les couleurs de fond (orange, blanc...) n'indiquent aucun niveau de regroupement ou de conteneur, elles ne servent qu'à thématiser visuellement les éléments ou les distinguer par style.
   - Vous devez donc extraire CHAQUE case sous forme d'une étape plate séparée et indépendante dans le tableau "deroulement".
   - Par exemple :
     * Étape 1 : title: "VIN D'HONNEUR", notes: ""
     * Étape 2 : title: "Entrée des Mariés", notes: ""
     * Étape 3 : title: "Blind Test", notes: ""
     * Étape 4 : title: "ENTRÉE", notes: ""
     * Étape 5 : title: "Ouverture de Bal", notes: ""
     * Étape 6 : title: "Danse de couple", notes: ""
     * Étape 7 : title: "PLAT PRINCIPAL", notes: ""
     * Étape 8 : title: "Musique de 80 à début 2000", notes: ""
     * Étape 9 : title: "FROMAGE", notes: ""
     * Étape 10 : title: "Chasse aux trésors", notes: ""
     * Étape 11 : title: "DESSERT", notes: ""
     * Étape 12 : title: "Musique de 80 à aujourd'hui", notes: ""
   - Extrayez ainsi l'intégralité de ce déroulement chronologique sous la forme d'une liste plate d'étapes sans aucun regroupement.
6. NOTES DJ : Extrayez les styles musicaux suggérés dans la playlist (« Playlist fin de soirée »), les musiques exclusives, la blacklist (musiques ou styles refusés), et les notes ou thèmes (ex: "Thèmes Champêtre").

IMPORTANT : Vous devez renvoyer STRICTEMENT un objet JSON valide contenant les propriétés ci-dessous. Ne mettez aucun texte d'introduction ni de conclusion, juste du JSON pur.

Format attendu :
{
  "client_name": "...",
  "client_email": "...",
  "client_phone": "...",
  "client_phone2": "...",
  "client_address": "...",
  "client_company": "...",
  "event_type": "...",
  "event_date": "YYYY-MM-DD",
  "event_location": "...",
  "guest_count": "...",
  "start_time": "...",
  "end_time": "...",
  "unlimited_time": false,
  "base_price": 0,
  "deposit_amount": 0,
  "notes": "...",
  "blacklist": "...",
  "playlist": "...",
  "extracted_options": [
    {
      "name_in_document": "...",
      "price_in_document": 0,
      "is_selected": true,
      "matched_system_option_id": "id ou null"
    }
  ],
  "deroulement": [
    {
      "title": "Nom de l'étape",
      "notes": "Notes ou animations de cette étape"
    }
  ]
}`;

    let response;
    try {
      response = await generateContentWithRetry(ai, {
        contents: { parts: [filePart, { text: promptText }] },
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (err) {
      console.log("[Import Fail] All Gemini fallback attempts failed:", err.message || err);
      const errMsg = (err.message || String(err)).toLowerCase();
      if (errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("429") || errMsg.includes("rate limit")) {
        return res.status(429).json({ detail: "Le quota de requêtes Gemini gratuit (20/jour max) est temporairement épuisé pour cette clé d'application. Pour bypasser cette limite, veuillez saisir votre propre clé API payante dans 'Paramètres -> Secrets' ou réessayer dans 24 heures." });
      }
      return res.status(503).json({ detail: `L'analyse du contrat a échoué en raison d'une surcharge temporaire des serveurs d'IA. Veuillez réessayer dans quelques instants. (Détails: ${err.message || "Service Unavailable"})` });
    }

    const resultText = response.text;
    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON:", e, resultText);
      return res.status(500).json({ error: "Erreur lors de l'interprétation par l'IA des données du contrat." });
    }

    // Analyse des conflits et construction du journal d'erreur / validation
    const conflicts = [];
    const matchedOptionsForForm = [];

    // Vérifier les dates
    if (parsedData.event_date) {
      const dateParts = parsedData.event_date.split('-');
      if (dateParts.length === 3) {
        const evDate = new Date(parsedData.event_date);
        const now = new Date();
        now.setHours(0,0,0,0);
        if (evDate < now) {
          conflicts.push(`⚠️ Attention : La date de la prestation (${parsedData.event_date}) est déjà passée.`);
        }
      }
    }

    // Traitement des options
    if (parsedData.extracted_options && Array.isArray(parsedData.extracted_options)) {
      for (const opt of parsedData.extracted_options) {
        const optionSel = opt.is_selected;
        // Check if explicitly non or not selected
        if (optionSel === false || optionSel === 'false') {
          // Explicitly non
          if (opt.matched_system_option_id) {
            const sysOpt = systemOptions.find(o => o.id === opt.matched_system_option_id);
            if (sysOpt) {
              matchedOptionsForForm.push({
                id: sysOpt.id,
                name: sysOpt.name,
                price: sysOpt.price,
                price_in_document: opt.price_in_document || null,
                has_price_conflict: false,
                is_pending: false,
                selected: false
              });
            }
          }
          continue;
        }

        const isPending = optionSel === 'pending' || optionSel === 'à définir' || optionSel === 'a definir';
        const isSelected = optionSel === true || optionSel === 'true' || String(optionSel).toLowerCase() === 'oui';

        if (isSelected || isPending) {
          if (opt.matched_system_option_id) {
            // Trouver l'option système correspondante
            const sysOpt = systemOptions.find(o => o.id === opt.matched_system_option_id);
            if (sysOpt) {
              const documentPrice = (opt.price_in_document !== undefined && opt.price_in_document !== null) ? Number(opt.price_in_document) : null;
              const hasPriceConflict = !isPending && documentPrice !== null && !isNaN(documentPrice) && sysOpt.price !== documentPrice;
              
              matchedOptionsForForm.push({
                id: sysOpt.id,
                name: sysOpt.name,
                price: sysOpt.price,
                price_in_document: documentPrice,
                has_price_conflict: hasPriceConflict,
                is_pending: isPending,
                selected: isPending ? false : true
              });

              if (isPending) {
                conflicts.push(`ℹ️ Option à définir : L'option "${sysOpt.name}" est marquée comme "à définir" (à confirmer si vous voulez la rajouter).`);
              } else if (hasPriceConflict) {
                conflicts.push(`⚠️ Conflit de prix : L'option "${sysOpt.name}" est facturée ${documentPrice} € dans l'ancien contrat, mais son tarif actuel configuré est de ${sysOpt.price} €.`);
              }
            } else {
              conflicts.push(`❓ L'option "${opt.name_in_document}" a été mappée à ID "${opt.matched_system_option_id}" mais celui-ci est introuvable.`);
            }
          } else {
            // Option non mappée
            if (isPending) {
              conflicts.push(`ℹ️ Option à définir non reconnue : L'option "${opt.name_in_document}" (${opt.price_in_document || 0} €) est marquée comme "à définir" mais n'existe pas dans vos options système actuelles.`);
            } else {
              conflicts.push(`⚠️ Option non reconnue : L'option "${opt.name_in_document}" (${opt.price_in_document || 0} €) a été cochée sur le document, mais n'existe pas dans vos options système actuelles.`);
            }
          }
        }
      }
    }

    // Renvoyer les informations formatées prêtes à l'injection
    res.json({
      success: true,
      extractedData: {
        client_info: {
          name: parsedData.client_name || "",
          email: parsedData.client_email || "",
          phone: parsedData.client_phone || "",
          phone2: parsedData.client_phone2 || "",
          address: parsedData.client_address || "",
          company: parsedData.client_company || "",
          event_type: parsedData.event_type || "Mariage",
          event_date: parsedData.event_date || "",
          event_location: parsedData.event_location || "",
          guest_count: parsedData.guest_count ? String(parsedData.guest_count) : "",
          start_time: parsedData.start_time || "",
          end_time: parsedData.end_time || "",
          unlimited_time: !!parsedData.unlimited_time,
          event_note: parsedData.notes || ""
        },
        base_price: parsedData.base_price || 0,
        custom_deposit_amount: parsedData.deposit_amount || 0,
        blacklist: parsedData.blacklist || "",
        playlist: parsedData.playlist || "",
        event_notes: parsedData.notes || "",
        deroulement: parsedData.deroulement || []
      },
      matchedOptions: matchedOptionsForForm,
      conflicts: conflicts
    });

  } catch (error) {
    console.error("Error in contract import endpoint:", error);
    res.status(500).json({ error: error.message || "Une erreur s'est produite lors de l'analyse du contrat." });
  }
});

// ══════════ DUAL ISOLATED COUNTERS ENDPOINTS ══════════

// Get current and next counter values
api.get('/contracts2/counters', authMiddleware, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const doc = await db.collection('location_settings').findOne({ type: 'contracts2_counters' }) || {
      type: 'contracts2_counters',
      Compteur_Mandat_RKeyProd: 0,
      Compteur_Engagement_Artiste_Independant: 0
    };
    
    const pad = (num, size) => {
      let s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    };
    
    const mandatVal = doc.Compteur_Mandat_RKeyProd || 0;
    const artisteVal = doc.Compteur_Engagement_Artiste_Independant || 0;
    
    res.json({
      Compteur_Mandat_RKeyProd: mandatVal,
      Compteur_Engagement_Artiste_Independant: artisteVal,
      next_mandat_number: `CTR-${currentYear}-${pad(mandatVal + 1, 4)}`,
      next_artiste_number: `ART-SJ-${currentYear}-${pad(artisteVal + 1, 4)}`,
      current_mandat_number: mandatVal > 0 ? `CTR-${currentYear}-${pad(mandatVal, 4)}` : null,
      current_artiste_number: artisteVal > 0 ? `ART-SJ-${currentYear}-${pad(artisteVal, 4)}` : null
    });
  } catch (error) {
    console.error("Error retrieving contract counters:", error);
    res.status(500).json({ error: "Failed to retrieve counters" });
  }
});

// Increment counters
api.post('/contracts2/counters/increment', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body; // 'mandat', 'artiste', 'both'
    const currentYear = new Date().getFullYear();
    
    const doc = await db.collection('location_settings').findOne({ type: 'contracts2_counters' }) || {
      type: 'contracts2_counters',
      Compteur_Mandat_RKeyProd: 0,
      Compteur_Engagement_Artiste_Independant: 0
    };
    
    let newMandatVal = doc.Compteur_Mandat_RKeyProd || 0;
    let newArtisteVal = doc.Compteur_Engagement_Artiste_Independant || 0;
    let updateObj = {};
    
    if (type === 'mandat' || type === 'both') {
      newMandatVal += 1;
      updateObj.Compteur_Mandat_RKeyProd = newMandatVal;
    }
    
    if (type === 'artiste' || type === 'both') {
      newArtisteVal += 1;
      updateObj.Compteur_Engagement_Artiste_Independant = newArtisteVal;
    }
    
    await db.collection('location_settings').updateOne(
      { type: 'contracts2_counters' },
      { $set: updateObj },
      { upsert: true }
    );
    
    const pad = (num, size) => {
      let s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    };
    
    res.json({
      Compteur_Mandat_RKeyProd: newMandatVal,
      Compteur_Engagement_Artiste_Independant: newArtisteVal,
      mandat_number: `CTR-${currentYear}-${pad(newMandatVal, 4)}`,
      artiste_number: `ART-SJ-${currentYear}-${pad(newArtisteVal, 4)}`
    });
  } catch (error) {
    console.error("Error incrementing contract counters:", error);
    res.status(500).json({ error: "Failed to increment counters" });
  }
});

// Update counter settings (for reset/custom values)
api.put('/contracts2/counters', authMiddleware, async (req, res) => {
  try {
    const { Compteur_Mandat_RKeyProd, Compteur_Engagement_Artiste_Independant } = req.body;
    let updateObj = {};
    
    if (typeof Compteur_Mandat_RKeyProd === 'number') {
      updateObj.Compteur_Mandat_RKeyProd = Compteur_Mandat_RKeyProd;
    }
    if (typeof Compteur_Engagement_Artiste_Independant === 'number') {
      updateObj.Compteur_Engagement_Artiste_Independant = Compteur_Engagement_Artiste_Independant;
    }
    
    await db.collection('location_settings').updateOne(
      { type: 'contracts2_counters' },
      { $set: updateObj },
      { upsert: true }
    );
    
    res.json({ success: true, updated: updateObj });
  } catch (error) {
    console.error("Error setting contract counters:", error);
    res.status(500).json({ error: "Failed to set counters" });
  }
});

// Authenticated attachments/documents endpoints for contracts2
api.post('/contracts2/:id/documents', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const category = req.body.category || 'Administrative';
  const docId = uuidv4();
  const decodedOriginalname = decodeMulterFilename(req.file.originalname);
  
  try {
    const { buffer: pdfBuffer, filename: convertedFilename } = await convertToPdfBuffer(req.file.buffer, decodedOriginalname, req.file.mimetype);
    
    const newDoc = {
      id: docId,
      filename: convertedFilename,
      category: category,
      uploaded_at: new Date().toISOString(),
      ...(category === 'Administrative' ? { hiddenForClient: true } : {})
    };
    
    let savedToGcs = false;
    if (bucket) {
      try {
        const gcsPath = `contract-event-documents/${req.params.id}/${docId}.pdf`;
        const file = bucket.file(gcsPath);
        await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
        newDoc.gcs_path = gcsPath;
        savedToGcs = true;
        console.log(`[ADMIN UPLOAD] Document ${docId} successfully saved to GCS at ${gcsPath}`);
      } catch (gcsErr) {
        console.error(`[ADMIN UPLOAD] Error saving to GCS, falling back to local MongoDB base64 pdf_data:`, gcsErr);
      }
    }
    
    if (!savedToGcs) {
      newDoc.pdf_data = pdfBuffer.toString('base64');
      console.log(`[ADMIN UPLOAD] Document ${docId} saved locally in MongoDB collection`);
    }
    
    await db.collection('contracts2').updateOne(
      { id: req.params.id }, 
      { $push: { event_documents: newDoc } }
    );
    
    res.json({ success: true, document: { id: newDoc.id, filename: newDoc.filename, category: newDoc.category, uploaded_at: newDoc.uploaded_at, hiddenForClient: newDoc.hiddenForClient || false } });
  } catch (err) {
    console.error("[Contracts2Attachment] Error:", err);
    res.status(500).json({ error: "Erreur lors de la conversion ou de l'upload: " + err.message });
  }
});

api.get('/contracts2/:id/documents/:docId', authMiddleware, async (req, res) => {
  console.log(`[GET ADMIN DOCUMENT] id: ${req.params.id}, docId: ${req.params.docId}, preview: ${req.query.preview}`);
  const contract = await db.collection('contracts2').findOne({ id: req.params.id });
  if (!contract) {
    console.log(`[GET ADMIN DOCUMENT] Contract not found for id: ${req.params.id}`);
    return res.status(404).json({ error: 'Not found' });
  }
  if (!contract.event_documents) {
    console.log(`[GET ADMIN DOCUMENT] Contract found but event_documents is missing/empty for id: ${req.params.id}`);
    return res.status(404).json({ error: 'Not found' });
  }
  const doc = contract.event_documents.find(d => d.id === req.params.docId);
  if (!doc) {
    console.log(`[GET ADMIN DOCUMENT] Document ${req.params.docId} not found in event_documents of contract ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const isInline = req.query.preview === 'true' || req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';

  const activeBucket = getGcsBucket();
  
  let gcsPath = doc.gcs_path;
  if (!gcsPath && doc.filename) {
    const ext = path.extname(doc.filename) || '.pdf';
    gcsPath = `contract-event-documents/${req.params.id}/${doc.id}${ext}`;
  }

  console.log(`[GET ADMIN DOCUMENT] Found doc filename: ${doc.filename}, gcsPath: ${gcsPath}, has pdf_data: ${!!doc.pdf_data}, has activeBucket: ${!!activeBucket}`);
  
  if (gcsPath && activeBucket) {
    const file = activeBucket.file(gcsPath);
    let exists = false;
    try {
      const [fileExist] = await file.exists();
      exists = fileExist;
    } catch (err) {
      console.warn(`[GET ADMIN DOCUMENT] Error checking GCS file existence for ${gcsPath}:`, err.message);
    }

    if (exists) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
      return file.createReadStream().on('error', (err) => {
        console.error(`[GET ADMIN DOCUMENT] GCS stream error for ${gcsPath}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Error');
        }
      }).pipe(res);
    } else {
      console.log(`[GET ADMIN DOCUMENT] File does not exist on GCS at ${gcsPath}. Checking if pdf_data exists.`);
    }
  }

  if (doc.pdf_data) {
    const buffer = Buffer.from(doc.pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    return res.send(buffer);
  }

  console.log(`[GET ADMIN DOCUMENT] Document not found on GCS or locally (no pdf_data)`);
  res.status(404).json({ error: 'Not found' });
});

api.delete('/contracts2/:id/documents/:docId', authMiddleware, async (req, res) => {
  try {
    const contract = await db.collection('contracts2').findOne({ id: req.params.id });
    if (!contract || !contract.event_documents) return res.status(404).json({ error: 'Not found' });
    
    const docToDelete = contract.event_documents.find(d => d.id === req.params.docId);
    const activeBucket = getGcsBucket();
    if (docToDelete && docToDelete.gcs_path && activeBucket) {
      const file = activeBucket.file(docToDelete.gcs_path);
      try {
        await file.delete();
      } catch (err) {
        console.error('Failed to delete file from GCS:', err);
      }
    }

    await db.collection('contracts2').updateOne(
      { id: req.params.id },
      { $pull: { event_documents: { id: req.params.docId } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

api.get('/contract-options', authMiddleware, async (req, res) => {
  const opts = await db.collection('material_options').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1 }).toArray();
  res.json({ options: opts });
});
api.get('/cgv-templates', authMiddleware, async (req, res) => {
  const doc = await db.collection('cgv_templates').findOne({ type: 'cgv' }, { projection: { _id: 0 } });
  if (doc && doc.templates) return res.json({ templates: doc.templates });
  // Fallback: try location_settings
  const setting = await db.collection('location_settings').findOne({ type: 'cgv' }, { projection: { _id: 0 } });
  res.json({ templates: setting ? setting : {} });
});
api.put('/cgv-templates', authMiddleware, async (req, res) => {
  const { templates } = req.body;
  if (!templates) return res.status(400).json({ detail: 'Templates manquants' });
  await db.collection('cgv_templates').updateOne({ type: 'cgv' }, { $set: { templates } }, { upsert: true });
  res.json({ success: true });
});

// ══════════ CONTRACT EMAILS ══════════
api.get('/contract-emails/templates', authMiddleware, async (req, res) => {
  res.json({ templates: cleanList(await db.collection('contract_email_templates').find({}, { projection: { _id: 0 } }).toArray()) });
});
api.post('/contract-emails/templates', authMiddleware, async (req, res) => {
  const t = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('contract_email_templates').insertOne(t);
  res.json(clean(t));
});
api.put('/contract-emails/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('contract_email_templates').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('contract_email_templates').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/contract-emails/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('contract_email_templates').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ══════════ FREELANCE / ARTISTE EMAIL TEMPLATES ══════════
api.get('/freelance-email-templates', authMiddleware, async (req, res) => {
  try {
    const list = await db.collection('freelance_email_templates').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ templates: cleanList(list) });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});
api.post('/freelance-email-templates', authMiddleware, async (req, res) => {
  try {
    const t = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
    await db.collection('freelance_email_templates').insertOne(t);
    res.json(clean(t));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});
api.put('/freelance-email-templates/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('freelance_email_templates').updateOne({ id: req.params.id }, { $set: req.body });
    const updated = await db.collection('freelance_email_templates').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    res.json(clean(updated));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});
api.delete('/freelance-email-templates/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('freelance_email_templates').deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});
api.post('/contract-emails/send', authMiddleware, async (req, res) => {
  try {
    const { recipient_email, email_subject, email_body, pdf_base64, pdf_filename, pdfs } = req.body;
    if (!recipient_email || !email_subject) {
      return res.status(400).json({ detail: 'Email destinataire et objet requis' });
    }
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_user || !cfg.smtp_server) {
      return res.status(500).json({ detail: 'Configuration SMTP manquante' });
    }
    const transporter = createTransporter(cfg);
    
    let pdfAttachments = [];
    if (pdfs && Array.isArray(pdfs)) {
      pdfAttachments = pdfs.map(p => ({
        filename: p.filename || 'contrat.pdf',
        content: p.base64, encoding: 'base64',
        contentType: 'application/pdf', contentDisposition: 'attachment'
      }));
    } else if (pdf_base64) {
      pdfAttachments.push({
        filename: pdf_filename || 'contrat_RkeyProd.pdf',
        content: pdf_base64, encoding: 'base64',
        contentType: 'application/pdf', contentDisposition: 'attachment'
      });
    }
    
    let formattedBody = email_body || '<p>Veuillez trouver ci-joint votre contrat.</p>';
    if (typeof formattedBody === 'string' && !formattedBody.includes('<p>') && !formattedBody.includes('<div') && !formattedBody.includes('<br')) {
      formattedBody = formattedBody.replace(/\n/g, '<br />');
    }

    const { html: finalHtml, attachments } = convertDataUriToCid(
      formattedBody,
      pdfAttachments
    );
    
    await transporter.sendMail({
      from: `${cfg.smtp_from_name} <${cfg.smtp_from || cfg.smtp_user}>`,
      to: recipient_email, cc: cfg.smtp_from,
      subject: email_subject, html: finalHtml, attachments
    });
    res.json({ success: true, message: 'Contrats envoyés avec succès' });
  } catch (e) {
    console.error('Contract SMTP error:', e);
    res.status(500).json({ detail: `Erreur SMTP: ${e.message}` });
  }
});

// ══════════ FORMS ══════════
api.get('/forms', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('custom_forms').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.get('/forms/:id', authMiddleware, async (req, res) => {
  const f = await db.collection('custom_forms').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!f) return res.status(404).json({ detail: 'Not found' });
  res.json(f);
});
api.get('/forms/:id/public', async (req, res) => {
  const f = await db.collection('custom_forms').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!f) return res.status(404).json({ detail: 'Not found' });
  res.json(f);
});
api.post('/forms', authMiddleware, async (req, res) => {
  const form = { id: uuidv4(), ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('custom_forms').insertOne(form);
  res.json(clean(form));
});
api.put('/forms/:id', authMiddleware, async (req, res) => {
  await db.collection('custom_forms').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('custom_forms').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/forms/:id', authMiddleware, async (req, res) => {
  await db.collection('custom_forms').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/forms/:id/duplicate', authMiddleware, async (req, res) => {
  const orig = await db.collection('custom_forms').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!orig) return res.status(404).json({ detail: 'Not found' });
  const dup = { ...orig, id: uuidv4(), name: `${orig.name} (copie)`, created_at: new Date().toISOString() };
  await db.collection('custom_forms').insertOne(dup);
  res.json(clean(dup));
});
// File upload for forms (public - no auth needed for form submissions)
api.post('/forms/upload-file', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file' });
  try {
    const decodedFilename = decodeMulterFilename(req.file.originalname);
    const fileDoc = {
      file_id: uuidv4(),
      filename: decodedFilename,
      content_type: req.file.mimetype,
      data: req.file.buffer.toString('base64'),
      size: req.file.size,
      created_at: new Date() // TTL index will auto-delete after 24h
    };
    await db.collection('form_files').insertOne(fileDoc);
    res.json({ file_id: fileDoc.file_id, filename: fileDoc.filename, content_type: fileDoc.content_type, size: fileDoc.size });
  } catch (e) {
    console.error('File upload error:', e);
    res.status(500).json({ detail: 'Upload failed' });
  }
});
api.post('/forms/:id/submit', async (req, res) => {
  try {
    const form = await db.collection('custom_forms').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    const formName = form ? (form.name || 'Formulaire') : 'Formulaire';
    const formData = req.body.data || req.body;
    const submitterEmail = req.body.email || '';
    const uploadedFiles = req.body.files || {};
    const filesMeta = {};
    for (const [k, v] of Object.entries(uploadedFiles)) {
      filesMeta[k] = { file_id: v.file_id, filename: v.filename, content_type: v.content_type };
    }
    const submission = {
      id: uuidv4(),
      form_id: req.params.id,
      form_name: formName,
      data: formData,
      files: filesMeta,
      submitter_email: submitterEmail,
      submitted_at: new Date().toISOString()
    };
    await db.collection('form_submissions').insertOne(submission);

    // Try to send notification email with attachments (non-blocking)
    try {
      const settings = await db.collection('global_settings').findOne({ type: 'company' });
      if (settings && settings.smtp_user && settings.smtp_password) {
        const cfg = {
          smtp_server: settings.smtp_server || 'smtp.hostinger.com',
          smtp_port: settings.smtp_port || '587',
          smtp_encryption: settings.smtp_encryption || 'auto',
          smtp_user: settings.smtp_user,
          smtp_password: settings.smtp_password,
          smtp_from: settings.smtp_from,
          smtp_from_name: settings.smtp_from_name,
        };
        const transporter = createTransporter(cfg);
        const recipient = (form && form.recipient_email) ? form.recipient_email : settings.smtp_from;
        const subject = (form && form.email_subject) ? form.email_subject : `[${formName}] Nouvelle soumission`;
        let fieldsHtml = '';
        if (form && form.fields) {
          form.fields.forEach(f => {
            if (['section','note','divider','file'].includes(f.type)) return;
            const val = formData[f.id] || '';
            const displayVal = Array.isArray(val) ? val.join(', ') : (val || '<em>Non renseigné</em>');
            fieldsHtml += `<tr><td style="padding:10px 15px;border-bottom:1px solid #eee;font-weight:600;color:#555;width:35%">${f.label || f.id}</td><td style="padding:10px 15px;border-bottom:1px solid #eee;color:#333">${displayVal}</td></tr>`;
          });
        }

        // Fetch uploaded files from form_files collection for email attachments
        const emailAttachments = [];
        for (const [fieldId, fileMeta] of Object.entries(filesMeta)) {
          if (fileMeta.file_id) {
            try {
              const fileDoc = await db.collection('form_files').findOne({ file_id: fileMeta.file_id });
              if (fileDoc && fileDoc.data) {
                emailAttachments.push({
                  filename: fileMeta.filename,
                  content: Buffer.from(fileDoc.data, 'base64'),
                  contentType: fileMeta.content_type
                });
                // Add file info to email HTML
                const fieldDef = form && form.fields ? form.fields.find(f => f.id === fieldId) : null;
                const fieldLabel = fieldDef ? fieldDef.label : 'Pièce jointe';
                fieldsHtml += `<tr><td style="padding:10px 15px;border-bottom:1px solid #eee;font-weight:600;color:#555;width:35%">${fieldLabel}</td><td style="padding:10px 15px;border-bottom:1px solid #eee;color:#333">📎 ${fileMeta.filename}</td></tr>`;
              }
            } catch (fileErr) { console.error('Error fetching file for email:', fileErr); }
          }
        }

        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#e67e22,#d35400);padding:20px;border-radius:8px 8px 0 0"><h2 style="color:white;margin:0">Nouvelle soumission</h2><p style="color:rgba(255,255,255,.9);margin:5px 0 0">${formName}</p></div><div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;overflow:hidden"><table style="width:100%;border-collapse:collapse">${fieldsHtml}</table></div></div>`;
        const mailOptions = {
          from: `${settings.smtp_from_name || 'R\'Key Prod'} Formulaires <${settings.smtp_from || settings.smtp_user}>`,
          to: recipient,
          subject: subject,
          html: html
        };
        if (emailAttachments.length > 0) {
          mailOptions.attachments = emailAttachments;
        }
        await transporter.sendMail(mailOptions);
      }
    } catch (emailErr) {
      console.error('Email notification failed (submission saved anyway):', emailErr.message);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Form submit error:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/forms/:id/submissions', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('form_submissions').find({ form_id: req.params.id }, { projection: { _id: 0 } }).sort({ submitted_at: -1 }).toArray()));
});
api.get('/form-submissions/all', authMiddleware, async (req, res) => {
  try {
    const submissions = await db.collection('form_submissions').find({}, { projection: { _id: 0 } }).sort({ submitted_at: -1 }).toArray();
    res.json({ submissions });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});
api.delete('/form-submissions/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.collection('form_submissions').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ detail: 'Soumission non trouvée' });
    res.json({ message: 'Soumission supprimée' });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

// ══════════ CRM ══════════
api.get('/crm/companies', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('crm_companies').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()));
});
api.post('/crm/companies', authMiddleware, async (req, res) => {
  const c = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('crm_companies').insertOne(c);
  res.json(clean(c));
});
api.put('/crm/companies/:id', authMiddleware, async (req, res) => {
  await db.collection('crm_companies').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('crm_companies').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/crm/companies/:id', authMiddleware, async (req, res) => {
  await db.collection('crm_companies').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/crm/relances', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('crm_relances').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.post('/crm/relances', authMiddleware, async (req, res) => {
  const r = { id: uuidv4(), ...req.body, completed: false, created_at: new Date().toISOString() };
  await db.collection('crm_relances').insertOne(r);
  res.json(clean(r));
});
api.put('/crm/relances/:id', authMiddleware, async (req, res) => {
  await db.collection('crm_relances').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('crm_relances').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/crm/relances/:id', authMiddleware, async (req, res) => {
  await db.collection('crm_relances').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.patch('/crm/relances/:id/complete', authMiddleware, async (req, res) => {
  await db.collection('crm_relances').updateOne({ id: req.params.id }, { $set: { completed: true } });
  res.json(await db.collection('crm_relances').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});

// ══════════ SUBSCRIPTIONS ══════════
api.get('/subscriptions/categories', authMiddleware, async (req, res) => {
  const cats = await db.collection('general_settings').findOne({ type: 'subscription_categories' }, { projection: { _id: 0 } });
  if (!cats || !Array.isArray(cats.categories)) {
    const defaults = [
      { id: '1', name: "Logiciels & Outils", is_default: true },
      { id: '2', name: "Marketing & Publicité", is_default: true },
      { id: '3', name: "Assurances & Banques", is_default: true },
      { id: '4', name: "Télécoms", is_default: true },
      { id: '5', name: "Locaux & Énergies", is_default: true },
      { id: '6', name: "Services", is_default: true },
    ];
    return res.json(defaults);
  }
  res.json(cats.categories);
});
api.post('/subscriptions/categories', authMiddleware, async (req, res) => {
  if (req.body.categories) {
    await db.collection('general_settings').updateOne({ type: 'subscription_categories' }, { $set: { categories: req.body.categories } }, { upsert: true });
    return res.json(req.body.categories);
  }
  
  if (req.body.name) {
    const doc = await db.collection('general_settings').findOne({ type: 'subscription_categories' });
    let cats = doc?.categories;
    if (!Array.isArray(cats)) {
      cats = [
        { id: '1', name: "Logiciels & Outils", is_default: true },
        { id: '2', name: "Marketing & Publicité", is_default: true },
        { id: '3', name: "Assurances & Banques", is_default: true },
        { id: '4', name: "Télécoms", is_default: true },
        { id: '5', name: "Locaux & Énergies", is_default: true },
        { id: '6', name: "Services", is_default: true },
      ];
    }
    const newCat = { id: Date.now().toString(), name: req.body.name, is_default: false };
    cats.push(newCat);
    await db.collection('general_settings').updateOne({ type: 'subscription_categories' }, { $set: { categories: cats } }, { upsert: true });
    return res.json(newCat);
  }
  
  res.status(400).json({ detail: "Missing name or categories property" });
});
api.delete('/subscriptions/categories/:id', authMiddleware, async (req, res) => {
  const doc = await db.collection('general_settings').findOne({ type: 'subscription_categories' });
  const cats = (doc?.categories || []).filter(c => c.id !== req.params.id);
  await db.collection('general_settings').updateOne({ type: 'subscription_categories' }, { $set: { categories: cats } }, { upsert: true });
  res.json({ success: true });
});
api.get('/subscriptions', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('subscriptions').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()));
});
api.get('/subscriptions/stats', authMiddleware, async (req, res) => {
  const subs = await db.collection('subscriptions').find({}, { projection: { _id: 0 } }).toArray();
  const active = subs.filter(s => s.status === 'actif');
  let total_monthly = 0;
  let total_annual = 0;
  active.forEach(s => {
    const ht = parseFloat(s.amount_ht) || 0;
    if (s.frequency === 'mensuel') { total_monthly += ht; total_annual += ht * 12; }
    else if (s.frequency === 'annuel') { total_monthly += ht / 12; total_annual += ht; }
    else if (s.frequency === 'trimestriel') { total_monthly += ht / 3; total_annual += ht * 4; }
  });
  // Count renewals in next 30 days
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const renewals_soon = active.filter(s => {
    if (s.renewal_date) { const d = new Date(s.renewal_date); return d >= now && d <= in30; }
    return false;
  }).length;
  res.json({ active_count: active.length, total_monthly: Math.round(total_monthly * 100) / 100, total_annual: Math.round(total_annual * 100) / 100, renewals_soon });
});
api.post('/subscriptions', authMiddleware, async (req, res) => {
  const s = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('subscriptions').insertOne(s);
  res.json(clean(s));
});
api.put('/subscriptions/:id', authMiddleware, async (req, res) => {
  await db.collection('subscriptions').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('subscriptions').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/subscriptions/:id', authMiddleware, async (req, res) => {
  await db.collection('subscriptions').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ══════════ TECHNICAL NOTES ══════════
api.get('/technical-notes', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('technical_notes').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1 }).toArray()));
});
api.get('/technical-notes/:key', authMiddleware, async (req, res) => {
  const n = await db.collection('technical_notes').findOne({ key: req.params.key }, { projection: { _id: 0 } });
  if (!n) return res.status(404).json({ detail: 'Not found' });
  res.json(n);
});
api.post('/technical-notes', authMiddleware, async (req, res) => {
  const note = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('technical_notes').insertOne(note);
  res.json(clean(note));
});
api.put('/technical-notes/:key', authMiddleware, async (req, res) => {
  await db.collection('technical_notes').updateOne({ key: req.params.key }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('technical_notes').findOne({ key: req.params.key }, { projection: { _id: 0 } }));
});
api.delete('/technical-notes/:key', authMiddleware, async (req, res) => {
  await db.collection('technical_notes').deleteOne({ key: req.params.key });
  res.json({ success: true });
});
api.put('/technical-notes/reorganize', authMiddleware, async (req, res) => {
  for (const item of (req.body.notes || [])) await db.collection('technical_notes').updateOne({ key: item.key }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});

// ══════════ MATERIAL OPTIONS ══════════
api.get('/material-options', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('material_options').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1, name: 1 }).toArray()));
});
api.post('/material-options', authMiddleware, async (req, res) => {
  const opt = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('material_options').insertOne(opt);
  res.json(clean(opt));
});
api.put('/material-options/:id', authMiddleware, async (req, res) => {
  await db.collection('material_options').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('material_options').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/material-options/:id', authMiddleware, async (req, res) => {
  await db.collection('material_options').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.put('/material-options/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.options || [])) await db.collection('material_options').updateOne({ id: item.id }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});

// ══════════ LOCATION (Equipment, Categories, Clients, DJs, Quotes, Reservations) ══════════
api.get('/location/equipment', authMiddleware, async (req, res) => {
  const items = cleanList(await db.collection('location_equipment').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray());
  res.json(await autoSignGcsUrlsInObject(items));
});
api.get('/catalogue/equipements', async (req, res) => {
  const hiddenCats = await db.collection('location_categories').find({ visible_catalogue: false }).toArray();
  const hiddenCatNames = hiddenCats.map(c => c.name);
  
  const query = { publier_catalogue: true };
  if (hiddenCatNames.length > 0) {
    query.category = { $nin: hiddenCatNames };
  }
  
  const items = cleanList(await db.collection('location_equipment').find(query, { projection: { _id: 0 } }).sort({ name: 1 }).toArray());
  res.json(await autoSignGcsUrlsInObject(items));
});
api.post('/location/equipment', authMiddleware, async (req, res) => {
  const eq = { id: uuidv4(), maintenance_status: 'operational', ...req.body, created_at: new Date().toISOString() };
  await db.collection('location_equipment').insertOne(eq);
  res.json(await autoSignGcsUrlsInObject(clean(eq)));
});
api.put('/location/equipment/:id', authMiddleware, async (req, res) => {
  await db.collection('location_equipment').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const updated = await db.collection('location_equipment').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(await autoSignGcsUrlsInObject(updated));
});
api.delete('/location/equipment/:id', authMiddleware, async (req, res) => {
  await db.collection('location_equipment').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

api.get('/gcs/:folder/:filename', async (req, res) => {
  if (!getGcsBucket()) {
    console.error(`[GCS GET ERROR] Request for /gcs/${req.params.folder}/${req.params.filename} failed: GCS bucket is not initialized`);
    return res.status(500).send('GCS not configured');
  }
  
  const gcsFilePath = `${req.params.folder}/${req.params.filename}`;
  const exactGcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsFilePath}`;
  
  console.log(`[GCS GET] Request received for: /gcs/${gcsFilePath}`);
  console.log(`[GCS GET] Attempting to load from Google Cloud: ${exactGcsUrl}`);

  const file = bucket.file(gcsFilePath);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.type(req.params.filename);
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  }
  
  try {
    const [buffer] = await file.download();
    res.send(buffer);
  } catch (err) {
    console.error(`[GCS GET ERROR] Fail loading file from GCS: ${exactGcsUrl}`);
    console.error(`[GCS GET ERROR] Google Cloud API error description:`);
    console.error(`  - Name: ${err.name}`);
    console.error(`  - Status Code / Error Code: ${err.code}`);
    console.error(`  - Raw Message: ${err.message}`);
    console.error(`  - Stack: ${err.stack}`);
    
    if (!res.headersSent) {
      const isPermissionError = err.message.toLowerCase().includes('permission') || 
                                err.message.toLowerCase().includes('access') || 
                                err.message.toLowerCase().includes('denied') || 
                                err.message.toLowerCase().includes('forbidden') ||
                                err.message.toLowerCase().includes('credential') ||
                                err.message.toLowerCase().includes('key') ||
                                err.code === 403;
      
      let clientEmail = 'agenda-bot@booking-pro-sync.iam.gserviceaccount.com';
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
          const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
          if (creds.client_email) clientEmail = creds.client_email;
        } catch(e) {}
      }
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.status(200);
      
      if (isPermissionError) {
        res.send(`
          <svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
            <rect width="100%" height="100%" fill="#FEE2E2" rx="8" stroke="#F87171" stroke-width="2"/>
            <text x="50%" y="45" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="#DC2626">⚠️ ERREUR D'ACCÈS GCS (403)</text>
            <text x="50%" y="80" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#7F1D1D" font-weight="bold">Le compte de service n'a pas accès au Bucket !</text>
            <text x="50%" y="110" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9.5" fill="#374151" font-weight="bold">Compte :</text>
            <text x="50%" y="125" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8.5" fill="#1F2937">${clientEmail}</text>
            <text x="50%" y="150" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9.5" fill="#374151" font-weight="bold">Bucket :</text>
            <text x="50%" y="165" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#1F2937">rkey-prod-storage-01</text>
            <rect x="15" y="185" width="370" height="50" fill="#FEF3C7" rx="4" stroke="#D97706" stroke-width="1"/>
            <text x="50%" y="205" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#92400E">SOLUTION : Ajoutez le rôle "Administrateur des objets de stockage"</text>
            <text x="50%" y="222" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#92400E">à ce compte de service sur votre bucket dans GCP.</text>
          </svg>
        `.trim());
      } else {
        res.send(`
          <svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
            <rect width="100%" height="100%" fill="#F3F4F6" rx="8" stroke="#D1D5DB" stroke-width="2"/>
            <text x="50%" y="60" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="#4B5563">📷 404 - IMAGE INTROUVABLE</text>
            <text x="50%" y="100" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#374151">L'image n'existe pas dans le bucket Google Cloud Storage.</text>
            <text x="50%" y="130" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#9CA3AF" font-family="monospace">Path: ${req.params.folder}/${req.params.filename}</text>
            <rect x="25" y="170" width="350" height="50" fill="#ECFDF5" rx="4" stroke="#10B981" stroke-width="1"/>
            <text x="50%" y="190" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065F46">RÉSOLUTION : Importez à nouveau l'image</text>
            <text x="50%" y="208" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065F46">du matériel pour la recréer.</text>
          </svg>
        `.trim());
      }
    }
  }
});

api.post('/public/upload/photo', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  
  try {
    if (bucket) {
      const ext = path.extname(req.file.originalname) || '';
      const imageId = uuidv4();
      const gcsPath = `client-uploads/${imageId}${ext}`;
      const file = bucket.file(gcsPath);
      
      try {
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype }
        });
        return res.json({ url: `/api/gcs/${gcsPath}` });
      } catch (gcsErr) {
        console.warn('GCS Upload Failed for /public/upload/photo, falling back to MongoDB:', gcsErr.message);
      }
    }
    
    const imageId = uuidv4();
    const b64 = req.file.buffer.toString('base64');
    const doc = { upload_id: imageId, data: b64, content_type: req.file.mimetype, created_at: new Date().toISOString() };
    await db.collection('event_uploads').insertOne(doc);
    return res.json({ url: `/api/uploads/events/${imageId}` });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ detail: 'Erreur lors de l\'upload de la photo' });
  }
});

api.post('/public/upload/audio', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Aucun fichier' });
  
  const b = getGcsBucket();
  if (!b) {
    return res.status(500).json({ detail: "Le stockage Google Cloud Storage n'est pas disponible ou configuré sur ce serveur." });
  }

  try {
    const decodedName = decodeMulterFilename(req.file.originalname);
    const ext = path.extname(decodedName) || '';
    const fileId = uuidv4();
    const gcsPath = `playlist-audio/${fileId}${ext}`;
    const file = b.file(gcsPath);
    
    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });
    
    return res.json({ url: `/api/gcs/${gcsPath}`, originalName: decodedName });
  } catch (error) {
    console.error('Error uploading audio to GCS:', error);
    res.status(500).json({ detail: 'Erreur lors du téléversement du fichier audio vers Google Cloud Storage: ' + error.message });
  }
});

api.delete('/public/dj-client/:id/playlist-audio/:audioId', async (req, res) => {
  try {
    const { id, audioId } = req.params;
    const contract = await db.collection('contracts2').findOne({ id });
    if (!contract || !contract.playlist_audio_files) {
      return res.status(404).json({ error: 'Contrat ou fichiers audio non trouvés' });
    }
    
    const audioToDelete = contract.playlist_audio_files.find(a => a.id === audioId);
    if (audioToDelete) {
      let gcsPath = audioToDelete.url;
      if (gcsPath.includes('/api/gcs/')) {
        gcsPath = gcsPath.substring(gcsPath.indexOf('/api/gcs/') + 9);
      } else if (gcsPath.includes('gcs/')) {
        gcsPath = gcsPath.substring(gcsPath.indexOf('gcs/') + 4);
      }
      if (gcsPath.startsWith('/')) {
        gcsPath = gcsPath.substring(1);
      }
      
      const b = getGcsBucket();
      if (b && gcsPath) {
        const file = b.file(gcsPath);
        try {
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            console.log(`Successfully deleted audio file ${gcsPath} from GCS`);
          } else {
            console.warn(`File ${gcsPath} did not exist on GCS, skipping file.delete`);
          }
        } catch (gcsDelErr) {
          console.error('Failed to delete audio from GCS bucket:', gcsDelErr.message);
        }
      }
    }

    await db.collection('contracts2').updateOne(
      { id },
      { $pull: { playlist_audio_files: { id: audioId } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting playlist audio file:', err);
    res.status(500).json({ error: 'Erreur interne lors de la suppression' });
  }
});

api.post('/upload/venue-photo', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  
  try {
    if (bucket) {
      const ext = path.extname(req.file.originalname) || '';
      const imageId = uuidv4();
      const gcsPath = `venue-photos/${imageId}${ext}`;
      const file = bucket.file(gcsPath);
      
      try {
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype }
        });
        return res.json({ url: `/api/gcs/${gcsPath}` });
      } catch (gcsErr) {
        console.warn('GCS Upload Failed for /upload/venue-photo, falling back to MongoDB:', gcsErr.message);
      }
    }
    
    const imageId = uuidv4();
    const b64 = req.file.buffer.toString('base64');
    const doc = { upload_id: imageId, data: b64, content_type: req.file.mimetype, created_at: new Date().toISOString() };
    await db.collection('event_uploads').insertOne(doc);
    return res.json({ url: `/api/uploads/events/${imageId}` });
  } catch (error) {
    console.error('Error uploading venue photo:', error);
    res.status(500).json({ detail: 'Erreur lors de l\'upload de la photo du lieu' });
  }
});

api.post('/upload/equipment-image', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  
  try {
    if (bucket) {
      const ext = path.extname(req.file.originalname) || '';
      const imageId = uuidv4();
      const gcsPath = `location-photos/${imageId}${ext}`;
      const file = bucket.file(gcsPath);
      
      try {
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype }
        });
        return res.json({ url: `/api/gcs/${gcsPath}` });
      } catch (gcsErr) {
        console.warn('GCS Upload Failed for /upload/equipment-image, falling back to MongoDB database:', gcsErr.message);
      }
    }
    
    // Use MongoDB base64 dynamic asset route representing a cleaner URL instead of massive raw base64 data: url in equipment record
    const imageId = uuidv4();
    const b64 = req.file.buffer.toString('base64');
    const doc = { upload_id: imageId, data: b64, content_type: req.file.mimetype, created_at: new Date().toISOString() };
    await db.collection('event_uploads').insertOne(doc);
    return res.json({ url: `/api/uploads/events/${imageId}` });
  } catch (error) {
    console.error('Error uploading equipment image:', error);
    res.status(500).json({ detail: 'Erreur lors de l\'upload de l\'image' });
  }
});

api.post('/location/equipment/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) {
    return res.status(500).json({ detail: 'GCS bucket is not initialized' });
  }

  try {
    const equipment = await db.collection('location_equipment').find({
      photo_url: { $regex: /^data:image/ }
    }).toArray();

    if (equipment.length === 0) {
      return res.json({ success: true, migrated: 0, errors: 0, total: 0, message: "Toutes les photos sont déjà migrées." });
    }

    let migrated = 0;
    let errors = 0;

    for (const item of equipment) {
      try {
        const matches = item.photo_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          errors++;
          continue;
        }

        const ext = `.${matches[1] === 'jpeg' ? 'jpg' : matches[1]}`;
        const buffer = Buffer.from(matches[2], 'base64');
        const imageId = uuidv4();
        const gcsPath = `location-photos/${imageId}${ext}`;
        const file = bucket.file(gcsPath);

        await file.save(buffer, {
          metadata: { contentType: `image/${matches[1]}` }
        });

        await db.collection('location_equipment').updateOne(
          { id: item.id },
          { $set: { photo_url: `/api/gcs/${gcsPath}` } }
        );

        migrated++;
        console.log(`Migrated equipment ${item.id} image to GCS`);
      } catch (err) {
        console.error(`Error migrating equipment ${item.id}:`, err);
        errors++;
      }
    }

    res.json({ success: true, migrated, errors, total: equipment.length });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ detail: 'Migration failed' });
  }
});

api.post('/location/equipment/cleanup-copies', authMiddleware, (req, res) => res.json({ removed: 0 }));

// Location Categories
api.get('/location/categories', authMiddleware, async (req, res) => {
  const cats = cleanList(await db.collection('location_categories').find({}, { projection: { _id: 0 } }).sort({ order: 1, sort_order: 1, name: 1 }).toArray());
  res.json({ categories: cats, success: true });
});
api.get('/location/categories/public', async (req, res) => {
  const cats = cleanList(await db.collection('location_categories').find({ visible_catalogue: { $ne: false } }, { projection: { _id: 0 } }).sort({ order: 1, sort_order: 1, name: 1 }).toArray());
  res.json({ categories: cats });
});
api.post('/location/categories', authMiddleware, async (req, res) => {
  const cat = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('location_categories').insertOne(cat);
  res.json(clean(cat));
});
api.put('/location/categories/:id', authMiddleware, async (req, res) => {
  await db.collection('location_categories').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('location_categories').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/location/categories/:id', authMiddleware, async (req, res) => {
  await db.collection('location_categories').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.put('/location/categories/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.categories || [])) await db.collection('location_categories').updateOne({ id: item.id }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});
api.post('/location/categories/reset', authMiddleware, (req, res) => res.json({ success: true }));
api.get('/location/catalogue/products-order', authMiddleware, async (req, res) => {
  const doc = await db.collection('location_settings').findOne({ type: 'products_order' }, { projection: { _id: 0 } });
  res.json(doc || { product_ids: [] });
});
api.put('/location/catalogue/products-order', authMiddleware, async (req, res) => {
  await db.collection('location_settings').updateOne({ type: 'products_order' }, { $set: { order: req.body.order } }, { upsert: true });
  res.json({ success: true });
});
api.post('/location/catalogue/products-order/reset', authMiddleware, async (req, res) => {
  await db.collection('location_settings').deleteOne({ type: 'products_order' });
  res.json({ success: true });
});

// Location Clients
api.get('/location/clients', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('location_clients').find({}, { projection: { _id: 0 } }).sort({ name: 1, company_name: 1 }).toArray()));
});
api.post('/location/clients', authMiddleware, async (req, res) => {
  const c = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('location_clients').insertOne(c);
  res.json(clean(c));
});
api.put('/location/clients/:id', authMiddleware, async (req, res) => {
  await db.collection('location_clients').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('location_clients').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/location/clients/:id', authMiddleware, async (req, res) => {
  await db.collection('location_clients').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// Location DJs
api.get('/location/djs', authMiddleware, async (req, res) => {
  try {
    const djProfiles = await db.collection('dj_profiles').find({}, { projection: { _id: 0, id: 1, nom_artistique: 1, nom_complet: 1 } }).toArray();
    const locationDjsList = await db.collection('location_djs').find({}, { projection: { _id: 0 } }).toArray();
    
    const colorMap = {};
    locationDjsList.forEach(dj => {
      colorMap[dj.id] = dj.color;
    });

    const result = djProfiles.map(p => ({
      id: p.id,
      name: p.nom_artistique || p.nom_complet || 'DJ Inconnu',
      color: colorMap[p.id] || '#f97316'
    }));

    // Include legacy DJs just in case they exist
    const profileIds = new Set(djProfiles.map(p => p.id));
    const legacyDJs = locationDjsList.filter(dj => !profileIds.has(dj.id) && (dj.name || dj.nom_artistique));
    
    const finalResult = [...result, ...legacyDJs.map(dj => ({
      id: dj.id,
      name: dj.name || dj.nom_artistique || 'DJ Inconnu',
      color: dj.color || '#f97316'
    }))];

    res.json(cleanList(finalResult));
  } catch (err) {
    console.error('Error fetching location djs:', err);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
});
api.put('/location/djs/:id', authMiddleware, async (req, res) => {
  await db.collection('location_djs').updateOne(
    { id: req.params.id }, 
    { $set: { id: req.params.id, ...req.body } },
    { upsert: true }
  );
  res.json(await db.collection('location_djs').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});

// Location Quotes
api.get('/location/quotes', authMiddleware, async (req, res) => {
  const filter = {};
  if (req.query.archived === 'true') {
    filter.is_archived = true;
  } else if (req.query.archived === 'false') {
    filter.is_archived = { $ne: true };
  }
  res.json(cleanList(await db.collection('location_quotes').find(filter, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.get('/location/quotes/:id', authMiddleware, async (req, res) => {
  const q = await db.collection('location_quotes').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!q) return res.status(404).json({ detail: 'Not found' });
  res.json(q);
});
api.post('/location/quotes', authMiddleware, async (req, res) => {
  const q = { id: uuidv4(), ...req.body, status: req.body.status || 'en_attente', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('location_quotes').insertOne(q);
  res.json(clean(q));
});
api.put('/location/quotes/:id', authMiddleware, async (req, res) => {
  const quoteId = req.params.id;
  await db.collection('location_quotes').updateOne({ id: quoteId }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const updatedQuote = await db.collection('location_quotes').findOne({ id: quoteId }, { projection: { _id: 0 } });
  
  // Also update associated reservation if it exists
  const associatedReservation = await db.collection('location_reservations').findOne({ quote_id: quoteId });
  if (associatedReservation) {
    const resUpdate = {
      client_name: updatedQuote.client_name || associatedReservation.client_name,
      start_date: updatedQuote.start_date || associatedReservation.start_date,
      end_date: updatedQuote.end_date || associatedReservation.end_date,
      total_amount: updatedQuote.total_amount || associatedReservation.total_amount,
      subtotal: updatedQuote.subtotal || associatedReservation.subtotal,
      deposit_amount: updatedQuote.deposit_amount || associatedReservation.deposit_amount,
      guarantee_amount: updatedQuote.guarantee_amount || associatedReservation.guarantee_amount,
      delivery_cost: updatedQuote.delivery_cost || associatedReservation.delivery_cost,
      delivery_address: updatedQuote.delivery_address || associatedReservation.delivery_address,
      delivery_zone: updatedQuote.delivery_zone || associatedReservation.delivery_zone,
      installation_cost: updatedQuote.installation_cost || associatedReservation.installation_cost,
      equipment_items: updatedQuote.items || associatedReservation.equipment_items,
      items: updatedQuote.items || associatedReservation.items || associatedReservation.equipment_items,
      updated_at: new Date().toISOString()
    };
    await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $set: resUpdate });
    
    // Sync newly updated reservation to Google Calendar
    const updatedResForGoogle = await db.collection('location_reservations').findOne({ id: associatedReservation.id });
    const googleEventId = await tryAutoSyncToGoogle(updatedResForGoogle);
    if (googleEventId === 'DELETED') {
        await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $unset: { google_event_id: "" } });
    } else if (googleEventId && googleEventId !== updatedResForGoogle.google_event_id) {
        await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $set: { google_event_id: googleEventId } });
    }
  }

  res.json(updatedQuote);
});
api.delete('/location/quotes/:id', authMiddleware, async (req, res) => {
  await db.collection('location_quotes').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.patch('/location/quotes/:id/status', authMiddleware, async (req, res) => {
  const quoteId = req.params.id;
  const newStatus = req.body.status;
  const oldQuote = await db.collection('location_quotes').findOne({ id: quoteId });
  
  await db.collection('location_quotes').updateOne({ id: quoteId }, { $set: { status: newStatus, updated_at: new Date().toISOString() } });
  const updatedQuote = await db.collection('location_quotes').findOne({ id: quoteId }, { projection: { _id: 0 } });
  
  if (newStatus !== 'Accepté' && oldQuote && oldQuote.status === 'Accepté') {
      // delete reservation(s) and google calendar event(s)
      const reservations = await db.collection('location_reservations').find({ quote_id: quoteId }).toArray();
      for (const reservation of reservations) {
        if (reservation.google_event_id) {
           await deleteReservationFromGoogleCalendar(reservation.google_event_id);
        }
      }
      await db.collection('location_reservations').deleteMany({ quote_id: quoteId });
  } else if (newStatus === 'Accepté' && oldQuote && oldQuote.status !== 'Accepté') {
      // Create reservation if not exists
      const existing = await db.collection('location_reservations').findOne({ quote_id: quoteId });
      if (!existing) {
          const reservationData = {
              client_id: updatedQuote.client_id || '',
              client_name: updatedQuote.client_name || '',
              start_date: updatedQuote.start_date || '',
              end_date: updatedQuote.end_date || '',
              total_amount: updatedQuote.total_amount || 0,
              subtotal: updatedQuote.subtotal || 0,
              deposit_amount: updatedQuote.deposit_amount || 0,
              guarantee_amount: updatedQuote.guarantee_amount || 0,
              delivery_cost: updatedQuote.delivery_cost || 0,
              delivery_address: updatedQuote.delivery_address || '',
              delivery_zone: updatedQuote.delivery_zone || '',
              installation_cost: updatedQuote.installation_cost || 0,
              equipment_items: updatedQuote.items || [],
              booking_type: updatedQuote.booking_type || 'client',
              quote_id: quoteId,
              status: 'accepted'
          };
          const r = { id: uuidv4(), ...reservationData, created_at: new Date().toISOString() };
          const googleEventId = await tryAutoSyncToGoogle(r);
          if (googleEventId && googleEventId !== 'DELETED') {
            r.google_event_id = googleEventId;
          }
          await db.collection('location_reservations').insertOne(r);
      }
  }

  res.json(updatedQuote);
});
api.patch('/location/quotes/:id', authMiddleware, async (req, res) => {
  const quoteId = req.params.id;
  await db.collection('location_quotes').updateOne({ id: quoteId }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const updatedQuote = await db.collection('location_quotes').findOne({ id: quoteId }, { projection: { _id: 0 } });

  // Also update associated reservation if it exists and wasn't a manual detach
  if (req.body.status !== 'archive') {
    const associatedReservation = await db.collection('location_reservations').findOne({ quote_id: quoteId });
    if (associatedReservation) {
      const resUpdate = {
        client_name: updatedQuote.client_name || associatedReservation.client_name,
        start_date: updatedQuote.start_date || associatedReservation.start_date,
        end_date: updatedQuote.end_date || associatedReservation.end_date,
        total_amount: updatedQuote.total_amount || associatedReservation.total_amount,
        subtotal: updatedQuote.subtotal || associatedReservation.subtotal,
        deposit_amount: updatedQuote.deposit_amount || associatedReservation.deposit_amount,
        guarantee_amount: updatedQuote.guarantee_amount || associatedReservation.guarantee_amount,
        delivery_cost: updatedQuote.delivery_cost || associatedReservation.delivery_cost,
        delivery_address: updatedQuote.delivery_address || associatedReservation.delivery_address,
        delivery_zone: updatedQuote.delivery_zone || associatedReservation.delivery_zone,
        installation_cost: updatedQuote.installation_cost || associatedReservation.installation_cost,
        equipment_items: updatedQuote.items || associatedReservation.equipment_items,
        items: updatedQuote.items || associatedReservation.items || associatedReservation.equipment_items,
        updated_at: new Date().toISOString()
      };
      await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $set: resUpdate });

      // Sync newly updated reservation to Google Calendar
      const updatedResForGoogle = await db.collection('location_reservations').findOne({ id: associatedReservation.id });
      const googleEventId = await tryAutoSyncToGoogle(updatedResForGoogle);
      if (googleEventId === 'DELETED') {
          await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $unset: { google_event_id: "" } });
      } else if (googleEventId && googleEventId !== updatedResForGoogle.google_event_id) {
          await db.collection('location_reservations').updateOne({ id: associatedReservation.id }, { $set: { google_event_id: googleEventId } });
      }
    }
  }

  res.json(updatedQuote);
});
api.patch('/location/quotes/:id/archive', authMiddleware, async (req, res) => {
  const isArchived = req.body.is_archived !== false;
  const nowIso = new Date().toISOString();
  
  await db.collection('location_quotes').updateOne(
    { id: req.params.id },
    { $set: { is_archived: isArchived, archived_at: isArchived ? nowIso : null, updated_at: nowIso } }
  );
  
  // Also archive/unarchive the linked reservation if it exists
  await db.collection('location_reservations').updateOne(
    { quote_id: req.params.id },
    { $set: { is_archived: isArchived, archived_at: isArchived ? nowIso : null } }
  );

  res.json({ success: true });
});

// Authenticated attachments/documents endpoints for location_quotes
api.post('/location/quotes/:id/documents', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const category = req.body.category || 'Administrative';
  const docId = uuidv4();
  const decodedOriginalname = decodeMulterFilename(req.file.originalname);
  
  try {
    const { buffer: pdfBuffer, filename: convertedFilename } = await convertToPdfBuffer(req.file.buffer, decodedOriginalname, req.file.mimetype);
    
    const newDoc = {
      id: docId,
      filename: convertedFilename,
      category: category,
      uploaded_at: new Date().toISOString()
    };
    
    if (bucket) {
      const gcsPath = `location-quote-documents/${req.params.id}/${docId}.pdf`;
      const file = bucket.file(gcsPath);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
      newDoc.gcs_path = gcsPath;
    } else {
      newDoc.pdf_data = pdfBuffer.toString('base64');
    }
    
    await db.collection('location_quotes').updateOne(
      { id: req.params.id }, 
      { $push: { documents: newDoc } }
    );
    
    res.json({ success: true, document: { id: newDoc.id, filename: newDoc.filename, category: newDoc.category, uploaded_at: newDoc.uploaded_at } });
  } catch (err) {
    console.error("[LocationQuotesAttachment] Error:", err);
    res.status(500).json({ error: "Erreur lors de la conversion ou de l'upload: " + err.message });
  }
});

api.get('/location/quotes/:id/documents/:docId', authMiddleware, async (req, res) => {
  const quote = await db.collection('location_quotes').findOne({ id: req.params.id });
  if (!quote || !quote.documents) return res.status(404).json({ error: 'Not found' });
  const doc = quote.documents.find(d => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  
  const isInline = req.query.preview === 'true' || req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';

  const activeBucket = getGcsBucket();
  if (doc.gcs_path && activeBucket) {
    const file = activeBucket.file(doc.gcs_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    file.createReadStream().on('error', (err) => res.status(500).send('Error')).pipe(res);
  } else if (doc.pdf_data) {
    const buffer = Buffer.from(doc.pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.filename)}"`);
    res.send(buffer);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

api.delete('/location/quotes/:id/documents/:docId', authMiddleware, async (req, res) => {
  try {
    const quote = await db.collection('location_quotes').findOne({ id: req.params.id });
    if (!quote || !quote.documents) return res.status(404).json({ error: 'Not found' });
    
    const docToDelete = quote.documents.find(d => d.id === req.params.docId);
    const activeBucket = getGcsBucket();
    if (docToDelete && docToDelete.gcs_path && activeBucket) {
      const file = activeBucket.file(docToDelete.gcs_path);
      try {
        await file.delete();
      } catch (err) {
        console.error('Failed to delete file from GCS:', err);
      }
    }

    await db.collection('location_quotes').updateOne(
      { id: req.params.id },
      { $pull: { documents: { id: req.params.docId } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
api.post('/location/generate-description', authMiddleware, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
      return res.status(400).json({ detail: "Clé API Gemini non configurée. Veuillez l'ajouter dans vos secrets." });
    }
    const { name, reference, category, observations } = req.body;
    const prompt = `Génère une description commerciale courte et professionnelle en français pour ce matériel de location événementielle :\n- Nom : ${name || 'Non précisé'}\n- Référence : ${reference || 'Non précisée'}\n- Catégorie : ${category || 'Non précisée'}\n- Observations : ${observations || 'Aucune'}\n\nLa description doit être vendeuse, concise (2-3 phrases max) et mettre en avant les avantages pour un événement. Réponds uniquement avec la description, sans guillemets.`;
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await generateContentWithRetry(ai, {
        contents: prompt
    });
    const description = response.text.trim() || '';
    res.json({ description });
  } catch (e) {
    console.log('[AI generation info/warn] Generation exception:', e.message || e);
    const errMsg = (e.message || String(e)).toLowerCase();
    if (errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("429") || errMsg.includes("rate limit")) {
      return res.status(429).json({ detail: "Le quota gratuit de génération avec l'IA est temporairement épuisé (20 requêtes/jour max). Veuillez ajouter votre propre clé payante dans 'Paramètres -> Secrets' ou réessayer plus tard." });
    }
    res.status(500).json({ detail: "Erreur lors de la génération avec l'IA. Veuillez réessayer dans quelques instants." });
  }
});
api.post('/location/generate-catalogue-description', authMiddleware, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
      return res.status(400).json({ detail: "Clé API Gemini non configurée. Veuillez l'ajouter dans vos secrets." });
    }
    const { name, reference, category, observations } = req.body;
    const prompt = `Génère une description catalogue commerciale en français pour ce matériel de location événementielle :\n- Nom : ${name || 'Non précisé'}\n- Référence : ${reference || 'Non précisée'}\n- Catégorie : ${category || 'Non précisée'}\n- Observations : ${observations || 'Aucune'}\n\nLa description doit être vendeuse, professionnelle, concise (3-4 phrases) et adaptée à un catalogue public destiné aux organisateurs d'événements. Mets en avant les caractéristiques et avantages. Réponds uniquement avec la description, sans guillemets.`;
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await generateContentWithRetry(ai, {
        contents: prompt
    });
    const description = response.text.trim() || '';
    res.json({ description });
  } catch (e) {
    console.log('[AI catalogue generation info/warn] Catalogue generation exception:', e.message || e);
    const errMsg = (e.message || String(e)).toLowerCase();
    if (errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("429") || errMsg.includes("rate limit")) {
      return res.status(429).json({ detail: "Le quota gratuit de génération avec l'IA est temporairement épuisé (20 requêtes/jour max). Veuillez ajouter votre propre clé payante dans 'Paramètres -> Secrets' ou réessayer plus tard." });
    }
    res.status(500).json({ detail: "Erreur lors de la génération avec l'IA. Veuillez réessayer dans quelques instants." });
  }
});

api.post('/location/suggest-price', authMiddleware, async (req, res) => {
  const { name, reference, category, observations, catalogue_description } = req.body;

  // Pre-calculate smart catalog fallback in case Gemini fails or is not configured
  let fallbackPrice = 25.0;
  let fallbackExplanation = "";
  
  try {
    const query = category ? { category: category } : {};
    const matchingItems = await db.collection('location_equipment').find(query, { projection: { daily_price: 1 } }).toArray();
    
    if (matchingItems && matchingItems.length > 0) {
      let sum = 0;
      let count = 0;
      matchingItems.forEach(item => {
        if (item.daily_price && typeof item.daily_price === 'number') {
          sum += item.daily_price;
          count++;
        }
      });
      
      if (count > 0) {
        fallbackPrice = Math.round((sum / count) * 100) / 100;
        fallbackExplanation = `Calculé d'après la moyenne de vos matériels existants dans la catégorie "${category}" (${fallbackPrice}€/jour).`;
      }
    }
    
    if (fallbackPrice <= 0 || !fallbackExplanation) {
      const allItems = await db.collection('location_equipment').find({}, { projection: { daily_price: 1 } }).toArray();
      if (allItems && allItems.length > 0) {
        let sum = 0;
        let count = 0;
        allItems.forEach(item => {
          if (item.daily_price && typeof item.daily_price === 'number') {
            sum += item.daily_price;
            count++;
          }
        });
        if (count > 0) {
          fallbackPrice = Math.round((sum / count) * 100) / 100;
          fallbackExplanation = `Basé sur la moyenne de l'ensemble de votre catalogue existant (${fallbackPrice}€/jour).`;
        }
      }
    }
  } catch (dbErr) {
    console.error("Failed to query catalog for fallback:", dbErr);
  }
  
  if (fallbackPrice <= 0 || !fallbackExplanation) {
    const lowerCat = (category || "").toLowerCase();
    const lowerName = (name || "").toLowerCase();
    
    if (lowerCat.includes("pack") || lowerName.includes("pack")) {
      fallbackPrice = 120.0;
      fallbackExplanation = "Tarif indicatif par défaut pour un pack de sonorisation ou d'éclairage.";
    } else if (lowerCat.includes("son") || lowerCat.includes("audio") || lowerName.includes("enceinte") || lowerName.includes("micro")) {
      fallbackPrice = 35.0;
      fallbackExplanation = "Tarif d'estimation standard pour du matériel audio ou de sonorisation.";
    } else if (lowerCat.includes("lumi") || lowerCat.includes("éclair") || lowerName.includes("spot") || lowerName.includes("led") || lowerName.includes("lyre")) {
      fallbackPrice = 20.0;
      fallbackExplanation = "Tarif d'estimation standard pour du matériel d'éclairage.";
    } else if (lowerCat.includes("mariage") || lowerName.includes("decor") || lowerName.includes("arche")) {
      fallbackPrice = 50.0;
      fallbackExplanation = "Tarif d'estimation standard pour décoration / accessoires événementiels.";
    } else {
      fallbackPrice = 25.0;
      fallbackExplanation = "Tarif d'estimation standard de départ pour du matériel événementiel général.";
    }
  }

  // Attempt to use Gemini API if available and configured
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
    try {
      const prompt = `Estime un prix indicatif de location à la journée (en Euros) pour le matériel suivant :
- Nom : ${name || 'Non précisé'}
- Référence : ${reference || 'Non précisée'}
- Catégorie : ${category || 'Non précisée'}
- Observations : ${observations || 'Aucune'}
- Description : ${catalogue_description || 'Aucune'}

Recherche sur Internet (marché français de la location d'événementiel, de sonorisation, d'éclairage, ou de matériel d'événementiel/BTP ou autre selon la catégorie) les tarifs pratiqués pour ce produit ou un équivalent proche.
Propose un prix journalier réaliste (nombre uniquement) et une brève explication (max 3 phrases) détaillant les tarifs constatés chez les concurrents et d'où vient cette estimation.

Réponds obligatoirement sous la forme d'un objet JSON strict avec exactement ces deux clés :
{
  "suggestedPrice": 25.00,
  "explanation": "Le prix moyen constaté chez les concurrents pour ce modèle ou équivalent est d'environ 25 à 30€ par jour. Compte tenu des informations fournies, un tarif de 25€ est recommandé pour rester compétitif."
}`;

      const { GoogleGenAI, Type } = require('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      let response;
      try {
        response = await generateContentWithRetry(ai, {
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedPrice: {
                  type: Type.NUMBER,
                  description: "Le prix de location suggéré par jour en Euros (nombre uniquement)."
                },
                explanation: {
                  type: Type.STRING,
                  description: "Une explication concise des tarifs concurrents constatés."
                }
              },
              required: ["suggestedPrice", "explanation"]
            }
          }
        }, ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]);
      } catch (searchError) {
        console.log("[Pricing Search grounding notice] Grounding or model busy, trying base knowledge fallback:", searchError.message || searchError);
        response = await generateContentWithRetry(ai, {
          contents: prompt + "\nRemarque : sers-toi uniquement de tes connaissances pré-entraînées sur le marché français de l'événementiel si la recherche internet n'est pas disponible.",
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedPrice: {
                  type: Type.NUMBER,
                  description: "Le prix de location suggéré par jour en Euros (nombre uniquement)."
                },
                explanation: {
                  type: Type.STRING,
                  description: "Une explication concise des tarifs concurrents constatés d'après vos connaissances pré-entraînées."
                }
              },
              required: ["suggestedPrice", "explanation"]
            }
          }
        });
      }
      
      const text = response.text.trim();
      const result = JSON.parse(text);
      if (result && typeof result.suggestedPrice === 'number') {
        return res.json(result);
      }
    } catch (e) {
      console.log('[AI suggest-price notice/info] falling back to smart defaults:', e.message || e);
      const errStr = (e.message || String(e)).toLowerCase();
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit')) {
        const quotaExplanation = fallbackExplanation + " (Note : Limite de quota IA atteinte temporairement. Nous avons calculé un tarif indicatif intelligent basé sur votre catalogue existant)";
        return res.json({
          suggestedPrice: fallbackPrice,
          explanation: quotaExplanation
        });
      }
    }
  }

  const finalExplanation = fallbackExplanation + " (Note : Estimation hors ligne basée sur votre historique/catégorie de catalogue car la clé API Gemini a atteint son quota ou n'est pas disponible)";
  res.json({
    suggestedPrice: fallbackPrice,
    explanation: finalExplanation
  });
});
api.get('/location/dashboard', authMiddleware, async (req, res) => {
  const [quotes, reservations, equipment] = await Promise.all([
    db.collection('location_quotes').countDocuments({ status: 'en_attente' }),
    db.collection('location_reservations').countDocuments({ status: 'active' }),
    db.collection('location_equipment').countDocuments({}),
  ]);
  res.json({ pending_quotes: quotes, active_reservations: reservations, total_equipment: equipment });
});
api.get('/location/settings/cgv', authMiddleware, async (req, res) => {
  const s = await db.collection('location_settings').findOne({ type: 'cgv' }, { projection: { _id: 0 } });
  if (s) {
    res.json({ type: 'cgv', cgv: s.cgv || s.content || '' });
  } else {
    res.json({ type: 'cgv', cgv: '' });
  }
});
api.post('/location/settings/cgv', authMiddleware, async (req, res) => {
  await db.collection('location_settings').updateOne({ type: 'cgv' }, { $set: { type: 'cgv', cgv: req.body.cgv || req.body.content || '' } }, { upsert: true });
  res.json({ success: true });
});

// GCS settings
api.get('/location/settings/gcs', authMiddleware, async (req, res) => {
  const s = await db.collection('location_settings').findOne({ type: 'gcs' }, { projection: { _id: 0 } });
  res.json({
    gcs_use_direct_urls: s ? !!s.gcs_use_direct_urls : false
  });
});

api.post('/location/settings/gcs', authMiddleware, async (req, res) => {
  await db.collection('location_settings').updateOne(
    { type: 'gcs' },
    { $set: { type: 'gcs', gcs_use_direct_urls: !!req.body.gcs_use_direct_urls } },
    { upsert: true }
  );
  res.json({ success: true, gcs_use_direct_urls: !!req.body.gcs_use_direct_urls });
});

// Location Google Calendar settings
api.get('/location/settings/google-calendar', authMiddleware, async (req, res) => {
  try {
    const s = await db.collection('location_settings').findOne({ type: 'google_calendar' });
    const savedCalendarId = s ? s.google_calendar_id || '' : '';
    
    let serviceAccountEmail = null;
    const credentials = getGoogleLocationCalendarCredentials();
    if (credentials) {
      serviceAccountEmail = credentials.client_email;
    } else if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
      try {
        const creds = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
        serviceAccountEmail = creds.client_email;
      } catch (e) {
        console.error('Failed to read default credentials file', e);
      }
    }
    
    await initLocationGoogleCalendar();
    const resolvedId = await resolveLocationCalendarId();
    
    res.json({
      success: true,
      google_calendar_id: savedCalendarId,
      env_google_calendar_id: process.env.GOOGLE_LOCATION_CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID || '',
      current_resolved_calendar_id: resolvedId,
      serviceAccountEmail: serviceAccountEmail,
      initialized: !!locationCalendar
    });
  } catch (error) {
    console.error('Error in GET /location/settings/google-calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

api.post('/location/settings/google-calendar', authMiddleware, async (req, res) => {
  try {
    const { google_calendar_id } = req.body;
    const cleanId = (google_calendar_id || '').trim();
    
    await db.collection('location_settings').updateOne(
      { type: 'google_calendar' },
      { $set: { type: 'google_calendar', google_calendar_id: cleanId } },
      { upsert: true }
    );
    
    // Reset initialization to trigger refresh with new calendar ID
    locationGoogleCalendarInitPromise = null;
    await initLocationGoogleCalendar();
    
    res.json({ 
      success: true, 
      google_calendar_id: cleanId,
      current_resolved_calendar_id: locationCalendarId
    });
  } catch (error) {
    console.error('Error in POST /location/settings/google-calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

// GCS Live diagnostic
api.get('/location/gcs-diagnostic', authMiddleware, async (req, res) => {
  const diagnostic = {
    env: {
      GOOGLE_CREDENTIALS_JSON_exists: !!process.env.GOOGLE_CREDENTIALS_JSON,
      GOOGLE_CREDENTIALS_JSON_length: process.env.GOOGLE_CREDENTIALS_JSON ? process.env.GOOGLE_CREDENTIALS_JSON.length : 0,
      GOOGLE_CLIENT_EMAIL_exists: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY_exists: !!process.env.GOOGLE_PRIVATE_KEY,
    },
    gcs_configuration: {
      bucket_name: BUCKET_NAME,
      storage_initialized: !!storage,
      bucket_initialized: !!bucket,
    },
    credentials_source: null,
    credentials_parsed: null,
    connection_test: {
      success: false,
      error: null,
      error_code: null,
      files_found_count: 0
    }
  };

  let activeCredentials = null;

  try {
    if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
      diagnostic.credentials_source = 'physical_file';
    } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
      diagnostic.credentials_source = 'environment_json';
    } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      diagnostic.credentials_source = 'environment_individual_variables';
    } else {
      diagnostic.credentials_source = 'none';
    }

    activeCredentials = getGoogleCredentials();
    if (activeCredentials) {
      diagnostic.credentials_parsed = {
        project_id: activeCredentials.project_id,
        client_email: activeCredentials.client_email,
        type: activeCredentials.type || (activeCredentials.client_email ? 'service_account' : null),
        private_key_starts_with: activeCredentials.private_key ? activeCredentials.private_key.substring(0, 30) + "..." : null
      };
    }
  } catch (err) {
    diagnostic.credentials_source_error = err.message;
  }

  // Permettre un rechargement dynamique en direct à la demande
  if (activeCredentials) {
    try {
      const testStorage = new Storage({ credentials: activeCredentials });
      const testBucket = testStorage.bucket(BUCKET_NAME);
      const [files] = await testBucket.getFiles({ maxResults: 3 });
      
      diagnostic.connection_test.success = true;
      diagnostic.connection_test.files_found_count = files.length;
      diagnostic.connection_test.sample_files = files.map(f => f.name);

      // On guérit l'état de l'application à chaud !
      storage = testStorage;
      bucket = testBucket;
      diagnostic.gcs_configuration.storage_initialized = true;
      diagnostic.gcs_configuration.bucket_initialized = true;
      console.log('🌈 GCS healed successfully with verified credentials during diagnostic check!');
    } catch (gcsErr) {
      diagnostic.connection_test.success = false;
      diagnostic.connection_test.error = gcsErr.message;
      diagnostic.connection_test.error_code = gcsErr.code;
      diagnostic.connection_test.error_stack = gcsErr.stack;
    }
  } else {
    diagnostic.connection_test.success = false;
    diagnostic.connection_test.error = "Aucune information de connexion (credentials) n'a pu être chargée.";
  }

  res.json(diagnostic);
});

// Location Reservations
api.get('/location/reservations', authMiddleware, async (req, res) => {
  try {
    // Self-healing: Auto-generate missing reservations from accepted location quotes
    const acceptedQuotes = await db.collection('location_quotes').find({
      status: { $in: ['Accepté', 'accepté', 'Accepted', 'accepted', 'Valide', 'valide'] }
    }).toArray();
    
    for (const quote of acceptedQuotes) {
      const existing = await db.collection('location_reservations').findOne({ quote_id: quote.id });
      if (!existing) {
        console.log(`Self-healing: Creating missing reservation for accepted quote ${quote.id} (${quote.client_name})`);
        const reservationData = {
          client_id: quote.client_id || '',
          client_name: quote.client_name || '',
          start_date: quote.start_date || '',
          end_date: quote.end_date || '',
          total_amount: quote.total_amount || 0,
          subtotal: quote.subtotal || 0,
          deposit_amount: quote.deposit_amount || 0,
          guarantee_amount: quote.guarantee_amount || 0,
          delivery_cost: quote.delivery_cost || 0,
          delivery_address: quote.delivery_address || '',
          delivery_zone: quote.delivery_zone || '',
          installation_cost: quote.installation_cost || 0,
          equipment_items: quote.items || [],
          booking_type: quote.booking_type || 'client',
          quote_id: quote.id,
          status: 'accepted'
        };
        const r = { id: uuidv4(), ...reservationData, created_at: new Date().toISOString() };
        
        // Try auto sync to google calendar
        try {
          const googleEventId = await tryAutoSyncToGoogle(r);
          if (googleEventId && googleEventId !== 'DELETED') {
            r.google_event_id = googleEventId;
          }
        } catch (gcalErr) {
          console.error(`GCal sync error in self-healing for quote ${quote.id}:`, gcalErr);
        }
        
        await db.collection('location_reservations').insertOne(r);
      }
    }
  } catch (err) {
    console.error('Error during self-healing accepted quotes in GET reservations:', err);
  }

  try {
    await syncGoogleCalendarChangesBack();
  } catch (err) {
    console.error('Error during GCal sync-back in GET endpoint:', err);
  }
  const filter = {};
  if (req.query.archived === 'true') {
    filter.is_archived = true;
  } else if (req.query.archived === 'false') {
    filter.is_archived = { $ne: true };
  }
  res.json(cleanList(await db.collection('location_reservations').find(filter, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.post('/location/reservations', authMiddleware, async (req, res) => {
  // Empêcher les doublons : si une réservation existe déjà pour ce devis, la retourner
  if (req.body.quote_id) {
    const existing = await db.collection('location_reservations').findOne(
      { quote_id: req.body.quote_id }, { projection: { _id: 0 } }
    );
    if (existing) return res.json(existing);
  }
  // Enrichir la réservation avec les données du devis
  let reservationData = { ...req.body };
  if (req.body.quote_id) {
    const quote = await db.collection('location_quotes').findOne({ id: req.body.quote_id }, { projection: { _id: 0 } });
    if (quote) {
      reservationData = {
        ...reservationData,
        client_id: reservationData.client_id || quote.client_id || '',
        client_name: reservationData.client_name || quote.client_name || '',
        start_date: reservationData.start_date || quote.start_date || '',
        end_date: reservationData.end_date || quote.end_date || '',
        total_amount: reservationData.total_amount || quote.total_amount || 0,
        subtotal: reservationData.subtotal || quote.subtotal || 0,
        deposit_amount: reservationData.deposit_amount || quote.deposit_amount || 0,
        guarantee_amount: reservationData.guarantee_amount || quote.guarantee_amount || 0,
        delivery_cost: reservationData.delivery_cost || quote.delivery_cost || 0,
        delivery_address: reservationData.delivery_address || quote.delivery_address || '',
        delivery_zone: reservationData.delivery_zone || quote.delivery_zone || '',
        installation_cost: reservationData.installation_cost || quote.installation_cost || 0,
        equipment_items: reservationData.equipment_items || quote.items || [],
        booking_type: reservationData.booking_type || quote.booking_type || 'client',
      };
    }
  }
  const r = { id: uuidv4(), ...reservationData, status: reservationData.status || 'accepted', created_at: new Date().toISOString() };
  
  // Try auto sync
  const googleEventId = await tryAutoSyncToGoogle(r);
  if (googleEventId && googleEventId !== 'DELETED') {
    r.google_event_id = googleEventId;
  }
  
  await db.collection('location_reservations').insertOne(r);
  res.json(clean(r));
});
api.post('/location/reservations/direct', authMiddleware, async (req, res) => {
  // Resolve equipment names and references for items
  const items = req.body.items || [];
  const resolvedItems = [];
  for (const item of items) {
    let eqName = item.name || item.equipment_name || '';
    let eqRef = item.reference || '';
    let eqPrice = item.daily_price || 0;
    if (item.equipment_id) {
      const eq = await db.collection('location_equipment').findOne({ id: item.equipment_id }, { projection: { _id: 0, name: 1, reference: 1, daily_price: 1 } });
      if (eq) {
        eqName = eqName || eq.name || '';
        eqRef = eqRef || eq.reference || '';
        eqPrice = eqPrice || eq.daily_price || 0;
      }
    }
    resolvedItems.push({ ...item, equipment_name: eqName, name: eqName, reference: eqRef, daily_price: eqPrice });
  }

  let client_name = req.body.client_name || '';
  if (req.body.booking_type === 'client' && req.body.client_id) {
    const client = await db.collection('location_clients').findOne({ id: req.body.client_id }, { projection: { _id: 0 } });
    if (client) {
      client_name = client.company_name ? `${client.name} - ${client.company_name}` : client.name;
    }
  }

  const r = { 
    id: uuidv4(), 
    ...req.body, 
    client_name: client_name,
    items: resolvedItems, 
    equipment_items: resolvedItems, 
    status: req.body.status || 'active', 
    created_at: new Date().toISOString() 
  };
  
  // Sync to Google Calendar safely
  const googleEventId = await tryAutoSyncToGoogle(r);
  if (googleEventId && googleEventId !== 'DELETED') {
    r.google_event_id = googleEventId;
  }

  await db.collection('location_reservations').insertOne(r);
  res.json(clean(r));
});
api.put('/location/reservations/:id', authMiddleware, async (req, res) => {
  const updateFields = { ...req.body };
  if (updateFields.equipment_items && !updateFields.items) {
    updateFields.items = updateFields.equipment_items;
  }
  await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: updateFields });
  const updatedReservation = await db.collection('location_reservations').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  
  if (updatedReservation) {
    const googleEventId = await tryAutoSyncToGoogle(updatedReservation);
    if (googleEventId === 'DELETED') {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $unset: { google_event_id: "" } });
        delete updatedReservation.google_event_id;
    } else if (googleEventId && googleEventId !== updatedReservation.google_event_id) {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: { google_event_id: googleEventId } });
        updatedReservation.google_event_id = googleEventId;
    }
  }
  
  res.json(updatedReservation);
});
api.delete('/location/reservations/:id', authMiddleware, async (req, res) => {
  const reservation = await db.collection('location_reservations').findOne({ id: req.params.id });
  if (reservation && reservation.google_event_id) {
     await deleteReservationFromGoogleCalendar(reservation.google_event_id);
  }
  await db.collection('location_reservations').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.delete('/location/reservations/by-quote/:quoteId', authMiddleware, async (req, res) => {
  const reservations = await db.collection('location_reservations').find({ quote_id: req.params.quoteId }).toArray();
  for (const reservation of reservations) {
    if (reservation.google_event_id) {
       await deleteReservationFromGoogleCalendar(reservation.google_event_id);
    }
  }
  await db.collection('location_reservations').deleteMany({ quote_id: req.params.quoteId });
  res.json({ success: true });
});
api.post('/location/maintenance-reports', authMiddleware, async (req, res) => {
  const r = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('location_reservations').updateOne({ id: req.body.reservation_id }, { $push: { maintenance_reports: r } });
  res.json(clean(r));
});
api.put('/location/reservations/:id/change-status', authMiddleware, async (req, res) => {
  const updateFields = { status: req.body.status };
  if (req.body.status === 'returned' || req.body.status === 'equipment_returned') {
    updateFields.is_archived = true;
    updateFields.archived_at = new Date().toISOString();
    const reservation = await db.collection('location_reservations').findOne({ id: req.params.id }, { projection: { _id: 0, quote_id: 1 } });
    if (reservation && reservation.quote_id) {
      await db.collection('location_quotes').updateOne(
        { id: reservation.quote_id }, { $set: { is_archived: true, archived_at: new Date().toISOString() } }
      );
    }
  }
  await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: updateFields });
  
  const updatedReservation = await db.collection('location_reservations').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (updatedReservation) {
     const googleEventId = await tryAutoSyncToGoogle(updatedReservation);
     if (googleEventId === 'DELETED') {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $unset: { google_event_id: "" } });
     } else if (googleEventId && googleEventId !== updatedReservation.google_event_id) {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: { google_event_id: googleEventId } });
     }
  }
  
  res.json({ success: true });
});
api.patch('/location/reservations/:id/status', authMiddleware, async (req, res) => {
  const updateFields = { status: req.body.status };
  // Auto-archiver si le statut passe en retourné
  if (req.body.status === 'returned' || req.body.status === 'equipment_returned') {
    updateFields.is_archived = true;
    updateFields.archived_at = new Date().toISOString();
    // Archiver aussi le devis associé
    const reservation = await db.collection('location_reservations').findOne({ id: req.params.id }, { projection: { _id: 0, quote_id: 1 } });
    if (reservation && reservation.quote_id) {
      await db.collection('location_quotes').updateOne(
        { id: reservation.quote_id }, { $set: { is_archived: true, archived_at: new Date().toISOString() } }
      );
    }
  }
  await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: updateFields });
  
  const updatedReservation = await db.collection('location_reservations').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (updatedReservation) {
     const googleEventId = await tryAutoSyncToGoogle(updatedReservation);
     if (googleEventId === 'DELETED') {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $unset: { google_event_id: "" } });
        delete updatedReservation.google_event_id;
     } else if (googleEventId && googleEventId !== updatedReservation.google_event_id) {
        await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: { google_event_id: googleEventId } });
        updatedReservation.google_event_id = googleEventId;
     }
  }
  
  res.json(updatedReservation);
});

api.post('/location/reservations/:id/sync-google', authMiddleware, async (req, res) => {
  try {
    const reservation = await db.collection('location_reservations').findOne({ id: req.params.id });
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Always call sync function, which will handle updates for existing ones or create new ones
    // We update the bType condition so manual syncs work for the approved types
    const bType = (reservation.booking_type || '').toLowerCase();
    if (bType !== 'client' && bType !== 'livraison') {
      return res.status(400).json({ error: 'Only Client and Livraison reservations can be synced' });
    }

    // Try multiple times with exponential backoff if we hit a network issue
    let googleEventId = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        googleEventId = await syncReservationToCalendar(reservation);
        lastError = null;
        break; // Success!
      } catch (err) {
        lastError = err;
        console.warn(`[GCal Sync] Attempt ${attempt} failed for reservation ${reservation.id}: ${err.message}`);
        if (attempt < 3) {
          // exponential delay: 1000ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    
    if (googleEventId) {
      await db.collection('location_reservations').updateOne(
        { id: req.params.id }, 
        { $set: { google_event_id: googleEventId } }
      );
      
      if (locationCalendarId === 'primary') {
        res.json({ 
          success: true, 
          googleEventId,
          warning: 'Événement créé dans le calendrier interne. Partagez un calendrier nommé "LOCATION" avec le compte de service pour le voir.'
        });
      } else {
        res.json({ success: true, googleEventId });
      }
    } else {
      res.status(500).json({ error: 'La synchronisation Google Calendar a échoué pour une raison inconnue.' });
    }
  } catch (error) {
    console.error('Error in manual Google sync:', error);
    // Format error message to be highly clean and user-friendly in French
    let displayError = error.message || '';
    if (displayError.includes('Premature close') || displayError.includes('fetch failed')) {
      displayError = "Connexion interrompue avec les serveurs de Google. Veuillez réessayer d'ici quelques instants.";
    }
    res.status(500).json({ 
      error: `La synchronisation Google Calendar a échoué. ${displayError}` 
    });
  }
});

api.post('/location/sync-all-google', authMiddleware, async (req, res) => {
  try {
    const reservations = await db.collection('location_reservations').find({}).toArray();

    let successCount = 0;
    for (const resItem of reservations) {
        const googleEventId = await tryAutoSyncToGoogle(resItem);
        if (googleEventId === 'DELETED') {
            await db.collection('location_reservations').updateOne(
                { id: resItem.id },
                { $unset: { google_event_id: "" } }
            );
            successCount++;
        } else if (googleEventId && googleEventId !== resItem.google_event_id) {
            await db.collection('location_reservations').updateOne(
                { id: resItem.id },
                { $set: { google_event_id: googleEventId } }
            );
            successCount++;
        } else if (googleEventId) {
            successCount++; // Was synced, no DB update needed
        }
    }
    
    const responsePayload = { success: true, count: successCount, total: reservations.length };
    if (locationCalendarId === 'primary') {
      responsePayload.warning = 'Les événements ont été créés dans le calendrier interne du compte de service. Partagez un calendrier nommé "LOCATION" avec le compte de service pour les voir.';
    }
    
    res.json(responsePayload);
  } catch (error) {
    console.error('Error in batch Google sync:', error);
    res.status(500).json({ error: error.message || 'Internal server error during batch sync' });
  }
});


// ══════════ DELIVERY WORKFLOW ══════════
api.get('/delivery/pending', authMiddleware, async (req, res) => {
  try {
    // Get already completed deliveries (by quote_id)
    const completedWorkflows = await db.collection('delivery_workflows').find(
      { status: 'completed' }, { projection: { _id: 0, reservation_id: 1, quote_id: 1 } }
    ).toArray();
    const completedQuoteIds = new Set(completedWorkflows.filter(w => w.quote_id).map(w => w.quote_id));
    const completedResIds = new Set(completedWorkflows.filter(w => w.reservation_id).map(w => w.reservation_id));

    // Primary source: Accepted quotes with delivery
    const quotes = await db.collection('location_quotes').find({
      status: 'Accepté',
      is_archived: { $ne: true }
    }, { projection: { _id: 0 } }).toArray();

    const result = [];
    for (const quote of quotes) {
      const quoteId = quote.id || '';
      if (completedQuoteIds.has(quoteId)) continue;

      const deliveryCost = quote.delivery_cost || 0;
      const deliveryZone = quote.delivery_zone || '';
      const deliveryAddress = quote.delivery_address || '';
      const installationCost = quote.installation_cost || 0;
      const installationHours = quote.installation_hours || 0;

      // Skip quotes without any delivery indication
      if (deliveryCost <= 0 && !deliveryZone && !deliveryAddress && installationHours <= 0) continue;

      // Check if there's a completed workflow via reservation
      const reservation = await db.collection('location_reservations').findOne(
        { quote_id: quoteId, status: 'accepted', is_archived: { $ne: true } },
        { projection: { _id: 0 } }
      );
      if (reservation && completedResIds.has(reservation.id)) continue;

      // Get client info
      let client = null;
      const clientId = quote.client_id || '';
      const clientName = quote.client_name || '';
      if (clientId) {
        client = await db.collection('location_clients').findOne(
          { id: clientId }, { projection: { _id: 0, name: 1, company_name: 1, email: 1, phone: 1 } }
        );
      }

      // Resolve equipment names for items
      const rawItems = reservation ? (reservation.equipment_items || []) : (quote.items || []);
      const resolvedItems = [];
      for (const item of rawItems) {
        let eqName = item.equipment_name || item.name || '';
        if (!eqName && item.equipment_id) {
          const eq = await db.collection('location_equipment').findOne({ id: item.equipment_id }, { projection: { _id: 0, name: 1 } });
          eqName = eq ? eq.name : '';
        }
        resolvedItems.push({ ...item, equipment_name: eqName || 'Équipement inconnu' });
      }

      result.push({
        id: reservation ? reservation.id : quoteId,
        client_id: clientId,
        client_name: client ? (client.name || '') : clientName,
        company_name: client ? (client.company_name || '') : '',
        client_email: client ? (client.email || '') : '',
        client_phone: client ? (client.phone || '') : '',
        quote_id: quoteId,
        quote_number: quote.quote_number || '',
        start_date: quote.start_date || (reservation ? reservation.start_date || '' : ''),
        end_date: quote.end_date || (reservation ? reservation.end_date || '' : ''),
        total_amount: quote.total_amount || 0,
        equipment_items: resolvedItems,
        delivery_address: deliveryAddress,
        delivery_cost: deliveryCost,
        delivery_zone: deliveryZone,
        installation_cost: installationCost,
        installation_hours: installationHours,
      });
    }
    res.json(result);
  } catch (e) {
    console.error('Error fetching pending deliveries:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.post('/delivery/workflows', authMiddleware, async (req, res) => {
  try {
    const reservationId = req.body.reservation_id;

    // Check existing workflow
    const existing = await db.collection('delivery_workflows').findOne(
      { reservation_id: reservationId, status: { $ne: 'completed' } },
      { projection: { _id: 0 } }
    );
    if (existing) return res.json(existing);

    // Try to find reservation first, then fall back to quote
    let reservation = await db.collection('location_reservations').findOne({ id: reservationId }, { projection: { _id: 0 } });
    let quote = null;
    let sourceData = null;

    if (reservation) {
      sourceData = reservation;
      if (reservation.quote_id) {
        quote = await db.collection('location_quotes').findOne({ id: reservation.quote_id }, { projection: { _id: 0 } });
      }
    } else {
      // The ID might be a quote ID (when no reservation exists)
      quote = await db.collection('location_quotes').findOne({ id: reservationId }, { projection: { _id: 0 } });
      if (!quote) return res.status(404).json({ detail: 'Réservation ou devis non trouvé' });
      sourceData = quote;
    }

    const equipmentItems = reservation ? (reservation.equipment_items || []) : (quote ? (quote.items || []) : []);
    
    // Resolve equipment names
    const checklist = [];
    for (const item of equipmentItems) {
      let eqName = item.equipment_name || '';
      if (!eqName && item.equipment_id) {
        const eq = await db.collection('location_equipment').findOne({ id: item.equipment_id }, { projection: { _id: 0, name: 1 } });
        eqName = eq ? eq.name : 'Équipement inconnu';
      }
      checklist.push({
        equipment_id: item.equipment_id || '',
        equipment_name: eqName || 'Équipement inconnu',
        quantity: item.quantity || 1,
        checked: false,
      });
    }

    const clientId = sourceData.client_id || (quote ? quote.client_id : '') || '';
    let client = null;
    if (clientId) {
      client = await db.collection('location_clients').findOne(
        { id: clientId }, { projection: { _id: 0, name: 1, email: 1, phone: 1, company_name: 1 } }
      );
    }

    const w = {
      id: uuidv4(),
      reservation_id: reservationId,
      quote_id: quote ? quote.id : (reservation ? reservation.quote_id : '') || '',
      client_id: clientId,
      client_name: client ? (client.name || '') : (quote ? quote.client_name : '') || '',
      client_email: client ? (client.email || '') : '',
      client_phone: client ? (client.phone || '') : '',
      status: 'in_progress',
      current_step: 1,
      checklist: checklist,
      missing_items: [],
      delivery_address: quote ? (quote.delivery_address || '') : '',
      delivery_validated: false,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    await db.collection('delivery_workflows').insertOne(w);
    delete w._id;
    res.json(w);
  } catch (e) {
    console.error('Error creating delivery workflow:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.put('/delivery/workflows/:id', authMiddleware, async (req, res) => {
  await db.collection('delivery_workflows').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('delivery_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.post('/delivery/workflows/:id/complete', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('delivery_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });

    await db.collection('delivery_workflows').updateOne({ id: req.params.id }, { $set: {
      status: 'completed',
      delivery_validated: true,
      completed_at: new Date().toISOString(),
      current_step: 4,
    }});

    // Update reservation status to "delivered"
    if (wf.reservation_id) {
      await db.collection('location_reservations').updateOne(
        { id: wf.reservation_id }, { $set: { status: 'delivered' } }
      );
    }

    res.json({ status: 'completed', message: 'Livraison validée' });
  } catch (e) {
    console.error('Error completing delivery:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ══════════ RENTAL WORKFLOW ══════════
api.get('/rental/settings/withdrawal-email', authMiddleware, async (req, res) => {
  const s = await db.collection('location_settings').findOne({ type: 'withdrawal_email_template' }, { projection: { _id: 0 } });
  res.json(s || { subject: 'Bon de retrait - R\'KEY PROD', body: '<p>Bonjour,</p><p>Veuillez trouver ci-joint votre bon de retrait pour la location du matériel.</p><p>Cordialement,<br/><strong>R\'KEY PROD</strong></p>' });
});
api.post('/rental/settings/withdrawal-email', authMiddleware, async (req, res) => {
  await db.collection('location_settings').updateOne({ type: 'withdrawal_email_template' }, { $set: { type: 'withdrawal_email_template', ...req.body, updated_at: new Date().toISOString() } }, { upsert: true });
  res.json({ message: 'Template saved' });
});
api.get('/rental/settings/return-email', authMiddleware, async (req, res) => {
  const s = await db.collection('location_settings').findOne({ type: 'return_email_template' }, { projection: { _id: 0 } });
  res.json(s || { subject: 'Confirmation de retour matériel - R\'KEY PROD', body: '<p>Bonjour,</p><p>Nous vous confirmons le retour du matériel en bon état.</p><p>Votre caution sera restituée dans les meilleurs délais.</p><p>Merci pour votre confiance.</p><p>Cordialement,<br/>R\'KEY PROD</p>' });
});
api.post('/rental/settings/return-email', authMiddleware, async (req, res) => {
  await db.collection('location_settings').updateOne({ type: 'return_email_template' }, { $set: { type: 'return_email_template', ...req.body, updated_at: new Date().toISOString() } }, { upsert: true });
  res.json({ message: 'Template saved' });
});

api.get('/rental/withdrawals', authMiddleware, async (req, res) => {
  try {
    // Check which ones already have a completed withdrawal workflow
    const completedWithdrawals = await db.collection('rental_workflows').find(
      { type: 'withdrawal', status: 'completed' }, { projection: { _id: 0, reservation_id: 1 } }
    ).toArray();
    const completedWithdrawalIds = new Set(completedWithdrawals.map(w => w.reservation_id));

    const result = [];
    const seenIds = new Set();

    // Source 1: Reservations with status 'accepted'
    const reservations = await db.collection('location_reservations').find({
      status: { $in: ['accepted', 'Accepted', 'acceptée', 'Acceptée', 'active', 'Active'] },
      booking_type: { $nin: ['dj', 'DJ'] },
      is_archived: { $ne: true }
    }, { projection: { _id: 0 } }).toArray();

    for (const r of reservations) {
      if (completedWithdrawalIds.has(r.id)) continue;
      seenIds.add(r.id);
      if (r.quote_id) seenIds.add(r.quote_id);

      let client = null;
      if (r.client_id) {
        client = await db.collection('location_clients').findOne(
          { id: r.client_id }, { projection: { _id: 0, name: 1, company_name: 1, email: 1, phone: 1 } }
        );
      }
      const quote = await db.collection('location_quotes').findOne(
        { id: r.quote_id }, { projection: { _id: 0, quote_number: 1, total_amount: 1 } }
      );

      result.push({
        id: r.id,
        client_id: r.client_id || '',
        client_name: client ? (client.name || '') : (r.client_name || ''),
        company_name: client ? (client.company_name || '') : '',
        client_email: client ? (client.email || '') : '',
        client_phone: client ? (client.phone || '') : '',
        quote_id: r.quote_id || '',
        quote_number: quote ? (quote.quote_number || '') : '',
        start_date: r.start_date || '',
        end_date: r.end_date || '',
        total_amount: r.total_amount || (quote ? quote.total_amount : 0) || 0,
        equipment_items: r.equipment_items || [],
        deposit_amount: r.deposit_amount || 0,
        delivery_cost: r.delivery_cost || 0,
      });
    }

    // Source 2: Accepted quotes without reservation
    const acceptedQuotes = await db.collection('location_quotes').find({
      status: { $in: ['Accepté', 'accepté', 'Accepted', 'accepted', 'Valide', 'valide'] },
      is_archived: { $ne: true }
    }, { projection: { _id: 0 } }).toArray();

    for (const q of acceptedQuotes) {
      if (seenIds.has(q.id)) continue;
      if (completedWithdrawalIds.has(q.id)) continue;

      let client = null;
      if (q.client_id) {
        client = await db.collection('location_clients').findOne(
          { id: q.client_id }, { projection: { _id: 0, name: 1, company_name: 1, email: 1, phone: 1 } }
        );
      }

      result.push({
        id: q.id,
        client_id: q.client_id || '',
        client_name: client ? (client.name || '') : (q.client_name || ''),
        company_name: client ? (client.company_name || '') : '',
        client_email: client ? (client.email || '') : '',
        client_phone: client ? (client.phone || '') : '',
        quote_id: q.id,
        quote_number: q.quote_number || '',
        start_date: q.start_date || '',
        end_date: q.end_date || '',
        total_amount: q.total_amount || 0,
        equipment_items: q.items || [],
        deposit_amount: q.deposit_amount || 0,
        delivery_cost: q.delivery_cost || 0,
      });
    }

    res.json(result);
  } catch (e) {
    console.error('Error fetching withdrawal reservations:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/rental/withdrawals/:reservationId', authMiddleware, async (req, res) => {
  try {
    let reservation = await db.collection('location_reservations').findOne({ id: req.params.reservationId }, { projection: { _id: 0 } });
    let quote = null;
    let client = null;

    if (reservation) {
      if (reservation.client_id) {
        client = await db.collection('location_clients').findOne({ id: reservation.client_id }, { projection: { _id: 0 } });
      }
      if (reservation.quote_id) {
        quote = await db.collection('location_quotes').findOne({ id: reservation.quote_id }, { projection: { _id: 0 } });
      }
    } else {
      // Fallback: the ID might be a quote ID
      quote = await db.collection('location_quotes').findOne({ id: req.params.reservationId }, { projection: { _id: 0 } });
      if (!quote) return res.status(404).json({ detail: 'Réservation ou devis non trouvé' });
      // Build a virtual reservation from the quote
      reservation = {
        id: quote.id,
        quote_id: quote.id,
        client_id: quote.client_id || '',
        client_name: quote.client_name || '',
        start_date: quote.start_date || '',
        end_date: quote.end_date || '',
        equipment_items: quote.items || [],
        total_amount: quote.total_amount || 0,
        deposit_amount: quote.deposit_amount || 0,
      };
      if (quote.client_id) {
        client = await db.collection('location_clients').findOne({ id: quote.client_id }, { projection: { _id: 0 } });
      }
    }

    const workflow = await db.collection('rental_workflows').findOne(
      { reservation_id: req.params.reservationId, type: 'withdrawal' }, { projection: { _id: 0 } }
    );
    const available_equipment = await db.collection('location_equipment').find(
      { maintenance_status: { $ne: 'maintenance' } },
      { projection: { _id: 0, id: 1, name: 1, daily_price: 1, category: 1, quantity: 1 } }
    ).toArray();

    res.json({ reservation, client, quote, workflow, available_equipment });
  } catch (e) {
    console.error('Error fetching withdrawal details:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/rental/workflows', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('rental_workflows').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.post('/rental/workflows', authMiddleware, async (req, res) => {
  try {
    const reservationId = req.body.reservation_id;
    const wfType = req.body.type || 'withdrawal';

    // Check if a workflow already exists
    const existing = await db.collection('rental_workflows').findOne(
      { reservation_id: reservationId, type: wfType, status: { $ne: 'completed' } },
      { projection: { _id: 0 } }
    );
    if (existing) return res.json(existing);

    // Build checklist from reservation or quote items
    let reservation = await db.collection('location_reservations').findOne({ id: reservationId }, { projection: { _id: 0 } });
    let quote = null;

    if (!reservation) {
      // Fallback: ID might be a quote ID
      quote = await db.collection('location_quotes').findOne({ id: reservationId }, { projection: { _id: 0 } });
      if (!quote) return res.status(404).json({ detail: 'Réservation ou devis non trouvé' });
      reservation = {
        id: quote.id,
        quote_id: quote.id,
        client_id: quote.client_id || '',
        client_name: quote.client_name || '',
        equipment_items: quote.items || [],
        deposit_amount: quote.deposit_amount || 0,
      };
    }

    const equipmentItems = reservation.equipment_items || [];
    const checklist = [];
    for (const item of equipmentItems) {
      let eqName = item.equipment_name || '';
      if (!eqName && item.equipment_id) {
        const eq = await db.collection('location_equipment').findOne({ id: item.equipment_id }, { projection: { _id: 0, name: 1 } });
        eqName = eq ? eq.name : 'Équipement inconnu';
      }
      checklist.push({
        equipment_id: item.equipment_id || '',
        equipment_name: eqName || 'Équipement inconnu',
        quantity: item.quantity || 1,
        checked: false,
      });
    }

    // Get quote for deposit
    let depositAmount = 0;
    if (!quote && reservation.quote_id) {
      quote = await db.collection('location_quotes').findOne({ id: reservation.quote_id }, { projection: { _id: 0 } });
    }
    if (quote) depositAmount = quote.guarantee_amount || quote.deposit_amount || 0;
    if (!depositAmount && reservation.deposit_amount) depositAmount = reservation.deposit_amount;

    const w = {
      id: uuidv4(),
      reservation_id: reservationId,
      quote_id: reservation.quote_id || '',
      client_id: reservation.client_id || '',
      client_name: reservation.client_name || '',
      type: wfType,
      status: 'in_progress',
      current_step: 1,
      checklist: checklist,
      added_items: [],
      equipment_photos: [],
      identity_recto: null,
      identity_verso: null,
      material_test_confirmed: false,
      deposit_method: null,
      deposit_amount: depositAmount,
      signature_material: null,
      signature_cgv: null,
      email_sent: false,
      secure_link_token: uuidv4(),
      return_checklist: wfType === 'return' ? checklist : [],
      return_signature: null,
      return_date: null,
      dispute_items: [],
      dispute_notes: '',
      deposit_returned: false,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    await db.collection('rental_workflows').insertOne(w);
    delete w._id;
    res.json(w);
  } catch (e) {
    console.error('Error creating workflow:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/rental/workflows/:id', authMiddleware, async (req, res) => {
  const w = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!w) return res.status(404).json({ detail: 'Not found' });
  res.json(w);
});
api.put('/rental/workflows/:id', authMiddleware, async (req, res) => {
  await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.patch('/rental/workflows/:id', authMiddleware, async (req, res) => {
  await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.get('/rental/dossier-by-reservation/:reservationId', authMiddleware, async (req, res) => {
  const reservation = await db.collection('location_reservations').findOne(
    { id: req.params.reservationId }, { projection: { _id: 0 } }
  );

  if (reservation) {
    let quote = null;
    if (reservation.quote_id) {
      quote = await db.collection('location_quotes').findOne({ id: reservation.quote_id });
    }

    if (quote) {
      reservation.quote_number = quote.quote_number;
      reservation.quote_documents = quote.documents || [];
    } else {
      reservation.quote_documents = [];
    }

    let items = reservation.equipment_items || [];
    if (items.length === 0 && quote && Array.isArray(quote.items)) {
      items = quote.items;
    }
    
    if (Array.isArray(items) && items.length > 0) {
      const equipmentIds = items.map(item => item.equipment_id).filter(Boolean);
      if (equipmentIds.length > 0) {
        const equipments = await db.collection('location_equipment').find(
          { id: { $in: equipmentIds } },
          { projection: { id: 1, name: 1, reference: 1 } }
        ).toArray();
        const equipmentMap = {};
        equipments.forEach(eq => {
          equipmentMap[eq.id] = eq;
        });
        reservation.equipment_items = items.map(item => {
          const eq = equipmentMap[item.equipment_id];
          return {
            ...item,
            name: item.name || item.equipment_name || (eq ? eq.name : 'Matériel inconnu'),
            reference: item.reference || (eq ? eq.reference : '')
          };
        });
      }
    }
  }

  const rentalWfs = await db.collection('rental_workflows').find(
    { reservation_id: req.params.reservationId }, { projection: { _id: 0 } }
  ).toArray();
  const deliveryWfs = await db.collection('delivery_workflows').find(
    { reservation_id: req.params.reservationId }, { projection: { _id: 0 } }
  ).toArray();
  res.json({ reservation, rental_workflows: rentalWfs, delivery_workflows: deliveryWfs });
});
api.delete('/rental/workflows/:id/photo/:photoIndex', authMiddleware, async (req, res) => {
  try {
    const w = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 1 } });
    if (!w) return res.status(404).json({ detail: 'Workflow not found' });
    const photos = w.equipment_photos || [];
    const idx = parseInt(req.params.photoIndex);
    if (idx < 0 || idx >= photos.length) return res.status(400).json({ detail: 'Invalid photo index' });
    photos.splice(idx, 1);
    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: { equipment_photos: photos } });
    res.json({ status: 'deleted', remaining: photos.length });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});
api.delete('/rental/workflows/:id/identity/:side', authMiddleware, async (req, res) => {
  const update = {}; update[`identity_${req.params.side}`] = null;
  await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: update });
  res.json({ success: true });
});
api.post('/rental/workflows/:id/add-item', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });

    const equipmentId = req.body.equipment_id;
    const quantity = req.body.quantity || 1;

    const equipment = await db.collection('location_equipment').findOne({ id: equipmentId }, { projection: { _id: 0 } });
    if (!equipment) return res.status(404).json({ detail: 'Equipment not found' });

    const newItem = { equipment_id: equipmentId, equipment_name: equipment.name || '', quantity, daily_price: equipment.daily_price || 0 };
    const checklistItem = { equipment_id: equipmentId, equipment_name: equipment.name || '', quantity, checked: true };

    await db.collection('rental_workflows').updateOne(
      { id: req.params.id },
      { $push: { added_items: newItem, checklist: checklistItem } }
    );

    // Also update the source quote
    if (wf.quote_id) {
      const quote = await db.collection('location_quotes').findOne({ id: wf.quote_id }, { projection: { _id: 0 } });
      if (quote) {
        const days = quote.total_days || 1;
        const coef = quote.degression_coefficient || 1.0;
        const itemTotal = (equipment.daily_price || 0) * quantity * coef;
        const newQuoteItem = { equipment_id: equipmentId, equipment_name: equipment.name || '', quantity, daily_price: equipment.daily_price || 0, total_price: itemTotal, total_days: days };
        const newSubtotal = (quote.subtotal || 0) + itemTotal;
        const discountPct = quote.discount_percent || 0;
        const discountAmt = quote.discount_amount || 0;
        const discount = discountAmt > 0 ? discountAmt : (newSubtotal * discountPct / 100);
        const delivery = quote.delivery_cost || 0;
        const install = quote.installation_cost || 0;
        const newTotal = newSubtotal - discount + delivery + install;

        await db.collection('location_quotes').updateOne({ id: wf.quote_id }, {
          $push: { items: newQuoteItem },
          $set: { subtotal: newSubtotal, total_amount: newTotal }
        });

        if (wf.reservation_id) {
          const resItem = { equipment_id: equipmentId, equipment_name: equipment.name || '', quantity, daily_price: equipment.daily_price || 0, total_days: days, subtotal: itemTotal };
          await db.collection('location_reservations').updateOne({ id: wf.reservation_id }, {
            $push: { equipment_items: resItem },
            $set: { total_amount: newTotal }
          });
        }
      }
    }

    const updated = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    res.json(updated);
  } catch (e) {
    console.error('Error adding item:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.post('/rental/workflows/:id/photos', authMiddleware, async (req, res) => {
  try {
    const photos = req.body.photos || [];
    if (!photos.length) return res.status(400).json({ detail: 'No photos provided' });
    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $push: { equipment_photos: { $each: photos } } });
    const updated = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 0 } });
    const photoDoc = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 1 } });
    updated.photo_count = (photoDoc.equipment_photos || []).length;
    res.json(updated);
  } catch (e) { res.status(500).json({ detail: e.message }); }
});
api.get('/rental/workflows/:id/photos', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 1 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });
    res.json({ photos: wf.equipment_photos || [] });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});
api.get('/rental/withdrawal-photos/:reservationId', authMiddleware, async (req, res) => {
  try {
    const withdrawal = await db.collection('rental_workflows').findOne(
      { reservation_id: req.params.reservationId, type: 'withdrawal' },
      { projection: { _id: 0, equipment_photos: 1 } }
    );
    res.json({ photos: withdrawal ? (withdrawal.equipment_photos || []) : [] });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});
api.post('/rental/workflows/:id/identity', authMiddleware, async (req, res) => {
  const update = {};
  if (req.body.recto) update.identity_recto = req.body.recto;
  if (req.body.verso) update.identity_verso = req.body.verso;
  await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: update });
  res.json(await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.post('/rental/workflows/:id/send-email', authMiddleware, async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    const transporter = createTransporter(cfg);
    const { to, cc, subject, body: html, pdf_base64, pdf_filename } = req.body;
    const attachments = pdf_base64 ? [{ filename: pdf_filename || 'document.pdf', content: Buffer.from(pdf_base64, 'base64'), contentType: 'application/pdf' }] : [];
    await transporter.sendMail({ from: `${cfg.smtp_from_name} Loc' <${cfg.smtp_from}>`, to, cc: cc || undefined, subject, html, attachments });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ detail: `Erreur SMTP: ${e.message}` }); }
});
api.post('/rental/workflows/:id/complete', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });

    const update = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_step: 7,
    };
    if (req.body.signature_material) update.signature_material = req.body.signature_material;
    if (req.body.signature_cgv) update.signature_cgv = req.body.signature_cgv;

    // Update reservation status to reflect withdrawal done
    await db.collection('location_reservations').updateOne(
      { id: wf.reservation_id }, { $set: { status: 'equipment_withdrawn' } }
    );

    // Send email if provided
    if (req.body.email) {
      try {
        const cfg = await getSmtpConfig();
        const transporter = createTransporter(cfg);
        const ed = req.body.email;
        const attachments = ed.pdf_base64 ? [{ filename: ed.pdf_filename || 'bon_de_retrait.pdf', content: Buffer.from(ed.pdf_base64, 'base64'), contentType: 'application/pdf' }] : [];
        await transporter.sendMail({ from: `${cfg.smtp_from_name} Loc' <${cfg.smtp_from}>`, to: ed.to, cc: ed.cc || undefined, subject: ed.subject, html: ed.body, attachments });
        update.email_sent = true;
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
        update.email_sent = false;
      }
    }

    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: update });
    const updated = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 0, identity_recto: 0, identity_verso: 0 } });
    res.json(updated);
  } catch (e) {
    console.error('Error completing withdrawal:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/rental/returns', authMiddleware, async (req, res) => {
  try {
    const reservations = await db.collection('location_reservations').find({
      status: { $in: ['equipment_withdrawn', 'withdrawn', 'delivered', 'delivered_active', 'Matériel retiré', 'Livré', 'equipment_returned', 'returned'] },
      booking_type: { $nin: ['dj', 'DJ'] },
      is_archived: { $ne: true }
    }, { projection: { _id: 0 } }).toArray();

    const result = [];
    for (const r of reservations) {
      let client = null;
      if (r.client_id) {
        client = await db.collection('location_clients').findOne(
          { id: r.client_id }, { projection: { _id: 0, name: 1, company_name: 1 } }
        );
      }
      const quote = await db.collection('location_quotes').findOne(
        { id: r.quote_id }, { projection: { _id: 0, quote_number: 1 } }
      );
      const withdrawalWf = await db.collection('rental_workflows').findOne(
        { reservation_id: r.id, type: 'withdrawal', status: 'completed' },
        { projection: { _id: 0, deposit_method: 1, deposit_amount: 1 } }
      );

      result.push({
        id: r.id,
        client_id: r.client_id || '',
        client_name: client ? (client.name || '') : (r.client_name || ''),
        company_name: client ? (client.company_name || '') : '',
        quote_id: r.quote_id || '',
        quote_number: quote ? (quote.quote_number || '') : '',
        start_date: r.start_date || '',
        end_date: r.end_date || '',
        total_amount: r.total_amount || 0,
        equipment_items: r.equipment_items || [],
        deposit_method: withdrawalWf ? withdrawalWf.deposit_method : null,
        deposit_amount: withdrawalWf ? (withdrawalWf.deposit_amount || 0) : 0,
      });
    }
    res.json(result);
  } catch (e) {
    console.error('Error fetching return reservations:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.post('/rental/returns/:id/complete', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });

    const returnChecklist = req.body.return_checklist || [];
    const allReturned = returnChecklist.length === 0 || returnChecklist.every(item => item.checked);

    const update = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      return_date: new Date().toISOString(),
      returned_by: req.body.returned_by || '',
      deposit_returned: allReturned,
    };
    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: update });

    // Update reservation status to returned
    await db.collection('location_reservations').updateOne(
      { id: wf.reservation_id }, { $set: { status: 'returned' } }
    );

    // Archive reservation and linked quote
    const nowIso = new Date().toISOString();
    await db.collection('location_reservations').updateOne(
      { id: wf.reservation_id },
      { $set: { is_archived: true, archived_at: nowIso, status: 'returned' } }
    );
    const reservation = await db.collection('location_reservations').findOne({ id: wf.reservation_id }, { projection: { _id: 0, quote_id: 1 } });
    if (reservation && reservation.quote_id) {
      await db.collection('location_quotes').updateOne(
        { id: reservation.quote_id }, { $set: { is_archived: true, archived_at: nowIso } }
      );
    }

    // RGPD: Delete identity photos from withdrawal workflow
    const withdrawalWf = await db.collection('rental_workflows').findOne(
      { reservation_id: wf.reservation_id, type: 'withdrawal' }, { projection: { _id: 0, id: 1 } }
    );
    if (withdrawalWf) {
      const wfUpdate = { identity_recto: null, identity_verso: null, is_archived: true };
      if (allReturned) wfUpdate.deposit_returned = true;
      await db.collection('rental_workflows').updateOne({ id: withdrawalWf.id }, { $set: wfUpdate });
    }

    // Send return email if provided
    if (req.body.email) {
      try {
        const cfg = await getSmtpConfig();
        const transporter = createTransporter(cfg);
        const ed = req.body.email;
        const attachments = ed.pdf_base64 ? [{ filename: ed.pdf_filename || 'retour.pdf', content: Buffer.from(ed.pdf_base64, 'base64'), contentType: 'application/pdf' }] : [];
        await transporter.sendMail({ from: `${cfg.smtp_from_name} Loc' <${cfg.smtp_from}>`, to: ed.to, cc: ed.cc || undefined, subject: ed.subject, html: ed.body, attachments });
      } catch (emailErr) { console.error('Return email send failed:', emailErr); }
    }

    res.json({ status: 'completed', message: 'Retour validé. Réservation archivée automatiquement.' });
  } catch (e) {
    console.error('Error completing return:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.post('/rental/returns/:id/dispute', authMiddleware, async (req, res) => {
  try {
    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!wf) return res.status(404).json({ detail: 'Workflow not found' });

    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: {
      status: 'dispute',
      dispute_items: req.body.dispute_items || [],
      dispute_notes: req.body.dispute_notes || '',
      deposit_returned: false,
    }});

    // Update reservation status
    await db.collection('location_reservations').updateOne(
      { id: wf.reservation_id }, { $set: { status: 'dispute' } }
    );

    const updated = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, equipment_photos: 0, identity_recto: 0, identity_verso: 0 } });
    res.json(updated);
  } catch (e) {
    console.error('Error flagging dispute:', e);
    res.status(500).json({ detail: e.message });
  }
});
api.get('/rental/disputes', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('rental_workflows').find({ status: 'dispute' }, { projection: { _id: 0 } }).toArray()));
});
api.post('/rental/disputes/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const depositReturned = req.body.deposit_returned || false;
    const notes = req.body.notes || '';

    await db.collection('rental_workflows').updateOne({ id: req.params.id }, { $set: {
      status: 'completed',
      deposit_returned: depositReturned,
      dispute_notes: notes,
      completed_at: new Date().toISOString(),
    }});

    const wf = await db.collection('rental_workflows').findOne({ id: req.params.id }, { projection: { _id: 0, reservation_id: 1 } });
    if (wf) {
      await db.collection('location_reservations').updateOne(
        { id: wf.reservation_id }, { $set: { status: 'returned' } }
      );
      // RGPD cleanup
      const withdrawalWf = await db.collection('rental_workflows').findOne(
        { reservation_id: wf.reservation_id, type: 'withdrawal' }, { projection: { _id: 0, id: 1 } }
      );
      if (withdrawalWf) {
        await db.collection('rental_workflows').updateOne(
          { id: withdrawalWf.id }, { $set: { identity_recto: null, identity_verso: null, equipment_photos: [] } }
        );
      }
    }
    res.json({ status: 'resolved' });
  } catch (e) {
    console.error('Error resolving dispute:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ══════════ DEVIS PAGES ══════════
api.get('/devis2/pages', authMiddleware, async (req, res) => {
  const pages = await db.collection('devis2_pages').find({}, { projection: { _id: 0, image_data: 0 } }).sort({ order: 1, sort_order: 1, created_at: 1 }).toArray();
  // Add has_image flag
  const pagesWithFlag = pages.map(p => ({ ...p, has_image: true }));
  res.json({ pages: cleanList(pagesWithFlag) });
});
api.get('/devis2/pages/:id/preview', authMiddleware, async (req, res) => {
  const p = await db.collection('devis2_pages').findOne({ id: req.params.id });
  if (!p) return res.status(404).json({ detail: 'Not found' });
  
  let image_base64 = p.image_data || '';
  if (p.gcs_path && bucket && !image_base64) {
    try {
      const file = bucket.file(p.gcs_path);
      const [buffer] = await file.download();
      image_base64 = buffer.toString('base64');
    } catch (err) {
      console.error('Error downloading preview from GCS:', err);
    }
  }
  
  res.json({ success: true, image_base64, filename: p.filename, label: p.label });
});
api.put('/devis2/pages/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_pages').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('devis2_pages').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/devis2/pages/:id', authMiddleware, async (req, res) => {
  const p = await db.collection('devis2_pages').findOne({ id: req.params.id });
  if (p && p.gcs_path && bucket) {
    try {
      await bucket.file(p.gcs_path).delete();
    } catch (err) {
      console.warn('Could not delete file from GCS:', err);
    }
  }
  await db.collection('devis2_pages').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/devis2/pages/reorder', authMiddleware, async (req, res) => {
  try {
    if (req.body.page_ids && Array.isArray(req.body.page_ids)) {
      for (let i = 0; i < req.body.page_ids.length; i++) {
        const id = req.body.page_ids[i];
        await db.collection('devis2_pages').updateOne(
          { id },
          { $set: { sort_order: i, order: i } }
        );
      }
    } else if (req.body.pages && Array.isArray(req.body.pages)) {
      for (const item of req.body.pages) {
        await db.collection('devis2_pages').updateOne(
          { id: item.id },
          { $set: { sort_order: item.sort_order, order: item.sort_order } }
        );
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering devis pages:', error);
    res.status(500).json({ detail: error.message });
  }
});
api.post('/devis2/pages/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file' });
  try {
    const { label, category, is_tarif } = req.body;
    const pageId = uuidv4();
    const filename = decodeMulterFilename(req.file.originalname);
    
    let gcsPath = '';
    
    if (bucket) {
      const ext = path.extname(filename) || '';
      gcsPath = `devis-pages/${pageId}${ext}`;
      const file = bucket.file(gcsPath);
      try {
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype },
        });
        console.log(`Saved page to GCS: ${gcsPath}`);
      } catch (uploadErr) {
        console.error('Failed to upload to GCS, falling back to local DB:', uploadErr.message || uploadErr);
        gcsPath = ''; // Clear gcsPath so it falls back to MongoDB
      }
    }

    const page = { 
      id: pageId, 
      label: label || filename,
      category: category || 'artiste',
      is_tarif: is_tarif === 'true' || is_tarif === true,
      filename: filename,
      mimetype: req.file.mimetype,
      gcs_path: gcsPath,
      created_at: new Date().toISOString() 
    };
    
    // Fallback if GCS is not configured or if upload failed
    if (!getGcsBucket() || !gcsPath) {
      page.image_data = req.file.buffer.toString('base64');
    }

    await db.collection('devis2_pages').insertOne(page);
    
    // Don't send huge image_data back to client
    const responsePage = { ...page };
    delete responsePage.image_data;
    
    res.json({ success: true, ...clean(responsePage) });
  } catch (error) {
    console.error('Error uploading devis2 page:', error);
    res.status(500).json({ success: false, detail: 'Erreur lors de l\'enregistrement de la page' });
  }
});
api.post('/devis2/pages/migrate-to-gcs', authMiddleware, async (req, res) => {
  if (!getGcsBucket()) {
    return res.status(500).json({ detail: 'GCS bucket is not initialized' });
  }

  try {
    const pages = await db.collection('devis2_pages').find({ image_data: { $exists: true, $ne: '' } }).toArray();
    if (pages.length === 0) {
      return res.json({ success: true, migrated: 0, errors: 0, total: 0, message: "Toutes les pages ont déjà été migrées." });
    }
    
    let migrated = 0;
    let errors = 0;

    for (const page of pages) {
      try {
        const ext = require('path').extname(page.filename || '') || '.png';
        const gcsPath = `devis-pages/${page.id}${ext}`;
        const file = bucket.file(gcsPath);
        
        const buffer = Buffer.from(page.image_data, 'base64');
        
        await file.save(buffer, {
          metadata: { contentType: page.mimetype || 'image/png' }
        });
        
        await db.collection('devis2_pages').updateOne(
          { id: page.id },
          { 
            $set: { gcs_path: gcsPath },
            $unset: { image_data: "" }
          }
        );
        migrated++;
        console.log(`Migrated page ${page.id} to GCS`);
      } catch (err) {
        console.error(`Error migrating page ${page.id}:`, err);
        errors++;
      }
    }

    res.json({ success: true, migrated, errors, total: pages.length });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ detail: 'Migration failed' });
  }
});
api.delete('/devis2/pages/orphaned', authMiddleware, (req, res) => res.json({ removed: 0 }));

// DEVIS PDF & SENT
api.post('/devis2/generate-pdf', authMiddleware, async (req, res) => {
  try {
    const { selected_pages, price_amount, price_type, end_time, unlimited_time } = req.body;
    if (!selected_pages || !selected_pages.length) return res.status(400).json({ detail: 'Aucune page sélectionnée' });

    const pdfDoc = await PDFDocument.create();
    let gcsErrorsCount = 0;
    let lastGcsError = '';

    for (const pageId of selected_pages) {
      let page = await db.collection('devis2_pages').findOne({ id: pageId });
      if (!page) page = await db.collection('devis2_pages').findOne({ key: pageId });
      if (!page) continue;

      let imgBytes = null;
      if (page.gcs_path && bucket) {
        try {
          const file = bucket.file(page.gcs_path);
          const [buffer] = await file.download();
          imgBytes = buffer;
        } catch (err) {
          console.error(`Failed to download ${page.gcs_path} from GCS:`, err);
          gcsErrorsCount++;
          lastGcsError = err.message;
          // Robust fallback to image_data if available in the database
          if (page.image_data) {
            imgBytes = Buffer.from(page.image_data, 'base64');
          }
        }
      } else if (page.image_data) {
        imgBytes = Buffer.from(page.image_data, 'base64');
      }

      if (!imgBytes) {
        continue;
      }

      // Apply price overlay on tarif page (like production: white Poppins text at y=630)
      const labelLower = (page.label || '').toLowerCase();
      const isTarifPage = page.is_tarif || labelLower.includes('tarif') || labelLower.includes('horaire');
      
      if (isTarifPage && price_amount) {
        try { imgBytes = await addPriceToTarifImage(imgBytes, price_amount, price_type, end_time, unlimited_time); }
        catch (e) { console.error('Price overlay error:', e.message); }
      }

      const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50;
      let img;
      try { img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes); }
      catch { try { img = await pdfDoc.embedJpg(imgBytes); } catch { continue; } }

      const pdfPage = pdfDoc.addPage([img.width, img.height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }

    if (pdfDoc.getPageCount() === 0) {
      if (gcsErrorsCount > 0) {
        const isPermission = lastGcsError.toLowerCase().includes('permission') || 
                             lastGcsError.toLowerCase().includes('denied') || 
                             lastGcsError.toLowerCase().includes('access') ||
                             lastGcsError.toLowerCase().includes('forbidden');
        if (isPermission) {
          return res.status(400).json({ 
            detail: `Erreur d'autorisation Google Cloud Storage : Votre compte de service (agenda-bot@booking-pro-sync.iam.gserviceaccount.com) n'a pas accès au bucket "rkey-prod-storage-01". Veuillez ajouter le rôle "Administrateur des objets de stockage" (Storage Object Admin) à ce compte de service sur GCP.` 
          });
        }
        return res.status(400).json({ detail: `Erreur de téléchargement des pages depuis Google Cloud Storage : ${lastGcsError}` });
      }
      return res.status(400).json({ detail: 'Aucune page valide trouvée' });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    res.json({ success: true, pdf_base64: pdfBase64, filename: `Devis_RKey_Prod_${new Date().toISOString().slice(0,10)}.pdf` });
  } catch (e) { console.error('PDF generation error:', e); res.status(500).json({ detail: `Erreur PDF: ${e.message}` }); }
});
api.post('/devis2/send-email', authMiddleware, async (req, res) => {
  try {
    const { selected_pages, price_amount, price_type, end_time, unlimited_time, event_date, recipient_email, email_subject, email_body } = req.body;
    if (!selected_pages || !selected_pages.length) return res.status(400).json({ detail: 'Aucune page sélectionnée' });
    if (!recipient_email) return res.status(400).json({ detail: 'Email destinataire manquant' });

    // 1. Generate PDF (same logic as generate-pdf endpoint)
    const pdfDoc = await PDFDocument.create();
    for (const pageId of selected_pages) {
      let page = await db.collection('devis2_pages').findOne({ id: pageId });
      if (!page) page = await db.collection('devis2_pages').findOne({ key: pageId });
      if (!page || (!page.image_data && !page.gcs_path)) continue;
      
      let imgBytes = null;
      if (page.gcs_path && bucket) {
        try {
          const file = bucket.file(page.gcs_path);
          const [buffer] = await file.download();
          imgBytes = buffer;
        } catch (err) {
          console.error(`Failed to download ${page.gcs_path} from GCS:`, err);
          continue;
        }
      } else if (page.image_data) {
        imgBytes = Buffer.from(page.image_data, 'base64');
      } else {
        continue;
      }
      
      const labelLower = (page.label || '').toLowerCase();
      const isTarifPage = page.is_tarif || labelLower.includes('tarif') || labelLower.includes('horaire');

      if (isTarifPage && price_amount) {
        try { imgBytes = await addPriceToTarifImage(imgBytes, price_amount, price_type, end_time, unlimited_time); } catch (e) { console.error('Price overlay:', e.message); }
      }
      const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50;
      let img;
      try { img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes); }
      catch { try { img = await pdfDoc.embedJpg(imgBytes); } catch { continue; } }
      const pdfPage = pdfDoc.addPage([img.width, img.height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    if (pdfDoc.getPageCount() === 0) return res.status(400).json({ detail: 'Aucune page valide' });
    const pdfBytes = await pdfDoc.save();

    // 2. Send email with PDF attachment
    const cfg = await getSmtpConfig();
    const transporter = createTransporter(cfg);
    const pdfFilename = `Devis_RkeyProd_${event_date || new Date().toISOString().slice(0,10)}.pdf`;
    const htmlBody = `<html><head><style>body { font-family: Arial, sans-serif; line-height: 1.6; }</style></head><body>${email_body || ''}</body></html>`;

    const pdfBuffer = Buffer.from(pdfBytes);
    console.log(`PDF generated: ${pdfBuffer.length} bytes, ${pdfDoc.getPageCount()} pages`);

    await transporter.sendMail({
      from: `${cfg.smtp_from_name} <${cfg.smtp_from}>`,
      to: recipient_email,
      cc: cfg.smtp_from,
      subject: email_subject || 'Devis R\'Key Prod',
      html: htmlBody,
      attachments: [{
        filename: pdfFilename,
        content: pdfBuffer.toString('base64'),
        encoding: 'base64',
        contentType: 'application/pdf',
        contentDisposition: 'attachment'
      }]
    });

    // 3. Save to devis2_sent collection (track sent quotes)
    const sentQuote = {
      id: uuidv4(), recipient_email, price_amount, price_type, event_date,
      sent_at: new Date().toISOString(), status: 'en_attente', notes: '', relances: [],
      selected_pages, email_subject
    };
    await db.collection('devis2_sent').insertOne(sentQuote);

    res.json({ success: true, message: `Devis envoyé à ${recipient_email}` });
  } catch (e) { console.error('Send email error:', e); res.status(500).json({ detail: `Erreur envoi: ${e.message}` }); }
});
api.get('/devis2/templates', authMiddleware, async (req, res) => {
  res.json({ templates: cleanList(await db.collection('devis2_templates').find({}, { projection: { _id: 0 } }).toArray()) });
});
api.post('/devis2/templates', authMiddleware, async (req, res) => {
  const t = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('devis2_templates').insertOne(t);
  res.json(clean(t));
});
api.put('/devis2/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_templates').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('devis2_templates').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/devis2/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_templates').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/devis2/sent', authMiddleware, async (req, res) => {
  res.json({ quotes: cleanList(await db.collection('devis2_sent').find({}, { projection: { _id: 0 } }).sort({ sent_at: -1 }).toArray()) });
});
api.post('/devis2/sent', authMiddleware, async (req, res) => {
  const s = { id: uuidv4(), ...req.body, sent_at: new Date().toISOString() };
  await db.collection('devis2_sent').insertOne(s);
  res.json(clean(s));
});
api.put('/devis2/sent/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_sent').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('devis2_sent').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.post('/devis2/sent/manual', authMiddleware, async (req, res) => {
  const s = { id: uuidv4(), ...req.body, sent_at: new Date().toISOString(), manual: true };
  await db.collection('devis2_sent').insertOne(s);
  res.json({ success: true, quote: clean(s) });
});
api.get('/devis2/sent/:id/file', authMiddleware, async (req, res) => {
  const s = await db.collection('devis2_sent').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!s || !s.pdf_data) return res.status(404).json({ detail: 'Not found' });
  res.json({ pdf_data: s.pdf_data });
});
api.post('/devis2/sent/:id/relances', authMiddleware, async (req, res) => {
  const relance = { ...req.body, date: new Date().toISOString() };
  await db.collection('devis2_sent').updateOne({ id: req.params.id }, { $push: { relances: relance } });
  res.json({ success: true, relance });
});
api.delete('/devis2/sent/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_sent').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ══════════ RENTAL QUOTE EMAILS ══════════
api.get('/rental-quote-emails/templates', authMiddleware, async (req, res) => {
  res.json({ templates: cleanList(await db.collection('rental_quote_email_templates').find({}, { projection: { _id: 0 } }).toArray()) });
});
api.post('/rental-quote-emails/templates', authMiddleware, async (req, res) => {
  const t = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('rental_quote_email_templates').insertOne(t);
  res.json(clean(t));
});
api.put('/rental-quote-emails/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('rental_quote_email_templates').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('rental_quote_email_templates').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/rental-quote-emails/templates/:id', authMiddleware, async (req, res) => {
  await db.collection('rental_quote_email_templates').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/rental-quote-emails/quotes', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('location_quotes').find({}, { projection: { _id: 0 } }).toArray()));
});
api.post('/rental-quote-emails/send', authMiddleware, async (req, res) => {
  try {
    const { quote_id, recipient_email, email_subject, email_body, pdf_base64, pdf_filename } = req.body;
    
    // DEBUG LOG
    console.log('[RENTAL-EMAIL] Received:', {
      quote_id: quote_id || 'MISSING',
      recipient_email: recipient_email || 'MISSING',
      has_pdf_base64: !!pdf_base64,
      pdf_base64_length: pdf_base64 ? pdf_base64.length : 0,
      pdf_base64_start: pdf_base64 ? pdf_base64.substring(0, 50) : 'EMPTY',
      pdf_filename: pdf_filename || 'MISSING'
    });
    
    if (!recipient_email || !email_subject) {
      return res.status(400).json({ detail: 'Email destinataire et objet requis' });
    }

    const cfg = await getSmtpConfig();
    if (!cfg.smtp_user || !cfg.smtp_server) {
      return res.status(500).json({ detail: 'Configuration SMTP manquante. Vérifiez vos paramètres.' });
    }
    
    const transporter = createTransporter(cfg);
    
    const pdfAttachments = pdf_base64 ? [{
      filename: pdf_filename || 'Devis_Location.pdf',
      content: pdf_base64, encoding: 'base64',
      contentType: 'application/pdf', contentDisposition: 'attachment'
    }] : [];
    
    const { html: finalHtml, attachments } = convertDataUriToCid(
      email_body || '<p>Veuillez trouver ci-joint votre devis.</p>',
      pdfAttachments
    );
    
    await transporter.sendMail({
      from: `${cfg.smtp_from_name} <${cfg.smtp_from || cfg.smtp_user}>`,
      to: recipient_email, cc: cfg.smtp_from,
      subject: email_subject, html: finalHtml, attachments
    });
    
    // Update quote status to 'sent' if quote_id provided
    if (quote_id) {
      await db.collection('location_quotes').updateOne(
        { id: quote_id },
        { $set: { status: 'sent', sent_at: new Date().toISOString() } }
      );
    }
    
    res.json({ success: true, message: 'Email envoyé avec succès', pdf_filename: pdf_filename || 'Devis_Location.pdf' });
  } catch (e) {
    console.error('SMTP send error:', e);
    res.status(500).json({ detail: `Erreur SMTP: ${e.message}` });
  }
});

// ══════════ DOCUMENTS ══════════
api.get('/document-library', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('document_library').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.post('/document-library', authMiddleware, async (req, res) => {
  const doc = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('document_library').insertOne(doc);
  res.json(clean(doc));
});
api.put('/document-library/:id', authMiddleware, async (req, res) => {
  await db.collection('document_library').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('document_library').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/document-library/:id', authMiddleware, async (req, res) => {
  await db.collection('document_library').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.get('/document-library/:id/content', authMiddleware, async (req, res) => {
  const doc = await db.collection('document_library').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  res.json(doc);
});
api.post('/file-transfers/from-library', authMiddleware, async (req, res) => {
  const t = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('file_transfers').insertOne(t);
  res.json(clean(t));
});
api.get('/document-library/:id/preview', authMiddleware, async (req, res) => {
  const doc = await db.collection('document_library').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  res.json(doc);
});

// ══════════ REVIEWS (Google) ══════════
api.get('/reviews/search/:businessName', authMiddleware, (req, res) => res.json([]));
api.get('/reviews/:placeId', authMiddleware, async (req, res) => {
  const cached = await db.collection('reviews_cache').findOne({ place_id: req.params.placeId }, { projection: { _id: 0 } });
  res.json(cached || { reviews: [], rating: 0, total_reviews: 0 });
});
api.post('/widget/refresh', authMiddleware, (req, res) => res.json({ success: true }));
api.post('/reviews/generate-response', authMiddleware, (req, res) => res.json({ response: '' }));
api.get('/settings', authMiddleware, async (req, res) => {
  const s = await db.collection('settings').findOne({}, { projection: { _id: 0 } });
  res.json(s || {});
});
api.put('/settings', authMiddleware, async (req, res) => {
  await db.collection('settings').updateOne({}, { $set: req.body }, { upsert: true });
  res.json(req.body);
});
api.get('/widget/css', (req, res) => res.type('css').send(''));
api.get('/widget/js', (req, res) => res.type('js').send(''));

// ══════════ PUBLIC QUOTES ══════════
api.get('/public/quote/:quoteId', async (req, res) => {
  const q = await db.collection('location_quotes').findOne({ id: req.params.quoteId }, { projection: { _id: 0 } });
  if (!q) return res.status(404).send('<h1>Devis non trouvé</h1>');
  res.type('html').send(`<html><body><h1>Devis ${q.reference || q.id}</h1><pre>${JSON.stringify(q, null, 2)}</pre></body></html>`);
});

// ══════════ ARTIST EVENTS (from server.py) ══════════
api.get('/artist-events', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('artist_events').find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray()));
});
api.post('/artist-events', authMiddleware, async (req, res) => {
  const e = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('artist_events').insertOne(e);
  res.json(clean(e));
});
api.put('/artist-events/:id', authMiddleware, async (req, res) => {
  await db.collection('artist_events').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('artist_events').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/artist-events/:id', authMiddleware, async (req, res) => {
  await db.collection('artist_events').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ══════════ QUOTES (legacy) ══════════
api.get('/quotes', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('quotes').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});

// ═══════════════════════════════════════════
// MOUNT API + STATIC FILES
// ═══════════════════════════════════════════
// Dynamic PWA Manifest for standalone mode (My DJ)
app.get('/api/pwa-manifest', (req, res) => {
  const slug = req.query.slug || '';
  const manifest = {
    "short_name": "My DJ",
    "name": "My DJ",
    "icons": [
      {
        "src": "/favicon.svg",
        "type": "image/svg+xml",
        "sizes": "192x192 512x512"
      }
    ],
    "start_url": slug ? `/${slug}` : "/",
    "background_color": "#0f172a",
    "theme_color": "#f97316",
    "display": "standalone",
    "orientation": "portrait"
  };
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(manifest, null, 2));
});

// Serve widget HTML files (BEFORE api router so /api/widgets/* is served as static files)
app.use('/api/widgets', express.static(path.join(__dirname, 'frontend', 'public', 'api', 'widgets')));

api.get('/agenda-custom-events', authMiddleware, async (req, res) => {
  try {
    const list = await db.collection('agenda_custom_events').find({}).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/agenda-custom-events', authMiddleware, async (req, res) => {
  try {
    const { title, date, isOption, djId, djName, clientName, clientPhone, eventType, details, location, recurrence, recurrenceEndType, recurrenceEndDate, recurrenceCount } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: "Le titre et la date sont requis." });
    }

    const dates = [date];
    const recurrenceId = (recurrence && recurrence !== 'none') ? new ObjectId().toString() : null;

    if (recurrence && recurrence !== 'none') {
      const parts = date.split('-');
      let current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const limit = 100;
      let count = 1;

      let endDateObj = null;
      if (recurrenceEndType === 'date' && recurrenceEndDate) {
        const endParts = recurrenceEndDate.split('-');
        endDateObj = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
      }

      while (count < (recurrenceEndType === 'count' ? (recurrenceCount || 5) : limit)) {
        if (recurrence === 'daily') {
          current.setDate(current.getDate() + 1);
        } else if (recurrence === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else if (recurrence === 'monthly') {
          current.setMonth(current.getMonth() + 1);
        } else {
          break;
        }

        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        if (recurrenceEndType === 'date' && endDateObj) {
          if (current > endDateObj) {
            break;
          }
        }

        dates.push(formattedDate);
        count++;
      }
    }

    const newEvents = dates.map(d => ({
      title,
      date: d,
      isOption: !!isOption,
      djId: djId || null,
      djName: djName || "",
      clientName: clientName || "",
      clientPhone: clientPhone || "",
      eventType: eventType || "",
      details: details || "",
      location: location || "",
      recurrenceId,
      createdAt: new Date().toISOString()
    }));

    const result = await db.collection('agenda_custom_events').insertMany(newEvents);
    
    // Sync all generated events to Google Calendar
    const insertedDocs = [];
    for (let i = 0; i < newEvents.length; i++) {
      const insertedDoc = { _id: result.insertedIds[i], ...newEvents[i] };
      insertedDocs.push(insertedDoc);
      try {
        await syncCustomEventToGoogleCalendar(insertedDoc);
      } catch (gcalErr) {
        console.error('[agenda-custom-events POST] GCal sync failed for date ' + newEvents[i].date, gcalErr);
      }
    }

    res.json({ success: true, id: result.insertedIds[0], document: insertedDocs[0], count: newEvents.length, documents: insertedDocs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/agenda-custom-events/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, isOption, djId, djName, clientName, clientPhone, eventType, details, location } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: "Le titre et la date sont requis." });
    }
    const updateData = {
      title,
      date,
      isOption: !!isOption,
      djId: djId || null,
      djName: djName || "",
      clientName: clientName || "",
      clientPhone: clientPhone || "",
      eventType: eventType || "",
      details: details || "",
      location: location || "",
      updatedAt: new Date().toISOString()
    };
    await db.collection('agenda_custom_events').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    const updatedDoc = await db.collection('agenda_custom_events').findOne({ _id: new ObjectId(id) });
    if (updatedDoc) {
      // Sync to Google Calendar
      try {
        await syncCustomEventToGoogleCalendar(updatedDoc);
      } catch (gcalErr) {
        console.error('[agenda-custom-events PUT] GCal sync failed:', gcalErr);
      }
    }

    res.json({ success: true, document: updatedDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/agenda-custom-events/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteAllSeries } = req.query;
    
    // Fetch before deleting to remove Google Calendar event(s)
    const item = await db.collection('agenda_custom_events').findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: "Événement non trouvé." });
    }

    if (deleteAllSeries === 'true' && item.recurrenceId) {
      // Find all events in the series
      const series = await db.collection('agenda_custom_events').find({ recurrenceId: item.recurrenceId }).toArray();
      for (const s of series) {
        if (s.google_event_id && s.google_calendar_id) {
          try {
            await deleteGoogleCalendarEvent(s.google_calendar_id, s.google_event_id);
          } catch (gcalErr) {
            console.error('[agenda-custom-events DELETE series] GCal event delete failed:', gcalErr);
          }
        }
      }
      await db.collection('agenda_custom_events').deleteMany({ recurrenceId: item.recurrenceId });
    } else {
      if (item.google_event_id && item.google_calendar_id) {
        try {
          await deleteGoogleCalendarEvent(item.google_calendar_id, item.google_event_id);
        } catch (gcalErr) {
          console.error('[agenda-custom-events DELETE] GCal event delete failed:', gcalErr);
        }
      }
      await db.collection('agenda_custom_events').deleteOne({ _id: new ObjectId(id) });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/agenda-settings', authMiddleware, async (req, res) => {
  let settings = await db.collection('agenda_settings').findOne({ id: 'global' }, { projection: { _id: 0 } });
  if (!settings) settings = { id: 'global', deleted_djs: [], hidden_djs: [] };
  res.json(settings);
});
api.put('/agenda-settings', authMiddleware, async (req, res) => {
  await db.collection('agenda_settings').updateOne(
    { id: 'global' },
    { $set: { id: 'global', ...req.body } },
    { upsert: true }
  );
  res.json({ success: true });
});

api.post('/agenda/sync-all-google', authMiddleware, async (req, res) => {
  if (!calendar) {
    return res.status(500).json({ error: "Google Calendar n'est pas initialisé. Identifiants manquants." });
  }

  try {
    let syncedContractsCount = 0;
    let syncedCustomEventsCount = 0;
    const failedCalendars = new Set();
    const failedReasons = {};

    // 1. Sync active contracts
    const activeContracts = await db.collection('contracts2').find({
      status: { $nin: ['deleted', 'trash', 'draft'] }
    }).toArray();

    for (const contract of activeContracts) {
      const result = await syncContractToGoogleCalendar(contract);
      if (result && result.success === false) {
        failedCalendars.add(result.calendarId || 'unknown');
        failedReasons[result.calendarId || 'unknown'] = result.error;
      } else {
        syncedContractsCount++;
      }
    }

    // 2. Sync active custom events
    const customEvents = await db.collection('agenda_custom_events').find({}).toArray();
    for (const item of customEvents) {
      const result = await syncCustomEventToGoogleCalendar(item);
      if (result && result.success === false) {
        failedCalendars.add(result.calendarId || 'unknown');
        failedReasons[result.calendarId || 'unknown'] = result.error;
      } else {
        syncedCustomEventsCount++;
      }
    }

    res.json({
      success: true,
      syncedContracts: syncedContractsCount,
      syncedCustomEvents: syncedCustomEventsCount,
      failedCalendars: Array.from(failedCalendars),
      failedReasons: failedReasons,
      message: `${syncedContractsCount} contrats et ${syncedCustomEventsCount} événements personnalisés synchronisés.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch unregistered API routes
api.use((req, res) => {
  res.status(404).json({ detail: `Endpoint API non trouvé: ${req.method} ${req.originalUrl}` });
});

// API error handler (at the very end of api router)
api.use((err, req, res, next) => {
  console.error('SERVER ERROR IN API:', err);
  res.status(err.status || 500).json({ 
    detail: err.message || 'Une erreur interne est survenue dans l\'API'
  });
});

app.use('/api', api);

// Serve frontend build
let frontendPath = path.join(__dirname, 'frontend', 'build');
if (!fs.existsSync(frontendPath)) {
  const productionPath = path.join(__dirname, 'frontend', 'build_production');
  if (fs.existsSync(productionPath)) {
    frontendPath = productionPath;
  } else {
    const distPath = path.join(__dirname, 'frontend', 'dist');
    if (fs.existsSync(distPath)) {
      frontendPath = distPath;
    }
  }
}

console.log(`Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// SPA fallback - all non-API and non-file routes serve index.html
app.use((req, res, next) => {
  // ONLY handle GET requests for SPA fallback
  // API calls and static assets should never return index.html
  if (req.method !== 'GET' || req.originalUrl.startsWith('/api') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|otf)$/i)) {
    return next();
  }
  
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend index.html non trouvé.');
    }
  });
});

// Final catch-all for any /api request that wasn't handled
app.use('/api', (req, res) => {
  res.status(404).json({ 
    detail: `Route API non trouvée: ${req.method} ${req.originalUrl}`,
    hint: "Vérifiez que le serveur est bien démarré et que la route est correcte."
  });
});

// ═══════════════════════════════════════════
// BACKGROUND SYNC TASKS
// ═══════════════════════════════════════════
const cron = require('node-cron');

cron.schedule('* * * * *', async () => {
  if (!db) return;
  try {
    const settings = await db.collection('global_settings').findOne({ type: 'company' });
    if (!settings || !settings.auto_sync_enabled) return;

    const now = new Date();
    // Assuming Paris timezone as the default for the user
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    });
    // Formatter returns like "12:00", wait, fr-FR format is "12:00" or "12 h 00" sometimes. 
    // Let's use simple local time padding just in case, but formatting with options is safer:
    const parts = formatter.formatToParts(now);
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const currentParisTime = `${hour}:${minute}`;
    
    if (currentParisTime === settings.auto_sync_time_1 || currentParisTime === settings.auto_sync_time_2) {
      console.log(`[CRON] Auto-sync triggered at ${currentParisTime}`);
      
      // Sync Location
      const reservations = await db.collection('location_reservations').find({}).toArray();
      for (const resItem of reservations) {
          const googleEventId = await tryAutoSyncToGoogle(resItem);
          if (googleEventId === 'DELETED') {
              await db.collection('location_reservations').updateOne({ id: resItem.id }, { $unset: { google_event_id: "" } });
          } else if (googleEventId && googleEventId !== resItem.google_event_id) {
              await db.collection('location_reservations').updateOne({ id: resItem.id }, { $set: { google_event_id: googleEventId } });
          }
      }

      // Sync Agenda
      if (calendar) {
        const activeContracts = await db.collection('contracts2').find({ status: { $nin: ['deleted', 'trash', 'draft'] } }).toArray();
        for (const contract of activeContracts) {
          await syncContractToGoogleCalendar(contract);
        }

        const customEvents = await db.collection('agenda_custom_events').find({}).toArray();
        for (const item of customEvents) {
          await syncCustomEventToGoogleCalendar(item);
        }
      }
      
      console.log(`[CRON] Auto-sync completed.`);
    }
  } catch (err) {
    console.error("[CRON] Auto-sync error:", err);
  }
});

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  
  // Connect to DB in background
  connectDB().then(() => {
    console.log('MongoDB connection established successfully');
  }).catch(err => {
    console.error('Initial MongoDB connection failed:', err.message);
    // db is undefined, api middleware will return 503
  });
});
