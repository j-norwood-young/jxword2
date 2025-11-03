<script lang="ts">
    export let size: number;
    export let grid: string[][];
    import patterns_data from "../data/patterns.json"
    let patterns: number[][][] = [];
    let cell_width: number = 10;
    let svg_width: number;

    function usePattern(pattern: number[][]) {
        for (let y = 0; y < pattern.length; y++) {
            for (let x = 0; x < pattern[y].length; x++) {
                if (pattern[y][x] === 1) {
                    grid[y][x] = "#";
                } else {
                    if (grid[y][x] === "#") {
                        grid[y][x] = " ";
                    }
                }
            }
        }
    }

    $: {
        patterns = [];
        svg_width = size * cell_width;
        for (let pattern of patterns_data) {
            if (pattern.size === size)
            patterns.push(pattern.pattern);
        }
    }
</script>

<main>
    {#if patterns.length !== 0}
    <div class="patterns">
        {#each patterns as pattern}
            <div role="button" tabindex="0" on:click={() => usePattern(pattern)} on:keypress={(e) => { if (e.key === 'Enter' || e.key === ' ') usePattern(pattern); }}>
                <svg class="pattern-preview" width={svg_width} height={svg_width}>
                    {#each pattern as row, y}
                        <g>
                            {#each row as cell, x}
                                <rect x={x * cell_width} y={y * cell_width} width={cell_width} height={cell_width} fill={(cell === 1) ? "black" : "white" } stroke="black" stroke-width="1" />
                            {/each}
                        </g>
                    {/each}
                </svg>
            </div>
        {/each}
    </div>
    {/if}
</main><style lang="scss">
    .patterns {
        display: flex;
        overflow-x: auto;
        width: 500px;
        div {
            margin-right: 20px;
            flex-grow: 1;
            box-shadow: 0 0 10px 0 rgba(0,0,0,0.5);
            margin-bottom: 20px;
        }
        div:hover {
            box-shadow: 0 0 10px 0 rgba(0,0,0,0.8);
            svg {
                transform: scale(1.1);
            }
        }
    }
</style>

