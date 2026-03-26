<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import { PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const statuses = [
		{ id: "TODO", label: "Att göra", color: "bg-gray-100" },
		{ id: "IN_PROGRESS", label: "Pågår", color: "bg-blue-100" },
		{ id: "REVIEW", label: "Granskning", color: "bg-yellow-100" },
		{ id: "DONE", label: "Klar", color: "bg-green-100" },
	];

	function getTasksByStatus(status: string) {
		return data.tasks.filter((t) => t.status === status);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Uppgifter</h1>
			<p class="mt-2 text-gray-600">Hantera dina uppgifter och projekt</p>
		</div>
		<a href="/dashboard/tasks/new">
			<Button>
				<PlusIcon class="mr-2 h-5 w-5" />
				Ny uppgift
			</Button>
		</a>
	</div>

	<!-- Filter -->
	<div class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
		<span class="text-sm text-gray-600">Filtrera:</span>
		<a href="/dashboard/tasks" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Alla</a>
		{#each data.projects as p}
			<a href="/dashboard/tasks?projectId={p.id}" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">{p.name}</a>
		{/each}
		<span class="ml-2 text-sm text-gray-500">|</span>
		{#each data.users as u}
			<a href="/dashboard/tasks?assignedTo={u.id}" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">{u.name}</a>
		{/each}
		<span class="ml-2 text-sm text-gray-500">|</span>
		{#each statuses as s}
			<a href="/dashboard/tasks?status={s.id}" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">{s.label}</a>
		{/each}
	</div>
	
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each statuses as status}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold text-gray-900">{status.label}</h2>
					<span class="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
						{getTasksByStatus(status.id).length}
					</span>
				</div>
				<div class="space-y-3">
					{#each getTasksByStatus(status.id) as task}
						<Card class="p-4 hover:shadow-md transition-shadow cursor-pointer">
							<a href="/dashboard/tasks/{task.id}" class="block">
								<h3 class="font-medium text-gray-900">{task.title}</h3>
								{#if task.description}
									<p class="mt-1 text-sm text-gray-600 line-clamp-2">{task.description}</p>
								{/if}
								<div class="mt-3 flex items-center justify-between text-xs text-gray-500">
									{#if task.assignee}
										<span>{task.assignee.name}</span>
									{:else}
										<span class="text-gray-400">Ej tilldelad</span>
									{/if}
									{#if task.dueDate}
										<span>{new Date(task.dueDate).toLocaleDateString()}</span>
									{/if}
								</div>
							</a>
						</Card>
					{/each}
					{#if getTasksByStatus(status.id).length === 0}
						<Card class="p-8 text-center text-sm text-gray-500">
							Inga uppgifter
						</Card>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
