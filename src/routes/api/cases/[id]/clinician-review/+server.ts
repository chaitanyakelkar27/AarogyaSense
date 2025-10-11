/**
 * PUT /api/cases/:id/clinician-review - Clinician reviews escalated case
 * Actions: accept (for treatment), refer (to specialist), prescribe
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = params.id;
		if (!id) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { 
			action, 
			diagnosis, 
			prescription, 
			notes, 
			followUpDate,
			clinicianId,
			referralReason 
		} = body;

		// Validate action
		if (!['accept', 'refer', 'prescribe'].includes(action)) {
			return json(
				{ error: 'Invalid action. Must be: accept, refer, or prescribe' },
				{ status: 400 }
			);
		}

		// Get the case
		const existingCase = await prisma.case.findUnique({
			where: { id },
			include: { patient: true, user: true }
		});

		if (!existingCase) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Update case based on action
		let updatedCase;
		let newDiagnosis = null;
		let alert = null;

		if (action === 'accept') {
			// Clinician accepts case for treatment
			updatedCase = await prisma.case.update({
				where: { id },
				data: {
					status: 'UNDER_REVIEW',
					updatedAt: new Date()
				},
				include: { patient: true, user: true }
			});

			// Create diagnosis if provided
			if (diagnosis && clinicianId) {
				newDiagnosis = await prisma.diagnosis.create({
					data: {
						caseId: id,
						userId: clinicianId,
						condition: diagnosis.condition || 'Under clinical review',
						confidence: diagnosis.confidence || 0.85,
						riskScore: diagnosis.riskScore || existingCase.priority / 5,
						urgency: diagnosis.urgency || 'MEDIUM',
						aiGenerated: false,
						recommendations: diagnosis.recommendations || notes || '',
						prescription: prescription || null,
						followUpDate: followUpDate ? new Date(followUpDate) : null,
						notes: notes || null
					}
				});
			}

			// Create alert for CHW and ASHA
			alert = await prisma.alert.create({
				data: {
					caseId: id,
					userId: existingCase.userId, // Original CHW
					level: 'MEDIUM',
					message: `Case #${id.slice(0, 8)} accepted by clinician. ${notes ? `Note: ${notes}` : ''}`,
					channels: JSON.stringify(['sms', 'push']),
					status: 'PENDING'
				}
			});

			// Create audit log
			await prisma.auditLog.create({
				data: {
					userId: clinicianId || 'system',
					action: 'CLINICIAN_ACCEPT_CASE',
					resource: 'Case',
					resourceId: id,
					details: `Clinician accepted case. ${notes || ''}`,
					outcome: 'success',
					riskLevel: 'medium'
				}
			});

		} else if (action === 'refer') {
			// Clinician refers to specialist
			updatedCase = await prisma.case.update({
				where: { id },
				data: {
					status: 'UNDER_REVIEW',
					priority: 5, // Max priority for specialist referral
					updatedAt: new Date()
				},
				include: { patient: true, user: true }
			});

			// Create diagnosis with referral
			if (clinicianId) {
				newDiagnosis = await prisma.diagnosis.create({
					data: {
						caseId: id,
						userId: clinicianId,
						condition: 'Specialist referral required',
						confidence: 0.9,
						riskScore: 0.9,
						urgency: 'CRITICAL',
						aiGenerated: false,
						recommendations: `REFERRED TO SPECIALIST. Reason: ${referralReason || notes || 'Complex case requiring specialist consultation'}`,
						notes: notes || null
					}
				});
			}

			// Create high priority alert
			alert = await prisma.alert.create({
				data: {
					caseId: id,
					userId: existingCase.userId,
					level: 'HIGH',
					message: `Case #${id.slice(0, 8)} referred to specialist by clinician. Reason: ${referralReason || 'Complex case'}`,
					channels: JSON.stringify(['sms', 'push', 'email']),
					status: 'PENDING'
				}
			});

			// Create audit log
			await prisma.auditLog.create({
				data: {
					userId: clinicianId || 'system',
					action: 'CLINICIAN_REFER_CASE',
					resource: 'Case',
					resourceId: id,
					details: `Clinician referred case to specialist. Reason: ${referralReason || notes || 'N/A'}`,
					outcome: 'success',
					riskLevel: 'high'
				}
			});

		} else if (action === 'prescribe') {
			// Clinician adds prescription
			updatedCase = await prisma.case.update({
				where: { id },
				data: {
					status: 'APPROVED', // Mark as approved with prescription
					updatedAt: new Date()
				},
				include: { patient: true, user: true }
			});

			// Create diagnosis with prescription
			if (clinicianId) {
				newDiagnosis = await prisma.diagnosis.create({
					data: {
						caseId: id,
						userId: clinicianId,
						condition: diagnosis?.condition || 'Diagnosed and prescribed',
						confidence: diagnosis?.confidence || 0.9,
						riskScore: diagnosis?.riskScore || 0.5,
						urgency: diagnosis?.urgency || 'MEDIUM',
						aiGenerated: false,
						recommendations: diagnosis?.recommendations || notes || '',
						prescription: prescription,
						followUpDate: followUpDate ? new Date(followUpDate) : null,
						notes: notes || null
					}
				});
			}

			// Create alert with prescription info
			alert = await prisma.alert.create({
				data: {
					caseId: id,
					userId: existingCase.userId,
					level: 'MEDIUM',
					message: `Prescription ready for case #${id.slice(0, 8)}. ${followUpDate ? `Follow-up: ${new Date(followUpDate).toLocaleDateString()}` : ''}`,
					channels: JSON.stringify(['sms', 'push']),
					status: 'PENDING'
				}
			});

			// Create audit log
			await prisma.auditLog.create({
				data: {
					userId: clinicianId || 'system',
					action: 'CLINICIAN_PRESCRIBE',
					resource: 'Case',
					resourceId: id,
					details: `Clinician prescribed treatment. ${notes || ''}`,
					outcome: 'success',
					riskLevel: 'low'
				}
			});
		}

		return json({
			case: updatedCase,
			diagnosis: newDiagnosis,
			alert,
			message: `Case ${action}ed successfully`
		});

	} catch (error) {
		console.error('Error in clinician review:', error);
		return json(
			{ error: 'Failed to process clinician review' },
			{ status: 500 }
		);
	}
};
