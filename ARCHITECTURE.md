# Aarogya Health System - Architecture

## System Overview

AI-powered healthcare diagnostic and monitoring system for rural and low-resource communities with offline-first architecture, multi-modal AI diagnostics, and human-in-the-loop verification.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────┤
│  CHW Mobile App    │  ASHA Dashboard   │  Clinician Portal     │
│  (SvelteKit PWA)   │  (SvelteKit)      │  (SvelteKit)         │
│  - Offline-first   │  - Case review    │  - Diagnosis         │
│  - Camera/Voice    │  - Community      │  - Teleconsult       │
│  - Bluetooth       │    analytics      │  - Prescriptions     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EDGE AI LAYER (Client-Side)                    │
├─────────────────────────────────────────────────────────────────┤
│  • TensorFlow.js for browser-based AI inference                 │
│  • Multi-modal analysis: Image + Voice + Text                   │
│  • Risk scoring & urgency classification                         │
│  • Privacy-preserving: All inference happens locally            │
│  • Models: ONNX.js for cross-platform compatibility            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE STORAGE (IndexedDB)                   │
├─────────────────────────────────────────────────────────────────┤
│  • Patient cases with photos, voice, vitals                     │
│  • AI analysis results cached locally                            │
│  • Sync queue for pending uploads                               │
│  • Encrypted local storage (AES-256)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC LAYER (When Online)                      │
├─────────────────────────────────────────────────────────────────┤
│  • Background sync with Service Workers                          │
│  • Encrypted HTTPS transmission (JWT auth)                       │
│  • Delta sync for bandwidth optimization                         │
│  • Conflict resolution with timestamps                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js/SvelteKit)              │
├─────────────────────────────────────────────────────────────────┤
│  • RESTful API endpoints (+server routes)                       │
│  • JWT authentication & authorization                            │
│  • Case triage and routing logic                                │
│  • Webhook handlers for Twilio SMS/Voice                        │
│  • Job queue for async tasks                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE                              │
├─────────────────────────────────────────────────────────────────┤
│  • PostgreSQL (via Prisma ORM)                                  │
│  • Redis for caching & job queue                                │
│  • S3-compatible storage for media files                        │
│  • Audit logs with immutable records                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ALERT & COMMUNICATION                         │
├─────────────────────────────────────────────────────────────────┤
│  • Twilio SMS for high-risk alerts                              │
│  • Voice calls for emergency cases                               │
│  • Push notifications (via Firebase)                             │
│  • Email notifications (SendGrid)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ML/AI PIPELINE                                │
├─────────────────────────────────────────────────────────────────┤
│  • Federated Learning with TensorFlow.js                        │
│  • Model training pipeline (Python backend)                      │
│  • Differential privacy for data protection                      │
│  • Over-the-air model updates                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (Current - SvelteKit 2 + Svelte 5)
- **Framework**: SvelteKit 2 with TypeScript
- **Styling**: TailwindCSS 3.4.11
- **State Management**: Svelte stores + context
- **PWA**: Vite PWA plugin with Service Workers
- **Offline Storage**: IndexedDB (via custom wrapper)
- **AI Inference**: TensorFlow.js + ONNX.js
- **Media Capture**: WebRTC APIs (camera, microphone)
- **Bluetooth**: Web Bluetooth API

### Backend (SvelteKit Server Routes)
- **API**: SvelteKit +server.ts routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens + cookies
- **Job Queue**: BullMQ with Redis
- **File Storage**: AWS S3 or compatible
- **SMS/Voice**: Twilio API integration
- **Caching**: Redis

### AI/ML Stack
- **Client-side**: TensorFlow.js, ONNX.js
- **Training**: Python + TensorFlow/PyTorch
- **Federated Learning**: TensorFlow Federated (Python)
- **Model Format**: ONNX for portability
- **Privacy**: Differential privacy, secure aggregation

