<script lang="ts">
	// Svelte stuff
	import { onMount, tick } from "svelte";
	// Types
	import type { CrosswordQuestion } from "$lib/types/Crossword";
	import type { XD } from "$lib/types/XD";
	import type { Question as QuestionType } from "$lib/types/Question";
	import type { CrosswordData } from "$lib/types/Crossword";
	// Components
	import Menu from "./Menu.svelte";
	import CrosswordGrid from "./CrosswordGrid.svelte";
	import Instructions from "./Instructions.svelte";
	import SizeSlider from "./SizeSlider.svelte";
	import Print from "./Print.svelte";
	import FileUpload from "./FileUpload.svelte";
	import Patterns from "./Patterns.svelte";
	import Button from "./Button.svelte";
	import Input from "./Input.svelte";
	import Dropdown from "./Dropdown.svelte";
	import { Download, Trash2, RotateCcw, Edit, Play } from "lucide-svelte";
	// Libraries
	import { parseCrosswordXML } from "../libs/crossword_xml_parse.js";
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
	let grid = $state([...Array(size)].map(e => Array(size)));
	let localState: XD | undefined = $state(undefined);
	let data: CrosswordData = $state({
		title: "",
		author: "",
		date: "",
		difficulty: "Medium",
		type: "Straight",
		copyright: "",
		grid: [...Array(size)].map(e => Array(size)),
		clues: {
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
		},
	});
	console.log(data);
	let instructionsVisible: boolean = $state(false);
	let editMode: boolean = $state(true);
	let currentDirection = $state("across");
	let currentQuestion = $state(null);

	// async function handleStateChange() {
	// 	if (!save_state) return;
	// 	if (!localState) return;
	// 	saveState(localState);
	// 	xd = XDEncode(localState) || "";
	// 	gridComponent.handleFocus();
	// }

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
		data = {
			title: "",
			author: "",
			date: "",
			difficulty: "Medium",
			type: "Straight",
			copyright: "",
			grid: [...Array(size)].map(e => Array(size).fill(" ")),
			clues: {
				across: acrossQuestions,
				down: downQuestions,
			},
		};
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
		data.grid = data.grid.map(row => row.map(cell => cell === "#" ? "#" : " "));
		
		// Clear all clues
		data.clues = {
			across: [],
			down: [],
		};
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
			data = newData;
			size = data.grid.length;
			await tick();
			for (let question of data.clues.across) {
				let matching_question = result.across.find(q => q.num === `A${question.number}`);
				if (matching_question) {
					question.answer = matching_question.answer;
				}
			}
			for (let question of data.clues.down) {
				let matching_question = result.down.find(q => q.num === `D${question.number}`);
				if (matching_question) {
					question.answer = matching_question.answer;
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
		try {
			// const result = parseCrosswordXML(xml);
			// title = result.title || "";
			// author = result.creator || "";
			// editor = result.editor || "";
			// copyright = result.copyright || "";
			// size = result.width || 0;
			// grid = result.grid;
			// console.log(result);
			// // Map the questions to include required properties
			// const mappedAcross = result.questions.across.map((q: any) => ({
			// 	...q,
			// 	answer: q.answer || "",
			// 	editing: false
			// }));
			// const mappedDown = result.questions.down.map((q: any) => ({
			// 	...q,
			// 	answer: q.answer || "",
			// 	editing: false
			// }));
			// questionsAcross.set(mappedAcross);
			// questionsDown.set(mappedDown);
			// gridComponent.setDir("across");
			// gridComponent.setCurrentPos(0, 0);
			// await tick();
		} catch (e) {
			console.log(e);
		}
	}

	function handleInstructions() {
		instructionsVisible = !instructionsVisible;
	}

	function downloadXD() {
		// Download contents of xd
		// const file = new Blob([dataxd], {type: "text/plain;charset=utf-8"});
		// const downloadLink = document.createElement("a");
		// downloadLink.download = download_filename || "crossword.xd";
		// downloadLink.href = URL.createObjectURL(file);
		// downloadLink.click();
	}

	function handleXDUpload(msg: { content: string, filename: string }) {
		loadXd(msg.content);
		download_filename = msg.filename;
	}

	function handleXMLUpload(msg: { content: string, filename: string }) {
		loadXML(msg.content);
		download_filename = msg.filename.replace(".xml", ".xd");
	}

</script>

<main class="max-w-none mx-auto lg:max-w-4xl">
	<Instructions bind:visible="{ instructionsVisible }" />
	<div class="flex flex-col items-start justify-start mt-4">
		<div class="flex flex-row items-start justify-start">
				<div class="flex flex-col">
					<Input 
						class="text-2xl font-bold mb-4 max-w-sm border-none border-b border-gray-300"
						name="title" 
						type="text" 
						bind:value={data.title} 
						placeholder="Title" 
					/>
					<SizeSlider bind:size="{size}" />
					<Dropdown
						label="Difficulty"
						class="mb-4 max-w-sm border-none border-b border-gray-300"
						options={difficulties.map(d => ({ value: d, label: d }))}
						bind:value={data.difficulty}
					/>
					<Dropdown
						label="Type"
						class="mb-4 max-w-sm border-none border-b border-gray-300"
						options={types.map(t => ({ value: t, label: t }))}
						bind:value={data.type}
					/>
					<Input 
						class="block mb-4 max-w-sm border-none border-b border-gray-300"
						name="date" 
						type="date" 
						bind:value={data.date} 
						placeholder="Publish Date" 
					/>
					<Input 
						class="block mb-4 max-w-sm border-none border-b border-gray-300"
						name="author" 
						type="text" 
						bind:value={data.author} 
						placeholder="Author" 
					/>
					<Input 
						class="block mb-4 max-w-sm border-none border-b border-gray-300"
						name="editor" 
						type="text" 
						bind:value={data.editor} 
						placeholder="Editor" 
					/>
					<Input 
						class="block mb-4 max-w-sm border-none border-b border-gray-300"
						name="copyright" 
						type="text" 
						bind:value={data.copyright} 
						placeholder="Copyright" 
					/>
			</div>
			<div class="ml-10 pl-10 border-l border-gray-300 flex flex-col">
				<Patterns size="{size}" bind:grid="{grid}" />
				<div class="flex flex-row items-start justify-start">
					<input type="checkbox" name="symmetry" bind:checked={symmetry} class="mr-2">
					<label for="symmetry">Symmetry</label>
				</div>
				<Print state={data} />
				<div>
					<label for="file" class="block mb-1">Upload XD file</label>
					<FileUpload file_formats={[".xd"]} handleFileSelect="{ handleXDUpload }" />
				</div>
				<div>
					<label for="file" class="block mb-1">Upload XML file</label>
					<FileUpload file_formats={[".xml"]} handleFileSelect="{ handleXMLUpload }" />
				</div>
				<div>
					<label for="download" class="block mb-1">Download</label>
					<Input 
						class="block mb-4 max-w-sm border-none border-b border-gray-300" 
						name="download" 
						bind:value={download_filename} 
					/>
					<Button 
						variant="primary" 
						onclick={downloadXD}
					>
						<Download size={16} class="mr-2" />
						Download Crossword
					</Button>
				</div>
				<div class="mt-4 flex flex-col gap-2">
					<Button 
						variant="secondary" 
						onclick={handleClear}
					>
						<Trash2 size={16} class="mr-2" />
						Clear
					</Button>
					<Button 
						variant="secondary" 
						onclick={handleReset}
					>
						<RotateCcw size={16} class="mr-2" />
						Reset
					</Button>
				</div>
			</div>
		</div>
		<div class="mt-4 mb-6 min-w-4xl" >
			<div class="flex flex-row items-start justify-start">
				<Button 
					variant="primary" 
					onclick={() => editMode = !editMode}
				>
					{#if editMode}
						<Edit size={16} class="mr-2" />
						Edit Mode
					{:else}
						<Play size={16} class="mr-2" />
						Play Mode
					{/if}
				</Button>
			</div>
			<!-- <div>
				<Menu onReset="{ handleReset }" onInstructions="{ handleInstructions }" />
			</div> -->
			<CrosswordGrid bind:crosswordData={data} editMode={editMode} debug={true} bind:size={size} bind:symmetry={symmetry} />
		</div>
		
		<textarea id="xd" name="xd" class="w-full h-96 border border-gray-300 p-4 mt-4" bind:value="{xd}" style:display="{displayXd ? 'block' : 'none'}"></textarea>
	</div>
</main>
