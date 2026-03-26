<script lang="ts">
	import { Label } from "bits-ui";
	import type { Snippet } from "svelte";

	let { class: className = "", children, ...restProps }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<Label.Root
	class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 {className}"
	{...restProps}
>
	{@render children()}
</Label.Root>
