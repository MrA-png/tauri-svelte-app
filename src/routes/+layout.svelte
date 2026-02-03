<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="app-container">
	{@render children()}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden; /* Prevent body scroll, handle in app */
		font-family: 'Inter', sans-serif;
		background: transparent; /* Allow Tauri transparency */
		color: #ffffff;
		user-select: none; /* App-like feel */
	}

	:global(body) {
		/* Default background (can be overridden by transparency toggle) */
		background-color: transparent;
	}

	.app-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	
	/* Scrollbar Styling */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}
	:global(::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.05);
	}
	:global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}
	:global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
