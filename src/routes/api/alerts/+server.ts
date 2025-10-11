import { json, type RequestEvent } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { extractToken, verifyToken } from '$lib/server/auth';
import { sendAlert, formatAlertMessage, formatPhoneNumber, validatePhoneNumber } from '$lib/server/twilio-client';

// POST - Create and send an alert
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
		const { caseId, recipientId, level, message, channels } = body;

		// Validate required fields
		if (!caseId || !recipientId || !level || !message) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Get case details
		const caseRecord = await prisma.case.findUnique({
			where: { id: caseId },
			include: {
				patient: true,
				user: true
			}
		});

		if (!caseRecord) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Get recipient details
		const recipient = await prisma.user.findUnique({
			where: { id: recipientId }
		});

		if (!recipient) {
			return json({ error: 'Recipient not found' }, { status: 404 });
		}

		// Create alert record
		const alert = await prisma.alert.create({
			data: {
				caseId,
				userId: recipientId,
				level,
				message,
				channels: JSON.stringify(channels || ['sms']),
				status: 'PENDING'
			}
		});

		// Send alert if phone number available
		let deliveryResult = null;
		if (recipient.phone && channels?.includes('sms')) {
			const formattedPhone = formatPhoneNumber(recipient.phone);
			
			if (validatePhoneNumber(formattedPhone)) {
				deliveryResult = await sendAlert(
					formattedPhone,
					message,
					level.toLowerCase() as any
				);

				// Update alert status
				await prisma.alert.update({
					where: { id: alert.id },
					data: {
						status: deliveryResult.success ? 'SENT' : 'FAILED',
						sentAt: deliveryResult.success ? new Date() : null,
						failureReason: deliveryResult.error
					}
				});
			}
		}

		// Log alert creation
		await prisma.auditLog.create({
			data: {
				userId: payload.userId,
				action: 'CREATE_ALERT',
				resource: 'ALERT',
				resourceId: alert.id,
				outcome: deliveryResult?.success ? 'SUCCESS' : 'FAILED',
				details: JSON.stringify({ caseId, level })
			}
		});

		return json({
			alert,
			delivery: deliveryResult
		}, { status: 201 });

	} catch (error) {
		console.error('Create alert error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// GET - List alerts
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

		// Query parameters
		const caseId = url.searchParams.get('caseId');
		const userId = url.searchParams.get('userId');
		const status = url.searchParams.get('status');
		const level = url.searchParams.get('level');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Build where clause
		const where: any = {};
		
		if (caseId) where.caseId = caseId;
		if (status) where.status = status;
		if (level) where.level = level;
		
		// Role-based filtering
		if (payload.role === 'CHW' || userId) {
			where.userId = userId || payload.userId;
		}

		// Fetch alerts
		const alerts = await prisma.alert.findMany({
			where,
			include: {
				case: {
					include: {
						patient: {
							select: {
								name: true,
								age: true,
								gender: true
							}
						}
					}
				},
				recipient: {
					select: {
						name: true,
						role: true,
						phone: true
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			take: limit
		});

		return json({ alerts });

	} catch (error) {
		console.error('Get alerts error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
