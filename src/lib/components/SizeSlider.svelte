<script lang="ts">

	type Props = {
		size: number;
		onChange?: () => void;
	}
	let { size = $bindable(15), onChange = $bindable() }: Props = $props();

    // Sizes
	const sizes = [
		{
			name: "Mini",
			size: 5,
			min: 2,
			max: 5,
		},
		{
			name: "Small",
			size: 7,
			min: 6,
			max: 10,
		},
		{
			name: "Weekday",
			size: 15,
			min: 11,
			max: 20
		},
		{
			name: "Large",
			size: 23,
			min: 21,
			max: 26
		},
		{
			name: "XLarge",
			size: 27,
			min: 27,
			max: 30
		}
	];

    let current_size = $derived(findSize(size));
    
    function findSize(size: number) {
        return sizes.find(s => size >= s.min && size <= s.max);
    }

    function handleStateChange() {
        current_size = findSize(size);
        onChange?.();
    }
</script>

<main class="w-full flex flex-col justify-start items-start mb-2.5">
    <input 
        name="size" 
        type="range" 
        min="2" 
        max="30" 
        bind:value="{size}" 
        onchange="{handleStateChange}"
        class="w-full max-w-xs"
    >
    <label for="size" class="mt-1 text-sm text-gray-500">{`${current_size?.name} ${size}x${size}`}</label>
</main>