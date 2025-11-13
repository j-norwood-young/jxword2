<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Plus, Play, List } from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="px-6 py-4">
			<h1 class="text-2xl font-bold text-gray-900">JXWord2</h1>
		</div>
	</header>

	<div class="flex">
		<!-- Sidebar -->
		<aside class="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
			<nav class="p-6">
				<ul class="space-y-2">
					<li>
						<a 
							href="/create" 
							class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
						>
							<Plus class="w-5 h-5 mr-3" />
							Create
						</a>
					</li>
					<li>
						<a 
							href="/list" 
							class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
						>
							<List class="w-5 h-5 mr-3" />
							Crosswords
						</a>
					</li>
					<li>
						<a 
							href="/play" 
							class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
						>
							<Play class="w-5 h-5 mr-3" />
							Play
						</a>
					</li>
				</ul>
			</nav>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 p-6">
			{@render children?.()}
		</main>
	</div>
</div>