import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { json } from '@sveltejs/kit';
import { streamText, type LanguageModelV1, tool } from 'ai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/prisma';
import { auth } from '$lib/auth';

// Types
interface RAGSource {
	title?: string;
	url?: string;
	relevance: number;
}

interface RAGResult {
	hasRelevantData: boolean;
	context: string;
	sources?: RAGSource[];
}

interface QdrantPoint {
	id: string | number;
	score: number;
	payload?: {
		title?: string;
		url?: string;
		content?: string;
		[key: string]: unknown;
	};
}

// Configuration
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_URL || 'http://172.21.96.1:1234';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-nomic-embed-text-v1.5';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'rp_exercises';
const RELEVANCE_THRESHOLD = 0.7; // Only use RAG data if relevance score is above this

// Initialize the chat model
const chatModel: LanguageModelV1 = new OpenAICompatibleChatLanguageModel(
	'qwen/qwen3-4b', // Using a standard instruction-following model instead of reasoning model
	{},
	{
		provider: 'lmstudio.chat',
		url: ({ path }) => {
			const url = new URL(`${LM_STUDIO_BASE_URL}/v1${path}`);
			return url.toString();
		},
		headers: () => ({}),
		defaultObjectGenerationMode: 'json',
		supportsStructuredOutputs: true
	}
);

// Initialize Qdrant client
const qdrantClient = new QdrantClient({ url: QDRANT_URL });

// Embedding helper class
class LMStudioEmbedding {
	private baseUrl: string;
	private model: string;

	constructor(baseUrl = LM_STUDIO_BASE_URL, model = EMBEDDING_MODEL) {
		this.baseUrl = baseUrl;
		this.model = model;
	}

	async encode(text: string): Promise<number[]> {
		const url = `${this.baseUrl}/v1/embeddings`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: this.model,
				input: text,
				encoding_format: 'float'
			})
		});

		if (!response.ok) {
			throw new Error(`Embedding API error: ${response.status}`);
		}

		const data = await response.json();
		return data.data[0].embedding;
	}
}

const embeddingModel = new LMStudioEmbedding();

// RAG retrieval function
async function retrieveRelevantContent(query: string, topK = 3): Promise<RAGResult> {
	try {
		// Generate embedding for the query
		const queryVector = await embeddingModel.encode(query);

		// Search in Qdrant
		const searchResponse = await qdrantClient.search(COLLECTION_NAME, {
			vector: queryVector,
			limit: topK,
			with_payload: true
		});

		const results = searchResponse as QdrantPoint[];

		// Filter results by relevance threshold
		const relevantResults = results.filter(
			(result: QdrantPoint) => result.score >= RELEVANCE_THRESHOLD
		);

		if (relevantResults.length === 0) {
			return { hasRelevantData: false, context: '' };
		}

		// Format the context
		const context = relevantResults
			.map((result: QdrantPoint, index: number) => {
				const payload = result.payload;
				return `
[Source ${index + 1}] ${payload?.title || 'Unknown Title'}
Relevance: ${(result.score * 100).toFixed(1)}%
Content: ${payload?.content || 'No content available'}
URL: ${payload?.url || 'No URL'}
`.trim();
			})
			.join('\n\n');

		return {
			hasRelevantData: true,
			context,
			sources: relevantResults.map((r: QdrantPoint) => ({
				title: r.payload?.title,
				url: r.payload?.url,
				relevance: r.score
			}))
		};
	} catch (error) {
		console.error('RAG retrieval error:', error);
		return { hasRelevantData: false, context: '' };
	}
}

