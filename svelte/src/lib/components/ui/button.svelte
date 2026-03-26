<script lang="ts">
	import { Button } from "bits-ui";
	import type { Snippet } from "svelte";

	interface Props {
		variant?: "default" | "outline" | "ghost" | "destructive";
		size?: "sm" | "md" | "lg";
		class?: string;
		children?: Snippet;
	}

	let { variant = "default", size = "md", class: className = "", children, ...restProps }: Props & Record<string, unknown> = $props();

	const variantClasses = {
		default: "bg-blue-600 text-white hover:bg-blue-700",
		outline: "border border-gray-300 bg-white hover:bg-gray-50",
		ghost: "hover:bg-gray-100",
		destructive: "bg-red-600 text-white hover:bg-red-700",
	};

	const sizeClasses = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-base",
		lg: "px-6 py-3 text-lg",
	};
</script>

<Button.Root
	class="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none {variantClasses[variant]} {sizeClasses[size]} {className}"
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</Button.Root>
