<script lang="ts">
	import { MagnifyingGlassIcon, XMarkIcon } from "heroicons-svelte/24/outline";

	interface AreaBounds {
		north: number;
		south: number;
		east: number;
		west: number;
		cityName?: string;
	}

	interface Props {
		bounds?: AreaBounds | null;
		cityName?: string;
	}

	let { bounds = $bindable(null), cityName = $bindable("") }: Props = $props();

	let query = $state(cityName || "");
	let searching = $state(false);
	let error = $state("");

	const RADIUS_KM = 10; // 1 svensk mil

	async function search() {
		const q = query.trim();
		if (!q) return;

		searching = true;
		error = "";

		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=sv`,
				{ headers: { "User-Agent": "prosc-app/1.0" } }
			);

			if (!res.ok) throw new Error("Sökfel");

			const data = await res.json();

			if (data.length === 0) {
				error = `Hittade ingen ort med namnet "${q}"`;
				return;
			}

			const lat = parseFloat(data[0].lat);
			const lon = parseFloat(data[0].lon);

			const deltaLat = RADIUS_KM / 111;
			const deltaLon = RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180));

			cityName = data[0].display_name.split(",")[0].trim();
			query = cityName;

			bounds = {
				north: lat + deltaLat,
				south: lat - deltaLat,
				east: lon + deltaLon,
				west: lon - deltaLon,
				cityName,
			};
		} catch {
			error = "Kunde inte söka. Kontrollera internetanslutningen.";
		} finally {
			searching = false;
		}
	}

	function clear() {
		bounds = null;
		cityName = "";
		query = "";
		error = "";
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			search();
		}
	}
</script>

<div class="space-y-3">
	<div class="flex gap-2">
		<div class="relative flex-1">
			<input
				type="text"
				placeholder="T.ex. Stockholm, Göteborg, Malmö..."
				bind:value={query}
				onkeydown={handleKeydown}
				class="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
			/>
			{#if bounds}
				<button
					type="button"
					onclick={clear}
					class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
				>
					<XMarkIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<button
			type="button"
			onclick={search}
			disabled={searching || !query.trim()}
			class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
		>
			<MagnifyingGlassIcon class="h-4 w-4" />
			{searching ? "Söker..." : "Sök"}
		</button>
	</div>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}

	{#if bounds}
		<div class="rounded-md bg-green-50 border border-green-200 px-4 py-3">
			<p class="text-sm font-medium text-green-800">
				Område valt: <span class="font-semibold">{cityName}</span>
			</p>
			<p class="text-xs text-green-600 mt-0.5">
				Söker inom 1 mil (10 km) från stadskärnan
			</p>
		</div>
	{:else}
		<p class="text-xs text-gray-400">Skriv en stad och tryck Sök – söker automatiskt 1 mil ut från centrum.</p>
	{/if}
</div>
