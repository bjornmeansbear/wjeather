<script lang="ts">
	import { onMount } from 'svelte';
	import ForecastLine from '$lib/ForecastLine.svelte';
	import {
		currentPosition,
		findCity,
		getWeather,
		locationAllowed,
		DEFAULT_UNIT,
		type Place,
		type Weather
	} from '$lib/weather';

	type Saved = { source: 'location' } | { source: 'city'; place: Place };
	const STORAGE_KEY = 'wjeather:place';

	let status = $state<'starting' | 'ask' | 'loading' | 'ready'>('starting');
	let weather = $state<Weather | null>(null);
	let place = $state<Place | null>(null);
	let error = $state('');
	let city = $state('');

	const degrees = $derived(weather ? Math.round(weather.temperature) : 0);
	// A true minus sign, not a hyphen.
	const display = $derived(`${degrees < 0 ? '−' : ''}${Math.abs(degrees)}°`);
	const spoken = $derived(
		weather
			? `${degrees} degrees ${weather.unit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius'}${place?.name ? ` in ${place.name}` : ''}`
			: ''
	);

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

	async function show(getPlace: () => Promise<Place>, toSaved: (p: Place) => Saved) {
		status = 'loading';
		error = '';
		try {
			const p = await getPlace();
			weather = await getWeather(p, DEFAULT_UNIT);
			place = p;
			save(toSaved(p));
			status = 'ready';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong. Try again.';
			status = 'ask';
		}
	}

	function useLocation() {
		show(currentPosition, () => ({ source: 'location' }));
	}

	function useCity(event: SubmitEvent) {
		event.preventDefault();
		const query = city.trim();
		if (query) show(() => findCity(query), (p) => ({ source: 'city', place: p }));
	}

	function changeLocation() {
		save(null);
		error = '';
		status = 'ask';
	}

	onMount(async () => {
		const saved = load();
		if (saved?.source === 'city') {
			show(async () => saved.place, () => saved);
		} else if (saved?.source === 'location' && (await locationAllowed())) {
			useLocation();
		} else {
			status = 'ask';
		}
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
		<h1 class="sr-only">{spoken}</h1>
		<!-- The graph fills this area: its top edge is now, the footer rule is +12 hours. -->
		<div class="relative flex-1">
			<ForecastLine {weather} />
			<p
				class="relative m-0 px-4 pt-4 text-display font-normal tracking-[-0.04em] whitespace-nowrap tablet:px-8 desktop:px-12"
				aria-hidden="true"
			>
				{display}
			</p>
		</div>
		<footer
			class="mx-4 flex flex-wrap items-center justify-between gap-x-4 border-t border-border py-2 text-2xs text-text-muted tablet:mx-8 desktop:mx-12"
		>
			<button
				type="button"
				class="inline-flex min-h-4 cursor-pointer items-center underline underline-offset-4"
				onclick={changeLocation}
			>
				Change location
			</button>
			<a
				class="inline-flex min-h-4 items-center underline underline-offset-4"
				href="https://open-meteo.com/"
			>
				Weather data by Open-Meteo.com
			</a>
		</footer>
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
