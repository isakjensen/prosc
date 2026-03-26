<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { stageNameSv } from "$lib/i18n/prospectStages";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PencilIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let formStageId = $state("");
	let formData = $state({
		name: "",
		email: "",
		phone: "",
		industry: "",
		website: "",
	});
	$effect(() => {
		formData.name = data.company.name;
		formData.email = data.company.email || "";
		formData.phone = data.company.phone || "";
		formData.industry = data.company.industry || "";
		formData.website = data.company.website || "";
		formStageId = data.company.prospectStage?.currentStageId ?? data.stages[0]?.id ?? "";
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.company.name}</h1>
			{#if data.company.prospectStage}
				<span
					class="mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
					style="background-color: {data.company.prospectStage.currentStage.color || '#3B82F6'}20; color: {data.company.prospectStage.currentStage.color || '#3B82F6'}"
				>
					{stageNameSv(data.company.prospectStage.currentStage.name)}
				</span>
			{/if}
		</div>
		<Button onclick={() => editing = !editing}>
			<PencilIcon class="mr-2 h-5 w-5" />
			{editing ? "Avbryt" : "Redigera"}
		</Button>
	</div>
	
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2 space-y-6">
			<Card class="p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Företagsinformation</h2>
				{#if editing}
					<form
						method="POST"
						action="?/update"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === "success" && result.data?.success) {
									editing = false;
									await invalidateAll();
								}
							};
						}}
					>
						<div class="space-y-4">
							<div>
								<Label for="name">Företagsnamn</Label>
								<Input id="name" name="name" bind:value={formData.name} required />
							</div>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<Label for="email">E-post</Label>
									<Input id="email" name="email" type="email" bind:value={formData.email} />
								</div>
								<div>
									<Label for="phone">Telefon</Label>
									<Input id="phone" name="phone" bind:value={formData.phone} />
								</div>
							</div>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<Label for="industry">Bransch</Label>
									<Input id="industry" name="industry" bind:value={formData.industry} />
								</div>
								<div>
									<Label for="website">Webbplats</Label>
									<Input id="website" name="website" bind:value={formData.website} />
								</div>
							</div>
							<div class="flex gap-4">
								<Button type="submit">Spara ändringar</Button>
								<Button variant="outline" type="button" onclick={() => editing = false}>Avbryt</Button>
							</div>
						</div>
					</form>
				{:else}
					<dl class="space-y-4">
						<div>
							<dt class="text-sm font-medium text-gray-500">E-post</dt>
							<dd class="mt-1 text-sm text-gray-900">{data.company.email || "—"}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Telefon</dt>
							<dd class="mt-1 text-sm text-gray-900">{data.company.phone || "—"}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Bransch</dt>
							<dd class="mt-1 text-sm text-gray-900">{data.company.industry || "—"}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Webbplats</dt>
							<dd class="mt-1 text-sm text-gray-900">
								{#if data.company.website}
									<a href={data.company.website} target="_blank" class="text-blue-600 hover:text-blue-700">
										{data.company.website}
									</a>
								{:else}
									—
								{/if}
							</dd>
						</div>
					</dl>
				{/if}
			</Card>
			
			<Card class="p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Senaste aktivitet</h2>
				<div class="space-y-4">
					{#if data.company.activities.length === 0}
						<p class="text-sm text-gray-500">Ingen aktivitet än</p>
					{:else}
						{#each data.company.activities as activity}
							<div class="border-l-2 border-gray-200 pl-4">
								<p class="text-sm font-medium text-gray-900">{activity.title}</p>
								{#if activity.description}
									<p class="text-sm text-gray-600">{activity.description}</p>
								{/if}
								<p class="mt-1 text-xs text-gray-500">
									{activity.user?.name || "System"} • {format(new Date(activity.createdAt), "d MMM yyyy HH:mm", { locale: sv })}
								</p>
							</div>
						{/each}
					{/if}
				</div>
			</Card>
		</div>
		
		<div class="space-y-6">
			<Card class="p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Byt steg</h2>
				<form
					method="POST"
					action="?/updateStage"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
				>
					<select
						name="stageId"
						bind:value={formStageId}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each data.stages as stage}
							<option value={stage.id}>{stageNameSv(stage.name)}</option>
						{/each}
					</select>
					<Button type="submit" class="mt-4 w-full">Uppdatera steg</Button>
				</form>
			</Card>
			
			<Card class="p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Snabbstatistik</h2>
				<dl class="space-y-3">
					<div>
						<dt class="text-sm text-gray-500">Kontakter</dt>
						<dd class="text-2xl font-bold text-gray-900">{data.company.contacts.length}</dd>
					</div>
					<div>
						<dt class="text-sm text-gray-500">Projekt</dt>
						<dd class="text-2xl font-bold text-gray-900">{data.company.projects.length}</dd>
					</div>
					<div>
						<dt class="text-sm text-gray-500">Offerter</dt>
						<dd class="text-2xl font-bold text-gray-900">{data.company.quotes.length}</dd>
					</div>
					<div>
						<dt class="text-sm text-gray-500">Avtal</dt>
						<dd class="text-2xl font-bold text-gray-900">{data.company.contracts.length}</dd>
					</div>
				</dl>
			</Card>
		</div>
	</div>
</div>
