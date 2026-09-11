<script lang="ts">
	import ForecastLine from '$lib/ForecastLine.svelte';
	import SkyBands from '$lib/SkyBands.svelte';
	import Stars from '$lib/Stars.svelte';
	import WindHatch from '$lib/WindHatch.svelte';
	import { describeTemperature, formatDegrees, type Weather } from '$lib/weather';

	let {
		weather,
		placeName,
		onChangeLocation
	}: { weather: Weather; placeName?: string; onChangeLocation?: () => void } = $props();
</script>

<!-- A size container: the screen lays out by its own width, not the window's,
     so the preview page can show it in phone-sized frames on a desktop.
     The whole area is the chart: its top edge is now, its bottom edge +12 hours. -->
<div class="relative @container flex flex-1 flex-col overflow-hidden">
	<h1 class="sr-only">{describeTemperature(weather, placeName)}</h1>
	<SkyBands {weather} />
	<Stars {weather} />
	<WindHatch {weather} />
	<ForecastLine {weather} />
	<p
		class="relative m-0 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] font-display text-display-sm font-bold whitespace-nowrap @tablet:px-8 @tablet:text-display-md @desktop:px-12 @desktop:text-display-lg"
		aria-hidden="true"
	>
		{formatDegrees(weather.temperature)}
	</p>
	<!-- The glyph's right edge lands on the gutter, in line with the time labels. -->
	<button
		type="button"
		class="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-2 grid size-7 cursor-pointer place-items-center text-text-muted active:bg-text active:text-bg @tablet:right-6 @desktop:right-10"
		aria-label="Change location"
		onclick={onChangeLocation}
	>
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<circle cx="9" cy="9" r="5" />
			<path d="M9 1v3M9 14v3M1 9h3M14 9h3" />
		</svg>
	</button>
	<!-- Weather data by Open-Meteo.com (CC BY 4.0) — credited in the README, not on screen. -->
</div>
