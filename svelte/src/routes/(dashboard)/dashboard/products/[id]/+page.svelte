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
		PlusIcon,
		TrashIcon,
		CheckIcon,
		ChevronDownIcon,
		ChevronRightIcon,
		PencilSquareIcon,
	} from "heroicons-svelte/24/outline";
	import { dndzone } from "svelte-dnd-action";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	type Tab = "features" | "board" | "economy";
	let activeTab = $state<Tab>("features");

	// ── Feature state ────────────────────────────────────
	let expandedFeatureId = $state<string | null>(null);
	let newFeatureName = $state("");
	let newFeatureDescription = $state("");
	let newSubtaskTitle = $state("");
	let editingFeatureId = $state<string | null>(null);
	let editFeature = $state({ name: "", description: "", status: "", priority: "" });

	// ── Board state ──────────────────────────────────────
	let newCardTitle = $state("");
	let newCardColumnId = $state<string | null>(null);
	let newColumnName = $state("");

	// ── Finance state ────────────────────────────────────
	let showFinanceForm = $state(false);
	let financeType = $state<"INCOME" | "EXPENSE">("INCOME");
	let financeDescription = $state("");
	let financeAmount = $state("");
	let financeVatRate = $state("0.25");
	let financeInclVat = $state(false);
	let financeIsRecurring = $state(false);
	let financeCategory = $state("");
	let financeStartDate = $state(format(new Date(), "yyyy-MM-dd"));
	let financeEndDate = $state("");
	let financeFilter = $state<"ALL" | "INCOME" | "EXPENSE">("ALL");

	const featureStatusLabels: Record<string, string> = {
		PLANNING: "Planering",
		IN_PROGRESS: "Pågår",
		REVIEW: "Granskning",
		DONE: "Klar",
		CANCELLED: "Avbruten",
	};
	const featureStatusColors: Record<string, string> = {
		PLANNING: "bg-gray-100 text-gray-700",
		IN_PROGRESS: "bg-blue-100 text-blue-700",
		REVIEW: "bg-yellow-100 text-yellow-700",
		DONE: "bg-green-100 text-green-700",
		CANCELLED: "bg-red-100 text-red-700",
	};
	const priorityLabels: Record<string, string> = {
		LOW: "Låg",
		MEDIUM: "Medium",
		HIGH: "Hög",
		URGENT: "Brådskande",
	};
	const priorityColors: Record<string, string> = {
		LOW: "bg-gray-100 text-gray-600",
		MEDIUM: "bg-blue-100 text-blue-600",
		HIGH: "bg-orange-100 text-orange-600",
		URGENT: "bg-red-100 text-red-600",
	};

	// ── Finance computed ─────────────────────────────────
	const filteredEntries = $derived(
		financeFilter === "ALL"
			? data.product.financeEntries
			: data.product.financeEntries.filter((e) => e.type === financeFilter),
	);

	const kpis = $derived(() => {
		const entries = data.product.financeEntries;
		let monthlyIncome = 0;
		let monthlyExpense = 0;
		let oneTimeIncome = 0;
		let oneTimeExpense = 0;
		let totalVatIn = 0;
		let totalVatOut = 0;

		for (const e of entries) {
			const vat = e.amount * e.vatRate;
			if (e.type === "INCOME") {
				if (e.isRecurring) monthlyIncome += e.amount;
				else oneTimeIncome += e.amount;
				totalVatOut += vat;
			} else {
				if (e.isRecurring) monthlyExpense += e.amount;
				else oneTimeExpense += e.amount;
				totalVatIn += vat;
			}
		}

		const totalMonthlyIncome = monthlyIncome;
		const totalMonthlyExpense = monthlyExpense;
		const monthlyProfit = totalMonthlyIncome - totalMonthlyExpense;
		const margin = totalMonthlyIncome > 0 ? (monthlyProfit / totalMonthlyIncome) * 100 : 0;
		const annualIncome = monthlyIncome * 12 + oneTimeIncome;
		const annualExpense = monthlyExpense * 12 + oneTimeExpense;
		const annualProfit = annualIncome - annualExpense;

		return {
			totalMonthlyIncome,
			totalMonthlyExpense,
			monthlyProfit,
			margin,
			annualIncome,
			annualExpense,
			annualProfit,
			oneTimeIncome,
			oneTimeExpense,
			totalVatIn,
			totalVatOut,
			vatDiff: totalVatOut - totalVatIn,
		};
	});

	function formatCurrency(n: number): string {
		return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0 }).format(n);
	}

	function handleEnhance() {
		return async ({ result, update }: any) => {
			if (result.type === "success") {
				await invalidateAll();
			} else {
				await update();
			}
		};
	}

	// ── Board DnD ────────────────────────────────────────
	function handleDndConsider(columnId: string, e: CustomEvent) {
		const col = data.product.boardColumns.find((c) => c.id === columnId);
		if (col) col.cards = e.detail.items;
	}

	async function handleDndFinalize(columnId: string, e: CustomEvent) {
		const col = data.product.boardColumns.find((c) => c.id === columnId);
		if (col) col.cards = e.detail.items;

		for (const card of e.detail.items) {
			const fd = new FormData();
			fd.set("id", card.id);
			fd.set("columnId", columnId);
			fd.set("order", String(e.detail.items.indexOf(card)));
			await fetch("?/moveCard", { method: "POST", body: fd });
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">{data.product.name}</h1>
				<span class="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
					{data.product.company.name}
				</span>
			</div>
			{#if data.product.description}
				<p class="mt-1 text-gray-500">{data.product.description}</p>
			{/if}
		</div>
		<a href="/dashboard/products">
			<Button variant="outline">Tillbaka</Button>
		</a>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex gap-4">
			{#each [
				{ id: "features", label: "Funktioner" },
				{ id: "board", label: "Planering" },
				{ id: "economy", label: "Ekonomi" },
			] as tab}
				<button
					type="button"
					class="border-b-2 px-1 py-3 text-sm font-medium transition-colors {activeTab === tab.id
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					onclick={() => (activeTab = tab.id as Tab)}
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- ═══════════════════════════════════════════════════
	     TAB: Features
	     ═══════════════════════════════════════════════════ -->
	{#if activeTab === "features"}
		<div class="space-y-4">
			<!-- Add feature form -->
			<Card class="p-4">
				<form
					method="POST"
					action="?/createFeature"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === "success") {
								newFeatureName = "";
								newFeatureDescription = "";
								await invalidateAll();
							} else {
								await update();
							}
						};
					}}
					class="flex flex-col gap-3 sm:flex-row sm:items-end"
				>
					<div class="flex-1">
						<Label for="featureName">Ny funktion</Label>
						<Input id="featureName" name="name" bind:value={newFeatureName} placeholder="Funktionsnamn" required />
					</div>
					<div class="flex-1">
						<Label for="featureDesc">Beskrivning</Label>
						<Input id="featureDesc" name="description" bind:value={newFeatureDescription} placeholder="Valfri beskrivning" />
					</div>
					<Button type="submit" disabled={!newFeatureName.trim()}>
						<PlusIcon class="mr-1 h-4 w-4" />
						Lägg till
					</Button>
				</form>
			</Card>

			<!-- Feature list -->
			{#each data.product.features as feature}
				<Card class="overflow-hidden">
					<div
						class="flex cursor-pointer items-center gap-3 p-4"
						role="button"
						tabindex="0"
						onclick={() => (expandedFeatureId = expandedFeatureId === feature.id ? null : feature.id)}
						onkeydown={(e) => e.key === "Enter" && (expandedFeatureId = expandedFeatureId === feature.id ? null : feature.id)}
					>
						{#if expandedFeatureId === feature.id}
							<ChevronDownIcon class="h-5 w-5 text-gray-400" />
						{:else}
							<ChevronRightIcon class="h-5 w-5 text-gray-400" />
						{/if}
						<div class="flex-1">
							<span class="font-medium text-gray-900">{feature.name}</span>
							{#if feature.description}
								<span class="ml-2 text-sm text-gray-500">{feature.description}</span>
							{/if}
						</div>
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {featureStatusColors[feature.status]}">
							{featureStatusLabels[feature.status]}
						</span>
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {priorityColors[feature.priority]}">
							{priorityLabels[feature.priority]}
						</span>
						<span class="text-xs text-gray-400">
							{feature.subtasks.filter((s) => s.completed).length}/{feature.subtasks.length}
						</span>
					</div>

					{#if expandedFeatureId === feature.id}
						<div class="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
							<!-- Edit feature -->
							{#if editingFeatureId === feature.id}
								<form
									method="POST"
									action="?/updateFeature"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === "success") {
												editingFeatureId = null;
												await invalidateAll();
											} else {
												await update();
											}
										};
									}}
									class="grid grid-cols-2 gap-3"
								>
									<input type="hidden" name="id" value={feature.id} />
									<div>
										<Label>Namn</Label>
										<Input name="name" bind:value={editFeature.name} required />
									</div>
									<div>
										<Label>Beskrivning</Label>
										<Input name="description" bind:value={editFeature.description} />
									</div>
									<div>
										<Label>Status</Label>
										<select name="status" bind:value={editFeature.status} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
											{#each Object.entries(featureStatusLabels) as [val, label]}
												<option value={val}>{label}</option>
											{/each}
										</select>
									</div>
									<div>
										<Label>Prioritet</Label>
										<select name="priority" bind:value={editFeature.priority} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
											{#each Object.entries(priorityLabels) as [val, label]}
												<option value={val}>{label}</option>
											{/each}
										</select>
									</div>
									<div class="col-span-2 flex gap-2">
										<Button type="submit" size="sm">Spara</Button>
										<Button type="button" variant="outline" size="sm" onclick={() => (editingFeatureId = null)}>Avbryt</Button>
									</div>
								</form>
							{:else}
								<div class="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onclick={() => {
											editingFeatureId = feature.id;
											editFeature = {
												name: feature.name,
												description: feature.description || "",
												status: feature.status,
												priority: feature.priority,
											};
										}}
									>
										<PencilSquareIcon class="mr-1 h-4 w-4" />
										Redigera
									</Button>
									<form method="POST" action="?/deleteFeature" use:enhance={handleEnhance}>
										<input type="hidden" name="id" value={feature.id} />
										<Button type="submit" variant="destructive" size="sm">
											<TrashIcon class="mr-1 h-4 w-4" />
											Ta bort
										</Button>
									</form>
								</div>
							{/if}

							<!-- Subtasks -->
							<div class="space-y-1">
								{#each feature.subtasks as subtask}
									<div class="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100">
										<form method="POST" action="?/toggleSubtask" use:enhance={handleEnhance}>
											<input type="hidden" name="id" value={subtask.id} />
											<button type="submit" class="flex h-5 w-5 items-center justify-center rounded border {subtask.completed ? 'border-green-500 bg-green-500' : 'border-gray-300'}">
												{#if subtask.completed}
													<CheckIcon class="h-3 w-3 text-white" />
												{/if}
											</button>
										</form>
										<span class="flex-1 text-sm {subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}">
											{subtask.title}
										</span>
										<form method="POST" action="?/deleteSubtask" use:enhance={handleEnhance}>
											<input type="hidden" name="id" value={subtask.id} />
											<button type="submit" class="text-gray-300 hover:text-red-500">
												<TrashIcon class="h-4 w-4" />
											</button>
										</form>
									</div>
								{/each}
							</div>

							<!-- Add subtask -->
							<form
								method="POST"
								action="?/createSubtask"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === "success") {
											newSubtaskTitle = "";
											await invalidateAll();
										} else {
											await update();
										}
									};
								}}
								class="flex items-center gap-2"
							>
								<input type="hidden" name="featureId" value={feature.id} />
								<Input name="title" bind:value={newSubtaskTitle} placeholder="Ny deluppgift..." class="flex-1 text-sm" />
								<Button type="submit" size="sm" disabled={!newSubtaskTitle.trim()}>
									<PlusIcon class="h-4 w-4" />
								</Button>
							</form>
						</div>
					{/if}
				</Card>
			{/each}

			{#if data.product.features.length === 0}
				<p class="text-center text-gray-500 py-8">Inga funktioner ännu. Lägg till din första ovan.</p>
			{/if}
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════
	     TAB: Board (Trello-like)
	     ═══════════════════════════════════════════════════ -->
	{#if activeTab === "board"}
		<div class="space-y-4">
			<!-- Add column -->
			<form
				method="POST"
				action="?/createColumn"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === "success") {
							newColumnName = "";
							await invalidateAll();
						} else {
							await update();
						}
					};
				}}
				class="flex items-center gap-2"
			>
				<Input name="name" bind:value={newColumnName} placeholder="Ny kolumn..." class="max-w-xs" />
				<Button type="submit" variant="outline" size="sm" disabled={!newColumnName.trim()}>
					<PlusIcon class="mr-1 h-4 w-4" />
					Kolumn
				</Button>
			</form>

			<!-- Board columns -->
			<div class="flex gap-4 overflow-x-auto pb-4">
				{#each data.product.boardColumns as column (column.id)}
					<div class="w-72 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50">
						<!-- Column header -->
						<div class="flex items-center justify-between border-b border-gray-200 px-3 py-2" style="background-color: {column.color || '#F3F4F6'}">
							<h3 class="font-semibold text-gray-800 text-sm">{column.name}</h3>
							<div class="flex items-center gap-1">
								<span class="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600">
									{column.cards.length}
								</span>
								<form method="POST" action="?/deleteColumn" use:enhance={handleEnhance}>
									<input type="hidden" name="id" value={column.id} />
									<button type="submit" class="text-gray-400 hover:text-red-500 p-0.5">
										<TrashIcon class="h-3.5 w-3.5" />
									</button>
								</form>
							</div>
						</div>

						<!-- Cards area with DnD -->
						<div
							class="min-h-[100px] space-y-2 p-2"
							use:dndzone={{ items: column.cards, flipDurationMs: 200 }}
							onconsider={(e) => handleDndConsider(column.id, e)}
							onfinalize={(e) => handleDndFinalize(column.id, e)}
						>
							{#each column.cards as card (card.id)}
								<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing">
									<div class="flex items-start justify-between gap-2">
										<span class="text-sm font-medium text-gray-900">{card.title}</span>
										<form method="POST" action="?/deleteCard" use:enhance={handleEnhance}>
											<input type="hidden" name="id" value={card.id} />
											<button type="submit" class="text-gray-300 hover:text-red-500 flex-shrink-0">
												<TrashIcon class="h-3.5 w-3.5" />
											</button>
										</form>
									</div>
									{#if card.description}
										<p class="mt-1 text-xs text-gray-500 line-clamp-2">{card.description}</p>
									{/if}
									<div class="mt-2 flex items-center gap-2">
										<span class="rounded px-1.5 py-0.5 text-xs font-medium {priorityColors[card.priority]}">
											{priorityLabels[card.priority]}
										</span>
										{#if card.dueDate}
											<span class="text-xs text-gray-400">
												{format(new Date(card.dueDate), "d MMM", { locale: sv })}
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>

						<!-- Add card -->
						{#if newCardColumnId === column.id}
							<div class="border-t border-gray-200 p-2">
								<form
									method="POST"
									action="?/createCard"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === "success") {
												newCardTitle = "";
												newCardColumnId = null;
												await invalidateAll();
											} else {
												await update();
											}
										};
									}}
									class="space-y-2"
								>
									<input type="hidden" name="columnId" value={column.id} />
									<Input name="title" bind:value={newCardTitle} placeholder="Korttitel..." />
									<div class="flex gap-2">
										<Button type="submit" size="sm" disabled={!newCardTitle.trim()}>Lägg till</Button>
										<Button type="button" variant="outline" size="sm" onclick={() => (newCardColumnId = null)}>Avbryt</Button>
									</div>
								</form>
							</div>
						{:else}
							<button
								type="button"
								class="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
								onclick={() => { newCardColumnId = column.id; newCardTitle = ""; }}
							>
								<PlusIcon class="mr-1 inline h-4 w-4" />
								Lägg till kort
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════
	     TAB: Economy
	     ═══════════════════════════════════════════════════ -->
	{#if activeTab === "economy"}
		{@const k = kpis()}
		<div class="space-y-6">
			<!-- KPI Cards -->
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Intäkt / mån</p>
					<p class="mt-1 text-2xl font-bold text-green-600">{formatCurrency(k.totalMonthlyIncome)}</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Kostnad / mån</p>
					<p class="mt-1 text-2xl font-bold text-red-600">{formatCurrency(k.totalMonthlyExpense)}</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Resultat / mån</p>
					<p class="mt-1 text-2xl font-bold {k.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
						{formatCurrency(k.monthlyProfit)}
					</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Marginal</p>
					<p class="mt-1 text-2xl font-bold {k.margin >= 0 ? 'text-green-600' : 'text-red-600'}">
						{k.margin.toFixed(1)}%
					</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Årlig intäkt</p>
					<p class="mt-1 text-xl font-bold text-gray-900">{formatCurrency(k.annualIncome)}</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Årlig kostnad</p>
					<p class="mt-1 text-xl font-bold text-gray-900">{formatCurrency(k.annualExpense)}</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Årligt resultat</p>
					<p class="mt-1 text-xl font-bold {k.annualProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
						{formatCurrency(k.annualProfit)}
					</p>
				</Card>
				<Card class="p-4">
					<p class="text-xs font-medium text-gray-500 uppercase">Moms (ut - in)</p>
					<p class="mt-1 text-xl font-bold text-gray-900">{formatCurrency(k.vatDiff)}</p>
					<p class="text-xs text-gray-400">Ut: {formatCurrency(k.totalVatOut)} | In: {formatCurrency(k.totalVatIn)}</p>
				</Card>
			</div>

			<!-- One-time summary -->
			{#if k.oneTimeIncome > 0 || k.oneTimeExpense > 0}
				<Card class="p-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Engångsposter</h3>
					<div class="flex gap-6 text-sm">
						<span>Intäkter: <strong class="text-green-600">{formatCurrency(k.oneTimeIncome)}</strong></span>
						<span>Kostnader: <strong class="text-red-600">{formatCurrency(k.oneTimeExpense)}</strong></span>
						<span>Netto: <strong>{formatCurrency(k.oneTimeIncome - k.oneTimeExpense)}</strong></span>
					</div>
				</Card>
			{/if}

			<!-- Add entry button / form -->
			{#if !showFinanceForm}
				<Button onclick={() => (showFinanceForm = true)}>
					<PlusIcon class="mr-2 h-5 w-5" />
					Ny post
				</Button>
			{:else}
				<Card class="p-5">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Ny ekonomipost</h3>
					<form
						method="POST"
						action="?/createFinanceEntry"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === "success") {
									showFinanceForm = false;
									financeDescription = "";
									financeAmount = "";
									financeCategory = "";
									financeIsRecurring = false;
									financeInclVat = false;
									financeStartDate = format(new Date(), "yyyy-MM-dd");
									financeEndDate = "";
									await invalidateAll();
								} else {
									await update();
								}
							};
						}}
						class="space-y-4"
					>
						<!-- Type -->
						<div class="flex gap-4">
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="INCOME" bind:group={financeType} class="text-green-600" />
								<span class="text-sm font-medium text-green-700">Intäkt</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="EXPENSE" bind:group={financeType} class="text-red-600" />
								<span class="text-sm font-medium text-red-700">Kostnad</span>
							</label>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<Label for="finDesc">Beskrivning *</Label>
								<Input id="finDesc" name="description" bind:value={financeDescription} placeholder="T.ex. Hosting, Licens..." required />
							</div>
							<div>
								<Label for="finCat">Kategori</Label>
								<Input id="finCat" name="category" bind:value={financeCategory} placeholder="T.ex. Drift, Personal..." />
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div>
								<Label for="finAmount">Belopp ({financeInclVat ? "inkl moms" : "exkl moms"}) *</Label>
								<Input id="finAmount" name="amount" type="number" step="0.01" min="0" bind:value={financeAmount} placeholder="0" required />
							</div>
							<div>
								<Label for="finVat">Momssats</Label>
								<select id="finVat" name="vatRate" bind:value={financeVatRate} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
									<option value="0">0% (momsfritt)</option>
									<option value="0.06">6%</option>
									<option value="0.12">12%</option>
									<option value="0.25">25%</option>
								</select>
							</div>
							<div class="flex items-end">
								<label class="flex items-center gap-2 pb-2 cursor-pointer">
									<input type="checkbox" bind:checked={financeInclVat} class="rounded" />
									<input type="hidden" name="inclVat" value={financeInclVat ? "true" : "false"} />
									<span class="text-sm">Belopp inkl moms</span>
								</label>
							</div>
						</div>

						<!-- Preview -->
						{#if financeAmount}
							{@const raw = parseFloat(financeAmount) || 0}
							{@const vr = parseFloat(financeVatRate)}
							{@const exkl = financeInclVat ? raw / (1 + vr) : raw}
							{@const inkl = financeInclVat ? raw : raw * (1 + vr)}
							<div class="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
								Exkl moms: <strong>{formatCurrency(exkl)}</strong> &middot;
								Moms: <strong>{formatCurrency(inkl - exkl)}</strong> &middot;
								Inkl moms: <strong>{formatCurrency(inkl)}</strong>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div class="flex items-end">
								<label class="flex items-center gap-2 pb-2 cursor-pointer">
									<input type="checkbox" bind:checked={financeIsRecurring} class="rounded" />
									<input type="hidden" name="isRecurring" value={financeIsRecurring ? "true" : "false"} />
									<span class="text-sm">Återkommande (månad)</span>
								</label>
							</div>
							<div>
								<Label for="finStart">Startdatum</Label>
								<Input id="finStart" name="startDate" type="date" bind:value={financeStartDate} />
							</div>
							{#if financeIsRecurring}
								<div>
									<Label for="finEnd">Slutdatum</Label>
									<Input id="finEnd" name="endDate" type="date" bind:value={financeEndDate} />
								</div>
							{/if}
						</div>

						<div class="flex gap-3 pt-2">
							<Button type="submit" disabled={!financeDescription.trim() || !financeAmount}>
								Spara post
							</Button>
							<Button type="button" variant="outline" onclick={() => (showFinanceForm = false)}>
								Avbryt
							</Button>
						</div>
					</form>
				</Card>
			{/if}

			<!-- Filter -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-600">Visa:</span>
				{#each [
					{ id: "ALL", label: "Alla" },
					{ id: "INCOME", label: "Intäkter" },
					{ id: "EXPENSE", label: "Kostnader" },
				] as f}
					<button
						type="button"
						class="rounded border px-3 py-1.5 text-sm transition-colors {financeFilter === f.id
							? 'border-blue-500 bg-blue-50 text-blue-700'
							: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
						onclick={() => (financeFilter = f.id as any)}
					>
						{f.label}
					</button>
				{/each}
			</div>

			<!-- Entries table -->
			{#if filteredEntries.length > 0}
				<div class="overflow-x-auto rounded-lg border border-gray-200">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Typ</th>
								<th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Beskrivning</th>
								<th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Kategori</th>
								<th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Exkl moms</th>
								<th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Moms</th>
								<th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Inkl moms</th>
								<th class="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Åtk.</th>
								<th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Datum</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each filteredEntries as entry}
								{@const vatAmount = entry.amount * entry.vatRate}
								{@const inclVat = entry.amount + vatAmount}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3">
										<span class="rounded-full px-2 py-0.5 text-xs font-medium {entry.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
											{entry.type === "INCOME" ? "Intäkt" : "Kostnad"}
										</span>
									</td>
									<td class="px-4 py-3 text-sm text-gray-900">{entry.description}</td>
									<td class="px-4 py-3 text-sm text-gray-500">{entry.category || "—"}</td>
									<td class="px-4 py-3 text-right text-sm font-medium {entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}">
										{formatCurrency(entry.amount)}
									</td>
									<td class="px-4 py-3 text-right text-sm text-gray-500">
										{formatCurrency(vatAmount)}
									</td>
									<td class="px-4 py-3 text-right text-sm font-medium text-gray-900">
										{formatCurrency(inclVat)}
									</td>
									<td class="px-4 py-3 text-center text-sm">
										{#if entry.isRecurring}
											<span class="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Mån</span>
										{:else}
											<span class="text-xs text-gray-400">Engång</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-sm text-gray-500">
										{format(new Date(entry.startDate), "d MMM yyyy", { locale: sv })}
										{#if entry.endDate}
											→ {format(new Date(entry.endDate), "d MMM yyyy", { locale: sv })}
										{/if}
									</td>
									<td class="px-4 py-3">
										<form method="POST" action="?/deleteFinanceEntry" use:enhance={handleEnhance}>
											<input type="hidden" name="id" value={entry.id} />
											<button type="submit" class="text-gray-300 hover:text-red-500">
												<TrashIcon class="h-4 w-4" />
											</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-center text-gray-500 py-8">Inga ekonomiposter ännu. Lägg till din första ovan.</p>
			{/if}
		</div>
	{/if}
</div>
