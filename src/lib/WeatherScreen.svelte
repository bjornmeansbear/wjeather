<script lang="ts">
	import ForecastLine from '$lib/ForecastLine.svelte';
	import SkyBands from '$lib/SkyBands.svelte';
	import WindHatch from '$lib/WindHatch.svelte';
	import { describeTemperature, formatDegrees, type Weather } from '$lib/weather';

	let {
		weather,
		placeName,
		onChangeLocation
	}: { weather: Weather; placeName?: string; onChangeLocation?: () => void } = $props();
</script>

<!-- A size container: the screen lays out by its own width, not the window's,
     so the preview page can show it in phone-sized frames on a desktop. -->
<div class="@container flex flex-1 flex-col">
	<h1 class="sr-only">{describeTemperature(weather, placeName)}</h1>
	<!-- Sky, line and number share this area: its top edge is now, the footer rule is +12 hours. -->
	<div class="relative flex-1">
		<SkyBands {weather} />
		<WindHatch {weather} />
		<ForecastLine {weather} />
		<p
			class="relative m-0 px-4 pt-4 font-display text-display-sm font-bold whitespace-nowrap @tablet:px-8 @tablet:text-display-md @desktop:px-12 @desktop:text-display-lg"
			aria-hidden="true"
		>
			{formatDegrees(weather.temperature)}
		</p>
	</div>
	<footer
		class="mx-4 flex flex-wrap items-center justify-between gap-x-4 border-t border-border py-2 text-2xs text-text-muted @tablet:mx-8 @desktop:mx-12"
	>
		<button
			type="button"
			class="inline-flex min-h-4 cursor-pointer items-center underline underline-offset-4"
			onclick={onChangeLocation}
		>
			Change location
		</button>
		<!-- Weather data by Open-Meteo.com (CC BY 4.0) — credited in the README, not on screen. -->
	</footer>
</div>
