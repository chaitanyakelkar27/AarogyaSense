import { json, type RequestEvent } from '@sveltejs/kit';
import { sendSMS, makeVoiceCall, formatAlertMessage } from '$lib/server/twilio-client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded ASHA worker phone number for demo
const DEMO_ASHA_PHONE = '+918779112231'; // Replace with actua~l demo number (E.164 format: no spaces)

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

		// Determine alert type based on risk level
		let alertType: 'high_risk' | 'critical_risk' = 'high_risk';
		let shouldMakeCall = false;

		if (riskLevel === 'CRITICAL' || priority >= 5) {
			alertType = 'critical_risk';
			shouldMakeCall = true;
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
			const voiceMessage = `Critical health alert. Patient ${patientName} requires immediate medical attention. Risk score is ${riskScore} out of 100. Please check your messages for details.`;
			
			callResult = await makeVoiceCall({
				to: recipientPhone,
				message: voiceMessage
			});
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
