import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import Pusher from 'pusher-js';

interface SOSAlertEvent {
    id: string;
    senderName: string;
    senderRole: string;
    location: string;
    phone: string;
    message: string;
    timestamp: string;
}

interface CaseUpdateEvent {
    caseId: string;
    status: string;
    updatedBy: string;
    timestamp: string;
}

// Store for Pusher connection status
export const pusherConnected = writable(false);

// Store for SOS alerts
export const sosAlerts = writable<SOSAlertEvent[]>([]);

// Store for active SOS (currently showing)
export const activeSOSAlert = writable<SOSAlertEvent | null>(null);

// Store for case updates
export const caseUpdates = writable<CaseUpdateEvent[]>([]);

let pusherInstance: Pusher | null = null;

/**
 * Initialize Pusher connection (client-side only)
 */
export function initializePusher(pusherKey: string, cluster: string = 'ap2') {
    if (!browser) return;

    // Don't reinitialize if already connected
    if (pusherInstance) {
        console.log('Pusher already initialized');
        return pusherInstance;
    }

    pusherInstance = new Pusher(pusherKey, {
        cluster: cluster,
        forceTLS: true
    });

    // Connection events
    pusherInstance.connection.bind('connected', () => {
        console.log('Pusher connected');
        pusherConnected.set(true);
    });

    pusherInstance.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        pusherConnected.set(false);
    });

    pusherInstance.connection.bind('error', (error: any) => {
        console.error('Pusher connection error:', error);
        pusherConnected.set(false);
    });

    // Subscribe to SOS channel
    const sosChannel = pusherInstance.subscribe('sos-channel');

    sosChannel.bind('sos-alert', (data: SOSAlertEvent) => {
        console.log('SOS Alert received via Pusher:', data);
        sosAlerts.update((alerts) => [data, ...alerts]);
        activeSOSAlert.set(data);

        // Trigger a custom event for components to handle
        if (browser) {
            window.dispatchEvent(new CustomEvent('sosAlert', { detail: data }));
        }
    });

    // Subscribe to cases channel
    const casesChannel = pusherInstance.subscribe('cases-channel');

    casesChannel.bind('case-update', (data: CaseUpdateEvent) => {
        console.log('Case update received via Pusher:', data);
        caseUpdates.update((updates) => [...updates, data]);
    });

    casesChannel.bind('new-case', (data: any) => {
        console.log('New case notification via Pusher:', data);
        if (browser) {
            window.dispatchEvent(new CustomEvent('newCase', { detail: data }));
        }
    });

    console.log('Pusher initialized and subscribed to channels');
    return pusherInstance;
}

/**
 * Disconnect Pusher
 */
export function disconnectPusher() {
    if (pusherInstance) {
        pusherInstance.disconnect();
        pusherInstance = null;
        pusherConnected.set(false);
    }
}

/**
 * Get the current Pusher instance
 */
export function getPusherClient(): Pusher | null {
    return pusherInstance;
}

/**
 * Dismiss active SOS alert
 */
export function dismissSOSAlert() {
    activeSOSAlert.set(null);
}

/**
 * Clear all SOS alerts
 */
export function clearSOSAlerts() {
    sosAlerts.set([]);
    activeSOSAlert.set(null);
}

/**
 * Clear case updates history
 */
export function clearCaseUpdates() {
    caseUpdates.set([]);
}
