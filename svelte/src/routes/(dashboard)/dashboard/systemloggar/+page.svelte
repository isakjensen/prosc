<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import {
		MagnifyingGlassIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ChevronDownIcon,
		ChevronUpIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let expandedId = $state<string | null>(null);

	function buildUrl(updates: Record<string, string>) {
		const params = new URLSearchParams(window.location.search);
		for (const [k, v] of Object.entries(updates)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		if (!("page" in updates)) params.set("page", "1");
		return `?${params.toString()}`;
	}

	function sortUrl(field: string) {
		const nextOrder =
			data.filters.sortBy === field && data.filters.sortOrder === "desc" ? "asc" : "desc";
		return buildUrl({ sortBy: field, sortOrder: nextOrder });
	}

	function formatDate(d: Date) {
		return new Date(d).toLocaleString("sv-SE", {
			dateStyle: "short",
			timeStyle: "short",
		});
	}

	function parseDetails(details: string | null): string {
		if (!details) return "—";
		try {
			const o = JSON.parse(details);
			return JSON.stringify(o, null, 2);
		} catch {
			return details;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Systemloggar</h1>
			<p class="mt-2 text-gray-600">Granska alla åtgärder i systemet</p>
		</div>
	</div>

	<form method="GET" action="?" class="space-y-4">
		<input type="hidden" name="page" value="1" />
		<div class="flex flex-wrap items-end gap-4">
			<div class="relative flex-1 min-w-[200px] max-w-md">
				<MagnifyingGlassIcon
					class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
				/>
				<input
					type="text"
					name="search"
					placeholder="Sök i åtgärd, entitet, detaljer..."
					value={data.filters.search}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<select
				name="userId"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Alla användare</option>
				{#each data.users as u}
					<option value={u.id} selected={data.filters.userId === u.id}>
						{u.name} ({u.email})
					</option>
				{/each}
			</select>
			<select
				name="action"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Alla åtgärder</option>
				{#each data.actions as a}
					<option value={a} selected={data.filters.action === a}>{a}</option>
				{/each}
			</select>
			<select
				name="entityType"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Alla entiteter</option>
				{#each data.entityTypes as e}
					<option value={e} selected={data.filters.entityType === e}>{e}</option>
				{/each}
			</select>
			<div class="flex items-center gap-2">
				<label for="dateFrom" class="text-sm text-gray-600">Från</label>
				<input
					id="dateFrom"
					type="date"
					name="dateFrom"
					value={data.filters.dateFrom}
					class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div class="flex items-center gap-2">
				<label for="dateTo" class="text-sm text-gray-600">Till</label>
				<input
					id="dateTo"
					type="date"
					name="dateTo"
					value={data.filters.dateTo}
					class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<Button type="submit">Filtrera</Button>
		</div>
	</form>

	<Card class="overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							<a href={sortUrl("createdAt")} class="inline-flex items-center gap-1 hover:text-gray-700">
								Tid
								{#if data.filters.sortBy === "createdAt"}
									{#if data.filters.sortOrder === "asc"}
										<ChevronUpIcon class="h-4 w-4" />
									{:else}
										<ChevronDownIcon class="h-4 w-4" />
									{/if}
								{/if}
							</a>
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Användare
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							<a href={sortUrl("action")} class="inline-flex items-center gap-1 hover:text-gray-700">
								Åtgärd
								{#if data.filters.sortBy === "action"}
									{#if data.filters.sortOrder === "asc"}
										<ChevronUpIcon class="h-4 w-4" />
									{:else}
										<ChevronDownIcon class="h-4 w-4" />
									{/if}
								{/if}
							</a>
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							<a href={sortUrl("entityType")} class="inline-flex items-center gap-1 hover:text-gray-700">
								Entitet
								{#if data.filters.sortBy === "entityType"}
									{#if data.filters.sortOrder === "asc"}
										<ChevronUpIcon class="h-4 w-4" />
									{:else}
										<ChevronDownIcon class="h-4 w-4" />
									{/if}
								{/if}
							</a>
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Detaljer
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#if data.logs.length === 0}
						<tr>
							<td colspan="5" class="px-4 py-12 text-center text-gray-500">
								Inga loggar hittades med valda filter.
							</td>
						</tr>
					{:else}
						{#each data.logs as log}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
									{formatDate(log.createdAt)}
								</td>
								<td class="px-4 py-3 text-sm text-gray-900">
									{#if log.user}
										<span title={log.user.email}>{log.user.name}</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
									{log.action}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{#if log.entityType}
										{log.entityType}
										{#if log.entityId}
											<span class="text-gray-400"> ({log.entityId.slice(0, 8)}…)</span>
										{/if}
									{:else}
										—
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{#if log.details}
										{#if expandedId === log.id}
											<pre
												class="max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs"
											>{parseDetails(log.details)}</pre>
											<button
												type="button"
												class="mt-1 text-xs text-blue-600 hover:text-blue-800"
												onclick={() => (expandedId = null)}
											>
												Visa mindre
											</button>
										{:else}
											<button
												type="button"
												class="text-left text-blue-600 hover:text-blue-800"
												onclick={() => (expandedId = log.id)}
											>
												Visa mer
											</button>
										{/if}
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		{#if data.totalPages > 1}
			<div class="flex items-center justify-between border-t border-gray-200 px-4 py-3">
				<p class="text-sm text-gray-600">
					Visar {(data.page - 1) * data.pageSize + 1}–
					{Math.min(data.page * data.pageSize, data.totalCount)} av {data.totalCount}
				</p>
				<div class="flex gap-2">
					{#if data.page > 1}
						<a
							href={buildUrl({ page: String(data.page - 1) })}
							class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							<ChevronLeftIcon class="h-5 w-5" />
							Föregående
						</a>
					{/if}
					{#if data.page < data.totalPages}
						<a
							href={buildUrl({ page: String(data.page + 1) })}
							class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Nästa
							<ChevronRightIcon class="h-5 w-5" />
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</Card>
</div>
