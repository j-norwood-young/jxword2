interface ParsedQuestion {
    num: number;
    word_id: number;
    question: string | null;
    answer: string;
    x: number;
    y: number;
    direction: 'across' | 'down';
}

interface ParsedQuestions {
    across: ParsedQuestion[];
    down: ParsedQuestion[];
}

interface WordInfo {
    dir: 'across' | 'down';
    x: number;
    y: number;
    xEnd?: number;
    yEnd?: number;
}

interface ParsedCrosswordXML {
    title?: string | null;
    created?: string | null;
    creator?: string | null;
    editor?: string | null;
    rights?: string | null;
    copyright?: string | null;
    publisher?: string | null;
    identifier?: string | null;
    description?: string | null;
    width?: number;
    height?: number;
    grid: string[][];
    questions: ParsedQuestions;
}

export class CrosswordXMLError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CrosswordXMLError';
    }
}

const getElement = (xmlDoc: Document, tagName: string): string | null => {
    return xmlDoc.getElementsByTagName(tagName)[0]?.textContent ?? null;
};

const getAttribute = (xmlDoc: Document, tagName: string, attributeName: string): string | null => {
    return xmlDoc.getElementsByTagName(tagName)[0]?.getAttribute(attributeName) ?? null;
};

const getGrid = (xmlDoc: Document, defaultWidth?: number, defaultHeight?: number): string[][] => {
    const xmlCells = xmlDoc.getElementsByTagName('cell');
    const cells: Array<{ x: number; y: number; solution: string }> = [];
    
    // First pass: collect all cells
    for (let i = 0; i < xmlCells.length; i++) {
        const cell = xmlCells[i];
        const xAttr = cell.getAttribute('x');
        const yAttr = cell.getAttribute('y');
        const typeAttr = cell.getAttribute('type');
        const solutionAttr = cell.getAttribute('solution');
        
        if (xAttr && yAttr) {
            const x = parseInt(xAttr, 10);
            const y = parseInt(yAttr, 10);
            if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
                // If type is "block", use '#'; otherwise use solution or '#'
                const solution = typeAttr === 'block' ? '#' : (solutionAttr || '#');
                cells.push({ x, y, solution });
            }
        }
    }
    
    // Find max dimensions from cells
    let maxX = 0;
    let maxY = 0;
    for (const cell of cells) {
        maxX = Math.max(maxX, cell.x);
        maxY = Math.max(maxY, cell.y);
    }
    
    // Use width/height attributes if available and larger than cell-based dimensions
    const widthAttr = getAttribute(xmlDoc, 'grid', 'width');
    const heightAttr = getAttribute(xmlDoc, 'grid', 'height');
    const width = widthAttr ? parseInt(widthAttr, 10) : defaultWidth;
    const height = heightAttr ? parseInt(heightAttr, 10) : defaultHeight;
    
    if (width && !isNaN(width) && width > 0) {
        maxX = Math.max(maxX, width);
    }
    if (height && !isNaN(height) && height > 0) {
        maxY = Math.max(maxY, height);
    }
    
    // Throw error if grid dimensions are invalid
    if (maxX === 0 || maxY === 0) {
        throw new CrosswordXMLError('The XML file does not contain a valid crossword grid. No grid cells were found and no width/height attributes were specified.');
    }
    
    // Initialize grid with spaces
    const grid: string[][] = [];
    for (let y = 0; y < maxY; y++) {
        grid[y] = Array(maxX).fill(' ');
    }
    
    // Fill in cells
    for (const cell of cells) {
        const rowIndex = cell.y - 1;
        const colIndex = cell.x - 1;
        
        if (rowIndex >= 0 && colIndex >= 0 && rowIndex < maxY && colIndex < maxX) {
            grid[rowIndex][colIndex] = cell.solution;
        }
    }
    
    return grid;
};

const extractAnswer = (grid: string[][], word: WordInfo): string => {
    const answer: string[] = [];
    
    if (word.dir === 'across') {
        const y = word.y - 1;
        const startX = word.x - 1;
        // For across words, use xEnd if available, otherwise assume single cell
        const endX = word.xEnd ? word.xEnd - 1 : startX;
        
        for (let x = startX; x <= endX; x++) {
            if (y >= 0 && y < grid.length && x >= 0 && x < (grid[y]?.length ?? 0)) {
                const letter = grid[y][x];
                if (letter && letter !== '#' && letter !== ' ') {
                    answer.push(letter);
                } else if (letter === '#' || letter === ' ') {
                    // Stop at blocks or empty cells
                    break;
                }
            }
        }
    } else {
        const x = word.x - 1;
        const startY = word.y - 1;
        // For down words, use yEnd if available, otherwise assume single cell
        const endY = word.yEnd ? word.yEnd - 1 : startY;
        
        for (let y = startY; y <= endY; y++) {
            if (x >= 0 && x < (grid[0]?.length ?? 0) && y >= 0 && y < grid.length) {
                const letter = grid[y][x];
                if (letter && letter !== '#' && letter !== ' ') {
                    answer.push(letter);
                } else if (letter === '#' || letter === ' ') {
                    // Stop at blocks or empty cells
                    break;
                }
            }
        }
    }
    
    return answer.join('');
};

