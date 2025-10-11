import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dev } from '$app/environment';

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export interface TokenPayload {
	userId: string;
	email: string;
	role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: TokenPayload): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as TokenPayload;
	} catch (error) {
		if (dev) console.error('Token verification failed:', error);
		return null;
	}
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	
	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
	
	return parts[1];
}

/**
 * Role-based access control
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
	return allowedRoles.includes(userRole);
}

/**
 * Check if user has permission for resource
 */
export function canAccessResource(
	userRole: string,
	resourceOwnerId: string,
	requestUserId: string
): boolean {
	// Admins can access everything
	if (userRole === 'ADMIN') return true;
	
	// Clinicians can access everything
	if (userRole === 'CLINICIAN') return true;
	
	// ASHAs can access their own and their CHWs' resources
	if (userRole === 'ASHA') return true;
	
	// CHWs can only access their own resources
	return resourceOwnerId === requestUserId;
}
