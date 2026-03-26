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
		title: "",
		description: "",
		status: "TODO",
		priority: "MEDIUM",
		assignedTo: "",
		projectId: "",
		dueDate: "",
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

<div class="max-w-2xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Skapa ny uppgift</h1>
		<p class="mt-2 text-gray-600">Lägg till en uppgift och tilldela den till projekt eller person</p>
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
						error = result.data?.error ?? "Kunde inte skapa uppgift";
					}
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<Label for="title">Titel *</Label>
					<Input id="title" name="title" bind:value={formData.title} required placeholder="T.ex. Granska offert" />
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

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
								<option value={project.id}>{project.name} ({project.company.name})</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<Label for="dueDate">Slutdatum</Label>
					<Input id="dueDate" name="dueDate" type="date" bind:value={formData.dueDate} />
				</div>

				<div class="flex gap-4 pt-4">
					<Button type="submit" disabled={loading}>
						{loading ? "Skapar..." : "Skapa uppgift"}
					</Button>
					<a href="/dashboard/tasks">
						<Button variant="outline" type="button">Avbryt</Button>
					</a>
				</div>
			</div>
		</form>
	</Card>
</div>