const getQuestions = (xmlDoc: Document, grid: string[][]): ParsedQuestions => {
    const xmlWords = xmlDoc.getElementsByTagName('word');
    const words: Record<number, WordInfo> = {};
    
    // Parse word elements
    for (let i = 0; i < xmlWords.length; i++) {
        const word = xmlWords[i];
        const xAttr = word.getAttribute('x');
        const yAttr = word.getAttribute('y');
        const idAttr = word.getAttribute('id');
        
        if (xAttr && yAttr && idAttr) {
            const xHasRange = xAttr.includes('-');
            const yHasRange = yAttr.includes('-');
            
            // Determine direction: if x has range, it's across; if y has range, it's down
            // Priority: if x has range, it's across; otherwise if y has range, it's down
            const dir: 'across' | 'down' = xHasRange ? 'across' : (yHasRange ? 'down' : 'across');
            
            const xParts = xAttr.split('-');
            const yParts = yAttr.split('-');
            const x = parseInt(xParts[0], 10);
            const y = parseInt(yParts[0], 10);
            const xEnd = xParts.length > 1 ? parseInt(xParts[1], 10) : undefined;
            const yEnd = yParts.length > 1 ? parseInt(yParts[1], 10) : undefined;
            const id = parseInt(idAttr, 10);
            
            if (!isNaN(x) && !isNaN(y) && !isNaN(id)) {
                words[id] = { dir, x, y, xEnd, yEnd };
            }
        }
    }
    
    const down: ParsedQuestion[] = [];
    const across: ParsedQuestion[] = [];
    
    // Get all clues elements
    const xmlCluesContainers = xmlDoc.getElementsByTagName('clues');
    
    for (let containerIdx = 0; containerIdx < xmlCluesContainers.length; containerIdx++) {
        const cluesContainer = xmlCluesContainers[containerIdx];
        const titleElement = cluesContainer.getElementsByTagName('title')[0];
        const titleText = titleElement?.textContent?.toLowerCase() || '';
        
        // Determine if this is across or down based on title
        const isAcross = titleText.includes('across');
        const isDown = titleText.includes('down');
        
        if (!isAcross && !isDown) {
            // If no title, try to infer from first clue's word direction
            const firstClue = cluesContainer.getElementsByTagName('clue')[0];
            if (firstClue) {
                const wordIdAttr = firstClue.getAttribute('word');
                if (wordIdAttr) {
                    const wordId = parseInt(wordIdAttr, 10);
                    const word = words[wordId];
                    if (word) {
                        if (word.dir === 'across') {
                            // Process as across
                        } else {
                            // Process as down
                        }
                    }
                }
            }
        }
        
        const xmlClues = cluesContainer.getElementsByTagName('clue');
        
        for (let i = 0; i < xmlClues.length; i++) {
            const clue = xmlClues[i];
            const wordIdAttr = clue.getAttribute('word');
            const numberAttr = clue.getAttribute('number');
            const text = clue.textContent;
            
            if (wordIdAttr && numberAttr) {
                const word_id = parseInt(wordIdAttr, 10);
                const number = parseInt(numberAttr, 10);
                const word = words[word_id];
                
                if (!isNaN(word_id) && !isNaN(number) && word) {
                    // Determine direction from word or container
                    let direction: 'across' | 'down' = word.dir;
                    if (isAcross) direction = 'across';
                    if (isDown) direction = 'down';
                    
                    const answer = extractAnswer(grid, word);
                    
                    const question: ParsedQuestion = {
                        num: number,
                        word_id,
                        question: text,
                        answer,
                        x: word.x - 1,
                        y: word.y - 1,
                        direction
                    };
                    
                    if (direction === 'across') {
                        across.push(question);
                    } else {
                        down.push(question);
                    }
                }
            }
        }
    }
    
    return { across, down };
};

export function parseCrosswordXML(xml: string): ParsedCrosswordXML {
    if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
        throw new CrosswordXMLError('The XML file is empty or invalid. Please check the file and try again.');
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        const errorText = parserError.textContent || 'Unknown XML parsing error';
        throw new CrosswordXMLError(`The XML file contains errors and could not be parsed: ${errorText}`);
    }
    
    const widthAttr = getAttribute(xmlDoc, 'grid', 'width');
    const heightAttr = getAttribute(xmlDoc, 'grid', 'height');
    const width = widthAttr ? parseInt(widthAttr, 10) : undefined;
    const height = heightAttr ? parseInt(heightAttr, 10) : undefined;
    
    // Parse grid first (needed for extracting answers)
    // Pass width/height as defaults in case no cells are found
    const grid = getGrid(xmlDoc, width, height);
    
    // Validate grid is not empty
    if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) {
        throw new CrosswordXMLError('The XML file does not contain a valid crossword grid. Please ensure the file includes grid cells.');
    }
    
    // Validate grid has reasonable dimensions
    if (grid.length > 100 || (grid[0] && grid[0].length > 100)) {
        throw new CrosswordXMLError('The crossword grid is too large. Maximum size is 100x100 cells.');
    }
    
    const result: ParsedCrosswordXML = {
        title: getElement(xmlDoc, 'title'),
        created: getElement(xmlDoc, 'created'),
        creator: getElement(xmlDoc, 'creator'),
        editor: getElement(xmlDoc, 'editor'),
        rights: getElement(xmlDoc, 'rights'),
        copyright: getElement(xmlDoc, 'copyright'),
        publisher: getElement(xmlDoc, 'publisher'),
        identifier: getElement(xmlDoc, 'identifier'),
        description: getElement(xmlDoc, 'description'),
        width: width || grid[0].length,
        height: height || grid.length,
        grid,
        questions: getQuestions(xmlDoc, grid)
    };
    
    return result;
}

