import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { json } from '@sveltejs/kit';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/prisma';

// Configuration
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_URL || 'http://172.21.96.1:1234';

// Initialize the chat model
const chatModel = new OpenAICompatibleChatLanguageModel(
	'qwen/qwen3-4b',
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

// MediaPipe pose landmark indices for reference
const LANDMARK_INDICES = {
	NOSE: 0,
	LEFT_EYE_INNER: 1,
	LEFT_EYE: 2,
	LEFT_EYE_OUTER: 3,
	RIGHT_EYE_INNER: 4,
	RIGHT_EYE: 5,
	RIGHT_EYE_OUTER: 6,
	LEFT_EAR: 7,
	RIGHT_EAR: 8,
	MOUTH_LEFT: 9,
	MOUTH_RIGHT: 10,
	LEFT_SHOULDER: 11,
	RIGHT_SHOULDER: 12,
	LEFT_ELBOW: 13,
	RIGHT_ELBOW: 14,
	LEFT_WRIST: 15,
	RIGHT_WRIST: 16,
	LEFT_PINKY: 17,
	RIGHT_PINKY: 18,
	LEFT_INDEX: 19,
	RIGHT_INDEX: 20,
	LEFT_THUMB: 21,
	RIGHT_THUMB: 22,
	LEFT_HIP: 23,
	RIGHT_HIP: 24,
	LEFT_KNEE: 25,
	RIGHT_KNEE: 26,
	LEFT_ANKLE: 27,
	RIGHT_ANKLE: 28,
	LEFT_HEEL: 29,
	RIGHT_HEEL: 30,
	LEFT_FOOT_INDEX: 31,
	RIGHT_FOOT_INDEX: 32
};

// Schema for exercise configuration generation
const ExerciseConfigSchema = z.object({
	name: z.string().describe('Exercise name in snake_case format (e.g., bicep_curl, shoulder_press)'),
	initialDirection: z.enum(['up', 'down']).describe('The starting direction of the exercise movement'),
	minPeakDistance: z.number().min(5).max(20).describe('Minimum distance between peaks to count as a rep (5-20 frames)'),
	joints: z.array(z.object({
		joint: z.number().describe('MediaPipe landmark index for the joint to track'),
		trackY: z.boolean().describe('Whether to track Y position (up/down movement)'),
		trackX: z.boolean().optional().describe('Whether to track X position (left/right movement)'),
		inverted: z.boolean().optional().describe('Whether to invert the signal (for exercises where down is actually up in screen coords)'),
		anglePoints: z.array(z.number()).length(3).optional().describe('Three joint indices for angle calculation [point1, vertex, point3]')
	})).min(1).describe('Array of joint configurations for tracking movement')
});

const ExerciseAnalysisSchema = z.object({
	exerciseType: z.enum(['upper_body', 'lower_body', 'full_body', 'core']).describe('The type of exercise'),
	primaryMuscles: z.array(z.string()).describe('Primary muscles worked by the exercise'),
	movementPattern: z.enum(['push', 'pull', 'squat', 'hinge', 'lunge', 'rotation', 'isometric']).describe('Primary movement pattern'),
	keyJoints: z.array(z.string()).describe('Key joints involved in the movement'),
	movementDirection: z.enum(['vertical', 'horizontal', 'diagonal', 'rotational']).describe('Primary direction of movement'),
	config: ExerciseConfigSchema
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('Exercise Config API: Starting request processing...');
		const { exerciseName, exerciseDescription, autoSave = false } = await request.json();

		if (!exerciseName) {
			console.error('Exercise Config API: Exercise name is required');
			return json({ error: 'Exercise name is required' }, { status: 400 });
		}

		console.log(`Exercise Config API: Generating config for "${exerciseName}"`);

		const systemPrompt = `You are an expert in biomechanics and exercise analysis. Your task is to generate MediaPipe pose tracking configurations for exercises.

AVAILABLE LANDMARK INDICES:
${Object.entries(LANDMARK_INDICES).map(([name, index]) => `${name}: ${index}`).join('\n')}

EXERCISE ANALYSIS GUIDELINES:

1. **Joint Selection**: Choose the most representative joint for tracking the exercise movement
   - For arm exercises: typically wrist or elbow
   - For leg exercises: typically hip, knee, or ankle
   - For full body: choose the joint with the most distinct movement pattern

2. **Movement Direction**:
   - trackY: true for vertical movements (up/down)
   - trackX: true for horizontal movements (left/right)
   - Most exercises primarily use trackY

3. **Inverted Signal**:
   - Set to true when screen coordinates are opposite to exercise movement
   - Example: bicep curl (screen down = exercise up) should be inverted
   - Example: squat (screen down = exercise down) should NOT be inverted

4. **Initial Direction**:
   - 'up': Exercise starts in the extended/top position
   - 'down': Exercise starts in the contracted/bottom position

5. **Angle Points**:
   - Always provide 3 points: [point1, vertex, point3]
   - Vertex is the joint where the angle is measured
   - Common patterns:
     - Elbow angle: [shoulder, elbow, wrist]
     - Knee angle: [hip, knee, ankle]
     - Shoulder angle: [torso_point, shoulder, elbow]

6. **Min Peak Distance**:
   - Faster exercises: 5-8 frames
   - Moderate exercises: 8-12 frames  
   - Slower exercises: 12-20 frames

EXAMPLE EXERCISES:
- Bicep Curl: Track wrist (15), Y-axis, inverted, elbow angle [11,13,15]
- Squat: Track hip (23), Y-axis, not inverted, knee angle [23,25,27]
- Push-up: Track shoulder (11), Y-axis, not inverted, elbow angle [11,13,15]
- Overhead Press: Track wrist (15), Y-axis, inverted, shoulder angle [11,13,15]

Analyze the exercise and generate an appropriate configuration.`;

		const userPrompt = `Exercise: ${exerciseName}
${exerciseDescription ? `Description: ${exerciseDescription}` : ''}

Analyze this exercise and generate a MediaPipe pose tracking configuration. Consider the biomechanics, primary movement patterns, and which joints would provide the most reliable tracking data.`;

		console.log('Exercise Config API: Calling AI model...');
		
		// Add timeout to the AI model call
		const TIMEOUT_MS = 30000; // 30 seconds
		
		const modelPromise = generateObject({
			model: chatModel,
			schema: ExerciseAnalysisSchema,
			prompt: userPrompt,
			system: systemPrompt,
			temperature: 0.3, // Lower temperature for more consistent configs
		});

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error('AI model generation timeout')), TIMEOUT_MS)
		);

		const result = await Promise.race([modelPromise, timeoutPromise]) as Awaited<typeof modelPromise>;

		console.log('Exercise Config API: AI model completed, validating result...');

		if (!result || !result.object) {
			throw new Error('Invalid response from AI model');
		}

		console.log('Exercise Config API: Generated exercise config:', JSON.stringify(result.object, null, 2));

		let savedConfig = null;
		
		// Auto-save if requested
		if (autoSave) {
			try {
				// Check if a config with this name already exists
				const existingConfig = await prisma.exerciseConfig.findUnique({
					where: { name: result.object.config.name }
				});

				if (!existingConfig) {
					savedConfig = await prisma.exerciseConfig.create({
						data: {
							name: result.object.config.name,
							displayName: exerciseName,
							description: exerciseDescription || undefined,
							exerciseType: result.object.exerciseType,
							primaryMuscles: result.object.primaryMuscles,
							movementPattern: result.object.movementPattern,
							keyJoints: result.object.keyJoints,
							movementDirection: result.object.movementDirection,
							config: result.object.config,
							generatedBy: 'AI'
						}
					});
					console.log('Exercise Config API: Auto-saved config to database');
				} else {
					console.log('Exercise Config API: Config already exists, skipping auto-save');
				}
			} catch (saveError) {
				console.error('Exercise Config API: Error auto-saving config:', saveError);
				// Don't fail the request if saving fails
			}
		}

		return json({
			success: true,
			exerciseName,
			analysis: {
				exerciseType: result.object.exerciseType,
				primaryMuscles: result.object.primaryMuscles,
				movementPattern: result.object.movementPattern,
				keyJoints: result.object.keyJoints,
				movementDirection: result.object.movementDirection
			},
			config: result.object.config,
			saved: savedConfig !== null,
			savedConfig
		});

	} catch (error) {
		console.error('Exercise Config API: Error occurred:', error);

		return json(
			{
				error: 'Failed to generate exercise configuration',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
