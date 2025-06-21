<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

	let workoutGoals = '';
	let selectedEquipment: string[] = [];
	let messages: Array<{ type: 'user' | 'system'; content: string; timestamp: Date }> = [
		{
			type: 'system',
			content:
				"Hi! I'm your fitness assistant. Tell me about your workout goals and what equipment you have available, and I'll help create a personalized workout plan for you!",
			timestamp: new Date()
		}
	];

	const availableEquipment = [
		'Dumbbells',
		'Barbell',
		'Kettlebells',
		'Resistance Bands',
		'Pull-up Bar',
		'Bench',
		'Yoga Mat',
		'Treadmill',
		'Stationary Bike',
		'Rowing Machine',
		'Cable Machine',
		'Smith Machine',
		'Medicine Ball',
		'Foam Roller',
		'Jump Rope',
		'Stability Ball',
		'TRX Straps',
		'Battle Ropes'
	];

	function toggleEquipment(equipment: string) {
		if (selectedEquipment.includes(equipment)) {
			selectedEquipment = selectedEquipment.filter((item) => item !== equipment);
		} else {
			selectedEquipment = [...selectedEquipment, equipment];
		}
	}

	function sendMessage() {
		if (!workoutGoals.trim()) return;

		// Add user message
		messages = [
			...messages,
			{
				type: 'user',
				content: workoutGoals,
				timestamp: new Date()
			}
		];

		// Simulate AI response (you would replace this with actual AI integration)
		setTimeout(() => {
			const equipmentText =
				selectedEquipment.length > 0
					? `I see you have access to: ${selectedEquipment.join(', ')}.`
					: "I notice you haven't selected any equipment yet.";

			messages = [
				...messages,
				{
					type: 'system',
					content: `Thanks for sharing your goals! ${equipmentText} Based on what you've told me, I'll create a personalized workout plan. Let me analyze your requirements and get back to you with some recommendations.`,
					timestamp: new Date()
				}
			];
		}, 1000);

		// Clear input
		workoutGoals = '';
	}

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
	<div class="mx-auto max-w-4xl space-y-6">
		<!-- Header -->
		<Card>
			<CardHeader class="text-center">
				<CardTitle class="text-3xl font-bold text-gray-800">FitWise</CardTitle>
				<CardDescription class="text-lg">Your Personal AI Fitness Assistant</CardDescription>
			</CardHeader>
		</Card>

		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Chat Interface -->
			<div class="lg:col-span-2">
				<Card class="flex h-[600px] flex-col">
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<div class="h-3 w-3 rounded-full bg-green-500"></div>
							Workout Goals Chat
						</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-1 flex-col gap-4">
						<!-- Messages Area -->
						<ScrollArea class="flex-1 pr-4">
							<div class="space-y-4">
								{#each messages as message, index (index)}
									<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
										<div
											class="max-w-[80%] {message.type === 'user'
												? 'bg-blue-500 text-white'
												: 'bg-gray-100 text-gray-800'} 
											space-y-1 rounded-lg p-3"
										>
											<p class="text-sm">{message.content}</p>
											<p class="text-xs opacity-70">
												{message.timestamp.toLocaleTimeString()}
											</p>
										</div>
									</div>
								{/each}
							</div>
						</ScrollArea>

						<!-- Input Area -->
						<div class="space-y-3">
							<div class="flex gap-2">
								<Textarea
									bind:value={workoutGoals}
									placeholder="Tell me about your fitness goals, experience level, preferred workout types, any limitations..."
									class="min-h-[80px] flex-1 resize-none"
									onkeypress={handleKeypress}
								/>
								<Button onclick={sendMessage} disabled={!workoutGoals.trim()} class="self-end">
									Send
								</Button>
							</div>
							<p class="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<!-- Equipment Selection -->
			<div class="lg:col-span-1">
				<Card class="flex h-[600px] flex-col">
					<CardHeader>
						<CardTitle>Available Equipment</CardTitle>
						<CardDescription>Select the equipment you have access to</CardDescription>
						{#if selectedEquipment.length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each selectedEquipment as equipment (equipment)}
									<Badge variant="secondary" class="text-xs">
										{equipment}
									</Badge>
								{/each}
							</div>
						{/if}
					</CardHeader>
					<CardContent class="h-px flex-1 grow">
						<ScrollArea class="h-full pr-4">
							<div class="space-y-3">
								{#each availableEquipment as equipment (equipment)}
									<div class="flex items-center space-x-2">
										<Checkbox
											id={equipment}
											checked={selectedEquipment.includes(equipment)}
											onCheckedChange={() => toggleEquipment(equipment)}
										/>
										<Label
											for={equipment}
											class="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											{equipment}
										</Label>
									</div>
								{/each}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Quick Action Buttons -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-wrap justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'I want to build muscle mass and strength')}
					>
						Build Muscle
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'I want to lose weight and improve cardio')}
					>
						Lose Weight
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'I want to improve flexibility and mobility')}
					>
						Flexibility
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = "I'm a beginner and want to start working out")}
					>
						Beginner
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (workoutGoals = 'I want to improve athletic performance')}
					>
						Athletic Performance
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
