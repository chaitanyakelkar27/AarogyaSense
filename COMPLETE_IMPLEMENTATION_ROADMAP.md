# Complete System Implementation Plan
## AarogyaSense - Multimodal AI Health Platform

**Current Status:** Basic AI chat interface ✅  
**Target:** Full offline-capable, multimodal health monitoring system

---

## 🎯 System Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    CHW MOBILE APP (Offline-First)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Photo Capture  │  Voice Input  │  Vitals  │  Symptoms   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           On-Device AI (TensorFlow Lite / ONNX)          │  │
│  │  • Image Analysis  • Voice-to-Text  • Risk Scoring       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Immediate Action Layer                      │  │
│  │  • High Risk Alert  • SMS/Call  • Preventive Guidance    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Local Storage (IndexedDB / SQLite)                │  │
│  │  • Queue for sync  • Offline persistence                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↓ (When Online)
┌────────────────────────────────────────────────────────────────┐
│                     BACKEND (Cloud / Edge)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Data Ingestion & Triage (FastAPI)              │  │
│  │  POST /api/cases  •  Encrypted JWT  •  Audit Logs        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Model-Based Re-Verification (AI Ensemble)        │  │
│  │  • Validate CHW assessment  • Multi-model consensus      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Task Routing & Case Management                  │  │
│  │  • ASHA Dashboard  • Clinician Review  • Follow-ups      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│              WEB DASHBOARDS (PWA - React/SvelteKit)           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  ASHA Portal    │  │ Clinician Portal│  │ Admin Portal  │  │
│  │ • Alerts        │  │ • Diagnosis     │  │ • Analytics   │  │
│  │ • Follow-ups    │  │ • Teleconsult   │  │ • Reports     │  │
│  │ • Community     │  │ • Case History  │  │ • Audit Logs  │  │
│  └─────────────────┘  └─────────────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           REMOTE PATIENT MONITORING & FOLLOW-UP                 │
│  • Vitals tracking  • AI predictions  • CHW alerts              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Phase 1: CHW Mobile App (Offline-First)

### **Tech Stack:**
- **Framework:** React Native + Expo (cross-platform)
- **Offline Storage:** SQLite + WatermelonDB (reactive)
- **Camera:** expo-camera
- **Audio:** expo-av (voice recording)
- **Bluetooth:** react-native-ble-plx

### **Features to Implement:**

#### 1.1 Multimodal Data Capture
```typescript
// src/mobile/screens/CaseCapture.tsx
interface CaseData {
  caseId: string;
  patientPhoto: string; // base64 or file URI
  voiceRecording: string; // file URI
  symptoms: string[];
  vitals: {
    temperature: number;
    bloodPressure: { systolic: number; diastolic: number };
    oxygenSaturation: number;
    heartRate: number;
    respiratoryRate: number;
  };
  capturedAt: Date;
  location: { lat: number; lng: number };
  offline: boolean;
}

// Capture flow
const captureCase = async () => {
  // 1. Take photo
  const photo = await capturePatientPhoto();
  
  // 2. Record voice symptoms
  const voice = await recordVoiceInput();
  
  // 3. Connect Bluetooth devices
  const vitals = await connectAndReadVitals();
  
  // 4. Manual symptom checklist
  const symptoms = await selectSymptoms();
  
  // 5. Store locally
  await saveToLocalDB(caseData);
  
  // 6. Run on-device AI
  const assessment = await runOfflineAI(caseData);
  
  // 7. Immediate action if high-risk
  if (assessment.risk_level === 'HIGH' || assessment.risk_level === 'CRITICAL') {
    await triggerImmediateAlerts(caseData, assessment);
  }
  
  // 8. Queue for sync
  await queueForSync(caseData);
};
```

