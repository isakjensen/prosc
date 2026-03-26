<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { PencilIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let formData = $state({
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		title: "",
		notes: "",
	});
	let error = $state("");

	$effect(() => {
		formData.firstName = data.contact.firstName;
		formData.lastName = data.contact.lastName;
		formData.email = data.contact.email ?? "";
		formData.phone = data.contact.phone ?? "";
		formData.title = data.contact.title ?? "";
		formData.notes = data.contact.notes ?? "";
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{data.contact.firstName} {data.contact.lastName}
			</h1>
			<p class="mt-1 text-gray-600">{data.contact.company.name}</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/contacts">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<Card class="p-6 max-w-2xl">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Kontaktinformation</h2>
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
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<Label for="firstName">Förnamn</Label>
							<Input id="firstName" name="firstName" bind:value={formData.firstName} required />
						</div>
						<div>
							<Label for="lastName">Efternamn</Label>
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
						<Input id="title" name="title" bind:value={formData.title} />
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
					<Button type="submit">Spara ändringar</Button>
				</div>
			</form>
		{:else}
			<dl class="space-y-3">
				<div>
					<dt class="text-sm font-medium text-gray-500">Företag</dt>
					<dd class="mt-1 text-gray-900">
						{#if data.contact.company.type === "CUSTOMER"}
							<a href="/dashboard/customers/{data.contact.company.id}" class="text-blue-600 hover:underline">
								{data.contact.company.name}
							</a>
						{:else}
							<a href="/dashboard/prospects/{data.contact.company.id}" class="text-blue-600 hover:underline">
								{data.contact.company.name}
							</a>
						{/if}
					</dd>
				</div>
				{#if data.contact.title}
					<div>
						<dt class="text-sm font-medium text-gray-500">Titel</dt>
						<dd class="mt-1 text-gray-900">{data.contact.title}</dd>
					</div>
				{/if}
				{#if data.contact.email}
					<div>
						<dt class="text-sm font-medium text-gray-500">E-post</dt>
						<dd class="mt-1 text-gray-900">
							<a href="mailto:{data.contact.email}" class="text-blue-600 hover:underline">{data.contact.email}</a>
						</dd>
					</div>
				{/if}
				{#if data.contact.phone}
					<div>
						<dt class="text-sm font-medium text-gray-500">Telefon</dt>
						<dd class="mt-1 text-gray-900">{data.contact.phone}</dd>
					</div>
				{/if}
				{#if data.contact.notes}
					<div>
						<dt class="text-sm font-medium text-gray-500">Anteckningar</dt>
						<dd class="mt-1 text-gray-900 whitespace-pre-wrap">{data.contact.notes}</dd>
					</div>
				{/if}
			</dl>
		{/if}
	</Card>
</div>
