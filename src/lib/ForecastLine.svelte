<script lang="ts">
	import { formatDegrees, HORIZON_SECONDS, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();

	// x is temperature, y is time: now at the top, +12 hours at the bottom.
	// The x scale is fluid: it fits the next 48 hours (not just the 12 shown),
	// never spans less than MIN_SPAN_C, and its edges snap to STEP_C so the
	// scale holds still between refreshes. Worked in °C whatever the display unit.
	const MIN_SPAN_C = 12;
	const STEP_C = 5;
	const PAD_C = 1; // keeps the extremes off the very edge

	const toCelsius = (t: number) => (weather.unit === 'fahrenheit' ? ((t - 32) * 5) / 9 : t);
	const fromCelsius = (c: number) => (weather.unit === 'fahrenheit' ? (c * 9) / 5 + 32 : c);

	const axis = $derived.by(() => {
		let lo = toCelsius(weather.range48h.min) - PAD_C;
		let hi = toCelsius(weather.range48h.max) + PAD_C;
		if (hi - lo < MIN_SPAN_C) {
			const mid = (lo + hi) / 2;
			lo = mid - MIN_SPAN_C / 2;
			hi = mid + MIN_SPAN_C / 2;
		}
		return { min: Math.floor(lo / STEP_C) * STEP_C, max: Math.ceil(hi / STEP_C) * STEP_C };
	});

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

	const path = $derived.by(() => {
		const start = weather.next12h[0]?.time ?? 0;
		return smoothPath(
			weather.next12h.map(({ time, temperature }) => ({
				x: ((toCelsius(temperature) - axis.min) / (axis.max - axis.min)) * 100,
				y: ((time - start) / HORIZON_SECONDS) * 100
			}))
		);
	});

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

	// The line is decorative to a screen reader; this says what it shows.
	const summary = $derived.by(() => {
		const hours = weather.next12h;
		if (hours.length < 2) return '';
		const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: weather.timezone });
		const at = (p: (typeof hours)[number]) => hour.format(new Date(p.time * 1000));
		const high = hours.reduce((a, b) => (b.temperature > a.temperature ? b : a));
		const low = hours.reduce((a, b) => (b.temperature < a.temperature ? b : a));
		return `Next 12 hours: high ${Math.round(high.temperature)}° around ${at(high)}, low ${Math.round(low.temperature)}° around ${at(low)}.`;
	});
</script>

<p class="sr-only">{summary}</p>

<!-- Inset to the same gutters as the footer rule, so the axis edges line up with it. -->
<div class="absolute inset-y-0 right-4 left-4 @tablet:right-8 @tablet:left-8 @desktop:right-12 @desktop:left-12">
	<svg
		class="absolute inset-0 h-full w-full overflow-visible"
		viewBox="0 0 100 100"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path
			d={path}
			fill="none"
			class="stroke-accent"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
			vector-effect="non-scaling-stroke"
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
