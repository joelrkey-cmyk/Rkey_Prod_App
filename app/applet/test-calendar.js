const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function test() {
  const GOOGLE_CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: "Test Event",
        start: {
          date: '2026-05-14',
          timeZone: 'Europe/Paris',
        },
        end: {
          date: '2026-05-15',
          timeZone: 'Europe/Paris',
        }
      }
    });
    console.log("Success:", res.data.id);
  } catch (error) {
    console.error("Error inserting:", error.message || error);
    if (error.response && error.response.data) {
        console.error("Details:", error.response.data);
    }
  }
}
test();
