<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- The temperature renders after the weather fetch; preloading means Basteleur is ready by then. -->
	<link rel="preload" href="/fonts/Basteleur-Bold.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>
{@render children()}
