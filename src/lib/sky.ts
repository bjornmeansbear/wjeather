import type { Hour, SunEvent, Weather } from '$lib/weather';

// The background: one band per hour down the time axis, now at the top.
//   hue   — the sky (clear / cloud / snow, each by day and by night; rain)
//   edges — hard at every hour: an hour is a hard fact, not a fade
// Tints are the --band-* tokens in layout.css, contrast-checked in both modes.

export type Sky = 'clear' | 'night' | 'cloud' | 'cloud-night' | 'rain' | 'snow' | 'snow-night';

// WMO weather codes → the skies; a clear sky after dark is 'night'.
export function sky(hour: Hour): Sky {
	const code = hour.code;
	if (code <= 1) return hour.isDay ? 'clear' : 'night';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return hour.isDay ? 'snow' : 'snow-night';
	if (code >= 51) return 'rain'; // drizzle, rain, showers, thunderstorms
	// partly cloudy, overcast, fog — cooler after dark, like the clear sky
	return hour.isDay ? 'cloud' : 'cloud-night';
}

export function bandColor(hour: Hour) {
	return `var(--band-${sky(hour)})`;
}

// One flat band per hour, hard stops at every boundary — each colour starts and
// ends on its own hour. Nothing blends, so no interpolation space to choose.
export function skyGradient(hours: Hour[], horizonSeconds: number) {
	if (hours.length < 2) return 'none';
	const start = hours[0].time;
	const y = (h: Hour) => ((h.time - start) / horizonSeconds) * 100;
	const bands = hours.slice(0, -1); // the last hour is the +12h edge, not a band
	const stops = bands.flatMap((band, i) => {
		const from = y(band);
		const to = i === bands.length - 1 ? 100 : y(bands[i + 1]);
		return [`${bandColor(band)} ${from.toFixed(2)}%`, `${bandColor(band)} ${to.toFixed(2)}%`];
	});
	return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

// What the bands say, for screen readers: "Cloudy now, rain from 5 AM."
const WORDS: Record<Sky, string> = {
	clear: 'clear',
	night: 'clear night',
	cloud: 'cloudy',
	'cloud-night': 'cloudy',
	rain: 'rain',
	snow: 'snow',
	'snow-night': 'snow'
};

export function skySummary(hours: Hour[], timezone: string) {
	if (hours.length < 2) return '';
	const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: timezone });
	const parts: string[] = [];
	// Compared by word, not by sky: cloud and cloud-night both say "cloudy"
	// (and both snows "snow"),
	// and dusk shouldn't add "cloudy from 7 PM" to a sentence already saying it.
	let last: string | null = null;
	for (const h of hours.slice(0, -1)) {
		const word = WORDS[sky(h)];
		if (word === last) continue;
		parts.push(
			last === null
				? `${word[0].toUpperCase()}${word.slice(1)} now`
				: `${word} from ${hour.format(new Date(h.time * 1000))}`
		);
		last = word;
	}
	return `${parts.join(', ')}.`;
}

// Where a sunrise or sunset is drawn: on the hour break where the sky's colour
// already turns from day to night (or back), not at the exact minute. The sky
// is painted in hours, so the rule joins its grid; the label still gives the
// exact time. Falls back to the minute if no break turns that way.
export function sunRules(weather: Weather): (SunEvent & { at: number })[] {
	const hours = weather.next12h;
	return weather.sun.map((e) => {
		let at = e.time;
		let best = Infinity;
		for (let i = 1; i < hours.length; i++) {
			const turns = e.kind === 'sunrise' ? !hours[i - 1].isDay && hours[i].isDay : hours[i - 1].isDay && !hours[i].isDay;
			const gap = Math.abs(hours[i].time - e.time);
			if (turns && gap < best) {
				best = gap;
				at = hours[i].time;
			}
		}
		return { ...e, at };
	});
}