#### 1.2 Bluetooth Health Sensors Integration
```typescript
// src/mobile/services/BluetoothService.ts
import BleManager from 'react-native-ble-manager';

class HealthSensorService {
  // Supported devices
  SUPPORTED_DEVICES = {
    BP_MONITOR: 'BP-1000',
    OXIMETER: 'OXY-500',
    GLUCOMETER: 'GLU-200',
    THERMOMETER: 'TEMP-100'
  };

  async scanAndConnect(deviceType: string) {
    const devices = await BleManager.scan();
    const targetDevice = devices.find(d => 
      d.name.includes(this.SUPPORTED_DEVICES[deviceType])
    );
    
    if (targetDevice) {
      await BleManager.connect(targetDevice.id);
      return await this.readData(targetDevice.id, deviceType);
    }
  }

  async readData(deviceId: string, deviceType: string) {
    // Read characteristics based on device type
    const data = await BleManager.read(deviceId, SERVICE_UUID, CHAR_UUID);
    return this.parseDeviceData(data, deviceType);
  }
}
```

---

## 🧠 Phase 2: On-Device AI (Edge Inference)

### **Tech Stack:**
- **TensorFlow Lite:** Image classification, object detection
- **ONNX Runtime Mobile:** Multi-modal models
- **Whisper (TFLite):** Voice-to-text
- **MediaPipe:** Face/body detection

### **Models to Deploy:**

#### 2.1 Image Analysis Model
```typescript
// src/mobile/ai/ImageAnalysis.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

class ImageAnalysisModel {
  private model: tf.GraphModel;

  async loadModel() {
    // Load TFLite model converted to TensorFlow.js
    this.model = await tf.loadGraphModel('bundleResourceIO://model/anemia_detection.json');
  }

  async analyzeImage(imageUri: string) {
    // 1. Preprocess image
    const imageTensor = await this.preprocessImage(imageUri);
    
    // 2. Run inference
    const predictions = await this.model.predict(imageTensor);
    
    // 3. Parse results
    return {
      anemiaDetected: predictions[0] > 0.7,
      confidence: predictions[0],
      findings: [
        'Pale conjunctiva detected',
        'Recommended: Hemoglobin test'
      ]
    };
  }

  async detectRash(imageUri: string) {
    // Skin condition detection
    // Returns: rash type, severity, urgency
  }

  async analyzeWound(imageUri: string) {
    // Wound assessment
    // Returns: infection risk, healing stage
  }
}
```

#### 2.2 Voice-to-Text + Symptom Extraction
```typescript
// src/mobile/ai/VoiceAnalysis.ts
import { Audio } from 'expo-av';
import Whisper from '@whisper/react-native';

class VoiceAnalysisModel {
  async transcribeAndExtract(audioUri: string) {
    // 1. Voice-to-text (Whisper)
    const transcript = await Whisper.transcribe(audioUri, {
      language: 'hi-IN', // Hindi + English
      task: 'transcribe'
    });
    
    // 2. Symptom extraction (local NLP)
    const symptoms = await this.extractSymptoms(transcript);
    
    // 3. Sentiment analysis (detect pain/distress)
    const sentiment = await this.analyzeSentiment(transcript);
    
    return {
      transcript,
      symptoms,
      distressLevel: sentiment.distressScore
    };
  }

  private async extractSymptoms(text: string): Promise<string[]> {
    // Simple keyword matching for offline
    const symptomKeywords = {
      'fever': ['बुखार', 'fever', 'तापमान'],
      'cough': ['खांसी', 'cough', 'कफ'],
      'headache': ['सिरदर्द', 'headache', 'head pain'],
      // ... 100+ symptoms mapped
    };
    
    const detected = [];
    for (const [symptom, keywords] of Object.entries(symptomKeywords)) {
      if (keywords.some(k => text.toLowerCase().includes(k))) {
        detected.push(symptom);
      }
    }
    return detected;
  }
}
```

