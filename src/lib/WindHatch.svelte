<script lang="ts">
	import { HORIZON_SECONDS, type Hour, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();
	const uid = $props.id(); // pattern ids must be unique per screen (the preview shows several)

	// Wind as etched line work, one patch per hour down the time axis.
	//   angle   — the lines run along the wind, north up like a map
	//   spacing — closer as the wind strengthens; calm air has no lines
	// A plain line can't say which way along itself the wind blows — the
	// drift, later, is what would add that.
	const CALM_KMH = 5;
	const GALE_KMH = 60;
	const WIDEST = 36; // px between lines at a light breeze (6 × 6)
	const TIGHTEST = 6; // px at a gale
	const INK = 0.3; // line opacity: present, but quieter than the number and labels

	function spacing(speed: number) {
		if (speed < CALM_KMH) return 0;
		const t = Math.min(1, (speed - CALM_KMH) / (GALE_KMH - CALM_KMH));
		return Math.round(WIDEST - t * (WIDEST - TIGHTEST));
	}

	const bands = $derived.by(() => {
		const hours = weather.next12h;
		const start = hours[0]?.time ?? 0;
		const y = (h: Hour) => ((h.time - start) / HORIZON_SECONDS) * 100;
		return hours.slice(0, -1).map((h, i) => ({
			top: y(h),
			height: y(hours[i + 1]) - y(h),
			spacing: spacing(h.windSpeed),
			angle: h.windDirection % 180 // a line from the north runs the same as one from the south
		}));
	});

	const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
	const summary = $derived.by(() => {
		const now = weather.next12h[0];
		if (!now) return '';
		if (now.windSpeed < CALM_KMH) return 'Calm now.';
		const from = COMPASS[Math.round(now.windDirection / 45) % 8];
		return `Wind from the ${from} at ${Math.round(now.windSpeed)} km/h now.`;
	});
</script>

<p class="sr-only">{summary}</p>
<svg class="absolute inset-0 h-full w-full" aria-hidden="true">
	<defs>
		{#each bands as band, i (i)}
			{#if band.spacing}
				<pattern
					id="{uid}-wind-{i}"
					width={band.spacing}
					height={band.spacing}
					patternUnits="userSpaceOnUse"
					patternTransform="rotate({band.angle})"
				>
					<line
						x1={band.spacing / 2}
						y1="0"
						x2={band.spacing / 2}
						y2={band.spacing}
						class="stroke-text"
						stroke-width="1"
					/>
				</pattern>
			{/if}
		{/each}
	</defs>
	<g opacity={INK}>
		{#each bands as band, i (i)}
			{#if band.spacing}
				<rect x="0" y="{band.top}%" width="100%" height="{band.height}%" fill="url(#{uid}-wind-{i})" />
			{/if}
		{/each}
	</g>
</svg>
