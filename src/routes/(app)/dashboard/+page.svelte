<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import ModeToggle from '$lib/components/mode-toggle.svelte';

	let workoutGoals = '';
	let selectedEquipment: string[] = [];

	const availableEquipment = [
		'Dumbbells',
		'Barbell', 
		'Kettlebells',
		'Resistance Bands',
		'Pull-up Bar',
		'Bench',
		'Yoga Mat',
		'No Equipment'
	];

	function toggleEquipment(equipment: string) {
		if (selectedEquipment.includes(equipment)) {
			selectedEquipment = selectedEquipment.filter((item) => item !== equipment);
		} else {
			selectedEquipment = [...selectedEquipment, equipment];
		}
	}

	function handleSubmit() {
		if (!workoutGoals.trim()) return;
		
		// Here you would integrate with your AI service
		console.log('Goals:', workoutGoals);
		console.log('Equipment:', selectedEquipment);
		
		// Clear form
		workoutGoals = '';
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-16 items-center justify-between">
			<div class="flex items-center space-x-2">
				<h1 class="text-xl font-semibold">FitWise</h1>
			</div>
			<ModeToggle />
		</div>
	</header>

	<!-- Main Content -->
	<main class="container py-8">
		<div class="mx-auto max-w-2xl space-y-8">
			<!-- Title Section -->
			<div class="text-center space-y-2">
				<h2 class="text-3xl font-bold tracking-tight">What are your fitness goals?</h2>
				<p class="text-muted-foreground">Tell us about your goals and available equipment to get a personalized workout plan.</p>
			</div>

			<!-- Goals Input -->
			<div class="space-y-4">
				<Textarea
					bind:value={workoutGoals}
					placeholder="I want to build muscle, lose weight, improve endurance..."
					class="min-h-[120px] resize-none text-base"
				/>
				
				<!-- Quick Goals -->
				<div class="flex flex-wrap gap-2 justify-center">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'Build muscle and strength')}
					>
						Build Muscle
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'Lose weight and improve cardio')}
					>
						Lose Weight
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'Improve flexibility and mobility')}
					>
						Flexibility
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'General fitness for beginners')}
					>
						Beginner
					</Button>
				</div>
			</div>

			<!-- Equipment Selection -->
			<div class="space-y-4">
				<h3 class="text-lg font-medium">Available Equipment</h3>
				
				{#if selectedEquipment.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each selectedEquipment as equipment (equipment)}
							<Badge variant="secondary">
								{equipment}
							</Badge>
						{/each}
					</div>
				{/if}

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
					{#each availableEquipment as equipment (equipment)}
						<Button
							variant={selectedEquipment.includes(equipment) ? 'default' : 'outline'}
							size="sm"
							onclick={() => toggleEquipment(equipment)}
							class="h-auto py-3 px-4 text-sm"
						>
							{equipment}
						</Button>
					{/each}
				</div>
			</div>

			<!-- Submit Button -->
			<div class="text-center">
				<Button 
					size="lg" 
					onclick={handleSubmit}
					disabled={!workoutGoals.trim()}
					class="px-8"
				>
					Create My Workout Plan
				</Button>
			</div>
		</div>
	</main>
</div>
