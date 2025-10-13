# 📞 PHONE NUMBERS EXPLAINED - TWO DIFFERENT NUMBERS

## 🎯 Quick Answer

You need **TWO** phone numbers:

### 1️⃣ **TWILIO_PHONE_NUMBER** (Sender - FROM)
- **What:** The phone number you BUY from Twilio
- **Purpose:** This is the number that SENDS the SMS/Call
- **Where:** Add to `.env` file
- **Format:** `+1234567890` (E.164 format)
- **Example:** `+15551234567` (US number from Twilio)

### 2️⃣ **DEMO_ASHA_PHONE** (Recipient - TO)
- **What:** Your personal phone number or ASHA worker's number
- **Purpose:** This is the number that RECEIVES the SMS/Call
- **Where:** Hardcoded in `/src/routes/api/alerts/send/+server.ts` (Line 8)
- **Format:** `+918779112231` (Your current number)
- **Example:** `+918779112231` (Your India number)

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  HIGH/CRITICAL Risk Case Created                                       │
│                ↓                                                        │
│  System Triggers Alert                                                 │
│                ↓                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  FROM: TWILIO_PHONE_NUMBER (from .env)                          │  │
│  │        ↓                                                         │  │
│  │  Example: +15551234567 (Twilio number)                          │  │
│  │                                                                  │  │
│  │        📱 SMS/CALL SENT                                          │  │
│  │                                                                  │  │
│  │  TO: DEMO_ASHA_PHONE (hardcoded in alert endpoint)              │  │
│  │        ↓                                                         │  │
│  │  Example: +918779112231 (Your/ASHA's phone)                     │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Your Phone Receives: "HIGH RISK ALERT: Patient Raj Kumar..."          │
│  Caller ID Shows: +15551234567 (Twilio number)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Locations

### Location 1: `.env` File (SENDER NUMBER)
```bash
# This is the number FROM Twilio that SENDS messages
TWILIO_PHONE_NUMBER="+15551234567"  # ← Replace with YOUR Twilio number
```

**How to get this:**
1. Go to https://console.twilio.com
2. Phone Numbers → Buy a Number
3. Select country (India `+91` or USA `+1`)
4. Buy number (uses free credit)
5. Copy that number to `.env`

### Location 2: Alert Endpoint (RECIPIENT NUMBER)
**File:** `/src/routes/api/alerts/send/+server.ts` (Line 8)

```typescript
// This is YOUR phone number that RECEIVES alerts
const DEMO_ASHA_PHONE = '+918779112231'; // ← Replace with recipient's number
```

---

## 📝 Real Example Setup

### Step 1: Get Twilio Number
```
Sign up at Twilio → Get free $15 credit
Buy a number: +15551234567 (example US number)
OR: +919876543210 (example India number)
```

### Step 2: Configure `.env`
```bash
# Sender number (FROM Twilio)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+12345678"  # ← Number you bought from Twilio
```

### Step 3: Configure Recipient (Optional)
**File:** `/src/routes/api/alerts/send/+server.ts` (Line 8)

**Current recipient:** `+9123456789` (Your number)

**To change recipient:**
```typescript
const DEMO_ASHA_PHONE = '+919999999999'; // New recipient number
```

---

## 🎭 Who Gets the Alert?

### Current Configuration:
- **Recipient (TO):** `+918779112231` ← **You will receive the SMS/Call**
- **Sender (FROM):** `TWILIO_PHONE_NUMBER` from `.env` ← **Your Twilio number**

### Example Alert:
```
┌─────────────────────────────────────────────────────┐
│  Your Phone: +918779112231                          │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📱 New Message from +15551234567                   │
│                                                     │
│  🚨 HIGH RISK ALERT                                 │
│                                                     │
│  Patient: Raj Kumar                                 │
│  Phone: +919876543210                               │
│  Risk Score: 65/100                                 │
│  Symptoms: Fever, headache                          │
│                                                     │
│  Immediate attention required.                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Change Recipient Number

If you want to send alerts to **someone else** (not yourself):

### Option 1: Change Hardcoded Number
Edit `/src/routes/api/alerts/send/+server.ts` line 8:

```typescript
// OLD (current - sends to YOU):
const DEMO_ASHA_PHONE = '+918779112231';

// NEW (sends to someone else):
const DEMO_ASHA_PHONE = '+919876543210'; // Replace with ASHA worker's number
```

### Option 2: Dynamic Recipient (Advanced)
The code already supports passing `ashaPhone` in the API request:

```typescript
// Line 24 of alert endpoint:
const recipientPhone = ashaPhone || DEMO_ASHA_PHONE;
```

So you can send different numbers dynamically from the CHW portal!

---

## 🧪 Testing Scenarios

### Scenario 1: Test with YOUR Number
```
TWILIO_PHONE_NUMBER="+15551234567"  (from Twilio)
DEMO_ASHA_PHONE="+918779112231"     (your number)

Result: YOU receive SMS/Call from +15551234567
```

### Scenario 2: Test with ASHA Worker's Number
```
TWILIO_PHONE_NUMBER="+15551234567"  (from Twilio)
DEMO_ASHA_PHONE="+919876543210"     (ASHA's number)

Result: ASHA receives SMS/Call from +15551234567
```

### Scenario 3: MOCK Mode (No Twilio Account)
```
No .env file or empty credentials
DEMO_ASHA_PHONE="+918779112231"

Result: Console logs only, no real SMS/Call
```

---

## ⚠️ Important Notes

### 1. Twilio Phone Number Countries
- **India numbers:** Start with `+91` (e.g., `+919876543210`)
- **USA numbers:** Start with `+1` (e.g., `+15551234567`)
- **Format:** Must be E.164 (no spaces, dashes, parentheses)

### 2. Recipient Phone Number
- Can be **ANY valid phone number** worldwide
- Does **NOT** need to be from Twilio
- Your personal number works fine: `+918779112231` ✅

### 3. Costs
- **Twilio number rental:** ~$1-2/month (after free trial)
- **SMS sent:** ~$0.01-0.02 per message
- **Voice calls:** ~$0.02-0.05 per minute
- **Free trial:** $15 credit (enough for 500+ SMS or 100+ calls)

### 4. Verification (Free Trial)
During Twilio free trial, you can only send to **verified numbers**:
1. Go to https://console.twilio.com
2. Phone Numbers → Verified Caller IDs
3. Add `+918779112231` (your number)
4. Verify via SMS code
5. Now you can receive test messages!

---

## 🎯 Summary

| Number | Purpose | Where to Configure | Example |
|--------|---------|-------------------|---------|
| **TWILIO_PHONE_NUMBER** | Sender (FROM) | `.env` file | `+15551234567` |
| **DEMO_ASHA_PHONE** | Recipient (TO) | `alert endpoint` line 8 | `+918779112231` |

**Your current setup:**
- ✅ Recipient configured: `+918779112231` (your number)
- ⚪ Sender needed: Add Twilio number to `.env`

**What happens:**
1. CHW creates HIGH/CRITICAL case
2. System sends SMS from `TWILIO_PHONE_NUMBER` (Twilio)
3. You receive SMS at `+918779112231` (your phone)
4. Caller ID shows the Twilio number

---

## 🚀 Quick Start Commands

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env and add YOUR Twilio number
nano .env

# Add this line:
# TWILIO_PHONE_NUMBER="+15551234567"  # Your Twilio number

# 3. (Optional) Change recipient number
nano src/routes/api/alerts/send/+server.ts

# Line 8: Change to recipient's number
# const DEMO_ASHA_PHONE = '+919876543210';

# 4. Start server
npm run dev

# 5. Test by creating HIGH risk case at:
# http://localhost:5173/chw
```

---

## ❓ FAQ

**Q: Can I use my personal number as TWILIO_PHONE_NUMBER?**  
A: No! You must buy a number from Twilio. Personal numbers cannot send via Twilio API.

**Q: Can I use my personal number as DEMO_ASHA_PHONE?**  
A: Yes! ✅ This is the recipient number - any valid phone works.

**Q: Do I need to buy an India number from Twilio?**  
A: No. US numbers can send to India numbers. Choose based on cost.

**Q: How do I change who receives alerts?**  
A: Edit line 8 in `/src/routes/api/alerts/send/+server.ts`

**Q: Can I send to multiple people?**  
A: Yes! Modify the code to loop through an array of phone numbers.

---

## 📞 Need Help?

Check these guides:
- `TWILIO_SETUP_GUIDE.md` - Complete setup instructions
- `TWILIO_QUICK_START.md` - 5-minute setup guide
- `TWILIO_VISUAL_GUIDE.txt` - ASCII diagrams

Or just ask me! 🚀
