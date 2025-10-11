import { json, type RequestEvent } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verifyToken } from '$lib/server/auth';

// Extract token from Authorization header
function extractToken(request: Request): string | null {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.substring(7);
}

// PUT /api/cases/:id/review - Approve or reject a case
export const PUT = async ({ request, params }: RequestEvent) => {
	try {
		// Verify authentication
		const token = extractToken(request);
		if (!token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const payload = verifyToken(token);
		if (!payload) {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		// Check role (ASHA, CLINICIAN, or ADMIN can review)
		if (!['ASHA', 'CLINICIAN', 'ADMIN'].includes(payload.role)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const { id } = params;
		if (!id) {
			return json({ error: 'Case ID required' }, { status: 400 });
		}

		// Get request body
		const body = await request.json();
		const { action, notes, priority } = body;

		// Validate action
		if (!action || !['approve', 'reject', 'escalate'].includes(action)) {
			return json({ error: 'Invalid action. Must be: approve, reject, or escalate' }, { status: 400 });
		}

		// Check if case exists
		const existingCase = await prisma.case.findUnique({
			where: { id },
			include: {
				patient: true,
				user: true
			}
		});

		if (!existingCase) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Determine new status based on action
		let newStatus: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
		if (action === 'approve') {
			newStatus = 'APPROVED';
		} else if (action === 'reject') {
			newStatus = 'REJECTED';
		} else {
			newStatus = 'UNDER_REVIEW';
		}

		// Update case
		const updatedCase = await prisma.case.update({
			where: { id },
			data: {
				status: newStatus,
				priority: priority !== undefined ? priority : existingCase.priority,
				notes: notes ? `${existingCase.notes || ''}\n[${payload.role} Review]: ${notes}` : existingCase.notes,
				updatedAt: new Date()
			},
			include: {
				patient: true,
				user: true
			}
		});

		// Create audit log
		await prisma.auditLog.create({
			data: {
				userId: payload.userId,
				action: action.toUpperCase(),
				resource: 'CASE',
				resourceId: id,
				details: `Case ${action}ed by ${payload.role}`,
				outcome: 'SUCCESS'
			}
		});

		// If approved and high priority, create alert
		if (action === 'approve' && updatedCase.priority >= 75) {
			try {
				await prisma.alert.create({
					data: {
						caseId: updatedCase.id,
						userId: existingCase.userId, // Notify the CHW
						level: updatedCase.priority >= 90 ? 'CRITICAL' : 'HIGH',
						message: `Your case for patient ${existingCase.patient.name} has been approved and marked as high priority`,
						channels: JSON.stringify(['sms'])
					}
				});
			} catch (alertError) {
				console.error('Failed to create alert:', alertError);
				// Don't fail the review if alert fails
			}
		}

		return json({
			case: updatedCase,
			message: `Case ${action}ed successfully`
		});

	} catch (error) {
		console.error('Case review error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
