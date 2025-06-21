import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const diagnostics: {
			timestamp: string;
			environment: Record<string, string>;
			services: Record<string, { status: string; error?: string; statusCode?: number; url?: string }>;
		} = {
			timestamp: new Date().toISOString(),
			environment: {
				NODE_ENV: process.env.NODE_ENV || 'development',
				LM_STUDIO_URL: process.env.LM_STUDIO_URL || 'http://172.21.96.1:1234',
				QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
				DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]'
			},
			services: {}
		};

		// Test LM Studio connection
		try {
			const lmStudioUrl = process.env.LM_STUDIO_URL || 'http://172.21.96.1:1234';
			const response = await fetch(`${lmStudioUrl}/v1/models`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});
			
			diagnostics.services.lmStudio = {
				status: response.ok ? 'CONNECTED' : 'ERROR',
				statusCode: response.status,
				url: lmStudioUrl
			};
		} catch (error) {
			diagnostics.services.lmStudio = {
				status: 'FAILED',
				error: error instanceof Error ? error.message : 'Unknown error',
				url: process.env.LM_STUDIO_URL || 'http://172.21.96.1:1234'
			};
		}

		// Test Qdrant connection
		try {
			const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
			const response = await fetch(`${qdrantUrl}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});
			
			diagnostics.services.qdrant = {
				status: response.ok ? 'CONNECTED' : 'ERROR',
				statusCode: response.status,
				url: qdrantUrl
			};
		} catch (error) {
			diagnostics.services.qdrant = {
				status: 'FAILED',
				error: error instanceof Error ? error.message : 'Unknown error',
				url: process.env.QDRANT_URL || 'http://localhost:6333'
			};
		}

		// Test database connection
		try {
			const { prisma } = await import('$lib/prisma');
			await prisma.$queryRaw`SELECT 1`;
			diagnostics.services.database = {
				status: 'CONNECTED'
			};
		} catch (error) {
			diagnostics.services.database = {
				status: 'FAILED',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}

		return json(diagnostics);
	} catch (error) {
		return json(
			{
				error: 'Diagnostics failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
