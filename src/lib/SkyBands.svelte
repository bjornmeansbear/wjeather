<script lang="ts">
	import { skyGradient, skySummary } from '$lib/sky';
	import { HORIZON_SECONDS, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();

	const gradient = $derived(skyGradient(weather.next12h, HORIZON_SECONDS));
	const summary = $derived(skySummary(weather.next12h, weather.timezone));
</script>

<p class="sr-only">{summary}</p>
<div class="absolute inset-0" style:background-image={gradient} aria-hidden="true"></div>
