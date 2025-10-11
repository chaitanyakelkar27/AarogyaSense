/**
 * GET /api/clinician/cases - Get escalated cases for clinician
 * Returns cases with high priority that need clinician attention
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ url }) => {
	try {
		const status = url.searchParams.get('status') || undefined;
		const priorityMin = url.searchParams.get('priorityMin') 
			? parseInt(url.searchParams.get('priorityMin')!) 
			: 3; // Default to high priority cases (3+)
		const limit = url.searchParams.get('limit') 
			? parseInt(url.searchParams.get('limit')!) 
			: 50;

		// Build filter
		const where: any = {
			priority: { gte: priorityMin }
		};

		if (status) {
			where.status = status;
		}

		// Get escalated cases with related data
		const cases = await prisma.case.findMany({
			where,
			include: {
				patient: true,
				user: {
					select: {
						id: true,
						name: true,
						role: true,
						phone: true
					}
				},
				diagnoses: {
					orderBy: {
						createdAt: 'desc'
					},
					take: 1
				},
				alerts: {
					where: {
						level: { in: ['HIGH', 'CRITICAL'] }
					},
					orderBy: {
						createdAt: 'desc'
					},
					take: 3
				}
			},
			orderBy: [
				{ priority: 'desc' },
				{ createdAt: 'desc' }
			],
			take: limit
		});

		// Get statistics
		const stats = {
			totalEscalated: cases.length,
			pending: cases.filter(c => c.status === 'PENDING').length,
			underReview: cases.filter(c => c.status === 'UNDER_REVIEW').length,
			criticalPriority: cases.filter(c => c.priority >= 4).length
		};

		return json({
			cases,
			stats,
			total: cases.length
		});
	} catch (error) {
		console.error('Error fetching clinician cases:', error);
		return json(
			{ error: 'Failed to fetch cases' },
			{ status: 500 }
		);
	}
};
