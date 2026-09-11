<script lang="ts">
	import WeatherScreen from '$lib/WeatherScreen.svelte';
	import { states } from './states';
</script>

<svelte:head>
	<title>Preview · wjeather</title>
</svelte:head>

<main class="px-4 py-8 tablet:px-8">
	<h1 class="mb-2 text-xl">Preview</h1>
	<p class="mb-8 max-w-[36rem] text-sm text-text-muted">
		Made-up weather, each at phone size (360 × 640). Hue is the sky, and the edges between hours go
		soft as cloud builds. Lines run with the wind, closer as it strengthens; calm air has none. Local only — a 404 in production.
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
</main>
