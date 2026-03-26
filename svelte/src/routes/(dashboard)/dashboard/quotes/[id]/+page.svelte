<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PencilIcon, TrashIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let formData = $state({
		title: "",
		status: "",
		validUntil: "",
		notes: "",
	});
	let newLine = $state({ description: "", quantity: "1", unitPrice: "0" });
	let error = $state("");

	$effect(() => {
		formData.title = data.quote.title;
		formData.status = data.quote.status;
		formData.validUntil = data.quote.validUntil
			? format(new Date(data.quote.validUntil), "yyyy-MM-dd")
			: "";
		formData.notes = data.quote.notes ?? "";
	});

	const statusColors: Record<string, string> = {
		DRAFT: "bg-gray-100 text-gray-800",
		SENT: "bg-blue-100 text-blue-800",
		ACCEPTED: "bg-green-100 text-green-800",
		REJECTED: "bg-red-100 text-red-800",
		EXPIRED: "bg-yellow-100 text-yellow-800",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.quote.number}</h1>
			<p class="mt-1 text-gray-600">{data.quote.company.name}</p>
			<span
				class="mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[data.quote.status] ?? 'bg-gray-100 text-gray-800'}"
			>
				{data.statusLabels[data.quote.status] ?? data.quote.status}
			</span>
		</div>
		<div class="flex gap-2">
			<a href="/dashboard/quotes/{data.quote.id}/pdf" target="_blank" rel="noopener noreferrer" download>
				<Button variant="outline">Ladda ner PDF</Button>
			</a>
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/quotes">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Offertinformation</h2>
			{#if editing}
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === "success" && result.data?.success) {
								editing = false;
								await invalidateAll();
							} else if (result.type === "success" && result.data?.error) {
								error = result.data.error;
							}
						};
					}}
				>
					{#if error}
						<p class="mb-2 text-sm text-red-600">{error}</p>
					{/if}
					<div class="space-y-4">
						<div>
							<Label for="title">Titel</Label>
							<Input id="title" name="title" bind:value={formData.title} required />
						</div>
						<div>
							<Label for="status">Status</Label>
							<select
								id="status"
								name="status"
								bind:value={formData.status}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{#each Object.entries(data.statusLabels) as [value, label]}
									<option value={value}>{label}</option>
								{/each}
							</select>
						</div>
						<div>
							<Label for="validUntil">Giltig till</Label>
							<Input id="validUntil" name="validUntil" type="date" bind:value={formData.validUntil} />
						</div>
						<div>
							<Label for="notes">Anteckningar</Label>
							<textarea
								id="notes"
								name="notes"
								bind:value={formData.notes}
								rows="2"
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							></textarea>
						</div>
						<Button type="submit">Spara ändringar</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Titel</dt>
						<dd class="text-gray-900">{data.quote.title}</dd>
					</div>
					{#if data.quote.validUntil}
						<div>
							<dt class="text-sm font-medium text-gray-500">Giltig till</dt>
							<dd class="text-gray-900">{format(new Date(data.quote.validUntil), "d MMM yyyy", { locale: sv })}</dd>
						</div>
					{/if}
					{#if data.quote.notes}
						<div>
							<dt class="text-sm font-medium text-gray-500">Anteckningar</dt>
							<dd class="text-gray-900 whitespace-pre-wrap">{data.quote.notes}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-sm font-medium text-gray-500">Skapad</dt>
						<dd class="text-gray-900">{format(new Date(data.quote.createdAt), "d MMM yyyy HH:mm", { locale: sv })}</dd>
					</div>
				</dl>
			{/if}
		</Card>

		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Radposter</h2>
			{#if data.quote.lineItems.length === 0}
				<p class="text-sm text-gray-500">Inga rader än. Lägg till nedan.</p>
			{:else}
				<div class="space-y-3">
					{#each data.quote.lineItems as item}
						<div class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
							<div>
								<p class="font-medium text-gray-900">{item.description}</p>
								<p class="text-sm text-gray-500">
									{item.quantity} × {item.unitPrice.toFixed(2)} kr = {item.total.toFixed(2)} kr
								</p>
							</div>
							<form method="POST" action="?/removeLineItem" use:enhance={() => async ({ update }) => await update().then(() => invalidateAll())}>
								<input type="hidden" name="lineItemId" value={item.id} />
								<button type="submit" class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Ta bort rad">
									<TrashIcon class="h-5 w-5" />
								</button>
							</form>
						</div>
					{/each}
				</div>
			{/if}

			<form
				method="POST"
				action="?/addLineItem"
				class="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-gray-300 p-3"
				use:enhance={() => async ({ update }) => await update().then(() => invalidateAll())}
			>
				<div class="flex-1 min-w-[120px]">
					<Label for="newDesc" class="text-xs">Beskrivning</Label>
					<Input id="newDesc" name="description" bind:value={newLine.description} placeholder="Artikel" required />
				</div>
				<div class="w-20">
					<Label for="newQty" class="text-xs">Antal</Label>
					<Input id="newQty" name="quantity" type="number" step="0.01" min="0" bind:value={newLine.quantity} />
				</div>
				<div class="w-24">
					<Label for="newPrice" class="text-xs">Pris/st</Label>
					<Input id="newPrice" name="unitPrice" type="number" step="0.01" min="0" bind:value={newLine.unitPrice} />
				</div>
				<Button type="submit">Lägg till</Button>
			</form>

			<div class="mt-4 border-t pt-4">
				<div class="flex justify-between text-lg font-semibold">
					<span>Totalt</span>
					<span>{data.quote.total.toFixed(2)} kr</span>
				</div>
			</div>
		</Card>
	</div>
</div>
