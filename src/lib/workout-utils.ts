export type Landmark = {
	x: number;
	y: number;
	z: number;
	visibility?: number;
};

export type Pose = Landmark[];

export type ExerciseName = 'bicep_curl' | 'squat' | 'push_up';

type JointConfig = {
	joint: number;
	trackY: boolean; // Track Y position (up/down movement)
	trackX?: boolean; // Track X position (left/right movement)
	inverted?: boolean; // Invert the signal (for exercises where down is actually up in screen coords)
	anglePoints?: [number, number, number]; // Three joint indices for angle calculation [point1, vertex, point3]
};

export type ExerciseConfig = {
	name: ExerciseName;
	joints: JointConfig[];
	minPeakDistance: number; // Minimum distance between peaks to count as a rep
	initialDirection: 'up' | 'down';
};

export type RepetitionState = {
	reps: number;
	stage: 'down' | 'up';
	feedback: string | null;
};

export type AngleData = {
	timestamp: number;
	angle: number;
	jointPositions: {
		point1: Landmark;
		point2: Landmark;
		point3: Landmark;
	};
};

export type RepSegment = {
	repNumber: number;
	exerciseType: ExerciseName;
	startIndex: number;
	endIndex: number;
	angles: AngleData[];
	duration: number;
};

/**
 * Simple moving average smoothing
 */
function smoothData(values: number[], windowSize: number = 3): number[] {
	if (values.length < windowSize) return values;
	
	const smoothed: number[] = [];
	
	for (let i = 0; i < values.length; i++) {
		const start = Math.max(0, i - Math.floor(windowSize / 2));
		const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1);
		const window = values.slice(start, end);
		const average = window.reduce((sum, val) => sum + val, 0) / window.length;
		smoothed.push(average);
	}
	
	return smoothed;
}

/**
 * Simple peak detection for joint movement with noise filtering
 */
function detectPeaksAndValleys(values: number[], minDistance: number = 5, minHeight: number = 0.01): { peaks: number[], valleys: number[] } {
	const peaks: number[] = [];
	const valleys: number[] = [];
	
	if (values.length < 3) return { peaks, valleys };
	
	// First, smooth the data to reduce noise
	const smoothed = smoothData(values, 5);
	
	// Calculate the range of movement to set dynamic threshold
	const min = Math.min(...smoothed);
	const max = Math.max(...smoothed);
	const range = max - min;
	const dynamicMinHeight = range * 0.1; // Peak must be at least 10% of total range
	const actualMinHeight = Math.max(minHeight, dynamicMinHeight);
	
	for (let i = 1; i < smoothed.length - 1; i++) {
		const prev = smoothed[i - 1];
		const curr = smoothed[i];
		const next = smoothed[i + 1];
		
		// Peak detection with height threshold
		if (curr > prev && curr > next && curr - min > actualMinHeight) {
			// Check minimum distance from last peak
			if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
				peaks.push(i);
			}
		}
		
		// Valley detection with height threshold
		if (curr < prev && curr < next && max - curr > actualMinHeight) {
			// Check minimum distance from last valley
			if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minDistance) {
				valleys.push(i);
			}
		}
	}
	
	return { peaks, valleys };
}

/**
 * Processes a history of poses to count repetitions using peak/valley detection.
 * @param poseHistory An array of poses from MediaPipe.
 * @param exerciseConfig The configuration for the exercise.
 * @param lastProcessedRepCount The number of reps that were already processed (to avoid duplicate logging).
 * @returns An object containing the total number of repetitions detected and any new rep segments.
 */
