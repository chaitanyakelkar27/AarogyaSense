import { json, type RequestEvent } from '@sveltejs/kit';
import { sendSMS, makeVoiceCall, formatAlertMessage } from '$lib/server/twilio-client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded ASHA worker phone number for demo (E.164 format with +91 country code)
const DEMO_ASHA_PHONE = '+918779112231'; // India phone number in E.164 format

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			caseId,
			patientName,
			patientPhone,
			symptoms,
			riskLevel,
			riskScore,
			priority,
			chwName,
			ashaPhone
		} = body;

		// Use provided ASHA phone or default demo phone
		const recipientPhone = ashaPhone || DEMO_ASHA_PHONE;

		console.log('[ALERT] Processing alert:', {
			caseId,
			riskLevel,
			priority,
			recipientPhone,
			patientName,
			shouldMakeCall: (riskLevel === 'CRITICAL' || priority >= 5) || (riskLevel === 'HIGH' || priority >= 4)
		});

		// Determine alert type based on risk level
		let alertType: 'high_risk' | 'critical_risk' = 'high_risk';
		let shouldMakeCall = false;

		// Make voice call for HIGH (priority 4) and CRITICAL (priority 5) cases
		if (riskLevel === 'CRITICAL' || priority >= 5) {
			alertType = 'critical_risk';
			shouldMakeCall = true;
		} else if (riskLevel === 'HIGH' || priority >= 4) {
			alertType = 'high_risk';
			shouldMakeCall = true; // Enable calls for HIGH risk too
		}

		// Format the message
		const smsMessage = formatAlertMessage(alertType, {
			patientName,
			riskScore,
			symptoms,
			emergencyContact: patientPhone,
			chwName
		});

		// Send SMS
		const smsResult = await sendSMS({
			to: recipientPhone,
			message: smsMessage,
			priority: riskLevel.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
		});

		let callResult = null;

		// Make voice call for critical cases
		if (shouldMakeCall) {
			console.log('[ALERT] Making voice call to:', recipientPhone);

			const voiceMessage = `Critical health alert. Patient ${patientName} requires immediate medical attention. Risk score is ${riskScore} out of 100. Please check your messages for details.`;

			callResult = await makeVoiceCall({
				to: recipientPhone,
				message: voiceMessage
			});

			console.log('[ALERT] Voice call result:', callResult);
		} else {
			console.log('[ALERT] Skipping voice call - risk level not high enough');
		}

		// Save alert to database
		if (smsResult.success) {
			const user = (locals as any).user;
			await prisma.alert.create({
				data: {
					caseId,
					userId: user?.id || 'system',
					level: riskLevel,
					message: smsMessage,
					channels: JSON.stringify(shouldMakeCall ? ['sms', 'voice'] : ['sms']),
					status: 'SENT',
					sentAt: new Date()
				}
			});
		}

		return json({
			success: true,
			sms: smsResult,
			call: callResult,
			message: 'Alert sent successfully'
		});
	} catch (error) {
		console.error('Alert send error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to send alert'
			},
			{ status: 500 }
		);
	}
};
