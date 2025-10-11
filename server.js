const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const twilio = require('./services/twilioService');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple event broadcaster for SSE
const clientsByArea = new Map(); // area -> Set of res
const heartbeatByRes = new Map(); // res -> interval

function sendEvent(area, event, data) {
  const clients = clientsByArea.get(area);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (e) { /* ignore */ }
  }
}

// SSE endpoint for ASHA dashboard to subscribe by area
app.get('/events', (req, res) => {
  const area = req.query.area || 'all';
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  });

  if (!clientsByArea.has(area)) clientsByArea.set(area, new Set());
  const clients = clientsByArea.get(area);
  clients.add(res);

  // Send an initial 'init' event with recent alerts for this area
  try {
    const alerts = db.getAlerts().filter(a => area === 'all' || String(a.area) === String(area));
    const initPayload = `event: init\ndata: ${JSON.stringify(alerts)}\n\n`;
    res.write(initPayload);
  } catch (e) {
    // ignore
  }

  // Heartbeat comment every 20s to keep the connection alive
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) { /* ignore */ }
  }, 20000);
  heartbeatByRes.set(res, hb);

  req.on('close', () => {
    clients.delete(res);
    const iv = heartbeatByRes.get(res);
    if (iv) clearInterval(iv);
    heartbeatByRes.delete(res);
  });
});

// Create alert (from AI or mobile)
app.post('/alerts', (req, res) => {
  const { patient_name, area, severity, details } = req.body || {};
  if (!patient_name || !area || !severity) {
    return res.status(400).json({ error: 'patient_name, area and severity are required' });
  }
  const result = db.insertAlert({ patient_name, area, severity, details: details || '' });
  const alertId = result.lastInsertRowid;
  const alert = db.getAlertById(alertId);

  // Broadcast to area subscribers and to 'all'
  sendEvent(area, 'new-alert', alert);
  sendEvent('all', 'new-alert', alert);

  // If severity is high, send SMS and an automated voice call (mock if no creds)
  (async () => {
    try {
      if ((alert.severity || '').toLowerCase() === 'high') {
        // For prototype we don't have patient phone number; using a placeholder "+10000000000".
        const to = req.body.phone || process.env.DEMO_PHONE || '+10000000000';
        const sms = await twilio.sendSMS(to, `Aarogyasense: urgent alert for ${alert.patient_name} in ${alert.area}. Severity: ${alert.severity}`);
        db.recordDelivery(alert.id, 'sms', to, sms.success ? 'sent' : 'failed', sms);
        const call = await twilio.makeCall(to, process.env.TWIML_URL || 'http://demo.twiml.invalid/message');
        db.recordDelivery(alert.id, 'voice', to, call.success ? 'initiated' : 'failed', call);
      }
    } catch (e) {
      console.error('delivery error', e);
    }
  })();

  res.status(201).json(alert);
});

app.get('/alerts', (req, res) => {
  const alerts = db.getAlerts();
  res.json(alerts);
});

// Twilio status endpoint
app.get('/twilio/status', (req, res) => {
  res.json({ configured: twilio.isConfigured() });
});

// Twilio test: send a test SMS and/or call to provided phone number (body: { phone })
app.post('/twilio/test', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  if (!twilio.isConfigured()) return res.status(400).json({ error: 'twilio not configured (set env variables)' });
  try {
    const sms = await twilio.sendSMS(phone, 'Aarogyasense test message');
    const call = await twilio.makeCall(phone, process.env.TWIML_URL || 'http://demo.twiml.invalid/message');
    res.json({ sms, call });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Twilio demo test using DEMO_PHONE from env
app.post('/twilio/test/demo', async (req, res) => {
  const phone = process.env.DEMO_PHONE;
  if (!phone) return res.status(400).json({ error: 'DEMO_PHONE not set in environment' });
  if (!twilio.isConfigured()) return res.status(400).json({ error: 'twilio not configured (set env variables)' });
  try {
    const sms = await twilio.sendSMS(phone, 'Aarogyasense demo: test message');
    const call = await twilio.makeCall(phone, process.env.TWIML_URL || 'http://demo.twiml.invalid/message');
    res.json({ phone, sms, call });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/alerts/:id', (req, res) => {
  const alert = db.getAlertById(req.params.id);
  if (!alert) return res.status(404).json({ error: 'not found' });
  const logs = db.getLogsForAlert(alert.id);
  res.json({ alert, logs });
});

// ASHA verifies the AI alert after follow-up
app.post('/alerts/:id/verify', (req, res) => {
  const ashaId = req.body.asha_id || 'unknown';
  const id = parseInt(req.params.id, 10);
  const existing = db.getAlertById(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.verifyAlert(id, ashaId);
  const updated = db.getAlertById(id);

  sendEvent(existing.area, 'verified', updated);
  sendEvent('all', 'verified', updated);

  res.json(updated);
});

// ASHA adds follow-up logs
app.post('/alerts/:id/log', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { asha_id, note } = req.body || {};
  if (!note) return res.status(400).json({ error: 'note is required' });
  const existing = db.getAlertById(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.insertLog(id, asha_id || 'unknown', note);
  const logs = db.getLogsForAlert(id);

  sendEvent(existing.area, 'log', { alert_id: id, logs });
  sendEvent('all', 'log', { alert_id: id, logs });

  res.json({ alert: existing, logs });
});

const PORT = process.env.PORT || 3000;

// Initialize DB then start
(async () => {
  if (typeof db.init === 'function') await db.init();
  app.listen(PORT, () => {
    console.log(`Aarogyasense server running on http://localhost:${PORT}`);
  });
})();
