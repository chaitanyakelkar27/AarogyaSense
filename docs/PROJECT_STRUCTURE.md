# Project Structure

## Directory Overview

```
AarogyaSense/
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma           # Prisma database schema
│   ├── seed.ts                 # Database seeding script
│   └── migrations/             # Database migration files
│
├── src/
│   ├── lib/                    # Shared libraries and utilities
│   │   ├── components/         # Reusable Svelte components
│   │   │   ├── AIAnalysisPanel.svelte
│   │   │   ├── LanguageSwitcher.svelte
│   │   │   └── NotificationCenter.svelte
│   │   │
│   │   ├── server/             # Server-side utilities
│   │   │   ├── auth.ts         # Authentication logic
│   │   │   ├── prisma.ts       # Prisma client instance
│   │   │   ├── twilio-client.ts # Twilio SMS/Voice integration
│   │   │   └── websocket.ts    # WebSocket server
│   │   │
│   │   ├── stores/             # Svelte stores for state management
│   │   │   ├── auth-store.ts
│   │   │   └── socket-store.ts
│   │   │
│   │   ├── ai/                 # AI/ML modules
│   │   │   ├── image-analyzer.ts
│   │   │   ├── model-loader.ts
│   │   │   ├── risk-scorer.ts
│   │   │   └── voice-analyzer.ts
│   │   │
│   │   ├── i18n/               # Internationalization
│   │   │   ├── index.ts
│   │   │   └── locales/        # Translation files
│   │   │       ├── en.json
│   │   │       ├── hi.json
│   │   │       ├── kn.json
│   │   │       └── mr.json
│   │   │
│   │   └── *.ts                # Utility modules
│   │       ├── api-client.ts
│   │       ├── edge-ai-diagnostics.ts
│   │       ├── healthcare-system-integration.ts
│   │       ├── multilingual-voice-interface.ts
│   │       ├── offline-data-manager.ts
│   │       ├── patient-followup-system.ts
│   │       └── privacy-security-framework.ts
│   │
│   ├── routes/                 # SvelteKit routes (pages and API)
│   │   ├── +layout.svelte      # Root layout
│   │   ├── +page.svelte        # Home page
│   │   │
│   │   ├── api/                # API endpoints
│   │   │   ├── ai/
│   │   │   │   └── chat/       # AI chat endpoint
│   │   │   ├── alerts/         # Alert management
│   │   │   │   ├── send/       # Send alerts
│   │   │   │   └── [id]/read/  # Mark alert as read
│   │   │   ├── analytics/      # Analytics endpoints
│   │   │   ├── auth/           # Authentication
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── cases/          # Case management
│   │   │   ├── chw/            # CHW endpoints
│   │   │   ├── clinician/      # Clinician endpoints
│   │   │   ├── test-call/      # Test Twilio calls
│   │   │   ├── twilio-status/  # Twilio status check
│   │   │   └── upload/         # File upload
│   │   │
│   │   ├── auth/               # Authentication page
│   │   ├── asha/               # ASHA worker interface
│   │   ├── chw/                # Community Health Worker interface
│   │   │   └── ai/             # CHW AI features
│   │   ├── chw-new/            # New CHW interface
│   │   └── clinician/          # Clinician interface
│   │
│   ├── app.css                 # Global styles
│   ├── app.d.ts                # TypeScript app declarations
│   └── app.html                # HTML template
│
├── static/                     # Static assets
│
├── docs/                       # Documentation
│   └── ENVIRONMENT_SETUP.md    # Environment setup guide
│
├── .env                        # Environment variables (not in git)
├── .env.example                # Example environment file
├── .gitignore                  # Git ignore rules
├── eslint.config.js            # ESLint configuration
├── package.json                # NPM dependencies
├── postcss.config.js           # PostCSS configuration
├── README.md                   # Project README
├── svelte.config.js            # SvelteKit configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
└── vitest-setup-client.ts      # Vitest test setup
```

## Key Directories Explained

### `/prisma`
Contains database schema, migrations, and seed data for Prisma ORM.

### `/src/lib`
Shared libraries and utilities used across the application:
- **components**: Reusable Svelte components
- **server**: Server-side only utilities (auth, database, Twilio)
- **stores**: Client-side state management
- **ai**: AI/ML processing modules
- **i18n**: Internationalization and translations

### `/src/routes`
SvelteKit file-based routing:
- **Pages**: `+page.svelte` files define UI
- **API Routes**: `+server.ts` files define API endpoints
- **Layouts**: `+layout.svelte` files define page layouts

### `/static`
Static files served directly (images, fonts, etc.)

## User Roles & Interfaces

1. **CHW (Community Health Worker)**: `/chw` - Field data collection
2. **ASHA Worker**: `/asha` - Alert management and patient follow-up
3. **Clinician**: `/clinician` - Case review and diagnosis
4. **Admin**: Authentication at `/auth`

## Code Organization Guidelines

### Server-Side Code
- All server-side utilities in `src/lib/server/`
- API endpoints in `src/routes/api/`
- Use Prisma for database operations
- Environment variables accessed via `$env/static/private`

### Client-Side Code
- Components in `src/lib/components/`
- Stores in `src/lib/stores/`
- Pages in `src/routes/`
- Use stores for state management

### Shared Code
- Utilities that work on both server and client in `src/lib/`
- Type definitions in `.ts` files
- Avoid importing server-only code in client components

## API Endpoint Structure

```
/api
├── /ai             - AI-powered features
├── /alerts         - Notification system
├── /analytics      - Performance metrics
├── /auth           - User authentication
├── /cases          - Case management
├── /chw            - CHW-specific endpoints
└── /clinician      - Clinician-specific endpoints
```

## Adding New Features

1. **New Page**: Create `+page.svelte` in `/src/routes/[route-name]/`
2. **New API**: Create `+server.ts` in `/src/routes/api/[endpoint]/`
3. **New Component**: Add to `/src/lib/components/`
4. **New Utility**: Add to `/src/lib/`
5. **Server Utility**: Add to `/src/lib/server/`

## Environment Configuration

See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for detailed environment variable configuration.
