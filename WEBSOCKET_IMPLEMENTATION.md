# WebSocket Real-Time Updates Implementation

## Overview

This document describes the WebSocket implementation using Socket.IO for real-time case status updates across all portals in the Aarogya Health System.

## Architecture

### Server-Side Components

#### 1. WebSocket Server (`src/lib/server/websocket.ts`)
- Initializes Socket.IO server attached to Vite's HTTP server
- Manages client connections and disconnections
- Provides helper functions to emit events:
  - `emitCaseUpdate(caseId, status, updatedBy)` - Broadcasts case status changes
  - `emitNewCase(caseData)` - Broadcasts new case notifications

#### 2. Vite Configuration (`vite.config.ts`)
- Hooks into Vite's server configuration
- Initializes WebSocket server on startup
- Ensures Socket.IO runs alongside SvelteKit

#### 3. API Endpoints
Updated to emit WebSocket events when case status changes:

**`src/routes/api/cases/update-status/+server.ts`**
- Emits `caseStatusUpdate` event after successful status update
- Broadcasts to all connected clients

**`src/routes/api/cases/[id]/clinician-review/+server.ts`**
- Emits `caseStatusUpdate` event after clinician actions (accept, refer, prescribe)
- Notifies all portals of case changes

### Client-Side Components

#### 1. Socket Store (`src/lib/stores/socket-store.ts`)
- Manages WebSocket connection lifecycle
- Provides Svelte stores for connection state and updates
- Functions:
  - `initializeSocket()` - Establishes connection
  - `subscribeToCaseUpdates(callback)` - Subscribe to case updates
  - `disconnectSocket()` - Clean up connection
  - `getSocket()` - Get current socket instance

#### 2. Portal Updates

**Clinician Portal (`src/routes/clinician/+page.svelte`)**
- Initializes socket on mount
- Subscribes to case updates
- Automatically reloads case list when updates received
- Cleans up connection on destroy

**ASHA Portal (`src/routes/asha/+page.svelte`)**
- Same implementation as Clinician portal
- Real-time updates for supervised CHW cases

**CHW Portal (`src/routes/chw/+page.svelte`)**
- Initializes socket connection
- Receives case update notifications
- Can be extended for UI feedback

## Event Flow

1. **User Action** → Clinician marks case as "Completed"
2. **API Call** → `PATCH /api/cases/update-status` with status update
3. **Database Update** → Prisma updates case status
4. **WebSocket Emit** → `emitCaseUpdate(caseId, status, userId)`
5. **Broadcast** → Socket.IO broadcasts to all connected clients
6. **Client Receives** → All portals receive `caseStatusUpdate` event
7. **UI Update** → Portal automatically reloads case list

## Events

### `caseStatusUpdate`
Emitted when a case status changes.

**Payload:**
```typescript
{
  caseId: string;
  status: string;
  updatedBy: string;
  timestamp: string;
}
```

### `newCase`
Emitted when a new case is created (prepared for future use).

**Payload:**
```typescript
{
  id: string;
  timestamp: string;
  // ... other case data
}
```

## Benefits

1. **Instant Updates** - No page refresh needed to see status changes
2. **Better UX** - Users see changes immediately, feels more responsive
3. **Reduced Polling** - Less server load compared to frequent polling
4. **Automatic Reconnection** - Socket.IO handles reconnection automatically
5. **Fallback Support** - Works even if WebSocket is blocked (long-polling fallback)

## Usage in Portals

### Example: Clinician Portal

```typescript
import { onMount, onDestroy } from 'svelte';
import { initializeSocket, subscribeToCaseUpdates, disconnectSocket } from '$lib/stores/socket-store';

let unsubscribe: (() => void) | undefined;

onMount(() => {
  // Initialize socket
  initializeSocket();
  
  // Subscribe to updates
  unsubscribe = subscribeToCaseUpdates((data) => {
    console.log('Case updated:', data);
    // Reload case list or update specific case
    loadCases();
  });
});

onDestroy(() => {
  // Cleanup
  if (unsubscribe) unsubscribe();
  disconnectSocket();
});
```

## Testing

To test real-time updates:

1. Open the Clinician portal in one browser tab
2. Open the ASHA portal in another tab
3. Mark a case as "Completed" in the Clinician portal
4. Observe the ASHA portal automatically update without refresh
5. Check browser console for WebSocket connection logs

## Future Enhancements

1. **Room-based Broadcasting** - Send updates only to relevant users
2. **Typing Indicators** - Show when someone is reviewing a case
3. **Live Notifications** - Toast notifications for urgent cases
4. **Chat/Comments** - Real-time collaboration between CHWs and clinicians
5. **Online Status** - Show which users are currently active
6. **Case Locking** - Prevent multiple users from editing the same case

## Configuration

WebSocket server configuration in `vite.config.ts`:

```typescript
server: {
  configure(server) {
    if (server.httpServer) {
      initializeWebSocket(server.httpServer);
    }
  }
}
```

Socket.IO client options in `socket-store.ts`:

```typescript
io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
})
```

## Troubleshooting

### Connection Issues
- Check browser console for connection errors
- Ensure Vite dev server is running
- Verify firewall settings allow WebSocket connections

### Events Not Received
- Check server logs for emit confirmations
- Verify socket is initialized before subscribing
- Ensure event names match between server and client

### Multiple Connections
- Use `onDestroy` to clean up connections
- Check for duplicate socket initializations
- Use store to maintain single socket instance

## Dependencies

- `socket.io` (^4.x) - Server-side WebSocket implementation
- `socket.io-client` (^4.x) - Client-side WebSocket library

## Performance Considerations

- WebSocket connections are lightweight (~1KB per connection)
- Automatic reconnection handles network interruptions
- Events are broadcasted to all clients (consider room-based filtering for scale)
- Consider rate limiting for high-frequency updates
