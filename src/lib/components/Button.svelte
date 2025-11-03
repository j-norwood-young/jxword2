<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children?: import('svelte').Snippet;
		onclick?: (event: MouseEvent) => void;
		onmousedown?: (event: MouseEvent) => void;
		onmouseup?: (event: MouseEvent) => void;
		onmouseenter?: (event: MouseEvent) => void;
		onmouseleave?: (event: MouseEvent) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		class: className = '',
		children,
		onclick,
		onmousedown,
		onmouseup,
		onmouseenter,
		onmouseleave,
		onfocus,
		onblur,
		...restProps
	}: Props = $props();

	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
		secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 active:bg-gray-800',
		outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 active:bg-gray-100',
		ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const classes = $derived(`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`);
</script>

<button
	{type}
	{disabled}
	class={classes}
	onclick={onclick}
	onmousedown={onmousedown}
	onmouseup={onmouseup}
	onmouseenter={onmouseenter}
	onmouseleave={onmouseleave}
	onfocus={onfocus}
	onblur={onblur}
	{...restProps}
>
	{@render children?.()}
</button>
