import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { emitSOSAlertPusher } from '$lib/server/pusher';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { senderName, senderRole, location, phone, message } = body;

        if (!senderName || !location) {
            return json({ error: 'Name and location are required' }, { status: 400 });
        }

        // Generate unique SOS ID
        const sosId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Emit SOS alert to all connected clients via Pusher
        await emitSOSAlertPusher({
            id: sosId,
            senderName,
            senderRole: senderRole || 'Unknown',
            location,
            phone: phone || 'Not provided',
            message: message || 'Emergency! Need immediate assistance.'
        });

        console.log(`SOS Alert triggered by ${senderName} from ${location}`);

        return json({
            success: true,
            message: 'SOS alert sent to all nearby health workers',
            sosId
        });
    } catch (error) {
        console.error('SOS API error:', error);
        return json({ error: 'Failed to send SOS alert' }, { status: 500 });
    }
};
