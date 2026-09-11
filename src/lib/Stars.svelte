<script lang="ts">
	import { sky } from '$lib/sky';
	import { HORIZON_SECONDS, type Hour, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();
	const uid = $props.id(); // pattern ids must be unique per screen (the preview shows several)

	// Clear-night hours get stars: a sparse, irregular stipple over the purple.
	// Texture rather than a color, so a clear night still reads as clear.
	const TILE = 90; // px, 15 × 6; large enough that the repeat isn't obvious
	const STARS: [x: number, y: number, r: number][] = [
		[7, 12, 1],
		[31, 4, 0.75],
		[52, 27, 1.25],
		[80, 15, 0.75],
		[18, 44, 0.75],
		[66, 51, 1],
		[40, 63, 0.75],
		[86, 72, 1],
		[11, 80, 1.25],
		[58, 86, 0.75]
	];

	const bands = $derived.by(() => {
		const hours = weather.next12h;
		const start = hours[0]?.time ?? 0;
		const y = (h: Hour) => ((h.time - start) / HORIZON_SECONDS) * 100;
		return hours
			.slice(0, -1)
			.map((h, i) => ({ night: sky(h) === 'night', top: y(h), height: y(hours[i + 1]) - y(h) }))
			.filter((b) => b.night);
	});
</script>

{#if bands.length}
	<svg class="absolute inset-0 h-full w-full" aria-hidden="true">
		<defs>
			<pattern id="{uid}-stars" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
				{#each STARS as [cx, cy, r], i (i)}
					<circle {cx} {cy} {r} class="fill-star" />
				{/each}
			</pattern>
		</defs>
		{#each bands as band (band.top)}
			<rect x="0" y="{band.top}%" width="100%" height="{band.height}%" fill="url(#{uid}-stars)" />
		{/each}
	</svg>
{/if}