#### 2.3 Multimodal Risk Scoring
```typescript
// src/mobile/ai/RiskScoring.ts
class RiskScoringModel {
  async calculateRisk(inputs: {
    imageFindings: any;
    voiceTranscript: string;
    symptoms: string[];
    vitals: VitalsData;
    patientHistory: any;
  }) {
    let riskScore = 0;
    let factors = [];

    // 1. Vital signs scoring
    if (inputs.vitals.temperature > 103) {
      riskScore += 30;
      factors.push('High fever');
    }
    if (inputs.vitals.oxygenSaturation < 90) {
      riskScore += 40;
      factors.push('Low oxygen saturation');
    }
    if (inputs.vitals.bloodPressure.systolic > 180) {
      riskScore += 35;
      factors.push('Severe hypertension');
    }

    // 2. Symptom-based scoring
    const redFlagSymptoms = [
      'chest pain', 'difficulty breathing', 'unconscious',
      'severe bleeding', 'seizure'
    ];
    const hasRedFlag = inputs.symptoms.some(s => 
      redFlagSymptoms.includes(s)
    );
    if (hasRedFlag) {
      riskScore += 50;
      factors.push('Red flag symptom detected');
    }

    // 3. Image-based risk
    if (inputs.imageFindings?.anemiaDetected) {
      riskScore += 15;
      factors.push('Anemia signs detected');
    }

    // 4. Voice distress level
    if (inputs.voiceTranscript.includes('severe') || 
        inputs.voiceTranscript.includes('unbearable')) {
      riskScore += 10;
      factors.push('High distress reported');
    }

    // 5. Historical context
    if (inputs.patientHistory?.chronicConditions?.length > 0) {
      riskScore += 10;
      factors.push('Pre-existing conditions');
    }

    // Normalize to 0-100
    riskScore = Math.min(100, riskScore);

    // Determine priority and escalation
    let priority, riskLevel, escalateTo;
    if (riskScore >= 76) {
      priority = 5;
      riskLevel = 'CRITICAL';
      escalateTo = 'CLINICIAN';
    } else if (riskScore >= 51) {
      priority = 4;
      riskLevel = 'HIGH';
      escalateTo = 'CLINICIAN';
    } else if (riskScore >= 31) {
      priority = 3;
      riskLevel = 'MEDIUM';
      escalateTo = 'ASHA';
    } else {
      priority = 1;
      riskLevel = 'LOW';
      escalateTo = '';
    }

    return {
      risk_score: riskScore,
      priority,
      risk_level: riskLevel,
      escalate_to: escalateTo,
      risk_factors: factors,
      recommendations: this.generateRecommendations(riskLevel, factors)
    };
  }
}
```

---

## ⚡ Phase 3: Immediate Action Layer

### **Features:**

