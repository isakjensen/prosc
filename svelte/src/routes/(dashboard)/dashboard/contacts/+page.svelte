<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { MagnifyingGlassIcon, PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();

	let searchQuery = $state("");
	let selectedCompany = $state("");
	$effect(() => {
		searchQuery = data.search ?? "";
		selectedCompany = data.companyId ?? "";
	});
	
	const filteredContacts = $derived(
		data.contacts.filter((c) => {
			const matchesSearch = !searchQuery || 
				`${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.email?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCompany = !selectedCompany || c.companyId === selectedCompany;
			return matchesSearch && matchesCompany;
		})
	);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Kontakter</h1>
			<p class="mt-2 text-gray-600">Hantera din kontaktdatabas</p>
		</div>
		<a href="/dashboard/contacts/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Lägg till kontakt
			</Button>
		</a>
	</div>
	
	<div class="flex gap-4">
		<div class="relative flex-1 max-w-md">
			<MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<Input
				type="text"
				placeholder="Sök kontakter..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>
		<select
			bind:value={selectedCompany}
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">Alla företag</option>
			{#each data.companies as company}
				<option value={company.id}>{company.name}</option>
			{/each}
		</select>
	</div>
	
	{#if filteredContacts.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga kontakter hittades</p>
			<a href="/dashboard/contacts/new" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
				Lägg till din första kontakt
			</a>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredContacts as contact}
				<Card class="p-6 hover:shadow-md transition-shadow">
					<a href="/dashboard/contacts/{contact.id}" class="block">
						<h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600">
							{contact.firstName} {contact.lastName}
						</h3>
						{#if contact.title}
							<p class="mt-1 text-sm text-gray-600">{contact.title}</p>
						{/if}
						<p class="mt-2 text-sm text-gray-500">{contact.company.name}</p>
						{#if contact.email}
							<p class="mt-1 text-sm text-gray-600">{contact.email}</p>
						{/if}
					</a>
				</Card>
			{/each}
		</div>
	{/if}
</div>
