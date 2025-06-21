<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarHeader,
		SidebarInset,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
		SidebarProvider,
		SidebarSeparator,
		SidebarTrigger
	} from '$lib/components/ui/sidebar';
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

	const navItems = [
		{ name: 'Dashboard', href: '/dashboard', active: true },
		{ name: 'Workouts', href: '/workouts', active: false },
		{ name: 'Progress', href: '/progress', active: false },
		{ name: 'Nutrition', href: '/nutrition', active: false },
		{ name: 'Settings', href: '/settings', active: false }
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

<SidebarProvider>
	<Sidebar>
		<SidebarHeader>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg">
						<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<span class="font-bold">F</span>
						</div>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">FitWise</span>
							<span class="truncate text-xs">AI Fitness Assistant</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarHeader>

		<SidebarContent>
			<SidebarGroup>
				<SidebarGroupLabel>Navigation</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{#each navItems as item (item.name)}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={item.active}>
									<a href={item.href} class="flex items-center w-full">
										<span>{item.name}</span>
									</a>
								</SidebarMenuButton>
							</SidebarMenuItem>
						{/each}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</SidebarContent>

		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<div class="flex items-center justify-between px-2 py-1">
						<span class="text-sm text-muted-foreground">Theme</span>
						<ModeToggle />
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
			<SidebarSeparator />
			<div class="px-2 py-1 text-xs text-muted-foreground">
				<p>© 2025 FitWise</p>
			</div>
		</SidebarFooter>
	</Sidebar>

	<SidebarInset>
		<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger class="-ml-1" />
			<div class="ml-auto">
				<!-- Additional header content can go here -->
			</div>
		</header>

		<div class="flex flex-1 flex-col gap-4 p-4">
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
		</div>
	</SidebarInset>
</SidebarProvider>