export function segmentReps(poseHistory: Pose[], exerciseConfig: ExerciseConfig, lastProcessedRepCount: number = 0): { 
	repCount: number; 
	newRepSegments: RepSegment[];
} {
	if (!poseHistory || poseHistory.length < 15) { // Need more history for reliable detection
		return { repCount: 0, newRepSegments: [] };
	}

	// Extract the primary joint movement
	const primaryJoint = exerciseConfig.joints[0];
	const values: number[] = [];
	const angleDataHistory: AngleData[] = [];
	
	for (let i = 0; i < poseHistory.length; i++) {
		const pose = poseHistory[i];
		if (!pose || pose.length === 0 || !pose[primaryJoint.joint]) continue;
		
		let value = 0;
		if (primaryJoint.trackY) {
			value += pose[primaryJoint.joint].y;
		}
		if (primaryJoint.trackX) {
			value += pose[primaryJoint.joint].x;
		}
		
		// Invert if needed (useful for exercises where screen down = exercise up)
		if (primaryJoint.inverted) {
			value = -value;
		}
		
		values.push(value);
		
		// Calculate angle if angle points are configured
		if (primaryJoint.anglePoints && pose[primaryJoint.anglePoints[0]] && 
			pose[primaryJoint.anglePoints[1]] && pose[primaryJoint.anglePoints[2]]) {
			
			const angle = calculateAngle(
				pose[primaryJoint.anglePoints[0]],
				pose[primaryJoint.anglePoints[1]], 
				pose[primaryJoint.anglePoints[2]]
			);
			
			angleDataHistory.push({
				timestamp: i, // Using frame index as timestamp
				angle: angle,
				jointPositions: {
					point1: pose[primaryJoint.anglePoints[0]],
					point2: pose[primaryJoint.anglePoints[1]],
					point3: pose[primaryJoint.anglePoints[2]]
				}
			});
		}
	}
	
	if (values.length < 15) return { repCount: 0, newRepSegments: [] };
	
	// Detect peaks and valleys with exercise-specific parameters
	const { peaks, valleys } = detectPeaksAndValleys(values, exerciseConfig.minPeakDistance);
	
	// Only count reps if we have a minimum number of alternating events
	const allEvents = [...peaks.map(i => ({ index: i, type: 'peak' })), ...valleys.map(i => ({ index: i, type: 'valley' }))];
	allEvents.sort((a, b) => a.index - b.index);
	
	// More conservative rep counting - need proper alternating pattern
	let repCount = 0;
	const validSequence: Array<{ type: string; index: number }> = [];
	const newRepSegments: RepSegment[] = [];
	
	for (const event of allEvents) {
		const lastEvent = validSequence[validSequence.length - 1];
		
		// Only add to sequence if it's different from the last event
		if (!lastEvent || lastEvent.type !== event.type) {
			validSequence.push(event);
		}
	}
	
	// Count complete cycles and create rep segments
	for (let i = 1; i < validSequence.length; i++) {
		const prevEvent = validSequence[i - 1];
		const currEvent = validSequence[i];
		let repCompleted = false;
		
		if (exerciseConfig.initialDirection === 'down') {
			// For exercises starting down: valley -> peak = 1 rep
			if (prevEvent.type === 'valley' && currEvent.type === 'peak') {
				repCompleted = true;
			}
		} else {
			// For exercises starting up: peak -> valley = 1 rep  
			if (prevEvent.type === 'peak' && currEvent.type === 'valley') {
				repCompleted = true;
			}
		}
		
		if (repCompleted) {
			repCount++;
			
			// Only process and log if this is a new rep (beyond what was already processed)
			if (repCount > lastProcessedRepCount) {
				// Create rep segment if we have angle data
				if (angleDataHistory.length > 0) {
					const startIndex = prevEvent.index;
					const endIndex = currEvent.index;
					
					// Filter angle data for this rep
					const repAngles = angleDataHistory.filter(
						angleData => angleData.timestamp >= startIndex && angleData.timestamp <= endIndex
					);
					
					if (repAngles.length > 0) {
						const repSegment: RepSegment = {
							repNumber: repCount,
							exerciseType: exerciseConfig.name,
							startIndex: startIndex,
							endIndex: endIndex,
							angles: repAngles,
							duration: (endIndex - startIndex) * 33.33 // Approximate 30fps
						};
						
						newRepSegments.push(repSegment);
						
						// Process the rep segment (console log and AI feedback)
						processRepSegment(repSegment).catch(error => {
							console.error('Error processing rep segment:', error);
						});
					}
				}
			}
		}
	}
	
	return { repCount, newRepSegments };
}

/**
 * Calculate the angle between three points
 */
function calculateAngle(point1: Landmark, vertex: Landmark, point3: Landmark): number {
	// Calculate vectors from vertex to the other two points
	const vector1 = {
		x: point1.x - vertex.x,
		y: point1.y - vertex.y
	};
	
	const vector2 = {
		x: point3.x - vertex.x,
		y: point3.y - vertex.y
	};
	
	// Calculate dot product and magnitudes
	const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
	const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
	const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
	
	// Calculate angle in radians, then convert to degrees
	const cosAngle = dotProduct / (magnitude1 * magnitude2);
	const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to prevent NaN
	const angleDeg = (angleRad * 180) / Math.PI;
	
	return angleDeg;
}