#### 3.1 Real-Time Alerts (SMS + Voice Calls)
```typescript
// src/mobile/services/AlertService.ts
import Twilio from 'twilio';

class ImmediateAlertService {
  async triggerHighRiskAlert(caseData: CaseData, assessment: Assessment) {
    // 1. Find nearest ASHA worker
    const ashaWorker = await this.findNearestASHA(caseData.location);
    
    // 2. Send SMS
    await this.sendSMS(ashaWorker.phone, 
      `🚨 HIGH RISK ALERT\n` +
      `Patient: ${caseData.patientName}\n` +
      `Location: ${caseData.village}\n` +
      `Risk: ${assessment.risk_score}/100\n` +
      `Action: ${assessment.recommendations}`
    );
    
    // 3. Make voice call (if critical)
    if (assessment.risk_level === 'CRITICAL') {
      await this.makeVoiceCall(ashaWorker.phone, 
        'This is an emergency alert from AarogyaSense. ' +
        'A critical patient case requires immediate attention.'
      );
    }
    
    // 4. Push notification to ASHA app
    await this.sendPushNotification(ashaWorker.deviceToken, {
      title: '🚨 Critical Patient Alert',
      body: `${caseData.patientName} needs immediate attention`,
      data: { caseId: caseData.caseId }
    });
    
    // 5. Update case status
    await this.updateCaseStatus(caseData.caseId, 'ALERT_SENT');
  }

  async sendSMS(phoneNumber: string, message: string) {
    const client = new Twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to: phoneNumber
    });
  }

  async makeVoiceCall(phoneNumber: string, message: string) {
    const client = new Twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.calls.create({
      url: `https://api.aarogyasense.com/voice/alert?message=${encodeURIComponent(message)}`,
      to: phoneNumber,
      from: TWILIO_PHONE
    });
  }
}
```

#### 3.2 On-Screen Preventive Guidance
```typescript
// src/mobile/screens/PreventiveGuidance.tsx
const PreventiveGuidanceScreen = ({ assessment, symptoms }) => {
  const guidance = generateGuidance(assessment, symptoms);
  
  return (
    <ScrollView>
      <Card>
        <Title>Immediate Actions</Title>
        <Steps>
          {guidance.immediateActions.map((action, i) => (
            <Step key={i} number={i+1}>
              <Icon name={action.icon} />
              <Text>{action.text}</Text>
              <Audio src={action.audioGuide} /> {/* Voice guidance */}
            </Step>
          ))}
        </Steps>
      </Card>

      <Card>
        <Title>Home Care Instructions</Title>
        <InstructionsList>
          <Instruction icon="💊">
            <Strong>Medication:</Strong>
            <Text>{guidance.medication}</Text>
          </Instruction>
          <Instruction icon="🍲">
            <Strong>Diet:</Strong>
            <Text>{guidance.diet}</Text>
          </Instruction>
          <Instruction icon="🧘">
            <Strong>Lifestyle:</Strong>
            <Text>{guidance.lifestyle}</Text>
          </Instruction>
        </InstructionsList>
      </Card>

      <Card>
        <Title>Warning Signs - Seek Help If:</Title>
        <WarningsList>
          {guidance.warningSigns.map((sign, i) => (
            <WarningItem key={i} critical={sign.critical}>
              <Icon name="⚠️" />
              <Text>{sign.text}</Text>
            </WarningItem>
          ))}
        </WarningsList>
      </Card>

      <Button 
        onPress={() => shareGuidance(guidance)}
        icon="share"
      >
        Share with Patient
      </Button>
    </ScrollView>
  );
};

function generateGuidance(assessment: Assessment, symptoms: string[]) {
  const templates = {
    fever: {
      immediateActions: [
        { icon: 'thermometer', text: 'Take temperature every 4 hours', audioGuide: '/audio/fever_temp.mp3' },
        { icon: 'water', text: 'Drink plenty of fluids (8-10 glasses)', audioGuide: '/audio/fever_fluids.mp3' },
        { icon: 'medicine', text: 'Paracetamol 500mg if temp > 100°F', audioGuide: '/audio/fever_med.mp3' }
      ],
      medication: 'Paracetamol 500mg every 6 hours. Maximum 4 doses per day.',
      diet: 'Light, easily digestible food. Soups, khichdi, fruits. Avoid spicy food.',
      lifestyle: 'Complete bed rest. Avoid exertion. Sleep 8+ hours.',
      warningSigns: [
        { text: 'Fever > 103°F for more than 2 days', critical: true },
        { text: 'Difficulty breathing', critical: true },
        { text: 'Severe headache with vomiting', critical: true },
        { text: 'Rash or bleeding', critical: true },
        { text: 'Confusion or drowsiness', critical: true }
      ]
    },
    // ... templates for 50+ conditions
  };
  
  // Match symptoms to templates
  return templates[symptoms[0]] || templates.default;
}
```

---

## 🔄 Phase 4: Offline Sync & Queue Management

### **Implementation:**

#### 4.1 Offline Storage with Sync Queue
```typescript
// src/mobile/db/OfflineSync.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

class OfflineSyncManager {
  private db: Database;
  private syncQueue: SyncQueue;

