<script lang="ts">
	import type { Snippet } from "svelte";
	import Sidebar from "./sidebar.svelte";
	import TopBar from "./topbar.svelte";

	interface Props {
		user?: {
			name: string;
			email: string;
			role: string;
		};
		children?: Snippet;
	}

	let { user, children }: Props = $props();
</script>

<div class="flex h-screen overflow-hidden bg-gray-50">
	<Sidebar {user} />
	<div class="flex flex-1 flex-col overflow-hidden">
		<TopBar {user} />
		<main class="flex-1 overflow-y-auto p-6">
			{#if children}
				{@render children()}
			{/if}
		</main>
	</div>
</div>
