<script lang="ts">
	// Svelte stuff
	import { onMount, tick } from "svelte";
	// Types
	import type { CrosswordQuestion } from "$lib/types/Crossword";
	import type { XD } from "$lib/types/XD";
	import type { Question as QuestionType } from "$lib/types/Question";
	import type { CrosswordData } from "$lib/types/Crossword";
	// Components
	import CrosswordGrid from "./CrosswordGrid.svelte";
	import Instructions from "./Instructions.svelte";
	import SizeSlider from "./SizeSlider.svelte";
	import Print from "./Print.svelte";
	import FileUpload from "./FileUpload.svelte";
	import Patterns from "./Patterns.svelte";
	import Button from "./Button.svelte";
	import Input from "./Input.svelte";
	import Dropdown from "./Dropdown.svelte";
	import { Download, Trash2, RotateCcw, Edit, Play, MoreVertical, ChevronDown, ChevronUp, Grid3x3, Zap, AlertCircle, X } from "lucide-svelte";
	// Libraries
	import { parseCrosswordXML, CrosswordXMLError } from "../libs/crossword_xml_parse";
	import { saveState, restoreState, clearState } from '../libs/savestate.js';
	import { XDEncode } from "$lib/libs/xd-encode";
	import XDParser from "xd-crossword-parser";

	type Props = {
		xd?: string;
		size?: number;
		difficulties?: string[];
		types?: string[];
		save_state?: boolean;
		displayXd?: boolean;
		symmetry?: boolean;
		download_filename?: string;
	}

	let { 
		xd,
		size = 15,
		difficulties = [
			"Easy", "Medium", "Hard", "Evil" 
		], types = [
			"Straight", "Quick", "Cryptic"
		], save_state = true, 
		displayXd = true, 
		symmetry = true, 
		download_filename = "crossword.xd"
	}: Props = $props();
	
	// State
	let grid = $state([...Array(size)].map(e => Array(size).fill(" ")));
	let title = $derived("");
	let author = $derived("");
	let date = $derived("");
	let difficulty = $derived("Medium");
	let type = $derived("Straight");
	let copyright = $derived("");
	let editor = $derived("");
	let clues = $state({
		across: [...Array(size)].map((e, i) => ({
			direction: 0,
			alpha_number: `A${i === 0 ? 1 : i + 15}`,
			clue: "",
			answer: ""
		})),
		down: [...Array(size)].map((e, i) => ({
			direction: 1,
			alpha_number: `D${(i + 1)}`,
			clue: "",
			answer: ""
		})),
	});
	let instructionsVisible: boolean = $state(false);
	let mode: 'play' | 'edit' | 'grid' = $state('edit');
	let currentDirection = $state("across");
	let currentQuestion = $state(null);
	let metaExpanded: boolean = $state(false);
	let fileMenuOpen: boolean = $state(false);
	let isAutofilling: boolean = $state(false);
	let errorMessage: string | null = $state(null);
	let showError: boolean = $state(false);

	// async function handleStateChange() {
	// 	if (!save_state) return;
	// 	if (!localState) return;
	// 	saveState(localState);
	// 	xd = XDEncode(localState) || "";
	// 	gridComponent.handleFocus();
	// }

	let local_xd = $derived(XDEncode({
		grid, 
		questions_across: clues.across.map(q => ({
			num: parseInt(q.alpha_number.replace(/^A/i, '')) || 0,
			x: 0,
			y: 0,
			question: q.clue,
			answer: q.answer,
			editing: false,
			direction: 'across' as const
		})), 
		questions_down: clues.down.map(q => ({
			num: parseInt(q.alpha_number.replace(/^D/i, '')) || 0,
			x: 0,
			y: 0,
			question: q.clue,
			answer: q.answer,
			editing: false,
			direction: 'down' as const
		})), 
		title, 
		author, 
		date, 
		difficulty, 
		type, 
		copyright, 
		editor
	}));

	onMount(() => {
		if (xd) {
			loadXd(xd);
			return;
		} 
		if (save_state) {
			restoreState();
			return;
		}
	});
	
	function handleReset() {
		if (!confirm("Are you sure you want to reset everything to defaults? This will clear all data including the grid pattern.")) {
			return;
		}
		
		size = 15;
		grid = [...Array(size)].map(e => Array(size).fill(" "));
		let acrossQuestions: CrosswordQuestion[] = [...Array(15)].map((e, i) => ({
			direction: 0,
			alpha_number: `A${(i + 1)}`,
			clue: "",
			answer: ""
		}));
		let downQuestions: CrosswordQuestion[] = [...Array(15)].map((e, i) => ({
			direction: 1,
			alpha_number: `D${(i + 1)}`,
			clue: "",
			answer: ""
		}));
		title = "";
		author = "";
		date = "";
		difficulty = "Medium";
		type = "Straight";
		copyright = "";
		grid = [...Array(size)].map(e => Array(size).fill(" "));
		clues.across = acrossQuestions.map(q => ({
			direction: q.direction,
			alpha_number: q.alpha_number || "",
			clue: q.clue || "",
			answer: q.answer || ""
		}));
		clues.down = downQuestions.map(q => ({
			direction: q.direction,
			alpha_number: q.alpha_number || "",
			clue: q.clue || "",
			answer: q.answer || ""
		}));
		currentDirection = "across";
		currentQuestion = null;
		if (save_state) {
			clearState();
		}
		xd = "";
	}

	function handleClear() {
		if (!confirm("Are you sure you want to clear all letters and clues? This will keep the grid pattern but remove all content.")) {
			return;
		}
		
		// Keep the pattern (black squares) but clear all letters
		grid = grid.map(row => row.map(cell => cell === "#" ? "#" : " "));
		
		// Clear all clues
		clues.across = [];
		clues.down = [];
	}

	async function loadXd(xd: string) {
		try {
			const result = XDParser(xd);
			console.log({result});
			const newData: CrosswordData = {
				title: result.meta.Title || "",
				author: result.meta.Author || "",
				copyright: result.meta.Copyright || "",
				date: result.meta.Date || "",
				difficulty: result.meta.Difficulty || "",
				type: result.meta.Type || "",
				grid: result.grid as string[][],
				clues: {
					across: result.across.map((q: any) => ({
						direction: 0,
						alpha_number: `${q.num}`,
						clue: q.question,
						answer: q.answer
					})),
					down: result.down.map((q: any) => ({
						direction: 1,
						alpha_number: `${q.num}`,
						clue: q.question,
						answer: q.answer
					}))
				}
			};
			console.log({newData});
			title = newData.title || "";
			author = newData.author || "";
			date = newData.date || "";
			difficulty = newData.difficulty || "";
			type = newData.type || "";
			copyright = newData.copyright || "";
			grid = newData.grid;
			clues.across = newData.clues.across.map(q => ({
				direction: q.direction,
				alpha_number: q.alpha_number || "",
				clue: q.clue || "",
				answer: q.answer || ""
			}));
			clues.down = newData.clues.down.map(q => ({
				direction: q.direction,
				alpha_number: q.alpha_number || "",
				clue: q.clue || "",
				answer: q.answer || ""
			}));
			size = grid.length;
			await tick();
			for (let question of clues.across) {
				let matching_question = newData.clues.across.find(q => q.alpha_number === question.alpha_number);
				if (matching_question) {
					question.answer = matching_question.answer || "";
				}
			}
			for (let question of clues.down) {
				let matching_question = newData.clues.down.find(q => q.alpha_number === question.alpha_number);
				if (matching_question) {
					question.answer = matching_question.answer || "";
				}
			}
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	async function loadXML(xml: string) {
		console.log("loading xml")
		// Clear any previous errors
		showError = false;
		errorMessage = null;
		
		try {
			console.log("loading xml", xml);
			const result = parseCrosswordXML(xml);
			
			// Validate result before using it
			if (!result || !result.grid || !Array.isArray(result.grid) || result.grid.length === 0) {
				throw new Error("Invalid XML: grid is empty or invalid");
			}
			
			// Ensure grid has at least one row with at least one column
			if (!result.grid[0] || !Array.isArray(result.grid[0]) || result.grid[0].length === 0) {
				throw new Error("Invalid XML: grid rows are empty or invalid");
			}
			
			title = result.title || "";
			author = result.creator || "";
			editor = result.editor || "";
			copyright = result.copyright || "";
			size = result.width || result.grid[0].length || 15;
			
			// Ensure size is valid
			if (size <= 0) {
				size = Math.max(result.grid.length, result.grid[0]?.length || 15);
			}
			
			grid = result.grid;
			console.log(result);
			clues.across = result.questions.across.map((q: any) => ({
				direction: 0,
				alpha_number: `${q.num}`,
				clue: q.question,
				answer: q.answer
			}));
			clues.down = result.questions.down.map((q: any) => ({
				direction: 1,
				alpha_number: `${q.num}`,
				clue: q.question,
				answer: q.answer
			}));
		} catch (e) {
			console.error("Error loading XML:", e);
			if (e instanceof CrosswordXMLError) {
				errorMessage = e.message;
			} else if (e instanceof Error) {
				errorMessage = `Failed to load XML file: ${e.message}`;
			} else {
				errorMessage = "An unknown error occurred while loading the XML file. Please check the file format and try again.";
			}
			showError = true;
		}
	}
	
	function dismissError() {
		showError = false;
		errorMessage = null;
	}

	function handleInstructions() {
		instructionsVisible = !instructionsVisible;
	}

	function downloadXD() {
		// Download contents of xd
		const dataxd = local_xd || "";
		const file = new Blob([dataxd], {type: "text/plain;charset=utf-8"});
		const downloadLink = document.createElement("a");
		downloadLink.download = download_filename || "crossword.xd";
		downloadLink.href = URL.createObjectURL(file);
		downloadLink.click();
	}

	function handleXDUpload(msg: { content: string, filename: string }) {
		loadXd(msg.content);
		download_filename = msg.filename;
	}

	function handleXMLUpload(msg: { content: string, filename: string }) {
		loadXML(msg.content);
		download_filename = msg.filename.replace(".xml", ".xd");
		fileMenuOpen = false;
	}

	function handleXDUploadWrapper(msg: { content: string, filename: string }) {
		handleXDUpload(msg);
		fileMenuOpen = false;
	}

	function toggleMeta() {
		metaExpanded = !metaExpanded;
	}

	function toggleFileMenu() {
		fileMenuOpen = !fileMenuOpen;
	}

	let gridComponent: any = $state(null);

	async function handleAutofill() {
		if (mode !== 'edit' || isAutofilling || !gridComponent) return;
		isAutofilling = true;
		try {
			await gridComponent.autofill();
		} finally {
			isAutofilling = false;
		}
	}

</script>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<Instructions bind:visible="{ instructionsVisible }" />
	
	<!-- Error Alert -->
	{#if showError && errorMessage}
		<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm" role="alert">
			<AlertCircle class="text-red-600 flex-shrink-0 mt-0.5" size={20} />
			<div class="flex-1">
				<h3 class="text-red-800 font-semibold mb-1">Invalid XML File</h3>
				<p class="text-red-700 text-sm">{errorMessage}</p>
			</div>
			<button
				onclick={dismissError}
				class="text-red-600 hover:text-red-800 flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
				aria-label="Dismiss error"
			>
				<X size={18} />
			</button>
		</div>
	{/if}
	
	<div class="flex flex-col space-y-6">
		<!-- Title and Action Bar -->
		<div class="flex items-center justify-between gap-4">
			<Input 
				class="text-3xl font-bold flex-1 border-none border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none pb-2"
				name="title" 
				type="text" 
				bind:value={title} 
				placeholder="Crossword Title" 
			/>
			<div class="flex items-center gap-3">
				<!-- Mode Buttons -->
				<div class="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
					<button
						onclick={() => mode = 'play'}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 {mode === 'play' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}"
						title="Play Mode"
					>
						<Play size={16} />
						Play
					</button>
					<button
						onclick={() => mode = 'edit'}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 {mode === 'edit' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}"
						title="Edit Mode"
					>
						<Edit size={16} />
						Edit
					</button>
					<button
						onclick={() => mode = 'grid'}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 {mode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}"
						title="Grid Mode"
					>
						<Grid3x3 size={16} />
						Grid
					</button>
				</div>

				<!-- Autofill Button (visible in Edit mode) -->
				<Button 
					variant="primary" 
					onclick={handleAutofill}
					class="whitespace-nowrap {mode !== 'edit' ? 'invisible pointer-events-none' : ''}"
					disabled={isAutofilling || mode !== 'edit'}
				>
					<Zap size={16} class="mr-2" />
					{#if isAutofilling}
						Autofilling...
					{:else}
						Autofill
					{/if}
				</Button>
				
				<!-- File Operations Dropdown -->
				<div class="relative">
					<button
						onclick={toggleFileMenu}
						class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
						aria-label="File operations"
						aria-expanded={fileMenuOpen}
					>
						<MoreVertical size={20} class="text-gray-700" />
					</button>
					
					{#if fileMenuOpen}
						<div class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
							<div class="py-2">
								<div class="px-4 py-2 border-b border-gray-100">
									<div class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload</div>
									<div class="space-y-2">
										<div>
											<div class="block text-xs text-gray-600 mb-1">Upload XD file</div>
											<FileUpload file_formats={[".xd"]} handleFileSelect={handleXDUploadWrapper} />
										</div>
										<div>
											<div class="block text-xs text-gray-600 mb-1">Upload XML file</div>
											<FileUpload file_formats={[".xml"]} handleFileSelect={handleXMLUpload} />
										</div>
									</div>
								</div>
								
								<div class="px-4 py-2 border-b border-gray-100">
									<div class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Download</div>
									<div class="space-y-2">
										<Input 
											class="block w-full text-sm border border-gray-300 rounded px-2 py-1" 
											name="download" 
											bind:value={download_filename} 
											placeholder="crossword.xd"
										/>
										<Button 
											variant="primary" 
											onclick={() => { downloadXD(); fileMenuOpen = false; }}
											class="w-full"
										>
											<Download size={16} class="mr-2" />
											Download Crossword
										</Button>
									</div>
								</div>
								
								<div class="px-4 py-2">
									<div class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actions</div>
									<div class="space-y-1">
										<button
											onclick={() => { handleClear(); fileMenuOpen = false; }}
											class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
										>
											<Trash2 size={16} />
											Clear
										</button>
										<button
											onclick={() => { handleReset(); fileMenuOpen = false; }}
											class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
										>
											<RotateCcw size={16} />
											Reset
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Crossword Grid - Immediately visible -->
		<div class="w-full">
			<CrosswordGrid 
				bind:this={gridComponent}
				title={title} 
				author={author} 
				date={date} 
				difficulty={difficulty} 
				type={type} 
				copyright={copyright} 
				editor={editor} 
				grid={grid} 
				clues={clues} 
				mode={mode}
				debug={true} 
				bind:size={size} 
				bind:symmetry={symmetry} 
			/>
		</div>

		<!-- Meta Section - Collapsible -->
		<div class="border border-gray-200 rounded-lg overflow-hidden">
			<button
				onclick={toggleMeta}
				class="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
				aria-expanded={metaExpanded}
			>
				<span class="text-lg font-semibold text-gray-900">Meta Information</span>
				{#if metaExpanded}
					<ChevronUp size={20} class="text-gray-600" />
				{:else}
					<ChevronDown size={20} class="text-gray-600" />
				{/if}
			</button>
			
			{#if metaExpanded}
				<div class="p-6 bg-white border-t border-gray-200">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<!-- Left Column -->
						<div class="space-y-4">
							<SizeSlider bind:size="{size}" />
							
							<Dropdown
								label="Difficulty"
								class="w-full"
								options={difficulties.map(d => ({ value: d, label: d }))}
								bind:value={difficulty}
							/>
							
							<Dropdown
								label="Type"
								class="w-full"
								options={types.map(t => ({ value: t, label: t }))}
								bind:value={type}
							/>
							
							<Input 
								class="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								name="date" 
								type="date" 
								bind:value={date} 
								placeholder="Publish Date" 
							/>
						</div>
						
						<!-- Middle Column -->
						<div class="space-y-4">
							<Input 
								class="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								name="author" 
								type="text" 
								bind:value={author} 
								placeholder="Author" 
							/>
							
							<Input 
								class="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								name="editor" 
								type="text" 
								bind:value={editor} 
								placeholder="Editor" 
							/>
							
							<Input 
								class="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								name="copyright" 
								type="text" 
								bind:value={copyright} 
								placeholder="Copyright" 
							/>
						</div>
						
						<!-- Right Column -->
						<div class="space-y-4">
							<div>
								<div class="block text-sm font-medium text-gray-700 mb-2">Grid Pattern</div>
								<Patterns size={size} bind:grid="{grid}" />
							</div>
							
							<div class="flex items-center">
								<input 
									type="checkbox" 
									id="symmetry" 
									name="symmetry" 
									bind:checked={symmetry} 
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label for="symmetry" class="ml-2 block text-sm text-gray-900">Symmetry</label>
							</div>
							
							<Print state={{ title, author, date, difficulty, type, copyright, grid, clues }} />
						</div>
					</div>
				</div>
			{/if}
		</div>
		
		<!-- XD Textarea (hidden by default) -->
		{#if displayXd}
			<textarea 
				id="xd" 
				name="xd" 
				class="w-full h-96 border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
				value={local_xd}
			></textarea>
		{/if}
	</div>
</main>

<!-- Click outside to close file menu -->
<svelte:window onclick={(e) => {
	if (fileMenuOpen && e.target && 'closest' in e.target) {
		const target = e.target as Element;
		if (!target.closest('.relative')) {
			fileMenuOpen = false;
		}
	}
}} />
