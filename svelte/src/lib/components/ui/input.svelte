<script lang="ts">
	interface Props {
		type?: string;
		class?: string;
		placeholder?: string;
		value?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		name?: string;
		step?: number | string;
		min?: number | string;
		max?: number | string;
	}

	let {
		type = "text",
		class: className = "",
		placeholder = "",
		value = $bindable(),
		disabled = false,
		required = false,
		id,
		name,
		step,
		min,
		max,
		...restProps
	}: Props = $props();
</script>

<input
	type={type}
	id={id}
	name={name}
	class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className}"
	{placeholder}
	bind:value
	{disabled}
	{required}
	{step}
	{min}
	{max}
	{...restProps}
/>
