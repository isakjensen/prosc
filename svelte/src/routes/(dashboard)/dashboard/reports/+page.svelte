<script lang="ts">
	import { enhance } from "$app/forms";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let formData = $state({
		type: "REVENUE",
		dateFrom: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
		dateTo: format(new Date(), "yyyy-MM-dd"),
	});
	let result = $state<{ data: unknown; error: string | null } | null>(null);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Rapporter och analyser</h1>
		<p class="mt-2 text-gray-600">Generera rapporter för valt datumintervall</p>
	</div>

	<Card class="p-6">
		<form
			method="POST"
			action="?/run"
			use:enhance={() => {
				return async ({ result: res, update }) => {
					await update();
					if (res.type === "success" && res.data) {
						result = { data: res.data.data, error: res.data.error };
					}
				};
			}}
			class="flex flex-wrap items-end gap-4"
		>
			<div>
				<Label for="type">Rapporttyp</Label>
				<select
					id="type"
					name="type"
					bind:value={formData.type}
					class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each data.reportTypes as t}
						<option value={t.id}>{t.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label for="dateFrom">Från datum</Label>
				<Input id="dateFrom" name="dateFrom" type="date" bind:value={formData.dateFrom} />
			</div>
			<div>
				<Label for="dateTo">Till datum</Label>
				<Input id="dateTo" name="dateTo" type="date" bind:value={formData.dateTo} />
			</div>
			<Button type="submit">Generera rapport</Button>
		</form>
	</Card>

	{#if result?.error}
		<Card class="p-6">
			<p class="text-red-600">{result.error}</p>
		</Card>
	{/if}

	{#if result?.data}
		{@const d = result.data as Record<string, unknown>}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Resultat</h2>

			{#if d.summary}
				<div class="mb-6 rounded-lg bg-gray-50 p-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Sammanfattning</h3>
					<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
						{#each Object.entries(d.summary as Record<string, unknown>) as [key, value]}
							{#if typeof value === "number"}
								<div>
									<dt class="text-gray-500">{key}</dt>
									<dd class="font-medium text-gray-900">{key.includes("total") || key.includes("Amount") || key.includes("Hours") ? `${value} ${key.includes("Hours") ? "h" : "kr"}` : value}</dd>
								</div>
							{:else if typeof value === "object" && value !== null && !Array.isArray(value)}
								<!-- skip nested -->
							{:else}
								<div>
									<dt class="text-gray-500">{key}</dt>
									<dd class="font-medium text-gray-900">{String(value)}</dd>
								</div>
							{/if}
						{/each}
					</dl>
				</div>
			{/if}

			{#if d.byProject && Array.isArray(d.byProject)}
				<div class="mb-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Timmar per projekt</h3>
					<table class="min-w-full text-sm">
						<thead class="border-b border-gray-200">
							<tr><th class="text-left py-2 text-gray-500">Projekt</th><th class="text-right py-2 text-gray-500">Timmar</th></tr>
						</thead>
						<tbody>
							{#each d.byProject as row}
								<tr class="border-b border-gray-100">
									<td class="py-2">{(row as { name: string }).name}</td>
									<td class="text-right py-2">{(row as { hours: number }).hours.toFixed(1)} h</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if d.invoices && Array.isArray(d.invoices)}
				<div class="overflow-x-auto">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Fakturor</h3>
					<table class="min-w-full text-sm">
						<thead class="border-b border-gray-200">
							<tr>
								<th class="text-left py-2 text-gray-500">Nummer</th>
								<th class="text-left py-2 text-gray-500">Företag</th>
								<th class="text-right py-2 text-gray-500">Belopp</th>
								<th class="text-left py-2 text-gray-500">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each (d.invoices as Array<{ number: string; company: string; total: number; status: string }>).slice(0, 50) as row}
								<tr class="border-b border-gray-100">
									<td class="py-2">{row.number}</td>
									<td class="py-2">{row.company}</td>
									<td class="text-right py-2">{row.total.toFixed(2)} kr</td>
									<td class="py-2">{row.status}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if (d.invoices as unknown[]).length > 50}
						<p class="mt-2 text-xs text-gray-500">Visar 50 av {(d.invoices as unknown[]).length} rader</p>
					{/if}
				</div>
			{/if}

			{#if d.quotes && Array.isArray(d.quotes)}
				<div class="overflow-x-auto mt-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Offerter</h3>
					<table class="min-w-full text-sm">
						<thead class="border-b border-gray-200">
							<tr>
								<th class="text-left py-2 text-gray-500">Nummer</th>
								<th class="text-left py-2 text-gray-500">Företag</th>
								<th class="text-right py-2 text-gray-500">Belopp</th>
								<th class="text-left py-2 text-gray-500">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each (d.quotes as Array<{ number: string; company: string; total: number; status: string }>).slice(0, 50) as row}
								<tr class="border-b border-gray-100">
									<td class="py-2">{row.number}</td>
									<td class="py-2">{row.company}</td>
									<td class="text-right py-2">{row.total.toFixed(2)} kr</td>
									<td class="py-2">{row.status}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if d.tickets && Array.isArray(d.tickets)}
				<div class="overflow-x-auto mt-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Supportärenden</h3>
					<table class="min-w-full text-sm">
						<thead class="border-b border-gray-200">
							<tr>
								<th class="text-left py-2 text-gray-500">Titel</th>
								<th class="text-left py-2 text-gray-500">Företag</th>
								<th class="text-left py-2 text-gray-500">Status</th>
								<th class="text-left py-2 text-gray-500">Tilldelad</th>
							</tr>
						</thead>
						<tbody>
							{#each (d.tickets as Array<{ title: string; company: string; status: string; assignee?: string }>).slice(0, 50) as row}
								<tr class="border-b border-gray-100">
									<td class="py-2">{row.title}</td>
									<td class="py-2">{row.company}</td>
									<td class="py-2">{row.status}</td>
									<td class="py-2">{row.assignee ?? "–"}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	{/if}

	{#if result === null}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Välj rapporttyp och datumintervall, klicka sedan på "Generera rapport".</p>
		</Card>
	{/if}
</div>