  async initDatabase() {
    const adapter = new SQLiteAdapter({
      schema: appSchema,
      dbName: 'aarogya_offline'
    });
    
    this.db = new Database({
      adapter,
      modelClasses: [Case, Patient, Assessment, Media]
    });
  }

  async saveCase(caseData: CaseData) {
    await this.db.write(async () => {
      // Save case
      const caseRecord = await this.db.collections
        .get('cases')
        .create(case => {
          case.caseId = caseData.caseId;
          case.patientData = JSON.stringify(caseData.patient);
          case.symptoms = JSON.stringify(caseData.symptoms);
          case.vitals = JSON.stringify(caseData.vitals);
          case.assessmentResult = JSON.stringify(caseData.assessment);
          case.syncStatus = 'PENDING';
          case.createdAt = Date.now();
        });

      // Save media files
      await this.saveMedia(caseData.photo, caseData.caseId, 'photo');
      await this.saveMedia(caseData.voice, caseData.caseId, 'voice');
      
      // Add to sync queue
      await this.syncQueue.enqueue(caseRecord.id);
    });
  }

  async syncWhenOnline() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processSyncQueue();
      }
    });
  }

  private async processSyncQueue() {
    const pendingCases = await this.db.collections
      .get('cases')
      .query(Q.where('sync_status', 'PENDING'))
      .fetch();

    for (const caseRecord of pendingCases) {
      try {
        // 1. Upload media files first
        const photoUrl = await this.uploadFile(caseRecord.photoPath);
        const voiceUrl = await this.uploadFile(caseRecord.voicePath);

        // 2. Sync case data
        const response = await fetch('https://api.aarogyasense.com/api/cases', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...caseRecord.data,
            photoUrl,
            voiceUrl
          })
        });

        if (response.ok) {
          // Mark as synced
          await caseRecord.update(c => {
            c.syncStatus = 'SYNCED';
            c.syncedAt = Date.now();
          });

          // Clear local media (optional)
          await this.clearLocalMedia(caseRecord.id);
        }
      } catch (error) {
        console.error('Sync failed:', error);
        // Retry later
        await caseRecord.update(c => {
          c.syncRetries = (c.syncRetries || 0) + 1;
          c.syncStatus = c.syncRetries > 3 ? 'FAILED' : 'PENDING';
        });
      }
    }
  }

  private async uploadFile(filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', {
      uri: filePath,
      type: 'image/jpeg',
      name: 'upload.jpg'
    });

    const response = await fetch('https://api.aarogyasense.com/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: formData
    });

    const { url } = await response.json();
    return url;
  }
}
```

---

## 🖥️ Phase 5: Backend Processing (FastAPI)

### **Tech Stack:**
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL + TimescaleDB (time-series vitals)
- **Queue:** Redis + Celery (async tasks)
- **AI Models:** PyTorch + Hugging Face Transformers
- **Storage:** S3 / MinIO (media files)

### **Backend Structure:**

```python
# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import asyncio

app = FastAPI(title="AarogyaSense API")
security = HTTPBearer()

