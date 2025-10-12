import { json, type RequestEvent } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH({ request, locals }: RequestEvent) {
	try {
		const user = (locals as any).user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
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
			updateData.forwardedBy = user.id;
			updateData.forwardedAt = new Date();
		} else if (action === 'close' || action === 'mark_closed') {
			updateData.status = 'CLOSED';
			updateData.closedBy = user.id;
			updateData.closedAt = new Date();
		} else if (action === 'complete' || action === 'mark_completed') {
			updateData.status = 'COMPLETED';
			updateData.closedBy = user.id;
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
