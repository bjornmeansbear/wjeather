<script lang="ts">
	import Legend from '$lib/Legend.svelte';
	import WeatherScreen from '$lib/WeatherScreen.svelte';
	import { states, windStates } from './states';

	const scene = (name: string) => states.find((s) => s.name === name)!.weather;

	// Side-by-side trials: one scene, one custom property overridden per frame.
	// Contrast is noted for light mode (ink number / gray-6 labels / pink line /
	// humidity line); anything under 3 on a line or 4.5 on a label fails.
	const trials: {
		title: string;
		note: string;
		scene: string;
		prop: string;
		options: { label: string; value: string }[];
	}[] = [
		{
			title: 'Cloudy night',
			note: 'Grayer, not darker: clear night is the deepest sky. purple-gray-2 sits at the same lightness as clear night; the mauve gray is clear night mixed halfway to gray-2 (not a kit tint yet).',
			scene: 'Overcast into the night',
			prop: '--band-cloud-night',
			options: [
				{ label: 'purple-gray-1 (now) · 12.16 / 6.50 / 4.23 / 3.79', value: 'var(--purple-gray-1)' },
				{ label: 'purple-gray-2 · 9.79 / 5.23 / 3.41 / 3.05', value: 'var(--purple-gray-2)' },
				{ label: 'mauve gray rgb(220 210 220) · 9.91 / 5.30 / 3.45 / 3.08', value: 'rgb(220 210 220)' }
			]
		},
		{
			title: 'Storm',
			note: 'One colour, day or night. red-0 sits closest to the pink accent.',
			scene: 'Thunderstorm at dusk',
			prop: '--band-storm',
			options: [
				{ label: 'orange-1 (now) · 10.96 / 5.86 / 3.81 / 3.41', value: 'var(--orange-1)' },
				{ label: 'orange-0 · 12.09 / 6.47 / 4.21 / 3.77', value: 'var(--orange-0)' },
				{ label: 'red-0 · 11.58 / 6.19 / 4.03 / 3.61', value: 'var(--red-0)' }
			]
		},
		{
			title: 'Sun line weight',
			note: 'Golden Rod at 1, 2 and 3px.',
			scene: 'Thunderstorm at dusk',
			prop: '--sun-line-width',
			options: [
				{ label: '1px (now)', value: '1px' },
				{ label: '2px', value: '2px' },
				{ label: '3px', value: '3px' }
			]
		},
		{
			title: 'Clear night',
			note: 'The palest barely shows the stars; purple-2 is the deepest that still passes contrast.',
			scene: 'Clear and calm',
			prop: '--band-night',
			options: ['purple-0', 'purple-1', 'purple-2'].map((t) => ({ label: t, value: `var(--${t})` }))
		}
	];
</script>

<svelte:head>
	<title>Preview · wjeather</title>
</svelte:head>

{#snippet frame(weather: (typeof states)[number]['weather'], caption: string, style = '')}
	<figure class="m-0">
		<div class="flex h-[40rem] w-60 max-w-full flex-col border border-border" {style}>
			<WeatherScreen {weather} />
		</div>
		<figcaption class="mt-2 max-w-60 text-sm">{caption}</figcaption>
	</figure>
{/snippet}

<main class="px-4 py-8 tablet:px-8">
	<h1 class="mb-2 text-xl">Preview</h1>
	<p class="mb-8 max-w-[36rem] text-sm text-text-muted">
		Made-up weather, each at phone size (360 × 640). Hue is the sky, in six colours: clear and
		cloudy split by day and night; rain, snow and storm are the same at any hour. The gold rule is
		sunrise or sunset, on the hour the sky turns. Lines run with the wind, closer and darker as it
		strengthens; calm air has none. The dashed green line is humidity: 40% at the left edge, 100%
		at the right. Switch the system to dark mode to see the dark palette. Local only — a 404 in
		production.
	</p>

	<h2 class="mb-4 text-lg">Key</h2>
	<div class="w-[24rem] max-w-full">
		<Legend open />
	</div>

	<h2 class="mt-12 mb-4 text-lg">Scenes</h2>
	<div class="flex flex-wrap gap-8">
		{#each states as state (state.name)}
			{@render frame(state.weather, state.name)}
		{/each}
	</div>

	{#each trials as trial (trial.title)}
		<h2 class="mt-12 mb-2 text-lg">{trial.title}</h2>
		{#if trial.note}
			<p class="mb-8 max-w-[36rem] text-sm text-text-muted">{trial.note}</p>
		{/if}
		<div class="flex flex-wrap gap-8">
			{#each trial.options as option (option.label)}
				{@render frame(scene(trial.scene), option.label, `${trial.prop}: ${option.value}`)}
			{/each}
		</div>
	{/each}

	<h2 class="mt-12 mb-2 text-lg">Wind speed</h2>
	<p class="mb-8 max-w-[36rem] text-sm text-text-muted">
		The same partly cloudy sky and westerly wind, only the speed changing. Under 5 km/h there are
		no lines; from there to 60 km/h the gap between lines narrows from 36px to 6px and the
		lines darken, quickest at the low end.
	</p>
	<div class="flex flex-wrap gap-8">
		{#each windStates as state (state.name)}
			{@render frame(state.weather, state.name)}
		{/each}
	</div>
</main>
