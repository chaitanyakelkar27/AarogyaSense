import type { LayoutServerLoad } from './$types';
import { PUSHER_KEY, PUSHER_CLUSTER } from '$env/static/private';

export const load: LayoutServerLoad = async () => {
    return {
        pusherKey: PUSHER_KEY || '',
        pusherCluster: PUSHER_CLUSTER || 'ap2'
    };
};
