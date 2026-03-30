<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import Card from "$lib/components/ui/card.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state("");
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Ny produkt</h1>
		<p class="mt-1 text-gray-500">Skapa en ny produkt kopplad till en kund</p>
	</div>

	<Card class="p-6">
		{#if error}
			<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
		{/if}

		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				loading = true;
				error = "";
				return async ({ result, update }) => {
					loading = false;
					if (result.type === "failure") {
						error = (result.data as { error?: string })?.error || "Något gick fel";
					} else if (result.type === "redirect") {
						goto(result.location);
					} else {
						await update();
					}
				};
			}}
			class="space-y-4"
		>
			<div>
				<Label for="companyId">Kund *</Label>
				<select
					id="companyId"
					name="companyId"
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
				>
					<option value="">Välj kund...</option>
					{#each data.customers as customer}
						<option value={customer.id}>{customer.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<Label for="name">Produktnamn *</Label>
				<Input id="name" name="name" required placeholder="T.ex. Webbshop, Mobilapp..." />
			</div>

			<div>
				<Label for="description">Beskrivning</Label>
				<textarea
					id="description"
					name="description"
					rows="3"
					placeholder="Beskriv produkten..."
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
				></textarea>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<Button type="submit" disabled={loading}>
					{loading ? "Skapar..." : "Skapa produkt"}
				</Button>
				<a href="/dashboard/products">
					<Button variant="outline">Avbryt</Button>
				</a>
			</div>
		</form>
	</Card>
</div>
