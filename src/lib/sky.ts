import type { Hour } from '$lib/weather';

// The background: one band per hour down the time axis, now at the top.
//   hue   — the sky (clear / cloud / rain / snow)
//   edges — cloud cover: hard between clear hours, dissolving as cloud builds
// Tints are the --band-* tokens in layout.css, contrast-checked in both modes.

export type Sky = 'clear' | 'cloud' | 'rain' | 'snow';

// WMO weather codes → four skies.
export function sky(code: number): Sky {
	if (code <= 1) return 'clear';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
	if (code >= 51) return 'rain'; // drizzle, rain, showers, thunderstorms
	return 'cloud'; // partly cloudy, overcast, fog
}

export function bandColor(hour: Hour) {
	return `var(--band-${sky(hour.code)})`;
}

// At full cloud the blend between two hours spans half of each band, so an
// overcast stretch reads as one continuous wash; at zero it's a hard step.
export function skyGradient(hours: Hour[], horizonSeconds: number) {
	if (hours.length < 2) return 'none';
	const start = hours[0].time;
	const y = (h: Hour) => ((h.time - start) / horizonSeconds) * 100;
	const bands = hours.slice(0, -1); // the last hour is the +12h edge, not a band
	const stops = [`${bandColor(bands[0])} 0%`];
	for (let i = 0; i < bands.length - 1; i++) {
		const edge = y(bands[i + 1]);
		const room = Math.min(edge - y(bands[i]), y(hours[i + 2]) - edge) / 2;
		const softness = (bands[i].cloudCover + bands[i + 1].cloudCover) / 200;
		const half = room * softness;
		stops.push(
			`${bandColor(bands[i])} ${(edge - half).toFixed(2)}%`,
			`${bandColor(bands[i + 1])} ${(edge + half).toFixed(2)}%`
		);
	}
	stops.push(`${bandColor(bands[bands.length - 1])} 100%`);
	// oklab: soft edges blend evenly (yellow → blue passes a quiet green-gray).
	// Not oklch — its hue arc turns yellow → purple orange, too near the pink line.
	return `linear-gradient(in oklab to bottom, ${stops.join(', ')})`;
}

// What the bands say, for screen readers: "Cloudy now, rain from 5 AM."
const WORDS: Record<Sky, string> = { clear: 'clear', cloud: 'cloudy', rain: 'rain', snow: 'snow' };

export function skySummary(hours: Hour[], timezone: string) {
	if (hours.length < 2) return '';
	const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: timezone });
	const parts: string[] = [];
	let last: Sky | null = null;
	for (const h of hours.slice(0, -1)) {
		const s = sky(h.code);
		if (s === last) continue;
		parts.push(
			last === null
				? `${WORDS[s][0].toUpperCase()}${WORDS[s].slice(1)} now`
				: `${WORDS[s]} from ${hour.format(new Date(h.time * 1000))}`
		);
		last = s;
	}
	return `${parts.join(', ')}.`;
}
