require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TWILIO_ACCOUNT = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

let client = null;
let configured = false;
if (TWILIO_ACCOUNT && TWILIO_AUTH && TWILIO_FROM) {
  const Twilio = require('twilio');
  client = new Twilio(TWILIO_ACCOUNT, TWILIO_AUTH);
  configured = true;
}

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function recordMock(action, payload) {
  const f = path.join(logDir, 'twilio-mock.log');
  fs.appendFileSync(f, `${new Date().toISOString()} ${action} ${JSON.stringify(payload)}\n`);
}

async function sendSMS(to, body) {
  if (!client) {
    recordMock('sms', { to, body });
    return { success: true, mock: true };
  }
  const msg = await client.messages.create({ to, from: TWILIO_FROM, body });
  return { success: true, sid: msg.sid };
}

async function makeCall(to, twimlUrl) {
  if (!client) {
    recordMock('call', { to, twimlUrl });
    return { success: true, mock: true };
  }
  const call = await client.calls.create({ to, from: TWILIO_FROM, url: twimlUrl });
  return { success: true, sid: call.sid };
}

function isConfigured() { return configured; }

module.exports = { sendSMS, makeCall, isConfigured };
