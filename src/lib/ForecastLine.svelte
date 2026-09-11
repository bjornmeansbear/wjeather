<script lang="ts">
	import { formatDegrees, HORIZON_SECONDS, type Hour, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();

	// x is temperature, y is time: now at the top, +12 hours at the bottom.
	// The x scale fits the 12 hours on screen, never spans less than MIN_SPAN_C
	// (so a flat night doesn't fill the screen edge to edge), and its edges snap
	// to whole degrees. Worked in °C whatever the display unit.
	const MIN_SPAN_C = 8;
	const STEP_C = 1;
	const PAD_C = 1; // keeps the extremes off the very edge

	// Humidity rides its own fixed scale across the same width: 40% at the left
	// edge, 100% at the right, drier air resting on the edge. It shares the
	// space, not the axis — where it crosses the temperature line means nothing.
	const HUMIDITY_MIN = 40;
	const HUMIDITY_MAX = 100;

	const toCelsius = (t: number) => (weather.unit === 'fahrenheit' ? ((t - 32) * 5) / 9 : t);
	const fromCelsius = (c: number) => (weather.unit === 'fahrenheit' ? (c * 9) / 5 + 32 : c);
	const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

	const axis = $derived.by(() => {
		const temps = weather.next12h.map((h) => toCelsius(h.temperature));
		let lo = Math.min(...temps) - PAD_C;
		let hi = Math.max(...temps) + PAD_C;
		if (hi - lo < MIN_SPAN_C) {
			const mid = (lo + hi) / 2;
			lo = mid - MIN_SPAN_C / 2;
			hi = mid + MIN_SPAN_C / 2;
		}
		return { min: Math.floor(lo / STEP_C) * STEP_C, max: Math.ceil(hi / STEP_C) * STEP_C };
	});

	// Drawn in pixels rather than a stretched viewBox, so the dashes stay even.
	let width = $state(0);
	let height = $state(0);

	// Monotone cubic (Fritsch–Carlson) through the readings, with time as the
	// independent axis: smooth, but it never bulges past a real reading, so the
	// curve can't invent a high or low the forecast doesn't have.
	function smoothPath(pts: { x: number; y: number }[]) {
		const n = pts.length;
		if (n < 2) return '';
		const dy: number[] = [];
		const slope: number[] = [];
		for (let i = 0; i < n - 1; i++) {
			dy[i] = pts[i + 1].y - pts[i].y;
			slope[i] = (pts[i + 1].x - pts[i].x) / dy[i];
		}
		const m: number[] = [slope[0]];
		for (let i = 1; i < n - 1; i++) {
			m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
		}
		m[n - 1] = slope[n - 2];
		for (let i = 0; i < n - 1; i++) {
			if (slope[i] === 0) {
				m[i] = m[i + 1] = 0;
				continue;
			}
			const a = m[i] / slope[i];
			const b = m[i + 1] / slope[i];
			const h = a * a + b * b;
			if (h > 9) {
				const t = 3 / Math.sqrt(h);
				m[i] = t * a * slope[i];
				m[i + 1] = t * b * slope[i];
			}
		}
		let d = `M${pts[0].x},${pts[0].y}`;
		for (let i = 0; i < n - 1; i++) {
			const h = dy[i] / 3;
			d += ` C${pts[i].x + m[i] * h},${pts[i].y + h} ${pts[i + 1].x - m[i + 1] * h},${pts[i + 1].y - h} ${pts[i + 1].x},${pts[i + 1].y}`;
		}
		return d;
	}

	// `fraction` places an hour across the width: 0 is the left edge, 1 the right.
	function linePath(fraction: (h: Hour) => number) {
		if (!width || !height) return '';
		const start = weather.next12h[0]?.time ?? 0;
		return smoothPath(
			weather.next12h.map((h) => ({
				x: fraction(h) * width,
				y: ((h.time - start) / HORIZON_SECONDS) * height
			}))
		);
	}

	const temperaturePath = $derived(
		linePath((h) => (toCelsius(h.temperature) - axis.min) / (axis.max - axis.min))
	);
	const humidityPath = $derived(
		linePath((h) => clamp01((h.humidity - HUMIDITY_MIN) / (HUMIDITY_MAX - HUMIDITY_MIN)))
	);

	// Time ticks: every TICK_HOURS on the place's own clock (12 AM, 3 AM, …),
	// skipping any that would crowd the location button at the top or the
	// temperature labels at the bottom.
	const TICK_HOURS = 3;
	const ticks = $derived.by(() => {
		const start = weather.next12h[0]?.time ?? 0;
		const step = TICK_HOURS * 60 * 60;
		const offset = weather.utcOffsetSeconds;
		const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: weather.timezone });
		const out: { y: number; text: string }[] = [];
		for (let t = Math.ceil((start + offset) / step) * step - offset; t < start + HORIZON_SECONDS; t += step) {
			const y = ((t - start) / HORIZON_SECONDS) * 100;
			if (y >= 11 && y <= 92) out.push({ y, text: hour.format(new Date(t * 1000)) });
		}
		return out;
	});

	const label = (c: number) => formatDegrees(fromCelsius(c));

	// The lines are decorative to a screen reader; this says what they show.
	const summary = $derived.by(() => {
		const hours = weather.next12h;
		if (hours.length < 2) return '';
		const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: weather.timezone });
		const at = (p: Hour) => hour.format(new Date(p.time * 1000));
		const high = hours.reduce((a, b) => (b.temperature > a.temperature ? b : a));
		const low = hours.reduce((a, b) => (b.temperature < a.temperature ? b : a));
		const humid = hours.reduce((a, b) => (b.humidity > a.humidity ? b : a));
		return `Next 12 hours: high ${Math.round(high.temperature)}° around ${at(high)}, low ${Math.round(low.temperature)}° around ${at(low)}. Humidity ${Math.round(hours[0].humidity)}% now, highest ${Math.round(humid.humidity)}% around ${at(humid)}.`;
	});
</script>

<p class="sr-only">{summary}</p>

<!-- Inset to the page gutters, so the axis edges line up with the labels. -->
<div
	bind:clientWidth={width}
	bind:clientHeight={height}
	class="absolute inset-y-0 right-4 left-4 @tablet:right-8 @tablet:left-8 @desktop:right-12 @desktop:left-12"
>
	<svg class="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
		<!-- Humidity under temperature, so where they cross the pink stays whole. -->
		<path d={humidityPath} fill="none" class="stroke-humidity" stroke-width="2" stroke-dasharray="6 6" />
		<path
			d={temperaturePath}
			fill="none"
			class="stroke-accent"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
	</svg>
	<div class="text-2xs text-text-muted" aria-hidden="true">
		{#each ticks as tick (tick.y)}
			<span class="absolute right-0 -translate-y-1/2" style:top="{tick.y}%">{tick.text}</span>
		{/each}
	</div>
	<div
		class="absolute inset-x-0 bottom-0 flex justify-between pb-[max(0.375rem,env(safe-area-inset-bottom))] text-2xs text-text-muted"
		aria-hidden="true"
	>
		<span>{label(axis.min)}</span>
		<span>{label(axis.max)}</span>
	</div>
</div>
