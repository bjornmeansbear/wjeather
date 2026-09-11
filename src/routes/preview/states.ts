import type { Hour, Weather } from '$lib/weather';

// Made-up weather for the preview page. Each series is one value per hour,
// now → +12h (13 values); a shorter array holds its last value.
type Series = {
	temps: number[];
	dew?: number[]; // defaults to 7° below the temperature
	cloud: number[];
	precip?: number[];
	pressure?: number[];
	codes: number[];
	wind?: number[]; // km/h
	dir?: number[]; // degrees the wind comes from
};

const START = Date.UTC(2026, 8, 10, 21) / 1000; // 9 PM, labelled in UTC

const ramp = (from: number, to: number, n = 13) =>
	Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

function weather({
	temps,
	dew,
	cloud,
	precip = [0],
	pressure = [1013],
	codes,
	wind = [0],
	dir = [270]
}: Series): Weather {
	const at = (a: number[], i: number) => a[Math.min(i, a.length - 1)];
	const next12h: Hour[] = Array.from({ length: 13 }, (_, i) => ({
		time: START + i * 3600,
		temperature: at(temps, i),
		cloudCover: at(cloud, i),
		precipitation: at(precip, i),
		pressure: at(pressure, i),
		code: at(codes, i),
		windSpeed: at(wind, i),
		windDirection: at(dir, i),
		dewPoint: dew ? at(dew, i) : at(temps, i) - 7
	}));
	const all = next12h.map((h) => h.temperature);
	return {
		temperature: next12h[0].temperature,
		unit: 'celsius',
		code: next12h[0].code,
		isDay: false,
		high: Math.max(...all),
		low: Math.min(...all),
		timezone: 'UTC',
		utcOffsetSeconds: 0,
		next12h,
		range48h: {
			min: Math.min(...all),
			max: Math.max(...all),
			dewPointMin: Math.min(...next12h.map((h) => h.dewPoint))
		}
	};
}

export const states: { name: string; weather: Weather }[] = [
	{
		name: 'Clear and calm',
		weather: weather({
			temps: [24, 22, 21, 20, 19, 18, 17, 17, 16, 18, 21, 24, 26],
			dew: [12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13],
			cloud: [0],
			codes: [0],
			wind: [2]
		})
	},
	{
		name: 'Overcast, a light northerly',
		weather: weather({ temps: ramp(18, 15), dew: ramp(14, 13), cloud: [100], codes: [3], wind: [9], dir: [0] })
	},
	{
		name: 'Clearing after rain, wind veering',
		weather: weather({
			temps: ramp(14, 19),
			dew: ramp(13, 8),
			cloud: ramp(100, 0),
			precip: [2, 1, 0.3, 0],
			codes: [63, 61, 61, 3, 3, 3, 2, 2, 1, 1, 0],
			wind: ramp(38, 10),
			dir: ramp(200, 300)
		})
	},
	{
		name: 'Clouding over into rain, wind rising',
		weather: weather({
			temps: ramp(22, 16),
			dew: ramp(12, 15.5),
			cloud: ramp(10, 100),
			precip: [0, 0, 0, 0, 0, 0, 0, 0.2, 1, 2, 3, 3, 3],
			codes: [0, 1, 1, 2, 2, 3, 3, 61, 63, 63, 65, 65, 63],
			wind: ramp(6, 45),
			dir: ramp(120, 170)
		})
	},
	{
		name: 'Snow on a northeasterly',
		weather: weather({
			temps: ramp(-2, -7),
			dew: ramp(-4, -9),
			cloud: [100, 100, 95, 100],
			codes: [71, 73, 73, 75, 75, 73, 71],
			wind: [25, 28, 32, 30, 26],
			dir: [40]
		})
	},
	{
		name: 'Sun and showers, gusty westerly',
		weather: weather({
			temps: [19, 18, 20, 17, 16, 19, 21, 18, 17, 20, 22, 21, 20],
			cloud: [20, 30, 60, 90, 90, 50, 20, 70, 95, 60, 25, 15, 10],
			codes: [1, 2, 2, 80, 80, 2, 1, 3, 81, 2, 1, 1, 1],
			wind: [18, 22, 30, 42, 40, 24, 20, 34, 48, 28, 20, 16, 14],
			dir: [265, 270, 275, 285, 290, 280, 270, 280, 295, 285, 275, 270, 265]
		})
	},
	{
		name: 'Fog forming on a still night',
		weather: weather({
			temps: [13, 12, 11.5, 11, 10.5, 10, 9.5, 9, 9, 9, 9.5, 11, 13],
			dew: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9.5, 10],
			cloud: [0, 5, 10, 20, 40, 100, 100, 100, 100, 100, 80, 40, 20],
			codes: [0, 0, 1, 1, 2, 45, 45, 45, 45, 45, 3, 2, 1],
			wind: [3]
		})
	},
	{
		name: 'Dry desert heat',
		weather: weather({
			temps: [40, 38, 36, 34, 32, 30, 29, 28, 28, 30, 33, 36, 39],
			dew: [2, 2, 3, 3, 4, 4, 4, 5, 5, 4, 3, 3, 2],
			cloud: [0],
			codes: [0],
			wind: [12],
			dir: [200]
		})
	},
	{
		name: 'Muggy, storms by morning',
		weather: weather({
			temps: [29, 28, 28, 27, 27, 26, 26, 25, 24, 24, 25, 26, 27],
			dew: [23, 23, 23, 23, 23, 23, 23, 23, 23, 22, 22, 22, 22],
			cloud: ramp(30, 100),
			precip: [0, 0, 0, 0, 0, 0, 0, 8, 12, 4, 1, 0, 0],
			codes: [1, 2, 2, 2, 3, 3, 3, 95, 95, 63, 61, 3, 3],
			wind: [8, 8, 10, 12, 14, 20, 28, 35, 30, 20, 15, 12, 10],
			dir: [180, 180, 190, 200, 210, 230, 250, 270, 280, 290, 290, 290, 290]
		})
	}
];
