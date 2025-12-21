import { json } from '@sveltejs/kit';
import { makeVoiceCall } from '$lib/server/twilio-client';

export async function POST({ request }) {
    try {
        const { phoneNumber } = await request.json();

        if (!phoneNumber) {
            return json({ error: 'Phone number required' }, { status: 400 });
        }

        console.log('[TEST] Testing voice call to:', phoneNumber);

        const result = await makeVoiceCall({
            to: phoneNumber,
            message: 'This is a test call from Aarogya Sense. If you can hear this, Twilio voice calls are working correctly.'
        });

        console.log('[TEST] Call result:', result);

        return json({
            success: result.success,
            result,
            message: result.success ? 'Test call initiated' : 'Test call failed'
        });
    } catch (error) {
        console.error('[TEST] Error:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
