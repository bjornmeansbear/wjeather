<script lang="ts">
	// The key: never shown first, always one tap away. Every sample below is
	// drawn with the same tokens the screen uses, so the key can't drift from it.
	let { class: className = '' }: { class?: string } = $props();
	const titleId = $props.id();
	let dialog: HTMLDialogElement;

	const skies = [
		{ token: '--band-clear', label: 'Clear', stars: false },
		{ token: '--band-night', label: 'Clear night', stars: true },
		{ token: '--band-cloud', label: 'Cloudy', stars: false },
		{ token: '--band-cloud-night', label: 'Cloudy night', stars: false },
		{ token: '--band-rain', label: 'Rain', stars: false },
		{ token: '--band-snow', label: 'Snow', stars: false }
	];
</script>

<button
	type="button"
	class="{className} grid size-7 cursor-pointer place-items-center text-text-muted active:bg-text active:text-bg"
	aria-label="Show key"
	aria-haspopup="dialog"
	onclick={() => dialog.showModal()}
>
	<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
		<circle cx="9" cy="9" r="7.25" />
		<path d="M6.75 7a2.25 2.25 0 1 1 3.2 2.05c-.6.3-.95.8-.95 1.45V11" stroke-linecap="round" />
		<circle cx="9" cy="13.4" r="0.6" fill="currentColor" />
	</svg>
</button>

<!-- Native dialog: focus moves in and stays, Esc closes, focus returns to the
     button. A click on the backdrop (the dialog itself, outside the inner
     panel) closes it too; Esc and the Close button cover keyboards. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	class="m-auto max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100%-2rem))] overflow-y-auto border-2 border-border bg-bg p-0 text-text backdrop:bg-text/50"
	onclick={(e) => {
		if (e.target === dialog) dialog.close();
	}}
>
	<div class="p-4">
		<div class="mb-4 flex items-baseline justify-between gap-4 border-b border-border pb-2">
			<h2 id={titleId} class="m-0 text-lg">Key</h2>
			<button
				type="button"
				class="inline-flex min-h-4 cursor-pointer items-center text-sm underline underline-offset-4"
				onclick={() => dialog.close()}
			>
				Close
			</button>
		</div>

		<p class="mb-4 text-sm">
			Time runs down the screen: now at the top, twelve hours from now at the bottom.
		</p>

		<ul class="m-0 flex list-none flex-col gap-4 p-0 text-sm">
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-accent" stroke-width="2" />
				</svg>
				<span>Temperature. Left is cooler, right is warmer; the corner labels give the range.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-humidity" stroke-width="2" stroke-dasharray="6 6" />
				</svg>
				<span>Humidity. 40% at the left edge, 100% at the right.</span>
			</li>

			<li>
				<span class="mb-2 block">The sky, hour by hour:</span>
				<div class="grid grid-cols-3 gap-2">
					{#each skies as sky (sky.token)}
						<div>
							<div class="relative h-4 border border-border" style:background="var({sky.token})">
								{#if sky.stars}
									<svg class="absolute inset-0 h-full w-full" aria-hidden="true">
										<circle cx="20%" cy="30%" r="1" class="fill-star" />
										<circle cx="55%" cy="65%" r="0.75" class="fill-star" />
										<circle cx="80%" cy="25%" r="1" class="fill-star" />
									</svg>
								{/if}
							</div>
							<span class="mt-1 block text-2xs">{sky.label}</span>
						</div>
					{/each}
				</div>
			</li>

			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="24" aria-hidden="true">
					<g class="stroke-text" stroke-width="1" stroke-dasharray="18 6" opacity="0.4">
						<line x1="0" y1="18" x2="48" y2="2" />
						<line x1="0" y1="26" x2="48" y2="10" />
						<line x1="6" y1="30" x2="54" y2="14" />
					</g>
				</svg>
				<span>
					Wind. Dashes run the way it blows and close up as it strengthens; they drift with it when
					the app opens. No dashes: calm.
				</span>
			</li>
		</ul>
	</div>
</dialog>
