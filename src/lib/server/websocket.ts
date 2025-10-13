import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeWebSocket(httpServer: HTTPServer) {
	if (io) {
		console.log('Socket.IO server already initialized');
		return io;
	}

	io = new SocketIOServer(httpServer, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	});

	io.on('connection', (socket) => {
		console.log('Client connected:', socket.id);

		socket.on('disconnect', () => {
			console.log('Client disconnected:', socket.id);
		});
	});

	console.log('Socket.IO server initialized');
	return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getWebSocket(): SocketIOServer | null {
	return io;
}

/**
 * Emit a case status update event to all connected clients
 */
export function emitCaseUpdate(caseId: string, status: string, updatedBy: string) {
	if (!io) {
		console.warn('Socket.IO server not initialized');
		return;
	}

	io.emit('caseStatusUpdate', {
		caseId,
		status,
		updatedBy,
		timestamp: new Date().toISOString()
	});

	console.log(`Emitted case update: ${caseId} -> ${status}`);
}

/**
 * Emit a new case notification
 */
export function emitNewCase(caseData: any) {
	if (!io) {
		console.warn('Socket.IO server not initialized');
		return;
	}

	io.emit('newCase', {
		...caseData,
		timestamp: new Date().toISOString()
	});

	console.log(`Emitted new case: ${caseData.id}`);
}
