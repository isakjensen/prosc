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

	onMount(() => {
		let link: HTMLLinkElement;

		async function init() {
			const L = await import("leaflet");

			// Leaflet CSS
			link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
			document.head.appendChild(link);

			// Vänta på att CSS laddas
			await new Promise<void>((resolve) => {
				link.onload = () => resolve();
				setTimeout(resolve, 1000);
			});

			map = L.map(mapContainer).setView([62.0, 15.0], 5); // Sverige centrerad

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			// Om det finns befintliga bounds, rita dem
			if (bounds) {
				rectangle = L.rectangle(
					[
						[bounds.south, bounds.west],
						[bounds.north, bounds.east],
					],
					{ color: "#3B82F6", weight: 2, fillOpacity: 0.15 },
				).addTo(map);
				map.fitBounds(rectangle.getBounds(), { padding: [20, 20] });
			}

			// Mousedown startar ritning
			map.on("mousedown", (e: any) => {
				if (!drawing) return;
				drawStart = { lat: e.latlng.lat, lng: e.latlng.lng };
				if (rectangle) {
					map.removeLayer(rectangle);
					rectangle = null;
				}
			});

			// Mousemove ritar rektangel
			map.on("mousemove", (e: any) => {
				if (!drawing || !drawStart) return;
				if (rectangle) map.removeLayer(rectangle);
				rectangle = L.rectangle(
					[
						[drawStart.lat, drawStart.lng],
						[e.latlng.lat, e.latlng.lng],
					],
					{ color: "#3B82F6", weight: 2, fillOpacity: 0.15 },
				).addTo(map);
			});

			// Mouseup avslutar ritning
			map.on("mouseup", (e: any) => {
				if (!drawing || !drawStart) return;
				const newBounds: AreaBounds = {
					north: Math.max(drawStart.lat, e.latlng.lat),
					south: Math.min(drawStart.lat, e.latlng.lat),
					east: Math.max(drawStart.lng, e.latlng.lng),
					west: Math.min(drawStart.lng, e.latlng.lng),
				};
				bounds = newBounds;
				onchange?.(newBounds);
				drawing = false;
				drawStart = null;
				map.dragging.enable();
			});
		}

		init();

		return () => {
			if (map) map.remove();
			if (link) link.remove();
		};
	});

	function startDrawing() {
		drawing = true;
		if (map) map.dragging.disable();
	}

	function clearArea() {
		if (rectangle && map) {
			map.removeLayer(rectangle);
			rectangle = null;
		}
		bounds = null;
		onchange?.(null);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={startDrawing}
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {drawing
				? 'bg-blue-600 text-white'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
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
			<span class="text-xs text-gray-500">
				Område valt
			</span>
		{/if}
	</div>
	<div
		bind:this={mapContainer}
		class="h-[350px] w-full rounded-lg border border-gray-300 {drawing ? 'cursor-crosshair' : ''}"
	></div>
</div>
