<script lang="ts">
	import { HORIZON_SECONDS, type Hour, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();
	const uid = $props.id(); // pattern ids must be unique per screen (the preview shows several)

	// Wind as etched line work, one patch per hour down the time axis.
	//   angle   — the lines run along the wind, north up like a map
	//   spacing — closer as the wind strengthens; calm air has no lines
	// When the app opens or new weather arrives, each hour's lines drift the way
	// that hour's wind blows, then settle still. The drift is what tells a
	// north wind from a south one. It lasts under 5 s, so WCAG 2.2.2 needs no
	// pause control, and it's skipped entirely under prefers-reduced-motion.
	const CALM_KMH = 5;
	const GALE_KMH = 60;
	const WIDEST = 36; // px between lines at a light breeze (6 × 6)
	const TIGHTEST = 6; // px at a gale
	const INK = 0.3; // line opacity: present, but quieter than the number and labels

	// Long dashes rather than solid lines: a solid line sliding along itself
	// looks identical, so the drift would be invisible. On the 6px grid.
	const DASH = 18;
	const PERIOD = 24; // dash + gap

	const DRIFT_MS = 4000;
	const PX_PER_S_PER_KMH = 1.5; // a 10 km/h breeze leaves at 15 px/s (30 px in all); a gale at 90
	const MIN_TRAVEL = 12; // px: even the lightest wind that draws lines visibly moves

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
			speed: h.windSpeed,
			// The pattern's lines run down its y axis; rotated by the direction
			// mod 180, +y points where the wind goes for directions under 180°,
			// and back where it came from otherwise — so flip the drift.
			angle: h.windDirection % 180,
			sign: h.windDirection % 360 < 180 ? 1 : -1
		}));
	});

	let progress = $state(1); // 0 → 1 across the drift; 1 is settled

	$effect(() => {
		void weather.next12h; // drift again whenever new weather arrives
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		progress = 0;
		const start = performance.now();
		let frame = requestAnimationFrame(function step(now) {
			progress = Math.min(1, (now - start) / DRIFT_MS);
			if (progress < 1) frame = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(frame);
	});

	// Quadratic ease-out: leaves at the wind's speed, slows to rest at 0, so the
	// settled lines sit exactly where they would with no motion at all.
	function offset(speed: number, sign: number) {
		const travel = Math.max(MIN_TRAVEL, (speed * PX_PER_S_PER_KMH * DRIFT_MS) / 1000 / 2);
		return sign * travel * ((1 - (1 - progress) ** 2) - 1);
	}

	// Two staggered dashes per tile, so neighbouring lines don't line up in rows.
	const dashes = (s: number) =>
		`M${s / 2} 0V${DASH} M${s * 1.5} ${PERIOD / 2}V${PERIOD} M${s * 1.5} 0V${PERIOD / 2 + DASH - PERIOD}`;

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
					width={band.spacing * 2}
					height={PERIOD}
					patternUnits="userSpaceOnUse"
					patternTransform="rotate({band.angle}) translate(0 {offset(band.speed, band.sign)})"
				>
					<path d={dashes(band.spacing)} class="stroke-text" stroke-width="1" fill="none" />
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
