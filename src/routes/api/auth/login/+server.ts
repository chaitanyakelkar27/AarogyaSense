import { json, type RequestEvent } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verifyPassword, generateToken } from '$lib/server/auth';

export const POST = async ({ request }: RequestEvent) => {
	try {
		const { email, password } = await request.json();

		// Validate required fields
		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Find user
		const user = await prisma.user.findUnique({
			where: { email }
		});

		if (!user) {
			console.log(`Login failed: User not found for email ${email}`);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Check if user is active
		if (!user.isActive) {
			console.log(`Login failed: User ${email} is inactive`);
			return json({ error: 'Account is disabled' }, { status: 403 });
		}

		// Verify password
		const isValidPassword = await verifyPassword(password, user.password);
		
		if (!isValidPassword) {
			console.log(`Login failed: Invalid password for user ${email}`);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Generate token
		const token = generateToken({
			userId: user.id,
			email: user.email,
			role: user.role
		});

		// Log successful login
		await prisma.auditLog.create({
			data: {
				userId: user.id,
				action: 'LOGIN',
				resource: 'AUTH',
				outcome: 'SUCCESS'
			}
		});

		return json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				language: user.language
			},
			token
		});

	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
