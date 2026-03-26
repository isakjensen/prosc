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
		dueDate: "",
		notes: "",
	});
	let newLine = $state({ description: "", quantity: "1", unitPrice: "0" });
	let newPayment = $state({ amount: "", method: "BANK_TRANSFER", reference: "", paidAt: "" });
	let error = $state("");

	$effect(() => {
		formData.title = data.invoice.title;
		formData.status = data.invoice.status;
		formData.dueDate = data.invoice.dueDate
			? format(new Date(data.invoice.dueDate), "yyyy-MM-dd")
			: "";
		formData.notes = data.invoice.notes ?? "";
		const today = format(new Date(), "yyyy-MM-dd");
		if (!newPayment.paidAt) newPayment.paidAt = today;
	});

	const statusColors: Record<string, string> = {
		DRAFT: "bg-gray-100 text-gray-800",
		SENT: "bg-blue-100 text-blue-800",
		PAID: "bg-green-100 text-green-800",
		OVERDUE: "bg-red-100 text-red-800",
		CANCELLED: "bg-yellow-100 text-yellow-800",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.invoice.number}</h1>
			<p class="mt-1 text-gray-600">{data.invoice.company.name}</p>
			<span
				class="mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[data.invoice.status] ?? 'bg-gray-100 text-gray-800'}"
			>
				{data.statusLabels[data.invoice.status] ?? data.invoice.status}
			</span>
		</div>
		<div class="flex gap-2">
			<a href="/dashboard/invoices/{data.invoice.id}/pdf" target="_blank" rel="noopener noreferrer" download>
				<Button variant="outline">Ladda ner PDF</Button>
			</a>
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/invoices">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Fakturainformation</h2>
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
							<Label for="dueDate">Förfallodatum</Label>
							<Input id="dueDate" name="dueDate" type="date" bind:value={formData.dueDate} />
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
						<dd class="text-gray-900">{data.invoice.title}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Fakturadatum</dt>
						<dd class="text-gray-900">{format(new Date(data.invoice.issueDate), "d MMM yyyy", { locale: sv })}</dd>
					</div>
					{#if data.invoice.dueDate}
						<div>
							<dt class="text-sm font-medium text-gray-500">Förfallodatum</dt>
							<dd class="text-gray-900">{format(new Date(data.invoice.dueDate), "d MMM yyyy", { locale: sv })}</dd>
						</div>
					{/if}
					{#if data.invoice.notes}
						<div>
							<dt class="text-sm font-medium text-gray-500">Anteckningar</dt>
							<dd class="text-gray-900 whitespace-pre-wrap">{data.invoice.notes}</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</Card>

		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Radposter</h2>
			{#if data.invoice.lineItems.length === 0}
				<p class="text-sm text-gray-500">Inga rader än. Lägg till nedan.</p>
			{:else}
				<div class="space-y-3">
					{#each data.invoice.lineItems as item}
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
				<div class="flex justify-between text-sm text-gray-600">
					<span>Delsumma</span>
					<span>{data.invoice.subtotal.toFixed(2)} kr</span>
				</div>
				<div class="flex justify-between text-sm text-gray-600">
					<span>Moms</span>
					<span>{data.invoice.tax.toFixed(2)} kr</span>
				</div>
				<div class="flex justify-between text-lg font-semibold mt-2">
					<span>Totalt</span>
					<span>{data.invoice.total.toFixed(2)} kr</span>
				</div>
				<div class="flex justify-between text-sm text-green-700 mt-1">
					<span>Betalt</span>
					<span>{data.invoice.paidAmount.toFixed(2)} kr</span>
				</div>
			</div>
		</Card>
	</div>

	<!-- Betalningar -->
	<Card class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Betalningar</h2>
		{#if data.invoice.payments.length === 0}
			<p class="text-sm text-gray-500 mb-4">Inga betalningar registrerade.</p>
		{:else}
			<ul class="space-y-2 mb-4">
				{#each data.invoice.payments as payment}
					<li class="flex justify-between rounded border border-gray-200 px-3 py-2 text-sm">
						<span>{payment.amount.toFixed(2)} kr</span>
						<span>{data.paymentMethodLabels[payment.method] ?? payment.method}</span>
						<span>{format(new Date(payment.paidAt), "d MMM yyyy", { locale: sv })}</span>
						{#if payment.reference}
							<span class="text-gray-500">{payment.reference}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<form
			method="POST"
			action="?/addPayment"
			class="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-gray-300 p-3"
			use:enhance={() => async ({ update }) => await update().then(() => invalidateAll())}
		>
			<div>
				<Label for="payAmount" class="text-xs">Belopp (kr)</Label>
				<Input id="payAmount" name="amount" type="number" step="0.01" min="0.01" bind:value={newPayment.amount} required />
			</div>
			<div>
				<Label for="payMethod" class="text-xs">Metod</Label>
				<select
					id="payMethod"
					name="method"
					bind:value={newPayment.method}
					class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each Object.entries(data.paymentMethodLabels) as [value, label]}
						<option value={value}>{label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label for="payDate" class="text-xs">Datum</Label>
				<Input id="payDate" name="paidAt" type="date" bind:value={newPayment.paidAt} />
			</div>
			<div>
				<Label for="payRef" class="text-xs">Referens</Label>
				<Input id="payRef" name="reference" bind:value={newPayment.reference} placeholder="T.ex. OCR" />
			</div>
			<Button type="submit">Registrera betalning</Button>
		</form>
	</Card>
</div>
