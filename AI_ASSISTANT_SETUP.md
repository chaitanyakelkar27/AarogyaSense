# AI Health Assistant Setup Guide

## Overview

The AI Health Assistant is a GPT-4 powered diagnostic tool that helps Community Health Workers (CHWs) assess patient conditions through intelligent conversational questions.

## Features

✅ **Real AI Integration**: Uses OpenAI's GPT-4 API for intelligent questioning
✅ **Smart Question Flow**: AI adapts questions based on patient responses (max 5-6 questions)
✅ **Automatic Risk Scoring**: AI calculates risk score (0-100) and priority level
✅ **Auto-Escalation**: High/Critical cases automatically escalated to ASHA/Clinician
✅ **Conversational UI**: Chat-style interface with real-time AI responses
✅ **Full Backend Integration**: Cases saved to database with AI assessment

## Setup Instructions

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY="sk-your-actual-key-here"
OPENAI_MODEL="gpt-4o-mini"  # or "gpt-4" for better quality (costs more)
```

**Model Options:**
- `gpt-4o-mini` - Fast, affordable ($0.15/1M input tokens, $0.60/1M output tokens)
- `gpt-4o` - High quality ($5/1M input tokens, $15/1M output tokens)
- `gpt-4-turbo` - Balanced performance and cost
- `gpt-3.5-turbo` - Fastest, cheapest (but less accurate for medical assessment)

**Recommended:** `gpt-4o-mini` for production (good balance of quality and cost)

### 3. Install Dependencies

```bash
npm install openai
```

### 4. Restart Dev Server

```bash
npm run dev
```

### 5. Test the AI Assistant

1. Navigate to `/chw/ai` or click "AI Assistant" in navigation
2. Enter patient information
3. Start assessment
4. AI will ask intelligent questions based on symptoms
5. After 5-6 questions, AI provides risk assessment and recommendations

## How It Works

### Backend API (`/api/ai/chat`)

**File:** `src/routes/api/ai/chat/+server.ts`

The backend:
1. Receives conversation history and patient info
2. Calls OpenAI API with medical assessment prompt
3. AI asks relevant questions based on symptoms
4. After sufficient information, AI returns structured assessment
5. Returns risk score, priority, symptoms, and recommendations

**System Prompt:**
- Guides AI to act as health assistant for rural India
- Focuses on RED FLAG symptoms (chest pain, breathing issues, etc.)
- Limits to 5-6 questions maximum
- Returns structured JSON assessment when complete

### Frontend (`/chw/ai/+page.svelte`)

The frontend:
1. Collects patient information (name, age, gender, location)
2. Starts AI conversation
3. Displays chat-style UI with AI and user messages
4. Sends user responses to AI backend
5. Shows loading state while AI thinks
6. Displays final assessment with risk level and recommendations
7. Submits case to database with AI notes

### Risk Classification

**CRITICAL (Priority 5)** - Risk Score 76-100
- 🚨 Immediate medical attention required
- Auto-escalate to CLINICIAN
- Emergency transport recommended
- Examples: Chest pain, severe breathing difficulty, unconsciousness

**HIGH (Priority 4)** - Risk Score 51-75
- ⚠️ Urgent medical attention needed
- Auto-escalate to CLINICIAN
- Close monitoring required
- Examples: High fever (>103°F), persistent vomiting, severe pain

**MEDIUM (Priority 3)** - Risk Score 31-50
- ⚡ Medical attention recommended
- Auto-escalate to ASHA supervisor
- Basic first aid provided
- Examples: Moderate fever, mild dehydration, chronic pain

**LOW (Priority 1-2)** - Risk Score 0-30
- ✅ Mild condition
- No escalation needed
- Basic care and health education
- Examples: Minor cold, headache, mild discomfort

## API Cost Estimation

### Per Assessment (assuming 8 messages total):

**Using gpt-4o-mini:**
- Input: ~800 tokens (system prompt + conversation) × $0.15/1M = $0.00012
- Output: ~200 tokens (AI responses) × $0.60/1M = $0.00012
- **Total per assessment: ~$0.00024 (0.024 cents)**

**Monthly cost for 1000 assessments:**
- 1000 assessments × $0.00024 = **$0.24/month**
- Very affordable! ✅

**Using gpt-4:**
- Input: ~800 tokens × $5/1M = $0.004
- Output: ~200 tokens × $15/1M = $0.003
- **Total per assessment: ~$0.007 (0.7 cents)**
- 1000 assessments = **$7/month**

## Error Handling

The system handles:
- ❌ **Missing API Key**: Shows setup instructions
- ❌ **Invalid API Key**: Shows authentication error
- ❌ **Quota Exceeded**: Shows billing/upgrade message
- ❌ **Network Errors**: Shows retry option
- ❌ **Malformed Responses**: Falls back gracefully

## Security Considerations

✅ **API Key Protection:**
- Never commit `.env` file to git
- API key only accessible on server-side
- Frontend cannot see the key

✅ **Authentication:**
- Only authenticated CHWs can access AI assistant
- Role-based access control enforced

✅ **Data Privacy:**
- Patient data not stored by OpenAI (ephemeral processing)
- Conversation history stored in local database only
- HIPAA considerations: Use OpenAI Enterprise for healthcare compliance

## Monitoring & Limits

### OpenAI Free Tier:
- $5 credit for first 3 months
- ~20,000 assessments with gpt-4o-mini
- Perfect for testing!

### Usage Tracking:
- Check usage at [OpenAI Dashboard](https://platform.openai.com/usage)
- Set spending limits in account settings
- Monitor tokens per request

### Rate Limits:
- Free tier: 3 requests/minute, 200 requests/day
- Paid tier: 3,500 requests/minute
- Upgrade to paid for production use

## Testing Without API Key

If you don't have an OpenAI API key yet, the system will:
1. Show a friendly setup error message
2. Explain how to get an API key
3. Provide documentation link
4. Allow you to retry after setup

## Production Deployment

### Environment Variables:
```bash
# Production .env
OPENAI_API_KEY="sk-prod-key-here"
OPENAI_MODEL="gpt-4o-mini"
DATABASE_URL="postgresql://..."
```

### Scaling Considerations:
- Use OpenAI Enterprise for healthcare compliance
- Implement caching for similar symptom patterns
- Add fallback to rule-based system if API fails
- Monitor costs and set budgets

## Customization

### Modify System Prompt:
Edit `src/routes/api/ai/chat/+server.ts`:
```typescript
const SYSTEM_PROMPT = `Your custom prompt here...`;
```

### Adjust Risk Scoring:
Modify the risk score thresholds in the system prompt

### Change Question Limit:
Update max questions in system prompt (default: 5-6)

### Switch AI Model:
Change `OPENAI_MODEL` in .env file

## Troubleshooting

**Issue:** "OpenAI API key not configured"
- **Solution:** Add `OPENAI_API_KEY` to `.env` file

**Issue:** "Invalid API key"
- **Solution:** Check key format (should start with `sk-`)
- Regenerate key on OpenAI platform

**Issue:** "Quota exceeded"
- **Solution:** Add billing method on OpenAI platform
- Or upgrade to paid tier

**Issue:** AI responses are slow
- **Solution:** Switch to `gpt-4o-mini` for faster responses
- Or use `gpt-3.5-turbo` (fastest but less accurate)

**Issue:** AI not asking relevant questions
- **Solution:** Modify system prompt to be more specific
- Add examples of good questions

## Support

For issues or questions:
- Check [OpenAI Documentation](https://platform.openai.com/docs)
- Review error messages in browser console
- Check server logs for API errors

## Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Test AI assistant with sample patients
3. 📊 Monitor usage and costs
4. 🔧 Customize prompts for your use case
5. 🚀 Deploy to production

---

**Status:** ✅ Fully implemented and ready to use!
**Cost:** ~$0.24/month for 1000 assessments (gpt-4o-mini)
**Setup Time:** 5 minutes
