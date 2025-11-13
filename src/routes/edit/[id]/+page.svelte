<script lang="ts">
	import type { PageProps } from './$types';
	import JXWordCreator from "$lib/components/JXWordCreator.svelte";
	import { Save, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	
	let { data }: PageProps = $props();
	
	let isSaving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let creatorComponent: any = $state(null);
	
	// Extract the XD data from the crossword
	const xdData = data.crossword?.data || '';
    console.log({xdData});
	
	async function handleSave() {
		if (!data.id || !creatorComponent) return;
		
		isSaving = true;
		saveMessage = null;
		
		try {
			// Get the XD string from the creator component
			const xdString = creatorComponent?.getXdString() || '';
			
			if (!xdString) {
				throw new Error('Unable to get crossword data');
			}
			
			const response = await fetch(`/api/crosswords/${data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					data: xdString
				})
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to save: ${response.status}`);
			}
			
			saveMessage = {
				type: 'success',
				text: 'Crossword saved successfully!'
			};
			
			// Clear message after 3 seconds
			setTimeout(() => {
				saveMessage = null;
			}, 3000);
		} catch (error) {
			console.error('Error saving crossword:', error);
			saveMessage = {
				type: 'error',
				text: error instanceof Error ? error.message : 'Failed to save crossword'
			};
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<button
				onclick={() => goto('/list')}
				class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
				aria-label="Back to list"
			>
				<ArrowLeft class="w-5 h-5" />
			</button>
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Edit Crossword</h1>
				{#if data.crossword?.title}
					<p class="text-gray-600 mt-1">{data.crossword.title}</p>
				{/if}
			</div>
		</div>
		
		<button
			onclick={handleSave}
			disabled={isSaving || !data.crossword}
			class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
		>
			<Save class="w-5 h-5" />
			{isSaving ? 'Saving...' : 'Save to CMS'}
		</button>
	</div>
	
	<!-- Save Message -->
	{#if saveMessage}
		<div class="flex items-center gap-3 px-4 py-3 rounded-lg {saveMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}">
			{#if saveMessage.type === 'success'}
				<CheckCircle2 class="w-5 h-5 flex-shrink-0" />
			{:else}
				<AlertCircle class="w-5 h-5 flex-shrink-0" />
			{/if}
			<p class="font-medium">{saveMessage.text}</p>
		</div>
	{/if}
	
	<!-- Error State -->
	{#if data.error}
		<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
			<div class="flex items-center gap-3">
				<AlertCircle class="w-5 h-5 flex-shrink-0" />
				<div>
					<p class="font-semibold">Error loading crossword</p>
					<p class="text-sm">{data.error}</p>
				</div>
			</div>
		</div>
	{:else if !data.crossword}
		<div class="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded-lg text-center">
			<p>Crossword not found.</p>
		</div>
	{:else}
		<!-- Crossword Editor -->
		<JXWordCreator 
			bind:this={creatorComponent}
			xd={xdData}
            title={data.crossword.title}
			save_state={false}
			displayXd={true}
		/>
	{/if}
</div>

