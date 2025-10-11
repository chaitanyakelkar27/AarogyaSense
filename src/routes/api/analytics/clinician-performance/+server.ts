/**
 * GET /api/analytics/clinician-performance - Get clinician performance metrics
 * Returns statistics about clinician case handling and outcomes
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ url }) => {
	try {
		const clinicianId = url.searchParams.get('clinicianId') || undefined;
		const days = parseInt(url.searchParams.get('days') || '30');

		// Calculate date range
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		// Build filter
		const diagnosisWhere: any = {
			createdAt: {
				gte: startDate,
				lte: endDate
			},
			aiGenerated: false // Only clinician diagnoses
		};

		if (clinicianId) {
			diagnosisWhere.userId = clinicianId;
		}

		// Get all clinician diagnoses in period
		const diagnoses = await prisma.diagnosis.findMany({
			where: diagnosisWhere,
			include: {
				case: {
					include: {
						patient: true
					}
				},
				clinician: {
					select: {
						id: true,
						name: true,
						role: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		// Get escalated cases in period
		const escalatedCases = await prisma.case.findMany({
			where: {
				priority: { gte: 3 },
				createdAt: {
					gte: startDate,
					lte: endDate
				}
			},
			include: {
				diagnoses: {
					where: { aiGenerated: false },
					orderBy: { createdAt: 'desc' },
					take: 1
				}
			}
		});

		// Calculate metrics
		const totalDiagnoses = diagnoses.length;
		const uniquePatients = new Set(diagnoses.map(d => d.case.patientId)).size;
		const prescriptionsGiven = diagnoses.filter(d => d.prescription).length;
		const referrals = diagnoses.filter(d => 
			d.recommendations.toLowerCase().includes('refer') ||
			d.urgency === 'CRITICAL'
		).length;
		
		// Average risk score
		const avgRiskScore = diagnoses.length > 0
			? diagnoses.reduce((sum, d) => sum + d.riskScore, 0) / diagnoses.length
			: 0;

		// Urgency breakdown
		const urgencyBreakdown = {
			LOW: diagnoses.filter(d => d.urgency === 'LOW').length,
			MEDIUM: diagnoses.filter(d => d.urgency === 'MEDIUM').length,
			HIGH: diagnoses.filter(d => d.urgency === 'HIGH').length,
			CRITICAL: diagnoses.filter(d => d.urgency === 'CRITICAL').length
		};

		// Cases by clinician (if not filtered by specific clinician)
		const byClinician: any[] = [];
		if (!clinicianId) {
			const clinicianGroups = new Map<string, any>();
			
			for (const diagnosis of diagnoses) {
				const cId = diagnosis.userId;
				if (!clinicianGroups.has(cId)) {
					clinicianGroups.set(cId, {
						clinicianId: cId,
						clinicianName: diagnosis.clinician.name,
						casesReviewed: 0,
						prescriptions: 0,
						referrals: 0,
						avgRiskScore: 0,
						totalRisk: 0
					});
				}
				
				const group = clinicianGroups.get(cId)!;
				group.casesReviewed++;
				group.totalRisk += diagnosis.riskScore;
				if (diagnosis.prescription) group.prescriptions++;
				if (diagnosis.recommendations.toLowerCase().includes('refer')) group.referrals++;
			}

			// Calculate averages
			clinicianGroups.forEach(group => {
				group.avgRiskScore = group.totalRisk / group.casesReviewed;
				delete group.totalRisk;
				byClinician.push(group);
			});

			// Sort by cases reviewed
			byClinician.sort((a, b) => b.casesReviewed - a.casesReviewed);
		}

		// Daily trend
		const dailyTrend: any[] = [];
		const dayMap = new Map<string, any>();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];
			dayMap.set(dateKey, {
				date: dateKey,
				diagnoses: 0,
				prescriptions: 0,
				referrals: 0
			});
		}

		for (const diagnosis of diagnoses) {
			const dateKey = diagnosis.createdAt.toISOString().split('T')[0];
			if (dayMap.has(dateKey)) {
				const day = dayMap.get(dateKey)!;
				day.diagnoses++;
				if (diagnosis.prescription) day.prescriptions++;
				if (diagnosis.recommendations.toLowerCase().includes('refer')) day.referrals++;
			}
		}

		dayMap.forEach(value => dailyTrend.push(value));

		// Recent critical cases
		const criticalCases = escalatedCases
			.filter(c => c.priority >= 4)
			.slice(0, 10)
			.map(c => ({
				caseId: c.id,
				patientAge: JSON.parse(c.vitalSigns || '{}').age || 'N/A',
				priority: c.priority,
				status: c.status,
				createdAt: c.createdAt,
				hasClinicianReview: c.diagnoses.length > 0,
				clinicianNotes: c.diagnoses[0]?.notes || null
			}));

		return json({
			summary: {
				totalDiagnoses,
				uniquePatients,
				prescriptionsGiven,
				referrals,
				avgRiskScore: parseFloat(avgRiskScore.toFixed(2)),
				prescriptionRate: totalDiagnoses > 0 
					? parseFloat(((prescriptionsGiven / totalDiagnoses) * 100).toFixed(1))
					: 0,
				referralRate: totalDiagnoses > 0
					? parseFloat(((referrals / totalDiagnoses) * 100).toFixed(1))
					: 0,
				urgencyBreakdown
			},
			byClinician,
			dailyTrend,
			criticalCases,
			dateRange: {
				start: startDate.toISOString(),
				end: endDate.toISOString(),
				days
			}
		});

	} catch (error) {
		console.error('Error fetching clinician performance:', error);
		return json(
			{ error: 'Failed to fetch clinician performance metrics' },
			{ status: 500 }
		);
	}
};
