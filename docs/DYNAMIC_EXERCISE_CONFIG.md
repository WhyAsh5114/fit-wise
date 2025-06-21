# Dynamic Exercise Configuration System

This document describes the LLM-powered dynamic exercise configuration system that allows FitWise to generate pose tracking configurations for any exercise, not just the predefined ones.

## Overview

Previously, FitWise was limited to tracking only hardcoded exercises (bicep_curl, squat, push_up). Now, the system can dynamically generate MediaPipe pose tracking configurations for virtually any exercise using AI.

## How It Works

### 1. Exercise Config Generation API
- **Endpoint**: `/api/exercise-config`
- **Method**: POST
- **Input**: Exercise name and optional description
- **Output**: MediaPipe pose tracking configuration

### 2. AI Analysis Process
The LLM analyzes the exercise and determines:
- **Exercise Type**: upper_body, lower_body, full_body, core
- **Primary Muscles**: Muscles worked by the exercise
- **Movement Pattern**: push, pull, squat, hinge, lunge, rotation, isometric
- **Key Joints**: Important joints for tracking
- **Movement Direction**: vertical, horizontal, diagonal, rotational

### 3. Configuration Generation
Based on the analysis, the AI generates:
- **Joint Selection**: Which MediaPipe landmarks to track
- **Tracking Axes**: Y (vertical) and/or X (horizontal) movement
- **Signal Inversion**: Whether to invert coordinates
- **Initial Direction**: Starting position (up/down)
- **Peak Distance**: Minimum frames between repetition peaks
- **Angle Points**: Three points for angle calculations

## Usage Examples

### Programmatic Usage

```typescript
import { getExerciseConfig, processExerciseReps } from '$lib/workout-utils';

// Get or generate exercise config
const config = await getExerciseConfig('shoulder press', 'Press weights overhead from shoulder level');

// Process reps with dynamic config
const result = await processExerciseReps(
    poseHistory, 
    'shoulder press', 
    lastRepCount, 
    { enableRAG: true, enableVoice: true },
    'Press weights overhead from shoulder level'
);
```

### Chat Interface

Users can ask the AI to generate configs through the chat:

```
User: "Can you generate a tracking configuration for tricep dips?"
AI: *Uses generateExerciseConfig tool to create the configuration*
```

### Demo Interface

Visit `/exercise-config` to test the system with a visual interface.

## Generated Configuration Examples

### Shoulder Press
```json
{
  "name": "shoulder_press",
  "initialDirection": "down",
  "minPeakDistance": 10,
  "joints": [{
    "joint": 15,  // LEFT_WRIST
    "trackY": true,
    "inverted": true,
    "anglePoints": [11, 13, 15]  // SHOULDER -> ELBOW -> WRIST
  }]
}
```

### Lateral Raise
```json
{
  "name": "lateral_raise", 
  "initialDirection": "down",
  "minPeakDistance": 8,
  "joints": [{
    "joint": 15,  // LEFT_WRIST
    "trackY": true,
    "trackX": true,
    "inverted": true,
    "anglePoints": [11, 13, 15]
  }]
}
```

## Caching System

- Configs are cached in memory to avoid regenerating
- Cache checks: Memory → Predefined → AI Generation
- Use `clearExerciseConfigCache()` to reset cache

## API Integration

The system integrates with:
- **Chat API**: Can generate configs through conversation
- **Workout Creation**: Automatically generates configs for workout exercises
- **Real-time Tracking**: Seamlessly works with existing rep counting

## Testing

### Node.js Test Script
```bash
node test-exercise-config.js
```

### Manual Testing
1. Visit `/exercise-config` page
2. Enter exercise name and description
3. Click "Generate Config"
4. Review the generated configuration

## Benefits

1. **Unlimited Exercise Support**: No longer limited to hardcoded exercises
2. **Intelligent Analysis**: AI understands biomechanics and movement patterns
3. **Automatic Integration**: Works seamlessly with existing tracking system
4. **User-Friendly**: Can be triggered through chat or direct API calls
5. **Caching**: Efficient reuse of generated configurations

## Technical Architecture

```
User Input → Exercise Config API → LLM Analysis → MediaPipe Config → Cache → Rep Tracking
```

The system maintains backward compatibility with predefined exercises while enabling unlimited expansion through AI generation.
