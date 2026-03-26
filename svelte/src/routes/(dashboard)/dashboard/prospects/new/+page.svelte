<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { stageNameSv } from "$lib/i18n/prospectStages";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();
	
	let loading = $state(false);
	let error = $state("");
	
	let formData = $state({
		name: "",
		email: "",
		phone: "",
		industry: "",
		website: "",
		stageId: "",
	});
	$effect(() => {
		formData.stageId = data.stages[0]?.id ?? "";
	});
</script>

<div class="max-w-2xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Lägg till nytt prospekt</h1>
		<p class="mt-2 text-gray-600">Skapa ett nytt prospekt i din pipeline</p>
	</div>
	
	<Card class="p-6">
		{#if error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}
		
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === "redirect") {
						goto(result.location);
					} else if (result.type === "failure") {
						error = result.data?.error || "Kunde inte skapa prospekt";
					}
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<Label for="name">Företagsnamn *</Label>
					<Input
						id="name"
						name="name"
						bind:value={formData.name}
						required
						placeholder="Acme AB"
					/>
				</div>
				
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="email">E-post</Label>
						<Input
							id="email"
							name="email"
							type="email"
							bind:value={formData.email}
							placeholder="kontakt@acme.se"
						/>
					</div>
					
					<div>
						<Label for="phone">Telefon</Label>
						<Input
							id="phone"
							name="phone"
							bind:value={formData.phone}
							placeholder="+46 8 123 456 78"
						/>
					</div>
				</div>
				
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="industry">Bransch</Label>
						<Input
							id="industry"
							name="industry"
							bind:value={formData.industry}
							placeholder="Teknik"
						/>
					</div>
					
					<div>
						<Label for="website">Webbplats</Label>
						<Input
							id="website"
							name="website"
							bind:value={formData.website}
							placeholder="https://acme.se"
						/>
					</div>
				</div>
				
				<div>
					<Label for="stageId">Startsteg</Label>
					<select
						id="stageId"
						name="stageId"
						bind:value={formData.stageId}
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each data.stages as stage}
							<option value={stage.id}>{stageNameSv(stage.name)}</option>
						{/each}
					</select>
				</div>
				
				<div class="flex gap-4 pt-4">
					<Button type="submit" disabled={loading}>
						{loading ? "Skapar..." : "Skapa prospekt"}
					</Button>
					<a href="/dashboard/prospects">
						<Button variant="outline" type="button">Avbryt</Button>
					</a>
				</div>
			</div>
		</form>
	</Card>
</div>
