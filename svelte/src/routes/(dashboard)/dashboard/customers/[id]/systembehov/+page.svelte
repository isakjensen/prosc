<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import {
		PaintBrushIcon,
		Squares2x2Icon,
		ClockIcon,
		ChevronDownIcon,
		ChevronRightIcon,
		PlusIcon,
		CheckIcon,
		TrashIcon,
		PencilSquareIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	type Tab = "design" | "features" | "changelog";
	let activeTab = $state<Tab>("design");
	let expandedFeatureId = $state<string | null>(null);
	let designForm = $state({
		designNotes: "",
		colorTheme: "",
		typography: "",
		logoPaths: "",
	});
	let newFeatureName = $state("");
	let newFeatureDescription = $state("");
	let newSubtaskTitle = $state("");
	let newUpdateTitle = $state("");
	let newUpdateDescription = $state("");
	let newUpdateCommitLinks = $state("");
	let newUpdateImagePaths = $state("");
	let newUpdateFeatureId = $state("");
	let error = $state("");
	let success = $state("");

	const req = $derived(data.company.systemRequirement);

	$effect(() => {
		const r = data.company.systemRequirement;
		if (!r) return;
		designForm.designNotes = r.designNotes ?? "";
		designForm.colorTheme = r.colorTheme ?? "";
		designForm.typography = r.typography ?? "";
		designForm.logoPaths = r.logoPaths ?? "";
	});

	const featureStatusLabels: Record<string, string> = {
		PLANNING: "Planering",
		IN_PROGRESS: "Pågår",
		REVIEW: "Granskning",
		DONE: "Klar",
		CANCELLED: "Avbruten",
	};
	const featurePriorityLabels: Record<string, string> = {
		LOW: "Låg",
		MEDIUM: "Medium",
		HIGH: "Hög",
		URGENT: "Brådskande",
	};

	function parseJsonArray(str: string | null): string[] {
		if (!str?.trim()) return [];
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [str];
		} catch {
			return str.split(",").map((s) => s.trim()).filter(Boolean);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Systembehov – {data.company.name}</h1>
			<p class="mt-1 text-gray-500">Dokumentation av funktioner, design och uppdateringar</p>
		</div>
		<a href="/dashboard/customers/{data.company.id}">
			<Button variant="outline">Tillbaka till kund</Button>
		</a>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex gap-4" aria-label="Flikar">
			<button
				type="button"
				class="border-b-2 px-1 py-3 text-sm font-medium transition-colors {activeTab === 'design'
					? 'border-blue-600 text-blue-600'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				onclick={() => (activeTab = "design")}
			>
				<PaintBrushIcon class="mr-1.5 inline-block h-5 w-5" />
				Design & preferenser
			</button>
				<button
					type="button"
					class="border-b-2 px-1 py-3 text-sm font-medium transition-colors {activeTab === 'features'
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					onclick={() => (activeTab = "features")}
				>
					<Squares2x2Icon class="mr-1.5 inline-block h-5 w-5" />
				Funktioner
			</button>
			<button
				type="button"
				class="border-b-2 px-1 py-3 text-sm font-medium transition-colors {activeTab === 'changelog'
					? 'border-blue-600 text-blue-600'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				onclick={() => (activeTab = "changelog")}
			>
				<ClockIcon class="mr-1.5 inline-block h-5 w-5" />
				Changelog / Uppdateringar
			</button>
		</nav>
	</div>

	{#if error}
		<p class="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
	{/if}
	{#if success}
		<p class="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</p>
	{/if}

	{#if !req}
		<Card class="p-6">
			<p class="text-gray-500">Systembehov kunde inte laddas.</p>
		</Card>
	{:else}
	<!-- Design -->
	{#if activeTab === "design"}
		<Card class="p-6">
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Designpreferenser</h2>
			<p class="mb-4 text-sm text-gray-500">
				Färgteman, typografi, logotyper och övriga anteckningar för AI/utveckling.
			</p>
			<form
				method="POST"
				action="?/updateDesign"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success" && result.data?.success) {
							error = "";
							success = "Design sparad.";
							await invalidateAll();
						} else if (result.type === "success" && result.data?.error) {
							success = "";
							error = String((result.data as { error?: string }).error ?? "");
						}
					};
				}}
				class="space-y-4"
			>
				<div>
					<Label for="designNotes">Allmänna designanteckningar (note till AI)</Label>
					<textarea
						id="designNotes"
						name="designNotes"
						bind:value={designForm.designNotes}
						rows="4"
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
						placeholder="T.ex. minimalistisk, mörkt tema, företagets profil..."
					></textarea>
				</div>
				<div>
					<Label for="colorTheme">Färgtema (JSON eller text)</Label>
					<textarea
						id="colorTheme"
						name="colorTheme"
						bind:value={designForm.colorTheme}
						rows="2"
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
						placeholder="T.ex. JSON: primary, secondary (hex eller namn)"
					></textarea>
				</div>
				<div>
					<Label for="typography">Typografi</Label>
					<Input
						id="typography"
						name="typography"
						bind:value={designForm.typography}
						placeholder="T.ex. Inter för rubriker, Source Sans för brödtext"
					/>
				</div>
				<div>
					<Label for="logoPaths">Logotyper (sökvägar eller URL:er, en per rad eller JSON-array)</Label>
					<textarea
						id="logoPaths"
						name="logoPaths"
						bind:value={designForm.logoPaths}
						rows="2"
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
						placeholder="/uploads/logo.png eller JSON-array"
					></textarea>
				</div>
				<Button type="submit">Spara designpreferenser</Button>
			</form>
		</Card>
	{/if}

	<!-- Features -->
	{#if activeTab === "features"}
		<div class="space-y-6">
			<Card class="p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Lägg till funktion</h2>
				<form
					method="POST"
					action="?/createFeature"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === "success" && result.data?.success) {
								error = "";
								success = "Funktion skapad.";
								newFeatureName = "";
								newFeatureDescription = "";
								await invalidateAll();
							} else if (result.type === "success" && result.data?.error) {
								success = "";
								error = String((result.data as { error?: string }).error ?? "");
							}
						};
					}}
					class="space-y-4"
				>
					<div>
						<Label for="newFeatureName">Namn</Label>
						<Input
							id="newFeatureName"
							name="name"
							bind:value={newFeatureName}
							required
							placeholder="T.ex. Inloggning med e-post"
						/>
					</div>
					<div>
						<Label for="newFeatureDescription">Beskrivning (AI-prompt / note)</Label>
						<textarea
							id="newFeatureDescription"
							name="description"
							bind:value={newFeatureDescription}
							rows="3"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
							placeholder="Detaljerad beskrivning för utveckling/AI..."
						></textarea>
					</div>
					<div class="flex gap-4">
						<div>
							<Label for="newFeatureStatus">Status</Label>
							<select
								id="newFeatureStatus"
								name="status"
								class="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
							>
								<option value="PLANNING">Planering</option>
								<option value="IN_PROGRESS">Pågår</option>
								<option value="REVIEW">Granskning</option>
								<option value="DONE">Klar</option>
								<option value="CANCELLED">Avbruten</option>
							</select>
						</div>
						<div>
							<Label for="newFeaturePriority">Prioritet</Label>
							<select
								id="newFeaturePriority"
								name="priority"
								class="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
							>
								<option value="LOW">Låg</option>
								<option value="MEDIUM">Medium</option>
								<option value="HIGH">Hög</option>
								<option value="URGENT">Brådskande</option>
							</select>
						</div>
					</div>
					<Button type="submit">
						<PlusIcon class="mr-2 h-5 w-5" />
						Skapa funktion
					</Button>
				</form>
			</Card>

			<Card class="p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Funktioner</h2>
				{#if req.features.length === 0}
					<p class="text-gray-500">Inga funktioner än. Lägg till en ovan.</p>
				{:else}
					<ul class="space-y-2">
						{#each req.features as feature}
							<li class="rounded-lg border border-gray-200 bg-gray-50/50">
								<div class="flex items-center justify-between px-4 py-3">
									<button
										type="button"
										class="flex flex-1 items-center gap-2 text-left"
										onclick={() => (expandedFeatureId = expandedFeatureId === feature.id ? null : feature.id)}
									>
										{#if expandedFeatureId === feature.id}
											<ChevronDownIcon class="h-5 w-5 text-gray-500" />
										{:else}
											<ChevronRightIcon class="h-5 w-5 text-gray-500" />
										{/if}
										<span class="font-medium text-gray-900">{feature.name}</span>
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium {feature.status === 'DONE'
												? 'bg-green-100 text-green-800'
												: feature.status === 'IN_PROGRESS'
													? 'bg-blue-100 text-blue-800'
													: feature.status === 'CANCELLED'
														? 'bg-gray-100 text-gray-600'
														: 'bg-amber-100 text-amber-800'}"
										>
											{featureStatusLabels[feature.status] ?? feature.status}
										</span>
										<span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs">
											{featurePriorityLabels[feature.priority] ?? feature.priority}
										</span>
										<span class="text-xs text-gray-400">
											{feature.subtasks.filter((s: { completed: boolean }) => s.completed).length}/{feature.subtasks.length} uppgifter
										</span>
									</button>
									<form
										method="POST"
										action="?/deleteFeature"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update();
												if (result.type === "success" && result.data?.success) {
													expandedFeatureId = null;
													await invalidateAll();
												}
											};
										}}
										class="inline"
									>
										<input type="hidden" name="featureId" value={feature.id} />
										<Button type="submit" variant="ghost" size="sm" class="text-red-600 hover:text-red-700">
											<TrashIcon class="h-5 w-5" />
										</Button>
									</form>
								</div>
								{#if expandedFeatureId === feature.id}
									<div class="border-t border-gray-200 px-4 py-4">
										<!-- Edit feature form -->
										<form
											method="POST"
											action="?/updateFeature"
											use:enhance={() => {
												return async ({ result, update }) => {
													await update();
													if (result.type === "success" && result.data?.success) {
														await invalidateAll();
													} else if (result.type === "success" && result.data?.error) {
														error = String((result.data as { error?: string }).error ?? "");
													}
												};
											}}
											class="mb-4 space-y-3 rounded-lg bg-white p-3 ring-1 ring-gray-200"
										>
											<input type="hidden" name="featureId" value={feature.id} />
											<div>
												<Label for="edit-name-{feature.id}">Namn</Label>
												<Input
													id="edit-name-{feature.id}"
													name="name"
													value={feature.name}
													class="mt-1 w-full"
												/>
											</div>
											<div>
												<Label for="edit-desc-{feature.id}">Beskrivning (AI-prompt)</Label>
												<textarea
													id="edit-desc-{feature.id}"
													name="description"
													rows="3"
													class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
												>{feature.description ?? ""}</textarea>
											</div>
											<div class="flex gap-4">
												<div>
													<Label for="edit-status-{feature.id}">Status</Label>
													<select
														id="edit-status-{feature.id}"
														name="status"
														class="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
													>
														{#each Object.entries(featureStatusLabels) as [value, label]}
															<option value={value} selected={feature.status === value}>{label}</option>
														{/each}
													</select>
												</div>
												<div>
													<Label for="edit-priority-{feature.id}">Prioritet</Label>
													<select
														id="edit-priority-{feature.id}"
														name="priority"
														class="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
													>
														{#each Object.entries(featurePriorityLabels) as [value, label]}
															<option value={value} selected={feature.priority === value}>{label}</option>
														{/each}
													</select>
												</div>
											</div>
											<Button type="submit" size="sm">
												<PencilSquareIcon class="mr-1 h-4 w-4" />
												Spara ändringar
											</Button>
										</form>
										<!-- Subtasks -->
										<div class="mb-3">
											<p class="mb-2 text-sm font-medium text-gray-700">Deluppgifter</p>
											<ul class="space-y-1">
												{#each feature.subtasks as subtask}
													<li class="flex items-center gap-2">
														<form
															method="POST"
															action="?/toggleSubtask"
															use:enhance={() => invalidateAll()}
															class="inline"
														>
															<input type="hidden" name="subtaskId" value={subtask.id} />
															<button
																type="submit"
																class="flex items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-gray-100 {subtask.completed
																	? 'text-gray-500 line-through'
																	: 'text-gray-900'}"
															>
																<span
																	class="inline-flex h-4 w-4 items-center justify-center rounded border {subtask.completed
																		? 'bg-green-500 text-white'
																		: 'border-gray-300'}"
																>
																	{#if subtask.completed}
																		<CheckIcon class="h-3 w-3" />
																	{/if}
																</span>
																{subtask.title}
															</button>
														</form>
														<form
															method="POST"
															action="?/deleteSubtask"
															use:enhance={() => invalidateAll()}
															class="ml-auto"
														>
															<input type="hidden" name="subtaskId" value={subtask.id} />
															<Button type="submit" variant="ghost" size="sm" class="text-gray-400">
																<TrashIcon class="h-4 w-4" />
															</Button>
														</form>
													</li>
												{/each}
											</ul>
											<form
												method="POST"
												action="?/createSubtask"
												use:enhance={() => {
													return async ({ result, update }) => {
														await update();
														if (result.type === "success" && result.data?.success) {
															newSubtaskTitle = "";
															await invalidateAll();
														}
													};
												}}
												class="mt-2 flex gap-2"
											>
												<input type="hidden" name="featureId" value={feature.id} />
												<Input
													name="title"
													bind:value={newSubtaskTitle}
													placeholder="Ny deluppgift"
													class="flex-1"
												/>
												<Button type="submit" size="sm">
													<PlusIcon class="h-4 w-4" />
												</Button>
											</form>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>
	{/if}

	<!-- Changelog -->
	{#if activeTab === "changelog"}
		<div class="space-y-6">
			<Card class="p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Lägg till uppdatering</h2>
				<form
					method="POST"
					action="?/createUpdate"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === "success" && result.data?.success) {
								error = "";
								success = "Uppdatering sparad.";
								newUpdateTitle = "";
								newUpdateDescription = "";
								newUpdateCommitLinks = "";
								newUpdateImagePaths = "";
								newUpdateFeatureId = "";
								await invalidateAll();
							} else if (result.type === "success" && result.data?.error) {
								success = "";
								error = String((result.data as { error?: string }).error ?? "");
							}
						};
					}}
					class="space-y-4"
				>
					<div>
						<Label for="updateTitle">Titel</Label>
						<Input
							id="updateTitle"
							name="title"
							bind:value={newUpdateTitle}
							required
							placeholder="T.ex. Inloggning klar"
						/>
					</div>
					<div>
						<Label for="updateDescription">Beskrivning (vad som gjorts)</Label>
						<textarea
							id="updateDescription"
							name="description"
							bind:value={newUpdateDescription}
							rows="3"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
							placeholder="Kort beskrivning av ändringarna..."
						></textarea>
					</div>
					<div>
						<Label for="updateFeatureId">Koppla till funktion (valfritt)</Label>
						<select
							id="updateFeatureId"
							name="featureId"
							bind:value={newUpdateFeatureId}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						>
							<option value="">— Ingen —</option>
							{#each req.features as f}
								<option value={f.id}>{f.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<Label for="updateCommitLinks">Commit-länkar (en per rad eller JSON-array)</Label>
						<textarea
							id="updateCommitLinks"
							name="commitLinks"
							bind:value={newUpdateCommitLinks}
							rows="2"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
							placeholder="https://github.com/org/repo/commit/abc123"
						></textarea>
					</div>
					<div>
						<Label for="updateImagePaths">Bildlänkar/sökvägar (en per rad eller JSON-array)</Label>
						<textarea
							id="updateImagePaths"
							name="imagePaths"
							bind:value={newUpdateImagePaths}
							rows="2"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
							placeholder="/uploads/screenshot.png"
						></textarea>
					</div>
					<Button type="submit">
						<PlusIcon class="mr-2 h-5 w-5" />
						Lägg till uppdatering
					</Button>
				</form>
			</Card>

			<Card class="p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Tidslinje</h2>
				{#if req.updates.length === 0}
					<p class="text-gray-500">Inga uppdateringar än.</p>
				{:else}
					<div class="space-y-4">
						{#each req.updates as update}
							<div class="border-l-2 border-blue-200 pl-4">
								<div class="flex items-baseline justify-between gap-2">
									<h3 class="font-medium text-gray-900">{update.title}</h3>
									<span class="text-xs text-gray-500">
										{format(new Date(update.createdAt), "d MMM yyyy HH:mm", { locale: sv })}
									</span>
								</div>
								{#if update.description}
									<p class="mt-1 whitespace-pre-wrap text-sm text-gray-600">{update.description}</p>
								{/if}
								{#if update.commitLinks}
									<div class="mt-2">
										<p class="text-xs font-medium text-gray-500">Commits</p>
										<ul class="mt-0.5 space-y-0.5">
											{#each parseJsonArray(update.commitLinks) as link}
												<li>
													<a
														href={link}
														target="_blank"
														rel="noopener noreferrer"
														class="text-sm text-blue-600 hover:underline"
													>
														{link}
													</a>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if update.imagePaths}
									<div class="mt-2">
										<p class="text-xs font-medium text-gray-500">Bilder</p>
										<div class="mt-1 flex flex-wrap gap-2">
											{#each parseJsonArray(update.imagePaths) as path}
												<a href={path} target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 hover:underline">
													{path}
												</a>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		</div>
	{/if}
	{/if}
</div>
