import { json, type RequestEvent } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { extractToken, verifyToken } from '$lib/server/auth';
import { emitCaseUpdate } from '$lib/server/websocket';

const prisma = new PrismaClient();

export async function PATCH({ request }: RequestEvent) {
	try {
		// Authentication
		const token = extractToken(request.headers.get('Authorization'));
		if (!token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const payload = verifyToken(token);
		if (!payload) {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		const body = await request.json();
		const { caseId, status, action } = body;

		if (!caseId) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		const updateData: any = {
			status,
			updatedAt: new Date()
		};

		// Handle different actions
		if (action === 'forward_to_clinician') {
			updateData.status = 'FORWARDED_TO_CLINICIAN';
			updateData.forwardedBy = payload.userId;
			updateData.forwardedAt = new Date();
		} else if (action === 'close' || action === 'mark_closed') {
			updateData.status = 'CLOSED';
			updateData.closedBy = payload.userId;
			updateData.closedAt = new Date();
		} else if (action === 'complete' || action === 'mark_completed') {
			updateData.status = 'COMPLETED';
			updateData.closedBy = payload.userId;
			updateData.closedAt = new Date();
		}

		const updatedCase = await prisma.case.update({
			where: { id: caseId },
			data: updateData,
			include: {
				patient: true,
				user: true
			}
		});

		// Emit WebSocket event for real-time updates
		emitCaseUpdate(caseId, updatedCase.status, payload.userId);

		return json({
			success: true,
			case: updatedCase,
			message: 'Case status updated successfully'
		});
	} catch (error) {
		console.error('Case update error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update case'
			},
			{ status: 500 }
		);
	}
}
