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
	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen overflow-hidden bg-gray-50">
	<Sidebar {user} open={sidebarOpen} onclose={() => (sidebarOpen = false)} />
	<div class="flex flex-1 flex-col overflow-hidden">
		<TopBar {user} ontogglemenu={() => (sidebarOpen = !sidebarOpen)} />
		<main class="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
			{#if children}
				{@render children()}
			{/if}
		</main>
	</div>
</div>
