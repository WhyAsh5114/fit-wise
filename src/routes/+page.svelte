<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Brain, Camera, MessageSquare, Target, Zap, Dumbbell } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	const features = [
		{
			icon: Brain,
			title: 'Agentic AI Coach',
			description:
				'AI that understands your goals and creates personalized workout routines using evidence-based research.',
			badge: 'AI-Powered'
		},
		{
			icon: Camera,
			title: 'Real-Time Form Analysis',
			description:
				'MediaPipe pose detection provides instant feedback on your form, preventing injuries and maximizing results.',
			badge: 'Computer Vision'
		},
		{
			icon: MessageSquare,
			title: 'Intelligent Chat Assistant',
			description:
				'Natural conversation to create workouts, get exercise advice, and receive personalized guidance.',
			badge: 'RAG-Enhanced'
		},
		{
			icon: Target,
			title: 'Unlimited Exercise Support',
			description:
				'AI generates tracking configurations for any exercise - not limited to predefined movements.',
			badge: 'Dynamic'
		},
		{
			icon: Zap,
			title: 'Real-Time Feedback',
			description:
				'Get instant corrections with voice guidance and scoring to perfect your technique.',
			badge: 'Live Coaching'
		},
		{
			icon: Dumbbell,
			title: 'Evidence-Based Training',
			description:
				'Recommendations backed by exercise science research and biomechanics knowledge.',
			badge: 'Research-Backed'
		}
	];

	function startWorkout() {
		goto('/dashboard');
	}

	function tryDemo() {
		goto('/form-analysis');
	}
</script>

<svelte:head>
	<title>FitWise - AI-Powered Fitness Coach</title>
	<meta
		name="description"
		content="Transform your fitness journey with agentic AI coaching, real-time form analysis, and personalized workout routines."
	/>
</svelte:head>

<div class="from-background to-muted/20 min-h-screen bg-gradient-to-b">
	<!-- Hero Section -->
	<section class="container mx-auto px-4 pt-20 pb-16 text-center">
		<div class="mx-auto max-w-4xl space-y-8">
			<!-- Header -->
			<div class="space-y-4">
				<Badge variant="secondary" class="px-4 py-2 text-sm font-medium">
					🚀 Agentic AI • Real-Time Coaching • Unlimited Exercises
				</Badge>

				<h1
					class="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl"
				>
					Your AI Fitness Coach
				</h1>

				<p class="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed md:text-2xl">
					Transform your workouts with <span class="text-foreground font-semibold">agentic AI</span>
					that creates personalized routines and provides
					<span class="text-foreground font-semibold">real-time form correction</span> through advanced
					pose detection.
				</p>
			</div>

			<!-- CTA Buttons -->
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button size="lg" class="px-8 py-6 text-lg" onclick={startWorkout}>
					<Brain class="mr-2 h-5 w-5" />
					Start Training
				</Button>
				<Button variant="outline" size="lg" class="px-8 py-6 text-lg" onclick={tryDemo}>
					<Camera class="mr-2 h-5 w-5" />
					Try Live Demo
				</Button>
			</div>

			<!-- Quick Stats -->
			<div class="mx-auto grid max-w-2xl grid-cols-3 gap-8 pt-8">
				<div class="text-center">
					<div class="text-primary text-2xl font-bold">∞</div>
					<div class="text-muted-foreground text-sm">Exercises Supported</div>
				</div>
				<div class="text-center">
					<div class="text-primary text-2xl font-bold">33</div>
					<div class="text-muted-foreground text-sm">Pose Landmarks</div>
				</div>
				<div class="text-center">
					<div class="text-primary text-2xl font-bold">Real-time</div>
					<div class="text-muted-foreground text-sm">AI Feedback</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Grid -->
	<section class="container mx-auto px-4 py-16">
		<div class="mx-auto max-w-6xl">
			<div class="mb-12 text-center">
				<h2 class="mb-4 text-3xl font-bold md:text-4xl">Powered by Advanced AI Technology</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
					FitWise combines cutting-edge agentic AI, computer vision, and exercise science to deliver
					personalized fitness coaching.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each features as feature (feature.title)}
					<Card
						class="hover:border-primary/50 group h-full border-2 transition-all duration-300 hover:shadow-lg"
					>
						<CardHeader class="pb-4">
							<div class="flex items-start justify-between">
								<div
									class="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors"
								>
									<svelte:component this={feature.icon} class="text-primary h-6 w-6" />
								</div>
								<Badge variant="outline" class="text-xs">
									{feature.badge}
								</Badge>
							</div>
							<CardTitle class="group-hover:text-primary text-xl transition-colors">
								{feature.title}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-base leading-relaxed">
								{feature.description}
							</CardDescription>
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="container mx-auto px-4 py-16">
		<div class="mx-auto max-w-4xl">
			<div class="mb-12 text-center">
				<h2 class="mb-4 text-3xl font-bold md:text-4xl">How FitWise Works</h2>
				<p class="text-muted-foreground text-lg">
					Simple steps to transform your fitness journey with AI-powered coaching.
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<div class="space-y-4 text-center">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
					>
						<MessageSquare class="text-primary h-8 w-8" />
					</div>
					<h3 class="text-xl font-semibold">1. Chat with AI</h3>
					<p class="text-muted-foreground">
						Tell the AI your fitness goals, available equipment, and experience level through
						natural conversation.
					</p>
				</div>

				<div class="space-y-4 text-center">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
					>
						<Brain class="text-primary h-8 w-8" />
					</div>
					<h3 class="text-xl font-semibold">2. AI Creates Your Plan</h3>
					<p class="text-muted-foreground">
						Agentic AI generates personalized workouts using evidence-based research and creates
						tracking configurations.
					</p>
				</div>

				<div class="space-y-4 text-center">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
					>
						<Camera class="text-primary h-8 w-8" />
					</div>
					<h3 class="text-xl font-semibold">3. Get Real-Time Coaching</h3>
					<p class="text-muted-foreground">
						Start your workout with live pose detection, instant form feedback, and rep counting for
						perfect technique.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="container mx-auto px-4 py-16">
		<div class="mx-auto max-w-4xl">
			<Card class="from-primary/5 to-primary/10 border-primary/20 bg-gradient-to-r">
				<CardContent class="space-y-6 p-8 text-center">
					<h2 class="text-3xl font-bold md:text-4xl">Ready to Transform Your Fitness?</h2>
					<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
						Join the future of fitness with AI-powered coaching that adapts to your needs and helps
						you achieve your goals safely and effectively.
					</p>
					<div class="flex flex-col justify-center gap-4 sm:flex-row">
						<Button size="lg" class="px-8 py-6 text-lg" onclick={startWorkout}>
							<Dumbbell class="mr-2 h-5 w-5" />
							Start Your Journey
						</Button>
						<Button variant="outline" size="lg" class="px-8 py-6 text-lg" onclick={tryDemo}>
							Try Demo First
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</section>
</div>

<style>
	/* Custom gradient animation for hero text */
	@keyframes gradient {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}
</style>
