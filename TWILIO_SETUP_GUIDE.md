# Twilio Configuration Guide

## 🔧 How Twilio Works in This Project

### Overview
Twilio is used to send **SMS messages** and make **voice calls** to ASHA workers when high-risk or critical cases are detected. The system works in two modes:

1. **Development Mode (MOCK)**: If Twilio credentials are NOT configured, logs messages to console
2. **Production Mode**: If Twilio credentials ARE configured, actually sends SMS and makes calls

---

## 📍 Where to Provide Twilio Credentials

### Option 1: Environment Variables File (`.env`) - **RECOMMENDED**

#### Step 1: Create `.env` file
```bash
cd /home/chirag/Downloads/spark-field
cp .env.example .env
```

#### Step 2: Edit `.env` file
Open the `.env` file and add your Twilio credentials:

```bash
# Twilio Configuration (for SMS and Voice alerts)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"

# OpenAI Configuration (also required for AI Assistant)
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o-mini"

# Database URL
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret
JWT_SECRET="dev-secret-change-in-production"
```

#### Step 3: Restart the server
```bash
npm run dev
```

---

## 🔑 How to Get Twilio Credentials

### Step 1: Sign Up for Twilio (Free Trial)
1. Go to: **https://www.twilio.com/try-twilio**
2. Sign up for a free account
3. You'll get **$15 free credit** to test SMS and calls

### Step 2: Get Your Credentials from Twilio Console

1. **Login to Twilio Console**: https://console.twilio.com
2. **Find your credentials** on the dashboard:

   ```
   📋 Account Info
   ├── Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   └── Auth Token: [Click to reveal] ********************************
   ```

3. **Copy these values** to your `.env` file

### Step 3: Get a Phone Number

1. In Twilio Console, go to: **Phone Numbers → Manage → Buy a Number**
2. Select your country (e.g., India, USA)
3. Choose a number with **SMS** and **Voice** capabilities
4. Click **Buy** (uses your free credit)
5. Copy the phone number in E.164 format: `+1234567890`
6. Add to `.env` as `TWILIO_PHONE_NUMBER`

---

## 📱 Phone Number Format

**Important:** Phone numbers MUST be in **E.164 format**:

```
+[country code][phone number without spaces or dashes]
```

### Examples:

| Country | Format | Example |
|---------|--------|---------|
| **India** | `+91XXXXXXXXXX` | `+919876543210` |
| **USA** | `+1XXXXXXXXXX` | `+12025551234` |
| **UK** | `+44XXXXXXXXXX` | `+447911123456` |
| **Australia** | `+61XXXXXXXXX` | `+61412345678` |

### Current Configuration

**Recipient Phone (ASHA Worker):**
- File: `/src/routes/api/alerts/send/+server.ts`
- Line 8: `const DEMO_ASHA_PHONE = '+91 8779112231';`

**Note:** Remove spaces from phone number:
```typescript
// ❌ Wrong (has space)
const DEMO_ASHA_PHONE = '+91 8779112231';

// ✅ Correct (no spaces)
const DEMO_ASHA_PHONE = '+918779112231';
```

---

## 🔄 How Twilio Integration Works

### Code Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CHW submits HIGH/CRITICAL case                           │
│    Location: /src/routes/chw/+page.svelte (Line 352-354)  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. sendAshaAlert() function called                          │
│    Sends POST request to /api/alerts/send                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Alert API receives request                               │
│    Location: /src/routes/api/alerts/send/+server.ts       │
│    - Formats message                                        │
│    - Determines if SMS only or SMS + Call                   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Twilio Client functions called                           │
│    Location: /src/lib/server/twilio-client.ts             │
│    - Reads credentials from process.env                     │
│    - If configured: Sends real SMS/Call via Twilio API     │
│    - If NOT configured: Logs to console (MOCK mode)        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Alert logged to database                                 │
│    - Saves alert record with status and timestamp           │
└─────────────────────────────────────────────────────────────┘
```

### Credential Loading:

```typescript
// File: /src/lib/server/twilio-client.ts (Lines 4-11)

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Initialize Twilio client
const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
	? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
	: null;
