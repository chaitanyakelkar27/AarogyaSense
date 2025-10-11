import { json, type RequestEvent } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { hashPassword, generateToken } from '$lib/server/auth';

export const POST = async ({ request }: RequestEvent) => {
	try {
		const { email, password, name, role, phone, language } = await request.json();

		// Validate required fields
		if (!email || !password || !name || !role) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Validate role
		const validRoles = ['CHW', 'ASHA', 'CLINICIAN', 'ADMIN'];
		if (!validRoles.includes(role)) {
			return json({ error: 'Invalid role' }, { status: 400 });
		}

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email }
		});

		if (existingUser) {
			return json({ error: 'User already exists' }, { status: 409 });
		}

		// Hash password
		const hashedPassword = await hashPassword(password);

		// Create user
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role,
				phone,
				language: language || 'en'
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				language: true,
				createdAt: true
			}
		});

		// Generate token
		const token = generateToken({
			userId: user.id,
			email: user.email,
			role: user.role
		});

		return json({
			user,
			token
		}, { status: 201 });

	} catch (error) {
		console.error('Registration error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
