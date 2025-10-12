# Quick Start Guide - Prototype Testing

## 🚀 Start the Application

The server is already running on **http://localhost:5173/**

If you need to restart:
```bash
cd /home/chirag/Downloads/spark-field
npm run dev
```

---

## 🧪 Test Routes

### 1. CHW Portal (Integrated AI Assessment + Image/Voice)
**URL:** http://localhost:5173/chw

**Login:**
- Email: `chw@demo.com`
- Password: `demo123`

**What to Test:**
- ✅ Upload patient images (multiple files with preview)
- ✅ Record voice notes (browser-based recording)
- ✅ AI assessment with multimodal support
- ✅ Automatic Twilio alerts for HIGH/CRITICAL cases
- ✅ View nearby ASHA workers list

---

### 2. ASHA Portal (Streamlined Case Management)
**URL:** http://localhost:5173/asha

**Login:**
- Email: `asha@demo.com`
- Password: `demo123`

**What to Test:**
- ✅ Overview tab: Shows HIGH/CRITICAL cases requiring action
- ✅ Cases tab: Shows ALL cases in the system
- ✅ Forward cases to clinician
- ✅ Mark cases as closed
- ✅ View case details with multimedia (images/audio playback)

---

### 3. Clinician Portal (Complete Diagnosis Workflow)
**URL:** http://localhost:5173/clinician

**Login:**
- Email: `clinician@demo.com`
- Password: `demo123`

**What to Test:**
- ✅ View all cases including forwarded from ASHA
- ✅ Mark cases as completed (diagnosis done)
- ✅ Mark cases as closed (no further action)
- ✅ Access full case details with images/audio/AI assessment

---

## 📋 Quick Test Scenario

### Complete Workflow Test (5 minutes)

**Step 1: Create High-Risk Case (CHW Portal)**
1. Go to http://localhost:5173/chw
2. Login as CHW
3. Fill patient info:
   - Name: "Emergency Patient"
   - Age: 45
   - Gender: Male
4. Upload any image (optional)
5. Record voice: "Patient has severe chest pain and difficulty breathing" (optional)
6. Click "Start AI Assessment"
7. When AI asks questions, respond with:
   - "Severe chest pain for 2 hours"
   - "Difficulty breathing, can't speak full sentences"
   - "Sweating profusely"
   - "Heart racing"
8. AI should score this as HIGH/CRITICAL (65-85/100)
9. Click "Submit Case"
10. ✅ Check console for Twilio alert logs (if no credentials, will show mock alert)

**Step 2: Review in ASHA Portal**
1. Go to http://localhost:5173/asha
2. Login as ASHA worker
3. Overview tab should show the high-risk case
4. Click "View Details" to see images/audio
5. Click "Forward to Clinician"
6. ✅ Case status changes to FORWARDED_TO_CLINICIAN

**Step 3: Close in Clinician Portal**
1. Go to http://localhost:5173/clinician
2. Login as Clinician
3. Find the forwarded case
4. Click "View Details"
5. Review AI assessment and multimedia
6. Click "Mark as Completed"
7. ✅ Case status changes to COMPLETED

---

## 🔧 Twilio Setup (Optional)

To test real SMS/Voice alerts:

1. **Get Twilio Credentials:**
   - Sign up at https://www.twilio.com/try-twilio
   - Get your Account SID and Auth Token
   - Buy a phone number

2. **Update .env file:**
```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"
```

3. **Update Demo ASHA Phone:**
Edit `src/routes/api/alerts/send/+server.ts`:
```typescript
const DEMO_ASHA_PHONE = '+YOUR_REAL_PHONE'; // Line 9
```

4. **Restart Server:**
```bash
npm run dev
```

5. **Test Alert:**
- Create a HIGH or CRITICAL case in CHW portal
- You should receive SMS on your phone
- For CRITICAL cases, you'll also receive a voice call

---

## 📁 Key Files Created

### New Pages:
- `/src/routes/chw/ai-new/+page.svelte` - CHW portal with image/voice
- `/src/routes/asha/new/+page.svelte` - ASHA portal streamlined
- `/src/routes/clinician/new/+page.svelte` - Clinician portal streamlined

### New APIs:
- `/src/routes/api/upload/+server.ts` - File upload handler
- `/src/routes/api/alerts/send/+server.ts` - Twilio alert sender
- `/src/routes/api/cases/update-status/+server.ts` - Case status updater

### Database:
- Schema updated with risk fields and new statuses
- Migration applied: `20251012014738_add_case_management_fields`

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Kill existing process
pkill -f "vite"
# Restart
npm run dev
```

### "Twilio not configured" error
- This is normal if you haven't added Twilio credentials
- Alerts will be logged to console in mock mode
- To fix: Add credentials to .env and restart

### Images not showing
- Check `/static/uploads/` directory exists
- Server will create it automatically on first upload
- Make sure you have write permissions

### "Case not found" error
- Make sure you're logged in with correct role
- CHW can only see their own cases
- ASHA/Clinician can see all cases

---

## 📊 Database Check

View cases in database:
```bash
cd /home/chirag/Downloads/spark-field
npx prisma studio
```

Then open: http://localhost:5555

---

## ✅ Features Checklist

Test each feature:

**CHW Portal:**
- [ ] Patient form validation works
- [ ] Image upload (multiple images)
- [ ] Voice recording (start/stop/playback)
- [ ] AI chat responds to questions
- [ ] Risk assessment displays correctly
- [ ] Nearby ASHA workers shown
- [ ] Case submits successfully
- [ ] Alert sent for high-risk cases

**ASHA Portal:**
- [ ] Overview shows high-priority cases
- [ ] Cases tab shows all cases
- [ ] View Details modal opens
- [ ] Images and audio playback work
- [ ] Forward to Clinician button works
- [ ] Mark as Closed button works
- [ ] Stats update in real-time

**Clinician Portal:**
- [ ] All cases displayed
- [ ] Forwarded cases visible
- [ ] View Details modal opens
- [ ] Images and audio accessible
- [ ] Mark as Completed works
- [ ] Mark as Closed works
- [ ] Case status updates correctly

---

## 🎬 Demo Script

For presenting to stakeholders:

1. **Start:** "This is a rural health monitoring system with AI"
2. **CHW Portal:** "Health workers can assess patients with images and voice"
3. **Show Image Upload:** "For skin conditions, wounds, etc."
4. **Show Voice Recording:** "For respiratory assessment"
5. **AI Assessment:** "AI asks intelligent questions and scores risk"
6. **High Risk Alert:** "System automatically alerts ASHA workers"
7. **ASHA Portal:** "ASHA workers review and escalate to clinicians"
8. **Clinician Portal:** "Doctors review and close cases"
9. **End:** "Complete workflow from village to hospital"

---

## 📞 Support

Check these files for more info:
- `PROTOTYPE_IMPLEMENTATION_COMPLETE.md` - Full feature documentation
- `COMPLETE_IMPLEMENTATION_ROADMAP.md` - Future enhancements
- `ARCHITECTURE.md` - System architecture

---

**Ready to test! Start with the CHW portal and follow the quick test scenario above.**
