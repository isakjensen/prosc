<script lang="ts">
	import MainLayout from "$lib/components/layout/main-layout.svelte";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();
</script>

<MainLayout user={data.user}>
	{#if children}
		{@render children()}
	{/if}
</MainLayout>
