import Pusher from 'pusher';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';

// Initialize Pusher server instance
let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
    if (!pusherInstance) {
        pusherInstance = new Pusher({
            appId: PUSHER_APP_ID || '',
            key: PUSHER_KEY || '',
            secret: PUSHER_SECRET || '',
            cluster: PUSHER_CLUSTER || 'ap2',
            useTLS: true
        });
    }
    return pusherInstance;
}

/**
 * Emit SOS emergency alert via Pusher
 */
export async function emitSOSAlertPusher(sosData: {
    id: string;
    senderName: string;
    senderRole: string;
    location: string;
    phone: string;
    message: string;
}) {
    const pusher = getPusher();

    try {
        await pusher.trigger('sos-channel', 'sos-alert', {
            ...sosData,
            timestamp: new Date().toISOString()
        });
        console.log(`Pusher: Emitted SOS alert from: ${sosData.senderName}`);
        return true;
    } catch (error) {
        console.error('Pusher emit error:', error);
        return false;
    }
}

/**
 * Emit case status update via Pusher
 */
export async function emitCaseUpdatePusher(caseId: string, status: string, updatedBy: string) {
    const pusher = getPusher();

    try {
        await pusher.trigger('cases-channel', 'case-update', {
            caseId,
            status,
            updatedBy,
            timestamp: new Date().toISOString()
        });
        console.log(`Pusher: Emitted case update: ${caseId} -> ${status}`);
        return true;
    } catch (error) {
        console.error('Pusher emit error:', error);
        return false;
    }
}

/**
 * Emit new case notification via Pusher
 */
export async function emitNewCasePusher(caseData: any) {
    const pusher = getPusher();

    try {
        await pusher.trigger('cases-channel', 'new-case', {
            ...caseData,
            timestamp: new Date().toISOString()
        });
        console.log(`Pusher: Emitted new case: ${caseData.id}`);
        return true;
    } catch (error) {
        console.error('Pusher emit error:', error);
        return false;
    }
}
