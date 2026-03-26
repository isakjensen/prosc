<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import {
		PlayIcon,
		StopIcon,
		ArrowRightIcon,
		ChevronLeftIcon,
		GlobeAltIcon,
		XCircleIcon,
		StarIcon,
		MapPinIcon,
		PhoneIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);

	const pipeline = $derived(data.pipeline);
	const results = $derived(pipeline.results);
	const totalFound = $derived(results.length);
	const withoutWebsite = $derived(results.filter((r) => !r.hasWebsite).length);
	const withWebsite = $derived(results.filter((r) => r.hasWebsite).length);
	const categories = $derived([...new Set(results.map((r) => r.category).filter(Boolean))]);

	let filterCategory = $state("");
	let filterWebsite = $state<"all" | "no" | "yes">("all");

	const filteredResults = $derived(
		results.filter((r) => {
			if (filterCategory && r.category !== filterCategory) return false;
			if (filterWebsite === "no" && r.hasWebsite) return false;
			if (filterWebsite === "yes" && !r.hasWebsite) return false;
			return true;
		})
	);

	function getInitials(name: string) {
		return name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	function renderStars(rating: number | null) {
		if (!rating) return "";
		return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
	}

	const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
		IDLE: { label: "Vilande", color: "text-gray-600", bg: "bg-gray-100" },
		RUNNING: { label: "Körs...", color: "text-green-600", bg: "bg-green-100" },
		COMPLETED: { label: "Klar", color: "text-blue-600", bg: "bg-blue-100" },
		STOPPED: { label: "Stoppad", color: "text-yellow-600", bg: "bg-yellow-100" },
	};

	const status = $derived(statusConfig[pipeline.status] ?? statusConfig.IDLE);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="/dashboard/pipelines"
			class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
		>
			<ChevronLeftIcon class="h-5 w-5" />
		</a>
		<div class="flex-1">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">{pipeline.name}</h1>
				<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {status.color} {status.bg}">
					{status.label}
				</span>
			</div>
			<p class="mt-1 text-gray-500">{pipeline.description}</p>
		</div>
		<div class="flex items-center gap-2">
			{#if pipeline.status === "IDLE" || pipeline.status === "STOPPED"}
				<form
					method="POST"
					action="?/start"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							await invalidateAll();
						};
					}}
				>
					<Button disabled={loading}>
						<PlayIcon class="mr-2 h-5 w-5" />
						{loading ? "Startar..." : "Starta scraping"}
					</Button>
				</form>
			{:else if pipeline.status === "RUNNING"}
				<form
					method="POST"
					action="?/stop"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
				>
					<Button variant="destructive">
						<StopIcon class="mr-2 h-5 w-5" />
						Stoppa
					</Button>
				</form>
			{/if}
			{#if results.length > 0}
				<a href="/dashboard/pipelines/{pipeline.id}/analyze">
					<Button variant="outline">
						Gå vidare till analys
						<ArrowRightIcon class="ml-2 h-5 w-5" />
					</Button>
				</a>
			{/if}
		</div>
	</div>

	<!-- Statistik -->
	{#if results.length > 0}
		<div class="grid grid-cols-3 gap-4">
			<Card class="p-4 text-center">
				<p class="text-3xl font-bold text-gray-900">{totalFound}</p>
				<p class="text-sm text-gray-500">Totalt hittade</p>
			</Card>
			<Card class="p-4 text-center">
				<p class="text-3xl font-bold text-red-600">{withoutWebsite}</p>
				<p class="text-sm text-gray-500">Utan hemsida</p>
			</Card>
			<Card class="p-4 text-center">
				<p class="text-3xl font-bold text-green-600">{withWebsite}</p>
				<p class="text-sm text-gray-500">Med hemsida</p>
			</Card>
		</div>
	{/if}

	<!-- Filter -->
	{#if results.length > 0}
		<div class="flex gap-4">
			<select
				bind:value={filterCategory}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Alla kategorier</option>
				{#each categories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<select
				bind:value={filterWebsite}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="all">Alla</option>
				<option value="no">Utan hemsida</option>
				<option value="yes">Med hemsida</option>
			</select>
			<span class="self-center text-sm text-gray-500">
				Visar {filteredResults.length} av {totalFound}
			</span>
		</div>
	{/if}

	<!-- Företagslista -->
	{#if results.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga resultat ännu</p>
			<p class="mt-2 text-sm text-gray-400">
				Klicka "Starta scraping" för att börja leta efter företag
			</p>
		</Card>
	{:else}
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Företag
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Adress
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Telefon
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Kategori
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Hemsida
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Betyg
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each filteredResults as result}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="whitespace-nowrap px-6 py-4">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
									>
										{getInitials(result.businessName)}
									</div>
									<span class="font-medium text-gray-900">{result.businessName}</span>
								</div>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
								<div class="flex items-center gap-1">
									<MapPinIcon class="h-4 w-4 flex-shrink-0" />
									{result.address || "—"}
								</div>
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
								<div class="flex items-center gap-1">
									<PhoneIcon class="h-4 w-4 flex-shrink-0" />
									{result.phone || "—"}
								</div>
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								{#if result.category}
									<span class="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
										{result.category}
									</span>
								{:else}
									<span class="text-sm text-gray-400">—</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								{#if result.hasWebsite}
									<span class="inline-flex items-center gap-1 text-sm text-green-600">
										<GlobeAltIcon class="h-4 w-4" />
										Ja
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-sm text-red-500">
										<XCircleIcon class="h-4 w-4" />
										Nej
									</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								{#if result.rating}
									<div class="flex items-center gap-1">
										<span class="text-sm text-yellow-500">{renderStars(result.rating)}</span>
										<span class="text-xs text-gray-500">({result.reviewCount})</span>
									</div>
								{:else}
									<span class="text-sm text-gray-400">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
