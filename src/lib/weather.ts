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
};

type ForecastResponse = {
	current: { temperature_2m: number; weather_code: number; is_day: 0 | 1 };
	daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
};

const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

export function preferredUnit(): Unit {
	try {
		const region = new Intl.Locale(navigator.language).maximize().region;
		return region && FAHRENHEIT_REGIONS.has(region) ? 'fahrenheit' : 'celsius';
	} catch {
		return 'celsius';
	}
}

export async function getWeather(place: Place, unit: Unit): Promise<Weather> {
	const params = new URLSearchParams({
		latitude: String(place.latitude),
		longitude: String(place.longitude),
		current: 'temperature_2m,weather_code,is_day',
		daily: 'temperature_2m_max,temperature_2m_min',
		timezone: 'auto',
		forecast_days: '1',
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
		low: data.daily.temperature_2m_min[0]
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
