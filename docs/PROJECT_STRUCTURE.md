# Project Structure

## Directory Overview

```
AarogyaSense/
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma           # Prisma database schema (MongoDB)
│   ├── seed.ts                 # Database seeding script
│   └── migrations/             # Database migration files
│
├── src/
│   ├── lib/                    # Shared libraries and utilities
│   │   ├── components/         # Reusable Svelte components
│   │   │   ├── LanguageSwitcher.svelte
│   │   │   └── NotificationCenter.svelte
│   │   │
│   │   ├── server/             # Server-side utilities
│   │   │   ├── auth.ts         # JWT authentication logic
│   │   │   ├── prisma.ts       # Prisma client instance
│   │   │   ├── pusher.ts       # Pusher real-time events
│   │   │   └── twilio-client.ts # Twilio SMS/Voice integration
│   │   │
│   │   ├── stores/             # Svelte stores for state management
│   │   │   ├── auth-store.ts   # Authentication state
│   │   │   └── pusher-store.ts # Real-time events (SOS, case updates)
│   │   │
│   │   ├── i18n/               # Internationalization (4 languages)
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── en.json     # English
│   │   │       ├── hi.json     # Hindi
│   │   │       ├── kn.json     # Kannada
│   │   │       └── mr.json     # Marathi
│   │   │
│   │   ├── api-client.ts       # Frontend API client
│   │   ├── offline-data-manager.ts # PWA offline support
│   │   └── index.ts            # Library exports
│   │
│   ├── routes/                 # SvelteKit routes (pages and API)
│   │   ├── +layout.svelte      # Root layout with navigation
│   │   ├── +layout.server.ts   # Server-side layout data
│   │   ├── +page.svelte        # Home/Dashboard page
│   │   │
│   │   ├── api/                # REST API endpoints
│   │   │   ├── ai/chat/        # Groq AI chat endpoint
│   │   │   ├── alerts/         # Alert management
│   │   │   ├── auth/           # Login & Register
│   │   │   ├── cases/          # Case CRUD operations
│   │   │   ├── sos/            # SOS emergency alerts
│   │   │   └── upload/         # File upload
│   │   │
│   │   ├── auth/               # Login/Register page
│   │   ├── asha/               # ASHA supervisor portal
│   │   ├── chw/                # CHW assessment interface
│   │   └── clinician/          # Clinician review portal
│   │
│   ├── app.css                 # Global styles (Tailwind)
│   ├── app.d.ts                # TypeScript declarations
│   └── app.html                # HTML template
│
├── static/                     # Static assets (favicon, images)
├── docs/                       # Documentation
│
├── .env                        # Environment variables (gitignored)
├── .env.example                # Example environment template
├── package.json                # NPM dependencies
├── svelte.config.js            # SvelteKit configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite + PWA configuration
```

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | SvelteKit 2.0, Svelte 5, TypeScript |
| **Styling** | Tailwind CSS 3.4 |
| **Database** | MongoDB Atlas + Prisma ORM |
| **AI** | Groq API (Llama 3.1) |
| **Real-time** | Pusher Channels |
| **SMS/Voice** | Twilio |
| **Auth** | JWT (bcrypt) |
| **i18n** | svelte-i18n (EN, HI, KN, MR) |
| **PWA** | vite-plugin-pwa |

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