export type RepAnalysis = {
	exerciseName: string;
	repNumber: number;
	duration: number;
	angleRange: {
		min: number;
		max: number;
	};
	averageAngle: number;
	rangeOfMotion: number;
};

/**
 * Process a completed rep segment and send angle data to analysis
 */
async function processRepSegment(repSegment: RepSegment): Promise<void> {
	if (repSegment.angles.length === 0) {
		console.log(`Rep #${repSegment.repNumber} - No angle data available`);
		return;
	}

	const angles = repSegment.angles.map(a => a.angle);
	const minAngle = Math.min(...angles);
	const maxAngle = Math.max(...angles);
	const avgAngle = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
	const rangeOfMotion = maxAngle - minAngle;

	const repAnalysis: RepAnalysis = {
		exerciseName: repSegment.exerciseType.replace('_', ' '),
		repNumber: repSegment.repNumber,
		duration: Math.round(repSegment.duration),
		angleRange: {
			min: Math.round(minAngle * 10) / 10,
			max: Math.round(maxAngle * 10) / 10
		},
		averageAngle: Math.round(avgAngle * 10) / 10,
		rangeOfMotion: Math.round(rangeOfMotion * 10) / 10
	};

	console.log('Rep Analysis:', repAnalysis);

	// Send to AI feedback API with streaming response
	try {
		const response = await fetch('/api/feedback', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(repAnalysis)
		});

		if (response.ok) {
			// Handle streaming response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let feedback: { feedback: string; score: number; classification: string } | null = null;

			if (reader) {
				let buffer = '';
				
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || ''; // Keep incomplete line in buffer

					for (const line of lines) {
						if (line.trim()) {
							try {
								const data = JSON.parse(line);
								
								if (data.type === 'feedback') {
									feedback = data.data;
									console.log('AI Feedback:', feedback);
									
									// Show toast with feedback
									if (typeof window !== 'undefined' && feedback) {
										const { toast } = await import('svelte-sonner');
										
										toast.success(`Rep ${repAnalysis.repNumber} Analysis`, {
											description: `${feedback.feedback} (Score: ${feedback.score}/100)`,
											duration: 5000
										});
									}
								} else if (data.type === 'audio') {
									// Play the audio
									if (typeof window !== 'undefined') {
										const audioBase64 = data.data;
										const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
										const audioUrl = URL.createObjectURL(audioBlob);
										const audio = new Audio(audioUrl);
										
										audio.play().catch(console.error);
										
										// Clean up URL after playing
										audio.addEventListener('ended', () => {
											URL.revokeObjectURL(audioUrl);
										});
									}
								}
							} catch (parseError) {
								console.error('Error parsing streaming data:', parseError);
							}
						}
					}
				}
			}
		} else {
			console.error('Failed to get AI feedback:', response.statusText);
		}
	} catch (error) {
		console.error('Error calling feedback API:', error);
	}
}

// --- Pre-defined Exercise Configurations ---

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

export const EXERCISE_CONFIGS: Record<ExerciseName, ExerciseConfig> = {
	bicep_curl: {
		name: 'bicep_curl',
		initialDirection: 'down',
		minPeakDistance: 8, // Increased from 3 to prevent noise
		joints: [
			{
				joint: LANDMARK_INDICES.LEFT_WRIST, // Track wrist movement
				trackY: true,
				inverted: true, // Screen down = exercise up
				anglePoints: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST] // Elbow angle
			}
		]
	},
	squat: {
		name: 'squat',
		initialDirection: 'up',
		minPeakDistance: 12, // Increased from 5 to prevent noise
		joints: [
			{
				joint: LANDMARK_INDICES.LEFT_HIP, // Track hip movement
				trackY: true,
				inverted: false, // Screen down = exercise down
				anglePoints: [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.LEFT_KNEE, LANDMARK_INDICES.LEFT_ANKLE] // Knee angle
			}
		]
	},
	push_up: {
		name: 'push_up',
		initialDirection: 'up',
		minPeakDistance: 10, // Increased from 4 to prevent noise
		joints: [
			{
				joint: LANDMARK_INDICES.LEFT_SHOULDER, // Track shoulder movement
				trackY: true,
				inverted: false, // Screen down = exercise down
				anglePoints: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST] // Elbow angle
			}
		]
	}
};
