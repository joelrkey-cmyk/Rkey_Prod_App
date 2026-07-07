require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  const lines = pk.trim().split('\n');
  lines.forEach((line, i) => {
    console.log(`Line ${i}: length=${line.length} content=${JSON.stringify(line)}`);
  });
} catch (e) {
  console.error(e);
}
