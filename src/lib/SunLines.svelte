<script lang="ts">
	import { sunRules } from '$lib/sky';
	import { HORIZON_SECONDS, type Weather } from '$lib/weather';

	let { weather }: { weather: Weather } = $props();

	// Sunrise and sunset as rules across the sky: a horizon, drawn on the hour
	// break where the sky turns (see sunRules), labelled with the exact minute.
	// Solid Golden Rod, edge to edge, so it can't be read as data — the
	// temperature and humidity lines curve, and the wind hatch is faint ink dashes.
	// The label sits just above the rule, right-aligned with the time ticks.
	// Labels are dropped where the ticks drop theirs (location button at the
	// top, temperature labels at the bottom); the rule stays.
	const fmt = $derived(
		new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: weather.timezone })
	);
	const rules = $derived.by(() => {
		const start = weather.next12h[0]?.time ?? 0;
		return sunRules(weather).map((e) => {
			const y = ((e.at - start) / HORIZON_SECONDS) * 100;
			return { ...e, y, labelled: y >= 11 && y <= 92, text: `${e.kind} ${fmt.format(new Date(e.time * 1000))}` };
		});
	});
	const summary = $derived(
		rules.map((r) => `${r.kind === 'sunset' ? 'Sunset' : 'Sunrise'} at ${fmt.format(new Date(r.time * 1000))}.`).join(' ')
	);
</script>

{#if rules.length}
	<p class="sr-only">{summary}</p>
	<div class="absolute inset-0" aria-hidden="true">
		{#each rules as rule (rule.time)}
			<div class="absolute inset-x-0 border-t border-sun" style:top="{rule.y}%"></div>
			{#if rule.labelled}
				<span
					class="absolute right-4 -translate-y-full pb-0.5 text-2xs text-sun @tablet:right-8 @desktop:right-12"
					style:top="{rule.y}%">{rule.text}</span
				>
			{/if}
		{/each}
	</div>
{/if}
