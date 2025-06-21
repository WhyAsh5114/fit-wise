import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { json } from '@sveltejs/kit';
import { streamText, type LanguageModelV1 } from 'ai';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { RequestHandler } from './$types';

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
	'deepseek/deepseek-r1-0528-qwen3-8b',
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
		const relevantResults = results.filter((result: QdrantPoint) => result.score >= RELEVANCE_THRESHOLD);

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'Invalid messages format' }, { status: 400 });
		}

		// Get the latest user message
		const lastMessage = messages[messages.length - 1];
		const userQuery = lastMessage?.content || '';

		let systemPrompt = `You are FitWise AI, a knowledgeable fitness and hypertrophy training assistant. 
You provide evidence-based advice on muscle building, training techniques, and exercise science.`;

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
			temperature: 0.7,
			maxTokens: 1000
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
