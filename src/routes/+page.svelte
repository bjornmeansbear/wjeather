<script lang="ts">
	import { onMount } from 'svelte';
	import WeatherScreen from '$lib/WeatherScreen.svelte';
	import {
		currentPosition,
		describeTemperature,
		findCity,
		formatDegrees,
		getWeather,
		locationAllowed,
		DEFAULT_UNIT,
		type Place,
		type Weather
	} from '$lib/weather';

	type Source = 'location' | 'city';
	// Coordinates are kept for both sources, so reopening never lands on the
	// location screen just because iOS forgot the permission.
	type Saved = { source: Source; place?: Place };
	const STORAGE_KEY = 'wjeather:place';

	// Open-Meteo's current conditions update every 15 minutes; fetching more
	// often gains nothing. Refreshes happen only when the app comes back into
	// view (opening it, or switching to it) with data older than this.
	const STALE_MS = 15 * 60 * 1000;

	let status = $state<'starting' | 'ask' | 'loading' | 'ready'>('starting');
	let weather = $state<Weather | null>(null);
	let place = $state<Place | null>(null);
	let source = $state<Source>('city');
	let fetchedAt = 0;
	let error = $state('');
	let city = $state('');

	const display = $derived(weather ? formatDegrees(weather.temperature) : '');
	const spoken = $derived(weather ? describeTemperature(weather, place?.name) : '');

	function save(saved: Saved | null) {
		try {
			if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
			else localStorage.removeItem(STORAGE_KEY);
		} catch {}
	}

	function load(): Saved | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	async function show(getPlace: () => Promise<Place>, from: Source) {
		status = 'loading';
		error = '';
		try {
			const p = await getPlace();
			weather = await getWeather(p, DEFAULT_UNIT);
			fetchedAt = Date.now();
			place = p;
			source = from;
			save({ source: from, place: p });
			status = 'ready';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong. Try again.';
			status = 'ask';
		}
	}

	// Quietly re-fetch for the same place: no loading screen, and a failure
	// leaves what's on screen. Follows you only if location is already allowed.
	async function refresh(force = false) {
		if (status !== 'ready' || !place) return;
		if (!force && Date.now() - fetchedAt < STALE_MS) return;
		try {
			const p = source === 'location' && (await locationAllowed()) ? await currentPosition() : place;
			const w = await getWeather(p, DEFAULT_UNIT);
			weather = w;
			place = p;
			fetchedAt = Date.now();
			save({ source, place: p });
		} catch {}
	}

	function useLocation() {
		show(currentPosition, 'location');
	}

	function useCity(event: SubmitEvent) {
		event.preventDefault();
		const query = city.trim();
		if (query) show(() => findCity(query), 'city');
	}

	function changeLocation() {
		save(null);
		error = '';
		status = 'ask';
	}

	async function start() {
		const saved = load();
		if (saved?.place) {
			const last = saved.place;
			await show(async () => last, saved.source);
			// Showing the last place is instant; then catch up to where you are now.
			if (saved.source === 'location') refresh(true);
		} else if (saved?.source === 'location' && (await locationAllowed())) {
			useLocation(); // saved before coordinates were kept
		} else {
			status = 'ask';
		}
	}

	onMount(() => {
		start();
		// A home-screen app stays in memory, so coming back doesn't reload the page.
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});
</script>

<svelte:head>
	<title>{status === 'ready' ? `${display} · wjeather` : 'wjeather'}</title>
</svelte:head>

<p class="sr-only" role="status">
	{status === 'loading' ? 'Checking the weather…' : status === 'ready' ? spoken : ''}
</p>

{#if status === 'ready' && weather}
	<main class="flex min-h-dvh flex-col">
		<WeatherScreen {weather} placeName={place?.name} onChangeLocation={changeLocation} />
	</main>
{:else if status !== 'starting'}
	<main class="flex min-h-dvh flex-col justify-center px-4 py-8 tablet:px-8">
		<div class="mx-auto w-full max-w-[24rem]">
			<h1 class="mb-6 text-xl">wjeather</h1>

			{#if status === 'loading'}
				<p class="m-0 text-text-muted">Checking the weather…</p>
			{:else}
				{#if error}
					<p class="mb-4 border-l-2 border-border pl-2">{error}</p>
				{/if}

				<button type="button" class="btn btn-accent w-full" onclick={useLocation}>
					Use my location
				</button>

				<p class="my-4 text-sm text-text-muted">or</p>

				<form class="flex flex-col gap-2" onsubmit={useCity}>
					<label for="city" class="text-sm font-bold">City</label>
					<div class="flex">
						<input
							id="city"
							name="city"
							type="text"
							autocomplete="address-level2"
							placeholder="Baltimore"
							bind:value={city}
							class="min-w-0 flex-1 border border-border bg-bg px-3 py-[0.875rem] text-base"
						/>
						<button type="submit" class="btn -ml-px">Show</button>
					</div>
				</form>
			{/if}
		</div>
	</main>
{/if}
