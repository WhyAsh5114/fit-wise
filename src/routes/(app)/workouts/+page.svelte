<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { VideoIcon, CameraIcon, PlayIcon, Square, UploadIcon, TargetIcon } from 'lucide-svelte';
	import { segmentReps, EXERCISE_CONFIGS, type Pose as PoseData, type ExerciseName } from '$lib/workout-utils';

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
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(stream => {
					// Stop the stream immediately, we just needed permission
					stream.getTracks().forEach(track => track.stop());
					statusMessage = 'Permission granted, enumerating cameras...';
				})
				.catch(() => {
					// Permission denied, but we can still enumerate devices without labels
					statusMessage = 'Permission denied, but will try to list cameras...';
				});

			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter(device => device.kind === 'videoinput');
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
				statusMessage = 'No cameras found. Make sure camera is connected and permissions are granted.';
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
		// Update rep count using the workout utils
		if (poseHistory.length > 15) { // Need minimum history for reliable detection
			const result = segmentReps(poseHistory, EXERCISE_CONFIGS[selectedExercise], lastProcessedRepCount, {
				enableRAG,
				enableVoice
			});
			// Only allow rep count to increase, never decrease
			if (result.repCount > maxRepsEverSeen) {
				maxRepsEverSeen = result.repCount;
				currentReps = result.repCount;
				lastProcessedRepCount = result.repCount; // Update the last processed count
			}
			// New rep segments are automatically processed and logged only for new reps
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
			currentStream.getTracks().forEach(track => track.stop());
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

	function onExerciseChange() {
		resetRepCount();
	}
</script>

<div class="container mx-auto p-6 space-y-6">
	<div class="text-center">
		<h1 class="text-3xl font-bold mb-2">AI-Powered Workout Analysis</h1>
		<p class="text-muted-foreground">
			Select your camera or upload a video to analyze your workout form with AI pose detection
		</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Controls Panel -->
		<Card class="lg:col-span-1">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CameraIcon class="h-5 w-5" />
					Source Selection
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Exercise Selection -->
				<div class="space-y-2">
					<Label for="exercise-select">Exercise Type</Label>
					<select 
						id="exercise-select"
						bind:value={selectedExercise}
						onchange={onExerciseChange}
						class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						<option value="bicep_curl">💪 Bicep Curls</option>
						<option value="squat">🏋️ Squats</option>
						<option value="push_up">⬇️ Push-ups</option>
					</select>
				</div>

				<!-- Source Type Selection -->
				<div class="space-y-2">
					<Label for="source-select">Input Source</Label>
					<select 
						id="source-select"
						bind:value={selectedSource}
						onchange={() => stopDetection()}
						class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
							<Button 
								onclick={getAvailableCameras}
								size="sm"
								variant="outline"
								class="h-8 px-2"
							>
								🔄 Refresh
							</Button>
						</div>
						<select 
							id="camera-select"
							bind:value={selectedCameraId}
							class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
							<p class="text-xs text-muted-foreground">{statusMessage}</p>
						{/if}
					</div>

					<!-- Camera Controls -->
					<div class="space-y-2">
						<Button 
							onclick={startCamera} 
							disabled={isLoading || !selectedCameraId}
							class="w-full"
						>
							{#if isLoading}
								Loading...
							{:else if isDetecting}
								<Square class="h-4 w-4 mr-2" />
								Stop Camera
							{:else}
								<PlayIcon class="h-4 w-4 mr-2" />
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
								class="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
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
						<Square class="h-4 w-4 mr-2" />
						Stop Detection
					</Button>
				{/if}

				<!-- Rep Counter -->
				{#if isDetecting}
					<div class="space-y-2 p-4 bg-muted rounded-lg">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold">Rep Counter</h3>
							<Button onclick={resetRepCount} size="sm" variant="outline">
								Reset
							</Button>
						</div>
						<div class="text-center">
							<div class="text-3xl font-bold text-primary">{currentReps}</div>
							<div class="text-sm text-muted-foreground">Repetitions</div>
						</div>
					</div>
				{/if}

				<!-- AI Features -->
				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<h3 class="font-semibold text-sm">AI Features</h3>
					
					<div class="space-y-3">
						<!-- RAG Toggle -->
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label for="rag-toggle" class="text-sm font-medium">
									Enhanced Reference
								</Label>
								<p class="text-xs text-muted-foreground">
									Uses exercise database for better feedback
								</p>
							</div>
							<Switch id="rag-toggle" bind:checked={enableRAG} />
						</div>

						<!-- Voice Toggle -->
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label for="voice-toggle" class="text-sm font-medium">
									Voice Feedback
								</Label>
								<p class="text-xs text-muted-foreground">
									Spoken feedback in Bengali
								</p>
							</div>
							<Switch id="voice-toggle" bind:checked={enableVoice} />
						</div>

						{#if enableRAG || enableVoice}
							<div class="text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950 p-2 rounded border border-orange-200 dark:border-orange-800">
								⚠️ Enhanced features enabled - responses may be slower
								{#if enableRAG && enableVoice}
									<br/>📚 Reference lookup + 🔊 Voice generation
								{:else if enableRAG}
									<br/>📚 Reference lookup enabled
								{:else if enableVoice}
									<br/>🔊 Voice generation enabled
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
				<div class="relative aspect-video bg-black rounded-lg overflow-hidden">
					<!-- Hidden video element -->
					<video
						bind:this={videoElement}
						class="absolute inset-0 w-full h-full object-contain"
						style="display: none;"
						playsinline
						muted
					></video>
					
					<!-- Canvas for pose visualization -->
					<canvas
						bind:this={canvasElement}
						class="absolute inset-0 w-full h-full object-contain"
						width="640"
						height="480"
					></canvas>
					
					<!-- Overlay for no input state -->
					{#if !isDetecting && !videoElement?.src}
						<div class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
							<div class="text-center space-y-2">
								{#if selectedSource === 'camera'}
									<CameraIcon class="h-12 w-12 mx-auto opacity-50" />
									<p>Select a camera and click "Start Camera" to begin</p>
								{:else}
									<UploadIcon class="h-12 w-12 mx-auto opacity-50" />
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
							<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
							AI pose detection active - {selectedExercise.replace('_', ' ')}
						</div>
						
						{#if enableRAG || enableVoice}
							<div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
								<div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
								Enhanced feedback: 
								{#if enableRAG}📚 Reference{/if}
								{#if enableRAG && enableVoice} + {/if}
								{#if enableVoice}🔊 Voice{/if}
							</div>
						{:else}
							<div class="flex items-center gap-2 text-xs text-gray-500">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
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
				Exercise: {selectedExercise.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<h4 class="font-medium mb-2">How it works:</h4>
					{#if selectedExercise === 'bicep_curl'}
						<p class="text-muted-foreground">
							Tracks your elbow angle to count bicep curl repetitions. 
							Start with arms extended, curl up to flex, then lower back down for one rep.
						</p>
					{:else if selectedExercise === 'squat'}
						<p class="text-muted-foreground">
							Monitors your knee angle to detect squat movements. 
							Start standing, squat down until thighs are parallel, then stand back up for one rep.
						</p>
					{:else if selectedExercise === 'push_up'}
						<p class="text-muted-foreground">
							Analyzes your arm angle during push-ups. 
							Start in plank position, lower down by bending arms, then push back up for one rep.
						</p>
					{/if}
				</div>
				<div>
					<h4 class="font-medium mb-2">Tips for best results:</h4>
					<ul class="space-y-1 text-muted-foreground">
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
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<h4 class="font-medium mb-2">Camera Mode:</h4>
					<ul class="space-y-1 text-muted-foreground">
						<li>• Select your preferred camera from the dropdown</li>
						<li>• Click "Start Camera" to begin live pose detection</li>
						<li>• Position yourself in front of the camera</li>
						<li>• Green lines show detected pose connections</li>
						<li>• Red dots mark key body landmarks</li>
					</ul>
				</div>
				<div>
					<h4 class="font-medium mb-2">Video Mode:</h4>
					<ul class="space-y-1 text-muted-foreground">
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
