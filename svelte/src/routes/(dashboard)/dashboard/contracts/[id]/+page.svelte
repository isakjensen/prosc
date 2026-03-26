<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PencilIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let formData = $state({
		title: "",
		status: "",
		content: "",
		expiresAt: "",
		signedAt: "",
	});
	let error = $state("");

	$effect(() => {
		formData.title = data.contract.title;
		formData.status = data.contract.status;
		formData.content = data.contract.content ?? "";
		formData.expiresAt = data.contract.expiresAt
			? format(new Date(data.contract.expiresAt), "yyyy-MM-dd")
			: "";
		formData.signedAt = data.contract.signedAt
			? format(new Date(data.contract.signedAt), "yyyy-MM-dd")
			: "";
	});

	const statusColors: Record<string, string> = {
		DRAFT: "bg-gray-100 text-gray-800",
		SENT: "bg-blue-100 text-blue-800",
		SIGNED: "bg-green-100 text-green-800",
		EXPIRED: "bg-yellow-100 text-yellow-800",
		CANCELLED: "bg-red-100 text-red-800",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.contract.number}</h1>
			<p class="mt-1 text-gray-600">{data.contract.company.name}</p>
			<span
				class="mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[data.contract.status] ?? 'bg-gray-100 text-gray-800'}"
			>
				{data.statusLabels[data.contract.status] ?? data.contract.status}
			</span>
		</div>
		<div class="flex gap-2">
			<a href="/dashboard/contracts/{data.contract.id}/pdf" target="_blank" rel="noopener noreferrer" download>
				<Button variant="outline">Ladda ner PDF</Button>
			</a>
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/contracts">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<Card class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Avtalsinformation</h2>
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
						<Label for="content">Innehåll</Label>
						<textarea
							id="content"
							name="content"
							bind:value={formData.content}
							rows="12"
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						></textarea>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label for="expiresAt">Utgångsdatum</Label>
							<Input id="expiresAt" name="expiresAt" type="date" bind:value={formData.expiresAt} />
						</div>
						<div>
							<Label for="signedAt">Signeringsdatum</Label>
							<Input id="signedAt" name="signedAt" type="date" bind:value={formData.signedAt} />
						</div>
					</div>
					<Button type="submit">Spara ändringar</Button>
				</div>
			</form>
		{:else}
			<dl class="space-y-2">
				<div>
					<dt class="text-sm font-medium text-gray-500">Titel</dt>
					<dd class="text-gray-900">{data.contract.title}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500">Skapad</dt>
					<dd class="text-gray-900">{format(new Date(data.contract.createdAt), "d MMM yyyy HH:mm", { locale: sv })}</dd>
				</div>
				{#if data.contract.expiresAt}
					<div>
						<dt class="text-sm font-medium text-gray-500">Utgångsdatum</dt>
						<dd class="text-gray-900">{format(new Date(data.contract.expiresAt), "d MMM yyyy", { locale: sv })}</dd>
					</div>
				{/if}
				{#if data.contract.signedAt}
					<div>
						<dt class="text-sm font-medium text-gray-500">Signerad</dt>
						<dd class="text-gray-900">{format(new Date(data.contract.signedAt), "d MMM yyyy", { locale: sv })}</dd>
					</div>
				{/if}
			</dl>
			<div class="mt-6">
				<dt class="text-sm font-medium text-gray-500 mb-2">Innehåll</dt>
				<dd class="text-gray-900 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-4">{data.contract.content || "Inget innehåll."}</dd>
			</div>
		{/if}
	</Card>
</div>
