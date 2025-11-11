<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { Fireworks } from 'fireworks-js';
	import type {
		CrosswordData as CrosswordType,
		CrosswordBlock as CrosswordBlockType,
		GameState as GameStateType,
		CrosswordQuestion as CrosswordQuestionType
	} from '$lib/types/Crossword';
	import { isStartOfAcross, isStartOfDown, generateAcrossScalar, generateDownScalar } from '$lib/libs/crossword_utils.js';
	import MobileKeyboard from './MobileKeyboard.svelte';
	import MobileQuestionPanel from './MobileQuestionPanel.svelte';
	import HamburgerMenu from './HamburgerMenu.svelte';
	import { suggest } from '$lib/suggestions/suggest.js';
	import { simpleAutofill, findEmptyWords, getWordPattern } from '$lib/autofill/autofill.js';

	function focus(node: HTMLInputElement) {
		node.focus();
		node.select();
		return {
			update() {
				node.focus();
				node.select();
			}
		};
	}

	interface Props {
		grid: string[][];
		clues: {
			across: CrosswordQuestionType[];
			down: CrosswordQuestionType[];
		};
		title?: string;
		author?: string;
		date?: string;
		difficulty?: string;
		type?: string;
		copyright?: string;
		editor?: string;
		mode?: 'play' | 'edit' | 'grid';
		width?: number;
		height?: number;
		outerBorderWidth?: number;
		innerBorderWidth?: number;
		margin?: number;
		outerBorderColour?: string;
		innerBorderColour?: string;
		fillColour?: string;
		fontRatio?: number;
		numRatio?: number;
		selectCellColour?: string;
		selectWordColour?: string;
		backgroundColour?: string;
		debug?: boolean;
		restoreState?: boolean;
		completeAudio?: string | null;
		size?: number;
		symmetry?: boolean;
		onload?: (event: CustomEvent<any>) => void;
		ontimer?: (event: CustomEvent<any>) => void;
		oncomplete?: (event: CustomEvent<any>) => void;
		onpause?: (event: CustomEvent<any>) => void;
		onresume?: (event: CustomEvent<any>) => void;
		onreset?: (event: CustomEvent<any>) => void;
		oncheat?: (event: CustomEvent<any>) => void;
		onprogress?: (event: CustomEvent<any>) => void;
	}

	let {
		grid = $bindable([] as string[][]),
		clues = $bindable({ across: [], down: [] } as { across: CrosswordQuestionType[]; down: CrosswordQuestionType[] }),
		title = '',
		author = '',
		date = '',
		difficulty = '',
		type = '',
		copyright = '',
		editor = '',
		mode = 'play',
		width = 500,
		height = 500,
		outerBorderWidth = 1.5,
		innerBorderWidth = 1,
		margin = 3,
		outerBorderColour = 'black',
		innerBorderColour = 'black',
		fillColour = 'black',
		fontRatio = 0.8,
		numRatio = 0.25,
		selectCellColour = '#f7f457',
		selectWordColour = '#9ce0fb',
		backgroundColour = 'white',
		debug = false,
		restoreState = false,
		completeAudio = null,
		size = $bindable(15),
		symmetry = $bindable(true),
		onload = () => {},
		ontimer = () => {},
		oncomplete = () => {},
		onpause = () => {},
		onresume = () => {},
		onreset = () => {},
		oncheat = () => {},
		onprogress = () => {}
	}: Props = $props();

	// Derived editMode for backward compatibility
	let editMode = $derived(mode === 'edit' || mode === 'grid');
	let gridDrawingMode = $derived(mode === 'grid');

	// Derived properties
	let rows = $derived(grid.length || 0);
	let cols = $derived(grid[0]?.length || 0);
	let cellWidth = $derived(width / cols);
	let cellHeight = $derived(height / rows);
	let fontSize = $derived(cellWidth * fontRatio);
	let totalWidth = $derived(width + margin * 2);
	let totalHeight = $derived(height + margin * 2);
	let scalarAcross: CrosswordBlockType[] = $derived.by(() => generateAcrossScalar(grid, clues));

	let scalarDown: CrosswordBlockType[] = $derived.by(() => generateDownScalar(grid, clues));

	let acrossQuestions: CrosswordQuestionType[] = $derived.by(() => {
		// Create an array of questions from our grid
		let questions: CrosswordQuestionType[] = [];
		let scalar = scalarAcross;
		scalar.forEach((cell) => {
			if (cell.startOfWord) {
				questions.push(cell.question);
			}
		});
		return questions;
	});

	let downQuestions: CrosswordQuestionType[] = $derived.by(() => {
		let questions: CrosswordQuestionType[] = [];
		let scalar = scalarDown;
		scalar.forEach((cell) => {
			if (cell.startOfWord) {
				questions.push(cell.question);
			}
		});
		return questions;
	});

	function ensureAllQuestions() {
		// Makes sure that we have all the questions in the crossword data based on our scalars
		let changed = false;
		scalarAcross.forEach(cell => {
			if (!clues.across.some(q => q.alpha_number === cell.question.alpha_number)) {
				clues.across.push(cell.question);
				changed = true;
			}
		});
		scalarDown.forEach(cell => {
			if (!clues.down.some(q => q.alpha_number === cell.question.alpha_number)) {
				clues.down.push(cell.question);
				changed = true;
			}
		});
		if (changed) {
			clues = { ...clues };
			grid = [...grid];
		}
	}

	$effect(() => {
		ensureAllQuestions();
	});

	// Our local state
	let time_taken = $state(0);
	let incorrectGrid: boolean[][] = $derived.by(() =>
		new Array(rows).fill(false).map(() => new Array(cols).fill(false))
	);
	let correctGrid: boolean[][] = $derived.by(() =>
		new Array(rows).fill(false).map(() => new Array(cols).fill(false))
	);
	let direction = $state(0);
	let currentCell = $state([0, 0]);
	let progress = $state(0);
	let quartile = $state(0);
	let autocheck = $state(false);
	let cheated = $state(false);
	let complete = $state(false);
	let hints = $state(false);

	let localState: GameStateType = $state({
		time_taken: 0,
		autocheck: false,
		cheated: false,
		complete: false,
		hints: false,
		direction: 0, // 0 = across, 1 = down
		currentCell: [0, 0],
		grid: [] as string[][],
		correctGrid: [] as boolean[][],
		incorrectGrid: [] as boolean[][],
		progress: 0,
		quartile: 0
	});

	// Cell fill colors for reactivity
	function cellFill(col: number, row: number): string {
		if (grid[row][col] === '#') {
			if (editMode && currentCell[0] === col && currentCell[1] === row) {
				return selectCellColour;
			}
			return fillColour;
		}
		if (col === currentCell[0] && row === currentCell[1]) {
			return selectCellColour;
		}
		let scalar = direction ? scalarDown : scalarAcross;
		const currentCellBlock = scalar.find(
			(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
		);
		const cell = scalar.find((cell) => cell.x === col && cell.y === row);
		if (!cell || !currentCellBlock) return backgroundColour;
		if (cell.question.alpha_number === currentCellBlock.question.alpha_number) {
			return selectWordColour;
		}
		return backgroundColour;
	}

	// Letter classes for reactivity
	let letterClasses: string[][] = $state([]);

	// UI state
	let isHidden = $state(false);
	let isPaused = $state(true); // Start in pause mode
	let showOverlay = $state(true); // Show overlay initially
	let overlayType = $state('paused' as 'paused' | 'complete' | 'meta');
	
	// Update pause/overlay state when mode changes
	$effect(() => {
		if (mode === 'play') {
			isPaused = true;
			showOverlay = true;
		} else {
			isPaused = false;
			showOverlay = false;
		}
	});
	let showMenu = $state(false);
	let lastQuartile = $state(0);
	let storageName = $state('');
	let audio: HTMLAudioElement | null = $state(null);
	let showSuggestions = $state(false);

	// Print state
	let printMode = $state('none' as 'none' | 'blank' | 'filled');

	// Sharing
	let shareUrl = $state<string | null>(null);
	let xShareUrl = $state('');
	let whatsappShareUrl = $state('');

	// Grid drawing state
	let isDrawing = $state(false);
	let drawingAction: 'fill' | 'erase' | null = $state(null);
	let lastDrawnCell: [number, number] | null = $state(null);

	// Autofill state
	let isAutofilling = $state(false);

	// Timer
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Fireworks tracking
	let activeFireworks: any = null;
	let fireworksContainer: HTMLElement | null = null;

	// Question container references
	let questionsAcrossContainer: HTMLElement | null = null;
	let questionsDownContainer: HTMLElement | null = null;

	// Menu items for the modern hamburger menu
	const menuItems = $derived([
		{
			label: 'About This Puzzle',
			action: () => {
				showOverlay = true;
				overlayType = 'meta';
			}
		},
		{ isSeparator: true },
		{
			label: 'Autocheck',
			action: toggleAutocheck,
			isAutocheck: true
		},
		{
			label: 'Check Square',
			action: checkSquare
		},
		{
			label: 'Check Word',
			action: checkWord
		},
		{
			label: 'Check Puzzle',
			action: checkPuzzle
		},
		{ isSeparator: true },
		{
			label: 'Print (Blank)',
			action: printBlank
		},
		{
			label: 'Print (Filled)',
			action: printFilled
		},
		{ isSeparator: true },
		{
			label: 'Reset',
			action: reset,
			isDanger: true
		}
	]);

	// Check if game has been started
	const gameStarted = $derived(
		grid.some((col: string[]) => col.some((cell: string) => cell !== '' && cell !== '#'))
	);

	// Derive currentQuestion based on current cell and direction
	const currentQuestion: CrosswordQuestionType | null = $derived.by(() => {
		if (!editMode) return null;
		const scalar = direction ? scalarDown : scalarAcross;
		const currentCellBlock = scalar.find(
			(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
		);
		if (!currentCellBlock) return null;
		return currentCellBlock.question;
	});

	// Derive word suggestions based on current word pattern
	const wordSuggestions = $derived.by(() => {
		if (!currentQuestion || !editMode) return [];
		if (isWordComplete()) return [];
		const pattern = getCurrentWordPattern();
		if (pattern.includes('?')) {
			return suggest(pattern);
		}
		return [];
	});

	// Track which question is being edited (direction and number)
	let editingQuestion: { direction: number; alpha_number: string } | null = $state(null);
	let editingClueText: string = $state('');
	let clickTimeout: ReturnType<typeof setTimeout> | null = null;

	// Set CSS custom property for crossword height
	// Swing back to this once we have made the whole thing declarative
	// $effect(() => {
	// 	if (typeof document !== 'undefined' && totalHeight > 0) {
	// 		document.documentElement.style.setProperty('--crossword-height', `${totalHeight}px`);
	// 	}
	// });

	// Focus the play button when paused overlay is shown
	$effect(() => {
		// This shouldn't be an effect
		if (showOverlay && overlayType === 'paused' && typeof window !== 'undefined') {
			setTimeout(() => {
				const playButton = document.querySelector('.cool-play-button') as HTMLButtonElement;
				if (playButton) {
					playButton.focus();
				}
			}, 100);
		}
	});

	// Debug logging
	$effect(() => {
		if (!debug) return;
		console.log('clues:', $state.snapshot(clues));
		console.log('grid:', $state.snapshot(grid));
		console.log('acrossQuestions:', $state.snapshot(acrossQuestions));
		console.log('downQuestions:', $state.snapshot(downQuestions));
		console.log('currentQuestion:', $state.snapshot(currentQuestion));
		// console.log('grid:', $state.snapshot(grid));
		// console.log('scalarAcross:', $state.snapshot(scalarAcross));
		// console.log('scalarDown:', $state.snapshot(scalarDown));
		// console.log('currentCell:', $state.snapshot(currentCell));
	});

	// Sync size prop with grid size on load
	$effect(() => {
		if (editMode && grid.length > 0) {
			const gridSize = grid.length;
			if (size !== gridSize) {
				size = gridSize;
			}
		}
	});

	// Parse crossword data on mount
	onMount(() => {
		// Set up browser-specific properties
		if (typeof document !== 'undefined') {
			document.documentElement.style.setProperty('--select-word-colour', selectWordColour);
			document.documentElement.style.setProperty('--crossword-height', `${totalHeight}px`);
			if (typeof window !== 'undefined' && completeAudio) {
				audio = new Audio(completeAudio);
			}
			
			// Initialize grid size if needed
			if (editMode && size && grid.length === 0) {
				const newGrid: string[][] = [];
				for (let y = 0; y < size; y++) {
					newGrid[y] = [];
					for (let x = 0; x < size; x++) {
						newGrid[y][x] = '';
					}
				}
				grid = newGrid;
			} else if (editMode && size && grid.length > 0 && 
			          (grid.length !== size || grid[0]?.length !== size)) {
				// Sync grid size to size prop
				handleSizeChange(size);
			}
			
			// Restore state if enabled
			if (restoreState) {
				restoreGameState();
			}
			startTimer();
		}
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
		if (clickTimeout) {
			clearTimeout(clickTimeout);
			clickTimeout = null;
		}
		// Stop drawing if active
		if (isDrawing) {
			isDrawing = false;
			drawingAction = null;
			lastDrawnCell = null;
		}
		// Stop active fireworks if any
		if (activeFireworks) {
			activeFireworks.stop();
			activeFireworks = null;
		}
		if (fireworksContainer && fireworksContainer.parentNode) {
			fireworksContainer.parentNode.removeChild(fireworksContainer);
			fireworksContainer = null;
		}
		// Clean up CSS custom property
		if (typeof document !== 'undefined') {
			document.documentElement.style.removeProperty('--crossword-height');
			document.documentElement.style.removeProperty('--select-word-colour');
		}
	});

	function calculateHash(matrix: string[][]) {
		let s = '';
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				s += matrix[row][col];
			}
		}
		let hash = 0,
			chr;
		for (let i = 0; i < s.length; i++) {
			chr = s.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0;
		}
		return hash;
	}

	function hashCrosswordData(data: any): string {
		if (!data) return '';
		// Create a hash from grid and questions to detect actual changes
		let s = '';
		if (data.grid && Array.isArray(data.grid)) {
			for (let row = 0; row < data.grid.length; row++) {
				if (Array.isArray(data.grid[row])) {
					for (let col = 0; col < data.grid[row].length; col++) {
						s += data.grid[row][col] || '';
					}
				}
			}
		}
		// Include questions in hash
		const across = data.clues?.across || data.across || [];
		const down = data.clues?.down || data.down || [];
		s += JSON.stringify(
			across.map((q: any) => ({ n: q.number || q.num, c: q.clue || q.question, a: q.answer }))
		);
		s += JSON.stringify(
			down.map((q: any) => ({ n: q.number || q.num, c: q.clue || q.question, a: q.answer }))
		);

		// Simple hash function
		let hash = 0;
		for (let i = 0; i < s.length; i++) {
			const chr = s.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0;
		}
		return hash.toString();
	}

	function startTimer() {
		if (editMode) return;
		timerInterval = setInterval(() => {
			if (isHidden || isPaused || complete) return;
			time_taken++;
			saveGameState();
			ontimer(new CustomEvent('timer', { detail: localState }));
		}, 1000);
	}

	function saveGameState() {
		if (debug) console.log('Saving State');
		localStorage.setItem(storageName, JSON.stringify(localState));
	}

	function restoreGameState() {
		const data = localStorage.getItem(storageName);
		if (data) {
			const restoredState = JSON.parse(data);
			// Merge restored state with current state to preserve any new properties
			localState = { ...localState, ...restoredState };

			// Update visual state
			setAutocheck();

			// Update cell fills and letter classes to reflect restored state
			// updateCellFills();
			// updateLetterClasses();

			// If the game was completed, show the completion screen
			if (complete) {
				showOverlay = true;
				overlayType = 'complete';
				// Set up sharing URLs for completed game
				setupSharing();
				// Don't play audio or trigger fireworks on restore
				// displayWin();
			}

			if (debug) console.log('State Restored', $state.snapshot(localState));
		}
	}

	function updateLetterClasses() {
		const localLetterClasses = new Array(rows)
			.fill('')
			.map(() => new Array(cols).fill('letter-text'));
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				if (grid[row][col] !== '#') {
					let classes = ['letter-text'];
					if (correctGrid[row][col]) {
						classes.push('correct');
					} else if (incorrectGrid && incorrectGrid[row][col] && grid[row][col] !== '') {
						classes.push('incorrect');
					}
					localLetterClasses[row][col] = classes.join(' ');
				}
			}
		}
		letterClasses = localLetterClasses;
	}

	function setAutocheck() {
		if (autocheck) {
			checkPuzzle();
		}
	}

	function checkPuzzle() {
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				checkTile(col, row);
			}
		}
	}

	function checkTile(x: number, y: number) {
		if (grid[y][x] === '#') return;
		if (correctGrid[y][x]) return;
		if (grid[y][x] === grid[y][x]) {
			correctGrid[y][x] = true;
			incorrectGrid[y][x] = false; // Clear incorrect if it was marked
		} else if (grid[y][x] && grid[y][x] !== '') {
			incorrectGrid[y][x] = true;
		}
		// updateLetterClasses();
	}

	// Event handlers
	function handleKeyPress(event: KeyboardEvent) {
		if (event.metaKey) return;
		
		// Ignore keyboard events when focus is on an input, textarea, or other editable element
		const activeElement = document.activeElement;
		if (activeElement) {
			const tagName = activeElement.tagName;
			const isEditable = (activeElement instanceof HTMLElement && activeElement.isContentEditable) ||
				activeElement.closest('dialog') ||
				activeElement.closest('[role="dialog"]');
			if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isEditable) {
				return;
			}
		}
		
		const printable = event.key.length === 1 && /^[a-zA-Z]$/.test(event.key);

		if (isPaused) return;

		if (printable && (editMode || !complete)) {
			const letter = event.key.toUpperCase();
			typeLetter(letter);
			return;
		}
		if (editMode && ['.', '#'].includes(event.key)) {
			toggleCell(currentCell[0], currentCell[1]);
			if (direction === 0) {
				currentCell = [currentCell[0] + 1, currentCell[1]];
			} else {
				currentCell = [currentCell[0], currentCell[1] + 1];
			}
			// moveToNext();
			return;
		}
		if (event.key === 'Backspace') {
			// Backspace
			event.preventDefault();
			if (editMode || !complete) {
				deleteLetter();
			}
		} else if (event.code === 'Space') {
			// Space
			event.preventDefault();
			moveToNext();
		} else if (event.key === 'Tab') {
			// Tab
			event.preventDefault();
			if (event.shiftKey) {
				moveToPreviousWord();
			} else {
				moveToNextWord();
			}
		} else if (event.key === 'Enter') {
			// Enter
			event.preventDefault();
			if (editMode) {
				if (!currentQuestion) return;
				// Start editing the current question in edit mode
				startEditingQuestion(currentQuestion);
				return;
			} else {
				// Normal navigation behavior when not in edit mode
				if (event.shiftKey) {
					moveToPreviousWord();
				} else {
					moveToNextWord();
				}
			}
		} else if (event.key === 'ArrowLeft') {
			// Left
			event.preventDefault();
			moveLeft();
		} else if (event.key === 'ArrowUp') {
			// Up
			event.preventDefault();
			moveUp();
		} else if (event.key === 'ArrowRight') {
			// Right
			event.preventDefault();
			moveRight();
		} else if (event.key === 'ArrowDown') {
			// Down
			event.preventDefault();
			moveDown();
		}
	}

	function typeLetter(letter: string) {
		if (!editMode && correctGrid[currentCell[1]][currentCell[0]]) {
			moveToNextCell();
			return;
		}

		const hasLetter: boolean = !!grid[currentCell[1]][currentCell[0]];
		
		// In edit mode, update the underlying crosswordData grid
		if (editMode) {
			grid[currentCell[1]][currentCell[0]] = letter;
		} else {
			// In play mode, update the local grid
			grid[currentCell[1]][currentCell[0]] = letter;
			grid = [...grid];
		}

		// Clear incorrect marking when user types a new letter
		incorrectGrid[currentCell[1]][currentCell[0]] = false;

		// setScalars(letter, currentCell[0], currentCell[1]);
		checkWin();
		if (!hasLetter) {
			moveToNext();
		} else {
			moveToNextCell();
		}

		// Save state after typing
		saveGameState();
	}

	function deleteLetter() {
		if (editMode) {
			grid[currentCell[1]][currentCell[0]] = '';
			grid = [...grid];
			// Also update the underlying crosswordData grid
			grid[currentCell[1]][currentCell[0]] = '';
			moveToPreviousLetter();
			return;
		}
		incorrectGrid[currentCell[1]][currentCell[0]] = false;

		if (correctGrid[currentCell[1]][currentCell[0]]) {
			moveToPreviousLetter();
			return;
		}

		if (!grid[currentCell[1]][currentCell[0]]) {
			moveToPreviousLetter();
			if (correctGrid[currentCell[1]][currentCell[0]]) return;
		}

		grid[currentCell[1]][currentCell[0]] = '';
		grid = [...grid];
		saveGameState();
		calculateComplete();
	}

	function moveToNextCell() {
		let scalar = direction ? scalarDown : scalarAcross;
		const currentScalarIndex = scalar.findIndex(
			(item) => item.x === currentCell[0] && item.y === currentCell[1]
		);

		if (currentScalarIndex < scalar.length - 1) {
			currentCell = [scalar[currentScalarIndex + 1].x, scalar[currentScalarIndex + 1].y];
		} else {
			currentCell = [scalar[0].x, scalar[0].y];
		}
	}

	// Helper function to check if a cell should be considered "blank" for navigation
	function isCellBlank(x: number, y: number) {
		const hasLetter = grid[y][x] !== '';
		const isIncorrect = incorrectGrid && incorrectGrid[y][x];
		return !hasLetter || isIncorrect;
	}

	function moveToNext() {
		let nextCell = null;
		let scalar = direction ? scalarDown : scalarAcross;
		let otherScalar = direction ? scalarAcross : scalarDown;

		let cursor = scalar.findIndex((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);

		if (editMode) {
			for (let i = cursor + 1; i < scalar.length; i++) {
				if (scalar[i].letter !== '#') {
					nextCell = scalar[i];
					break;
				}
			}
		} else {
			for (let i = cursor + 1; i < scalar.length; i++) {
				if (isCellBlank(scalar[i].x, scalar[i].y)) {
					nextCell = scalar[i];
					break;
				}
			}
		}

		if (nextCell) {
			currentCell = [nextCell.x, nextCell.y];
		} else {
			if (editMode) {
				currentCell = [otherScalar[0].x, otherScalar[0].y];
				direction = direction ? 0 : 1;
				return;
			}
			const nextBlank = otherScalar.findIndex((cell) => isCellBlank(cell.x, cell.y));
			if (nextBlank !== -1) {
				currentCell = [otherScalar[nextBlank].x, otherScalar[nextBlank].y];
				direction = direction ? 0 : 1;
			} else {
				direction = direction ? 0 : 1;
			}
		}
	}

	function moveToPreviousLetter() {
		let scalar = direction ? scalarDown : scalarAcross;
		const currentCellBlock = scalar.find(
			(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
		);
		const cell = scalar.find((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);
		if (!cell || !currentCellBlock) return backgroundColour;
		let cursor = scalar.findIndex((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);
		if (cursor > 0) {
			currentCell = [scalar[cursor - 1].x, scalar[cursor - 1].y];
		} else {
			currentCell = [scalar[scalar.length - 1].x, scalar[scalar.length - 1].y];
		}
	}

	function moveToNextWord() {
		let nextCell: CrosswordBlockType | null = null;
		let scalar = direction ? scalarDown : scalarAcross;
		let otherScalar = direction ? scalarAcross : scalarDown;
		let cursor = scalar.findIndex((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);
		if (cursor === -1) return;

		for (let i = cursor + 1; i < scalar.length; i++) {
			if (scalar[i].startOfWord) {
				nextCell = scalar[i];
				break;
			}
		}

		if (nextCell) {
			currentCell = [nextCell.x, nextCell.y];
		} else {
			if (editMode) {
				currentCell = [otherScalar[0].x, otherScalar[0].y];
				direction = direction ? 0 : 1;
				return;
			}
			const nextBlank = otherScalar.findIndex((cell) => isCellBlank(cell.x, cell.y));
			if (nextBlank !== -1) {
				currentCell = [otherScalar[nextBlank].x, otherScalar[nextBlank].y];
				direction = direction ? 0 : 1;
			} else {
				direction = direction ? 0 : 1;
			}
		}
	}

	function moveToPreviousWord() {
		let prevCell: CrosswordBlockType | null = null;
		let scalar = direction ? scalarDown : scalarAcross;
		let otherScalar = direction ? scalarAcross : scalarDown;

		let cursor = scalar.findIndex((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);

		if (cursor === -1) return;

		if (editMode) {
			for (let i = cursor - 1; i >= 0; i--) {
				if (scalar[i].startOfWord) {
					prevCell = scalar[i];
					break;
				}
			}
		} else {
			for (let i = cursor - 1; i >= 0; i--) {
				if (isCellBlank(scalar[i].x, scalar[i].y)) {
					prevCell = scalar[i];
					break;
				}
			}
		}

		if (prevCell) {
			currentCell = [prevCell!.x, prevCell!.y];
		} else {
			if (editMode) {
				// We want to go to the last word in the other direction
				for (let i = otherScalar.length - 1; i >= 0; i--) {
					if (otherScalar[i].startOfWord) {
						currentCell = [otherScalar[i].x, otherScalar[i].y];
						break;
					}
				}
				direction = direction ? 0 : 1;
				return;
			}
			const nextBlank = otherScalar.findIndex((cell) => isCellBlank(cell.x, cell.y));
			if (nextBlank !== -1) {
				currentCell = [otherScalar[nextBlank].x, otherScalar[nextBlank].y];
				direction = direction ? 0 : 1;
			} else {
				direction = direction ? 0 : 1;
			}
		}
	}

	function changeDirection() {
		const word = getWord(!direction, currentCell[0], currentCell[1]);
		if (!word) return;
		direction = direction ? 0 : 1;
	}

	function getWord(direction: boolean, x: number, y: number) {
		if (!direction) {
			return scalarAcross.find((cell) => x === cell.x && y === cell.y);
		} else {
			return scalarDown.find((cell) => x === cell.x && y === cell.y);
		}
	}

	function checkWin() {
		if (editMode) return;
		// If all "correct" in our scalars, we win
		let allCorrect =
			scalarAcross.every((scalar) => scalar.correct) &&
			scalarDown.every((scalar) => scalar.correct);
		if (allCorrect) {
			displayWin();
			return;
		}
	}

	function displayWin() {
		if (editMode) return;
		complete = true;
		showOverlay = true;
		overlayType = 'complete';
		if (audio) audio.play();
		oncomplete(new CustomEvent('complete', { detail: localState }));

		// Set up sharing URLs
		setupSharing();

		// Fireworks - display across entire viewport
		setTimeout(() => {
			try {
				// Create a full-screen fireworks container
				fireworksContainer = document.createElement('div');
				fireworksContainer.style.position = 'fixed';
				fireworksContainer.style.top = '0';
				fireworksContainer.style.left = '0';
				fireworksContainer.style.width = '100vw';
				fireworksContainer.style.height = '100vh';
				fireworksContainer.style.pointerEvents = 'none';
				fireworksContainer.style.zIndex = '9999';
				document.body.appendChild(fireworksContainer);

				activeFireworks = new Fireworks(fireworksContainer, {
					acceleration: 1,
					traceSpeed: 2.5,
					friction: 0.95,
					gravity: 0.8,
					particles: 50,
					traceLength: 3,
					explosion: 5,
					intensity: 30,
					flickering: 50,
					lineStyle: 'round',
					hue: { min: 0, max: 360 },
					delay: { min: 15, max: 30 },
					rocketsPoint: { min: 50, max: 50 },
					lineWidth: { explosion: { min: 1, max: 3 }, trace: { min: 1, max: 1 } },
					brightness: { min: 50, max: 80 },
					decay: { min: 0.015, max: 0.03 },
					mouse: { click: false, move: false, max: 1 }
				});
				activeFireworks.start();

				// Clean up fireworks after 30 seconds for a longer celebration
				setTimeout(() => {
					if (activeFireworks) {
						activeFireworks.stop();
						activeFireworks = null;
					}
					if (fireworksContainer && fireworksContainer.parentNode) {
						fireworksContainer.parentNode.removeChild(fireworksContainer);
						fireworksContainer = null;
					}
				}, 30000);
			} catch (error) {
				console.error('Fireworks error:', error);
			}
		}, 500);
	}

	function calculateComplete() {
		let filled = 0;
		let total_cells = 0;
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				if (grid[row][col] !== '#') {
					total_cells++;
					if (grid[row][col]) {
						filled++;
					}
				}
			}
		}
		const filled_percent = Math.floor((filled / total_cells) * 100);
		progress = filled_percent;
		quartile = Math.floor(filled_percent / 25);
		if (quartile > lastQuartile) {
			onprogress(new CustomEvent('progress', { detail: localState }));
			lastQuartile = quartile;
		}
	}

	// Navigation functions
	function moveLeft() {
		if (direction) {
			direction = 0;
		} else {
			const scalar = scalarAcross;
			const cursor = scalar.findIndex(
				(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
			);
			if (cursor === -1) return;
			if (scalar[cursor - 1] !== undefined) {
				currentCell = [scalar[cursor - 1].x, scalar[cursor - 1].y];
			} else {
				currentCell = [scalar[scalar.length - 1].x, scalar[scalar.length - 1].y];
			}
		}
	}

	function moveUp() {
		if (!direction) {
			direction = 1;
		} else {
			const scalar = scalarDown;
			const cursor = scalar.findIndex(
				(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
			);
			if (cursor === -1) return;
			if (scalar[cursor - 1] !== undefined) {
				currentCell = [scalar[cursor - 1].x, scalar[cursor - 1].y];
			} else {
				currentCell = [scalar[scalar.length - 1].x, scalar[scalar.length - 1].y];
			}
		}
	}

	function moveRight() {
		if (direction) {
			direction = 0;
		} else {
			const scalar = scalarAcross;
			const cursor = scalar.findIndex(
				(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
			);
			if (cursor === -1) return;
			if (scalar[cursor + 1]) {
				currentCell = [scalar[cursor + 1].x, scalar[cursor + 1].y];
			} else {
				currentCell = [scalar[0].x, scalar[0].y];
			}
		}
	}

	function moveDown() {
		if (!direction) {
			direction = 1;
		} else {
			const scalar = scalarDown;
			const cursor = scalar.findIndex(
				(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
			);
			if (cursor === -1) return;
			if (scalar[cursor + 1] !== undefined) {
				currentCell = [scalar[cursor + 1].x, scalar[cursor + 1].y];
			} else {
				currentCell = [scalar[0].x, scalar[0].y];
			}
		}
	}

	function handleCellClick(col: number, row: number) {
		// Don't handle normal clicks when in grid drawing mode
		if (gridDrawingMode && editMode) return;
		// In fill mode, clicks still work for navigation - autofill is only triggered by button
		
		if (col === currentCell[0] && row === currentCell[1]) {
			changeDirection();
		} else {
			currentCell = [col, row];
			const word = getWord(!!direction, col, row);
			if (!word) changeDirection();
		}
	}

	function handleCellDoubleClick(col: number, row: number) {
		if (!editMode) return;
		if (grid[row][col] !== '' && grid[row][col] !== '#') return;
		toggleCell(col, row);
	}

	function toggleCell(x: number, y: number) {
		if (!editMode) return;
		const wasBlack = grid[y][x] === '#';
		const action = wasBlack ? 'erase' : 'fill';
		
		if (wasBlack) {
			grid[y][x] = '';
		} else {
			grid[y][x] = '#';
		}
		
		// Apply symmetry if enabled
		if (symmetry) {
			applySymmetry(x, y, action);
		}
		
		grid = [...grid];
	}

	function handleCellMouseDown(col: number, row: number, event: MouseEvent) {
		if (!editMode || !gridDrawingMode) return;
		
		// Only start drawing on cells that can be toggled (empty or black squares)
		if (grid[row][col].trim() !== '' && grid[row][col].trim() !== '#') return;

		event.preventDefault();
		isDrawing = true;
		
		// Determine the action based on the initial cell state
		const isBlack = grid[row][col] === '#';
		drawingAction = isBlack ? 'erase' : 'fill';
		
		// Apply the action to the initial cell
		applyDrawingAction(col, row);
		lastDrawnCell = [col, row];
	}

	function handleCellMouseMove(col: number, row: number, event: MouseEvent) {
		if (!editMode || !gridDrawingMode || !isDrawing || !drawingAction) return;
		
		// Only draw on cells that can be toggled
		if (grid[row][col].trim() !== '' && grid[row][col].trim() !== '#') return;
		
		// Prevent drawing on the same cell multiple times
		if (lastDrawnCell && lastDrawnCell[0] === col && lastDrawnCell[1] === row) return;
		
		event.preventDefault();
		applyDrawingAction(col, row);
		lastDrawnCell = [col, row];
	}

	function handleCellMouseUp() {
		if (isDrawing) {
			isDrawing = false;
			drawingAction = null;
			lastDrawnCell = null;
		}
	}

	function applyDrawingAction(x: number, y: number) {
		if (!drawingAction) return;
		
		if (drawingAction === 'fill') {
			if (grid[y][x] !== '#') {
				grid[y][x] = '#';
			}
		} else if (drawingAction === 'erase') {
			if (grid[y][x] === '#') {
				grid[y][x] = '';
			}
		}
		
		// Apply symmetry if enabled
		if (symmetry && editMode) {
			applySymmetry(x, y, drawingAction);
		}
		
		grid = [...grid];
	}

	function applySymmetry(x: number, y: number, action: 'fill' | 'erase') {
		// Calculate symmetric position (180-degree rotation)
		const symX = cols - 1 - x;
		const symY = rows - 1 - y;
		
		// Don't apply symmetry if it's the same cell (center cell)
		if (symX === x && symY === y) return;
		
		// Apply the same action to the symmetric cell
		if (action === 'fill') {
			if (grid[symY] && grid[symY][symX] !== '#') {
				grid[symY][symX] = '#';
			}
		} else if (action === 'erase') {
			if (grid[symY] && grid[symY][symX] === '#') {
				grid[symY][symX] = '';
			}
		}
	}

	function handleSizeChange(newSize: number) {
		console.log('handleSizeChange', newSize, size);
		if (newSize === size) return;
		
		const oldSize = size;
		size = newSize;
		
		// Resize the grid
		if (newSize > oldSize) {
			// Expand grid
			const currentGrid = grid;
			const newGrid: string[][] = [];
			
			for (let y = 0; y < newSize; y++) {
				newGrid[y] = [];
				for (let x = 0; x < newSize; x++) {
					if (y < currentGrid.length && x < currentGrid[y]?.length) {
						newGrid[y][x] = currentGrid[y][x] || '';
					} else {
						newGrid[y][x] = '';
					}
				}
			}
			
			grid = newGrid;
		} else {
			// Shrink grid
			const newGrid: string[][] = [];
			for (let y = 0; y < newSize; y++) {
				newGrid[y] = [];
				for (let x = 0; x < newSize; x++) {
					newGrid[y][x] = grid[y]?.[x] || '';
				}
			}
			
			grid = newGrid;
		}
		
		grid = [...grid];
	}

	function formatTime(t: number) {
		const hours = Math.floor(t / 3600);
		const minutes = Math.floor((t - hours * 3600) / 60);
		const seconds = t - hours * 3600 - minutes * 60;

		const h = hours < 10 ? '0' + hours : hours;
		const m = minutes < 10 ? '0' + minutes : minutes;
		const s = seconds < 10 ? '0' + seconds : seconds;
		return h + ':' + m + ':' + s;
	}

	function humanTime() {
		const seconds = time_taken;
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const secondsLeft = seconds - minutes * 60;
		const minutesLeft = minutes - hours * 60;
		const seconds_plural = secondsLeft == 1 ? '' : 's';
		const minutes_plural = minutesLeft == 1 ? '' : 's';
		const hours_plural = hours == 1 ? '' : 's';

		if (hours == 0 && minutes == 0) {
			return `${seconds} second${seconds_plural}`;
		}
		if (hours == 0) {
			return `${minutes} minute${minutes_plural} and ${secondsLeft} second${seconds_plural}`;
		}
		return `${hours} hour${hours_plural}, ${minutesLeft} minute${minutes_plural} and ${secondsLeft} second${seconds_plural}`;
	}

	function pause() {
		isPaused = !isPaused;
		if (isPaused) {
			showOverlay = true;
			overlayType = 'paused';
			onpause(new CustomEvent('pause', { detail: localState }));
		} else {
			showOverlay = false;
			onresume(new CustomEvent('resume', { detail: localState }));
		}
	}

	function reset() {
		// Stop active fireworks if any
		if (activeFireworks) {
			activeFireworks.stop();
			activeFireworks = null;
		}
		if (fireworksContainer && fireworksContainer.parentNode) {
			fireworksContainer.parentNode.removeChild(fireworksContainer);
			fireworksContainer = null;
		}

		const localCheated = cheated;
		// initializeState();
		cheated = localCheated;
		// Explicitly turn off autocheck when resetting
		autocheck = false;
		saveGameState();
		isPaused = true;
		showOverlay = true;
		overlayType = 'paused';
		showMenu = false;
		onreset(new CustomEvent('reset', { detail: localState }));
	}

	function toggleAutocheck() {
		autocheck = !autocheck;
		if (autocheck) {
			checkPuzzle();
			cheated = true;
			oncheat(new CustomEvent('cheat', { detail: localState }));
		}
		saveGameState();
		showMenu = false;
	}

	function checkSquare() {
		checkTile(currentCell[0], currentCell[1]);
		cheated = true;
		saveGameState();
		showMenu = false;
	}

	function checkWord() {
		let scalar = direction ? scalarDown : scalarAcross;
		let startOfCurrentWord = findStartOfCurrentWord();
		if (!startOfCurrentWord) return;
		checkTile(startOfCurrentWord.x, startOfCurrentWord.y);
		let i = startOfCurrentWord.letter_index + 1;
		while (scalar[i] && !scalar[i].startOfWord) {
			checkTile(scalar[i].x, scalar[i].y);
			i++;
		}
		cheated = true;
		saveGameState();
		showMenu = false;
	}

	function findStartOfCurrentWord() {
		let scalar = direction ? scalarDown : scalarAcross;
		let cursor = scalar.find((cell) => cell.x === currentCell[0] && cell.y === currentCell[1]);
		let startOfCurrentWord = null;
		for (let x = cursor?.letter_index ?? 0; x >= 0; x--) {
			if (scalar[x].startOfWord) {
				startOfCurrentWord = scalar[x];
				break;
			}
		}
		return startOfCurrentWord;
	}

	function getCurrentWordPattern() {
		if (!currentQuestion) return '';
		const scalar = direction ? scalarDown : scalarAcross;
		const questionCells = scalar.filter((cell) => cell.question.alpha_number === currentQuestion.alpha_number);
		return questionCells.map((cell) => cell.letter).join('');
	}

	function isWordComplete() {
		const pattern = getCurrentWordPattern();
		return !pattern.includes('?');
	}

	function startEditingQuestion(question: CrosswordQuestionType) {
		if (!editMode) return;
		// Cancel any pending single click
		if (clickTimeout) {
			clearTimeout(clickTimeout);
			clickTimeout = null;
		}
		// Make this question the current question
		moveToQuestion(question);
		editingQuestion = { direction: question.direction, alpha_number: question.alpha_number || '' };
		editingClueText = question.clue || '';
	}

	function handleQuestionClick(question: CrosswordQuestionType) {
		moveToQuestion(question);
		return;
	}

	function cancelEditingQuestion() {
		editingQuestion = null;
		editingClueText = '';
	}

	function saveQuestionClue(moveToNext: boolean = false) {
		if (!editingQuestion) return;
		const clue = editingClueText;
		const questionList = editingQuestion.direction === 1 
			? clues.down 
			: clues.across;
		const questionIndex = questionList.findIndex(q => q.alpha_number === editingQuestion!.alpha_number);
		if (questionIndex !== -1) {
			questionList[questionIndex].clue = clue;
			// Trigger reactivity
		} else {
			questionList.push({
				direction: editingQuestion!.direction,
				alpha_number: editingQuestion!.alpha_number,
				clue: clue,
				answer: getCurrentWordPattern()
			});
			
		}
		
		if (moveToNext) {
			// Find the next question to edit
			const nextQuestion = findNextQuestion(editingQuestion);
			if (nextQuestion) {
				editingQuestion = { direction: nextQuestion.direction, alpha_number: nextQuestion.alpha_number || '' };
				editingClueText = nextQuestion.clue || '';
				moveToQuestion(nextQuestion);
			} else {
				editingQuestion = null;
				editingClueText = '';
			}
		} else {
			// Stop editing
			editingQuestion = null;
			editingClueText = '';
		}
	}

	function findNextQuestion(current: { direction: number; alpha_number: string }): CrosswordQuestionType | null {
		const currentList = current.direction === 1 
			? clues.down 
			: clues.across;
		const currentIndex = currentList.findIndex(q => q.alpha_number === current.alpha_number);
		
		if (currentIndex === -1) return null;
		
		// Try next question in the same direction
		if (currentIndex < currentList.length - 1) {
			return { ...currentList[currentIndex + 1], direction: current.direction };
		}
		
		// If at the end of current list, try the first question in the other direction
		const otherList = current.direction === 1 
			? clues.across 
			: clues.down;
		if (otherList.length > 0) {
			return { ...otherList[0], direction: current.direction === 1 ? 0 : 1 };
		}
		
		// If no other questions, wrap to the first question in the same direction
		if (currentList.length > 0) {
			return { ...currentList[0], direction: current.direction };
		}
		
		return null;
	}

	function isQuestionBeingEdited(question: CrosswordQuestionType): boolean {
		if (!editingQuestion) return false;
		return editingQuestion.direction === question.direction && 
		       editingQuestion.alpha_number === question.alpha_number;
	}

	function fillWordFromSuggestion(suggestion: string) {
		if (!currentQuestion) return;
		const scalar = direction ? scalarDown : scalarAcross;
		const questionCells = scalar.filter((cell) => cell.question.alpha_number === currentQuestion.alpha_number);
		
		suggestion = suggestion.toUpperCase();
		if (suggestion.length !== questionCells.length) return;
		
		for (let i = 0; i < questionCells.length; i++) {
			const cell = questionCells[i];
			grid[cell.y][cell.x] = suggestion[i];
		}
		grid = [...grid];
		
		// Update the answer in the question
		const questionList = direction ? clues.down : clues.across;
		const questionIndex = questionList.findIndex(q => q.alpha_number === currentQuestion.alpha_number);
		if (questionIndex !== -1) {
			questionList[questionIndex].answer = suggestion;
		}
	}

	function fillLetterAtIndex(index: number, letter: string) {
		if (!currentQuestion) return;
		const scalar = direction ? scalarDown : scalarAcross;
		const questionCells = scalar.filter((cell) => cell.question.alpha_number === currentQuestion.alpha_number);
		
		if (index < 0 || index >= questionCells.length) return;
		const cell = questionCells[index];
		if (letter === '') {
			grid[cell.y][cell.x] = '';
		} else {
			grid[cell.y][cell.x] = letter.toUpperCase();
		}
		grid = [...grid];
		
		// Update the underlying crosswordData grid as well
		grid[cell.y][cell.x] = letter === '' ? '' : letter.toUpperCase();
		
		// Update answer
		const pattern = getCurrentWordPattern();
		const questionList = direction ? clues.down : clues.across;
		const questionIndex = questionList.findIndex(q => q.alpha_number === currentQuestion.alpha_number);
		if (questionIndex !== -1) {
			questionList[questionIndex].answer = pattern;
		}
	}

	function handleMobileKeyPress(event: CustomEvent) {
		const { key } = event.detail;
		if (key === 'BACKSPACE') {
			deleteLetter();
		} else {
			typeLetter(key);
		}
	}

	function getCellClass(x: number, y: number) {
		let classes = ['cell'];
		if (grid[y][x] === '#') {
			classes.push('blank');
		} else {
			classes.push('letter');
		}
		if (x === currentCell[0] && y === currentCell[1]) {
			classes.push('current');
		}
		return classes.join(' ');
	}

	function getNumber(x: number, y: number) {
		if (!isStartOfAcross(grid, x, y) && !isStartOfDown(grid, x, y)) {
			return null;
		}

		let num = 1;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				if (x === c && y === r) {
					return num;
				}
				if (isStartOfAcross(grid, c, r) || isStartOfDown(grid, c, r)) {
					num++;
				}
			}
		}
		return null;
	}

	function isQuestionActive(question: CrosswordQuestionType) {
		const scalar = direction ? scalarDown : scalarAcross;
		const currentCellBlock = scalar.find(
			(cell) => cell.x === currentCell[0] && cell.y === currentCell[1]
		);
		if (!currentCellBlock) return false;
		return currentCellBlock.question.alpha_number === question.alpha_number;
	}

	function moveToQuestion(question: CrosswordQuestionType) {
		// Determine if this is an across or down question
		const isAcross = question.direction === 0;
		const scalar = isAcross ? scalarAcross : scalarDown;

		// Find the question in the appropriate scalar array
		let targetQuestion = null;
		if (isAcross) {
			targetQuestion = scalar.find((cell) => cell.question.alpha_number === question.alpha_number);
		} else {
			targetQuestion = scalar.find((cell) => cell.question.alpha_number === question.alpha_number);
		}

		if (!targetQuestion) return;

		if (editMode) {
			currentCell = [targetQuestion.x, targetQuestion.y];
			direction = question.direction;
			return;
		}

		let questionCells = scalar.filter(
			(cell) => cell.question.alpha_number === question.alpha_number
		);

		// Find the first available square (empty or incorrect)
		let targetCell = null;
		for (let cell of questionCells) {
			const hasLetter = grid[cell.y][cell.x] !== '';
			const isIncorrect = incorrectGrid && incorrectGrid[cell.y][cell.x];

			// Available if: empty, or incorrect (can be overwritten)
			if (!hasLetter || isIncorrect) {
				targetCell = cell;
				break;
			}
		}

		// If no available squares found, go to the first square
		if (!targetCell) {
			targetCell = questionCells[0];
		}

		if (targetCell) {
			// Set the current cell to the target cell
			currentCell = [targetCell.x, targetCell.y];

			// Set the direction to match the question
			direction = isAcross ? 0 : 1;
			// Scroll the active question into view
			scrollToActiveQuestion(question);
		}
	}

	function scrollToActiveQuestion(question: any) {
		// Use setTimeout to ensure the DOM has updated with the active class
		setTimeout(() => {
			const isAcross = question.num.startsWith('A');
			const questionContainer = isAcross ? questionsAcrossContainer : questionsDownContainer;

			if (questionContainer) {
				const activeButton = questionContainer.querySelector('.questions-list-item.active');

				if (activeButton) {
					// Use scrollIntoView with block: 'nearest' to avoid window scrolling
					activeButton.scrollIntoView({
						behavior: 'smooth',
						block: 'nearest',
						inline: 'nearest'
					});
				}
			}
		}, 10);
	}

	function printBlank() {
		printMode = 'blank';
		// Small delay to ensure the DOM updates before printing
		setTimeout(() => {
			window.print();
			printMode = 'none';
		}, 100);
	}

	function printFilled() {
		printMode = 'filled';
		// Small delay to ensure the DOM updates before printing
		setTimeout(() => {
			window.print();
			printMode = 'none';
		}, 100);
	}

	function setupSharing() {
		const timeTaken = humanTime();
		const productName = 'Daily Maverick Crossword';
		const encodedProductName = encodeURIComponent(productName);
		const encodedTimeTaken = encodeURIComponent(timeTaken);

		// Get current URL or use a default
		const urlParams = new URLSearchParams(window.location.search);
		shareUrl = urlParams.get('share_url') || window.location.href;
		const encodedShareUrl = encodeURIComponent(shareUrl || window.location.href);

		// Create sharing URLs
		xShareUrl = `https://x.com/intent/tweet?text=🎉%20I%20just%20completed%20the%20${encodedProductName}%20in%20${encodedTimeTaken}!%20🧩%20Can%20you%20beat%20my%20time?%20🏆&url=${encodedShareUrl}`;
		whatsappShareUrl = `whatsapp://send?text=🎉%20I%20just%20completed%20the%20${encodedProductName}%20in%20${encodedTimeTaken}!%20🧩%20Can%20you%20beat%20my%20time?%20🏆%20${encodedShareUrl}`;
	}

	function copyToClipboard() {
		const timeTaken = humanTime();
		const productName = 'Daily Maverick Crossword';
		const text = `🎉 I just completed the ${productName} in ${timeTaken}! 🧩 Can you beat my time? 🏆 ${shareUrl || window.location.href}`;

		navigator.clipboard
			.writeText(text)
			.then(() => {
				// Show a brief confirmation
				const button = document.querySelector('.overlay-share-option-clipboard');
				const originalText = button?.textContent || '';
				if (button) {
					button.textContent = '✓ Copied!';
					setTimeout(() => {
						if (button) button.textContent = originalText;
					}, 2000);
				}
			})
			.catch((err) => {
				console.error('Failed to copy text: ', err);
			});
	}

	// Expose autofill function for external use
	export async function autofill() {
		if (mode !== 'edit' || isAutofilling) return;
		
		isAutofilling = true;
		
		try {
			console.log('Starting autofill...');
			console.log('Grid size:', grid.length, 'x', grid[0]?.length);
			console.log('scalarAcross length:', scalarAcross.length);
			console.log('scalarDown length:', scalarDown.length);
			console.log('scalarAcross blocks with startOfWord:', scalarAcross.filter(b => b.startOfWord).length);
			console.log('scalarDown blocks with startOfWord:', scalarDown.filter(b => b.startOfWord).length);
			
			const emptyWordsBefore = findEmptyWords(grid, scalarAcross, scalarDown);
			console.log('Empty words count before:', emptyWordsBefore.length);
			
			// Debug: show what patterns we're finding
			for (const block of scalarAcross.filter(b => b.startOfWord)) {
				const pattern = getWordPattern(grid, scalarAcross, block);
				console.log(`Across word ${block.question.alpha_number}: pattern="${pattern}", length=${pattern.length}`);
			}
			for (const block of scalarDown.filter(b => b.startOfWord)) {
				const pattern = getWordPattern(grid, scalarDown, block);
				console.log(`Down word ${block.question.alpha_number}: pattern="${pattern}", length=${pattern.length}`);
			}
			
			const result = await simpleAutofill(
				{ grid, clues },
				scalarAcross,
				scalarDown
			);
			
			console.log('Autofill result:', result);
			console.log(`Completed: ${result.success ? 'Yes' : 'No'}, Iterations: ${result.iterations}`);
			
			// Update the grid with autofilled words - create new arrays for reactivity
			grid = result.grid.map((row) => [...row]);
			
			const emptyWordsAfter = findEmptyWords(grid, scalarAcross, scalarDown);
			console.log('Empty words count after:', emptyWordsAfter.length);
			console.log(`Autofilled ${result.filledCount} words`);
		} catch (error) {
			console.error('Autofill error:', error);
		} finally {
			isAutofilling = false;
		}
	}
</script>

<svelte:window 
	onkeydown={handleKeyPress}
	onmouseup={handleCellMouseUp}
/>

<div class="crossword-container">
	<!-- Print title (only visible when printing) -->
	{#if printMode !== 'none'}
		<div class="print-title">
			<h1>{title || 'Crossword'}</h1>
			<p class="print-mode">{printMode === 'blank' ? 'Print (Blank)' : 'Print (Filled)'}</p>
		</div>
	{/if}

	<div class="play-area">
		<div class="grid-container">
			<div class="header">
				{#if mode === 'play'}
				<nav class="controls">
					<HamburgerMenu
						onToggle={() => (showMenu = !showMenu)}
						{menuItems}
						onItemClick={() => (showMenu = false)}
						onBackdropClick={() => (showMenu = false)}
					/>
				</nav>
				{/if}

				{#if mode === 'grid'}
					<div class="grid-mode-controls">
						<div class="grid-size-control">
							<label for="grid-size-slider" class="grid-size-label">Size: {size}x{size}</label>
							<input
								id="grid-size-slider"
								type="range"
								min="5"
								max="30"
								value={size}
								oninput={(e) => handleSizeChange(parseInt((e.target as HTMLInputElement).value))}
								class="grid-size-slider"
							/>
						</div>
						<div class="grid-symmetry-control">
							<input
								type="checkbox"
								id="grid-symmetry"
								bind:checked={symmetry}
								class="grid-symmetry-checkbox"
							/>
							<label for="grid-symmetry" class="grid-symmetry-label">Symmetry</label>
						</div>
					</div>
				{/if}

				<!-- Autocheck indicator in the middle -->
				{#if autocheck}
					<div class="autocheck-indicator">
						<svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span class="font-medium text-green-600">Autocheck</span>
					</div>
				{/if}

				{#if mode === 'play'}
					<div class="right-controls">
						<div class="timer">{formatTime(time_taken)}</div>
						<button class="pause" onclick={pause} onkeydown={(e) => e.key === 'Enter' && pause()}>
							<span class="sr-only">{isPaused ? 'Play' : 'Pause'}</span>
							{#if isPaused}
								<!-- Play icon (triangle) -->
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
									<path d="M8 5v14l11-7z" />
								</svg>
							{:else}
								<!-- Pause icon (two vertical lines) -->
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
									<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
								</svg>
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<div class="svg-container">
				<svg 
					class="crossword-svg" 
					viewBox="0 0 {totalWidth} {totalHeight}"
					role="application"
					aria-label="Crossword grid"
				>
					<g class="cell-group">
						{#each Array(rows) as _, row}
							{#each Array(cols) as _, col}
								<g class={getCellClass(col, row)}>
									<rect
										class="cell-rect"
										class:grid-drawing={gridDrawingMode && editMode}
										role="cell"
										tabindex="-1"
										x={cellWidth * col + margin}
										y={cellHeight * row + margin}
										width={cellWidth}
										height={cellHeight}
										stroke={innerBorderColour}
										stroke-width={innerBorderWidth}
										fill={cellFill(col, row)}
										data-col={col}
										data-row={row}
										onclick={() => handleCellClick(col, row)}
										ondblclick={() => handleCellDoubleClick(col, row)}
										onmousedown={(e) => handleCellMouseDown(col, row, e)}
										onmousemove={(e) => handleCellMouseMove(col, row, e)}
										onmouseup={handleCellMouseUp}
										onkeydown={(e) => e.key === 'Enter' && handleCellClick(col, row)}
									/>
									{#if editMode && grid[row][col] === '#' && !gridDrawingMode}
										<line
											class="current-cell-line"
											x1={cellWidth * col + margin + cellWidth * 0.2}
											y1={cellHeight * row + margin + cellHeight * 0.2}
											x2={cellWidth * col + margin + cellWidth * 0.8}
											y2={cellHeight * row + margin + cellHeight * 0.8}
											stroke="#999"
											stroke-width="2"
											style="pointer-events: none;"
										/>
										<line
											class="current-cell-line"
											x1={cellWidth * col + margin + cellWidth * 0.8}
											y1={cellHeight * row + margin + cellHeight * 0.2}
											x2={cellWidth * col + margin + cellWidth * 0.2}
											y2={cellHeight * row + margin + cellHeight * 0.8}
											stroke="#999"
											stroke-width="2"
											style="pointer-events: none;"
										/>
									{/if}
									{#if grid[row][col] !== '#'}
										{#if incorrectGrid && incorrectGrid[row]?.[col] && grid[row][col] !== ''}
											<line
												class="incorrect-line"
												x1={cellWidth * col + margin + cellWidth * 0.1}
												y1={cellHeight * row + margin + cellHeight * 0.1}
												x2={cellWidth * col + margin + cellWidth * 0.9}
												y2={cellHeight * row + margin + cellHeight * 0.9}
												stroke="#dc3545"
												stroke-width="2"
											/>
										{/if}
										<text
											class={letterClasses[row]?.[col]}
											x={cellWidth * col + margin + cellWidth / 2}
											y={cellHeight * row + margin + fontSize - margin}
											text-anchor="middle"
											font-size={fontSize}
										>
											{printMode === 'blank' ? '' : grid[row][col] || ''}
										</text>

										{#if getNumber(col, row)}
											<text
												class="number"
												x={cellWidth * col + margin + cellWidth * 0.04}
												y={cellHeight * row + margin - cellWidth * 0.02 + cellWidth * numRatio}
												text-anchor="left"
												font-size={cellWidth * numRatio}
											>
												{getNumber(col, row)}
											</text>
										{/if}
									{/if}
								</g>
							{/each}
						{/each}
					</g>
					<rect
						x={margin}
						y={margin}
						{width}
						{height}
						stroke={outerBorderColour}
						stroke-width={outerBorderWidth}
						fill="none"
					/>
				</svg>
			</div>

			<MobileQuestionPanel
				{currentQuestion}
				direction={!!direction}
				on:previous={moveToPreviousWord}
				on:next={moveToNextWord}
				on:toggleDirection={changeDirection}
			/>

			<MobileKeyboard on:keypress={handleMobileKeyPress} />
		</div>


		<div class="question-container desktop-only">
			<div class="questions-across" bind:this={questionsAcrossContainer}>
				<h4>Across</h4>
				<ol class="questions-list">
					{#each acrossQuestions as question}
						<li>
							{#if editMode && isQuestionBeingEdited(question)}
								<div class="questions-list-item editing">
									<span class="questions-list-item-num">{question.alpha_number}</span>
									<input
										type="text"
										class="questions-list-item-input"
										value={editingClueText}
										oninput={(e) => {
											const newValue = (e.target as HTMLInputElement).value;
											editingClueText = newValue;
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												saveQuestionClue(true);
											} else if (e.key === 'Escape') {
												e.preventDefault();
												cancelEditingQuestion();
											}
										}}
										use:focus
									/>
									<div class="questions-list-item-actions">
										<button
											class="questions-list-item-action save"
											onclick={() => saveQuestionClue(false)}
											aria-label="Save"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										</button>
										<button
											class="questions-list-item-action cancel"
											onclick={cancelEditingQuestion}
											aria-label="Cancel"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</div>
							{:else}
								<div
									class="questions-list-item"
									class:active={isQuestionActive(question)}
								>
									<button
										class="questions-list-item-button"
										onclick={() => handleQuestionClick(question)}
										ondblclick={(e) => {
											e.preventDefault();
											startEditingQuestion(question);
										}}
										aria-label="Go to question {question.alpha_number}"
									>
										<span class="questions-list-item-num">{question.alpha_number}</span>
										<span class="questions-list-item-question">{question.clue}</span>
									</button>
									{#if editMode}
										<button
											class="questions-list-item-edit"
											onclick={(e: MouseEvent) => {
												e.preventDefault();
												e.stopPropagation();
												startEditingQuestion(question);
											}}
											aria-label="Edit question {question.alpha_number}"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			</div>
			<div class="questions-down" bind:this={questionsDownContainer}>
				<h4>Down</h4>
				<ol class="questions-list">
					{#each downQuestions as question}
						<li>
							{#if editMode && isQuestionBeingEdited(question)}
								<div class="questions-list-item editing">
									<span class="questions-list-item-num">{question.alpha_number}</span>
									<input
										type="text"
										class="questions-list-item-input"
										value={editingClueText}
										oninput={(e) => {
											const newValue = (e.target as HTMLInputElement).value;
											editingClueText = newValue;
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												saveQuestionClue(true);
											} else if (e.key === 'Escape') {
												e.preventDefault();
												cancelEditingQuestion();
											}
										}}
										use:focus
									/>
									<div class="questions-list-item-actions">
										<button
											class="questions-list-item-action save"
											onclick={() => saveQuestionClue(false)}
											aria-label="Save"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										</button>
										<button
											class="questions-list-item-action cancel"
											onclick={cancelEditingQuestion}
											aria-label="Cancel"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</div>
							{:else}
								<div
									class="questions-list-item"
									class:active={isQuestionActive(question)}
								>
									<button
										class="questions-list-item-button"
										onclick={() => handleQuestionClick(question)}
										ondblclick={(e) => {
											e.preventDefault();
											startEditingQuestion(question);
										}}
										aria-label="Go to question {question.alpha_number}"
									>
										<span class="questions-list-item-num">{question.alpha_number}</span>
										<span class="questions-list-item-question">{question.clue}</span>
									</button>
									{#if editMode}
										<button
											class="questions-list-item-edit"
											onclick={(e: MouseEvent) => {
												e.preventDefault();
												e.stopPropagation();
												startEditingQuestion(question);
											}}
											aria-label="Edit question {question.alpha_number}"
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>
</div>

{#if showOverlay}
	<div class="overlay">
		<div class="overlay-content">
			{#if overlayType === 'paused'}
				<div class="paused">
					<div class="paused-content">
						<div class="paused-title">
							{#if gameStarted}
								Crossword Paused
							{:else}
								Ready to Start?
							{/if}
						</div>
						<div class="paused-description">
							{#if gameStarted}
								You've made some progress on this crossword. Click below to continue where you left
								off.
							{:else}
								Test your knowledge with this crossword puzzle. Click below to begin!
							{/if}
						</div>
						<div class="play-button-container">
							<button
								class="cool-play-button"
								onclick={() => {
									isPaused = false;
									showOverlay = false;
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.code === 'Space') {
										e.preventDefault();
										e.stopPropagation();
										isPaused = false;
										showOverlay = false;
									}
								}}
							>
								<div class="play-icon">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
								<div class="play-text">
									{gameStarted ? 'Continue Playing' : 'Start Playing'}
								</div>
							</button>
						</div>
					</div>
				</div>
			{:else if overlayType === 'complete'}
				<div class="complete">
					<div class="overlay-title">Congratulations! You've Won!</div>
					<div class="overlay-time">Your time: {humanTime()}</div>
					<div class="overlay-share">
						<button
							class="overlay-share-option overlay-share-option-clipboard"
							onclick={copyToClipboard}
							onkeydown={(e) => e.key === 'Enter' && copyToClipboard()}
						>
							<span class="share-icon">📋</span>&nbsp;&nbsp;Copy your results
						</button>
						<a
							class="overlay-share-option"
							href={xShareUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span class="share-icon">𝕏</span> Share your results on X
						</a>
						<a
							class="overlay-share-option"
							href={whatsappShareUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span class="share-icon">📱</span> Share your results on WhatsApp
						</a>
					</div>
					<button class="overlay-button reset" onclick={reset}>Restart</button>
					<button class="overlay-button" onclick={() => (showOverlay = false)}>Close</button>
				</div>
			{:else if overlayType === 'meta'}
				<div class="meta">
					<div class="overlay-title">{title || 'Crossword'}</div>
					<div class="overlay-text">
						<ul>
							{#if author}
								<li>Author: {author}</li>
							{/if}
							{#if date}
								<li>Date: {new Date(date).toLocaleDateString()}</li>
							{/if}
							{#if difficulty}
								<li>Difficulty: {difficulty}</li>
							{/if}
							{#if type}
								<li>Type: {type}</li>
							{/if}
						</ul>
					</div>
					<button class="overlay-button" onclick={() => (showOverlay = false)}>Close</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.jxword-menu-toggle {
		display: block;
		position: relative;
		margin-left: 3px;
		top: 0px;
		left: 0px;
		z-index: 10;
		-webkit-user-select: none;
		user-select: none;
	}

	.jxword-menu {
		position: absolute;
		width: 250px;
		margin: -23px 0 0 -5px;
		padding: 23px 10px 10px 10px;
		background: #ffffff;
		list-style-type: none;
		-webkit-font-smoothing: antialiased;
		transform-origin: 0% 0%;
		opacity: 0;
		visibility: hidden;
		z-index: -1;
		transition:
			transform 0.5s cubic-bezier(0.77, 0.2, 0.05, 1),
			opacity 0.55s ease,
			visibility 0.55s ease;
		border-radius: 2px;
		border: 1px solid rgba(36, 36, 36, 0.5);
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
	}

	.jxword-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.jxword-overlay-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 500px;
		text-align: center;
	}

	.jxword-overlay-button {
		margin-top: 10px;
		padding: 10px;
		background-color: #3b3b3b;
		color: white;
		border-radius: 5px;
		font-size: 16px;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.jxword-overlay-title {
		font-size: 2em;
		font-weight: bold;
		margin-bottom: 1em;
		line-height: 120%;
	}

	.jxword-complete_overlay {
		display: none;
		display: block;
		position: fixed;
		margin: auto 15%;
		padding: 20px;
		background-color: white;
		border-radius: 5px;
		border: 1px solid rgba(36, 36, 36, 0.5);
	}

	.jxword-overlay-time {
		font-size: 1.2em;
		font-weight: bold;
		margin-bottom: 1em;
	}

	.jxword-overlay-share-option {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		margin-top: 1em;
		padding: 10px;
		background-color: #f0f0f0;
		border-radius: 5px;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.jxword-overlay-share-option:hover {
		background-color: #e0e0e0;
	}

	.jxword-keyboard {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px;
		background: #f5f5f5;
		border-top: 1px solid #ddd;
		width: 100%;
		box-sizing: border-box;
	}

	.jxword-keyboard-row {
		display: flex;
		gap: 2px;
		justify-content: center;
		width: 100%;
		flex-wrap: nowrap;
	}

	.jxword-key {
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 6px 8px;
		font-size: 14px;
		font-weight: bold;
		cursor: pointer;
		user-select: none;
		min-width: 32px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
		flex: 1;
		max-width: 40px;
	}

	.jxword-key:hover {
		background: #e0e0e0;
	}

	.jxword-key:active {
		background: #d0d0d0;
	}

	.jxword-key-backspace {
		background: #ff6b6b;
		color: white;
		border-color: #ff5252;
	}

	.jxword-key-backspace:hover {
		background: #ff5252;
	}

	.jxword-key-backspace:active {
		background: #ff4444;
	}

	@media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
		:global(body) {
			transform: rotate(-90deg);
			transform-origin: left top;
			width: 100vh;
			overflow-x: hidden;
			position: absolute;
			top: 100%;
			left: 0;
		}
	}

	.jxword-container {
		width: 100%;
		height: 100%;
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		max-width: var(--responsive--alignwide-width);
		font-family: 'Times New Roman', Times, serif;

		.jxword-play-area {
			display: flex;
			flex-direction: row;
			flex-wrap: nowrap;
		}

		.jxword-sr-only {
			/* Accessibility */
			position: absolute;
			left: -10000px;
			top: auto;
			width: 1px;
			height: 1px;
			overflow: hidden;
		}

		.jxword-header {
			display: flex;
			flex-flow: row wrap;
			justify-content: space-between;
			width: 100%;
			z-index: 10;
		}

		/* SVG section */
		.jxword-svg-container {
			flex-grow: 1;
			touch-action: none;
			user-select: none;
			-moz-user-select: none;
			-webkit-user-select: none;
			-ms-user-select: none;
		}

		/* Question section */
		.jxword-question-container {
			width: 50%;
			height: 100%;
			display: flex;
			flex-direction: row;
			padding-left: 5px;
			max-height: 80vh;
		}

		.jxword-single-question-container {
			width: 100%;
			/* min-height: 40px; */
			background-color: #b8ddec;
			justify-content: stretch;
			align-items: stretch;
			align-content: center;
			display: flex;
			flex-direction: row;
			margin-top: 5px;
		}

		@media only screen and (min-device-width: 480px) {
			/* flex-direction: row;
        flex-wrap: wrap; */
			.jxword-mobile-only {
				display: none;
			}
		}

		/* General mobile keyboard optimizations */
		@media only screen and (max-width: 480px) {
			.jxword-keyboard {
				padding: 6px 4px;
				gap: 3px;
			}

			.jxword-keyboard-row {
				gap: 1px;
				padding: 0 2px;
			}

			.jxword-key {
				min-width: 28px;
				height: 32px;
				font-size: 12px;
				padding: 4px 6px;
				max-width: 36px;
			}
		}

		/* Mobile, Landscape */
		@media only screen and (max-device-width: 480px) and (-webkit-min-device-pixel-ratio: 2) and (orientation: portrait) {
			/* flex-direction: column; */
			width: calc(100% - 10px);
			.jxword-desktop-only {
				display: none;
			}

			.jxword-svg-container {
				width: 100%;
			}

			.jxword-single-question-container {
				display: flex;
			}

			/* Mobile keyboard optimizations */
			.jxword-keyboard {
				padding: 6px 4px;
				gap: 3px;
			}

			.jxword-keyboard-row {
				gap: 1px;
				padding: 0 2px;
			}

			.jxword-key {
				min-width: 28px;
				height: 32px;
				font-size: 12px;
				padding: 4px 6px;
				max-width: 36px;
			}
		}

		/* Additional mobile optimizations for very small screens */
		@media only screen and (max-width: 375px) {
			.jxword-keyboard {
				padding: 4px 2px;
				gap: 2px;
			}

			.jxword-keyboard-row {
				gap: 1px;
				padding: 0 1px;
			}

			.jxword-key {
				min-width: 24px;
				height: 28px;
				font-size: 11px;
				padding: 3px 4px;
				max-width: 32px;
			}
		}

		/* Hide ads */
		.in-article-action-1 {
			display: none !important;
		}
	}

	.crossword-container {
		width: 100%;
		height: 100%;
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		max-width: var(--responsive--alignwide-width);
		font-family: 'Times New Roman', Times, serif;
	}

	.play-area {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
	}

	.grid-container {
		flex-grow: 1;
		max-width: 100%;
	}

	.header {
		display: flex;
		flex-flow: row nowrap;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		z-index: 10;
		position: relative;
		min-height: 2.5rem;
	}

	.controls {
		flex: 0 0 auto;
	}

	.autocheck-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		justify-content: center;
	}

	.right-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 0 0 auto;
		margin-left: auto;
	}

	.timer {
		min-width: 77px;
		font-size: 12pt;
	}

	.pause {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: none;
		border: none;
		cursor: pointer;
		color: #374151;
		transition: color 0.2s ease;
		padding: 0;
		margin: 0;
		border-radius: 0.25rem;
	}

	.pause:hover {
		color: #111827;
	}

	.pause:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.svg-container {
		flex-grow: 1;
		touch-action: none;
		user-select: none;
		-moz-user-select: none;
		-webkit-user-select: none;
		-ms-user-select: none;
	}

	.crossword-svg {
		max-width: 100%;
		max-height: 100%;
	}

	.cell {
		text {
			pointer-events: none;
		}
		rect {
			outline: none;
			cursor: pointer;
		}
	}

	.cell-rect.grid-drawing {
		cursor: crosshair;
	}

	.grid-mode-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		cursor: pointer;
		color: #374151;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.grid-mode-button:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.grid-mode-button.active {
		background: #3b82f6;
		border-color: #2563eb;
		color: white;
	}

	.grid-mode-button.active:hover {
		background: #2563eb;
	}

	.grid-mode-label {
		font-weight: 500;
	}

	.fill-mode-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		cursor: pointer;
		color: #374151;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.fill-mode-button:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.fill-mode-button.active {
		background: #10b981;
		border-color: #059669;
		color: white;
	}

	.fill-mode-button.active:hover {
		background: #059669;
	}

	.fill-mode-label {
		font-weight: 500;
	}

	.fill-mode-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-right: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		flex: 0 0 auto;
		visibility: visible;
		opacity: 1;
		transition: opacity 0.2s ease, visibility 0.2s ease;
	}

	.fill-mode-controls.hidden {
		visibility: hidden;
		opacity: 0;
		pointer-events: none;
	}

	.autofill-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #10b981;
		border: 1px solid #059669;
		border-radius: 0.375rem;
		cursor: pointer;
		color: white;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.autofill-button:hover:not(:disabled) {
		background: #059669;
		border-color: #047857;
	}

	.autofill-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.grid-mode-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-right: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		flex: 0 0 auto;
		visibility: visible;
		opacity: 1;
		transition: opacity 0.2s ease, visibility 0.2s ease;
	}

	.grid-mode-controls.hidden {
		visibility: hidden;
		opacity: 0;
		pointer-events: none;
	}

	.grid-size-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 100px;
		max-width: 120px;
	}

	.grid-size-label {
		font-size: 0.6rem;
		font-weight: 500;
		color: #374151;
		white-space: nowrap;
	}

	.grid-size-slider {
		width: 100%;
		cursor: pointer;
	}

	.grid-symmetry-control {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	.grid-symmetry-checkbox {
		width: 0.9rem;
		height: 0.9rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.grid-symmetry-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		user-select: none;
	}

	.letter-text.correct {
		fill: #378f38;
		/* font-weight: bold; */
	}

	.letter-text.incorrect {
		fill: #5b5b5b;
		/* font-weight: 200; */
	}

	.question-container {
		width: 50%;
		height: var(--crossword-height, 500px);
		display: flex;
		flex-direction: row;
		padding-left: 5px;
		overflow-y: scroll;
	}

	.questions-across,
	.questions-down {
		/* overflow-y: scroll; */
		flex: 1;
		position: relative;
	}

	.questions-across h4,
	.questions-down h4 {
		/* position: sticky; */
		top: 0;
		background: white;
		z-index: 10;
		padding: 8px 0;
		margin: 0 0 8px 0;
		border-bottom: 1px solid #e5e7eb;
		font-weight: bold;
		font-size: 14px;
	}

	.questions-list {
		list-style: none;
		line-height: 1.5;
		font-size: 12px;
		padding-left: 0px;
		display: flex;
		flex-direction: column;
		margin-right: 20px;
	}

	.questions-list-item-num {
		margin-right: 5px;
		text-align: right;
		width: 25px;
		min-width: 25px;
		font-weight: bold;
	}

	.questions-list-item {
		padding-left: 3px;
		border-radius: 3px;
		padding: 2px 3px;
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		position: relative;
	}

	.questions-list-item-button {
		flex: 1;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			font-weight 0.2s ease;
		border-radius: 3px;
		padding: 2px 3px;
		background: none;
		border: none;
		text-align: left;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	.questions-list-item:hover .questions-list-item-button {
		background-color: #f0f0f0;
		font-weight: 500;
	}

	.questions-list-item:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		background-color: #f0f0f0;
	}

	.questions-list-item.active .questions-list-item-button {
		background-color: var(--select-word-colour);
		font-weight: bold;
	}

	.questions-list-item-question {
		flex: 1;
	}

	.questions-list-item-edit {
		display: none;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: #6b7280;
		opacity: 0.6;
		transition: opacity 0.2s, color 0.2s;
		flex-shrink: 0;
	}

	.questions-list-item-edit svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.questions-list-item-edit:hover {
		opacity: 1;
		color: #3b82f6;
	}

	.questions-list-item:hover .questions-list-item-edit,
	.questions-list-item.active .questions-list-item-edit {
		display: flex;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		animation: overlayFadeIn 0.3s ease-out;
	}

	@keyframes overlayFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.overlay-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 500px;
		max-height: 80vh;
		overflow-y: auto;
		text-align: center;
		animation: contentSlideIn 0.4s ease-out;
	}

	@keyframes contentSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.paused {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 200px;
	}

	.paused-content {
		text-align: center;
		max-width: 400px;
	}

	.paused-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #495057;
		margin-bottom: 1rem;
		animation: titleFadeIn 0.6s ease-out 0.2s both;
	}

	.paused-description {
		font-size: 1rem;
		color: #6c757d;
		line-height: 1.5;
		margin-bottom: 2rem;
		animation: descriptionFadeIn 0.6s ease-out 0.4s both;
	}

	@keyframes titleFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes descriptionFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.play-button-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.cool-play-button {
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border: 1px solid #dee2e6;
		border-radius: 12px;
		width: 200px;
		height: 60px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
		animation: buttonPulse 2s ease-in-out infinite;
	}

	@keyframes buttonPulse {
		0%,
		100% {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		}
		50% {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		}
	}

	.cool-play-button:hover {
		background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.cool-play-button:active {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.cool-play-button:focus {
		outline: 2px solid #6c757d;
		outline-offset: 2px;
	}

	.cool-play-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 100%);
		border-radius: 12px;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.cool-play-button:hover::before {
		opacity: 1;
	}

	.play-icon {
		color: #495057;
		margin-right: 8px;
	}

	.play-icon svg {
		width: 20px;
		height: 20px;
	}

	.play-text {
		color: #495057;
		font-weight: 500;
		font-size: 16px;
		letter-spacing: 0.3px;
	}

	.overlay-title {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 1rem;
	}

	.overlay-button {
		background: #007cba;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		margin: 0.25rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.overlay-button:hover {
		background: #005a87;
	}

	.overlay-button.reset {
		background: #dc3545;
	}

	.overlay-button.reset:hover {
		background: #c82333;
	}

	.overlay-share {
		margin: 1rem 0;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.overlay-share-option {
		display: flex;
		align-items: center;
		padding: 0.5rem;
		margin: 0.25rem 0;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		text-decoration: none;
		color: inherit;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		font-family: inherit;
		font-size: inherit;
	}

	.overlay-share-option:hover {
		background-color: #e9ecef;
	}

	.share-icon {
		margin-right: 0.5rem;
		font-size: 1.1em;
	}

	.sr-only {
		position: absolute;
		left: -10000px;
		top: auto;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.desktop-only {
		display: block;
	}

	.print-title {
		display: none;
	}

	@media only screen and (max-device-width: 480px) {
		.desktop-only {
			display: none;
		}
	}

	/* Print styles */
	@media print {
		.crossword-container {
			margin: 0;
			padding: 0;
			max-width: none;
			width: 100%;
		}

		.print-title {
			display: block !important;
			text-align: center;
			margin-bottom: 20px;
			page-break-after: avoid;
		}

		.print-title h1 {
			font-size: 24px;
			margin: 0 0 5px 0;
			font-weight: bold;
		}

		.print-mode {
			font-size: 14px;
			margin: 0;
			color: #666;
			font-style: italic;
		}

		.play-area {
			flex-direction: row;
			align-items: flex-start;
			gap: 20px;
		}

		.grid-container {
			flex: 0 0 auto;
			max-width: 50%;
			margin-bottom: 0;
		}

		.header {
			display: none !important;
		}

		.question-container {
			flex: 1 1 auto;
			width: auto !important;
			max-height: none !important;
			display: flex !important;
			flex-direction: row !important;
			page-break-inside: avoid;
		}

		.questions-across,
		.questions-down {
			overflow: visible !important;
			margin-bottom: 20px;
			width: 50%;
			flex: 0 0 50%;
		}

		.questions-across {
			margin-right: 10px;
		}

		.questions-down {
			margin-left: 10px;
		}

		.questions-list {
			font-size: 10px;
			line-height: 1.3;
		}

		.questions-list-item {
			padding: 1px 3px;
			margin-bottom: 2px;
		}

		.questions-list-item-num {
			width: 20px;
			min-width: 20px;
			font-size: 9px;
		}

		.crossword-svg {
			max-width: 100% !important;
			max-height: none !important;
			width: 100% !important;
			height: auto !important;
		}

		.svg-container {
			display: flex;
			justify-content: flex-start;
			margin-bottom: 0;
		}

		/* Hide mobile components when printing */
		.mobile-only {
			display: none !important;
		}

		/* Hide main image when printing */
		.main-image {
			display: none !important;
		}

		/* Hide incorrect cross marks when printing */
		.incorrect-line {
			display: none !important;
		}

		/* Ensure proper page breaks */
		.questions-across {
			page-break-after: avoid;
		}

		.questions-down {
			page-break-before: avoid;
		}
	}

	.questions-list-item.editing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 2px 3px;
		background: #f0f9ff;
		border: 2px solid #3b82f6;
		border-radius: 3px;
	}

	.questions-list-item-input {
		flex: 1;
		padding: 2px 4px;
		border: 1px solid #cbd5e1;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		background: white;
	}

	.questions-list-item-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.questions-list-item-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.questions-list-item-action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 1px solid #cbd5e1;
		border-radius: 3px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.questions-list-item-action:hover {
		transform: scale(1.1);
	}

	.questions-list-item-action.save {
		color: #059669;
		border-color: #059669;
	}

	.questions-list-item-action.save:hover {
		background: #d1fae5;
	}

	.questions-list-item-action.cancel {
		color: #dc2626;
		border-color: #dc2626;
	}

	.questions-list-item-action.cancel:hover {
		background: #fee2e2;
	}

	.questions-list-item-action svg {
		width: 0.875rem;
		height: 0.875rem;
	}
</style>

