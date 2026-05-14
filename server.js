require('dotenv').config();
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
const fs = require('fs');

// --- Google Calendar Setup ---
const GOOGLE_CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
let calendar = null;
let locationCalendarId = null;

async function initGoogleCalendar() {
  try {
    let auth;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      console.log('Google Calendar integration initialized from environment variable.');
    } else if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
      auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      console.log('Google Calendar integration initialized from file.');
    } else {
      console.warn('google-credentials.json and GOOGLE_CREDENTIALS_JSON not found, Google Calendar sync is disabled.');
      return;
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
  }
}
initGoogleCalendar();

async function syncReservationToCalendar(reservation) {
  if (!calendar) throw new Error('Google Calendar integration is not initialized (check credentials).');
  
  // Wait to make sure the calendar ID is fetched if not ready yet
  if (!locationCalendarId) {
    locationCalendarId = 'primary';
  }

  const bType = (reservation.booking_type || '').toLowerCase();
  if (bType !== 'client' && bType !== 'livraison') {
    throw new Error(`Booking type "${reservation.booking_type}" cannot be synced. Only "Client" or "Livraison" types are allowed.`);
  }

  try {
    const title = `Location: ${reservation.client_name || reservation.dj_name || 'Client'}`;
    
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
    const items = reservation.items || reservation.equipment_items || [];
    if (items && items.length > 0) {
      for (const item of items) {
        description += `• ${item.quantity || 1} x ${item.name || item.equipment_name || 'Matériel'}\n`;
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

    // colorId 9 = Bleu (Blueberry), 3 = Violet (Grape)
    const colorId = bType === 'client' ? '9' : '3';

    const event = {
      summary: title,
      description: description,
      colorId: colorId,
      start: {
        date: startFormat,
        timeZone: 'Europe/Paris',
      },
      end: {
        date: endFormat,
        timeZone: 'Europe/Paris',
      },
    };

    let response;
    if (reservation.google_event_id) {
      try {
        response = await calendar.events.update({
          calendarId: locationCalendarId,
          eventId: reservation.google_event_id,
          resource: event,
        });
        console.log(`Event updated in Google Calendar: ${response.data.htmlLink}`);
        return reservation.google_event_id;
      } catch (updateErr) {
        const status = updateErr.status || (updateErr.response && updateErr.response.status);
        if (status === 404 || status === 410) {
          console.log(`Event ${reservation.google_event_id} not found or deleted on update. Will recreate.`);
          // Do not throw, let it fall through to create a new event
        } else {
          throw updateErr;
        }
      }
    }
    
    // If we reach here, either no google_event_id existed, or the event was deleted so we recreate
    response = await calendar.events.insert({
      calendarId: locationCalendarId,
      resource: event,
    });
    console.log(`Event created/recreated in Google Calendar: ${response.data.htmlLink}`);
    return response.data.id;

  } catch (error) {
    const status = error.status || (error.response && error.response.status);
    const msg = error.message || String(error);
    console.error(`Error syncing reservation to Google Calendar (Status ${status}): ${msg}`);
    if (status === 404 || status === 410) {
      console.error(`Suggestion: The calendar ID '${locationCalendarId}' might be invalid or not shared with the service account.`);
      throw new Error(`Erreur Google (404) : Événement ou calendrier introuvable. ${msg}`);
    } else if (status === 403) {
      throw new Error(`Erreur Google (403) : Accès refusé. Vérifiez les permissions du compte de service. ${msg}`);
    }
    throw new Error(msg);
  }
}

async function deleteReservationFromGoogleCalendar(eventId) {
  if (!calendar) return; // Do nothing if not initialized
  if (!locationCalendarId || !eventId) return;

  try {
    await calendar.events.delete({
      calendarId: locationCalendarId,
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

async function tryAutoSyncToGoogle(reservation) {
  try {
    const bType = (reservation.booking_type || '').toLowerCase();
    if (bType !== 'client' && bType !== 'livraison') {
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
const PORT = process.env.PORT || 3000;

// Static build path
const buildPath = path.join(__dirname, 'frontend', 'build_production');
console.log(`Serving frontend from: ${buildPath}`);

// ─── Middleware ───
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/api/log-client-error', (req, res) => {
  console.log("=== CLIENT REACT ERROR ===", req.body);
  try {
    fs.appendFileSync('client_error.log', new Date().toISOString() + ' : ' + JSON.stringify(req.body) + '\n');
  } catch (err) {}
  res.json({ ok: true });
});

app.get('/api/get-client-error', (req, res) => {
  try {
    const data = fs.readFileSync('client_error.log', 'utf8');
    res.send(data);
  } catch (err) {
    res.send('No logs');
  }
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
    await ensureAdminUser();
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

const ALL_APPS = ["devis","contracts","contracts2","location","rental","delivery","crm","billetterie","formulaires","dj-profiles","abonnements","parametres"];
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

async function ensureAdminUser() {
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
    console.log(`Admin '${adminUser}' exists`);
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

api.get('/location/google-calendar-status', authMiddleware, (req, res) => {
  let serviceAccountEmail = null;
  
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      serviceAccountEmail = creds.client_email;
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON env var', e);
    }
  } else if (fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    try {
      const creds = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
      serviceAccountEmail = creds.client_email;
    } catch (e) {
      console.error('Failed to read credentials file', e);
    }
  }
  
  res.json({
    initialized: !!calendar,
    locationCalendarFound: locationCalendarId !== null && locationCalendarId !== 'primary',
    serviceAccountEmail: serviceAccountEmail
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
api.get('/notifications/unread-count', authMiddleware, (req, res) => res.json({ count: 0 }));

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
  res.json(partners);
});
api.put('/partners/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.order || [])) await db.collection('partners').updateOne({ id: item.id }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});
api.get('/partners/:id', authMiddleware, async (req, res) => {
  const p = await db.collection('partners').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!p) return res.status(404).json({ detail: 'Not found' });
  res.json(p);
});
api.post('/partners', authMiddleware, async (req, res) => {
  const partner = { id: uuidv4(), ...req.body, sort_order: req.body.sort_order || 999, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db.collection('partners').insertOne(partner);
  res.json(clean(partner));
});
api.put('/partners/:id', authMiddleware, async (req, res) => {
  await db.collection('partners').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  const updated = await db.collection('partners').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(updated);
});
api.delete('/partners/:id', authMiddleware, async (req, res) => {
  await db.collection('partners').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/partners/ocr', authMiddleware, (req, res) => res.json({ first_name: '', last_name: '', company: '', phone: '', email: '', website: '' }));
api.get('/partners/widget/:category', authMiddleware, async (req, res) => {
  const partners = await db.collection('partners').find({ category: req.params.category }, { projection: { _id: 0, card_recto: 0, card_verso: 0 } }).sort({ sort_order: 1, last_name: 1 }).toArray();
  res.json(partners);
});
api.get('/partners/public/widget/:category', async (req, res) => {
  const partners = await db.collection('partners').find({ category: req.params.category }, { projection: { _id: 0, card_recto: 0, card_verso: 0, notes: 0 } }).sort({ sort_order: 1, last_name: 1 }).toArray();
  res.json(partners);
});

// ══════════ DJ PROFILES ══════════
const DJ_PRIVATE = new Set(['nom_complet','email','telephone','siret','adresse_postale','statut_artiste','iban','bic']);
api.get('/dj-fiches', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('dj_profiles').find({}, { projection: { _id: 0 } }).toArray()));
});
api.get('/dj-fiches/public', async (req, res) => {
  const profiles = await db.collection('dj_profiles').find({ is_public: true }, { projection: { _id: 0 } }).toArray();
  res.json(profiles.map(p => { const r = {}; for (const [k,v] of Object.entries(p)) { if (!DJ_PRIVATE.has(k)) r[k] = v; } return r; }));
});
api.get('/dj-fiches/public/:id', async (req, res) => {
  const p = await db.collection('dj_profiles').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!p) return res.status(404).json({ detail: 'DJ Profile not found' });
  const r = {}; for (const [k,v] of Object.entries(p)) { if (!DJ_PRIVATE.has(k)) r[k] = v; } res.json(r);
});
api.post('/dj-fiches', authMiddleware, async (req, res) => {
  const profile = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('dj_profiles').insertOne(profile);
  res.json(clean(profile));
});
api.put('/dj-fiches/:id', authMiddleware, async (req, res) => {
  await db.collection('dj_profiles').updateOne({ id: req.params.id }, { $set: req.body });
  const updated = await db.collection('dj_profiles').findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(updated);
});
api.delete('/dj-fiches/:id', authMiddleware, async (req, res) => {
  await db.collection('dj_profiles').deleteOne({ id: req.params.id });
  res.json({ success: true });
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
  res.json({ profiles: profilesMap });
});

// ══════════ EVENTS / BILLETTERIE ══════════
api.get('/billetterie/events', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('events').find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray()));
});
api.get('/billetterie/events/public', async (req, res) => {
  res.json(cleanList(await db.collection('events').find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray()));
});
api.post('/billetterie/events', authMiddleware, async (req, res) => {
  const event = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  await db.collection('events').insertOne(event);
  res.json(clean(event));
});
api.put('/billetterie/events/:id', authMiddleware, async (req, res) => {
  await db.collection('events').updateOne({ id: req.params.id }, { $set: req.body });
  res.json(await db.collection('events').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/billetterie/events/:id', authMiddleware, async (req, res) => {
  await db.collection('events').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/billetterie/upload-image', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const doc = { id: uuidv4(), data: b64, created_at: new Date().toISOString() };
  await db.collection('event_images').insertOne(doc);
  res.json({ success: true, id: doc.id, image_url: b64, url: b64 });
});
api.post('/billetterie/migrate-images', authMiddleware, (req, res) => res.json({ migrated: 0 }));
api.get('/uploads/events/:filename', async (req, res) => {
  try {
    const upload = await db.collection('event_uploads').findOne({ upload_id: req.params.filename });
    if (!upload || !upload.data) return res.status(404).json({ detail: 'Not found' });
    const imgBuffer = Buffer.from(upload.data, 'base64');
    res.set('Content-Type', upload.content_type || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
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
  const note = {
    id: uuidv4(),
    title: req.body.title || req.file.originalname,
    filename: req.file.originalname,
    pdf_data: req.file.buffer.toString('base64'),
    order: parseInt(req.body.order) || 0,
    created_at: new Date().toISOString()
  };
  await db.collection('contract_technical_pdf_notes').insertOne(note);
  res.json(clean(note));
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
  await db.collection('contract_technical_pdf_notes').deleteOne({ id: req.params.id });
  res.json({ success: true });
});

api.post('/contract-pdf-notes/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.notes || [])) {
    await db.collection('contract_technical_pdf_notes').updateOne({ id: item.id }, { $set: { order: item.order } });
  }
  res.json({ success: true });
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
          if (note.pdf_data) {
            try {
              const noteDoc = await PDFDocument.load(Buffer.from(note.pdf_data, 'base64'));
              const pages = await finalDoc.copyPages(noteDoc, noteDoc.getPageIndices());
              pages.forEach((page) => finalDoc.addPage(page));
            } catch (err) {
              console.error(`Error merging PDF note ${note.id}:`, err);
            }
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
api.get('/contracts2', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: { $nin: ['trash'] } }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts2/trash', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: 'trash' }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
});
api.get('/contracts2/archived', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('contracts2').find({ status: 'archived' }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
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
  res.json(clean(contract));
});
api.put('/contracts2/:id', authMiddleware, async (req, res) => {
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.put('/contracts2/:id/status', authMiddleware, async (req, res) => {
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: { status: req.body.status, updated_at: new Date().toISOString() } });
  res.json(await db.collection('contracts2').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/contracts2/:id', authMiddleware, async (req, res) => {
  await db.collection('contracts2').updateOne({ id: req.params.id }, { $set: { status: 'trash', updated_at: new Date().toISOString() } });
  res.json({ success: true });
});
api.delete('/contracts2/:id/permanent', authMiddleware, async (req, res) => {
  await db.collection('contracts2').deleteOne({ id: req.params.id });
  res.json({ success: true });
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
api.post('/contract-emails/send', authMiddleware, async (req, res) => {
  try {
    const { recipient_email, email_subject, email_body, pdf_base64, pdf_filename } = req.body;
    if (!recipient_email || !email_subject) {
      return res.status(400).json({ detail: 'Email destinataire et objet requis' });
    }
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_user || !cfg.smtp_server) {
      return res.status(500).json({ detail: 'Configuration SMTP manquante' });
    }
    const transporter = createTransporter(cfg);
    
    const pdfAttachments = pdf_base64 ? [{
      filename: pdf_filename || 'contrat_RkeyProd.pdf',
      content: pdf_base64, encoding: 'base64',
      contentType: 'application/pdf', contentDisposition: 'attachment'
    }] : [];
    
    const { html: finalHtml, attachments } = convertDataUriToCid(
      email_body || '<p>Veuillez trouver ci-joint votre contrat.</p>',
      pdfAttachments
    );
    
    await transporter.sendMail({
      from: `${cfg.smtp_from_name} <${cfg.smtp_from || cfg.smtp_user}>`,
      to: recipient_email, cc: cfg.smtp_from,
      subject: email_subject, html: finalHtml, attachments
    });
    res.json({ success: true, message: 'Contrat envoyé avec succès' });
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
    const fileDoc = {
      file_id: uuidv4(),
      filename: req.file.originalname,
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
  res.json(cats?.categories || []);
});
api.post('/subscriptions/categories', authMiddleware, async (req, res) => {
  await db.collection('general_settings').updateOne({ type: 'subscription_categories' }, { $set: { categories: req.body.categories } }, { upsert: true });
  res.json(req.body.categories);
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
  res.json(cleanList(await db.collection('location_equipment').find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()));
});
api.get('/catalogue/equipements', async (req, res) => {
  res.json(cleanList(await db.collection('location_equipment').find({ publier_catalogue: true }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()));
});
api.post('/location/equipment', authMiddleware, async (req, res) => {
  const eq = { id: uuidv4(), maintenance_status: 'operational', ...req.body, created_at: new Date().toISOString() };
  await db.collection('location_equipment').insertOne(eq);
  res.json(clean(eq));
});
api.put('/location/equipment/:id', authMiddleware, async (req, res) => {
  await db.collection('location_equipment').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('location_equipment').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/location/equipment/:id', authMiddleware, async (req, res) => {
  await db.collection('location_equipment').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/upload/equipment-image', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image' });
  res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` });
});
api.post('/location/equipment/cleanup-copies', authMiddleware, (req, res) => res.json({ removed: 0 }));

// Location Categories
api.get('/location/categories', authMiddleware, async (req, res) => {
  const cats = cleanList(await db.collection('location_categories').find({}, { projection: { _id: 0 } }).sort({ order: 1, sort_order: 1, name: 1 }).toArray());
  res.json({ categories: cats, success: true });
});
api.get('/location/categories/public', async (req, res) => {
  const cats = cleanList(await db.collection('location_categories').find({}, { projection: { _id: 0 } }).sort({ order: 1, sort_order: 1, name: 1 }).toArray());
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
  res.json(cleanList(await db.collection('location_clients').find({}, { projection: { _id: 0 } }).sort({ last_name: 1 }).toArray()));
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
  if (req.query.archived === 'false') filter.is_archived = { $ne: true };
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
  await db.collection('location_quotes').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('location_quotes').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/location/quotes/:id', authMiddleware, async (req, res) => {
  await db.collection('location_quotes').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.patch('/location/quotes/:id/status', authMiddleware, async (req, res) => {
  await db.collection('location_quotes').updateOne({ id: req.params.id }, { $set: { status: req.body.status, updated_at: new Date().toISOString() } });
  res.json(await db.collection('location_quotes').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.patch('/location/quotes/:id', authMiddleware, async (req, res) => {
  await db.collection('location_quotes').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('location_quotes').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.patch('/location/quotes/:id/archive', authMiddleware, async (req, res) => {
  await db.collection('location_quotes').updateOne({ id: req.params.id }, { $set: { status: 'archived', updated_at: new Date().toISOString() } });
  res.json({ success: true });
});
api.post('/location/generate-description', authMiddleware, async (req, res) => {
  try {
    const { name, reference, category, observations } = req.body;
    const prompt = `Génère une description commerciale courte et professionnelle en français pour ce matériel de location événementielle :\n- Nom : ${name || 'Non précisé'}\n- Référence : ${reference || 'Non précisée'}\n- Catégorie : ${category || 'Non précisée'}\n- Observations : ${observations || 'Aucune'}\n\nLa description doit être vendeuse, concise (2-3 phrases max) et mettre en avant les avantages pour un événement. Réponds uniquement avec la description, sans guillemets.`;
    const resp = await fetch('https://integrations.emergentagent.com/llm/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EMERGENT_LLM_KEY}` },
      body: JSON.stringify({ model: 'gemini/gemini-3-flash-preview', messages: [{ role: 'user', content: prompt }], max_tokens: 300 })
    });
    const data = await resp.json();
    const description = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ description });
  } catch (e) { console.error('AI generation error:', e); res.json({ description: '' }); }
});
api.post('/location/generate-catalogue-description', authMiddleware, async (req, res) => {
  try {
    const { name, reference, category, observations } = req.body;
    const prompt = `Génère une description catalogue commerciale en français pour ce matériel de location événementielle :\n- Nom : ${name || 'Non précisé'}\n- Référence : ${reference || 'Non précisée'}\n- Catégorie : ${category || 'Non précisée'}\n- Observations : ${observations || 'Aucune'}\n\nLa description doit être vendeuse, professionnelle, concise (3-4 phrases) et adaptée à un catalogue public destiné aux organisateurs d'événements. Mets en avant les caractéristiques et avantages. Réponds uniquement avec la description, sans guillemets.`;
    const resp = await fetch('https://integrations.emergentagent.com/llm/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EMERGENT_LLM_KEY}` },
      body: JSON.stringify({ model: 'gemini/gemini-3-flash-preview', messages: [{ role: 'user', content: prompt }], max_tokens: 400 })
    });
    const data = await resp.json();
    const description = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ description });
  } catch (e) { console.error('AI catalogue description error:', e); res.json({ description: '' }); }
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

// Location Reservations
api.get('/location/reservations', authMiddleware, async (req, res) => {
  res.json(cleanList(await db.collection('location_reservations').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()));
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
  const r = { id: uuidv4(), ...req.body, items: resolvedItems, equipment_items: resolvedItems, status: req.body.status || 'active', created_at: new Date().toISOString() };
  
  // Sync to Google Calendar safely
  const googleEventId = await tryAutoSyncToGoogle(r);
  if (googleEventId && googleEventId !== 'DELETED') {
    r.google_event_id = googleEventId;
  }

  await db.collection('location_reservations').insertOne(r);
  res.json(clean(r));
});
api.put('/location/reservations/:id', authMiddleware, async (req, res) => {
  await db.collection('location_reservations').updateOne({ id: req.params.id }, { $set: req.body });
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

    const googleEventId = await syncReservationToCalendar(reservation);
    
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
      res.status(500).json({ error: 'Failed to sync with Google Calendar for unknown reasons' });
    }
  } catch (error) {
    console.error('Error in manual Google sync:', error);
    res.status(500).json({ error: error.message || 'Internal server error during sync' });
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
      status: 'accepted',
      booking_type: 'client',
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
      status: 'Accepté',
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
  const rentalWfs = await db.collection('rental_workflows').find(
    { reservation_id: req.params.reservationId }, { projection: { _id: 0 } }
  ).toArray();
  const deliveryWfs = await db.collection('delivery_workflows').find(
    { reservation_id: req.params.reservationId }, { projection: { _id: 0 } }
  ).toArray();
  res.json({ rental_workflows: rentalWfs, delivery_workflows: deliveryWfs });
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
      status: 'equipment_withdrawn',
      booking_type: 'client',
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
  res.json({ success: true, image_base64: p.image_data || '', filename: p.filename, label: p.label });
});
api.put('/devis2/pages/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_pages').updateOne({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } });
  res.json(await db.collection('devis2_pages').findOne({ id: req.params.id }, { projection: { _id: 0 } }));
});
api.delete('/devis2/pages/:id', authMiddleware, async (req, res) => {
  await db.collection('devis2_pages').deleteOne({ id: req.params.id });
  res.json({ success: true });
});
api.post('/devis2/pages/reorder', authMiddleware, async (req, res) => {
  for (const item of (req.body.pages || [])) await db.collection('devis2_pages').updateOne({ id: item.id }, { $set: { sort_order: item.sort_order } });
  res.json({ success: true });
});
api.post('/devis2/pages/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file' });
  try {
    const { label, category, is_tarif } = req.body;
    const page = { 
      id: uuidv4(), 
      label: label || req.file.originalname,
      category: category || 'artiste',
      is_tarif: is_tarif === 'true' || is_tarif === true,
      image_data: req.file.buffer.toString('base64'),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      created_at: new Date().toISOString() 
    };
    await db.collection('devis2_pages').insertOne(page);
    res.json({ success: true, ...clean(page) });
  } catch (error) {
    console.error('Error uploading devis2 page:', error);
    res.status(500).json({ success: false, detail: 'Erreur lors de l\'enregistrement de la page' });
  }
});
api.post('/devis2/pages/migrate-to-mongodb', authMiddleware, (req, res) => res.json({ migrated: 0 }));
api.delete('/devis2/pages/orphaned', authMiddleware, (req, res) => res.json({ removed: 0 }));

