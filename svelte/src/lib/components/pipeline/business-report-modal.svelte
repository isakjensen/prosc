<script lang="ts">
	import {
		XMarkIcon,
		GlobeAltIcon,
		BuildingOfficeIcon,
		MagnifyingGlassIcon,
		ServerStackIcon,
		UserGroupIcon,
		PhoneIcon,
		EnvelopeIcon,
		MapPinIcon,
		CheckCircleIcon,
		XCircleIcon,
		MinusCircleIcon,
		LinkIcon,
		DevicePhoneMobileIcon,
		LockClosedIcon,
		ClockIcon,
		TagIcon,
	} from "heroicons-svelte/24/outline";

	interface Props {
		businessName: string;
		category: string | null;
		address: string | null;
		phone: string | null;
		website: string | null;
		hasWebsite: boolean;
		enrichmentData: string | null;
		onclose: () => void;
	}

	let {
		businessName,
		category,
		address,
		phone,
		website,
		hasWebsite,
		enrichmentData,
		onclose,
	}: Props = $props();

	const data = $derived(enrichmentData ? JSON.parse(enrichmentData) : null);
	const summary = $derived(data?.summary ?? null);
	const allabolag = $derived(data?.allabolag ?? null);
	const ownWebsite = $derived(data?.ownWebsite ?? null);
	const scrapedSites = $derived(data?.scrapedSites ?? []);
	const searchOrganic = $derived(data?.search?.organic ?? []);
	const searchDirectories = $derived(data?.search?.directories ?? []);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}

	type Status = "found" | "not_found" | "unknown";

	function statusIcon(value: unknown): Status {
		if (value === null || value === undefined) return "unknown";
		if (typeof value === "boolean") return value ? "found" : "not_found";
		if (typeof value === "string") return value.length > 0 ? "found" : "not_found";
		if (Array.isArray(value)) return value.length > 0 ? "found" : "not_found";
		return "found";
	}

	const statusColors: Record<Status, string> = {
		found: "text-green-600",
		not_found: "text-red-400",
		unknown: "text-gray-300",
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<div class="relative flex h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-w-3xl lg:max-w-5xl">
		<!-- Header -->
		<div class="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
						{businessName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
					</div>
					<div>
						<h2 class="text-xl font-bold text-gray-900">{businessName}</h2>
						<div class="flex items-center gap-3 text-sm text-gray-500">
							{#if category}
								<span class="inline-flex items-center gap-1">
									<TagIcon class="h-3.5 w-3.5" />
									{category}
								</span>
							{/if}
							{#if address}
								<span class="inline-flex items-center gap-1">
									<MapPinIcon class="h-3.5 w-3.5" />
									{address}
								</span>
							{/if}
						</div>
					</div>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
				>
					<XMarkIcon class="h-5 w-5" />
				</button>
			</div>
			{#if data?.enrichedAt}
				<p class="mt-2 text-xs text-gray-400">
					Berikad: {new Date(data.enrichedAt).toLocaleString("sv-SE")}
				</p>
			{/if}
		</div>

		<!-- Scrollbart innehåll -->
		<div class="flex-1 overflow-y-auto">
			{#if !data}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<MagnifyingGlassIcon class="mx-auto h-12 w-12 text-gray-300" />
						<p class="mt-4 text-gray-500">Ingen berikad data tillgänglig</p>
						<p class="mt-1 text-sm text-gray-400">Kör "Berika data" för att samla in information om detta företag</p>
					</div>
				</div>
			{:else}
				<div class="divide-y divide-gray-200">

					<!-- ==================== -->
					<!-- SEKTION 1: OSM-data  -->
					<!-- ==================== -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<MapPinIcon class="h-5 w-5 text-orange-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">OpenStreetMap</h3>
							<span class="text-xs text-gray-400">(Grunddata från kartan)</span>
						</div>
						<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
							{@render dataPoint("Företagsnamn", businessName)}
							{@render dataPoint("Kategori", category)}
							{@render dataPoint("Adress", address)}
							{@render dataPoint("Telefon", phone)}
							{@render dataPoint("Hemsida (OSM)", website)}
							{@render dataPointBool("Har hemsida", hasWebsite)}
						</div>
					</section>

					<!-- ========================= -->
					<!-- SEKTION 2: Allabolag.se   -->
					<!-- ========================= -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<BuildingOfficeIcon class="h-5 w-5 text-blue-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">Allabolag.se</h3>
							<span class="text-xs text-gray-400">(Bolagsdata)</span>
							{#if allabolag?.found}
								<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Hittad</span>
							{:else}
								<span class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Ej hittad</span>
							{/if}
						</div>
						<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
							{@render dataPoint("Bolagsnamn", summary?.companyName)}
							{@render dataPoint("Org.nr", summary?.orgNr)}
							{@render dataPoint("Bolagsform", summary?.companyType)}
							{@render dataPoint("Omsättning", summary?.revenue)}
							{@render dataPoint("Resultat", summary?.profit)}
							{@render dataPoint("Anställda", summary?.employees)}
							{@render dataPoint("Bransch (SNI)", summary?.sniDescription)}
							{@render dataPoint("Registrerad", summary?.registeredYear)}
						</div>
						{#if summary?.boardMembers && summary.boardMembers.length > 0}
							<div class="mt-3">
								<p class="text-xs font-medium text-gray-500 mb-1">Styrelse / Ägare</p>
								<div class="flex flex-wrap gap-1.5">
									{#each summary.boardMembers as member}
										<span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
											<UserGroupIcon class="h-3 w-3" />
											{member}
										</span>
									{/each}
								</div>
							</div>
						{:else}
							<div class="mt-3">
								<p class="text-xs text-gray-300">Styrelse / Ägare: Ej hittad</p>
							</div>
						{/if}
						{#if allabolag?.url}
							<a href={allabolag.url} target="_blank" class="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
								<LinkIcon class="h-3 w-3" />
								Visa på Allabolag.se
							</a>
						{/if}
					</section>

					<!-- ============================ -->
					<!-- SEKTION 3: Hemsideanalys     -->
					<!-- ============================ -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<GlobeAltIcon class="h-5 w-5 text-green-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">Hemsida</h3>
							<span class="text-xs text-gray-400">(Teknisk analys)</span>
							{#if summary?.hasOwnWebsite}
								<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Hittad</span>
							{:else}
								<span class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Ej hittad</span>
							{/if}
						</div>

						{#if ownWebsite || summary?.hasOwnWebsite}
							<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
								{@render dataPoint("URL", summary?.websiteUrl)}
								{@render dataPoint("Titel", ownWebsite?.title)}
								{@render dataPoint("Beskrivning", ownWebsite?.description)}
								{@render dataPointBool("SSL (HTTPS)", summary?.websiteSSL)}
								{@render dataPointBool("Mobilanpassad", summary?.websiteMobile)}
								{@render dataPoint("Teknik", summary?.websiteTech?.length > 0 ? summary.websiteTech.join(", ") : null)}
								{@render dataPoint("Copyright-år", summary?.websiteCopyrightYear)}
								{@render dataPoint("Interna länkar", ownWebsite?.pageCount ? `~${ownWebsite.pageCount}` : null)}
							</div>
						{:else}
							<p class="text-sm text-gray-400 italic">Ingen hemsida hittades att analysera.</p>
						{/if}

						<!-- Kontaktinfo hittad på webben -->
						<div class="mt-4 grid grid-cols-2 gap-4">
							<div>
								<p class="text-xs font-medium text-gray-500 mb-1.5">E-postadresser hittade</p>
								{#if summary?.emails?.length > 0}
									<div class="space-y-1">
										{#each summary.emails as email}
											<div class="flex items-center gap-1.5 text-sm">
												<EnvelopeIcon class="h-3.5 w-3.5 text-green-500" />
												<span class="text-gray-900">{email}</span>
											</div>
										{/each}
									</div>
								{:else}
									<p class="flex items-center gap-1.5 text-sm text-gray-300">
										<MinusCircleIcon class="h-3.5 w-3.5" />
										Inga hittade
									</p>
								{/if}
							</div>
							<div>
								<p class="text-xs font-medium text-gray-500 mb-1.5">Telefonnummer hittade</p>
								{#if summary?.phones?.length > 0}
									<div class="space-y-1">
										{#each summary.phones as tel}
											<div class="flex items-center gap-1.5 text-sm">
												<PhoneIcon class="h-3.5 w-3.5 text-green-500" />
												<span class="text-gray-900">{tel}</span>
											</div>
										{/each}
									</div>
								{:else}
									<p class="flex items-center gap-1.5 text-sm text-gray-300">
										<MinusCircleIcon class="h-3.5 w-3.5" />
										Inga hittade
									</p>
								{/if}
							</div>
						</div>
					</section>

					<!-- ========================= -->
					<!-- SEKTION 4: Sociala medier -->
					<!-- ========================= -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<UserGroupIcon class="h-5 w-5 text-purple-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">Sociala medier</h3>
						</div>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"] as platform}
								{@const url = summary?.socialMedia?.[platform]}
								<div class="flex items-center gap-2 rounded-lg border px-3 py-2 {url ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}">
									{#if url}
										<CheckCircleIcon class="h-4 w-4 text-green-500 flex-shrink-0" />
										<div class="min-w-0 flex-1">
											<p class="text-xs font-medium text-gray-700 capitalize">{platform}</p>
											<a href={url} target="_blank" class="block truncate text-xs text-blue-500 hover:underline">{url}</a>
										</div>
									{:else}
										<XCircleIcon class="h-4 w-4 text-gray-300 flex-shrink-0" />
										<div>
											<p class="text-xs font-medium text-gray-400 capitalize">{platform}</p>
											<p class="text-xs text-gray-300">Ej hittad</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>

					<!-- ========================= -->
					<!-- SEKTION 5: Sökresultat    -->
					<!-- ========================= -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<MagnifyingGlassIcon class="h-5 w-5 text-yellow-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">Sökresultat</h3>
							<span class="text-xs text-gray-400">
								({searchOrganic.length} organiska, {searchDirectories.length} kataloger)
							</span>
						</div>

						{#if searchOrganic.length > 0}
							<p class="text-xs font-medium text-gray-500 mb-2">Organiska träffar (potentiella hemsidor)</p>
							<div class="space-y-2 mb-4">
								{#each searchOrganic as result, i}
									<div class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
										<div class="flex items-start gap-2">
											<span class="mt-0.5 flex-shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-600">{i + 1}</span>
											<div class="min-w-0 flex-1">
												<a href={result.url} target="_blank" class="text-sm font-medium text-blue-600 hover:underline line-clamp-1">{result.title}</a>
												<p class="text-xs text-gray-500 truncate">{result.url}</p>
												{#if result.snippet}
													<p class="mt-0.5 text-xs text-gray-600 line-clamp-2">{result.snippet}</p>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-300 mb-4">Inga organiska sökträffar hittades.</p>
						{/if}

						{#if searchDirectories.length > 0}
							<p class="text-xs font-medium text-gray-500 mb-2">Kataloglistningar</p>
							<div class="space-y-1">
								{#each searchDirectories as result}
									<div class="flex items-center gap-2 text-sm">
										<LinkIcon class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
										<a href={result.url} target="_blank" class="text-blue-500 hover:underline truncate">{result.title}</a>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-300">Inga kataloglistningar hittades.</p>
						{/if}
					</section>

					<!-- =============================== -->
					<!-- SEKTION 6: Scrapade webbsidor   -->
					<!-- =============================== -->
					<section class="px-6 py-5">
						<div class="flex items-center gap-2 mb-4">
							<ServerStackIcon class="h-5 w-5 text-teal-500" />
							<h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">Scrapade webbsidor</h3>
							<span class="text-xs text-gray-400">({scrapedSites.length} sidor)</span>
						</div>

						{#if scrapedSites.length > 0}
							<div class="space-y-3">
								{#each scrapedSites as site, i}
									<div class="rounded-lg border border-gray-200 bg-white p-4">
										<div class="flex items-start justify-between mb-2">
											<div class="min-w-0 flex-1">
												<a href={site.url} target="_blank" class="text-sm font-medium text-blue-600 hover:underline">{site.title || site.url}</a>
												<p class="text-xs text-gray-400 truncate">{site.url}</p>
											</div>
											<div class="flex items-center gap-2 flex-shrink-0 ml-3">
												{#if site.looksLegit}
													<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Legitim</span>
												{:else}
													<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Osäker</span>
												{/if}
											</div>
										</div>
										{#if site.description}
											<p class="text-xs text-gray-600 mb-2 line-clamp-2">{site.description}</p>
										{/if}
										<div class="flex flex-wrap gap-3 text-xs">
											<span class="flex items-center gap-1 {site.hasSSL ? 'text-green-600' : 'text-red-400'}">
												<LockClosedIcon class="h-3.5 w-3.5" />
												SSL: {site.hasSSL ? "Ja" : "Nej"}
											</span>
											<span class="flex items-center gap-1 {site.isMobileResponsive ? 'text-green-600' : 'text-red-400'}">
												<DevicePhoneMobileIcon class="h-3.5 w-3.5" />
												Mobil: {site.isMobileResponsive ? "Ja" : "Nej"}
											</span>
											{#if site.techHints?.length > 0}
												<span class="flex items-center gap-1 text-gray-600">
													<ServerStackIcon class="h-3.5 w-3.5" />
													{site.techHints.join(", ")}
												</span>
											{/if}
											{#if site.lastModifiedHint}
												<span class="flex items-center gap-1 text-gray-600">
													<ClockIcon class="h-3.5 w-3.5" />
													© {site.lastModifiedHint}
												</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-300">Inga sidor scrapades.</p>
						{/if}
					</section>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-3">
			<div class="flex items-center justify-between">
				<div class="text-xs text-gray-400">
					{#if data}
						{summary?.searchResultCount ?? 0} sökträffar ·
						{summary?.directoryListings ?? 0} kataloger ·
						{summary?.scrapedSiteCount ?? 0} scrapade sidor
					{/if}
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-md bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
				>
					Stäng
				</button>
			</div>
		</div>
	</div>
</div>

{#snippet dataPoint(label: string, value: unknown)}
	<div class="min-w-0">
		<p class="text-xs font-medium text-gray-500">{label}</p>
		{#if value && (typeof value === "string" ? value.length > 0 : true)}
			{@const str = String(value)}
			{#if str.startsWith("http")}
				<a href={str} target="_blank" class="text-sm text-blue-600 hover:underline truncate block">{str}</a>
			{:else}
				<p class="text-sm text-gray-900 truncate">{str}</p>
			{/if}
		{:else}
			<p class="text-sm text-gray-300 italic">Ej hittad</p>
		{/if}
	</div>
{/snippet}

{#snippet dataPointBool(label: string, value: boolean | null | undefined)}
	<div>
		<p class="text-xs font-medium text-gray-500">{label}</p>
		{#if value === true}
			<p class="flex items-center gap-1 text-sm text-green-600">
				<CheckCircleIcon class="h-4 w-4" />
				Ja
			</p>
		{:else if value === false}
			<p class="flex items-center gap-1 text-sm text-red-400">
				<XCircleIcon class="h-4 w-4" />
				Nej
			</p>
		{:else}
			<p class="text-sm text-gray-300 italic">Okänt</p>
		{/if}
	</div>
{/snippet}
