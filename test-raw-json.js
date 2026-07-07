const fs = require('fs');
require('dotenv').config({ override: true });

try {
  const jsonStr = process.env.GOOGLE_CREDENTIALS_JSON;
  console.log('Is there any double backslashes in raw JSON?');
  const count = (jsonStr.match(/\\/g) || []).length;
  console.log('Backslash count:', count);
  
  // Let's find "private_key" in the raw jsonStr and print its exact value
  const match = jsonStr.match(/"private_key"\s*:\s*"([\s\S]*?)"/);
  if (match) {
    const rawVal = match[1];
    console.log('Raw private_key string length:', rawVal.length);
    console.log('Does it contain \\\\n? (double escaped newlines):', rawVal.includes('\\n'));
    console.log('Does it contain \\r? (carriage returns):', rawVal.includes('\\r'));
    console.log('Let\'s check the raw string for backslash characters:');
    const bCount = (rawVal.match(/\\/g) || []).length;
    console.log('Backslashes in raw private_key:', bCount);
  }
} catch (e) {
  console.error(e);
}
