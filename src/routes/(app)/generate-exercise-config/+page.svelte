<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2, Dumbbell, Settings, CheckCircle, XCircle } from 'lucide-svelte';

	let exerciseName = '';
	let exerciseDescription = '';
	let loading = false;
	interface ExerciseConfigResult {
		success: boolean;
		exerciseName: string;
		analysis: {
			exerciseType: string;
			primaryMuscles: string[];
			movementPattern: string;
			keyJoints: string[];
			movementDirection: string;
		};
		config: {
			name: string;
			initialDirection: 'up' | 'down';
			minPeakDistance: number;
			inverted?: boolean;
			anglePoints: Array<{
				name: string;
				points: [number, number, number];
				weight?: number;
			}>;
		};
	}

	let result: ExerciseConfigResult | null = null;
	let error: string | null = null;
	let saving = false;
	let saveSuccess = false;
	let saveError: string | null = null;

	const predefinedExercises = [
		{
			name: 'shoulder press',
			description: 'Standing with weights overhead, press the weights up from shoulder level to full extension above the head'
		},
		{
			name: 'lateral raise',
			description: 'Standing with weights at sides, raise arms out to the sides until parallel with the ground'
		},
		{
			name: 'deadlift',
			description: 'Lifting a barbell from the ground to hip level by bending at the hips and knees'
		},
		{
			name: 'jumping jacks',
			description: 'Full body cardio exercise jumping feet apart while raising arms overhead'
		},
		{
			name: 'tricep dips',
			description: 'Lowering and raising the body using arm strength while gripping a bench or chair'
		}
	];

	async function generateConfig() {
		if (!exerciseName.trim()) {
			error = 'Please enter an exercise name';
			return;
		}

		loading = true;
		error = null;
		result = null;

		try {
			const response = await fetch('/api/exercise-config', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					exerciseName: exerciseName.trim(),
					exerciseDescription: exerciseDescription.trim() || undefined
				})
			});

			const data = await response.json();

			if (data.success) {
				result = data;
			} else {
				error = data.error || 'Failed to generate exercise configuration';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}

	function loadPredefinedExercise(exercise: { name: string; description: string }) {
		exerciseName = exercise.name;
		exerciseDescription = exercise.description;
	}

	function clearForm() {
		exerciseName = '';
		exerciseDescription = '';
		result = null;
		error = null;
		saveSuccess = false;
		saveError = null;
	}

	async function saveConfig() {
		if (!result) return;

		saving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const response = await fetch('/api/exercise-configs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: result.config.name,
					displayName: result.exerciseName,
					description: exerciseDescription.trim() || undefined,
					exerciseType: result.analysis.exerciseType,
					primaryMuscles: result.analysis.primaryMuscles,
					movementPattern: result.analysis.movementPattern,
					keyJoints: result.analysis.keyJoints,
					movementDirection: result.analysis.movementDirection,
					config: result.config,
					generatedBy: 'AI'
				})
			});

			const data = await response.json();

			if (data.success) {
				saveSuccess = true;
			} else {
				saveError = data.error || 'Failed to save exercise configuration';
			}
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			saving = false;
		}
	}

	// MediaPipe landmark names for reference
	const landmarkNames: Record<number, string> = {
		0: 'NOSE',
		11: 'LEFT_SHOULDER',
		12: 'RIGHT_SHOULDER',
		13: 'LEFT_ELBOW',
		14: 'RIGHT_ELBOW',
		15: 'LEFT_WRIST',
		16: 'RIGHT_WRIST',
		23: 'LEFT_HIP',
		24: 'RIGHT_HIP',
		25: 'LEFT_KNEE',
		26: 'RIGHT_KNEE',
		27: 'LEFT_ANKLE',
		28: 'RIGHT_ANKLE'
	};

	function getLandmarkName(index: number): string {
		return landmarkNames[index] || `LANDMARK_${index}`;
	}
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<div class="text-center mb-8">
		<h1 class="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
			<Settings class="h-8 w-8" />
			Exercise Config Generator
		</h1>
		<p class="text-muted-foreground">
			Generate MediaPipe pose tracking configurations for any exercise using AI
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Input Form -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Dumbbell class="h-5 w-5" />
					Exercise Details
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div>
					<label for="exercise-name" class="block text-sm font-medium mb-2">
						Exercise Name *
					</label>
					<Input
						id="exercise-name"
						bind:value={exerciseName}
						placeholder="e.g., shoulder press, burpees, lunges"
						class="w-full"
					/>
				</div>

				<div>
					<label for="exercise-description" class="block text-sm font-medium mb-2">
						Exercise Description (Optional)
					</label>
					<Textarea
						id="exercise-description"
						bind:value={exerciseDescription}
						placeholder="Describe how the exercise is performed for better accuracy..."
						rows={3}
						class="w-full"
					/>
				</div>

				<div class="flex gap-2">
					<Button onclick={generateConfig} disabled={loading} class="flex-1">
						{#if loading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Generating...
						{:else}
							Generate Config
						{/if}
					</Button>
					<Button variant="outline" onclick={clearForm}>
						Clear
					</Button>
				</div>

				<!-- Quick Examples -->
				<div class="pt-4 border-t">
					<p class="text-sm font-medium mb-2">Quick Examples:</p>
					<div class="flex flex-wrap gap-2">
						{#each predefinedExercises as exercise (exercise.name)}
							<Button
								variant="outline"
								size="sm"
								onclick={() => loadPredefinedExercise(exercise)}
								class="text-xs"
							>
								{exercise.name}
							</Button>
						{/each}
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Results -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					{#if result}
						<CheckCircle class="h-5 w-5 text-green-500" />
						Generated Configuration
					{:else if error}
						<XCircle class="h-5 w-5 text-red-500" />
						Error
					{:else}
						<Settings class="h-5 w-5" />
						Results
					{/if}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loading}
					<div class="flex items-center justify-center p-8">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if error}
					<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
						{error}
					</div>
				{:else if result}
					<div class="space-y-4">
						<!-- Exercise Analysis -->
						<div>
							<h4 class="font-semibold mb-2">Exercise Analysis</h4>
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{result.analysis.exerciseType}</Badge>
									<Badge variant="outline">{result.analysis.movementPattern}</Badge>
								</div>
								<p class="text-sm">
									<strong>Primary Muscles:</strong> {result.analysis.primaryMuscles.join(', ')}
								</p>
								<p class="text-sm">
									<strong>Movement Direction:</strong> {result.analysis.movementDirection}
								</p>
							</div>
						</div>

						<!-- Tracking Configuration -->
						<div>
							<h4 class="font-semibold mb-2">Tracking Configuration</h4>
							<div class="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
								<div><strong>Exercise Name:</strong> {result.config.name}</div>
								<div><strong>Initial Direction:</strong> {result.config.initialDirection}</div>
								<div><strong>Min Peak Distance:</strong> {result.config.minPeakDistance} frames</div>
								{#if result.config.inverted !== undefined}
									<div><strong>Signal Inverted:</strong> {result.config.inverted ? 'Yes' : 'No'}</div>
								{/if}
								
								{#each result.config.anglePoints as angleConfig, i (i)}
									<div class="border-t pt-2 mt-2">
										<div><strong>Angle {i + 1}: {angleConfig.name}</strong></div>
										<div class="ml-4 space-y-1">
											<div>Points: [{angleConfig.points.map(p => `${getLandmarkName(p)} (${p})`).join(' → ')}]</div>
											{#if angleConfig.weight !== undefined}
												<div>Weight: {angleConfig.weight}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- JSON Output -->
						<details class="border rounded-lg">
							<summary class="p-3 cursor-pointer font-medium">View Raw JSON Config</summary>
							<pre class="p-3 bg-gray-50 text-xs overflow-x-auto">{JSON.stringify(result.config, null, 2)}</pre>
						</details>

						<!-- Save Section -->
						<div class="border-t pt-4">
							{#if saveSuccess}
								<div class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
									<div class="flex items-center gap-2">
										<CheckCircle class="h-4 w-4" />
										Configuration saved successfully! You can now use it in your workouts.
									</div>
								</div>
							{/if}
							
							{#if saveError}
								<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
									<div class="flex items-center gap-2">
										<XCircle class="h-4 w-4" />
										{saveError}
									</div>
								</div>
							{/if}

							<div class="flex gap-2">
								<Button onclick={saveConfig} disabled={saving || saveSuccess} class="flex-1">
									{#if saving}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
										Saving...
									{:else if saveSuccess}
										<CheckCircle class="mr-2 h-4 w-4" />
										Saved
									{:else}
										Save Configuration
									{/if}
								</Button>
								<Button variant="outline" onclick={() => window.location.href = '/exercise-configs'}>
									View All Configs
								</Button>
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center text-muted-foreground p-8">
						Enter an exercise name and click "Generate Config" to see the AI-generated pose tracking configuration.
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Info Section -->
	<Card class="mt-6">
		<CardContent class="pt-6">
			<h3 class="font-semibold mb-2">How it works</h3>
			<p class="text-sm text-muted-foreground mb-4">
				This tool uses an AI model to analyze exercise descriptions and generate MediaPipe pose tracking configurations. 
				The AI considers biomechanics, movement patterns, and joint involvement to determine the best tracking setup.
			</p>
			<div class="grid md:grid-cols-3 gap-4 text-sm">
				<div>
					<strong>Joint Selection:</strong> AI picks the most representative joints for tracking the exercise movement.
				</div>
				<div>
					<strong>Movement Analysis:</strong> Determines tracking axes (X/Y), direction, and signal inversion needs.
				</div>
				<div>
					<strong>Angle Calculation:</strong> Configures 3-point angle measurements for biomechanical analysis.
				</div>
			</div>
		</CardContent>
	</Card>
</div>
