<script lang="ts">
	import type { Snippet } from "svelte";

	let { class: className = "", children }: { class?: string; children?: Snippet } = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
