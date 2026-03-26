<script lang="ts">
	import { page } from "$app/stores";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { stageNameSv } from "$lib/i18n/prospectStages";
	import { MagnifyingGlassIcon, PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();

	let searchQuery = $state("");
	let selectedStage = $state("");
	$effect(() => {
		searchQuery = data.search ?? "";
		selectedStage = data.stageId ?? "";
	});
	
	function filterByStage(company: any) {
		if (!selectedStage) return true;
		return company.prospectStage?.currentStageId === selectedStage;
	}
	
	const filteredCompanies = $derived(
		data.companies.filter((c) => {
			const matchesSearch = !searchQuery || 
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.email?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesSearch && filterByStage(c);
		})
	);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Prospekt</h1>
			<p class="mt-2 text-gray-600">Hantera din sälppipeline</p>
		</div>
		<a href="/dashboard/prospects/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Lägg till prospekt
			</Button>
		</a>
	</div>
	
	<div class="flex gap-4">
		<div class="relative flex-1 max-w-md">
			<MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<Input
				type="text"
				placeholder="Sök prospekt..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>
		<select
			bind:value={selectedStage}
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">Alla steg</option>
			{#each data.stages as stage}
				<option value={stage.id}>{stageNameSv(stage.name)}</option>
			{/each}
		</select>
	</div>
	
	{#if filteredCompanies.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga prospekt hittades</p>
			<a href="/dashboard/prospects/new" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
				Lägg till ditt första prospekt
			</a>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredCompanies as company}
				<Card class="p-6 hover:shadow-md transition-shadow">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<a href="/dashboard/prospects/{company.id}" class="text-lg font-semibold text-gray-900 hover:text-blue-600">
								{company.name}
							</a>
							{#if company.prospectStage}
								<div class="mt-2">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
										style="background-color: {company.prospectStage.currentStage.color || '#3B82F6'}20; color: {company.prospectStage.currentStage.color || '#3B82F6'}"
									>
										{stageNameSv(company.prospectStage.currentStage.name)}
									</span>
								</div>
							{/if}
							<div class="mt-4 space-y-1 text-sm text-gray-600">
								{#if company.email}
									<p>{company.email}</p>
								{/if}
								{#if company.phone}
									<p>{company.phone}</p>
								{/if}
								<p class="text-xs text-gray-500">
									{company._count.contacts} kontakt{company._count.contacts !== 1 ? "er" : ""} •
									{company._count.quotes} offert{company._count.quotes !== 1 ? "er" : ""}
								</p>
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
