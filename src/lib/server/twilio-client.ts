import twilio from 'twilio';
import { dev } from '$app/environment';

// Twilio credentials - should be in environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Initialize Twilio client
const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
	? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
	: null;

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
	if (!client || !TWILIO_PHONE_NUMBER) {
		if (dev) {
			console.log('[TWILIO MOCK] Voice call would be made:', options);
			return { success: true, messageId: `mock-call-${Date.now()}` };
		}
		return { success: false, error: 'Twilio not configured' };
	}

	try {
		const call = await client.calls.create({
			twiml: `<Response><Say voice="${options.voice || 'alice'}" language="en-IN">${options.message}</Say></Response>`,
			to: options.to,
			from: TWILIO_PHONE_NUMBER
		});

		return {
			success: true,
			messageId: call.sid
		};
	} catch (error) {
		console.error('Voice call error:', error);
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