@app.post("/api/cases")
async def create_case(
    case_data: CaseCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # 1. Verify JWT token
    user = verify_token(credentials.credentials)
    
    # 2. Save case to database
    case = Case(
        case_id=case_data.case_id,
        chw_id=user.id,
        patient_data=case_data.patient,
        symptoms=case_data.symptoms,
        vitals=case_data.vitals,
        edge_assessment=case_data.assessment,
        status="PENDING_REVIEW"
    )
    db.add(case)
    db.commit()
    
    # 3. Trigger async backend AI re-verification
    task = celery.send_task('tasks.reverify_case', args=[case.id])
    
    # 4. Route to appropriate dashboard
    await route_case_to_dashboard(case)
    
    # 5. Create audit log
    create_audit_log(user.id, "CASE_CREATED", case.id)
    
    return {"success": True, "case_id": case.id}

# Backend AI Re-verification
@celery.task
def reverify_case(case_id: int):
    case = get_case(case_id)
    
    # 1. Load ensemble models
    model1 = load_model("disease_classifier_v2")
    model2 = load_model("risk_predictor_v3")
    
    # 2. Re-analyze with more powerful models
    features = extract_features(case)
    predictions = {
        'model1': model1.predict(features),
        'model2': model2.predict(features),
        'edge': case.edge_assessment
    }
    
    # 3. Ensemble voting
    final_assessment = ensemble_vote(predictions)
    
    # 4. Update case if significant difference
    if abs(final_assessment.risk_score - case.edge_assessment.risk_score) > 15:
        case.backend_assessment = final_assessment
        case.needs_review = True
        notify_clinician(case.id)
    
    db.commit()

# Task Routing
async def route_case_to_dashboard(case: Case):
    assessment = case.edge_assessment
    
    if assessment.priority >= 4:
        # High/Critical → Clinician
        await notify_clinician(case)
    elif assessment.priority == 3:
        # Medium → ASHA
        await notify_asha(case)
    else:
        # Low → CHW follow-up only
        await schedule_chw_followup(case)

# Notifications
async def notify_clinician(case: Case):
    clinician = assign_clinician(case.location)
    
    # WebSocket notification
    await websocket_manager.send_message(
        clinician.id,
        {"type": "NEW_CASE", "data": case.to_dict()}
    )
    
    # Email notification
    await send_email(
        clinician.email,
        f"New High-Priority Case: {case.patient_name}",
        render_template("case_alert.html", case=case)
    )
    
    # SMS (if critical)
    if case.edge_assessment.priority == 5:
        await send_sms(
            clinician.phone,
            f"🚨 CRITICAL: {case.patient_name} ({case.village}). Login to review."
        )
```

---

## 📊 Phase 6: Web Dashboards (PWA)

### **Enhanced Features:**

#### 6.1 Clinician Review Dashboard
```typescript
// src/routes/clinician/cases/[id]/+page.svelte
<script lang="ts">
  let case = $state<Case>();
  let assessment = $state<Assessment>();
  let media = $state<Media[]>([]);
  let aiConfidence = $state(0);

  onMount(async () => {
    case = await apiClient.cases.get(params.id);
    assessment = case.assessments[0];
    media = await apiClient.media.list(case.id);
    
    // Load AI confidence comparison
    aiConfidence = compareEdgeAndBackendAI(case);
  });

  async function validateDiagnosis() {
    // Clinician validates or overrides AI
    await apiClient.cases.validate(case.id, {
      validated: true,
      finalDiagnosis: selectedDiagnosis,
      treatment: treatmentPlan
    });
  }

  async function requestTeleconsult() {
    // Start video call with patient
    await initiateVideoCall(case.patient.phone);
  }
</script>

<div class="clinician-review-layout">
  <!-- Left Panel: Patient Data -->
  <section class="patient-panel">
    <PatientCard {case} />
    
    <!-- Image Analysis -->
    <ImageGallery images={media.filter(m => m.type === 'photo')}>
      {#each media as image}
        <Image src={image.url}>
          <!-- Overlay AI annotations -->
          {#if image.aiAnnotations}
            <AIOverlay annotations={image.aiAnnotations} />
          {/if}
        </Image>
      {/each}
    </ImageGallery>

    <!-- Voice Transcript -->
    <VoiceTranscript 
      audio={media.find(m => m.type === 'voice')}
      transcript={case.voiceTranscript}
    />

    <!-- Vitals Chart -->
    <VitalsTimeline vitals={case.vitalsHistory} />
  </section>

  <!-- Center Panel: AI Assessment -->
  <section class="assessment-panel">
    <AIAssessmentCard>
      <ComparisonView>
        <Column title="Edge AI (On-Device)">
          <RiskScore score={case.edgeAssessment.risk_score} />
          <Priority level={case.edgeAssessment.priority} />
          <Symptoms list={case.edgeAssessment.symptoms} />
        </Column>
        
        <Column title="Backend AI (Re-verification)">
          <RiskScore score={case.backendAssessment?.risk_score} />
          <Priority level={case.backendAssessment?.priority} />
          {#if Math.abs(case.edgeAssessment.risk_score - case.backendAssessment?.risk_score) > 15}
            <Alert type="warning">
              Significant discrepancy detected. Manual review recommended.
            </Alert>
          {/if}
        </Column>
      </ComparisonView>

      <ConfidenceIndicator score={aiConfidence} />
    </AIAssessmentCard>

    <!-- Diagnosis Interface -->
    <DiagnosisForm>
      <ICDCodeSearch bind:selected={selectedDiagnosis} />
      <TreatmentBuilder bind:plan={treatmentPlan} />
      <PrescriptionGenerator diagnosis={selectedDiagnosis} />
    </DiagnosisForm>

    <ActionButtons>
      <Button onclick={validateDiagnosis} primary>
        ✅ Validate Diagnosis
      </Button>
      <Button onclick={requestTeleconsult} secondary>
        📹 Teleconsult
      </Button>
    </ActionButtons>
  </section>

  <!-- Right Panel: History & Context -->
  <section class="context-panel">
    <PatientHistory patientId={case.patient.id} />
    <FamilyHistory familyId={case.patient.familyId} />
    <CommunityHealthStats village={case.village} />
  </section>
</div>
```

---

## 🔄 Phase 7: Remote Patient Monitoring

### **Implementation:**

```typescript
// src/services/RemoteMonitoring.ts
class RemotePatientMonitoring {
  async trackPatient(patientId: string) {
    // 1. Set up vitals tracking
    const tracker = new VitalsTracker(patientId);
    
    // 2. Schedule follow-ups
    await scheduleFollowUps(patientId, [
      { after: '24h', type: 'VITALS_CHECK' },
      { after: '48h', type: 'SYMPTOM_REVIEW' },
      { after: '7days', type: 'FULL_ASSESSMENT' }
    ]);
    
    // 3. AI-based deterioration prediction
    const predictorModel = new HealthDeteriorationPredictor();
    
    // Monitor vitals trends
    tracker.on('vitals_update', async (vitals) => {
      // Predict if patient will deteriorate
      const prediction = await predictorModel.predict({
        currentVitals: vitals,
        historicalData: await getPatientHistory(patientId),
        diagnosis: await getCurrentDiagnosis(patientId)
      });
      
      if (prediction.deteriorationRisk > 0.7) {
        // Alert CHW
        await alertCHW(patientId, {
          type: 'DETERIORATION_WARNING',
          risk: prediction.deteriorationRisk,
          factors: prediction.riskFactors,
          recommendedActions: prediction.actions
        });
      }
    });
  }

  async scheduleFollowUps(patientId: string, schedule: FollowUp[]) {
    for (const followUp of schedule) {
      await createScheduledTask({
        patientId,
        type: followUp.type,
        scheduledAt: Date.now() + parseTimeString(followUp.after),
        assignedTo: await getCHW(patientId)
      });
    }
  }
}

class HealthDeteriorationPredictor {
  private model: any;

  async predict(data: {
    currentVitals: Vitals;
    historicalData: HistoricalData[];
    diagnosis: string;
  }) {
    // Time-series analysis
    const trend = this.analyzeTrend(data.historicalData);
    
    // Risk factors
    const riskFactors = [];
    
    // Worsening vitals
    if (trend.temperature.direction === 'increasing') {
      riskFactors.push('Temperature trending upward');
    }
    if (trend.oxygenSaturation.direction === 'decreasing') {
      riskFactors.push('Oxygen saturation declining');
    }
    
    // Calculate overall deterioration risk
    const deteriorationRisk = await this.model.predict({
      trend,
      vitals: data.currentVitals,
      diagnosis: data.diagnosis
    });
    
    return {
      deteriorationRisk,
      riskFactors,
      actions: this.generateActions(deteriorationRisk, riskFactors)
    };
  }

  private generateActions(risk: number, factors: string[]) {
    if (risk > 0.8) {
      return [
        'Immediate medical attention required',
        'Transport to nearest hospital',
        'Call ambulance if available'
      ];
    } else if (risk > 0.5) {
      return [
        'Schedule urgent clinician review',
        'Monitor vitals every 4 hours',
        'Consider medication adjustment'
      ];
    } else {
      return [
        'Continue current treatment',
        'Monitor daily',
        'Follow-up in 48 hours'
      ];
    }
  }
}
```

---

## 📈 Implementation Phases & Timeline

### **Phase 1 (Months 1-2): Foundation**
- ✅ Basic AI chat (DONE)
- ⏳ Mobile app scaffold (React Native + Expo)
- ⏳ Offline storage (SQLite + WatermelonDB)
- ⏳ Photo/voice capture

### **Phase 2 (Months 3-4): AI Integration**
- ⏳ Deploy TFLite models
- ⏳ Image analysis (anemia, rash detection)
- ⏳ Voice-to-text (Whisper)
- ⏳ Multimodal risk scoring

### **Phase 3 (Months 5-6): Connectivity**
- ⏳ Bluetooth sensor integration
- ⏳ Offline sync queue
- ⏳ Backend API (FastAPI)
- ⏳ SMS/voice alerts (Twilio)

### **Phase 4 (Months 7-8): Dashboards**
- ⏳ Enhanced clinician portal
- ⏳ ASHA dashboard
- ⏳ Admin analytics
- ⏳ Teleconsult integration

### **Phase 5 (Months 9-10): Monitoring**
- ⏳ Remote patient monitoring
- ⏳ Deterioration prediction
- ⏳ Automated follow-ups
- ⏳ Continuous care loops

### **Phase 6 (Months 11-12): Testing & Deployment**
- ⏳ Field testing
- ⏳ Model fine-tuning
- ⏳ Performance optimization
- ⏳ Production deployment

---

## 🛠️ Immediate Next Steps

### **Week 1-2: Fix Current Implementation**
1. ✅ Fix AI scoring (DONE - updated prompt)
2. Test with various symptom scenarios
3. Validate risk scores are accurate

### **Week 3-4: Mobile App Setup**
1. Initialize React Native + Expo project
2. Set up navigation structure
3. Create basic case capture screen
4. Implement photo/voice capture

### **Month 2: Edge AI Proof-of-Concept**
1. Deploy simple TFLite model
2. Test on-device inference
3. Measure latency and accuracy
4. Optimize model size

---

## 📚 Resources & Documentation

### **Technologies to Learn:**
- TensorFlow Lite: https://www.tensorflow.org/lite
- React Native: https://reactnative.dev/
- WatermelonDB: https://watermelondb.dev/
- FastAPI: https://fastapi.tiangolo.com/
- Twilio: https://www.twilio.com/docs

### **AI Models:**
- Anemia detection: https://github.com/anemia-detection
- Skin condition: DermNet dataset
- Voice emotion: Wav2Vec2
- Risk scoring: Custom ensemble

---

## 🎯 Success Metrics

### **Technical KPIs:**
- Offline functionality: >95% uptime
- AI accuracy: >90% (vs clinician baseline)
- Sync success rate: >98%
- Response time: <3 seconds (on-device AI)

### **Health Outcomes:**
- Early detection rate: +40%
- False positive rate: <10%
- Time to treatment: -50%
- Patient satisfaction: >85%

---

**Current Status:** ✅ AI Chat Working (with fixed scoring)  
**Next Milestone:** Mobile App with Multimodal Capture  
**Timeline:** 12 months to full deployment  
**Priority:** Fix scoring → Mobile app → Edge AI → Full system
