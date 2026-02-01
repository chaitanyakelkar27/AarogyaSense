# 🏥 AarogyaSense - AI-Powered Healthcare Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-orange.svg)](https://kit.svelte.dev/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-orange.svg)](https://www.tensorflow.org/js)
[![PWA](https://img.shields.io/badge/PWA-Enabled-green.svg)](https://web.dev/progressive-web-apps/)

> **Privacy-first AI healthcare diagnostic system for rural and low-resource communities with offline-first architecture, multimodal AI diagnostics, and human-in-the-loop verification.**

---

## 🌟 Overview

AarogyaSense is a comprehensive AI-powered healthcare platform designed specifically for rural healthcare delivery in India. It empowers Community Health Workers (CHWs), ASHA workers, and clinicians with advanced diagnostic tools while maintaining complete privacy and offline functionality.

### 🎯 Key Features

- **🔒 Privacy-First**: All AI inference happens locally - no patient data leaves the device
- **📱 Offline-First PWA**: Complete functionality without internet connectivity  
- **🧠 Multimodal AI**: Image, voice, and text analysis using TensorFlow.js
- **👥 Role-Based Access**: CHW, ASHA, Clinician, and Admin interfaces
- **🚨 Smart Alerting**: Automated SMS/voice alerts via Twilio for critical cases
- **🌐 Multilingual**: Hindi, English, and regional language support
- **♿ Accessible**: WCAG 2.1 compliant with screen reader support
- **📊 Analytics**: Real-time health monitoring and case management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACES                              │
│  CHW Mobile App  │  ASHA Dashboard  │  Clinician Portal         │
│  (Offline-First) │  (Case Review)   │  (Diagnosis & Treatment)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EDGE AI LAYER                                 │
│  • TensorFlow.js Local Inference                                │
│  • Image Analysis (Anemia, Skin Conditions)                     │
│  • Voice Analysis (Respiratory Issues)                          │
│  • Risk Scoring & Urgency Classification                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND API                                   │
│  • SvelteKit Server Routes                                      │
│  • JWT Authentication                                           │
│  • Prisma ORM with SQLite/PostgreSQL                            │
│  • Background Sync & Queue Management                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ALERT SYSTEM                                  │
│  • Twilio SMS/Voice Integration                                 │
│  • Multi-channel Delivery                                       │
│  • Escalation Logic                                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **SQLite** (for development) or **PostgreSQL** (for production)

### 1. Installation

```bash
git clone https://github.com/Chirag8405/AarogyaSense.git
cd AarogyaSense
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
JWT_SECRET="your-secure-random-string"

# Twilio (Optional - for SMS/Voice alerts)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
DEMO_ASHA_PHONE="+91XXXXXXXXXX"  # Your test phone number

# OpenAI (Optional - for enhanced AI features)
OPENAI_API_KEY="your-openai-key"
```

> 📚 **For detailed environment setup**, see [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)  
> 📁 **For project structure details**, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 4. Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to see the application.

### 5. Build for Production

```bash
npm run build
npm run preview
```

## 🧪 Testing

### Quick Demo

```bash
# Run the interactive demo
node demo.js

# Or in browser console
aarogyaDemo.runAll()
```

### Test Suite

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Type checking
npm run check
```

## 📱 User Interfaces

### CHW Mobile Interface
- **Patient Registration**: Capture demographics and contact info
- **Symptom Assessment**: Guided questionnaire with voice input
- **AI Analysis**: Real-time image and voice analysis
- **Case Management**: Track patient history and follow-ups
- **Offline Sync**: Automatic data synchronization when online

### ASHA Dashboard  
- **Case Queue**: Review CHW submissions by priority
- **Community Analytics**: Health trends and outbreak detection
- **Alert Management**: Handle critical case notifications
- **Resource Planning**: Medication and supply tracking

### Clinician Portal
- **Diagnostic Review**: Validate AI recommendations
- **Treatment Plans**: Generate prescriptions and care plans  
- **Telemedicine**: Remote consultations via video/voice
- **Training Module**: Continuous education platform

## 🤖 AI Features

### Image Analysis
- **Anemia Detection**: Eye/nail analysis for hemoglobin estimation
- **Skin Condition Assessment**: Rash, wound, and lesion analysis
- **Vital Sign Extraction**: Heart rate from fingertip videos
- **Malnutrition Screening**: BMI and growth chart analysis

### Voice Analysis
- **Respiratory Assessment**: Cough pattern analysis
- **Speech Disorders**: Detect neurological conditions
- **Emotional State**: Mental health screening
- **Language Detection**: Automatic language identification

### Risk Scoring
- **Urgency Classification**: Low, Medium, High, Critical
- **Condition Probability**: Likelihood scoring for common diseases
- **Referral Recommendations**: Appropriate care level suggestions
- **Follow-up Scheduling**: Predictive appointment scheduling

## 📊 Database Schema

```sql
-- Core entities
User (CHW, ASHA, Clinician, Admin)
Patient (Demographics, Medical History)
Case (Symptoms, AI Analysis, Status)
Diagnosis (Clinician Review, Treatment)
Alert (Notifications, Escalations)
AuditLog (Privacy, Security Tracking)
FollowUp (Patient Monitoring)
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `JWT_SECRET` | Yes | Authentication secret key |
| `TWILIO_ACCOUNT_SID` | No | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | No | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number for alerts |
| `OPENAI_API_KEY` | No | OpenAI API key for enhanced features |

### Customization

- **Language Support**: Add new languages in `src/lib/i18n/`
- **AI Models**: Replace TensorFlow.js models in `src/lib/ai/models/`
- **Styling**: Customize themes in `tailwind.config.js`
- **Alert Rules**: Modify alert logic in `src/lib/alert-rules.ts`

## 🚀 Deployment

### Production Deployment

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Docker
```bash
docker build -t aarogyasense .
docker run -p 3000:3000 aarogyasense
```

#### Manual Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Infrastructure Requirements

- **Compute**: 2 vCPU, 4GB RAM minimum
- **Storage**: 20GB for database and media files
- **Bandwidth**: 1TB/month for 10K users
- **Database**: PostgreSQL 14+ or SQLite for development

## 🔒 Security & Privacy

### Data Protection
- **End-to-End Encryption**: AES-256 encryption for sensitive data
- **Local AI Processing**: No patient data sent to external servers
- **Secure Authentication**: JWT tokens with refresh mechanism
- **Audit Logging**: Comprehensive activity tracking
- **GDPR Compliance**: Right to erasure and data portability

### Privacy Features
- **Differential Privacy**: AI training with privacy preservation
- **Federated Learning**: Collaborative model training without data sharing
- **Consent Management**: Granular user consent tracking
- **Data Minimization**: Collect only essential information

## 📈 Monitoring & Analytics

### System Metrics
- **Performance**: Response times, error rates, uptime
- **Usage**: Active users, cases processed, AI accuracy
- **Health**: Database performance, sync status, alert delivery

### Health Analytics
- **Disease Surveillance**: Track health trends and outbreaks
- **Resource Utilization**: Optimize CHW deployment and supplies
- **Outcome Tracking**: Measure treatment effectiveness
- **Population Health**: Community-level health indicators

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm run test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📖 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - System design and technical architecture
- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - Development roadmap and milestones
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing procedures
- **[API Reference](./API.md)** - REST API documentation
- **[User Manual](./USER_MANUAL.md)** - End-user documentation

## 🏆 Project Status

- ✅ **Core Framework** - SvelteKit, TypeScript, TailwindCSS
- ✅ **Authentication** - JWT-based auth with role management
- ✅ **Database** - Prisma ORM with complete schema
- ✅ **AI Integration** - TensorFlow.js multimodal analysis
- ✅ **Alert System** - Twilio SMS/voice integration
- ✅ **PWA Features** - Offline support, installable
- ✅ **API Layer** - RESTful API with comprehensive endpoints
- 🔄 **Frontend Integration** - Connecting UI to backend services
- 📋 **Model Training** - Custom healthcare AI models
- 📋 **Production Deployment** - Cloud infrastructure setup

## 🎯 Roadmap

### Phase 1 - Foundation (✅ Complete)
- Core platform architecture
- User authentication and roles
- Database design and API endpoints
- Basic AI integration framework

### Phase 2 - AI Enhancement (🔄 In Progress)  
- Custom medical AI models
- Advanced image and voice analysis
- Improved risk scoring algorithms
- Real-time inference optimization

### Phase 3 - Integration (📋 Planned)
- Complete frontend-backend integration
- Advanced alert and notification system
- Comprehensive testing and optimization
- Performance monitoring and analytics

### Phase 4 - Scale (📋 Future)
- Multi-tenant architecture
- Advanced telemedicine features
- Wearable device integration
- Predictive health analytics

## 🛠️ Technology Stack

### Frontend
- **SvelteKit 2** - Full-stack framework with SSR
- **Svelte 5** - Reactive UI components with modern syntax
- **TypeScript 5** - Type-safe development
- **TailwindCSS 3** - Utility-first CSS framework
- **Vite** - Fast build tool and development server

### Backend  
- **SvelteKit Server Routes** - API endpoints and server logic
- **Prisma ORM** - Type-safe database access
- **SQLite/PostgreSQL** - Database storage
- **JWT** - Authentication and authorization

### AI/ML
- **TensorFlow.js** - Browser-based machine learning
- **ONNX.js** - Cross-platform AI model runtime
- **OpenAI API** - Enhanced language processing (optional)

### Infrastructure
- **Vercel** - Deployment and hosting
- **Twilio** - SMS and voice communications
- **Service Workers** - Offline functionality and caching

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **ASHA Workers** - For inspiring this platform and providing domain expertise
- **Community Health Workers** - For field testing and feedback
- **Healthcare Professionals** - For medical guidance and validation
- **Open Source Community** - For the amazing tools and libraries

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/Chirag8405/AarogyaSense/wiki)
- **Issues**: [GitHub Issues](https://github.com/Chirag8405/AarogyaSense/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Chirag8405/AarogyaSense/discussions)
- **Email**: support@aarogyasense.org

---

<div align="center">
  <strong>Built with ❤️ for healthcare accessibility in rural communities</strong><br>
  <em>Empowering health workers with AI-powered diagnostic tools</em>
</div>

