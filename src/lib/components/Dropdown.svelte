<script lang="ts">
	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		options: Option[];
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		label?: string;
		error?: string;
		help?: string;
		onchange?: (value: string | number, option: Option) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
	}

	let {
		options = [],
		value = $bindable(),
		placeholder = 'Select an option...',
		disabled = false,
		required = false,
		class: className = '',
		label,
		error,
		help,
		onchange,
		onfocus,
		onblur,
		...restProps
	}: Props = $props();

	let isOpen = $state(false);
	let selectedOption = $derived(options.find(option => option.value === value));

	const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50';
	
	const selectClasses = $derived(error 
		? `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`
		: `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`);

	const finalClasses = $derived(`${selectClasses} ${className}`);

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const selectedValue = target.value;
		const option = options.find(opt => opt.value.toString() === selectedValue);
		
		if (option && onchange) {
			onchange(selectedValue, option);
		}
	}

	function handleOptionClick(option: Option) {
		if (option.disabled) return;
		
		value = option.value;
		if (onchange) {
			onchange(option.value, option);
		}
		isOpen = false;
	}

	function toggleDropdown() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}
</script>

<div class="relative space-y-1" role="combobox" aria-controls="dropdown-options" aria-expanded={isOpen} tabindex="0" onkeydown={handleKeydown}>
	{#if label}
		<label for="dropdown-{Math.random().toString(36).substr(2, 9)}" class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
	{/if}
	
	<div class="relative">
		<button
			id="dropdown-{Math.random().toString(36).substr(2, 9)}"
			type="button"
			class={finalClasses}
			{disabled}
			onclick={toggleDropdown}
			onfocus={onfocus}
			onblur={onblur}
			{...restProps}
		>
			<span class="block truncate text-left">
				{selectedOption ? selectedOption.label : placeholder}
			</span>
			<span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
				<svg 
					class="w-5 h-5 text-gray-400 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" 
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</span>
		</button>
		
		{#if isOpen}
			<div id="dropdown-options" class="absolute z-10 w-full mt-0.5 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
				{#each options as option (option.value)}
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed {option.disabled ? 'opacity-50 cursor-not-allowed' : ''} {option.value === value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}"
						disabled={option.disabled}
						onclick={() => handleOptionClick(option)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
	
	{#if help && !error}
		<p class="text-sm text-gray-500">{help}</p>
	{/if}
</div>

<!-- Click outside to close -->
<svelte:window onclick={(e) => {
	if (isOpen && e.target && 'closest' in e.target) {
		const target = e.target as Element;
		// Check if the click is outside the dropdown container
		if (!target.closest('.relative')) {
			isOpen = false;
		}
	}
}} />
