<script lang="ts">
	import { onMount } from "svelte";

	interface AreaBounds {
		north: number;
		south: number;
		east: number;
		west: number;
	}

	interface Props {
		bounds?: AreaBounds | null;
		onchange?: (bounds: AreaBounds | null) => void;
	}

	let { bounds = $bindable(null), onchange }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = null;
	let rectangle: any = null;
	let drawing = $state(false);
	let drawStart: { lat: number; lng: number } | null = null;

	// Sätt cursor direkt på DOM-elementet – ändrar ALDRIG klasser på kartan
	$effect(() => {
		if (!mapContainer) return;
		mapContainer.style.cursor = drawing ? "crosshair" : "";
		mapContainer.style.userSelect = drawing ? "none" : "";
		mapContainer.style.touchAction = drawing ? "none" : "";
	});

	onMount(() => {
		let L: any;

		async function init() {
			const mod = await import("leaflet");
			L = mod.default ?? mod;

			// Leaflet CSS – injiceras en gång i <head>
			if (!document.getElementById("leaflet-css")) {
				const link = document.createElement("link");
				link.id = "leaflet-css";
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
				document.head.appendChild(link);
				await new Promise<void>((resolve) => {
					link.onload = () => resolve();
					setTimeout(resolve, 800);
				});
			}

			// Vänta tills modalen/containern har sin slutliga storlek
			await new Promise<void>((resolve) => setTimeout(resolve, 100));

			map = L.map(mapContainer, {
				dragging: true,
				scrollWheelZoom: true,
			}).setView([62.0, 15.0], 5);

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			// Kritiskt: tvinga omritning efter att modalen fått sin slutliga storlek
			setTimeout(() => map?.invalidateSize(), 200);

			// Rita befintliga bounds om de finns
			if (bounds) {
				rectangle = L.rectangle(
					[[bounds.south, bounds.west], [bounds.north, bounds.east]],
					{ color: "#3B82F6", weight: 2, fillOpacity: 0.15 }
				).addTo(map);
				map.fitBounds(rectangle.getBounds(), { padding: [20, 20] });
			}

			// ── Ritevent ────────────────────────────────────────────────────

			map.on("mousedown", (e: any) => {
				if (!drawing) return;
				e.originalEvent.preventDefault();
				drawStart = { lat: e.latlng.lat, lng: e.latlng.lng };
				if (rectangle) { map.removeLayer(rectangle); rectangle = null; }
			});

			map.on("mousemove", (e: any) => {
				if (!drawing || !drawStart) return;
				if (rectangle) map.removeLayer(rectangle);
				rectangle = L.rectangle(
					[[drawStart.lat, drawStart.lng], [e.latlng.lat, e.latlng.lng]],
					{ color: "#3B82F6", weight: 2, fillOpacity: 0.15 }
				).addTo(map);
			});

			map.on("mouseup", (e: any) => {
				if (!drawing || !drawStart) return;
				finishDrawing(e.latlng.lat, e.latlng.lng);
			});
		}

		// Global mouseup – hanterar musen som lämnar kartan
		function onDocumentMouseUp(e: MouseEvent) {
			if (!drawing || !drawStart || !map) return;
			if (!mapContainer.contains(e.target as Node)) {
				drawing = false;
				drawStart = null;
				map.dragging.enable();
			}
		}

		document.addEventListener("mouseup", onDocumentMouseUp);
		init().catch(console.error);

		return () => {
			document.removeEventListener("mouseup", onDocumentMouseUp);
			map?.remove();
			map = null;
		};
	});

	function finishDrawing(lat: number, lng: number) {
		if (!drawStart) return;
		if (Math.abs(drawStart.lat - lat) < 0.005 && Math.abs(drawStart.lng - lng) < 0.005) {
			// Ignorera klick utan drag
			drawing = false;
			drawStart = null;
			map?.dragging.enable();
			return;
		}
		const newBounds: AreaBounds = {
			north: Math.max(drawStart.lat, lat),
			south: Math.min(drawStart.lat, lat),
			east: Math.max(drawStart.lng, lng),
			west: Math.min(drawStart.lng, lng),
		};
		bounds = newBounds;
		onchange?.(newBounds);
		drawing = false;
		drawStart = null;
		map?.dragging.enable();
	}

	function startDrawing() {
		drawing = true;
		drawStart = null;
		map?.dragging.disable();
	}

	function clearArea() {
		if (rectangle && map) { map.removeLayer(rectangle); rectangle = null; }
		bounds = null;
		onchange?.(null);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={startDrawing}
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors
			       {drawing ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			{drawing ? "Rita på kartan..." : "Markera område"}
		</button>

		{#if bounds}
			<button
				type="button"
				onclick={clearArea}
				class="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
			>
				Rensa
			</button>
			<span class="text-xs font-medium text-green-600">✓ Område valt</span>
		{:else if drawing}
			<span class="text-xs text-blue-500">Klicka och dra för att markera</span>
		{/if}
	</div>

	<!--
		Kartcontainern har FASTA klasser som aldrig ändras efter mount.
		Cursor/touch-action sätts direkt via $effect på DOM-elementet.
	-->
	<div
		bind:this={mapContainer}
		class="h-[350px] w-full rounded-lg border border-gray-300"
	></div>
</div>