### DevOps
- **Containerization**: Docker + Docker Compose
- **Hosting**: Vercel/Netlify (frontend), Railway/Render (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry for errors, Plausible for analytics

## Data Flow

### 1. CHW Case Capture (Offline)
```
User Input → Local Validation → IndexedDB Storage → Edge AI Analysis → 
Local Results Display → Queue for Sync
```

### 2. Online Sync
```
Service Worker Detects Network → Background Sync → 
Upload to API (+server route) → Store in PostgreSQL → 
Trigger Alerts (if high-risk) → Update Client
```

### 3. AI Analysis Pipeline
```
Multi-modal Input (Image/Voice/Text) → Feature Extraction → 
TensorFlow.js Models → Risk Scoring → Urgency Classification → 
Recommendations Generation → Display to User
```

### 4. Alert Flow
```
High-risk Case Detected → Backend Job Queue → 
Twilio API Call → SMS/Voice to Patient & ASHA → 
Push Notification to CHW → Audit Log Entry
```

### 5. Clinician Review
```
ASHA Escalation → Clinician Dashboard → Case Review → 
AI-Assisted Diagnosis → Prescription → Telemedicine Session → 
Follow-up Schedule → Close Case
```

## Security & Privacy

### Data Protection
- **Encryption at Rest**: AES-256 for IndexedDB
- **Encryption in Transit**: HTTPS/TLS 1.3
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Audit Logs**: Immutable, timestamped records

### Privacy-Preserving AI
- **Federated Learning**: Models trained without raw data sharing
- **Differential Privacy**: Noise injection during training
- **On-device Inference**: No raw data sent for prediction
- **Consent Management**: Explicit user consent tracking
- **Data Minimization**: Only essential data collected

## Scalability

### Horizontal Scaling
- **Stateless API**: Can scale across multiple instances
- **Load Balancing**: Nginx/Cloudflare
- **Database**: PostgreSQL with read replicas
- **Caching**: Redis cluster for session/data caching
- **CDN**: Static assets via CDN

### Performance Optimization
- **Code Splitting**: Dynamic imports for large modules
- **Image Optimization**: WebP format, lazy loading
- **Service Workers**: Aggressive caching strategy
- **Database Indexing**: Optimized queries with indexes
- **Connection Pooling**: Prisma connection pool

## Offline-First Strategy

### Progressive Enhancement
1. **Core Features Work Offline**: Case capture, AI analysis, viewing
2. **Background Sync**: Auto-upload when network available
3. **Conflict Resolution**: Last-write-wins with timestamps
4. **Cache Strategy**: Cache-first for static, network-first for dynamic
5. **Storage Quota Management**: LRU eviction when full

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Sentry for runtime errors
- **Performance**: Lighthouse CI, Web Vitals
- **User Analytics**: Plausible (privacy-friendly)
- **API Monitoring**: Response times, error rates

### Health Metrics
- **Case Volume**: Daily/weekly trends
- **Response Times**: CHW to diagnosis
- **AI Accuracy**: Precision, recall, F1 scores
- **User Engagement**: Active users, retention

## Deployment Architecture

### Development
```
Local Dev → SvelteKit Dev Server (localhost:5173) → 
IndexedDB (local) → Mock API responses
```

### Staging
```
GitHub Push → GitHub Actions CI → Docker Build → 
Deploy to Vercel (preview) → Test with staging DB
```

### Production
```
Main Branch → CI/CD Pipeline → Docker Build → 
Deploy to Vercel (frontend) + Railway (backend) → 
PostgreSQL (production) + Redis → CDN (Cloudflare)
```

## API Structure

### Public Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - New user registration
- `POST /api/cases` - Submit new case
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `POST /api/sync` - Batch sync offline data

### Protected Endpoints (Require Auth)
- `GET /api/dashboard/chw` - CHW statistics
- `GET /api/dashboard/asha` - ASHA analytics
- `GET /api/dashboard/clinician` - Clinician queue
- `POST /api/diagnoses` - Submit diagnosis
- `POST /api/alerts` - Trigger alerts
- `GET /api/models/latest` - Download latest AI model

## Future Enhancements

1. **Voice AI Assistant**: Multilingual voice-based interactions
2. **Telemedicine Integration**: Video consultations
3. **Wearable Integration**: Smartwatch/fitness tracker data
4. **Predictive Analytics**: Disease outbreak prediction
5. **Community Health Maps**: Geographic visualization
6. **SMS-based Interactions**: USSD for feature phones

## Compliance

- **HIPAA**: Protected Health Information security
- **GDPR**: Right to erasure, data portability
- **ISO 27001**: Information security management
- **Local Regulations**: India's Digital Personal Data Protection Act
