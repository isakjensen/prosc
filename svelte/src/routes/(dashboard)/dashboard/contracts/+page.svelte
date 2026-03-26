<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import { PlusIcon } from "heroicons-svelte/24/outline";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		DRAFT: "bg-gray-100 text-gray-800",
		SENT: "bg-blue-100 text-blue-800",
		SIGNED: "bg-green-100 text-green-800",
		EXPIRED: "bg-yellow-100 text-yellow-800",
		CANCELLED: "bg-red-100 text-red-800",
	};
	const statusLabels: Record<string, string> = {
		DRAFT: "Utkast",
		SENT: "Skickad",
		SIGNED: "Signerad",
		EXPIRED: "Utgången",
		CANCELLED: "Avbruten",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Avtal</h1>
			<p class="mt-2 text-gray-600">Hantera avtal och mallar</p>
		</div>
		<a href="/dashboard/contracts/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Nytt avtal
			</Button>
		</a>
	</div>

	{#if data.contracts.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga avtal hittades</p>
			<a href="/dashboard/contracts/new" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
				Skapa ditt första avtal
			</a>
		</Card>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Avtalsnr</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Företag</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Titel</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Skapad</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.contracts as contract}
						<tr class="hover:bg-gray-50">
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
								<a href="/dashboard/contracts/{contract.id}" class="text-blue-600 hover:text-blue-700">
									{contract.number}
								</a>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{contract.company.name}</td>
							<td class="px-6 py-4 text-sm text-gray-900">{contract.title}</td>
							<td class="whitespace-nowrap px-6 py-4">
								<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[contract.status] ?? 'bg-gray-100 text-gray-800'}">
									{statusLabels[contract.status] ?? contract.status}
								</span>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
								{format(new Date(contract.createdAt), "d MMM yyyy", { locale: sv })}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
