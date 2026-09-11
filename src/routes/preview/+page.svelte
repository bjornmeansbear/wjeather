<script lang="ts">
	import WeatherScreen from '$lib/WeatherScreen.svelte';
	import { states } from './states';

	// Clear night, three ways: the band token overridden per frame.
	const nightTints = ['purple-0', 'purple-1', 'purple-2'];
</script>

<svelte:head>
	<title>Preview · wjeather</title>
</svelte:head>

<main class="px-4 py-8 tablet:px-8">
	<h1 class="mb-2 text-xl">Preview</h1>
	<p class="mb-8 max-w-[36rem] text-sm text-text-muted">
		Made-up weather, each at phone size (360 × 640). Hue is the sky — yellow by day, purple with
		stars on a clear night — and the edges between hours go soft as cloud builds, and always at
		dawn and dusk. Lines run with the wind, closer as it strengthens; calm air has none.
		The dashed green line is humidity: 40% at the left edge, 100% at the right. Local only — a 404 in production.
	</p>
	<div class="flex flex-wrap gap-8">
		{#each states as state (state.name)}
			<figure class="m-0">
				<div class="flex h-[40rem] w-[22.5rem] max-w-full flex-col border border-border">
					<WeatherScreen weather={state.weather} />
				</div>
				<figcaption class="mt-2 text-sm">{state.name}</figcaption>
			</figure>
		{/each}
	</div>

	<h2 class="mt-12 mb-2 text-lg">Night tint</h2>
	<p class="mb-8 max-w-[36rem] text-sm text-text-muted">
		The same clear night in three purples. The palest barely shows the stars; purple-2 is the
		deepest that still passes contrast.
	</p>
	<div class="flex flex-wrap gap-8">
		{#each nightTints as tint (tint)}
			<figure class="m-0">
				<div
					class="flex h-[40rem] w-[22.5rem] max-w-full flex-col border border-border"
					style:--band-night="var(--{tint})"
				>
					<WeatherScreen weather={states[0].weather} />
				</div>
				<figcaption class="mt-2 text-sm">{tint}</figcaption>
			</figure>
		{/each}
	</div>
</main>
