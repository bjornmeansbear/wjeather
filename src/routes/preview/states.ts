import type { Hour, Weather } from '$lib/weather';

// Made-up weather for the preview page. Each series is one value per hour,
// now → +12h (13 values); a shorter array holds its last value.
type Series = {
	startHour?: number; // the hour "now" falls on, labelled in UTC; default 9 PM
	temps: number[];
	humidity?: number[]; // %
	codes: number[];
	wind?: number[]; // km/h
	dir?: number[]; // degrees the wind comes from
};

// Made-up sun: up from 6 AM to 7 PM.
const isDaytime = (hourOfDay: number) => hourOfDay % 24 >= 6 && hourOfDay % 24 < 19;

const ramp = (from: number, to: number, n = 13) =>
	Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

function weather({
	startHour = 21,
	temps,
	humidity = [60],
	codes,
	wind = [0],
	dir = [270]
}: Series): Weather {
	const at = (a: number[], i: number) => a[Math.min(i, a.length - 1)];
	const start = Date.UTC(2026, 8, 10, startHour) / 1000;
	const next12h: Hour[] = Array.from({ length: 13 }, (_, i) => ({
		time: start + i * 3600,
		isDay: isDaytime(startHour + i),
		temperature: at(temps, i),
		code: at(codes, i),
		windSpeed: at(wind, i),
		windDirection: at(dir, i),
		humidity: at(humidity, i)
	}));
	return {
		temperature: next12h[0].temperature,
		unit: 'celsius',
		timezone: 'UTC',
		utcOffsetSeconds: 0,
		next12h
	};
}

export const states: { name: string; weather: Weather }[] = [
	{
		name: 'Clear and calm',
		weather: weather({
			temps: [24, 22, 21, 20, 19, 18, 17, 17, 16, 18, 21, 24, 26],
			humidity: [45, 52, 56, 60, 64, 68, 72, 72, 76, 68, 58, 50, 45],
			codes: [0],
			wind: [2]
		})
	},
	{
		name: 'Overcast, a light northerly',
		weather: weather({
			temps: ramp(18, 15),
			humidity: ramp(78, 86),
			codes: [3],
			wind: [9],
			dir: [0]
		})
	},
	{
		name: 'Clearing after rain, wind veering',
		weather: weather({
			temps: ramp(14, 19),
			humidity: ramp(96, 62),
			codes: [63, 61, 61, 3, 3, 3, 2, 2, 1, 1, 0],
			wind: ramp(38, 10),
			dir: ramp(200, 300)
		})
	},
	{
		name: 'Clouding over into rain, wind rising',
		weather: weather({
			temps: ramp(22, 16),
			humidity: ramp(52, 97),
			codes: [0, 1, 1, 2, 2, 3, 3, 61, 63, 63, 65, 65, 63],
			wind: ramp(6, 45),
			dir: ramp(120, 170)
		})
	},
	{
		name: 'Snow on a northeasterly',
		weather: weather({
			temps: ramp(-2, -7),
			humidity: [88, 90, 92, 92, 93],
			codes: [71, 73, 73, 75, 75, 73, 71],
			wind: [25, 28, 32, 30, 26],
			dir: [40]
		})
	},
	{
		name: 'Sun and showers, gusty westerly',
		weather: weather({
			temps: [19, 18, 20, 17, 16, 19, 21, 18, 17, 20, 22, 21, 20],
			humidity: [60, 62, 70, 88, 90, 72, 58, 80, 92, 74, 60, 55, 52],
			codes: [1, 2, 2, 80, 80, 2, 1, 3, 81, 2, 1, 1, 1],
			wind: [18, 22, 30, 42, 40, 24, 20, 34, 48, 28, 20, 16, 14],
			dir: [265, 270, 275, 285, 290, 280, 270, 280, 295, 285, 275, 270, 265]
		})
	},
	{
		name: 'Fog forming on a still night',
		weather: weather({
			temps: [13, 12, 11.5, 11, 10.5, 10, 9.5, 9, 9, 9, 9.5, 11, 13],
			humidity: [76, 80, 83, 86, 89, 93, 97, 100, 100, 100, 96, 86, 75],
			codes: [0, 0, 1, 1, 2, 45, 45, 45, 45, 45, 3, 2, 1],
			wind: [3]
		})
	},
	{
		name: 'Desert sunset into a clear night',
		weather: weather({
			startHour: 15,
			temps: [40, 40, 39, 37, 35, 33, 31, 30, 29, 28, 27, 26, 25],
			humidity: [8, 8, 9, 10, 12, 14, 16, 18, 19, 20, 21, 22, 22],
			codes: [0],
			wind: [12],
			dir: [200]
		})
	},
	{
		name: 'Muggy, storms by morning',
		weather: weather({
			temps: [29, 28, 28, 27, 27, 26, 26, 25, 24, 24, 25, 26, 27],
			humidity: [70, 72, 72, 76, 76, 80, 80, 84, 95, 97, 94, 88, 82],
			codes: [1, 2, 2, 2, 3, 3, 3, 95, 95, 63, 61, 3, 3],
			wind: [8, 8, 10, 12, 14, 20, 28, 35, 30, 20, 15, 12, 10],
			dir: [180, 180, 190, 200, 210, 230, 250, 270, 280, 290, 290, 290, 290]
		})
	}
];
