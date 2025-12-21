import twilio from 'twilio';
import { dev } from '$app/environment';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } from '$env/static/private';

// Initialize Twilio client
const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
	? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
	: null;

console.log('[TWILIO INIT]', {
	hasClient: !!client,
	hasSID: !!TWILIO_ACCOUNT_SID,
	hasToken: !!TWILIO_AUTH_TOKEN,
	hasPhone: !!TWILIO_PHONE_NUMBER,
	sidPrefix: TWILIO_ACCOUNT_SID?.substring(0, 4)
});

export interface SMSOptions {
	to: string;
	message: string;
	priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface VoiceCallOptions {
	to: string;
	message: string;
	voice?: string;
}

export interface AlertResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Send SMS message
 */
export async function sendSMS(options: SMSOptions): Promise<AlertResult> {
	if (!client || !TWILIO_PHONE_NUMBER) {
		if (dev) {
			console.log('[TWILIO MOCK] SMS would be sent:', options);
			return { success: true, messageId: `mock-${Date.now()}` };
		}
		return { success: false, error: 'Twilio not configured' };
	}

	try {
		const message = await client.messages.create({
			body: options.message,
			to: options.to,
			from: TWILIO_PHONE_NUMBER
		});

		return {
			success: true,
			messageId: message.sid
		};
	} catch (error) {
		console.error('SMS send error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Make voice call with text-to-speech
 */
export async function makeVoiceCall(options: VoiceCallOptions): Promise<AlertResult> {
	console.log('[TWILIO] makeVoiceCall called with:', {
		to: options.to,
		client: !!client,
		phoneNumber: TWILIO_PHONE_NUMBER,
		messageLength: options.message?.length
	});

	if (!client || !TWILIO_PHONE_NUMBER) {
		console.error('[TWILIO] Client or phone number not configured!', {
			hasClient: !!client,
			hasSid: !!TWILIO_ACCOUNT_SID,
			hasToken: !!TWILIO_AUTH_TOKEN,
			hasPhone: !!TWILIO_PHONE_NUMBER
		});

		return { success: false, error: 'Twilio not configured - check .env file' };
	}

	try {
		console.log('[TWILIO] Initiating voice call to:', options.to);
		console.log('[TWILIO] Using phone number:', TWILIO_PHONE_NUMBER);
		console.log('[TWILIO] Message:', options.message);

		const twimlMessage = `<Response><Say voice="${options.voice || 'alice'}" language="en-IN">${options.message}</Say></Response>`;
		console.log('[TWILIO] TwiML:', twimlMessage);

		const call = await client.calls.create({
			twiml: twimlMessage,
			to: options.to,
			from: TWILIO_PHONE_NUMBER
		});

		console.log('[TWILIO] Voice call created successfully:', {
			sid: call.sid,
			status: call.status,
			to: call.to,
			from: call.from
		});

		return {
			success: true,
			messageId: call.sid
		};
	} catch (error) {
		console.error('[TWILIO] Voice call error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Send multi-channel alert (SMS + Voice for critical)
 */
export async function sendAlert(
	phone: string,
	message: string,
	priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<AlertResult> {
	// Send SMS first
	const smsResult = await sendSMS({ to: phone, message, priority });

	// For critical alerts, also make voice call
	if (priority === 'critical' && smsResult.success) {
		await makeVoiceCall({
			to: phone,
			message: `Critical health alert: ${message}. This is an automated call from Aarogya Health System.`
		});
	}

	return smsResult;
}

/**
 * Format alert message for different scenarios
 */
export function formatAlertMessage(
	type: 'case_created' | 'high_risk' | 'critical_risk' | 'follow_up',
	data: Record<string, any>
): string {
	switch (type) {
		case 'case_created':
			return `New case created for ${data.patientName} by ${data.chwName}. Status: ${data.status}`;

		case 'high_risk':
			return `HIGH RISK ALERT: Patient ${data.patientName} requires urgent attention. Risk score: ${data.riskScore}/100. Symptoms: ${data.symptoms}`;

		case 'critical_risk':
			return `CRITICAL ALERT: Patient ${data.patientName} needs IMMEDIATE medical intervention. Risk score: ${data.riskScore}/100. Call ${data.emergencyContact} immediately.`;

		case 'follow_up':
			return `Follow-up reminder for ${data.patientName}. Scheduled date: ${data.followUpDate}. Contact: ${data.phone}`;

		default:
			return data.message || 'Health system notification';
	}
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
	// E.164 format: +[country code][number]
	// Indian format: +91XXXXXXXXXX
	const regex = /^\+[1-9]\d{1,14}$/;
	return regex.test(phone);
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phone: string, countryCode: string = '91'): string {
	// Remove all non-digit characters
	const digits = phone.replace(/\D/g, '');

	// If already has country code, return with +
	if (digits.startsWith(countryCode)) {
		return `+${digits}`;
	}

	// Add country code
	return `+${countryCode}${digits}`;
}
