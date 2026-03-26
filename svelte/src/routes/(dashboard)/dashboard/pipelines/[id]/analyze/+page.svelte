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
		EnvelopeIcon,
		BuildingOfficeIcon,
		CheckCircleIcon,
		ClockIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let expandedRows = $state<Set<string>>(new Set());
	let selectedIds = $state<Set<string>>(new Set());

	const pipeline = $derived(data.pipeline);
	const results = $derived(pipeline.results);
	const analyzableResults = $derived(results.filter((r) => r.status !== "ANALYZING"));

	const allSelected = $derived(
		analyzableResults.length > 0 && analyzableResults.every((r) => selectedIds.has(r.id))
	);

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(analyzableResults.map((r) => r.id));
		}
	}

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

	let expandedPrompts = $state<Set<string>>(new Set());

	function togglePrompt(id: string) {
		const next = new Set(expandedPrompts);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedPrompts = next;
	}

	interface AnalysisData {
		summary: string;
		priority?: string;
		promptUsed?: string;
		allabolag?: {
			orgNr: string | null;
			companyName: string | null;
			companyType: string | null;
			revenue: string | null;
			profit: string | null;
			employees: string | null;
			sniDescription: string | null;
			registeredYear: string | null;
			boardMembers: string[];
			url: string | null;
		} | null;
		ownWebsite?: {
			url: string;
			title: string | null;
			techHints: string[];
			isMobileResponsive: boolean;
			hasSSL: boolean;
			socialMedia: Record<string, string | null>;
			emails: string[];
			phones: string[];
		} | null;
		searchResultCount?: number;
		directoryCount?: number;
		scrapedSiteCount?: number;
	}

	function parseAnalysis(json: string | null): AnalysisData | null {
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
							selectedIds = new Set();
							await invalidateAll();
						};
					}}
				>
					{#each [...selectedIds] as id}
						<input type="hidden" name="selectedIds" value={id} />
					{/each}
					<Button disabled={loading || analyzableResults.length === 0}>
						<SparklesIcon class="mr-2 h-5 w-5" />
						{#if loading}
							Analyserar...
						{:else if selectedIds.size > 0}
							Analysera {selectedIds.size} valda
						{:else if analyzableResults.length === 0}
							Alla analyserade
						{:else}
							Analysera alla ({analyzableResults.length})
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
		{#if analyzableResults.length > 0}
			<div class="flex items-center gap-3 px-1">
				<input
					type="checkbox"
					id="select-all"
					checked={allSelected}
					onchange={toggleSelectAll}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="select-all" class="text-sm text-gray-600 cursor-pointer select-none">
					{allSelected ? "Avmarkera alla" : "Markera alla ej analyserade"}
				</label>
				{#if selectedIds.size > 0}
					<span class="text-sm text-blue-600">{selectedIds.size} valda</span>
				{/if}
			</div>
		{/if}

		<div class="space-y-2">
			{#each results as result}
				{@const analysis = parseAnalysis(result.aiAnalysis)}
				{@const statusInfo = statusLabels[result.status] ?? statusLabels.FOUND}
				{@const StatusIcon = statusInfo.icon}
				{@const isExpanded = expandedRows.has(result.id)}

				<Card class="overflow-hidden">
					<!-- Huvudrad -->
					<div class="flex items-center gap-2 px-4">
						{#if result.status !== "ANALYZING"}
							<input
								type="checkbox"
								checked={selectedIds.has(result.id)}
								onchange={() => toggleSelect(result.id)}
								onclick={(e) => e.stopPropagation()}
								class="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
						{:else}
							<div class="h-4 w-4 flex-shrink-0"></div>
						{/if}
					<button
						type="button"
						class="flex flex-1 items-center gap-4 py-4 pr-2 text-left hover:bg-gray-50 transition-colors"
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
								{#if parseAnalysis(result.aiAnalysis)?.priority}
									{@const p = parseAnalysis(result.aiAnalysis)?.priority}
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium
										{p === 'Hög' ? 'bg-red-100 text-red-700' : p === 'Medel' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}">
										{p}
									</span>
								{/if}
							</div>
							{#if parseAnalysis(result.aiAnalysis)?.summary}
								<p class="mt-0.5 text-sm text-gray-500 line-clamp-1">{parseAnalysis(result.aiAnalysis)?.summary}</p>
							{:else}
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
							{/if}
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
					</div>

					<!-- Expanderad sektion -->
					{#if isExpanded}
						<div class="border-t border-gray-100 bg-gray-50 px-6 py-4">
							<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<!-- AI-analys -->
								<div>
									<h4 class="text-sm font-semibold text-gray-700 mb-2">AI-analys</h4>
									{#if analysis}
										<p class="text-sm text-gray-600">{analysis.summary}</p>
										{#if analysis.priority}
											<span class="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium
												{analysis.priority === 'Hög' ? 'bg-red-100 text-red-700' :
												 analysis.priority === 'Medel' ? 'bg-yellow-100 text-yellow-700' :
												 'bg-gray-100 text-gray-600'}">
												Prioritet: {analysis.priority}
											</span>
										{/if}
										{#if analysis.promptUsed}
											<div class="mt-3">
												<button
													type="button"
													onclick={() => togglePrompt(result.id)}
													class="text-xs text-gray-400 hover:text-gray-600 underline"
												>
													{expandedPrompts.has(result.id) ? "Dölj prompt" : "Visa prompt & data som användes"}
												</button>
												{#if expandedPrompts.has(result.id)}
													<pre class="mt-2 whitespace-pre-wrap rounded-md bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">{analysis.promptUsed}</pre>
												{/if}
											</div>
										{/if}
									{:else}
										<p class="text-sm text-gray-400 italic">Inte analyserad ännu</p>
									{/if}
								</div>

								<!-- Detaljer -->
<<<<<<< HEAD
								<div class="space-y-2">
									<h4 class="text-sm font-semibold text-gray-700 mb-2">Detaljer</h4>
									<dl class="space-y-1 text-sm">
										{#if result.orgNumber}
											<div class="flex gap-2">
												<dt class="flex items-center gap-1 text-gray-500">
													<BuildingOfficeIcon class="h-3.5 w-3.5" />Org-nr:
												</dt>
												<dd>
													<a
														href={result.allabolagUrl ?? `https://www.allabolag.se/what/${encodeURIComponent(result.businessName)}`}
														target="_blank"
														rel="noopener noreferrer"
														class="text-blue-600 hover:underline"
													>
														{result.orgNumber}
													</a>
												</dd>
											</div>
										{/if}
										{#if result.email}
											<div class="flex gap-2">
												<dt class="flex items-center gap-1 text-gray-500">
													<EnvelopeIcon class="h-3.5 w-3.5" />E-post:
												</dt>
												<dd>
													<a href="mailto:{result.email}" class="text-blue-600 hover:underline">
														{result.email}
													</a>
												</dd>
											</div>
										{/if}
										{#if result.website}
											<div class="flex gap-2">
												<dt class="text-gray-500">Maps-hemsida:</dt>
												<dd>
													<a href={result.website} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
														{result.website}
													</a>
												</dd>
											</div>
										{/if}
										{#if result.aiWebsiteFound}
											<div class="flex gap-2">
												<dt class="text-gray-500">AI-hittad hemsida:</dt>
												<dd>
													<a href={result.aiWebsiteFound} target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:underline">
														{result.aiWebsiteFound}
													</a>
												</dd>
											</div>
										{/if}
										{#if result.rating}
											<div class="flex gap-2">
												<dt class="text-gray-500">Betyg:</dt>
												<dd class="text-gray-900">{result.rating} / 5 ({result.reviewCount} recensioner)</dd>
											</div>
										{/if}
									</dl>
=======
								<div class="space-y-4">
									<!-- Hemsidor -->
									<div>
										<h4 class="text-sm font-semibold text-gray-700 mb-2">Hemsidor</h4>
										<dl class="space-y-1 text-sm">
											{#if result.website}
												<div class="flex gap-2">
													<dt class="text-gray-500 w-32 flex-shrink-0">Maps-hemsida:</dt>
													<dd><a href={result.website} target="_blank" class="text-blue-600 underline hover:text-blue-800">{result.website}</a></dd>
												</div>
											{/if}
											{#if result.aiWebsiteFound}
												<div class="flex gap-2">
													<dt class="text-gray-500 w-32 flex-shrink-0">AI-hittad:</dt>
													<dd><a href={result.aiWebsiteFound} target="_blank" class="text-purple-600 underline hover:text-purple-800">{result.aiWebsiteFound}</a></dd>
												</div>
											{/if}
										</dl>
									</div>

									<!-- Allabolag -->
									{#if analysis?.allabolag}
										{@const ab = analysis.allabolag}
										<div>
											<h4 class="text-sm font-semibold text-gray-700 mb-2">Bolagsdata (Allabolag.se)</h4>
											<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
												{#if ab.companyName}
													<div class="flex gap-1">
														<dt class="text-gray-500">Bolag:</dt>
														<dd class="text-gray-900 font-medium">{ab.companyName}</dd>
													</div>
												{/if}
												{#if ab.orgNr}
													<div class="flex gap-1">
														<dt class="text-gray-500">Org.nr:</dt>
														<dd class="text-gray-900">{ab.orgNr}</dd>
													</div>
												{/if}
												{#if ab.companyType}
													<div class="flex gap-1">
														<dt class="text-gray-500">Bolagsform:</dt>
														<dd class="text-gray-900">{ab.companyType}</dd>
													</div>
												{/if}
												{#if ab.revenue}
													<div class="flex gap-1">
														<dt class="text-gray-500">Omsättning:</dt>
														<dd class="text-gray-900 font-semibold">{ab.revenue}</dd>
													</div>
												{/if}
												{#if ab.profit}
													<div class="flex gap-1">
														<dt class="text-gray-500">Resultat:</dt>
														<dd class="text-gray-900">{ab.profit}</dd>
													</div>
												{/if}
												{#if ab.employees}
													<div class="flex gap-1">
														<dt class="text-gray-500">Anställda:</dt>
														<dd class="text-gray-900">{ab.employees}</dd>
													</div>
												{/if}
												{#if ab.sniDescription}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">Bransch:</dt>
														<dd class="text-gray-900">{ab.sniDescription}</dd>
													</div>
												{/if}
												{#if ab.registeredYear}
													<div class="flex gap-1">
														<dt class="text-gray-500">Registrerad:</dt>
														<dd class="text-gray-900">{ab.registeredYear}</dd>
													</div>
												{/if}
												{#if ab.boardMembers && ab.boardMembers.length > 0}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">Styrelse:</dt>
														<dd class="text-gray-900">{ab.boardMembers.join(", ")}</dd>
													</div>
												{/if}
											</dl>
											{#if ab.url}
												<a href={ab.url} target="_blank" class="mt-1 inline-block text-xs text-blue-500 hover:underline">Visa på Allabolag.se →</a>
											{/if}
										</div>
									{/if}

									<!-- Teknisk info om hemsida -->
									{#if analysis?.ownWebsite}
										{@const web = analysis.ownWebsite}
										<div>
											<h4 class="text-sm font-semibold text-gray-700 mb-2">Teknisk analys av hemsida</h4>
											<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
												{#if web.title}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">Titel:</dt>
														<dd class="text-gray-900">{web.title}</dd>
													</div>
												{/if}
												<div class="flex gap-1">
													<dt class="text-gray-500">SSL:</dt>
													<dd class={web.hasSSL ? "text-green-600" : "text-red-500"}>{web.hasSSL ? "Ja ✓" : "Nej ✗"}</dd>
												</div>
												<div class="flex gap-1">
													<dt class="text-gray-500">Mobilanpassad:</dt>
													<dd class={web.isMobileResponsive ? "text-green-600" : "text-red-500"}>{web.isMobileResponsive ? "Ja ✓" : "Nej ✗"}</dd>
												</div>
												{#if web.techHints && web.techHints.length > 0}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">Teknik:</dt>
														<dd class="text-gray-900">{web.techHints.join(", ")}</dd>
													</div>
												{/if}
												{#if web.emails && web.emails.length > 0}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">E-post:</dt>
														<dd class="text-gray-900">{web.emails.join(", ")}</dd>
													</div>
												{/if}
												{#if web.phones && web.phones.length > 0}
													<div class="flex gap-1 col-span-2">
														<dt class="text-gray-500">Telefon:</dt>
														<dd class="text-gray-900">{web.phones.join(", ")}</dd>
													</div>
												{/if}
											</dl>
											<!-- Sociala medier -->
											{#if web.socialMedia}
												{@const socials = Object.entries(web.socialMedia).filter(([, v]) => v)}
												{#if socials.length > 0}
													<div class="mt-2 flex flex-wrap gap-2">
														{#each socials as [platform, url]}
															<a
																href={url}
																target="_blank"
																class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
															>
																{platform}
															</a>
														{/each}
													</div>
												{/if}
											{/if}
										</div>
									{/if}

									<!-- Datainsamling sammanfattning -->
									{#if analysis?.searchResultCount !== undefined}
										<div class="border-t border-gray-200 pt-2">
											<p class="text-xs text-gray-400">
												Datainsamling: {analysis.searchResultCount ?? 0} organiska sökträffar,
												{analysis.directoryCount ?? 0} kataloglistningar,
												{analysis.scrapedSiteCount ?? 0} scrapade sidor
											</p>
										</div>
									{/if}
>>>>>>> claude/clarify-project-scope-i0Hoj
								</div>
							</div>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
