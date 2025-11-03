<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
		placeholder?: string;
		value?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		min?: number;
		max?: number;
		step?: number;
		minlength?: number;
		maxlength?: number;
		pattern?: string;
		autocomplete?: string;
		class?: string;
		label?: string;
		error?: string;
		help?: string;
		oninput?: (event: Event) => void;
		onchange?: (event: Event) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
		onkeydown?: (event: KeyboardEvent) => void;
		onkeyup?: (event: KeyboardEvent) => void;
	}

	let {
		type = 'text',
		placeholder = '',
		value = $bindable(),
		name,
		disabled = false,
		required = false,
		readonly = false,
		min,
		max,
		step,
		minlength,
		maxlength,
		pattern,
		autocomplete,
		class: className = '',
		label,
		error,
		help,
		oninput,
		onchange,
		onfocus,
		onblur,
		onkeydown,
		onkeyup,
		...restProps
	}: Props = $props();

	const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50';
	
	const inputClasses = $derived(error 
		? `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`
		: `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`);

	const finalClasses = $derived(`${inputClasses} ${className}`);
</script>

<div class="space-y-1">
	{#if label}
		<label for="input-{Math.random().toString(36).substr(2, 9)}" class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
	{/if}
	
		<input
			id="input-{Math.random().toString(36).substr(2, 9)}"
			{type}
			{placeholder}
			value={value ?? ''}
			oninput={(e) => {
				value = (e.target as HTMLInputElement).value;
				oninput?.(e);
			}}
			{name}
			{disabled}
			{required}
			{readonly}
			{min}
			{max}
			{step}
			{minlength}
			{maxlength}
			{pattern}
			autocomplete={autocomplete as any}
			class={finalClasses}
			onchange={onchange}
			onfocus={onfocus}
			onblur={onblur}
			onkeydown={onkeydown}
			onkeyup={onkeyup}
			{...restProps}
		/>
	
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
	
	{#if help && !error}
		<p class="text-sm text-gray-500">{help}</p>
	{/if}
</div>
