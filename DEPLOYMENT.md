# 🚀 Deployment Guide - Aarogya Health System

## Overview
This guide covers deploying the Aarogya Health System to production. The app is built with SvelteKit and can be deployed to various platforms.

---

## 📦 Pre-Deployment Checklist

### 1. Environment Variables
Create `.env` file with production values:
```bash
# Required
DATABASE_URL="postgresql://user:password@host:5432/aarogya"
JWT_SECRET="your-secure-random-string-here"

# Optional (but recommended)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

### 2. Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Migration
```bash
# For PostgreSQL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
npx prisma generate
```

### 4. Build the App
```bash
npm run build
```

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Quick Deploy)

#### Setup
```bash
npm install -g vercel
vercel login
```

#### Deploy
```bash
vercel --prod
```

#### Configure
1. Add environment variables in Vercel dashboard
2. Add PostgreSQL database (Vercel Postgres or Supabase)
3. Set up custom domain (optional)

#### Vercel Configuration
Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "sveltekit",
  "regions": ["bom1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

---

### Option 2: Railway (Database + App Hosting)

#### Advantages
- Built-in PostgreSQL
- Easy environment variable management
- Automatic deployments from Git

#### Steps
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add PostgreSQL service
5. Configure environment variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-secret
   TWILIO_ACCOUNT_SID=your-sid
   TWILIO_AUTH_TOKEN=your-token
   ```
6. Deploy!

---

### Option 3: Docker + Any VPS

#### Create Dockerfile
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build app
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Start
CMD ["node", "build"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/aarogya
      JWT_SECRET: ${JWT_SECRET}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: aarogya
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Deploy
```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Migrate
docker-compose exec app npx prisma migrate deploy
```

---

### Option 4: DigitalOcean App Platform

#### Setup
1. Create account at https://www.digitalocean.com
2. Go to App Platform
3. Connect GitHub repository
4. Choose region (Bangalore for India)

#### Configuration
```yaml
name: aarogya-health
region: blr
services:
  - name: web
    github:
      repo: your-username/aarogya
      branch: main
    build_command: npm run build
    run_command: node build
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: JWT_SECRET
        value: ${JWT_SECRET}
        type: SECRET
    http_port: 3000

databases:
  - name: db
    engine: PG
    version: "15"
```

---

### Option 5: AWS (Production Scale)

#### Services Used
- **ECS/Fargate** - Container hosting
- **RDS PostgreSQL** - Database
- **S3** - File storage (images/audio)
- **CloudFront** - CDN
- **ALB** - Load balancer

#### Basic Setup
1. Create RDS PostgreSQL instance
2. Build Docker image:
   ```bash
   docker build -t aarogya .
   ```
3. Push to ECR:
   ```bash
   aws ecr create-repository --repository-name aarogya
   docker tag aarogya:latest {account}.dkr.ecr.{region}.amazonaws.com/aarogya
   docker push {account}.dkr.ecr.{region}.amazonaws.com/aarogya
   ```
4. Create ECS task definition
5. Configure ALB with health checks
6. Deploy!

---

## 🗄️ Database Options

### Option A: Supabase (Recommended)
```bash
# Free tier: 500MB database
# Sign up: https://supabase.com

# Get connection string from dashboard
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

### Option B: PlanetScale
```bash
# MySQL compatible
# Free tier: 5GB storage
# Sign up: https://planetscale.com

# Update Prisma schema to use MySQL
# datasource db {
#   provider = "mysql"
#   url      = env("DATABASE_URL")
# }
```

### Option C: Neon
```bash
# Serverless PostgreSQL
# Free tier: 10GB storage
# Sign up: https://neon.tech

DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/aarogya"
```

### Option D: Railway PostgreSQL
```bash
# Included with Railway deployment
# Automatic configuration
# $5/month for 1GB
```

---

## 🔒 Security Hardening

### 1. Environment Variables
```bash
# Never commit .env files!
# Use platform-specific secrets management
# Rotate JWT secret regularly
```

### 2. HTTPS
```bash
# Always use HTTPS in production
# Most platforms (Vercel, Railway) provide it automatically
# For custom deployments, use Let's Encrypt:
sudo certbot --nginx -d aarogya.example.com
```

### 3. Rate Limiting
Add to `hooks.server.ts`:
```typescript
import { rateLimit } from '@/lib/server/rate-limit';

export async function handle({ event, resolve }) {
  // Rate limit API endpoints
  if (event.url.pathname.startsWith('/api')) {
    const limited = await rateLimit(event.getClientAddress());
    if (limited) {
      return new Response('Too many requests', { status: 429 });
    }
  }
  
  return resolve(event);
}
```

### 4. CORS Configuration
```typescript
// svelte.config.js
kit: {
  csrf: {
    checkOrigin: true
  }
}
```

---

## 📊 Monitoring

### Option 1: Sentry (Error Tracking)
```bash
npm install @sentry/sveltekit

# Add to src/hooks.client.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'your-dsn',
  environment: 'production'
});
```

### Option 2: Plausible (Analytics)
```html
<!-- Add to src/app.html -->
<script defer data-domain="aarogya.example.com" 
        src="https://plausible.io/js/script.js"></script>
