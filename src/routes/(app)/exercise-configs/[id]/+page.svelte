<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ArrowLeftIcon,
		PlayIcon,
		SettingsIcon,
		InfoIcon,
		ActivityIcon,
		TargetIcon,
		BrainIcon,
		CalendarIcon,
		TestTubeIcon,
		CopyIcon
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { ExerciseConfig } from '@prisma/client';

	// Type for the exercise configuration JSON structure
	interface ExerciseConfigData {
		name: string;
		initialDirection: 'up' | 'down';
		minPeakDistance: number;
		joints: Array<{
			joint: number;
			trackY: boolean;
			trackX?: boolean;
			inverted?: boolean;
			anglePoints?: [number, number, number];
		}>;
	}

	let exerciseConfig: ExerciseConfig | null = null;
	let isLoading = true;

	onMount(async () => {
		await loadExerciseConfig();
	});

	async function loadExerciseConfig() {
		try {
			isLoading = true;
			const response = await fetch(`/api/exercise-configs/${$page.params.id}`);
			if (response.ok) {
				const data = await response.json();
				exerciseConfig = data.config;
				if (!exerciseConfig) {
					toast.error('Exercise configuration not found');
				}
			} else {
				toast.error('Failed to load exercise configuration');
			}
		} catch (error) {
			console.error('Error loading exercise config:', error);
			toast.error('Error loading exercise configuration');
		} finally {
			isLoading = false;
		}
	}

	function getExerciseTypeColor(type: string): string {
		switch (type.toLowerCase()) {
			case 'upper_body':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
			case 'lower_body':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
			case 'core':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
			case 'full_body':
				return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
		}
	}

	function getMovementPatternColor(pattern: string): string {
		switch (pattern.toLowerCase()) {
			case 'push':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
			case 'pull':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
			case 'squat':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
			case 'hinge':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
			case 'lunge':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
			case 'rotation':
				return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
			case 'isometric':
				return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
		}
	}

	function getGeneratedByColor(source: string): string {
		if (source === 'AI') {
			return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900 dark:to-pink-900 dark:text-purple-300';
		}
		return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
	}

	async function copyConfigToClipboard() {
		try {
			if (!exerciseConfig) {
				toast.error('No configuration to copy');
				return;
			}
			await navigator.clipboard.writeText(JSON.stringify(exerciseConfig.config, null, 2));
			toast.success('Configuration copied to clipboard');
		} catch {
			toast.error('Failed to copy configuration');
		}
	}

	function formatConfigPreview(exerciseConfig: ExerciseConfig): string {
		if (!exerciseConfig?.config) return 'No configuration data';

		// The config field contains the exercise-specific MediaPipe configuration
		const config = exerciseConfig.config as unknown as ExerciseConfigData;
		
		// Create a formatted preview of the exercise configuration
		const preview = {
			exerciseName: config.name,
			initialDirection: config.initialDirection,
			minPeakDistance: config.minPeakDistance,
			joints: config.joints?.map((joint) => ({
				joint: joint.joint,
				trackY: joint.trackY,
				trackX: joint.trackX || false,
				inverted: joint.inverted || false,
				...(joint.anglePoints && { anglePoints: joint.anglePoints })
			})) || []
		};
		
		return JSON.stringify(preview, null, 2);
	}

	function getJointName(jointIndex: number): string {
		const jointNames: Record<number, string> = {
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
		return jointNames[jointIndex] || `Joint ${jointIndex}`;
	}

	function getConfigDetails(exerciseConfig: ExerciseConfig): ExerciseConfigData | null {
		if (!exerciseConfig?.config) return null;
		
		try {
			const config = exerciseConfig.config as unknown as ExerciseConfigData;
			return {
				name: config.name || '',
				initialDirection: config.initialDirection || 'up',
				minPeakDistance: config.minPeakDistance || 8,
				joints: config.joints || []
			};
		} catch {
			return null;
		}
	}
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="space-y-4 text-center">
				<div
					class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
				></div>
				<p class="text-muted-foreground">Loading exercise configuration...</p>
			</div>
		</div>
	{:else if !exerciseConfig}
		<Card>
			<CardContent class="flex flex-col items-center justify-center space-y-4 py-12">
				<InfoIcon class="text-muted-foreground h-12 w-12" />
				<h3 class="text-lg font-semibold">Configuration not found</h3>
				<p class="text-muted-foreground text-center">
					The exercise configuration you're looking for doesn't exist or has been deleted.
				</p>
				<Button href="/exercise-configs">
					<ArrowLeftIcon class="mr-2 h-4 w-4" />
					Back to Exercise Configs
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<Button variant="ghost" size="sm" href="/exercise-configs">
					<ArrowLeftIcon class="mr-2 h-4 w-4" />
					Back
				</Button>
				<div>
					<h1 class="text-3xl font-bold tracking-tight">{exerciseConfig.displayName}</h1>
					<div class="mt-1 flex items-center gap-2">
						<Badge class={getGeneratedByColor(exerciseConfig.generatedBy)}>
							{exerciseConfig.generatedBy === 'AI' ? '🤖 AI Generated' : '📋 Predefined'}
						</Badge>
						<span class="text-muted-foreground">•</span>
						<span class="text-muted-foreground text-sm">
							Created {new Date(exerciseConfig.createdAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</div>
			<div class="flex gap-2">
				<Button href="/form-analysis?configId={exerciseConfig.id}" class="gap-2">
					<PlayIcon class="h-4 w-4" />
					Test Configuration
				</Button>
				<Button variant="outline" onclick={copyConfigToClipboard} class="gap-2">
					<CopyIcon class="h-4 w-4" />
					Copy Config
				</Button>
			</div>
		</div>

		<!-- Overview -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<InfoIcon class="h-5 w-5" />
					Overview
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if exerciseConfig.description}
					<p class="text-muted-foreground">{exerciseConfig.description}</p>
				{/if}

				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="flex items-center gap-2">
						<ActivityIcon class="text-muted-foreground h-4 w-4" />
						<div>
							<p class="text-muted-foreground text-sm">Exercise Type</p>
							<Badge class={getExerciseTypeColor(exerciseConfig.exerciseType)}>
								{exerciseConfig.exerciseType.replace('_', ' ')}
							</Badge>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<TargetIcon class="text-muted-foreground h-4 w-4" />
						<div>
							<p class="text-muted-foreground text-sm">Movement Pattern</p>
							<Badge class={getMovementPatternColor(exerciseConfig.movementPattern)}>
								{exerciseConfig.movementPattern}
							</Badge>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<BrainIcon class="text-muted-foreground h-4 w-4" />
						<div>
							<p class="text-muted-foreground text-sm">Movement Direction</p>
							<p class="font-medium capitalize">{exerciseConfig.movementDirection}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<CalendarIcon class="text-muted-foreground h-4 w-4" />
						<div>
							<p class="text-muted-foreground text-sm">Last Updated</p>
							<p class="font-medium">{new Date(exerciseConfig.updatedAt).toLocaleDateString()}</p>
						</div>
					</div>
				</div>

				{#if exerciseConfig.primaryMuscles?.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">Primary muscles worked:</p>
						<div class="flex flex-wrap gap-1">
							{#each exerciseConfig.primaryMuscles as muscle (muscle)}
								<Badge variant="secondary">
									{muscle}
								</Badge>
							{/each}
						</div>
					</div>
				{/if}

				{#if exerciseConfig.keyJoints?.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">Key joints involved:</p>
						<div class="flex flex-wrap gap-1">
							{#each exerciseConfig.keyJoints as joint (joint)}
								<Badge variant="outline">
									{joint}
								</Badge>
							{/each}
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Technical Configuration -->
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Configuration Preview -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<SettingsIcon class="h-5 w-5" />
						Configuration Preview
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<!-- Detailed Configuration Display -->
						{#if getConfigDetails(exerciseConfig)}
							{@const details = getConfigDetails(exerciseConfig)}
							{#if details}
								<div class="space-y-4">
									<!-- Basic Settings -->
									<div class="space-y-3">
										<div class="flex items-center justify-between rounded-lg border p-3">
											<div>
												<p class="text-sm font-medium">Exercise Name</p>
												<p class="text-muted-foreground text-xs">Internal identifier</p>
											</div>
											<Badge variant="outline" class="font-mono text-xs">
												{details.name}
											</Badge>
										</div>

										<div class="flex items-center justify-between rounded-lg border p-3">
											<div>
												<p class="text-sm font-medium">Initial Direction</p>
												<p class="text-muted-foreground text-xs">Starting movement direction</p>
											</div>
											<Badge variant={details.initialDirection === 'up' ? 'default' : 'secondary'}>
												{details.initialDirection}
											</Badge>
										</div>

										<div class="flex items-center justify-between rounded-lg border p-3">
											<div>
												<p class="text-sm font-medium">Min Peak Distance</p>
												<p class="text-muted-foreground text-xs">Frames between reps</p>
											</div>
											<span class="font-mono text-sm">
												{details.minPeakDistance} frames
											</span>
										</div>
									</div>

									<!-- Joint Configuration -->
									{#if details.joints.length > 0}
										<Separator />
										<div class="space-y-3">
											<h4 class="text-sm font-medium">Joint Tracking</h4>
											{#each details.joints as joint, i (i)}
												<div class="rounded-lg border p-3 space-y-2">
													<div class="flex items-center justify-between">
														<span class="text-sm font-medium">{getJointName(joint.joint)}</span>
														<Badge variant="outline" class="font-mono text-xs">
															Index {joint.joint}
														</Badge>
													</div>
													<div class="grid grid-cols-2 gap-2 text-xs">
														<div class="flex items-center gap-1">
															<span class="w-2 h-2 rounded-full {joint.trackY ? 'bg-green-500' : 'bg-gray-300'}"></span>
															Track Y: {joint.trackY ? 'Yes' : 'No'}
														</div>
														<div class="flex items-center gap-1">
															<span class="w-2 h-2 rounded-full {joint.trackX ? 'bg-green-500' : 'bg-gray-300'}"></span>
															Track X: {joint.trackX ? 'Yes' : 'No'}
														</div>
														<div class="flex items-center gap-1">
															<span class="w-2 h-2 rounded-full {joint.inverted ? 'bg-yellow-500' : 'bg-gray-300'}"></span>
															Inverted: {joint.inverted ? 'Yes' : 'No'}
														</div>
														{#if joint.anglePoints}
															<div class="flex items-center gap-1">
																<span class="w-2 h-2 rounded-full bg-blue-500"></span>
																Angle: [{joint.anglePoints.join(', ')}]
															</div>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{:else}
							<div class="text-muted-foreground p-4 text-center">
								<p>No configuration details available</p>
							</div>
						{/if}

						<!-- Raw JSON -->
						<Separator />
						<div class="space-y-2">
							<h4 class="text-sm font-medium">Raw Configuration</h4>
							<div class="bg-muted rounded-lg p-4">
								<pre class="overflow-x-auto text-xs"><code
										>{formatConfigPreview(exerciseConfig)}</code
									></pre>
							</div>
						</div>

						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={copyConfigToClipboard} class="gap-2">
								<CopyIcon class="h-4 w-4" />
								Copy Full Config
							</Button>
							<Button href="/form-analysis?configId={exerciseConfig.id}" size="sm" class="gap-2">
								<TestTubeIcon class="h-4 w-4" />
								Test Live
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Technical Specifications -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ActivityIcon class="h-5 w-5" />
						Technical Specifications
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-3">
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Configuration ID</p>
								<p class="text-muted-foreground text-xs">Unique identifier</p>
							</div>
							<Badge variant="outline" class="font-mono text-xs">
								{exerciseConfig.id}
							</Badge>
						</div>

						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Generation Source</p>
								<p class="text-muted-foreground text-xs">How this config was created</p>
							</div>
							<Badge class={getGeneratedByColor(exerciseConfig.generatedBy)}>
								{exerciseConfig.generatedBy === 'AI' ? '🤖 AI Generated' : '📋 Predefined'}
							</Badge>
						</div>

						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Created</p>
								<p class="text-muted-foreground text-xs">Initial creation date</p>
							</div>
							<span class="text-sm">
								{new Date(exerciseConfig.createdAt).toLocaleDateString()}
							</span>
						</div>

						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Last Updated</p>
								<p class="text-muted-foreground text-xs">Most recent modification</p>
							</div>
							<span class="text-sm">
								{new Date(exerciseConfig.updatedAt).toLocaleDateString()}
							</span>
						</div>
					</div>

					<Separator />

					<div class="space-y-2">
						<p class="text-sm font-medium">MediaPipe Settings:</p>
						<div class="text-muted-foreground space-y-1 text-sm bg-muted rounded-lg p-3">
							<div class="font-mono text-xs space-y-1">
								<div>• Model Complexity: <span class="text-foreground">1</span></div>
								<div>• Min Detection Confidence: <span class="text-foreground">0.5</span></div>
								<div>• Min Tracking Confidence: <span class="text-foreground">0.5</span></div>
								<div>• Smooth Landmarks: <span class="text-foreground">true</span></div>
								<div>• Enable Segmentation: <span class="text-foreground">false</span></div>
							</div>
						</div>
					</div>

					<Separator />

					<div class="space-y-2">
						<p class="text-sm font-medium">Integration Notes:</p>
						<ul class="text-muted-foreground space-y-1 text-sm">
							<li>• This configuration works with MediaPipe Pose detection</li>
							<li>• Joint tracking optimized for {exerciseConfig.movementPattern} movements</li>
							<li>• Compatible with real-time form analysis</li>
							<li>• Can be used in workout routines and live training</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Actions -->
		<Card>
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-3">
					<Button href="/form-analysis?configId={exerciseConfig.id}" class="gap-2">
						<PlayIcon class="h-4 w-4" />
						Test in Live Training
					</Button>
					<Button variant="outline" onclick={copyConfigToClipboard} class="gap-2">
						<CopyIcon class="h-4 w-4" />
						Copy Configuration
					</Button>
					<Button href="/exercise-configs" variant="outline" class="gap-2">
						<ArrowLeftIcon class="h-4 w-4" />
						Back to All Configs
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
