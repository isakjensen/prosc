<script lang="ts">
	import { BellIcon, MagnifyingGlassIcon } from "heroicons-svelte/24/outline";
	
	interface Props {
		user?: {
			name: string;
			email: string;
		};
	}

	let { user }: Props = $props();
</script>

<header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
	<div class="flex flex-1 items-center gap-4">
		<div class="relative flex-1 max-w-md">
			<MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<input
				type="text"
				placeholder="Sök..."
				class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
	</div>
	
	<div class="flex items-center gap-4">
		<button class="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
			<BellIcon class="h-5 w-5" />
			<span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
		</button>
		
		<div class="flex items-center gap-3">
			<div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
				{user?.name?.[0]?.toUpperCase() || "U"}
			</div>
			<div class="hidden md:block">
				<p class="text-sm font-medium text-gray-900">{user?.name || "Användare"}</p>
				<p class="text-xs text-gray-500">{user?.email || ""}</p>
			</div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
				>
					Logga ut
				</button>
			</form>
		</div>
	</div>
</header>