```

**Key Points:**
- Reads from `process.env` which loads from `.env` file
- If ANY credential is missing, `client` will be `null`
- When `client` is `null`, operates in MOCK mode

---

## 🧪 Testing Twilio Integration

### Test 1: Check Current Mode

**Check server console output when creating a HIGH risk case:**

#### MOCK Mode (Not Configured):
```bash
[TWILIO MOCK] SMS would be sent: {
  to: '+918779112231',
  message: 'HIGH RISK ALERT: Patient Rajesh Kumar requires urgent attention...',
  priority: 'high'
}
```

#### Production Mode (Configured):
```bash
SMS sent successfully: {
  success: true,
  messageId: 'SM1234567890abcdef'
}
```

### Test 2: Create a Test Case

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Open CHW portal:** http://localhost:5173/chw

3. **Create a HIGH risk case:**
   - Enter patient details
   - Chat with AI: "Patient has chest pain and difficulty breathing"
   - AI will assess as HIGH risk
   - Submit case

4. **Check console:**
   - MOCK mode: See `[TWILIO MOCK]` log
   - Production mode: SMS sent to `+918779112231`

5. **Check phone:**
   - You should receive SMS on the configured ASHA phone number

### Test 3: Create a CRITICAL case

1. **Chat with AI:** "Patient is unconscious with severe chest pain"
2. **AI will assess as CRITICAL risk**
3. **Submit case**
4. **Result:**
   - SMS sent
   - Voice call made (in production mode)

---

## 🛠️ Troubleshooting

### Issue 1: "Twilio not configured" error

**Cause:** Missing or incorrect credentials in `.env`

**Solution:**
1. Check `.env` file exists: `ls -la /home/chirag/Downloads/spark-field/.env`
2. Verify credentials are set:
   ```bash
   grep TWILIO .env
   ```
3. Ensure no extra spaces or quotes
4. Restart server: `npm run dev`

### Issue 2: SMS not received

**Possible Causes:**

1. **Phone number format wrong:**
   - ✅ Correct: `+918779112231`
   - ❌ Wrong: `+91 8779112231` (has space)
   - ❌ Wrong: `8779112231` (missing +91)

2. **Twilio account issues:**
   - Check credit balance in Twilio Console
   - Verify phone number is active
   - Check if number is verified (trial accounts have restrictions)

3. **Invalid "From" number:**
   - Must use a Twilio phone number you own
   - Cannot use personal number as "From"

### Issue 3: Phone number has spaces

**Current code:**
```typescript
const DEMO_ASHA_PHONE = '+91 8779112231'; // ❌ Has space
```

**Fix:**
```typescript
const DEMO_ASHA_PHONE = '+918779112231'; // ✅ No spaces
```

**How to fix:**
1. Open: `/src/routes/api/alerts/send/+server.ts`
2. Change line 8 to remove space
3. Save and restart server

---

## 📊 Twilio Trial Account Limitations

### Free Trial Restrictions:

1. **Verified Numbers Only:**
   - Trial accounts can only send to phone numbers you verify
   - Go to: Twilio Console → Phone Numbers → Verified Caller IDs
   - Add `+918779112231` as verified number

2. **Credit Limit:**
   - $15 free credit
   - SMS costs ~$0.0075 per message
   - Voice calls cost ~$0.013 per minute
   - ~2000 SMS or ~1150 minutes of calls possible

3. **Twilio Branding:**
   - Trial messages may include "Sent from a Twilio trial account"

### Upgrade to Remove Restrictions:

1. Go to: Twilio Console → Billing
2. Add payment method
3. Upgrade account
4. All restrictions removed

---

## ✅ Quick Setup Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Sign up for Twilio free trial
- [ ] Get Account SID from Twilio Console
- [ ] Get Auth Token from Twilio Console
- [ ] Buy a Twilio phone number
- [ ] Add all three credentials to `.env`
- [ ] Fix DEMO_ASHA_PHONE format (remove space)
- [ ] Verify recipient phone number in Twilio (trial only)
- [ ] Restart server: `npm run dev`
- [ ] Test with HIGH risk case
- [ ] Check phone for SMS

---

## 🔐 Environment Variables Summary

```bash
# Required for Twilio to work:
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"

# Also required for the app to work:
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="dev-secret-change-in-production"
```

---

## 📞 Current Configuration

**Your current setup:**
- **Recipient Phone:** `+918779112231` (needs space removed)
- **Twilio Status:** Not configured (MOCK mode active)
- **Mode:** Development

**To enable real SMS/Calls:**
1. Add Twilio credentials to `.env`
2. Fix phone number format (remove space)
3. Restart server

---

## 💡 Alternative: Keep MOCK Mode

If you don't want to set up Twilio right now:

**MOCK mode is perfect for development:**
- No cost
- No external dependencies
- Logs show what would be sent
- Full functionality testing without real SMS

**Just check console logs:**
```bash
[TWILIO MOCK] SMS would be sent: {...}
[TWILIO MOCK] Voice call would be made: {...}
```

This is sufficient for prototype demonstration!
