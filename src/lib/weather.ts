// Open-Meteo: free, no key. Attribution required (CC BY 4.0) — see the page footer.
// https://open-meteo.com/en/docs

export type Place = { latitude: number; longitude: number; name?: string };
export type Unit = 'fahrenheit' | 'celsius';

export type Hour = {
	time: number; // unix seconds
	temperature: number;
	cloudCover: number; // %
	precipitation: number; // mm over the preceding hour (the current reading: preceding 15 min)
	pressure: number; // hPa, sea level
	code: number; // WMO weather code
	windSpeed: number; // km/h at 10 m
	windDirection: number; // degrees the wind comes from (0 = north)
	humidity: number; // relative humidity, %
	isDay: boolean; // sun above the horizon at this hour
};

export type Weather = {
	temperature: number;
	unit: Unit;
	code: number; // WMO weather code
	isDay: boolean;
	high: number;
	low: number;
	timezone: string; // IANA zone of the place, for formatting its times
	utcOffsetSeconds: number; // the place's offset from UTC, for finding its clock hours
	// Now → now + 12 hours. The first point is the current reading, the last is
	// interpolated to land exactly on +12 hours. `time` is unix seconds.
	next12h: Hour[];
};

type ForecastResponse = {
	timezone: string;
	utc_offset_seconds: number;
	current: {
		time: number;
		temperature_2m: number;
		weather_code: number;
		is_day: 0 | 1;
		cloud_cover: number;
		precipitation: number;
		pressure_msl: number;
		wind_speed_10m: number;
		wind_direction_10m: number;
		relative_humidity_2m: number;
	};
	hourly: {
		time: number[];
		temperature_2m: number[];
		weather_code: number[];
		cloud_cover: number[];
		precipitation: number[];
		pressure_msl: number[];
		wind_speed_10m: number[];
		wind_direction_10m: number[];
		relative_humidity_2m: number[];
		is_day: (0 | 1)[];
	};
	daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
};

export const HORIZON_SECONDS = 12 * 60 * 60;

function next12Hours({ current, hourly }: ForecastResponse): Hour[] {
	const start = current.time;
	const end = start + HORIZON_SECONDS;
	const hours: Hour[] = [
		{
			time: start,
			temperature: current.temperature_2m,
			cloudCover: current.cloud_cover,
			precipitation: current.precipitation,
			pressure: current.pressure_msl,
			code: current.weather_code,
			windSpeed: current.wind_speed_10m,
			windDirection: current.wind_direction_10m,
			humidity: current.relative_humidity_2m,
			isDay: current.is_day === 1
		}
	];
	for (let i = 0; i < hourly.time.length; i++) {
		const hour: Hour = {
			time: hourly.time[i],
			temperature: hourly.temperature_2m[i],
			cloudCover: hourly.cloud_cover[i],
			precipitation: hourly.precipitation[i],
			pressure: hourly.pressure_msl[i],
			code: hourly.weather_code[i],
			windSpeed: hourly.wind_speed_10m[i],
			windDirection: hourly.wind_direction_10m[i],
			humidity: hourly.relative_humidity_2m[i],
			isDay: hourly.is_day[i] === 1
		};
		if (hour.time <= start) continue;
		if (hour.time >= end) {
			const prev = hours[hours.length - 1];
			const f = (end - prev.time) / (hour.time - prev.time);
			const lerp = (a: number, b: number) => a + f * (b - a);
			hours.push({
				time: end,
				temperature: lerp(prev.temperature, hour.temperature),
				cloudCover: lerp(prev.cloudCover, hour.cloudCover),
				precipitation: lerp(prev.precipitation, hour.precipitation),
				pressure: lerp(prev.pressure, hour.pressure),
				code: prev.code,
				windSpeed: lerp(prev.windSpeed, hour.windSpeed),
				windDirection: prev.windDirection, // compass degrees wrap; don't average them
				humidity: lerp(prev.humidity, hour.humidity),
				isDay: prev.isDay
			});
			break;
		}
		hours.push(hour);
	}
	return hours;
}

export const DEFAULT_UNIT: Unit = 'celsius';

// A true minus sign, not a hyphen.
export function formatDegrees(t: number) {
	const r = Math.round(t);
	return `${r < 0 ? '−' : ''}${Math.abs(r)}°`;
}

export function describeTemperature(w: Weather, placeName?: string) {
	const unit = w.unit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius';
	return `${Math.round(w.temperature)} degrees ${unit}${placeName ? ` in ${placeName}` : ''}`;
}

export async function getWeather(place: Place, unit: Unit): Promise<Weather> {
	const params = new URLSearchParams({
		latitude: String(place.latitude),
		longitude: String(place.longitude),
		current:
			'temperature_2m,weather_code,is_day,cloud_cover,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
		hourly:
			'temperature_2m,weather_code,is_day,cloud_cover,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
		daily: 'temperature_2m_max,temperature_2m_min',
		timezone: 'auto',
		timeformat: 'unixtime',
		forecast_days: '1',
		forecast_hours: '14', // starts at the current hour; covers now + 12h
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
		utcOffsetSeconds: data.utc_offset_seconds,
		next12h: next12Hours(data)
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
