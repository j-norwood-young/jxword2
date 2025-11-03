<script lang="ts">
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import Dropdown from './Dropdown.svelte';

	let inputValue = $state('');
	let dropdownValue = $state('');
	let selectedOption = $state<{label: string} | null>(null);

	const dropdownOptions = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true },
		{ value: 'option4', label: 'Option 4' }
	];

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		console.log('Input changed:', inputValue);
	}

	function handleDropdownChange(value: string | number, option: any) {
		dropdownValue = value as string;
		selectedOption = option;
		console.log('Dropdown changed:', value, option);
	}

	function handleButtonClick() {
		console.log('Button clicked!');
		alert(`Input value: ${inputValue}, Dropdown value: ${dropdownValue}`);
	}
</script>

<div class="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Component Examples</h1>
	
	<!-- Button Examples -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold text-gray-800">Buttons</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="primary" onclick={handleButtonClick}>
				Primary Button
			</Button>
			<Button variant="secondary" onclick={handleButtonClick}>
				Secondary Button
			</Button>
			<Button variant="outline" onclick={handleButtonClick}>
				Outline Button
			</Button>
			<Button variant="ghost" onclick={handleButtonClick}>
				Ghost Button
			</Button>
			<Button variant="danger" onclick={handleButtonClick}>
				Danger Button
			</Button>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button size="sm" onclick={handleButtonClick}>Small</Button>
			<Button size="md" onclick={handleButtonClick}>Medium</Button>
			<Button size="lg" onclick={handleButtonClick}>Large</Button>
		</div>
		<Button disabled onclick={handleButtonClick}>
			Disabled Button
		</Button>
	</div>

	<!-- Input Examples -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold text-gray-800">Inputs</h2>
		<Input
			label="Email Address"
			type="email"
			placeholder="Enter your email"
			value={inputValue}
			oninput={handleInputChange}
			required
		/>
		<Input
			label="Password"
			type="password"
			placeholder="Enter your password"
			help="Must be at least 8 characters"
		/>
		<Input
			label="Error State"
			placeholder="This field has an error"
			error="This field is required"
		/>
		<Input
			placeholder="No label input"
			oninput={handleInputChange}
		/>
	</div>

	<!-- Dropdown Examples -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold text-gray-800">Dropdowns</h2>
		<Dropdown
			label="Select an Option"
			options={dropdownOptions}
			value={dropdownValue}
			placeholder="Choose an option..."
			onchange={handleDropdownChange}
		/>
		<Dropdown
			options={dropdownOptions}
			placeholder="No label dropdown"
			onchange={handleDropdownChange}
		/>
		<Dropdown
			label="Error State"
			options={dropdownOptions}
			placeholder="This dropdown has an error"
			error="Please select a valid option"
		/>
		<Dropdown
			label="Disabled Dropdown"
			options={dropdownOptions}
			disabled
			placeholder="This dropdown is disabled"
		/>
	</div>

	<!-- Current Values Display -->
	<div class="mt-8 p-4 bg-gray-50 rounded-lg">
		<h3 class="text-sm font-medium text-gray-700 mb-2">Current Values:</h3>
		<p class="text-sm text-gray-600">Input: {inputValue || 'Empty'}</p>
		<p class="text-sm text-gray-600">Dropdown: {selectedOption?.label || 'None selected'}</p>
	</div>
</div>
