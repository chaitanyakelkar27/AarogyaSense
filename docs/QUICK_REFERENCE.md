# Quick Reference Guide

## 🚀 Getting Started

```bash
# 1. Clone and install
git clone <repository-url>
cd AarogyaSense
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma migrate dev
npx prisma db seed

# 4. Run development server
npm run dev
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env` | Your local environment variables (never commit!) |
| `.env.example` | Template for environment variables |
| `prisma/schema.prisma` | Database schema |
| `src/routes/` | Pages and API endpoints |
| `src/lib/` | Shared utilities and components |

## 🔑 Environment Variables Quick Setup

### Minimal Setup (Development)
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
DEMO_ASHA_PHONE="+91XXXXXXXXXX"
```

### Full Setup (with Twilio & OpenAI)
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
DEMO_ASHA_PHONE="+91XXXXXXXXXX"

# Twilio
TWILIO_ACCOUNT_SID="ACxxxxxxxx"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxx"
OPENAI_MODEL="gpt-4o-mini"
```

## 🎯 User Roles & URLs

| Role | URL | Purpose |
|------|-----|---------|
| Login | `/auth` | User authentication |
| CHW | `/chw` | Field data collection |
| ASHA | `/asha` | Alert management |
| Clinician | `/clinician` | Case review |

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration
npx prisma db seed       # Seed database
npx prisma generate      # Generate Prisma client

# Testing
npm run test             # Run tests
npm run lint             # Lint code
npm run format           # Format code

# Dependencies
npm install <package>    # Install package
npm audit fix            # Fix security issues
npm outdated             # Check for updates
```

## 📡 API Endpoints Quick Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Cases
- `GET /api/cases` - List cases
- `POST /api/cases` - Create case
- `PUT /api/cases/update-status` - Update case status
- `POST /api/cases/[id]/review` - Review case

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts/send` - Send alert
- `POST /api/alerts/[id]/read` - Mark alert as read

### AI Features
- `POST /api/ai/chat` - AI chat assistant

### Testing
- `POST /api/test-call` - Test Twilio voice call
- `GET /api/twilio-status` - Check Twilio status

## 🗃️ Database Models

### User
```typescript
{
  id: string
  email: string
  role: ASHA | CHW | CLINICIAN
  name: string
  phoneNumber?: string
}
```

### Case
```typescript
{
  id: string
  patientName: string
  patientPhone: string
  symptoms: string
  riskLevel: LOW | MEDIUM | HIGH | CRITICAL
  status: OPEN | UNDER_REVIEW | CLOSED
}
```

### Alert
```typescript
{
  id: string
  caseId: string
  type: HIGH_RISK | CRITICAL_RISK
  message: string
  read: boolean
}
```

## 🎨 Tech Stack

- **Framework**: SvelteKit
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Styling**: Tailwind CSS
- **Authentication**: JWT
- **SMS/Voice**: Twilio
- **AI**: OpenAI GPT-4
- **Language**: TypeScript

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
```

### Database Issues
```bash
# Reset database
npx prisma migrate reset

# Fresh start
rm -rf prisma/dev.db*
npx prisma migrate dev
```

### Environment Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check .env is not in .gitignore for templates
cat .gitignore | grep .env
```

### Twilio Not Working
1. Check credentials in Twilio console
2. Verify phone number format (+91XXXXXXXXXX)
3. Check Twilio logs for errors
4. Ensure account has balance

## 📚 Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md) - Detailed env configuration
- [Project Structure](./PROJECT_STRUCTURE.md) - Code organization
- [Security](./SECURITY.md) - Security best practices
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

## 🔒 Security Checklist

- [ ] Never commit `.env` file
- [ ] Use strong JWT_SECRET
- [ ] Keep dependencies updated
- [ ] Use HTTPS in production
- [ ] Validate all user input
- [ ] Sanitize output data
- [ ] Log errors (not sensitive data)
- [ ] Regular security audits

## 📞 Phone Number Format

Always use E.164 format:
```
+[country_code][phone_number]

Examples:
+91XXXXXXXXXX  (India)
+14155552671   (USA)
+442071838750  (UK)
```

## 🌍 Supported Languages

- English (en)
- Hindi (hi)
- Kannada (kn)
- Marathi (mr)

Add translations in `src/lib/i18n/locales/`

## 📝 Code Snippets

### Check if User is Authenticated
```typescript
if (!locals.user) {
  throw error(401, 'Unauthorized');
}
```

### Send SMS Alert
```typescript
import { sendSMS } from '$lib/server/twilio-client';

await sendSMS({
  to: '+91XXXXXXXXXX',
  message: 'Alert message',
  priority: 'high'
});
```

### Create Database Entry
```typescript
import { prisma } from '$lib/server/prisma';

const case = await prisma.case.create({
  data: {
    patientName: 'John Doe',
    symptoms: 'Fever, cough',
    riskLevel: 'HIGH'
  }
});
```

## 🚨 Emergency Contacts

For production issues:
1. Check error logs: `npm run logs`
2. Check database: `npx prisma studio`
3. Verify Twilio status: `/api/twilio-status`
4. Review recent changes: `git log`

## 💡 Tips

- Use `npm run dev -- --host` to expose on network
- Use `npx prisma studio` for database GUI
- Enable verbose logging with DEBUG=* npm run dev
- Use browser DevTools Network tab to debug API calls
- Check console logs for Twilio initialization status
