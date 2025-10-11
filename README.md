# Aarogyasense - ASHA integration prototype

This small prototype implements the backend and a simple ASHA dashboard for the hackathon feature: ASHA Worker Integration (human-in-the-loop). It includes:
- REST endpoints to create alerts and store follow-up logs
- Server-Sent Events (SSE) to notify local ASHA dashboards by area
- SQLite persistence (using better-sqlite3)

Getting started

1. Install dependencies

```powershell
cd "C:\Users\KHUSHI SINGH\arogya"
npm install
```

2. Run server

```powershell
npm start
```

3. Open the dashboard

Open http://localhost:3000/dashboard.html in a browser. Choose area and click Connect.

4. Test creating an alert (example)

```powershell
curl -X POST http://localhost:3000/alerts -H "Content-Type: application/json" -d '{"patient_name":"Ramesh","area":"village-1","severity":"high","details":"fever and shortness of breath"}'
```

Next steps (suggestions)

- SMS & Voice alerts: integrate Twilio (or local SMS gateway) to send SMS and programmable voice calls for severe cases.
- Authentication: add ASHA login, area mapping, and permissions.
- Queueing: use a message queue (RabbitMQ) for reliable notifications and background SMS/call workers.
- Monitoring/metrics, retry logic for SMS/voice, and fallback channels.
