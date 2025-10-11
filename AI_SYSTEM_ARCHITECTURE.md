# AI Health Assistant - System Architecture

## 🏗️ Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                      (Browser - Frontend)                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PATIENT INFORMATION FORM                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Name: [John Doe]                                              │  │
│  │ Age: [45]  Gender: [Male ▼]                                  │  │
│  │ Phone: [+91 98765 43210]                                     │  │
│  │ Village: [Village A]                                         │  │
│  │                                                              │  │
│  │              [🚀 Start AI Assessment]                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Click Start
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CHAT INTERFACE                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🤖 Hello! Can you describe the patient's main complaint?    │  │
│  │                                                              │  │
│  │                  Patient has high fever and headache 👤     │  │
│  │                                                              │  │
│  │ 🤖 What is the patient's temperature if measured?           │  │
│  │                                                              │  │
│  │                                          104°F 👤           │  │
│  │                                                              │  │
│  │ 🤖 How long has the fever been present?                     │  │
│  │                                                              │  │
│  │                                      2 days 👤              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  [Type your answer...] [Send]                                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Each message
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  FRONTEND → BACKEND API                              │
│                                                                      │
│  POST /api/ai/chat                                                  │
│  {                                                                  │
│    messages: [                                                      │
│      { role: "user", content: "Patient has fever" },              │
│      { role: "assistant", content: "What temperature?" },         │
│      { role: "user", content: "104°F" }                           │
│    ],                                                               │
│    patientInfo: {                                                   │
│      name: "John Doe",                                             │
│      age: 45,                                                      │
│      gender: "MALE",                                               │
│      village: "Village A"                                          │
│    }                                                                │
│  }                                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND API SERVER                                      │
│       (src/routes/api/ai/chat/+server.ts)                          │
│                                                                      │
│  1. Receive request                                                 │
│  2. Validate authentication (JWT)                                   │
│  3. Check OPENAI_API_KEY exists                                    │
│  4. Build conversation with system prompt                           │
│  5. Call OpenAI API                                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      OPENAI API                                      │
│                  (platform.openai.com)                              │
│                                                                      │
│  Model: gpt-4o-mini                                                │
│  Messages:                                                          │
│    [System] You are an AI health assistant...                      │
│    [System] Patient: John Doe, Age 45, Male...                    │
│    [User] Patient has fever                                        │
│    [Assistant] What temperature?                                   │
│    [User] 104°F                                                    │
│                                                                      │
│  🧠 AI Processing:                                                  │
│    - Analyzes symptoms                                             │
│    - Considers patient context                                     │
│    - Decides next question OR provides assessment                  │
│    - Calculates risk if assessment complete                        │
│                                                                      │
│  Response:                                                          │
│    "How long has the fever been present?"                          │
│    OR                                                               │
│    { assessment_complete: true, risk_score: 78, ... }             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND PROCESSES RESPONSE                              │
│                                                                      │
│  Check if assessment complete:                                      │
│  - If NO → Return next question                                    │
│  - If YES → Parse assessment JSON                                  │
│                                                                      │
│  Return to Frontend:                                                │
│  {                                                                  │
│    success: true,                                                   │
│    message: "Next question or assessment",                         │
│    assessment_complete: true/false,                                │
│    assessment: { ... } if complete                                 │
│  }                                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FRONTEND DISPLAYS RESPONSE                              │
│                                                                      │
│  If question:                                                       │
│    → Add to chat                                                    │
│    → Wait for user response                                        │
│    → Repeat cycle                                                   │
│                                                                      │
│  If assessment complete:                                            │
│    → Show final assessment screen                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ASSESSMENT DISPLAY                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Assessment Complete                              │  │
│  │                    🚨                                         │  │
│  │         Risk Score: 82/100 - CRITICAL                        │  │
│  │                                                              │  │
│  │  Priority: CRITICAL (5)                                      │  │
│  │  Risk Level: CRITICAL                                        │  │
│  │                                                              │  │
│  │  📋 Recommendations:                                          │  │
│  │  IMMEDIATE medical attention required. Patient shows signs   │  │
│  │  of severe infection with high fever. Escalate to clinician │  │
│  │  immediately. Consider emergency transport.                  │  │
│  │                                                              │  │
│  │  🔔 Escalation Required                                      │  │
│  │  This case will be escalated to: CLINICIAN                  │  │
│  │                                                              │  │
│  │  Patient Details:                                            │  │
│  │  • Name: John Doe                                           │  │
│  │  • Age: 45                                                  │  │
│  │  • Gender: MALE                                             │  │
│  │  • Priority: 5/5                                            │  │
│  │                                                              │  │
│  │  [✅ Submit Case]    [🔄 New Assessment]                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Click Submit
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SAVE TO DATABASE                                        │
│                                                                      │
│  POST /api/cases                                                    │
│  {                                                                  │
│    patient: {                                                       │
│      name: "John Doe",                                             │
│      age: 45,                                                      │
│      gender: "MALE",                                               │
│      phone: "+91 98765 43210",                                    │
│      village: "Village A"                                          │
│    },                                                               │
│    symptoms: "high fever (104°F), headache, 2 days duration",     │
│    priority: 5,                                                    │
│    status: "PENDING",                                              │
│    notes: "AI Assessment: Risk Score 82/100 - CRITICAL..."        │
│  }                                                                  │
│                                                                      │
│  Prisma → SQLite Database                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AUTO-ESCALATION                                         │
│                                                                      │
│  Based on Priority:                                                 │
│  • Priority 5 (CRITICAL) → Appears in Clinician Portal            │
│  • Priority 4 (HIGH) → Appears in Clinician Portal                │
│  • Priority 3 (MEDIUM) → Appears in ASHA Portal                   │
│  • Priority 1-2 (LOW) → No escalation                             │
│                                                                      │
│  Case is now visible in:                                           │
│  ✅ CHW Portal (My Cases)                                          │
│  ✅ ASHA Portal (All Cases)                                        │
│  ✅ Clinician Portal (High Priority Cases)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Summary

