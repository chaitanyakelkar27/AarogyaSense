# 🚀 Quick Start: AI Health Assistant

## ⚡ 5-Minute Setup

### Step 1: Get Your Free OpenAI API Key (2 minutes)

1. Visit: https://platform.openai.com/signup
2. Sign up with your email (or use Google/Microsoft login)
3. Click on your profile → "View API keys"
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)

**You get $5 free credit!** (~20,000 patient assessments)

### Step 2: Add API Key to Your Project (1 minute)

1. Open your project folder: `/path/to/your/project`
2. Find the `.env` file (create if it doesn't exist)
3. Add this line:
   ```bash
   OPENAI_API_KEY="sk-paste-your-key-here"
   ```
4. Save the file

### Step 3: Restart Your Server (30 seconds)

```bash
# Stop the server (Ctrl+C in terminal)
# Start again
npm run dev
```

### Step 4: Test It! (1 minute)

1. Open: http://localhost:5174/chw/ai
2. Login as CHW (chw@demo.com / demo123)
3. Fill in patient info
4. Click "Start AI Assessment"
5. Watch the AI ask intelligent questions! 🎉

---

## 📊 What You Get

✅ **Intelligent Question Flow**
- AI asks 5-6 targeted questions based on symptoms
- Adapts questions based on patient responses
- Focuses on critical symptoms first

✅ **Automatic Risk Assessment**
- Risk score from 0-100
- Priority classification (Low/Medium/High/Critical)
- Clear recommendations for next steps

✅ **Auto-Escalation**
- High/Critical cases → Escalated to Clinician
- Medium cases → Escalated to ASHA
- Low cases → Basic care instructions

✅ **Beautiful Chat UI**
- Real-time conversation with AI
- Typing indicators when AI is thinking
- Clean, mobile-friendly interface

---

## 💰 Cost Breakdown

**Free Tier**: $5 credit = ~20,000 assessments
**Paid Usage** (after free credit):
- $0.00024 per assessment (~0.024 cents)
- **1,000 assessments = $0.24/month** ✨

Extremely affordable for production use!

---

## 🎯 Example Conversation

**AI:** "Hello! I'm your AI health assistant. Can you describe the patient's main complaint?"

**You:** "Patient has fever and headache"

**AI:** "What is the patient's temperature in °F?"

**You:** "104°F"

**AI:** "How long has the fever been present?"

**You:** "3 days"

**AI:** "Are there any other symptoms like difficulty breathing or chest pain?"

**You:** "Some difficulty breathing"

**AI Assessment:**
- 🚨 **Risk Score:** 78/100
- **Priority:** CRITICAL (5)
- **Action:** Immediate escalation to clinician
- **Recommendation:** "Patient shows signs of severe respiratory infection with high fever. Requires immediate medical attention and possible hospitalization."

---

## ❓ Troubleshooting

**"OpenAI API key not configured"**
→ Add `OPENAI_API_KEY` to your `.env` file

**"Invalid API key"**
→ Check that your key starts with `sk-`
→ Make sure you copied the full key

**AI responses are slow**
→ Normal! AI takes 2-5 seconds to think
→ Switch to `gpt-4o-mini` for faster responses

**Quota exceeded**
→ Add billing method at https://platform.openai.com/account/billing
→ Or wait for monthly free tier reset

---

## 🔒 Security

✅ API key is **server-side only** - never exposed to browser
✅ Patient data **not stored** by OpenAI
✅ Conversation history saved in **your database only**

---

## 📚 Full Documentation

See: `AI_ASSISTANT_SETUP.md` for complete guide

---

## 🎉 You're Ready!

The AI assistant is fully functional and ready to use. Just add your API key and start assessing patients with intelligent AI support!

**Need help?** Check the full documentation or server logs for errors.
