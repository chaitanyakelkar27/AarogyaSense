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

// GET /api/analytics/chw-performance - Get CHW performance metrics
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

		// Check role (ASHA, CLINICIAN, or ADMIN can view analytics)
		if (!['ASHA', 'CLINICIAN', 'ADMIN'].includes(payload.role)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const chwId = url.searchParams.get('chwId');
		const days = parseInt(url.searchParams.get('days') || '30');

		// Calculate date range
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		// Build where clause for cases
		const whereClause: any = {
			createdAt: {
				gte: startDate
			}
		};

		if (chwId) {
			whereClause.userId = chwId;
		} else {
			// Only get cases from CHW users
			const chwUsers = await prisma.user.findMany({
				where: { role: 'CHW' },
				select: { id: true }
			});
			whereClause.userId = {
				in: chwUsers.map(u => u.id)
			};
		}

		// Get cases
		const cases = await prisma.case.findMany({
			where: whereClause,
			include: {
				user: {
					select: {
						id: true,
						name: true
					}
				},
				diagnoses: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		// Calculate metrics
		const totalCases = cases.length;
		const pendingCases = cases.filter(c => c.status === 'PENDING').length;
		const approvedCases = cases.filter(c => c.status === 'APPROVED').length;
		const rejectedCases = cases.filter(c => c.status === 'REJECTED').length;
		const criticalCases = cases.filter(c => c.priority >= 75).length;

		// Calculate average response time (time from creation to first review)
		const reviewedCases = cases.filter(c => c.status !== 'PENDING');
		let avgResponseTime = 0;
		if (reviewedCases.length > 0) {
			const totalTime = reviewedCases.reduce((sum, c) => {
				const responseTime = c.updatedAt.getTime() - c.createdAt.getTime();
				return sum + responseTime;
			}, 0);
			avgResponseTime = Math.round(totalTime / reviewedCases.length / (1000 * 60 * 60)); // Convert to hours
		}

		// Group by CHW
		const byCHW: Record<string, any> = {};
		cases.forEach(c => {
			const chwId = c.userId;
			const chwName = c.user.name;
			
			if (!byCHW[chwId]) {
				byCHW[chwId] = {
					id: chwId,
					name: chwName,
					totalCases: 0,
					pendingCases: 0,
					approvedCases: 0,
					rejectedCases: 0,
					criticalCases: 0,
					approvalRate: 0
				};
			}

			byCHW[chwId].totalCases++;
			if (c.status === 'PENDING') byCHW[chwId].pendingCases++;
			if (c.status === 'APPROVED') byCHW[chwId].approvedCases++;
			if (c.status === 'REJECTED') byCHW[chwId].rejectedCases++;
			if (c.priority >= 75) byCHW[chwId].criticalCases++;
		});

		// Calculate approval rates
		Object.values(byCHW).forEach((chw: any) => {
			const reviewed = chw.approvedCases + chw.rejectedCases;
			chw.approvalRate = reviewed > 0 ? Math.round((chw.approvedCases / reviewed) * 100) : 0;
		});

		// Get daily case volume for trend
		const dailyVolume: Record<string, number> = {};
		cases.forEach(c => {
			const date = c.createdAt.toISOString().split('T')[0];
			dailyVolume[date] = (dailyVolume[date] || 0) + 1;
		});

		const volumeTrend = Object.entries(dailyVolume)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, count]) => ({ date, count }));

		// AI accuracy metrics (from diagnoses)
		const aiDiagnoses = cases.flatMap(c => c.diagnoses.filter(d => d.aiGenerated));
		const avgAIConfidence = aiDiagnoses.length > 0
			? Math.round(aiDiagnoses.reduce((sum, d) => sum + d.confidence, 0) / aiDiagnoses.length * 100)
			: 0;

		return json({
			summary: {
				totalCases,
				pendingCases,
				approvedCases,
				rejectedCases,
				criticalCases,
				avgResponseTime,
				approvalRate: totalCases > 0 ? Math.round((approvedCases / (approvedCases + rejectedCases)) * 100) : 0,
				avgAIConfidence
			},
			byCHW: Object.values(byCHW),
			volumeTrend,
			dateRange: {
				start: startDate.toISOString(),
				end: new Date().toISOString(),
				days
			}
		});

	} catch (error) {
		console.error('Analytics error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
