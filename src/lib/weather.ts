// Open-Meteo: free, no key. Attribution required (CC BY 4.0) — see the page footer.
// https://open-meteo.com/en/docs

export type Place = { latitude: number; longitude: number; name?: string };
export type Unit = 'fahrenheit' | 'celsius';

// Only `temperature` is shown today. The rest is fetched so a background
// visual can be built from it without touching the data layer.
export type Weather = {
	temperature: number;
	unit: Unit;
	code: number; // WMO weather code
	isDay: boolean;
	high: number;
	low: number;
	timezone: string; // IANA zone of the place, for formatting its times
	// Now → now + 12 hours. The first point is the current reading, the last is
	// interpolated to land exactly on +12 hours. `time` is unix seconds.
	next12h: { time: number; temperature: number }[];
	// Lowest and highest over the next 48 hours — the context the 12-hour
	// line is scaled against, so a calm night doesn't fill the screen.
	range48h: { min: number; max: number };
};

type ForecastResponse = {
	timezone: string;
	current: { time: number; temperature_2m: number; weather_code: number; is_day: 0 | 1 };
	hourly: { time: number[]; temperature_2m: number[] };
	daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
};

export const HORIZON_SECONDS = 12 * 60 * 60;

function next12Hours({ current, hourly }: ForecastResponse) {
	const start = current.time;
	const end = start + HORIZON_SECONDS;
	const points = [{ time: start, temperature: current.temperature_2m }];
	for (let i = 0; i < hourly.time.length; i++) {
		const time = hourly.time[i];
		const temperature = hourly.temperature_2m[i];
		if (time <= start) continue;
		if (time >= end) {
			const prev = points[points.length - 1];
			const f = (end - prev.time) / (time - prev.time);
			points.push({ time: end, temperature: prev.temperature + f * (temperature - prev.temperature) });
			break;
		}
		points.push({ time, temperature });
	}
	return points;
}

export const DEFAULT_UNIT: Unit = 'celsius';

export async function getWeather(place: Place, unit: Unit): Promise<Weather> {
	const params = new URLSearchParams({
		latitude: String(place.latitude),
		longitude: String(place.longitude),
		current: 'temperature_2m,weather_code,is_day',
		hourly: 'temperature_2m',
		daily: 'temperature_2m_max,temperature_2m_min',
		timezone: 'auto',
		timeformat: 'unixtime',
		forecast_days: '1',
		forecast_hours: '49', // starts at the current hour; covers now + 48h
		temperature_unit: unit
	});
	const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
	if (!res.ok) throw new Error('The weather service didn’t answer. Try again in a minute.');
	const data = (await res.json()) as ForecastResponse;
	return {
		temperature: data.current.temperature_2m,
		unit,
		code: data.current.weather_code,
		isDay: data.current.is_day === 1,
		high: data.daily.temperature_2m_max[0],
		low: data.daily.temperature_2m_min[0],
		timezone: data.timezone,
		next12h: next12Hours(data),
		range48h: {
			min: Math.min(data.current.temperature_2m, ...data.hourly.temperature_2m),
			max: Math.max(data.current.temperature_2m, ...data.hourly.temperature_2m)
		}
	};
}

type GeocodeResult = {
	name: string;
	latitude: number;
	longitude: number;
	admin1?: string;
	country?: string;
	country_code?: string;
};

// Open-Meteo's geocoder matches place names only, so "Portland, Maine" is
// split: search "Portland", then prefer a result whose region or country
// starts with "Maine".
export async function findCity(query: string): Promise<Place> {
	const [name, ...rest] = query.split(',').map((part) => part.trim());
	const qualifier = rest.join(' ').toLowerCase();
	const params = new URLSearchParams({ name, count: '10', language: 'en', format: 'json' });
	const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
	if (!res.ok) throw new Error('The city search didn’t answer. Try again in a minute.');
	const { results = [] } = (await res.json()) as { results?: GeocodeResult[] };
	if (!results.length) throw new Error(`Couldn’t find “${query}”. Try another spelling.`);
	const match =
		(qualifier &&
			results.find((r) =>
				[r.admin1, r.country, r.country_code].some((v) => v?.toLowerCase().startsWith(qualifier))
			)) ||
		results[0];
	return {
		latitude: match.latitude,
		longitude: match.longitude,
		name: [match.name, match.admin1 ?? match.country].filter(Boolean).join(', ')
	};
}

export function currentPosition(): Promise<Place> {
	return new Promise((resolve, reject) => {
		if (!('geolocation' in navigator)) {
			reject(new Error('This browser can’t share a location. Type a city instead.'));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
			(err) =>
				reject(
					new Error(
						err.code === err.PERMISSION_DENIED
							? 'Location is turned off for this site. Type a city instead.'
							: 'Couldn’t get your location. Type a city instead.'
					)
				),
			{ maximumAge: 10 * 60 * 1000, timeout: 10_000 }
		);
	});
}

// True only if the visitor already said yes, so we never prompt on page load.
export async function locationAllowed(): Promise<boolean> {
	try {
		const status = await navigator.permissions.query({ name: 'geolocation' });
		return status.state === 'granted';
	} catch {
		return false;
	}
}
