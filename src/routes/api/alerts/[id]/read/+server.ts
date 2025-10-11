import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;

		// Update alert status to read
		// @ts-ignore - Prisma types not yet regenerated for new enum value
		const alert = await prisma.alert.update({
			where: { id },
			data: {
				status: 'READ',
				readAt: new Date()
			} as any
		});

		return json({ alert });
	} catch (error) {
		console.error('Mark alert as read error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
