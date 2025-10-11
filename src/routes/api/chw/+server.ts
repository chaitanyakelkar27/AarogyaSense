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

// GET /api/chw - List all CHW users
export const GET = async ({ request, url }: RequestEvent) => {
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

		// Check role (ASHA, ADMIN, or CLINICIAN can view CHWs)
		if (!['ASHA', 'ADMIN', 'CLINICIAN'].includes(payload.role)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// Get query parameters
		const isActive = url.searchParams.get('active');
		const location = url.searchParams.get('location');

		// Build where clause
		const where: any = {
			role: 'CHW'
		};

		if (isActive !== null) {
			where.isActive = isActive === 'true';
		}

		if (location) {
			where.location = {
				contains: location
			};
		}

		// Fetch CHW users
		const chws = await prisma.user.findMany({
			where,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				location: true,
				language: true,
				isActive: true,
				createdAt: true,
				updatedAt: true
			},
			orderBy: {
				name: 'asc'
			}
		});

		// Get case counts for each CHW
		const chwsWithStats = await Promise.all(
			chws.map(async (chw) => {
				const totalCases = await prisma.case.count({
					where: { userId: chw.id }
				});

				const pendingCases = await prisma.case.count({
					where: {
						userId: chw.id,
						status: 'PENDING'
					}
				});

				const approvedCases = await prisma.case.count({
					where: {
						userId: chw.id,
						status: 'APPROVED'
					}
				});

				const criticalCases = await prisma.case.count({
					where: {
						userId: chw.id,
						priority: { gte: 75 } // Priority >= 75 is critical
					}
				});

				return {
					...chw,
					stats: {
						totalCases,
						pendingCases,
						approvedCases,
						criticalCases
					}
				};
			})
		);

		return json({
			chws: chwsWithStats,
			total: chwsWithStats.length
		});

	} catch (error) {
		console.error('CHW list error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
