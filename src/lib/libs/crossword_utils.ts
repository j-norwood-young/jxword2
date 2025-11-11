import type { CrosswordBlock, CrosswordQuestion } from "$lib/types/Crossword";

export function getStartOfWord(grid:string[][], x: number, y: number, direction: number) {
    if (direction === 0) {
        while(x > 0 && grid[y][x - 1] !== "#") {
            x--;
        }
    } else {
        while(y > 0 && grid[y - 1][x] !== "#") {
            y--;
        }
    }
    return { x, y };
}

export function getEndOfWord(grid:string[][], x: number, y: number, direction: number) {
    const size = grid.length;
    if (direction === 0) {
        while(x < size - 1 && grid[y][x + 1] !== "#") {
            x++;
        }
    } else {
        while(y < size - 1 && grid[y + 1][x] !== "#") {
            y++;
        }
    }
    return { x, y };
}

export function getWord(grid:string[][], x: number, y: number, direction: number) {
    const start = getStartOfWord(grid, x, y, direction);
    const end = getEndOfWord(grid, x, y, direction);
    let word = "";
    if (direction === 0) {
        for (let i = start.x; i <= end.x; i++) {
            word += grid[y][i] || " ";
        }
    } else {
        for (let i = start.y; i <= end.y; i++) {
            word += grid[i][x] || " ";
        }
    }
    return word;
}

export function isStartOfAcross(grid:string[][], x: number, y: number) {
    if (grid[y][x] === '#') return false; // If the cell is a wall, return false
    if (grid[y]?.[x + 1] === undefined) return false; // If the cell is the last column, return false
    if (x === 0 && grid[y]?.[x + 1] == '#') return false; // If the cell is the first column and the cell to the right is a wall, return false
    if (grid[y]?.[x + 1] === '#') return false; // If the cell to the right is a wall, return false
    if (x === 0 || grid[y]?.[x - 1] == '#') return true; // If the cell is the first column or the cell to the left is a wall, return true
    return false; // If the cell is not a start of an across word, return false
}

export function isStartOfDown(grid:string[][], x: number, y: number) {
    if (grid[y]?.[x] === '#') return false; // If the cell is a wall, return false
    if (grid[y + 1]?.[x] === undefined) return false; // If the cell is the last row, return false
    if (y === 0 && grid[y + 1]?.[x] == '#') return false; // If the cell is the first row and the cell below is a wall, return false
    if (grid[y + 1]?.[x] === '#') return false; // If the cell below is a wall, return false
    if (y === 0 || grid[y - 1]?.[x] == '#') return true; // If the cell is the first row or the cell above is a wall, return true
    return false; // If the cell is not a start of a down word, return false
}

export function generateAcrossScalar(grid:string[][], clues: { across: CrosswordQuestion[], down: CrosswordQuestion[] }) {
        // Guard against invalid grid - throw error if grid is invalid
		if (!grid || !Array.isArray(grid) || grid.length === 0 || !grid[0] || !Array.isArray(grid[0]) || grid[0].length === 0) {
			throw new Error('Invalid crossword grid: grid is empty or malformed. Cannot generate across scalar.');
		}
		
        const rows = grid.length;
        const cols = grid[0].length;
		let questionNumber = 1;
		let acrossQuestionNumber = 0;
		const across: CrosswordBlock[] = [];
		let letterIndex = 0;
		let index = 0;
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				if (!grid[y] || grid[y][x] === '#') continue;
				const localQuestionNumber = questionNumber;
				if (isStartOfAcross(grid, x, y) || isStartOfDown(grid, x, y)) {
					questionNumber++;
				}
				// If it's only one cell with a # on the left and right, or a # on the left and wall on the right, or a # on the right and wall on the left, then it's a start of an across word
				if (x === 0 && grid[y]?.[x + 1] === '#') {
					continue;
				}
				if (x === cols - 1 && grid[y]?.[x - 1] === '#') {
					continue;
				}
				if (grid[y]?.[x - 1] === '#' && grid[y]?.[x + 1] === '#') {
					continue;
				}
				if (isStartOfAcross(grid, x, y)) {
					acrossQuestionNumber = localQuestionNumber;
					letterIndex = 0;
				} else {
					letterIndex++;
				}
				const acrossQuestion = clues.across[index];
				const block: CrosswordBlock = {
					x: x,
					y: y,
					direction: 0,
					letter: grid[y][x],
					current_letter: grid[y][x],
					startOfWord: isStartOfAcross(grid, x, y),
					letter_index: letterIndex,
					question_index: index,
					question: {
						direction: 0,
						number: acrossQuestionNumber,
						alpha_number: `A${acrossQuestionNumber}`,
						clue: acrossQuestion?.clue || '',
						answer: acrossQuestion?.answer || ''
					},
					correct: grid[y][x] === grid[y][x]
				};
				across.push(block);
				if (isStartOfAcross(grid, x, y)) {
					index++;
				}
			}
		}
		return across;
}

export function generateDownScalar(grid:string[][], clues: { across: CrosswordQuestion[], down: CrosswordQuestion[] }) {
        // Guard against invalid grid - throw error if grid is invalid
		if (!grid || !Array.isArray(grid) || grid.length === 0 || !grid[0] || !Array.isArray(grid[0]) || grid[0].length === 0) {
			throw new Error('Invalid crossword grid: grid is empty or malformed. Cannot generate down scalar.');
		}
		
        const rows = grid.length;
        const cols = grid[0].length;
		let questionNumber = 1;
		let downQuestionNumber = 0;
		const down: CrosswordBlock[] = [];
		let letterIndex = 0;
		let index = 0;
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				if (!grid[y] || grid[y][x] === '#') continue;
				const localQuestionNumber = questionNumber;
				if (isStartOfDown(grid, x, y) || isStartOfAcross(grid, x, y)) {
					questionNumber++;
				}
				// If it's only one cell with a # on the top and bottom, or a # on the top and wall on the bottom, or a # on the bottom and wall on the top, then it's a start of an across word
				if (y === 0 && grid[y + 1]?.[x] === '#') {
					continue;
				}
				if (y === rows - 1 && grid[y - 1]?.[x] === '#') {
					continue;
				}
				if (grid[y - 1]?.[x] === '#' && grid[y + 1]?.[x] === '#') {
					continue;
				}
				if (isStartOfDown(grid, x, y)) {
					downQuestionNumber = localQuestionNumber;
					const downQuestion = clues.down[index];
					letterIndex = 0;
					while (
						grid[y + letterIndex]?.[x] !== '#' &&
						grid[y + letterIndex]?.[x] !== undefined
					) {
						down.push({
							x: x,
							y: y + letterIndex,
							direction: 0,
							letter: grid[y + letterIndex][x],
							current_letter: grid[y + letterIndex][x],
							startOfWord: isStartOfDown(grid, x, y + letterIndex),
							letter_index: letterIndex,
							question_index: index,
							question: {
								direction: 1,
								number: downQuestionNumber,
								clue: downQuestion?.clue || '',
								answer: downQuestion?.answer || '',
								alpha_number: `D${downQuestionNumber}`
							},
							correct: grid[y + letterIndex][x] === grid[y + letterIndex][x]
						});
						letterIndex++;
					}
					index++;
				}
			}
		}
		return down;
	}