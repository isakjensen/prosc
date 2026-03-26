<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PlusIcon, PencilIcon, TrashIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let formData = $state({
		projectId: "",
		taskId: "",
		description: "",
		hours: "1",
		date: format(new Date(), "yyyy-MM-dd"),
		billable: true,
	});

	$effect(() => {
		if (!formData.date) formData.date = format(new Date(), "yyyy-MM-dd");
	});

	function setEdit(entry: (typeof data.entries)[0]) {
		editingId = entry.id;
		formData.projectId = entry.projectId ?? "";
		formData.taskId = entry.taskId ?? "";
		formData.description = entry.description;
		formData.hours = String(entry.hours);
		formData.date = format(new Date(entry.date), "yyyy-MM-dd");
		formData.billable = entry.billable;
	}

	function cancelEdit() {
		editingId = null;
		showForm = false;
		formData.description = "";
		formData.hours = "1";
		formData.date = format(new Date(), "yyyy-MM-dd");
		formData.billable = true;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Tidrapportering</h1>
			<p class="mt-2 text-gray-600">Rapportera och granska tid per projekt</p>
		</div>
		<Button onclick={() => { showForm = true; editingId = null; formData.description = ""; formData.hours = "1"; formData.date = format(new Date(), "yyyy-MM-dd"); formData.billable = true; }}>
			<PlusIcon class="mr-2 h-5 w-5" />
			Rapportera tid
		</Button>
	</div>

	<!-- Filter -->
	<form method="GET" class="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 mb-4">
		<div>
			<Label for="filterProject" class="text-xs">Projekt</Label>
			<select
				id="filterProject"
				name="projectId"
				class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Alla</option>
				{#each data.projects as p}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</div>
		{#if data.isAdmin}
			<div>
				<Label for="filterUser" class="text-xs">Användare</Label>
				<select
					id="filterUser"
					name="userId"
					class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Alla</option>
					{#each data.users as u}
						<option value={u.id}>{u.name}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<Label for="dateFrom" class="text-xs">Från datum</Label>
			<Input id="dateFrom" name="dateFrom" type="date" />
		</div>
		<div>
			<Label for="dateTo" class="text-xs">Till datum</Label>
			<Input id="dateTo" name="dateTo" type="date" />
		</div>
		<Button type="submit" variant="outline" size="sm">Filtrera</Button>
	</form>

	<!-- Summering -->
	<Card class="p-4">
		<p class="text-sm text-gray-600">Totalt rapporterat: <strong>{data.totalHours.toFixed(1)} timmar</strong></p>
		{#if data.byProject.length > 0}
			<ul class="mt-2 text-sm text-gray-600">
				{#each data.byProject as row}
					<li>{row.name}: {row.hours.toFixed(1)} h</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<!-- Form: create or edit -->
	{#if showForm || editingId}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">{editingId ? "Redigera post" : "Rapportera tid"}</h2>
			<form
				method="POST"
				action={editingId ? "?/update" : "?/create"}
				use:enhance={() => async ({ update }) => { await update(); cancelEdit(); await invalidateAll(); }}
			>
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}
				<div class="flex flex-wrap gap-4">
					<div>
						<Label for="projectId" class="text-xs">Projekt</Label>
						<select
							id="projectId"
							name="projectId"
							bind:value={formData.projectId}
							class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Inget projekt</option>
							{#each data.projects as p}
								<option value={p.id}>{p.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<Label for="taskId" class="text-xs">Uppgift</Label>
						<select
							id="taskId"
							name="taskId"
							bind:value={formData.taskId}
							class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Ingen uppgift</option>
							{#each data.tasks as t}
								<option value={t.id}>{t.title}</option>
							{/each}
						</select>
					</div>
					<div class="flex-1 min-w-[200px]">
						<Label for="description" class="text-xs">Beskrivning *</Label>
						<Input id="description" name="description" bind:value={formData.description} required placeholder="T.ex. Möte med kund" />
					</div>
					<div>
						<Label for="hours" class="text-xs">Timmar *</Label>
						<Input id="hours" name="hours" type="number" step="0.25" min="0.25" bind:value={formData.hours} required />
					</div>
					<div>
						<Label for="date" class="text-xs">Datum</Label>
						<Input id="date" name="date" type="date" bind:value={formData.date} />
					</div>
					<div class="flex items-center gap-2">
						<input id="billable" type="checkbox" name="billable" value="on" checked={formData.billable} onchange={(e) => (formData.billable = (e.currentTarget as HTMLInputElement).checked)} />
						<Label for="billable" class="text-xs">Fakturerbar</Label>
					</div>
					<div class="flex gap-2">
						<Button type="submit">{editingId ? "Spara" : "Lägg till"}</Button>
						<Button type="button" variant="outline" onclick={cancelEdit}>Avbryt</Button>
					</div>
				</div>
			</form>
		</Card>
	{/if}

	<!-- List -->
	<Card class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Rapporterad tid</h2>
		{#if data.entries.length === 0}
			<p class="text-gray-500">Inga tidrapporter än. Klicka på "Rapportera tid" för att lägga till.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Användare</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Projekt</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Beskrivning</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Timmar</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Fakturerbar</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each data.entries as entry}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
									{format(new Date(entry.date), "d MMM yyyy", { locale: sv })}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{entry.user.name}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{entry.project?.name ?? "–"}</td>
								<td class="px-4 py-3 text-sm text-gray-900">{entry.description}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{entry.hours} h</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{entry.billable ? "Ja" : "Nej"}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm">
									{#if data.currentUser && (entry.user.id === data.currentUser.id || data.isAdmin)}
										<button type="button" onclick={() => setEdit(entry)} class="text-blue-600 hover:text-blue-700 mr-2">Redigera</button>
										<form method="POST" action="?/delete" class="inline" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
											<input type="hidden" name="id" value={entry.id} />
											<button type="submit" class="text-red-600 hover:text-red-700">Ta bort</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