// Check if query is fitness/hypertrophy related
function isFitnessRelated(message: string): boolean {
	const fitnessKeywords = [
		'muscle',
		'hypertrophy',
		'training',
		'workout',
		'exercise',
		'sets',
		'reps',
		'volume',
		'frequency',
		'progressive overload',
		'recovery',
		'strength',
		'bicep',
		'tricep',
		'chest',
		'back',
		'legs',
		'shoulders',
		'abs',
		'glutes',
		'cardio',
		'weight',
		'gym',
		'fitness'
	];

	const lowerMessage = message.toLowerCase();
	return fitnessKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Define the workout creation tool
const createWorkoutTool = tool({
	description: 'Create a personalized workout routine based on user goals and available equipment',
	parameters: z.object({
		goals: z.string().describe("The user's fitness goals"),
		equipment: z.array(z.string()).describe('Available equipment'),
		duration: z.number().optional().describe('Workout duration in minutes'),
		experience: z
			.enum(['beginner', 'intermediate', 'advanced'])
			.optional()
			.describe('User experience level'),
		workoutPlan: z.object({
			name: z.string().describe('Name of the workout routine'),
			description: z.string().describe('Brief description of the workout'),
			exercises: z.array(
				z.object({
					name: z.string().describe('Exercise name'),
					sets: z.number().describe('Number of sets'),
					reps: z.string().describe('Number of reps (can be a range like "8-12")'),
					rest: z.string().describe('Rest time between sets'),
					equipment: z.string().optional().describe('Required equipment'),
					notes: z.string().optional().describe('Form tips or modifications')
				})
			),
			totalDuration: z.number().describe('Estimated total workout duration in minutes'),
			frequency: z.string().describe('Recommended frequency per week')
		})
	}),
	execute: async ({ goals, equipment, duration, experience, workoutPlan }) => {
		// This is where you could save to database or perform other actions
		console.log('Creating workout with:', { goals, equipment, duration, experience });

		return {
			success: true,
			message: 'Workout routine created successfully! Would you like me to save this workout to your profile so you can access it later?',
			workout: workoutPlan,
			shouldAskToSave: true
		};
	}
});

// Define the save workout tool factory
const createSaveWorkoutTool = (userId: string | undefined) => tool({
	description: 'Save a workout routine to the user\'s profile',
	parameters: z.object({
		workoutPlan: z.object({
			name: z.string().describe('Name of the workout routine'),
			description: z.string().describe('Brief description of the workout'),
			exercises: z.array(
				z.object({
					name: z.string().describe('Exercise name'),
					sets: z.number().describe('Number of sets'),
					reps: z.string().describe('Number of reps (can be a range like "8-12")'),
					rest: z.string().describe('Rest time between sets'),
					equipment: z.string().optional().describe('Required equipment'),
					notes: z.string().optional().describe('Form tips or modifications')
				})
			),
			totalDuration: z.number().describe('Estimated total workout duration in minutes'),
			frequency: z.string().describe('Recommended frequency per week')
		}),
		goals: z.string().describe("The user's fitness goals"),
		equipment: z.array(z.string()).describe('Available equipment'),
		fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('User fitness level')
	}),
	execute: async ({ workoutPlan, goals, equipment, fitnessLevel }) => {
		try {
			if (!userId) {
				return {
					success: false,
					message: 'You need to be logged in to save workouts. Please sign in to save this workout to your profile.'
				};
			}
			
			// Map fitness level to enum
			const fitnessLevelEnum = fitnessLevel.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
			
			// Create workout in database
			const savedWorkout = await prisma.workout.create({
				data: {
					name: workoutPlan.name,
					description: workoutPlan.description,
					totalDuration: workoutPlan.totalDuration,
					frequency: workoutPlan.frequency,
					fitnessLevel: fitnessLevelEnum,
					goals,
					equipment,
					userId,
					exercises: {
						create: workoutPlan.exercises.map(exercise => ({
							name: exercise.name,
							sets: exercise.sets,
							reps: exercise.reps,
							rest: exercise.rest,
							equipment: exercise.equipment,
							notes: exercise.notes
						}))
					}
				},
				include: {
					exercises: true
				}
			});

			return {
				success: true,
				message: `Perfect! Your workout "${workoutPlan.name}" has been saved to your profile. You can access it anytime from your workout library.`,
				workoutId: savedWorkout.id
			};
		} catch (error) {
			console.error('Error saving workout:', error);
			return {
				success: false,
				message: 'Sorry, there was an error saving your workout. Please try again.'
			};
		}
	}
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'Invalid messages format' }, { status: 400 });
		}

		// Get user session
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user?.id;

		// Get the latest user message
		const lastMessage = messages[messages.length - 1];
		const userQuery = lastMessage?.content || '';

		let systemPrompt = `You are FitWise AI, a knowledgeable fitness and hypertrophy training assistant. 
You provide evidence-based advice on muscle building, training techniques, and exercise science.

When users ask for workout routines or express fitness goals, you can create personalized workout plans using the createWorkout tool. 
Always consider their fitness level (beginner, intermediate, or advanced) and available equipment when creating workouts.

For beginners: Focus on basic movements, proper form, and gradual progression.
For intermediate: Include compound movements with moderate intensity and volume.
For advanced: Incorporate complex movements, higher intensity, and advanced techniques.

After creating a workout routine, ALWAYS ask the user if they would like to save it to their profile for future reference. If they say yes, use the saveWorkout tool to save it to their account.

Important: Respond directly and clearly without showing any internal thinking process. Do not use <think> tags or expose reasoning steps.`;

		let ragContext = '';
		let sources: RAGSource[] = [];

		// Only attempt RAG if the query is fitness-related
		if (isFitnessRelated(userQuery)) {
			console.log('Fitness-related query detected, attempting RAG retrieval...');

			const ragResult = await retrieveRelevantContent(userQuery);

			if (ragResult.hasRelevantData) {
				console.log('High-relevance content found, using RAG data');
				ragContext = ragResult.context;
				sources = ragResult.sources || [];

				systemPrompt += `\n\nRELEVANT TRAINING INFORMATION:
${ragContext}

When answering, prioritize the information from these high-relevance sources. 
Cite specific sources when referencing their content.
If the user's question relates to the provided sources, use that information as your primary reference.`;
			} else {
				console.log('No high-relevance content found, proceeding without RAG');
			}
		} else {
			console.log('Non-fitness query, skipping RAG retrieval');
		}

		// Generate response using the AI SDK with streaming
		const result = await streamText({
			model: chatModel,
			messages: [
				{
					role: 'system',
					content: systemPrompt
				},
				...messages
			],
			tools: {
				createWorkout: createWorkoutTool,
				saveWorkout: createSaveWorkoutTool(userId)
			},
			temperature: 0.7,
			maxTokens: 1000,
			maxSteps: 5,
			toolCallStreaming: true
		});

		// Convert the stream to a Response object
		return new Response(result.toDataStream(), {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-RAG-Sources': JSON.stringify(sources),
				'X-RAG-Used': ragContext ? 'true' : 'false'
			}
		});
	} catch (error) {
		console.error('Chat API error:', error);

		return json(
			{
				error: 'Failed to process chat request',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
