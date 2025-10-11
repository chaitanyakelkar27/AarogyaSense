const path = require('path');
const fs = require('fs');

const dbFile = path.join(__dirname, 'data', 'db.json');
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function read() {
  if (!fs.existsSync(dbFile)) {
    const initial = { alerts: [], logs: [], lastId: 0 };
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(dbFile, 'utf8');
  try { return JSON.parse(raw); } catch (e) { return { alerts: [], logs: [], lastId: 0 }; }
}

function write(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }

function init() { read(); }

function insertAlert(data) {
  const db = read();
  db.lastId = (db.lastId || 0) + 1;
  const id = db.lastId;
  const now = new Date().toISOString();
  const alert = { id, patient_name: data.patient_name, area: data.area, severity: data.severity, details: data.details||'', created_at: now, verified_by: null, verified_at: null };
  db.alerts.push(alert);
  write(db);
  return { lastInsertRowid: id };
}

function getAlerts() {
  const db = read();
  return [...db.alerts].sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
}

function getAlertById(id) { const db = read(); return db.alerts.find(a=>a.id===Number(id)); }

function verifyAlert(id, ashaId) { const db=read(); const a=db.alerts.find(x=>x.id===Number(id)); if(!a) return null; a.verified_by=ashaId; a.verified_at=new Date().toISOString(); write(db); return a; }

function insertLog(alertId, ashaId, note) { const db=read(); const id = db.logs.length? db.logs[db.logs.length-1].id+1:1; const now=new Date().toISOString(); const log={ id, alert_id:Number(alertId), asha_id:ashaId, note, created_at:now }; db.logs.push(log); write(db); return log; }

function getLogsForAlert(alertId) { const db=read(); return db.logs.filter(l=>l.alert_id===Number(alertId)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); }

function recordDelivery(alertId, channel, to, status, meta) {
  const db = read();
  db.deliveries ||= [];
  const id = db.deliveries.length ? db.deliveries[db.deliveries.length-1].id + 1 : 1;
  const now = new Date().toISOString();
  const rec = { id, alert_id: Number(alertId), channel, to, status, meta: meta || null, created_at: now };
  db.deliveries.push(rec);
  write(db);
  return rec;
}

function getDeliveries(alertId) {
  const db = read();
  db.deliveries ||= [];
  return db.deliveries.filter(d => d.alert_id === Number(alertId)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
}

module.exports = { init, insertAlert, getAlerts, getAlertById, verifyAlert, insertLog, getLogsForAlert, recordDelivery, getDeliveries };
