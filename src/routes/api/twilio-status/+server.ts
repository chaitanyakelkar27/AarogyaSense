import { json } from '@sveltejs/kit';

export async function GET() {
    const config = {
        hasSID: !!process.env.TWILIO_ACCOUNT_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhone: !!process.env.TWILIO_PHONE_NUMBER,
        sidLength: process.env.TWILIO_ACCOUNT_SID?.length || 0,
        tokenLength: process.env.TWILIO_AUTH_TOKEN?.length || 0,
        phoneValue: process.env.TWILIO_PHONE_NUMBER || 'NOT_SET',
        // Don't expose actual values, just verify they exist
        sidPrefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 4) || '',
        allConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
    };

    return json({
        configured: config.allConfigured,
        details: config
    });
}
