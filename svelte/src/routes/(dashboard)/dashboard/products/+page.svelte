<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import {
		PlusIcon,
		MagnifyingGlassIcon,
		CubeIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
	let searchQuery = $state("");

	const statusLabels: Record<string, string> = {
		ACTIVE: "Aktiv",
		PAUSED: "Pausad",
		ARCHIVED: "Arkiverad",
	};

	const statusColors: Record<string, string> = {
		ACTIVE: "bg-green-100 text-green-700",
		PAUSED: "bg-yellow-100 text-yellow-700",
		ARCHIVED: "bg-gray-100 text-gray-500",
	};

	const grouped = $derived(() => {
		const map = new Map<string, { company: { id: string; name: string }; products: typeof data.products }>();
		for (const p of data.products) {
			const key = p.company.id;
			if (!map.has(key)) {
				map.set(key, { company: p.company, products: [] });
			}
			map.get(key)!.products.push(p);
		}
		return Array.from(map.values());
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Produkter</h1>
			<p class="mt-1 text-gray-500">Hantera produkter kopplade till dina kunder</p>
		</div>
		<a href="/dashboard/products/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Ny produkt
			</Button>
		</a>
	</div>

	<!-- Search -->
	<form method="GET" class="relative max-w-md">
		<MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
		<Input
			type="text"
			name="search"
			placeholder="Sök produkt eller kund..."
			bind:value={searchQuery}
			class="pl-10"
		/>
	</form>

	{#if data.products.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
			<CubeIcon class="h-12 w-12 text-gray-400" />
			<h3 class="mt-4 text-lg font-medium text-gray-900">Inga produkter ännu</h3>
			<p class="mt-1 text-gray-500">Skapa din första produkt för att komma igång.</p>
			<a href="/dashboard/products/new" class="mt-4">
				<Button>
					<PlusIcon class="mr-2 h-5 w-5" />
					Skapa produkt
				</Button>
			</a>
		</div>
	{:else}
		{#each grouped() as group}
			<div class="space-y-3">
				<h2 class="text-lg font-semibold text-gray-700">
					<a href="/dashboard/customers/{group.company.id}" class="hover:text-blue-600">
						{group.company.name}
					</a>
				</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each group.products as product}
						<a href="/dashboard/products/{product.id}">
							<Card class="p-5 hover:shadow-md transition-shadow cursor-pointer">
								<div class="flex items-start justify-between">
									<h3 class="font-semibold text-gray-900">{product.name}</h3>
									<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[product.status]}">
										{statusLabels[product.status]}
									</span>
								</div>
								{#if product.description}
									<p class="mt-2 text-sm text-gray-600 line-clamp-2">{product.description}</p>
								{/if}
								<div class="mt-4 flex items-center gap-4 text-xs text-gray-500">
									<span>{product._count.features} funktioner</span>
									<span>{product._count.financeEntries} ekonomiposter</span>
								</div>
							</Card>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
