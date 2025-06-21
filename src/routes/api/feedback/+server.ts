import { SARVAM_API_KEY } from '$env/static/private';
import { WorkoutFeedbackInputSchema, WorkoutFeedbackOutputSchema } from '$lib/types/feedback';
import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { QdrantClient } from '@qdrant/js-client-rest';
import { generateObject, type LanguageModelV1 } from 'ai';
import { SarvamAIClient } from 'sarvamai';
import type { RequestHandler } from './$types';

const client = new SarvamAIClient({ apiSubscriptionKey: SARVAM_API_KEY });

// Types
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
const RELEVANCE_THRESHOLD = 0.6; // Lower threshold for exercise feedback

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

// Simple RAG retrieval function
async function getExerciseReference(exerciseName: string, enableRAG: boolean): Promise<string> {
	if (!enableRAG) {
		return ''; // Skip RAG if disabled
	}
	
	try {
		// Create a search query focused on exercise technique and range of motion
		const searchQuery = `${exerciseName} exercise technique form range of motion proper execution`;

		// Generate embedding for the query
		const queryVector = await embeddingModel.encode(searchQuery);

		// Search in Qdrant
		const searchResponse = await qdrantClient.search(COLLECTION_NAME, {
			vector: queryVector,
			limit: 2,
			with_payload: true
		});

		const results = searchResponse as QdrantPoint[];

		// Filter results by relevance threshold
		const relevantResults = results.filter(
			(result: QdrantPoint) => result.score >= RELEVANCE_THRESHOLD
		);

		if (relevantResults.length === 0) {
			return '';
		}

		// Format the context for exercise feedback
		const context = relevantResults
			.map((result: QdrantPoint, index: number) => {
				const payload = result.payload;
				console.log(`Exercise reference result ${index + 1}:`, payload);
				return `Reference ${index + 1} (${(result.score * 100).toFixed(1)}% relevance):
${payload?.content || 'No content available'}`;
			})
			.join('\n\n');

		return context;
	} catch (error) {
		console.error('Exercise reference retrieval error:', error);
		return '';
	}
}

// Initialize the model
const model: LanguageModelV1 = new OpenAICompatibleChatLanguageModel(
	'deepseek/deepseek-r1-0528-qwen3-8b',
	{},
	{
		provider: `lmstudio.chat`,
		url: ({ path }) => {
			const url = new URL(`http://172.21.96.1:1234/v1${path}`);
			return url.toString();
		},
		headers: () => ({}),
		defaultObjectGenerationMode: 'json',
		supportsStructuredOutputs: true
	}
);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate input data
		const input = WorkoutFeedbackInputSchema.parse(body);

		// Get exercise reference information from RAG
		const exerciseReference = await getExerciseReference(input.exerciseName, input.enableRAG || false);

		// Create the prompt for feedback generation
		let prompt = `You are a professional fitness coach AI. Analyze this workout repetition data and provide structured feedback.

Exercise Data:
- Exercise: ${input.exerciseName}
- Rep Number: ${input.repNumber}
- Duration: ${input.duration}ms
- Angle Range: ${input.angleRange.min}° to ${input.angleRange.max}°
- Average Angle: ${input.averageAngle}°
- Range of Motion: ${input.rangeOfMotion}°`;

		// Add target angle information if available
		if (input.targetAngles) {
			prompt += `
- Target Angle Range: ${input.targetAngles.min}° to ${input.targetAngles.max}° (optimal)
- ROM Target Achievement: ${(input.rangeOfMotion / (input.targetAngles.max - input.targetAngles.min) * 100).toFixed(1)}%`;
		}

		// Add exercise reference if available
		if (exerciseReference) {
			prompt += `\n\nEXERCISE REFERENCE INFORMATION:
${exerciseReference}

Use this reference information to provide more accurate feedback about proper form and technique.`;
		}

		prompt += `\n\nProvide feedback based on these criteria:
1. Range of Motion: ${input.targetAngles ? 'Compare to target range and assess if user achieved optimal ROM' : 'Compare to proper standards for this exercise, and prefer higher ranges in general'}
2. Duration: Controlled movement timing is important
3. Angle Range: Should be appropriate for the exercise type${input.targetAngles ? ' and within target ranges' : ''}
4. Overall form quality assessment

${input.targetAngles ? `Focus on whether the user achieved the target range (${input.targetAngles.min}°-${input.targetAngles.max}°). If they fell short, encourage them to go deeper/higher. If they exceeded safely, praise their mobility.` : ''}

Return:
- feedback: Max 100 chars, specific, concise, and actionable
- score: 0-100 based on form quality${input.targetAngles ? ' (bonus points for achieving target ROM)' : ''}
- classification: "good" (80-100), "okay" (60-79), "bad" (0-59)`;

		// Generate the feedback object first
		const result = await generateObject({
			model,
			schema: WorkoutFeedbackOutputSchema,
			prompt
		});

		const feedback = result.object;

		// Create a readable stream to send data
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// First, send the feedback data as JSON
					const feedbackData = JSON.stringify({
						type: 'feedback',
						data: feedback
					}) + '\n';
					controller.enqueue(new TextEncoder().encode(feedbackData));

					// Generate and send audio only if voice is enabled
					if (input.enableVoice) {
						try {
							const ttsResponse = await client.textToSpeech.convert({
								text: feedback.feedback,
								target_language_code: "bn-IN" // Using Bengali as per the user request
							});

							// Send the complete audio data
							const audioChunk = JSON.stringify({
								type: 'audio',
								data: ttsResponse.audios[0] // This should be the base64 audio data
							}) + '\n';
							controller.enqueue(new TextEncoder().encode(audioChunk));
						} catch (audioError) {
							console.error('Error generating audio:', audioError);
							// Continue without audio if TTS fails
						}
					}
					
					controller.close();
				} catch (error) {
					console.error('Error in stream:', error);
					controller.error(error);
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'application/x-ndjson',
				'X-RAG-Used': input.enableRAG ? 'true' : 'false',
				'X-Voice-Used': input.enableVoice ? 'true' : 'false'
			}
		});
	} catch (error) {
		console.error('Feedback generation error:', error);

		// Return error response
		return new Response(
			JSON.stringify({
				error: 'Failed to generate feedback',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
};
