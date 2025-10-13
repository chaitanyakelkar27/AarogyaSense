import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';

interface CaseUpdateEvent {
	caseId: string;
	status: string;
	updatedBy: string;
	timestamp: string;
}

interface NewCaseEvent {
	id: string;
	timestamp: string;
	[key: string]: any;
}

// Store for socket connection
export const socketStore = writable<Socket | null>(null);

// Store for connection status
export const socketConnected = writable(false);

// Store for case updates
export const caseUpdates = writable<CaseUpdateEvent[]>([]);

let socket: Socket | null = null;

/**
 * Initialize socket connection (client-side only)
 */
export function initializeSocket() {
	if (!browser) return;

	// Don't reinitialize if already connected
	if (socket && socket.connected) {
		console.log('Socket already connected');
		return socket;
	}

	// Connect to the same origin
	socket = io({
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionAttempts: 5
	});

	// Connection events
	socket.on('connect', () => {
		console.log('Socket.IO connected:', socket?.id);
		socketConnected.set(true);
		socketStore.set(socket);
	});

	socket.on('disconnect', () => {
		console.log('Socket.IO disconnected');
		socketConnected.set(false);
	});

	socket.on('connect_error', (error) => {
		console.error('Socket.IO connection error:', error);
		socketConnected.set(false);
	});

	// Listen for case status updates
	socket.on('caseStatusUpdate', (data: CaseUpdateEvent) => {
		console.log('Case status update received:', data);
		caseUpdates.update((updates) => [...updates, data]);
	});

	// Listen for new cases
	socket.on('newCase', (data: NewCaseEvent) => {
		console.log('New case notification:', data);
		// Trigger a custom event for components to handle
		if (browser) {
			window.dispatchEvent(new CustomEvent('newCase', { detail: data }));
		}
	});

	return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
	if (socket) {
		socket.disconnect();
		socket = null;
		socketStore.set(null);
		socketConnected.set(false);
	}
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
	return socket;
}

/**
 * Subscribe to case updates for a specific case
 */
export function subscribeToCaseUpdates(callback: (data: CaseUpdateEvent) => void) {
	if (!socket) {
		console.warn('Socket not initialized');
		return () => {};
	}

	const handler = (data: CaseUpdateEvent) => {
		callback(data);
	};

	socket.on('caseStatusUpdate', handler);

	// Return unsubscribe function
	return () => {
		if (socket) {
			socket.off('caseStatusUpdate', handler);
		}
	};
}

/**
 * Clear case updates history
 */
export function clearCaseUpdates() {
	caseUpdates.set([]);
}
