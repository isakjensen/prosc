<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import {
		ChevronLeftIcon,
		SparklesIcon,
		StopIcon,
		GlobeAltIcon,
		XCircleIcon,
		ChevronDownIcon,
		ChevronUpIcon,
		MapPinIcon,
		PhoneIcon,
		CheckCircleIcon,
		ClockIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let expandedRows = $state<Set<string>>(new Set());

	const pipeline = $derived(data.pipeline);
	const results = $derived(pipeline.results);
	const analyzed = $derived(results.filter((r) => r.status === "ANALYZED").length);
	const analyzing = $derived(results.filter((r) => r.status === "ANALYZING").length);
	const pending = $derived(results.filter((r) => r.status === "FOUND").length);
	const withAiWebsite = $derived(results.filter((r) => r.aiWebsiteFound).length);

	function toggleRow(id: string) {
		const next = new Set(expandedRows);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedRows = next;
	}

	function getInitials(name: string) {
		return name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	function parseAnalysis(json: string | null): { summary: string } | null {
		if (!json) return null;
		try {
			return JSON.parse(json);
		} catch {
			return null;
		}
	}

	const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
		FOUND: { label: "Väntar", color: "text-gray-500", icon: ClockIcon },
		ANALYZING: { label: "Analyserar...", color: "text-yellow-600", icon: SparklesIcon },
		ANALYZED: { label: "Analyserad", color: "text-green-600", icon: CheckCircleIcon },
	};
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="/dashboard/pipelines/{pipeline.id}"
			class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
		>
			<ChevronLeftIcon class="h-5 w-5" />
		</a>
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<h1 class="text-3xl font-bold text-gray-900">{pipeline.name}</h1>
				<span class="text-lg text-gray-400">/ Analys</span>
			</div>
			<p class="mt-1 text-gray-500">AI-djupanalys av hittade företag</p>
		</div>
		<div class="flex items-center gap-2">
			{#if analyzing > 0}
				<form
					method="POST"
					action="?/stopAnalysis"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
				>
					<Button variant="destructive">
						<StopIcon class="mr-2 h-5 w-5" />
						Stoppa analys
					</Button>
				</form>
			{:else}
				<form
					method="POST"
					action="?/startAnalysis"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							await invalidateAll();
						};
					}}
				>
					<Button disabled={loading || analyzed === results.length}>
						<SparklesIcon class="mr-2 h-5 w-5" />
						{#if loading}
							Analyserar...
						{:else if analyzed === results.length}
							Alla analyserade
						{:else}
							Starta AI-analys
						{/if}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Statistik -->
	<div class="grid grid-cols-4 gap-4">
		<Card class="p-4 text-center">
			<p class="text-3xl font-bold text-gray-900">{results.length}</p>
			<p class="text-sm text-gray-500">Totalt</p>
		</Card>
		<Card class="p-4 text-center">
			<p class="text-3xl font-bold text-green-600">{analyzed}</p>
			<p class="text-sm text-gray-500">Analyserade</p>
		</Card>
		<Card class="p-4 text-center">
			<p class="text-3xl font-bold text-gray-400">{pending}</p>
			<p class="text-sm text-gray-500">Väntar</p>
		</Card>
		<Card class="p-4 text-center">
			<p class="text-3xl font-bold text-purple-600">{withAiWebsite}</p>
			<p class="text-sm text-gray-500">Hemsida hittad av AI</p>
		</Card>
	</div>

	<!-- Resultatlista -->
	{#if results.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga resultat att analysera</p>
			<p class="mt-2 text-sm text-gray-400">
				Gå tillbaka och kör scraping först
			</p>
		</Card>
	{:else}
		<div class="space-y-2">
			{#each results as result}
				{@const analysis = parseAnalysis(result.aiAnalysis)}
				{@const statusInfo = statusLabels[result.status] ?? statusLabels.FOUND}
				{@const StatusIcon = statusInfo.icon}
				{@const isExpanded = expandedRows.has(result.id)}

				<Card class="overflow-hidden">
					<!-- Huvudrad -->
					<button
						type="button"
						class="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
						onclick={() => toggleRow(result.id)}
					>
						<!-- Avatar -->
						<div
							class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
						>
							{getInitials(result.businessName)}
						</div>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-900">{result.businessName}</span>
								{#if result.category}
									<span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
										{result.category}
									</span>
								{/if}
							</div>
							<div class="mt-0.5 flex items-center gap-4 text-sm text-gray-500">
								{#if result.address}
									<span class="flex items-center gap-1">
										<MapPinIcon class="h-3.5 w-3.5" />
										{result.address}
									</span>
								{/if}
								{#if result.phone}
									<span class="flex items-center gap-1">
										<PhoneIcon class="h-3.5 w-3.5" />
										{result.phone}
									</span>
								{/if}
							</div>
						</div>

						<!-- Hemsida Maps -->
						<div class="flex-shrink-0">
							{#if result.hasWebsite}
								<span class="inline-flex items-center gap-1 text-sm text-green-600">
									<GlobeAltIcon class="h-4 w-4" />
									Maps
								</span>
							{:else}
								<span class="inline-flex items-center gap-1 text-sm text-red-500">
									<XCircleIcon class="h-4 w-4" />
									Maps
								</span>
							{/if}
						</div>

						<!-- AI hemsida -->
						<div class="flex-shrink-0 w-24 text-center">
							{#if result.aiWebsiteFound}
								<span class="inline-flex items-center gap-1 text-sm text-purple-600">
									<GlobeAltIcon class="h-4 w-4" />
									AI
								</span>
							{:else if result.status === "ANALYZED"}
								<span class="inline-flex items-center gap-1 text-sm text-gray-400">
									<XCircleIcon class="h-4 w-4" />
									AI
								</span>
							{:else}
								<span class="text-sm text-gray-300">—</span>
							{/if}
						</div>

						<!-- Status -->
						<div class="flex-shrink-0 w-28">
							<span class="inline-flex items-center gap-1 text-sm {statusInfo.color}">
								<StatusIcon class="h-4 w-4" />
								{statusInfo.label}
							</span>
						</div>

						<!-- Expand -->
						<div class="flex-shrink-0">
							{#if isExpanded}
								<ChevronUpIcon class="h-5 w-5 text-gray-400" />
							{:else}
								<ChevronDownIcon class="h-5 w-5 text-gray-400" />
							{/if}
						</div>
					</button>

					<!-- Expanderad sektion -->
					{#if isExpanded}
						<div class="border-t border-gray-100 bg-gray-50 px-6 py-4">
							<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<!-- AI-analys -->
								<div>
									<h4 class="text-sm font-semibold text-gray-700 mb-2">AI-analys</h4>
									{#if analysis}
										<p class="text-sm text-gray-600">{analysis.summary}</p>
									{:else}
										<p class="text-sm text-gray-400 italic">Inte analyserad ännu</p>
									{/if}
								</div>

								<!-- Detaljer -->
								<div class="space-y-2">
									<h4 class="text-sm font-semibold text-gray-700 mb-2">Detaljer</h4>
									<dl class="space-y-1 text-sm">
										{#if result.website}
											<div class="flex gap-2">
												<dt class="text-gray-500">Maps-hemsida:</dt>
												<dd class="text-blue-600 underline">{result.website}</dd>
											</div>
										{/if}
										{#if result.aiWebsiteFound}
											<div class="flex gap-2">
												<dt class="text-gray-500">AI-hittad hemsida:</dt>
												<dd class="text-purple-600 underline">{result.aiWebsiteFound}</dd>
											</div>
										{/if}
										{#if result.rating}
											<div class="flex gap-2">
												<dt class="text-gray-500">Betyg:</dt>
												<dd class="text-gray-900">{result.rating} / 5 ({result.reviewCount} recensioner)</dd>
											</div>
										{/if}
									</dl>
								</div>
							</div>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
