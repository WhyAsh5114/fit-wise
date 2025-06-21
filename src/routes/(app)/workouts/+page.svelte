<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		VideoIcon,
		CameraIcon,
		PlayIcon,
		Square,
		UploadIcon,
		TargetIcon,
		Dumbbell
	} from 'lucide-svelte';
	import {
		processExerciseReps,
		type Pose as PoseData,
		type ExerciseName,
		type ExerciseConfig
	} from '$lib/workout-utils';
	import { toast } from 'svelte-sonner';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let canvasCtx: CanvasRenderingContext2D;
	let fileInput: HTMLInputElement;

	let isLoading = false;
	let isDetecting = false;
	let selectedSource = 'camera';
	let availableCameras: MediaDeviceInfo[] = [];
	let selectedCameraId = '';
	let currentStream: MediaStream | null = null;
	let statusMessage = '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let pose: any = null;

	// Exercise tracking variables
	let selectedExercise: ExerciseName = 'bicep_curl';
	let poseHistory: PoseData[] = [];
	let currentReps = 0;
	let maxRepsEverSeen = 0; // Track the highest rep count to prevent decreases
	let lastProcessedRepCount = 0; // Track how many reps we've already logged

	// Feature toggle variables
	let enableRAG = false;
	let enableVoice = false;

	// MediaPipe imports will be done dynamically in onMount
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let Pose: any, Camera: any, drawConnectors: any, drawLandmarks: any, POSE_CONNECTIONS: any;

	onMount(async () => {
		// Initialize canvas context
		canvasCtx = canvasElement.getContext('2d')!;

		// Load saved workouts
		await loadSavedWorkouts();

		// Dynamic imports for MediaPipe (client-side only)
		try {
			const [
				{ Pose: PoseClass, POSE_CONNECTIONS: poseConnections },
				{ Camera: CameraClass },
				{ drawConnectors: drawConn, drawLandmarks: drawLand }
			] = await Promise.all([
				import('@mediapipe/pose'),
				import('@mediapipe/camera_utils'),
				import('@mediapipe/drawing_utils')
			]);

			Pose = PoseClass;
			Camera = CameraClass;
			drawConnectors = drawConn;
			drawLandmarks = drawLand;
			POSE_CONNECTIONS = poseConnections;

			// Initialize MediaPipe Pose
			initializePose();
		} catch (error) {
			console.error('Failed to load MediaPipe:', error);
		}

		// Get available cameras
		// Note: Some browsers require user interaction before camera enumeration works properly
		try {
			await getAvailableCameras();
		} catch {
			console.log('Initial camera enumeration failed, will try again when user interacts');
			statusMessage = 'Click "Refresh" to load available cameras';
		}

		// Load saved workouts
		await loadSavedWorkouts();
	});

	async function getAvailableCameras() {
		try {
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
				statusMessage = 'Camera access not available in this browser';
				return;
			}

			statusMessage = 'Requesting camera permission...';

			// First request permission to get device labels
			await navigator.mediaDevices
				.getUserMedia({ video: true })
				.then((stream) => {
					// Stop the stream immediately, we just needed permission
					stream.getTracks().forEach((track) => track.stop());
					statusMessage = 'Permission granted, enumerating cameras...';
				})
				.catch(() => {
					// Permission denied, but we can still enumerate devices without labels
					statusMessage = 'Permission denied, but will try to list cameras...';
				});

			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter((device) => device.kind === 'videoinput');
			console.log('Available cameras:', availableCameras);

			if (availableCameras.length > 0) {
				if (!selectedCameraId) {
					selectedCameraId = availableCameras[0].deviceId;
				}
				statusMessage = `Found ${availableCameras.length} camera(s)`;
				// Clear success message after 3 seconds
				setTimeout(() => {
					statusMessage = '';
				}, 3000);
			} else {
				statusMessage =
					'No cameras found. Make sure camera is connected and permissions are granted.';
			}
		} catch (error) {
			console.error('Error getting cameras:', error);
			statusMessage = `Error accessing cameras: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	function initializePose() {
		if (!Pose) return;

		pose = new Pose({
			locateFile: (file: string) => {
				return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
			}
		});

		pose.setOptions({
			modelComplexity: 1,
			smoothLandmarks: true,
			enableSegmentation: false,
			smoothSegmentation: true,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5
		});

		pose.onResults(onPoseResults);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function onPoseResults(results: any) {
		// Clear canvas
		canvasCtx.save();
		canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

		// Draw the video frame
		canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

		// Draw pose landmarks if detected
		if (results.poseLandmarks) {
			// Add pose to history for rep counting
			poseHistory.push(results.poseLandmarks);
			// Update rep count using dynamic exercise configs
			if (poseHistory.length > 15 && currentExercise?.exerciseConfig) {
				processExerciseReps(poseHistory, currentExercise.name, lastProcessedRepCount, {
					enableRAG,
					enableVoice
				})
					.then((result) => {
						if (result.repCount > maxRepsEverSeen) {
							maxRepsEverSeen = result.repCount;
							currentReps = result.repCount;
							lastProcessedRepCount = result.repCount;
						}
					})
					.catch(console.error);
			}

			// Draw connections
			drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
				color: '#00FF00',
				lineWidth: 4
			});

			// Draw landmarks
			drawLandmarks(canvasCtx, results.poseLandmarks, {
				color: '#FF0000',
				radius: 6
			});
		}

		canvasCtx.restore();
	}

	async function startCamera() {
		if (!selectedCameraId) {
			alert('Please select a camera first');
			return;
		}

		isLoading = true;
		try {
			// Stop any existing stream
			stopDetection();

			// Get user media
			currentStream = await navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: selectedCameraId,
					width: { ideal: 640 },
					height: { ideal: 480 }
				}
			});

			videoElement.srcObject = currentStream;
			await videoElement.play();

			// Set canvas dimensions to match video
			canvasElement.width = videoElement.videoWidth || 640;
			canvasElement.height = videoElement.videoHeight || 480;

			// Start pose detection
			if (pose && Camera) {
				const camera = new Camera(videoElement, {
					onFrame: async () => {
						if (isDetecting) {
							await pose.send({ image: videoElement });
						}
					},
					width: canvasElement.width,
					height: canvasElement.height
				});
				camera.start();
				isDetecting = true;
			}
		} catch (error) {
			console.error('Error starting camera:', error);
			alert('Failed to access camera. Please check permissions.');
		} finally {
			isLoading = false;
		}
	}

	function handleVideoUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;

		// Stop any existing stream
		stopDetection();

		const url = URL.createObjectURL(file);
		videoElement.src = url;
		videoElement.load();

		videoElement.onloadedmetadata = () => {
			// Set canvas dimensions to match video
			canvasElement.width = videoElement.videoWidth;
			canvasElement.height = videoElement.videoHeight;
		};

		videoElement.onplay = () => {
			if (pose) {
				isDetecting = true;
				processVideoFrame();
			}
		};
	}

	function processVideoFrame() {
		if (!isDetecting || videoElement.paused || videoElement.ended) {
			return;
		}

		pose.send({ image: videoElement }).then(() => {
			requestAnimationFrame(processVideoFrame);
		});
	}

	function playVideo() {
		if (videoElement.src && !currentStream) {
			videoElement.play();
		}
	}

	function pauseVideo() {
		if (!currentStream) {
			videoElement.pause();
		}
	}

	function stopDetection() {
		isDetecting = false;

		// Stop camera stream
		if (currentStream) {
			currentStream.getTracks().forEach((track) => track.stop());
			currentStream = null;
		}

		// Clear video source
		if (videoElement.srcObject) {
			videoElement.srcObject = null;
		}
		if (videoElement.src && !videoElement.src.startsWith('blob:')) {
			URL.revokeObjectURL(videoElement.src);
		}
		videoElement.src = '';

		// Clear canvas
		if (canvasCtx) {
			canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
		}
	}

	function resetRepCount() {
		poseHistory = [];
		currentReps = 0;
		maxRepsEverSeen = 0;
		lastProcessedRepCount = 0;
	}

	// Workout management
	interface WorkoutExercise {
		id: string;
		name: string;
		sets: number;
		reps: string;
		rest: string;
		exerciseConfig?: { config: ExerciseConfig };
	}

	interface Workout {
		id: string;
		name: string;
		exercises: WorkoutExercise[];
	}

	let savedWorkouts: Workout[] = [];
	let selectedWorkout: Workout | null = null;
	let currentExercise: WorkoutExercise | null = null;

	// Load saved workouts
	async function loadSavedWorkouts() {
		try {
			const response = await fetch('/api/workouts');
			if (response.ok) {
				const data = await response.json();
				savedWorkouts = data.workouts || [];
			}
		} catch (error) {
			console.error('Error loading workouts:', error);
		}
	}

	function selectWorkout(workout: Workout) {
		selectedWorkout = workout;
		currentExercise = workout.exercises[0] || null;
		resetRepCount();
		toast.success(`Selected: ${workout.name}`);
	}
</script>

<div class="container mx-auto space-y-6 p-6">
	<div class="text-center">
		<h1 class="mb-2 text-3xl font-bold">AI-Powered Workout Analysis</h1>
		<p class="text-muted-foreground">
			Select your camera or upload a video to analyze your workout form with AI pose detection
		</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Controls Panel -->
		<Card class="lg:col-span-1">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CameraIcon class="h-5 w-5" />
					Source Selection
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Workout Selection -->
				<div class="space-y-2">
					<Label for="workout-select">Select Workout</Label>
					{#if savedWorkouts.length > 0}
						<select
							id="workout-select"
							onchange={(e) => {
								const workoutId = e.currentTarget.value;
								const workout = savedWorkouts.find((w) => w.id === workoutId);
								if (workout) selectWorkout(workout);
							}}
							class="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
						>
							<option value="">Choose a workout...</option>
							{#each savedWorkouts as workout (workout.id)}
								<option value={workout.id}>🏋️ {workout.name}</option>
							{/each}
						</select>
					{:else}
						<div class="text-muted-foreground py-4 text-center">
							<Dumbbell class="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p class="text-sm">No saved workouts</p>
						</div>
					{/if}
				</div>

				{#if selectedWorkout && currentExercise}
					<div class="bg-muted rounded-lg p-3">
						<p class="text-sm font-medium">{currentExercise.name}</p>
						<p class="text-muted-foreground text-xs">
							{currentExercise.sets} sets × {currentExercise.reps} reps
						</p>
					</div>
				{/if}

				<!-- Source Type Selection -->
				<div class="space-y-2">
					<Label for="source-select">Input Source</Label>
					<select
						id="source-select"
						bind:value={selectedSource}
						onchange={() => stopDetection()}
						class="border-input bg-background ring-offset-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
					>
						<option value="camera">📹 Camera</option>
						<option value="video">🎥 Video File</option>
					</select>
				</div>

				{#if selectedSource === 'camera'}
					<!-- Camera Selection -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="camera-select">Camera</Label>
							<Button onclick={getAvailableCameras} size="sm" variant="outline" class="h-8 px-2">
								🔄 Refresh
							</Button>
						</div>
						<select
							id="camera-select"
							bind:value={selectedCameraId}
							class="border-input bg-background ring-offset-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2"
						>
							{#if availableCameras.length === 0}
								<option value="">No cameras found - click Refresh</option>
							{:else}
								{#each availableCameras as camera (camera.deviceId)}
									<option value={camera.deviceId}>
										{camera.label || `Camera ${camera.deviceId.slice(0, 8)}...`}
									</option>
								{/each}
							{/if}
						</select>

						{#if statusMessage}
							<p class="text-muted-foreground text-xs">{statusMessage}</p>
						{/if}
					</div>

					<!-- Camera Controls -->
					<div class="space-y-2">
						<Button onclick={startCamera} disabled={isLoading || !selectedCameraId} class="w-full">
							{#if isLoading}
								Loading...
							{:else if isDetecting}
								<Square class="mr-2 h-4 w-4" />
								Stop Camera
							{:else}
								<PlayIcon class="mr-2 h-4 w-4" />
								Start Camera
							{/if}
						</Button>
					</div>
				{:else}
					<!-- Video File Upload -->
					<div class="space-y-2">
						<Label for="video-upload">Upload Video</Label>
						<div class="flex flex-col gap-2">
							<input
								bind:this={fileInput}
								type="file"
								accept="video/*"
								onchange={handleVideoUpload}
								class="file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 border-input bg-background w-full rounded-md border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
							/>
						</div>
					</div>

					<!-- Video Controls -->
					{#if videoElement?.src && !currentStream}
						<div class="flex gap-2">
							<Button onclick={playVideo} size="sm" variant="outline">
								<PlayIcon class="h-4 w-4" />
							</Button>
							<Button onclick={pauseVideo} size="sm" variant="outline">
								<Square class="h-4 w-4" />
							</Button>
						</div>
					{/if}
				{/if}

				{#if isDetecting || currentStream || videoElement?.src}
					<Button onclick={stopDetection} variant="destructive" class="w-full">
						<Square class="mr-2 h-4 w-4" />
						Stop Detection
					</Button>
				{/if}

				<!-- Rep Counter -->
				{#if isDetecting}
					<div class="bg-muted space-y-2 rounded-lg p-4">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold">Rep Counter</h3>
							<Button onclick={resetRepCount} size="sm" variant="outline">Reset</Button>
						</div>
						<div class="text-center">
							<div class="text-primary text-3xl font-bold">{currentReps}</div>
							<div class="text-muted-foreground text-sm">Repetitions</div>
						</div>
					</div>
				{/if}

				<!-- AI Features -->
				<div class="bg-muted space-y-3 rounded-lg p-4">
					<h3 class="text-sm font-semibold">AI Features</h3>

					<div class="space-y-3">
						<!-- RAG Toggle -->
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label for="rag-toggle" class="text-sm font-medium">Enhanced Reference</Label>
								<p class="text-muted-foreground text-xs">
									Uses exercise database for better feedback
								</p>
							</div>
							<Switch id="rag-toggle" bind:checked={enableRAG} />
						</div>

						<!-- Voice Toggle -->
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label for="voice-toggle" class="text-sm font-medium">Voice Feedback</Label>
								<p class="text-muted-foreground text-xs">Spoken feedback in Bengali</p>
							</div>
							<Switch id="voice-toggle" bind:checked={enableVoice} />
						</div>

						{#if enableRAG || enableVoice}
							<div
								class="rounded border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
							>
								⚠️ Enhanced features enabled - responses may be slower
								{#if enableRAG && enableVoice}
									<br />📚 Reference lookup + 🔊 Voice generation
								{:else if enableRAG}
									<br />📚 Reference lookup enabled
								{:else if enableVoice}
									<br />🔊 Voice generation enabled
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Video Display -->
		<Card class="lg:col-span-2">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<VideoIcon class="h-5 w-5" />
					Live Feed & Pose Analysis
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="relative aspect-video overflow-hidden rounded-lg bg-black">
					<!-- Hidden video element -->
					<video
						bind:this={videoElement}
						class="absolute inset-0 h-full w-full object-contain"
						style="display: none;"
						playsinline
						muted
					></video>

					<!-- Canvas for pose visualization -->
					<canvas
						bind:this={canvasElement}
						class="absolute inset-0 h-full w-full object-contain"
						width="640"
						height="480"
					></canvas>

					<!-- Overlay for no input state -->
					{#if !isDetecting && !videoElement?.src}
						<div
							class="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center"
						>
							<div class="space-y-2 text-center">
								{#if selectedSource === 'camera'}
									<CameraIcon class="mx-auto h-12 w-12 opacity-50" />
									<p>Select a camera and click "Start Camera" to begin</p>
								{:else}
									<UploadIcon class="mx-auto h-12 w-12 opacity-50" />
									<p>Upload a video file to analyze your workout</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Status indicator -->
				{#if isDetecting}
					<div class="mt-4 space-y-2">
						<div class="flex items-center gap-2 text-sm text-green-600">
							<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
							AI pose detection active - {currentExercise?.name || 'No exercise selected'}
						</div>

						{#if enableRAG || enableVoice}
							<div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
								<div class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
								Enhanced feedback:
								{#if enableRAG}📚 Reference{/if}
								{#if enableRAG && enableVoice}
									+
								{/if}
								{#if enableVoice}🔊 Voice{/if}
							</div>
						{:else}
							<div class="flex items-center gap-2 text-xs text-gray-500">
								<div class="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
								Fast mode: Text feedback only
							</div>
						{/if}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Exercise Information -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<TargetIcon class="h-5 w-5" />
				Exercise: {currentExercise?.name || 'No exercise selected'}
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
				<div>
					<h4 class="mb-2 font-medium">How it works:</h4>
					{#if selectedExercise === 'bicep_curl'}
						<p class="text-muted-foreground">
							Tracks your elbow angle to count bicep curl repetitions. Start with arms extended,
							curl up to flex, then lower back down for one rep.
						</p>
					{:else if selectedExercise === 'squat'}
						<p class="text-muted-foreground">
							Monitors your knee angle to detect squat movements. Start standing, squat down until
							thighs are parallel, then stand back up for one rep.
						</p>
					{:else if selectedExercise === 'push_up'}
						<p class="text-muted-foreground">
							Analyzes your arm angle during push-ups. Start in plank position, lower down by
							bending arms, then push back up for one rep.
						</p>
					{/if}
				</div>
				<div>
					<h4 class="mb-2 font-medium">Tips for best results:</h4>
					<ul class="text-muted-foreground space-y-1">
						<li>• Position yourself sideways to the camera</li>
						<li>• Ensure your full body is visible</li>
						<li>• Maintain consistent lighting</li>
						<li>• Perform controlled, deliberate movements</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Instructions -->
	<Card>
		<CardHeader>
			<CardTitle>How to Use</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
				<div>
					<h4 class="mb-2 font-medium">Camera Mode:</h4>
					<ul class="text-muted-foreground space-y-1">
						<li>• Select your preferred camera from the dropdown</li>
						<li>• Click "Start Camera" to begin live pose detection</li>
						<li>• Position yourself in front of the camera</li>
						<li>• Green lines show detected pose connections</li>
						<li>• Red dots mark key body landmarks</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Video Mode:</h4>
					<ul class="text-muted-foreground space-y-1">
						<li>• Upload a video file of your workout</li>
						<li>• Use the play/pause controls to navigate</li>
						<li>• AI will analyze poses frame by frame</li>
						<li>• Supports common video formats (MP4, MOV, AVI)</li>
						<li>• Best results with clear, front-facing videos</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
