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
		description: "",
		status: "",
		priority: "",
		assignedToId: "",
	});
	let commentText = $state("");
	let error = $state("");

	$effect(() => {
		formData.title = data.ticket.title;
		formData.description = data.ticket.description ?? "";
		formData.status = data.ticket.status;
		formData.priority = data.ticket.priority;
		formData.assignedToId = data.ticket.assignedToId ?? "";
	});

	const statusColors: Record<string, string> = {
		OPEN: "bg-yellow-100 text-yellow-800",
		IN_PROGRESS: "bg-blue-100 text-blue-800",
		RESOLVED: "bg-green-100 text-green-800",
		CLOSED: "bg-gray-100 text-gray-800",
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.ticket.title}</h1>
			<p class="mt-1 text-gray-600">{data.ticket.company.name}</p>
			<div class="mt-2 flex gap-2">
				<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {statusColors[data.ticket.status] ?? 'bg-gray-100'}">
					{data.statusLabels[data.ticket.status] ?? data.ticket.status}
				</span>
				<span class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
					{data.priorityLabels[data.ticket.priority] ?? data.ticket.priority}
				</span>
			</div>
		</div>
		<div class="flex gap-2">
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/support">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Ärendeinformation</h2>
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
							<Label for="description">Beskrivning</Label>
							<textarea
								id="description"
								name="description"
								bind:value={formData.description}
								rows="4"
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							></textarea>
						</div>
						<div class="grid grid-cols-2 gap-4">
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
								<Label for="priority">Prioritet</Label>
								<select
									id="priority"
									name="priority"
									bind:value={formData.priority}
									class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									{#each Object.entries(data.priorityLabels) as [value, label]}
										<option value={value}>{label}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<Label for="assignedToId">Tilldelad till</Label>
							<select
								id="assignedToId"
								name="assignedToId"
								bind:value={formData.assignedToId}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">Ej tilldelad</option>
								{#each data.users as u}
									<option value={u.id}>{u.name}</option>
								{/each}
							</select>
						</div>
						<Button type="submit">Spara ändringar</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Beskrivning</dt>
						<dd class="mt-1 text-gray-900 whitespace-pre-wrap">{data.ticket.description || "–"}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Skapad av</dt>
						<dd class="mt-1 text-gray-900">{data.ticket.creator.name}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Tilldelad</dt>
						<dd class="mt-1 text-gray-900">{data.ticket.assignee?.name ?? "Ej tilldelad"}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Skapad</dt>
						<dd class="mt-1 text-gray-900">{format(new Date(data.ticket.createdAt), "d MMM yyyy HH:mm", { locale: sv })}</dd>
					</div>
				</dl>
			{/if}
		</Card>

		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Kommentarer</h2>
			{#if data.ticket.comments.length === 0}
				<p class="text-sm text-gray-500">Inga kommentarer än.</p>
			{:else}
				<div class="space-y-3 mb-4">
					{#each data.ticket.comments as comment}
						<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
							<p class="text-sm text-gray-900">{comment.content}</p>
							<p class="mt-1 text-xs text-gray-500">
								{comment.user.name} • {format(new Date(comment.createdAt), "d MMM yyyy HH:mm", { locale: sv })}
							</p>
						</div>
					{/each}
				</div>
			{/if}
			<form
				method="POST"
				action="?/addComment"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						commentText = "";
						await invalidateAll();
					};
				}}
			>
				<Label for="content">Ny kommentar</Label>
				<textarea
					id="content"
					name="content"
					bind:value={commentText}
					rows="2"
					required
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				></textarea>
				<Button type="submit" class="mt-2">Lägg till kommentar</Button>
			</form>
		</Card>
	</div>
</div>
