<script lang="ts">
	import type { PageProps } from './$types';
	import { ChevronLeft, ChevronRight, Calendar, ExternalLink, Edit } from 'lucide-svelte';
	import { page } from '$app/stores';
	
	let { data }: PageProps = $props();
	
	const limit = data.limit || 50;
	const totalPages = Math.ceil((data.total || 0) / limit);
	const currentPage = data.page || 1;
	
	function getPageUrl(pageNum: number): string {
		const url = new URL($page.url);
		url.searchParams.set('page', pageNum.toString());
		url.searchParams.set('limit', limit.toString());
		return url.pathname + url.search;
	}
	
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Unknown date';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			});
		} catch {
			return dateString;
		}
	}
	
	function getImageUrl(crossword: any): string | null {
		return crossword.imageMedium || crossword.imageLarge || crossword.imageSmall || null;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Crossword List</h1>
			<p class="text-gray-600 mt-1">
				Showing {data.crosswords.length} of {data.total} crosswords
			</p>
		</div>
	</div>

	{#if data.error}
		<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
			<p class="font-semibold">Error loading crosswords</p>
			<p class="text-sm">{data.error}</p>
		</div>
	{:else if data.crosswords.length === 0}
		<div class="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded-lg text-center">
			<p>No crosswords found.</p>
		</div>
	{:else}
		<!-- Crossword Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each data.crosswords as crossword}
				<div class="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200">
					<a 
						href={crossword.link} 
						target="_blank" 
						rel="noopener noreferrer"
						class="block"
					>
					{#if getImageUrl(crossword)}
						<div class="aspect-video bg-gray-100 overflow-hidden">
							<img 
								src={getImageUrl(crossword)} 
								alt={crossword.title}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
								loading="lazy"
							/>
						</div>
					{:else}
						<div class="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
							<span class="text-gray-400 text-sm">No image</span>
						</div>
					{/if}
					
					<div class="p-4">
						<h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
							{crossword.title}
						</h3>
						
						<div class="flex items-center text-sm text-gray-500 space-x-4">
							<div class="flex items-center">
								<Calendar class="w-4 h-4 mr-1" />
								<span>{formatDate(crossword.publishDate)}</span>
							</div>
						</div>
						
						<div class="mt-3 flex items-center text-sm text-blue-600 group-hover:text-blue-700">
							<span>View crossword</span>
							<ExternalLink class="w-4 h-4 ml-1" />
						</div>
					</div>
					</a>
					
					<!-- Edit Button -->
					<div class="px-4 pb-4">
						<a
							href="/edit/{crossword.id}"
							class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<Edit class="w-4 h-4" />
							Edit
						</a>
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between border-t border-gray-200 pt-6">
				<div class="flex items-center space-x-2">
					<a
						href={getPageUrl(currentPage - 1)}
						class="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
						class:opacity-50={currentPage === 1}
						class:cursor-not-allowed={currentPage === 1}
						aria-disabled={currentPage === 1}
					>
						<ChevronLeft class="w-4 h-4 mr-1" />
						Previous
					</a>
					
					<div class="flex items-center space-x-1">
						{#each (() => {
							const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
							const endPage = Math.min(totalPages, startPage + 4);
							return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
						})() as pageNum}
							<a
								href={getPageUrl(pageNum)}
								class="px-4 py-2 rounded-md border text-sm font-medium transition-colors"
								class:bg-blue-600={pageNum === currentPage}
								class:text-white={pageNum === currentPage}
								class:border-blue-600={pageNum === currentPage}
								class:bg-white={pageNum !== currentPage}
								class:text-gray-700={pageNum !== currentPage}
								class:border-gray-300={pageNum !== currentPage}
								class:hover:bg-gray-50={pageNum !== currentPage}
							>
								{pageNum}
							</a>
						{/each}
					</div>
					
					<a
						href={getPageUrl(currentPage + 1)}
						class="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
						class:opacity-50={currentPage === totalPages}
						class:cursor-not-allowed={currentPage === totalPages}
						aria-disabled={currentPage === totalPages}
					>
						Next
						<ChevronRight class="w-4 h-4 ml-1" />
					</a>
				</div>
				
				<div class="text-sm text-gray-600">
					Page {currentPage} of {totalPages}
				</div>
			</div>
		{/if}
	{/if}
</div>