import { json, type RequestEvent } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { extractToken, verifyToken } from '$lib/server/auth';

// GET - List all cases (with filters)
export const GET = async ({ request, url }: RequestEvent) => {
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

		// Query parameters for filtering
		const status = url.searchParams.get('status');
		const userId = url.searchParams.get('userId');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Build where clause
		const where: any = {};
		
		if (status) {
			where.status = status;
		}
		
		// Role-based filtering
		if (payload.role === 'CHW') {
			where.userId = payload.userId;
		} else if (userId) {
			where.userId = userId;
		}

		// Fetch cases with patient data
		const cases = await prisma.case.findMany({
			where,
			include: {
				patient: {
					select: {
						id: true,
						name: true,
						age: true,
						gender: true,
						village: true
					}
				},
				user: {
					select: {
						id: true,
						name: true,
						role: true
					}
				},
				diagnoses: {
					orderBy: { createdAt: 'desc' },
					take: 1
				}
			},
			orderBy: [
				{ priority: 'desc' },
				{ createdAt: 'desc' }
			],
			take: limit,
			skip: offset
		});

		// Get total count
		const total = await prisma.case.count({ where });

		return json({
			cases,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + limit < total
			}
		});

	} catch (error) {
		console.error('Get cases error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// POST - Create a new case
export const POST = async ({ request }: RequestEvent) => {
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
		const { patient, symptoms, vitalSigns, images, audioRecordings, notes, location } = body;

		// Validate required fields
		if (!patient || !symptoms) {
			return json({ error: 'Patient and symptoms are required' }, { status: 400 });
		}

		// Create or find patient
		let patientRecord;
		if (patient.id) {
			patientRecord = await prisma.patient.findUnique({
				where: { id: patient.id }
			});
		}

		if (!patientRecord) {
			patientRecord = await prisma.patient.create({
				data: {
					name: patient.name,
					age: patient.age,
					gender: patient.gender,
					phone: patient.phone,
					village: patient.village,
					district: patient.district,
					emergencyContact: patient.emergencyContact,
					allergies: patient.allergies,
					medicalHistory: patient.medicalHistory,
					consentGiven: patient.consentGiven || false
				}
			});
		}

		// Create case
		const newCase = await prisma.case.create({
			data: {
				patientId: patientRecord.id,
				userId: payload.userId,
				symptoms,
				vitalSigns: vitalSigns ? JSON.stringify(vitalSigns) : null,
				images: images ? JSON.stringify(images) : null,
				audioRecordings: audioRecordings ? JSON.stringify(audioRecordings) : null,
				notes,
				location,
				status: 'PENDING',
				priority: 0,
				isSynced: true
			},
			include: {
				patient: true,
				user: {
					select: {
						id: true,
						name: true,
						role: true
					}
				}
			}
		});

		// Log case creation
		await prisma.auditLog.create({
			data: {
				userId: payload.userId,
				action: 'CREATE_CASE',
				resource: 'CASE',
				resourceId: newCase.id,
				outcome: 'SUCCESS'
			}
		});

		return json(newCase, { status: 201 });

	} catch (error) {
		console.error('Create case error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
