# 🔐 Authentication Fix - Unauthorized Error

## Issue
**Problem:** All API actions (mark as completed, forward to clinician, mark as closed) were returning "Unauthorized" error even when users were logged in.

### Error Message
```
❌ Unauthorized
```

### Affected Actions
- ✅ Mark case as completed (Clinician portal)
- ✅ Mark case as closed (Clinician/ASHA portal)
- ✅ Forward to clinician (ASHA portal)

---

## Root Cause

### The Problem
The `/api/cases/update-status/+server.ts` endpoint was using **outdated authentication logic**:

```typescript
// ❌ OLD CODE (Broken):
export async function PATCH({ request, locals }: RequestEvent) {
    try {
        const user = (locals as any).user;  // ❌ locals.user was never set!
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        // ...
    }
}
```

**Why it failed:**
- The endpoint expected authentication via `locals.user`
- But the system was sending authentication via `Authorization` header with JWT token
- `locals.user` was never populated, so it always returned "Unauthorized"
- Other endpoints like `/api/cases/+server.ts` were using the correct authentication method

---

## Solution

### Updated Authentication Logic
Changed to use the **same authentication pattern** as all other API endpoints:

```typescript
// ✅ NEW CODE (Fixed):
import { extractToken, verifyToken } from '$lib/server/auth';

export async function PATCH({ request }: RequestEvent) {
    try {
        // Extract JWT token from Authorization header
        const token = extractToken(request.headers.get('Authorization'));
        if (!token) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify and decode the token
        const payload = verifyToken(token);
        if (!payload) {
            return json({ error: 'Invalid token' }, { status: 401 });
        }

        // Use payload.userId instead of user.id
        // ...
    }
}
```

---

## Technical Details

### Authentication Flow

#### How It Works Now
```
1. User logs in → JWT token generated
2. Token stored in localStorage (browser)
3. API client adds token to every request:
   Headers: { Authorization: "Bearer <token>" }
4. Server endpoint:
   a. Extract token from Authorization header
   b. Verify token signature and expiration
   c. Decode token to get user info (userId, email, role)
   d. Use payload.userId for database operations
```

### File Modified
**`/src/routes/api/cases/update-status/+server.ts`**

### Changes Made

**1. Imports Added:**
```typescript
import { extractToken, verifyToken } from '$lib/server/auth';
```

**2. Authentication Logic Updated:**
```typescript
// Before:
const user = (locals as any).user;

// After:
const token = extractToken(request.headers.get('Authorization'));
const payload = verifyToken(token);
```

**3. User References Updated:**
```typescript
// Before:
updateData.forwardedBy = user.id;
updateData.closedBy = user.id;

// After:
updateData.forwardedBy = payload.userId;
updateData.closedBy = payload.userId;
```

---

## Helper Functions

### extractToken()
```typescript
// From: /src/lib/server/auth.ts

export function extractToken(authHeader: string | null): string | null {
    if (!authHeader) return null;
    
    // Format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
}
```

### verifyToken()
```typescript
export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        return null;
    }
}
```

### TokenPayload Interface
```typescript
export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
```

---

## Comparison with Other Endpoints

### Other Working Endpoints (Used as Reference)

**`/api/cases/+server.ts`** ✅
```typescript
const token = extractToken(request.headers.get('Authorization'));
if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

const payload = verifyToken(token);
if (!payload) return json({ error: 'Invalid token' }, { status: 401 });
```

**`/api/alerts/+server.ts`** ✅
```typescript
const token = extractToken(request.headers.get('Authorization'));
if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

const payload = verifyToken(token);
if (!payload) return json({ error: 'Invalid token' }, { status: 401 });
```

**`/api/cases/update-status/+server.ts`** ❌ → ✅
```typescript
// NOW FIXED - Uses same pattern as above
```

---

## Testing

### Before Fix
```
1. Login to Clinician portal ✅
2. Try to mark case as completed
3. Result: ❌ "Unauthorized" error
4. Case status not updated
5. Button remains visible
```

### After Fix
```
1. Login to Clinician portal ✅
2. Try to mark case as completed
3. Result: ✅ "Case marked as completed successfully"
4. Status updated to COMPLETED
5. Badge turns green
6. Button disappears
```

---

## Why This Happened

### Authentication Architecture in This System

The system uses **JWT (JSON Web Token)** authentication:

1. **Login** → User provides credentials
2. **Token Generation** → Server creates JWT token with user info
3. **Token Storage** → Browser stores token in localStorage
4. **Token Transmission** → Every API request includes token in Authorization header
5. **Token Verification** → Server validates token and extracts user info

### The Mistake
The update-status endpoint was written expecting a **different authentication pattern** (session-based with `locals.user`), which was never implemented in this system.

### The Fix
Aligned the endpoint with the **existing JWT authentication pattern** used throughout the application.

---

## Security Notes

### JWT Secret
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

⚠️ **Important:** Change JWT_SECRET in production environment!

### Token Expiration
```typescript
const JWT_EXPIRES_IN = '7d'; // Tokens valid for 7 days
```

### Token Structure
```json
{
  "userId": "cm3...",
  "email": "doctor@example.com",
  "role": "CLINICIAN",
  "iat": 1728000000,
  "exp": 1728604800
}
```

---

## Benefits of This Fix

### For Users
- ✅ Actions work as expected
- ✅ No more "Unauthorized" errors
- ✅ Smooth workflow
- ✅ Cases can be completed/closed properly

### For System
- ✅ Consistent authentication across all endpoints
- ✅ Proper audit trail (userId tracked for actions)
- ✅ Secure token-based authentication
- ✅ Easy to maintain and debug

### For Development
- ✅ Clear authentication pattern
- ✅ Reusable auth functions
- ✅ Type-safe with TypeScript
- ✅ Easy to extend to new endpoints

---

## Checklist for New Endpoints

When creating new API endpoints, always:

1. ✅ Import auth helpers:
   ```typescript
   import { extractToken, verifyToken } from '$lib/server/auth';
   ```

2. ✅ Extract token from header:
   ```typescript
   const token = extractToken(request.headers.get('Authorization'));
   ```

3. ✅ Verify token:
   ```typescript
   const payload = verifyToken(token);
   ```

4. ✅ Check for errors:
   ```typescript
   if (!token || !payload) {
       return json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

5. ✅ Use payload.userId for user identification:
   ```typescript
   const userId = payload.userId;
   ```

---

## Summary

**Problem:**
- "Unauthorized" errors on all case actions
- Used wrong authentication pattern

**Solution:**
- Fixed `/api/cases/update-status/+server.ts`
- Changed from `locals.user` to JWT token extraction
- Updated all user references to use `payload.userId`

**Result:**
- ✅ All actions work correctly
- ✅ Consistent authentication
- ✅ Proper user tracking
- ✅ No more unauthorized errors

**Perfect! 🔐**
