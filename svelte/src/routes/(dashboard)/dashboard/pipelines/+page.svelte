<script lang="ts">
	import { enhance } from "$app/forms";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import {
		PlusIcon,
		XMarkIcon,
		TrashIcon,
		BoltIcon,
	} from "heroicons-svelte/24/outline";
	import PipelineConfigModal from "$lib/components/pipeline/pipeline-config-modal.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showConfigModal = $state(false);

	const statusConfig: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
		IDLE: { label: "Vilande", color: "text-gray-600", bg: "bg-gray-100" },
		RUNNING: { label: "Körs", color: "text-green-600", bg: "bg-green-100", pulse: true },
		COMPLETED: { label: "Klar", color: "text-blue-600", bg: "bg-blue-100" },
		STOPPED: { label: "Stoppad", color: "text-yellow-600", bg: "bg-yellow-100" },
	};
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Pipelines</h1>
			<p class="mt-2 text-gray-600">Automatisk prospektering via Google Maps</p>
		</div>
		<Button onclick={() => (showConfigModal = true)}>
			<PlusIcon class="mr-2 h-5 w-5" />
			Skapa pipeline
		</Button>
	</div>

	{#if data.pipelines.length === 0}
		<Card class="p-12 text-center">
			<BoltIcon class="mx-auto h-12 w-12 text-gray-300" />
			<p class="mt-4 text-gray-500">Inga pipelines ännu</p>
			<p class="mt-2 text-sm text-gray-400">
				Skapa din första pipeline för att börja hitta potentiella kunder
			</p>
			<div class="mt-6">
				<Button onclick={() => (showConfigModal = true)}>
					<PlusIcon class="mr-2 h-5 w-5" />
					Skapa pipeline
				</Button>
			</div>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.pipelines as pipeline}
				{@const status = statusConfig[pipeline.status] ?? statusConfig.IDLE}
				<Card class="group relative p-6 hover:shadow-md transition-shadow">
					<a href="/dashboard/pipelines/{pipeline.id}" class="block">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
									{pipeline.name}
								</h3>
								<p class="mt-1 text-sm text-gray-500 line-clamp-2">
									{pipeline.description}
								</p>
							</div>
							<span
								class="ml-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {status.color} {status.bg}"
							>
								{#if status.pulse}
									<span class="relative flex h-2 w-2">
										<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
										<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
									</span>
								{/if}
								{status.label}
							</span>
						</div>
						<div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
							<span>{pipeline._count.results} företag hittade</span>
							<span>
								{new Date(pipeline.createdAt).toLocaleDateString("sv-SE")}
							</span>
						</div>
					</a>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
						class="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<input type="hidden" name="id" value={pipeline.id} />
						<button
							type="submit"
							class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
							title="Ta bort"
						>
							<TrashIcon class="h-4 w-4" />
						</button>
					</form>
				</Card>
			{/each}
		</div>
	{/if}
</div>

{#if showConfigModal}
	<PipelineConfigModal onclose={() => (showConfigModal = false)} />
{/if}
