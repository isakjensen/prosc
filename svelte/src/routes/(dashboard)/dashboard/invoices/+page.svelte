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
		PAID: "bg-green-100 text-green-800",
		OVERDUE: "bg-red-100 text-red-800",
		CANCELLED: "bg-yellow-100 text-yellow-800",
	};
	const statusLabels: Record<string, string> = {
		DRAFT: "Utkast",
		SENT: "Skickad",
		PAID: "Betald",
		OVERDUE: "Förfallen",
		CANCELLED: "Avbruten",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Fakturor</h1>
			<p class="mt-2 text-gray-600">Hantera fakturor och betalningar</p>
		</div>
		<a href="/dashboard/invoices/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Ny faktura
			</Button>
		</a>
	</div>

	<div class="flex gap-2 mb-4">
		<a href="/dashboard/invoices">
			<Button variant="outline" size="sm">Alla</Button>
		</a>
		{#each Object.entries(statusLabels) as [value, label]}
			<a href="/dashboard/invoices?status={value}">
				<Button variant="outline" size="sm">{label}</Button>
			</a>
		{/each}
	</div>

	{#if data.invoices.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga fakturor hittades</p>
			<a href="/dashboard/invoices/new" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
				Skapa din första faktura
			</a>
		</Card>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Faktura nr</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Företag</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Titel</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Totalt</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Förfallo</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.invoices as invoice}
						<tr class="hover:bg-gray-50">
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
								<a href="/dashboard/invoices/{invoice.id}" class="text-blue-600 hover:text-blue-700">
									{invoice.number}
								</a>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{invoice.company.name}</td>
							<td class="px-6 py-4 text-sm text-gray-900">{invoice.title}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{invoice.total.toFixed(2)} kr</td>
							<td class="whitespace-nowrap px-6 py-4">
								<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[invoice.status] ?? 'bg-gray-100 text-gray-800'}">
									{statusLabels[invoice.status] ?? invoice.status}
								</span>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
								{#if invoice.dueDate}
									{format(new Date(invoice.dueDate), "d MMM yyyy", { locale: sv })}
								{:else}
									–
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
