import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
	log: dev ? ['query', 'error', 'warn'] : ['error']
});

if (dev) globalForPrisma.prisma = prisma;

export default prisma;
