<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let settingsForm = $state({
		companyName: data.settings?.companyName ?? "",
		companyAddress: data.settings?.companyAddress ?? "",
		companyOrgNr: data.settings?.companyOrgNr ?? "",
		quoteNumberPrefix: data.settings?.quoteNumberPrefix ?? "OFF",
		contractNumberPrefix: data.settings?.contractNumberPrefix ?? "AVT",
		invoiceNumberPrefix: data.settings?.invoiceNumberPrefix ?? "FKT",
		defaultTaxPercent: data.settings?.defaultTaxPercent ?? "25",
		logoUrl: data.settings?.logoUrl ?? "",
	});
	let profileForm = $state({
		name: data.user?.name ?? "",
	});
	let settingsSuccess = $state(false);
	let profileSuccess = $state(false);
	let error = $state("");
	let profileError = $state("");

	$effect(() => {
		if (data.settings) {
			settingsForm.companyName = data.settings.companyName ?? "";
			settingsForm.companyAddress = data.settings.companyAddress ?? "";
			settingsForm.companyOrgNr = data.settings.companyOrgNr ?? "";
			settingsForm.quoteNumberPrefix = data.settings.quoteNumberPrefix ?? "OFF";
			settingsForm.contractNumberPrefix = data.settings.contractNumberPrefix ?? "AVT";
			settingsForm.invoiceNumberPrefix = data.settings.invoiceNumberPrefix ?? "FKT";
			settingsForm.defaultTaxPercent = data.settings.defaultTaxPercent ?? "25";
			settingsForm.logoUrl = data.settings.logoUrl ?? "";
		}
		if (data.user) {
			profileForm.name = data.user.name ?? "";
		}
	});
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Inställningar</h1>
		<p class="mt-2 text-gray-600">Hantera systeminställningar och din profil</p>
	</div>

	<!-- Min profil -->
	<Card class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Min profil</h2>
		{#if profileSuccess}
			<p class="mb-4 text-sm text-green-600">Profilen är sparad.</p>
		{/if}
		{#if profileError}
			<p class="mb-4 text-sm text-red-600">{profileError}</p>
		{/if}
		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === "success" && result.data?.profileSuccess) {
						profileSuccess = true;
						profileError = "";
						setTimeout(() => (profileSuccess = false), 3000);
						await invalidateAll();
					} else if (result.type === "failure" && result.data?.profileError) {
						profileError = result.data.profileError;
					}
				};
			}}
		>
			<div class="space-y-4 max-w-md">
				<div>
					<Label for="profileName">Namn</Label>
					<Input id="profileName" name="name" bind:value={profileForm.name} required />
				</div>
				<div>
					<p class="text-sm text-gray-500">E-post: {data.user?.email}</p>
				</div>
				<Button type="submit">Spara profil</Button>
			</div>
		</form>
	</Card>

	<!-- Systeminställningar (endast ADMIN) -->
	{#if data.isAdmin}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Systeminställningar</h2>
			<p class="text-sm text-gray-500 mb-4">
				Dessa används i PDF-dokument (offert, avtal, faktura) och för nummerserier.
			</p>
			{#if settingsSuccess}
				<p class="mb-4 text-sm text-green-600">Inställningarna är sparade.</p>
			{/if}
			{#if error}
				<p class="mb-4 text-sm text-red-600">{error}</p>
			{/if}
			<form
				method="POST"
				action="?/updateSettings"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success" && result.data?.success) {
							settingsSuccess = true;
							error = "";
							setTimeout(() => (settingsSuccess = false), 3000);
							await invalidateAll();
						} else if (result.type === "failure" && result.data?.error) {
							error = result.data.error;
						}
					};
				}}
			>
				<div class="space-y-4 max-w-2xl">
					<div>
						<Label for="companyName">Företagsnamn</Label>
						<Input id="companyName" name="companyName" bind:value={settingsForm.companyName} />
					</div>
					<div>
						<Label for="companyAddress">Adress</Label>
						<textarea
							id="companyAddress"
							name="companyAddress"
							bind:value={settingsForm.companyAddress}
							rows="2"
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						></textarea>
					</div>
					<div>
						<Label for="companyOrgNr">Org.nummer</Label>
						<Input id="companyOrgNr" name="companyOrgNr" bind:value={settingsForm.companyOrgNr} />
					</div>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<Label for="quoteNumberPrefix">Prefix offertnummer</Label>
							<Input
								id="quoteNumberPrefix"
								name="quoteNumberPrefix"
								bind:value={settingsForm.quoteNumberPrefix}
								placeholder="OFF"
							/>
						</div>
						<div>
							<Label for="contractNumberPrefix">Prefix avtalsnummer</Label>
							<Input
								id="contractNumberPrefix"
								name="contractNumberPrefix"
								bind:value={settingsForm.contractNumberPrefix}
								placeholder="AVT"
							/>
						</div>
						<div>
							<Label for="invoiceNumberPrefix">Prefix fakturanummer</Label>
							<Input
								id="invoiceNumberPrefix"
								name="invoiceNumberPrefix"
								bind:value={settingsForm.invoiceNumberPrefix}
								placeholder="FKT"
							/>
						</div>
					</div>
					<div>
						<Label for="defaultTaxPercent">Standard moms %</Label>
						<Input
							id="defaultTaxPercent"
							name="defaultTaxPercent"
							type="number"
							min="0"
							max="100"
							step="0.01"
							bind:value={settingsForm.defaultTaxPercent}
						/>
					</div>
					<div>
						<Label for="logoUrl">Logotyp URL (för PDF)</Label>
						<Input id="logoUrl" name="logoUrl" bind:value={settingsForm.logoUrl} placeholder="https://..." />
					</div>
					<Button type="submit">Spara inställningar</Button>
				</div>
			</form>
		</Card>
	{:else}
		<Card class="p-6">
			<p class="text-gray-500">Systeminställningar kan endast ändras av administratörer.</p>
		</Card>
	{/if}
</div>
