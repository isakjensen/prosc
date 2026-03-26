<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { goto } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let formData = $state({ companyId: "", title: "", description: "", priority: "MEDIUM" });
	let error = $state("");

	const statusColors: Record<string, string> = {
		OPEN: "bg-yellow-100 text-yellow-800",
		IN_PROGRESS: "bg-blue-100 text-blue-800",
		RESOLVED: "bg-green-100 text-green-800",
		CLOSED: "bg-gray-100 text-gray-800",
	};
	const statusLabels: Record<string, string> = {
		OPEN: "Öppen",
		IN_PROGRESS: "Pågår",
		RESOLVED: "Löst",
		CLOSED: "Stängd",
	};
	const priorityLabels: Record<string, string> = {
		LOW: "Låg",
		MEDIUM: "Medium",
		HIGH: "Hög",
		URGENT: "Brådskande",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Supportärenden</h1>
			<p class="mt-2 text-gray-600">Hantera kundsupport</p>
		</div>
		<Button onclick={() => (showForm = !showForm)}>
			<PlusIcon class="mr-2 h-5 w-5" />
			Nytt ärende
		</Button>
	</div>

	<div class="flex gap-2 mb-4">
		<a href="/dashboard/support"><Button variant="outline" size="sm">Alla statusar</Button></a>
		{#each Object.entries(statusLabels) as [value, label]}
			<a href="/dashboard/support?status={value}"><Button variant="outline" size="sm">{label}</Button></a>
		{/each}
	</div>

	{#if showForm}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Nytt supportärende</h2>
			{#if error}
				<p class="mb-4 text-sm text-red-600">{error}</p>
			{/if}
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success" && result.data?.ticketId) {
							showForm = false;
							formData = { companyId: "", title: "", description: "", priority: "MEDIUM" };
							await invalidateAll();
							goto(`/dashboard/support/${result.data.ticketId}`);
						} else if (result.type === "failure" && result.data?.error) {
							error = result.data.error;
						}
					};
				}}
			>
				<div class="space-y-4 max-w-2xl">
					<div>
						<Label for="companyId">Företag *</Label>
						<select
							id="companyId"
							name="companyId"
							bind:value={formData.companyId}
							required
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Välj företag</option>
							{#each data.companies as c}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<Label for="title">Titel *</Label>
						<Input id="title" name="title" bind:value={formData.title} required />
					</div>
					<div>
						<Label for="description">Beskrivning *</Label>
						<textarea
							id="description"
							name="description"
							bind:value={formData.description}
							rows="4"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						></textarea>
					</div>
					<div>
						<Label for="priority">Prioritet</Label>
						<select
							id="priority"
							name="priority"
							bind:value={formData.priority}
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							{#each Object.entries(priorityLabels) as [value, label]}
								<option value={value}>{label}</option>
							{/each}
						</select>
					</div>
					<Button type="submit">Skapa ärende</Button>
				</div>
			</form>
		</Card>
	{/if}

	{#if data.tickets.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga supportärenden</p>
			<button type="button" onclick={() => (showForm = true)} class="mt-4 text-blue-600 hover:text-blue-700">Skapa ett ärende</button>
		</Card>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ärende</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Företag</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Prioritet</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tilldelad</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Skapad</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.tickets as ticket}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4">
								<a href="/dashboard/support/{ticket.id}" class="text-sm font-medium text-blue-600 hover:text-blue-700">
									{ticket.title}
								</a>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{ticket.company.name}</td>
							<td class="whitespace-nowrap px-6 py-4">
								<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[ticket.status] ?? 'bg-gray-100'}">
									{statusLabels[ticket.status] ?? ticket.status}
								</span>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{priorityLabels[ticket.priority] ?? ticket.priority}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{ticket.assignee?.name ?? "–"}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
								{format(new Date(ticket.createdAt), "d MMM yyyy", { locale: sv })}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