// DEVIS PDF & SENT
api.post('/devis2/generate-pdf', authMiddleware, async (req, res) => {
  try {
    const { selected_pages, price_amount, price_type, end_time, unlimited_time } = req.body;
    if (!selected_pages || !selected_pages.length) return res.status(400).json({ detail: 'Aucune page sélectionnée' });

    const pdfDoc = await PDFDocument.create();

    for (const pageId of selected_pages) {
      let page = await db.collection('devis2_pages').findOne({ id: pageId });
      if (!page) page = await db.collection('devis2_pages').findOne({ key: pageId });
      if (!page || !page.image_data) continue;

      let imgBytes = Buffer.from(page.image_data, 'base64');

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

    if (pdfDoc.getPageCount() === 0) return res.status(400).json({ detail: 'Aucune page valide trouvée' });

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
      if (!page || !page.image_data) continue;
      let imgBytes = Buffer.from(page.image_data, 'base64');
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
// Serve widget HTML files (BEFORE api router so /api/widgets/* is served as static files)
app.use('/api/widgets', express.static(path.join(__dirname, 'frontend', 'public', 'api', 'widgets')));

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
// Check for build folder first, then build_production
let frontendPath = path.join(__dirname, 'frontend', 'build');
if (!fs.existsSync(path.join(frontendPath, 'index.html'))) {
  frontendPath = path.join(__dirname, 'frontend', 'build_production');
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