```
Patient Info → Frontend Chat → Backend API → OpenAI GPT-4
                    ↑                              ↓
                    └──────── AI Response ─────────┘
                              (Questions)
                                  ↓
                            [Repeat 5-6x]
                                  ↓
                          AI Assessment
                                  ↓
                    Frontend Display → Database
                                  ↓
                          Auto-Escalation
                                  ↓
                    ASHA/Clinician Portal
```

## 🔑 Key Components

### 1. Frontend (`/chw/ai/+page.svelte`)
**Responsibilities:**
- Collect patient information
- Display chat interface
- Send messages to backend
- Show AI responses
- Display final assessment
- Submit case to database

### 2. Backend API (`/api/ai/chat/+server.ts`)
**Responsibilities:**
- Validate authentication
- Check API key configuration
- Build conversation context
- Call OpenAI API
- Parse AI responses
- Handle errors

### 3. OpenAI API
**Responsibilities:**
- Process medical context
- Generate intelligent questions
- Calculate risk scores
- Provide recommendations
- Return structured assessments

### 4. Database (Prisma + SQLite)
**Responsibilities:**
- Store case records
- Store patient information
- Track conversation history
- Enable case retrieval by portals

## 🎯 Decision Flow

```
Symptoms Described
      ↓
  ┌───┴───┐
  │  AI   │
  │Analyzes│
  └───┬───┘
      ↓
 ┌────┴────┐
 │Emergency?│
 └─┬─────┬─┘
   │     │
  Yes    No
   │     │
   ↓     ↓
Critical Medium/Low
   │     │
   ↓     ↓
Clinician ASHA/CHW
```

## 💡 Risk Calculation

```
Risk Score = Base Score + Modifiers

Base Score:
  • Chest pain: +40
  • Breathing issues: +40
  • Unconscious: +50
  • Severe bleeding: +35

Modifiers:
  • Severity (1-10): × 5
  • Fever >103°F: +30
  • Duration >5 days: +20
  • Multiple symptoms: +5 each
  • Can't perform activities: +30

Final Priority:
  0-30:  LOW (1-2)
  31-50: MEDIUM (3) → ASHA
  51-75: HIGH (4) → CLINICIAN
  76-100: CRITICAL (5) → CLINICIAN URGENT
```

## 🔒 Security Layers

```
Browser
  ↓ HTTPS
  ├─ JWT Token in localStorage
  ↓
SvelteKit Server
  ↓ Token Validation
  ├─ Role Check (CHW/ASHA/Clinician)
  ↓
API Endpoint
  ↓ Environment Variable
  ├─ OPENAI_API_KEY (server-side only)
  ↓
OpenAI API
  ↓ Encrypted Connection
  └─ Ephemeral Processing (no data retention)
```

## 📊 Cost Tracking

```
Request
  ↓
OpenAI API
  ↓
Token Count
  • Input: ~800 tokens (system + history)
  • Output: ~200 tokens (AI response)
  • Total: ~1000 tokens
  ↓
Cost Calculation
  • Input: 800 × $0.15/1M = $0.00012
  • Output: 200 × $0.60/1M = $0.00012
  • Total: ~$0.00024 per assessment
  ↓
Monthly Estimate
  • 1000 assessments = $0.24/month ✅
```

## 🎨 UI State Machine

```
Initial State
  ↓
Patient Form
  ↓ [Start Assessment]
Chat State
  ↓ [User sends message]
AI Thinking (loading)
  ↓ [AI responds]
Chat State
  ↓ [Repeat 5-6x]
Assessment State
  ↓ [Submit Case]
Success State
  ↓ [New Assessment]
Patient Form (reset)
```

## 🔧 Error Handling

```
API Call
  ↓
  ├─ No API Key?
  │  └─ Show setup instructions
  ↓
  ├─ Invalid API Key?
  │  └─ Show auth error
  ↓
  ├─ Quota Exceeded?
  │  └─ Show billing message
  ↓
  ├─ Network Error?
  │  └─ Show retry option
  ↓
  └─ Success!
     └─ Display response
```

---

## 📝 Summary

**This diagram shows:**
✅ Complete user journey from form to database
✅ AI conversation flow with real OpenAI integration
✅ Risk assessment and auto-escalation logic
✅ Security and authentication layers
✅ Cost tracking and monitoring
✅ Error handling at every step

**Key Takeaway:**
The system is **fully integrated** with real AI, not a simulation. Every question is generated by GPT-4 based on actual medical context and patient responses.
