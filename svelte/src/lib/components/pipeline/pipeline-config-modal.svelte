<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import Card from "$lib/components/ui/card.svelte";
	import { XMarkIcon, SparklesIcon, PlusIcon } from "heroicons-svelte/24/outline";
	import MapAreaSelector from "./map-area-selector.svelte";

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let name = $state("");
	let description = $state("");
	let areaBounds: { north: number; south: number; east: number; west: number } | null = $state(null);
	let categories = $state<string[]>([
		"Restauranger",
		"Frisörer",
		"Hantverkare",
		"Bilverkstäder",
		"Caféer",
	]);
	let newCategory = $state("");
	let loading = $state(false);
	let error = $state("");
	let generatingCategories = $state(false);

	function addCategory() {
		const trimmed = newCategory.trim();
		if (trimmed && !categories.includes(trimmed)) {
			categories = [...categories, trimmed];
			newCategory = "";
		}
	}

	function removeCategory(cat: string) {
		categories = categories.filter((c) => c !== cat);
	}

	async function generateCategories() {
		if (!description) return;
		generatingCategories = true;
		// Simulerar AI-generering (mockad)
		await new Promise((r) => setTimeout(r, 1500));
		const mockSuggestions = [
			"Tandläkare",
			"Redovisningsbyråer",
			"Byggfirmor",
			"Blomsterhandlare",
			"Städfirmor",
			"Tatueringsstudior",
			"Veterinärer",
			"Fastighetsmäklare",
		];
		// Välj 4-5 slumpmässiga
		const shuffled = mockSuggestions.sort(() => Math.random() - 0.5);
		categories = [...new Set([...categories, ...shuffled.slice(0, 4)])];
		generatingCategories = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<!-- Modal -->
	<div class="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-xl font-bold text-gray-900">Skapa ny pipeline</h2>
			<button
				type="button"
				onclick={onclose}
				class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
			>
				<XMarkIcon class="h-5 w-5" />
			</button>
		</div>

		<!-- Scrollbart innehåll -->
		<div class="flex-1 overflow-y-auto px-6 py-6">
			<form
				method="POST"
				action="/dashboard/pipelines?/create"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === "redirect") {
							onclose();
							goto(result.location);
						} else if (result.type === "failure") {
							error = (result.data as any)?.error || "Något gick fel";
						} else {
							await update();
						}
					};
				}}
				id="pipeline-form"
				class="space-y-8"
			>
				{#if error}
					<div class="rounded-md bg-red-50 p-4">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}

				<!-- Grundinfo -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">Grundinformation</h3>
					<div>
						<Label for="name">Pipelinenamn *</Label>
						<Input
							id="name"
							name="name"
							placeholder="T.ex. Restauranger Stockholm"
							bind:value={name}
							required
						/>
					</div>
					<div>
						<Label for="description">Kundbeskrivning *</Label>
						<p class="mb-1 text-xs text-gray-500">
							Beskriv vilken typ av kund du letar efter. AI:n använder detta för att kategorisera och filtrera resultat.
						</p>
						<textarea
							id="description"
							name="description"
							rows="4"
							bind:value={description}
							required
							placeholder="T.ex. Små till medelstora restauranger och caféer som saknar modern webbnärvaro. Gärna nyöppnade eller med dåliga Google-recensioner som kan behöva hjälp med marknadsföring..."
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
						></textarea>
					</div>
				</div>

				<!-- Kartval -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">Sökområde</h3>
					<p class="text-sm text-gray-500">
						Markera ett område på kartan där du vill söka efter företag. Klicka "Markera område" och rita en rektangel.
					</p>
					<MapAreaSelector bind:bounds={areaBounds} />
					<input type="hidden" name="areaConfig" value={areaBounds ? JSON.stringify(areaBounds) : ""} />
				</div>

				<!-- Kategorier -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Sökkategorier</h3>
							<p class="text-sm text-gray-500">
								Vilka typer av företag ska sökas efter. AI kan generera förslag baserat på din beskrivning.
							</p>
						</div>
						<button
							type="button"
							onclick={generateCategories}
							disabled={generatingCategories || !description}
							class="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<SparklesIcon class="h-4 w-4" />
							{generatingCategories ? "Genererar..." : "AI-förslag"}
						</button>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each categories as cat}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
							>
								{cat}
								<button
									type="button"
									onclick={() => removeCategory(cat)}
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
							bind:value={newCategory}
							class="max-w-xs"
						/>
						<Button variant="outline" type="button" onclick={addCategory}>
							<PlusIcon class="mr-1 h-4 w-4" />
							Lägg till
						</Button>
					</div>
					<input type="hidden" name="categories" value={JSON.stringify(categories)} />
				</div>
			</form>
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
			<Button variant="outline" onclick={onclose}>Avbryt</Button>
			<Button type="submit" form="pipeline-form" disabled={loading}>
				{loading ? "Skapar..." : "Skapa pipeline"}
			</Button>
		</div>
	</div>
</div>
