<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import CityAreaSelector from "$lib/components/pipeline/city-area-selector.svelte";
	import BusinessReportModal from "$lib/components/pipeline/business-report-modal.svelte";
	import {
		PlayIcon,
		StopIcon,
		ArrowRightIcon,
		ChevronLeftIcon,
		GlobeAltIcon,
		XCircleIcon,
		MapPinIcon,
		PhoneIcon,
		PencilIcon,
		ArrowPathIcon,
		XMarkIcon,
		PlusIcon,
		DocumentMagnifyingGlassIcon,
		SparklesIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData, ActionData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let enrichLoading = $state(false);
	let showEditModal = $state(false);
	let reportResult = $state<(typeof results)[number] | null>(null);
	let selectedIds = $state<Set<string>>(new Set());

	// Edit form state – initialized when modal opens
	let editName = $state("");
	let editDescription = $state("");
	let editBounds = $state<{ north: number; south: number; east: number; west: number } | null>(null);
	let editCityName = $state("");
	let editCategories = $state<string[]>([]);
	let editNewCategory = $state("");
	let editLoading = $state(false);

	function openEdit() {
		const p = data.pipeline;
		editName = p.name;
		editDescription = p.description;
		editBounds = p.areaConfig ? JSON.parse(p.areaConfig) : null;
		editCityName = "";
		editCategories = p.categories ? JSON.parse(p.categories) : [];
		showEditModal = true;
	}

	function addEditCategory() {
		const trimmed = editNewCategory.trim();
		if (trimmed && !editCategories.includes(trimmed)) {
			editCategories = [...editCategories, trimmed];
			editNewCategory = "";
		}
	}

	function removeEditCategory(cat: string) {
		editCategories = editCategories.filter((c) => c !== cat);
	}

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

	const resultStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
		FOUND: { label: "Hittad", color: "text-gray-600", bg: "bg-gray-100" },
		ENRICHING: { label: "Berikar...", color: "text-purple-600", bg: "bg-purple-100" },
		ENRICHED: { label: "Berikad", color: "text-emerald-600", bg: "bg-emerald-100" },
		ANALYZING: { label: "Analyserar...", color: "text-blue-600", bg: "bg-blue-100" },
		ANALYZED: { label: "Analyserad", color: "text-blue-600", bg: "bg-blue-100" },
	};

	const status = $derived(statusConfig[pipeline.status] ?? statusConfig.IDLE);
	const enrichedCount = $derived(results.filter((r) => r.status === "ENRICHED" || r.status === "ANALYZED").length);
	const enrichingCount = $derived(results.filter((r) => r.status === "ENRICHING").length);
	const allSelected = $derived(filteredResults.length > 0 && filteredResults.every((r) => selectedIds.has(r.id)));
	const isEnriching = $derived(results.some((r) => r.status === "ENRICHING"));

	function formatDate(d: string | Date | null | undefined) {
		if (!d) return null;
		return new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));
	}

	function toggleAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(filteredResults.map((r) => r.id));
		}
	}

	function toggleOne(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
		<a
			href="/dashboard/pipelines"
			class="self-start rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
		>
			<ChevronLeftIcon class="h-5 w-5" />
		</a>
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold text-gray-900 sm:text-3xl truncate">{pipeline.name}</h1>
				<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {status.color} {status.bg}">
					{status.label}
				</span>
			</div>
			<p class="mt-1 text-gray-500">{pipeline.description}</p>
			<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
				{#if pipeline.lastScrapedAt}
					<span>Senaste fetch: <span class="font-medium text-gray-600">{formatDate(pipeline.lastScrapedAt)}</span></span>
				{/if}
				{#if pipeline.lastEnrichedAt}
					<span>Senaste berikning: <span class="font-medium text-gray-600">{formatDate(pipeline.lastEnrichedAt)}</span></span>
				{/if}
				{#if pipeline.lastAnalyzedAt}
					<span>Senaste AI-analys: <span class="font-medium text-gray-600">{formatDate(pipeline.lastAnalyzedAt)}</span></span>
				{/if}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="outline" onclick={openEdit}>
				<PencilIcon class="mr-2 h-4 w-4" />
				Redigera
			</Button>
			{#if results.length > 0}
				<form
					method="POST"
					action="?/clearResults"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
				>
					<Button variant="outline" type="submit" onclick={(e) => { if (!confirm("Rensa alla resultat?")) e.preventDefault(); }}>
						<ArrowPathIcon class="mr-2 h-4 w-4" />
						Rensa resultat
					</Button>
				</form>
			{/if}
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
				<form
					method="POST"
					action="?/enrich"
					use:enhance={({ formData }) => {
						for (const id of selectedIds) {
							formData.append("selectedIds", id);
						}
						enrichLoading = true;
						return async ({ update }) => {
							enrichLoading = false;
							selectedIds = new Set();
							await update();
							await invalidateAll();
						};
					}}
				>
					<Button variant="outline" type="submit" disabled={enrichLoading || selectedIds.size === 0}>
						<SparklesIcon class="mr-2 h-4 w-4" />
						{enrichLoading ? "Berikar..." : `Berika (${selectedIds.size})`}
					</Button>
				</form>
				<a href="/dashboard/pipelines/{pipeline.id}/analyze">
					<Button variant="outline">
						Gå vidare till analys
						<ArrowRightIcon class="ml-2 h-5 w-5" />
					</Button>
				</a>
			{/if}
		</div>
	</div>

	<!-- Felmeddelande -->
	{#if form && 'error' in form && form.error}
		<div class="rounded-md bg-red-50 border border-red-200 p-4">
			<p class="text-sm text-red-800">{form.error}</p>
		</div>
	{/if}

	<!-- Statistik -->
	{#if results.length > 0}
		<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
			<Card class="p-4 text-center">
				<p class="text-3xl font-bold text-emerald-600">{enrichedCount}</p>
				<p class="text-sm text-gray-500">Berikade{enrichingCount > 0 ? ` (${enrichingCount} pågår)` : ""}</p>
			</Card>
		</div>
	{/if}

	<!-- Filter -->
	{#if results.length > 0}
		<div class="flex flex-wrap gap-2 sm:gap-4">
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
		<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="w-10 px-4 py-3">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={toggleAll}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Företag
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Adress / Telefon
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Kategori
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Hemsida
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Status
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Rapport
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each filteredResults as result}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="w-10 px-4 py-4">
								<input
									type="checkbox"
									checked={selectedIds.has(result.id)}
									onchange={() => toggleOne(result.id)}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
							</td>
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
							<td class="px-6 py-4 text-sm text-gray-500">
								<div class="flex items-center gap-1">
									<MapPinIcon class="h-4 w-4 flex-shrink-0" />
									{result.address || "—"}
								</div>
								{#if result.phone}
									<div class="mt-0.5 flex items-center gap-1">
										<PhoneIcon class="h-4 w-4 flex-shrink-0" />
										{result.phone}
									</div>
								{/if}
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
								{#if true}
									{@const rs = resultStatusConfig[result.status] ?? resultStatusConfig.FOUND}
									<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {rs.color} {rs.bg}">
										{rs.label}
									</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								{#if result.enrichmentData}
									<button
										type="button"
										onclick={() => (reportResult = result)}
										class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
									>
										<DocumentMagnifyingGlassIcon class="h-4 w-4" />
										Visa rapport
									</button>
								{:else}
									<span class="text-xs text-gray-400">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Redigeringsmodal -->
{#if showEditModal}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	onclick={(e) => { if (e.target === e.currentTarget) showEditModal = false; }}
>
	<div class="relative flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-w-2xl lg:max-w-4xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-xl font-bold text-gray-900">Redigera pipeline</h2>
			<button
				type="button"
				onclick={() => (showEditModal = false)}
				class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
			>
				<XMarkIcon class="h-5 w-5" />
			</button>
		</div>

		<!-- Innehåll -->
		<div class="flex-1 overflow-y-auto px-6 py-6">
			<form
				id="edit-form"
				method="POST"
				action="?/update"
				use:enhance={() => {
					editLoading = true;
					return async ({ result, update }) => {
						editLoading = false;
						if (result.type === "success") {
							showEditModal = false;
							await invalidateAll();
						} else {
							await update();
						}
					};
				}}
				class="space-y-8"
			>
				<!-- Grundinfo -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">Grundinformation</h3>
					<div>
						<Label for="edit-name">Pipelinenamn *</Label>
						<Input id="edit-name" name="name" bind:value={editName} required />
					</div>
					<div>
						<Label for="edit-desc">Kundbeskrivning *</Label>
						<textarea
							id="edit-desc"
							name="description"
							rows="3"
							bind:value={editDescription}
							required
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
						></textarea>
					</div>
				</div>

				<!-- Stadsval -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">Sökområde</h3>
					<p class="text-sm text-gray-500">
						Ange en stad – systemet söker automatiskt inom 1 mil (10 km) från stadskärnan.
					</p>
					<CityAreaSelector bind:bounds={editBounds} bind:cityName={editCityName} />
					<input type="hidden" name="areaConfig" value={editBounds ? JSON.stringify(editBounds) : ""} />
					{#if !editBounds}
						<p class="text-sm text-amber-600">Inget område valt – scraping kan inte köras utan ett område.</p>
					{/if}
				</div>

				<!-- Kategorier -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">Sökkategorier</h3>
					<div class="flex flex-wrap gap-2">
						{#each editCategories as cat}
							<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
								{cat}
								<button
									type="button"
									onclick={() => removeEditCategory(cat)}
									class="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 transition-colors"
								>
									<XMarkIcon class="h-3 w-3" />
								</button>
							</span>
						{/each}
					</div>
					<div class="flex gap-2">
						<Input
							placeholder="Lägg till kategori..."
							bind:value={editNewCategory}
							class="max-w-xs"
						/>
						<Button variant="outline" type="button" onclick={addEditCategory}>
							<PlusIcon class="mr-1 h-4 w-4" />
							Lägg till
						</Button>
					</div>
					<input type="hidden" name="categories" value={JSON.stringify(editCategories)} />
				</div>
			</form>
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
			<Button variant="outline" onclick={() => (showEditModal = false)}>Avbryt</Button>
			<Button type="submit" form="edit-form" disabled={editLoading}>
				{editLoading ? "Sparar..." : "Spara ändringar"}
			</Button>
		</div>
	</div>
</div>
{/if}

<!-- Företagsrapport-modal -->
{#if reportResult}
	<BusinessReportModal
		businessName={reportResult.businessName}
		category={reportResult.category}
		address={reportResult.address}
		phone={reportResult.phone}
		website={reportResult.website}
		hasWebsite={reportResult.hasWebsite}
		enrichmentData={reportResult.enrichmentData}
		onclose={() => (reportResult = null)}
	/>
{/if}
