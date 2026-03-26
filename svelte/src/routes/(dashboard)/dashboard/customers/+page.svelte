<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { MagnifyingGlassIcon, PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();

	let searchQuery = $state("");
	$effect(() => {
		searchQuery = data.search ?? "";
	});
	
	const filteredCompanies = $derived(
		data.companies.filter((c) => {
			return !searchQuery || 
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.email?.toLowerCase().includes(searchQuery.toLowerCase());
		})
	);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Kunder</h1>
			<p class="mt-2 text-gray-600">Hantera dina kundrelationer</p>
		</div>
		<a href="/dashboard/customers/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Lägg till kund
			</Button>
		</a>
	</div>
	
	<div class="relative max-w-md">
		<MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
		<Input
			type="text"
			placeholder="Sök kunder..."
			bind:value={searchQuery}
			class="pl-10"
		/>
	</div>
	
	{#if filteredCompanies.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga kunder hittades</p>
			<a href="/dashboard/customers/new" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
				Lägg till din första kund
			</a>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredCompanies as company}
				<Card class="p-6 hover:shadow-md transition-shadow">
					<a href="/dashboard/customers/{company.id}" class="block">
						<h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600">
							{company.name}
						</h3>
						<div class="mt-4 space-y-2 text-sm text-gray-600">
							{#if company.email}
								<p>{company.email}</p>
							{/if}
							<div class="flex gap-4 text-xs text-gray-500">
								<span>{company._count.projects} projekt</span>
								<span>{company._count.invoices} faktura{company._count.invoices !== 1 ? "or" : ""}</span>
							</div>
						</div>
					</a>
				</Card>
			{/each}
		</div>
	{/if}
</div>
