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
		assignedTo: "",
		projectId: "",
		dueDate: "",
	});
	let commentText = $state("");
	let error = $state("");

	$effect(() => {
		formData.title = data.task.title;
		formData.description = data.task.description ?? "";
		formData.status = data.task.status;
		formData.priority = data.task.priority;
		formData.assignedTo = data.task.assignedTo ?? "";
		formData.projectId = data.task.projectId ?? "";
		formData.dueDate = data.task.dueDate
			? format(new Date(data.task.dueDate), "yyyy-MM-dd")
			: "";
	});

	const statusOptions = [
		{ value: "TODO", label: "Att göra" },
		{ value: "IN_PROGRESS", label: "Pågår" },
		{ value: "REVIEW", label: "Granskning" },
		{ value: "DONE", label: "Klar" },
		{ value: "CANCELLED", label: "Avbruten" },
	];
	const priorityOptions = [
		{ value: "LOW", label: "Låg" },
		{ value: "MEDIUM", label: "Medium" },
		{ value: "HIGH", label: "Hög" },
		{ value: "URGENT", label: "Brådskande" },
	];
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.task.title}</h1>
			<div class="mt-2 flex gap-2">
				<span class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
					{data.statusLabels[data.task.status] ?? data.task.status}
				</span>
				<span class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
					{data.priorityLabels[data.task.priority] ?? data.task.priority}
				</span>
			</div>
		</div>
		<div class="flex gap-2">
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<a href="/dashboard/tasks">
				<Button variant="outline">Tillbaka till listan</Button>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Uppgiftsinformation</h2>
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
								rows="3"
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
									{#each statusOptions as opt}
										<option value={opt.value}>{opt.label}</option>
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
									{#each priorityOptions as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<Label for="assignedTo">Tilldelad till</Label>
							<select
								id="assignedTo"
								name="assignedTo"
								bind:value={formData.assignedTo}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">Ej tilldelad</option>
								{#each data.users as user}
									<option value={user.id}>{user.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<Label for="projectId">Projekt</Label>
							<select
								id="projectId"
								name="projectId"
								bind:value={formData.projectId}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">Inget projekt</option>
								{#each data.projects as project}
									<option value={project.id}>{project.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<Label for="dueDate">Slutdatum</Label>
							<Input id="dueDate" name="dueDate" type="date" bind:value={formData.dueDate} />
						</div>
						<Button type="submit">Spara ändringar</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-3">
					{#if data.task.description}
						<div>
							<dt class="text-sm font-medium text-gray-500">Beskrivning</dt>
							<dd class="mt-1 text-gray-900 whitespace-pre-wrap">{data.task.description}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-sm font-medium text-gray-500">Tilldelad</dt>
						<dd class="mt-1 text-gray-900">{data.task.assignee?.name ?? "Ej tilldelad"}</dd>
					</div>
					{#if data.task.project}
						<div>
							<dt class="text-sm font-medium text-gray-500">Projekt</dt>
							<dd class="mt-1 text-gray-900">
								{#if data.task.project.company.type === "CUSTOMER"}
									<a href="/dashboard/customers/{data.task.project.company.id}" class="text-blue-600 hover:underline">
										{data.task.project.name}
									</a>
								{:else}
									<a href="/dashboard/prospects/{data.task.project.company.id}" class="text-blue-600 hover:underline">
										{data.task.project.name}
									</a>
								{/if}
								<span class="text-gray-500"> ({data.task.project.company.name})</span>
							</dd>
						</div>
					{/if}
					{#if data.task.dueDate}
						<div>
							<dt class="text-sm font-medium text-gray-500">Slutdatum</dt>
							<dd class="mt-1 text-gray-900">{format(new Date(data.task.dueDate), "d MMM yyyy", { locale: sv })}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-sm font-medium text-gray-500">Skapad</dt>
						<dd class="mt-1 text-gray-900">{format(new Date(data.task.createdAt), "d MMM yyyy HH:mm", { locale: sv })}</dd>
					</div>
				</dl>
			{/if}
		</Card>

		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Kommentarer</h2>
			{#if data.task.comments.length === 0}
				<p class="text-sm text-gray-500">Inga kommentarer än.</p>
			{:else}
				<div class="space-y-3 mb-4">
					{#each data.task.comments as comment}
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
