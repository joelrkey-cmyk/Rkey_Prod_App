const fs = require('fs');
console.log("Files in root:", fs.readdirSync('.'));
console.log("GOOGLE_CREDENTIALS_JSON length:", process.env.GOOGLE_CREDENTIALS_JSON ? process.env.GOOGLE_CREDENTIALS_JSON.length : 'undefined');
console.log("GOOGLE_CALENDAR_CREDENTIALS_JSON length:", process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON ? process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON.length : 'undefined');
console.log("GOOGLE_CALENDAR_CLIENT_EMAIL:", process.env.GOOGLE_CALENDAR_CLIENT_EMAIL);
