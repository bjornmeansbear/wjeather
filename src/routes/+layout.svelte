<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- iOS ignores SVG icons; this 180px PNG (rendered from the same SVG) is the home screen icon. -->
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<!-- The temperature renders after the weather fetch; preloading means Basteleur is ready by then. -->
	<link rel="preload" href="/fonts/Basteleur-Bold.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>
{@render children()}
