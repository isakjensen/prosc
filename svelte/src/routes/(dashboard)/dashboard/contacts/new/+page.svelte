<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state("");

	let formData = $state({
		companyId: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		title: "",
		notes: "",
	});
	$effect(() => {
		if (data.companies.length > 0 && !formData.companyId) {
			formData.companyId = data.companies[0].id;
		}
	});
</script>

<div class="max-w-2xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Lägg till kontakt</h1>
		<p class="mt-2 text-gray-600">Skapa en ny kontakt kopplad till ett företag</p>
	</div>

	<Card class="p-6">
		{#if error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === "redirect") {
						goto(result.location);
					} else if (result.type === "failure") {
						error = result.data?.error ?? "Kunde inte skapa kontakt";
					}
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<Label for="companyId">Företag *</Label>
					<select
						id="companyId"
						name="companyId"
						bind:value={formData.companyId}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each data.companies as company}
							<option value={company.id}>{company.name}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="firstName">Förnamn *</Label>
						<Input id="firstName" name="firstName" bind:value={formData.firstName} required />
					</div>
					<div>
						<Label for="lastName">Efternamn *</Label>
						<Input id="lastName" name="lastName" bind:value={formData.lastName} required />
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="email">E-post</Label>
						<Input id="email" name="email" type="email" bind:value={formData.email} />
					</div>
					<div>
						<Label for="phone">Telefon</Label>
						<Input id="phone" name="phone" bind:value={formData.phone} />
					</div>
				</div>

				<div>
					<Label for="title">Titel</Label>
					<Input id="title" name="title" bind:value={formData.title} placeholder="T.ex. VD" />
				</div>

				<div>
					<Label for="notes">Anteckningar</Label>
					<textarea
						id="notes"
						name="notes"
						bind:value={formData.notes}
						rows="3"
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					></textarea>
				</div>

				<div class="flex gap-4 pt-4">
					<Button type="submit" disabled={loading}>
						{loading ? "Skapar..." : "Skapa kontakt"}
					</Button>
					<a href="/dashboard/contacts">
						<Button variant="outline" type="button">Avbryt</Button>
					</a>
				</div>
			</div>
		</form>
	</Card>
</div>