```

### Option 3: Better Stack (Logs)
```bash
# Sign up: https://betterstack.com
# Add logging endpoint
```

---

## 🚀 Performance Optimization

### 1. Build Optimization
```bash
# Enable compression
npm install compression

# Add to vite.config.ts
import compression from 'vite-plugin-compression';

plugins: [
  sveltekit(),
  compression({ algorithm: 'brotliCompress' })
]
```

### 2. Database Indexing
Already included in Prisma schema:
```prisma
@@index([email])
@@index([role])
@@index([status])
@@index([createdAt])
```

### 3. CDN for Static Assets
```bash
# Use Cloudflare, AWS CloudFront, or Vercel Edge Network
# Configure in svelte.config.js
```

### 4. Image Optimization
```bash
npm install @sveltejs/enhanced-img

# Use in components
<enhanced:img src="photo.jpg" alt="Patient" />
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 🧪 Production Testing

### 1. Health Check Endpoint
Create `src/routes/health/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    return json({ status: 'unhealthy', error }, { status: 500 });
  }
}
```

### 2. Load Testing
```bash
npm install -g k6

# Create test.js
import http from 'k6/http';

export default function() {
  http.get('https://your-app.com/health');
}

# Run test
k6 run --vus 100 --duration 30s test.js
```

---

## 📱 Mobile App Wrapper (Optional)

### Capacitor Setup
```bash
npm install @capacitor/core @capacitor/cli
npx cap init

# Build web app
npm run build

# Add platforms
npx cap add android
npx cap add ios

# Open in native IDE
npx cap open android
npx cap open ios
```

---

## 🔧 Post-Deployment

### 1. Database Backup
```bash
# Automated daily backups
# Most managed databases include this

# Manual backup (PostgreSQL)
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### 2. Monitoring Setup
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error alerts (Sentry)
- Track performance (Vercel Analytics)

### 3. Domain Setup
```bash
# Point domain to deployment
# Add DNS records:
A     @     <your-ip>
CNAME www   <your-deployment-url>
```

---

## 🎯 Recommended Production Stack

**For MVP/Small Scale:**
- **Hosting:** Vercel or Railway
- **Database:** Supabase PostgreSQL
- **Monitoring:** Sentry
- **Analytics:** Plausible

**For Medium Scale:**
- **Hosting:** DigitalOcean App Platform
- **Database:** Managed PostgreSQL
- **CDN:** Cloudflare
- **Monitoring:** Better Stack + Sentry

**For Large Scale:**
- **Hosting:** AWS ECS/Fargate
- **Database:** AWS RDS Multi-AZ
- **Storage:** AWS S3
- **CDN:** CloudFront
- **Monitoring:** CloudWatch + Datadog

---

## 💰 Cost Estimates

### Development/Testing (Free)
- Vercel: Free tier
- Supabase: Free 500MB
- **Total: $0/month**

### Small Scale (<1000 users)
- Railway: $5/month (app + database)
- Twilio: ~$10/month (500 SMS)
- **Total: ~$15/month**

### Medium Scale (1000-10000 users)
- DigitalOcean App: $12/month
- Managed PostgreSQL: $15/month
- Twilio: ~$50/month
- **Total: ~$77/month**

### Large Scale (10000+ users)
- AWS ECS: $50-100/month
- RDS PostgreSQL: $100-200/month
- S3 + CloudFront: $20-50/month
- Twilio: $200+/month
- **Total: ~$370-550/month**

---

## 📞 Support Contacts

- **Vercel:** https://vercel.com/support
- **Railway:** https://railway.app/help
- **Supabase:** https://supabase.com/support
- **Twilio:** https://support.twilio.com

---

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated
- [ ] JWT secret generated (strong)
- [ ] HTTPS enabled
- [ ] Health check endpoint working
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured
- [ ] Backups automated
- [ ] Domain configured
- [ ] Uptime monitoring enabled
- [ ] Load testing completed
- [ ] Documentation updated

---

**Ready to deploy?** Choose your platform and follow the guide above! 🚀
