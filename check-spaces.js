require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const spaceCount = (pk.match(/ /g) || []).length;
  console.log('Space count in private key:', spaceCount);
  
  // Let's print the lines that contain spaces
  const lines = pk.split('\n');
  lines.forEach((line, i) => {
    if (line.includes(' ')) {
      console.log(`Line ${i} has space: ${JSON.stringify(line)}`);
    }
  });
} catch (e) {
  console.error(e);
}
