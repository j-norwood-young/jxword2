<script lang="ts">
	import { onMount } from 'svelte';
	import { testAutofill } from '$lib/autofill/test-autofill.js';

	let isRunning = $state(false);
	let output = $state('');

	async function runTest() {
		isRunning = true;
		output = '';

		// Capture console.log output
		const originalLog = console.log;
		const originalError = console.error;
		const logs: string[] = [];

		console.log = (...args: any[]) => {
			logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
			originalLog(...args);
		};

		console.error = (...args: any[]) => {
			logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
			originalError(...args);
		};

		try {
			await testAutofill(5);
			output = logs.join('\n');
		} catch (error) {
			output = logs.join('\n') + '\n\nERROR: ' + String(error);
		} finally {
			console.log = originalLog;
			console.error = originalError;
			isRunning = false;
		}
	}

	onMount(() => {
		// Auto-run on mount
		runTest();
	});
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Autofill Test</h1>
	
	<button
		onclick={runTest}
		disabled={isRunning}
		class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed mb-4"
	>
		{isRunning ? 'Running...' : 'Run Test'}
	</button>

	{#if output}
		<pre class="bg-gray-100 p-4 rounded overflow-auto max-h-[80vh] text-sm whitespace-pre-wrap">{output}</pre>
	{:else if isRunning}
		<div class="text-gray-500">Running test... Check browser console for live output.</div>
	{/if}
</div>

