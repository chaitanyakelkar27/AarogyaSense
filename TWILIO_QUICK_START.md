# Quick Twilio Setup - 5 Minute Guide

## 🎯 TL;DR - What You Need to Do

**To enable real SMS/Calls:**
1. Create `.env` file
2. Add 3 Twilio credentials
3. Restart server
4. Done!

---

## 🚀 Quick Start (Copy-Paste Ready)

### Step 1: Create `.env` file

```bash
cd /home/chirag/Downloads/spark-field
cp .env.example .env
```

### Step 2: Edit `.env` file

Open the file and add your credentials:

```bash
nano .env
```

Paste this template and fill in your values:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret
JWT_SECRET="dev-secret-change-in-production"

# Twilio (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here_32_characters"
TWILIO_PHONE_NUMBER="+1234567890"

# OpenAI (Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o-mini"
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Restart Server

```bash
npm run dev
```

---

## 🔑 Where to Get Twilio Credentials

### Option A: Already Have Twilio Account?

1. **Go to:** https://console.twilio.com
2. **Copy these 3 values:**
   - **Account SID** → Starts with "AC"
   - **Auth Token** → Click "Show" to reveal
   - **Phone Number** → From "Phone Numbers" section

### Option B: New to Twilio?

1. **Sign up (FREE):** https://www.twilio.com/try-twilio
2. **Get $15 free credit**
3. **Buy a phone number** (uses free credit):
   - Go to: Phone Numbers → Buy a Number
   - Search for country: India or USA
   - Select one with SMS + Voice
   - Click Buy
4. **Copy credentials from dashboard**

---

## 📱 Important: Phone Number Format

**Your recipient number is configured as:**
```typescript
const DEMO_ASHA_PHONE = '+918779112231';
```

**Format Rules:**
- ✅ Must start with `+`
- ✅ Must have country code (91 for India)
- ✅ NO spaces, dashes, or parentheses
- ✅ Example: `+918779112231`
- ❌ Wrong: `+91 8779112231` (space)
- ❌ Wrong: `8779112231` (no country code)

**I've already fixed the format for you!** ✅

---

## 🧪 How to Test

### Test 1: Check Console Logs

**Without Twilio configured (MOCK mode):**
```bash
[TWILIO MOCK] SMS would be sent: {...}
```

**With Twilio configured (Production mode):**
```bash
SMS sent successfully: { success: true, messageId: 'SM123...' }
```

### Test 2: Create Test Case

1. **Start server:** `npm run dev`
2. **Open:** http://localhost:5173/chw
3. **Create case** with HIGH risk:
   - Enter patient details
   - Chat: "Patient has chest pain and breathing difficulty"
   - AI will assess as HIGH risk
   - Click Submit
4. **Check phone** `+918779112231` for SMS

---

## 📊 What Happens at Each Risk Level?

| Risk Level | SMS | Voice Call | Recipient |
|------------|-----|------------|-----------|
| **CRITICAL** (76-100) | ✅ Yes | ✅ Yes | +918779112231 |
| **HIGH** (51-75) | ✅ Yes | ❌ No | +918779112231 |
| **MEDIUM** (31-50) | ❌ No | ❌ No | - |
| **LOW** (0-30) | ❌ No | ❌ No | - |

---

## 🛠️ Troubleshooting

### "Twilio not configured" in console?

**Cause:** Missing `.env` file or missing credentials

**Fix:**
```bash
# Check if .env exists
ls -la /home/chirag/Downloads/spark-field/.env

# If not, create it:
cp .env.example .env

# Then add credentials and restart
npm run dev
```

### SMS not received?

**Check these:**
1. ✅ Phone number format correct? (no spaces)
2. ✅ Twilio credentials in `.env`?
3. ✅ Server restarted after adding credentials?
4. ✅ Twilio phone number verified? (trial accounts only)
5. ✅ Twilio account has credit?

### Still not working?

**Use MOCK mode for demo:**
- MOCK mode works perfectly for demonstrations
- Check console logs to see what would be sent
- No Twilio account needed
- Zero cost!

---

## 💰 Twilio Costs (Free Trial)

**Free Trial Includes:**
- $15 credit
- ~2000 SMS messages
- ~1150 minutes of calls

**After Trial:**
- SMS: ~₹0.60 per message
- Voice: ~₹1 per minute

**For your prototype demo, MOCK mode is FREE and sufficient!**

---

## 📝 Configuration Files

### 1. Credentials
**File:** `/home/chirag/Downloads/spark-field/.env`
```env
TWILIO_ACCOUNT_SID="ACxxxxx..."
TWILIO_AUTH_TOKEN="xxxxxxx..."
TWILIO_PHONE_NUMBER="+1234567890"
```

### 2. Recipient Phone
**File:** `/home/chirag/Downloads/spark-field/src/routes/api/alerts/send/+server.ts`
```typescript
const DEMO_ASHA_PHONE = '+918779112231';
```

### 3. Twilio Client
**File:** `/home/chirag/Downloads/spark-field/src/lib/server/twilio-client.ts`
```typescript
// Auto-loads from process.env
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
```

---

## ✅ Your Current Status

- ✅ **Recipient phone configured:** `+918779112231` (fixed format)
- ✅ **Alert system working:** SMS for HIGH, SMS+Call for CRITICAL
- ✅ **MOCK mode active:** No Twilio credentials needed for demo
- ⚪ **Optional:** Add Twilio credentials for real SMS/calls

---

## 🎬 Ready to Demo?

**For prototype demonstration:**
- ✅ MOCK mode is perfect - no setup needed!
- ✅ Console logs show what would be sent
- ✅ All functionality works
- ✅ Zero cost

**To enable real SMS/calls:**
- Add 3 lines to `.env` file
- Restart server
- Test and go live!

---

## 🆘 Need Help?

**Check logs:**
```bash
# See what's happening
tail -f ~/.npm/_logs/*.log
```

**Verify .env loaded:**
```bash
# In Node console
console.log(process.env.TWILIO_ACCOUNT_SID);
```

**Full documentation:** See `TWILIO_SETUP_GUIDE.md` for detailed info.
