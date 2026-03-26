<script lang="ts">
	import Card from "$lib/components/ui/card.svelte";
	import {
		UserGroupIcon,
		CurrencyDollarIcon,
		ClipboardDocumentListIcon,
		ChartBarIcon,
	} from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";
	
	let { data }: { data: PageData } = $props();
	
	// Mock stats - in real app, fetch from database
	const stats = [
		{ label: "Totalt antal prospekt", value: "0", icon: UserGroupIcon, color: "bg-blue-500" },
		{ label: "Aktiva kunder", value: "0", icon: UserGroupIcon, color: "bg-green-500" },
		{ label: "Intäkter denna månad", value: "0 kr", icon: CurrencyDollarIcon, color: "bg-purple-500" },
		{ label: "Öppna uppgifter", value: "0", icon: ClipboardDocumentListIcon, color: "bg-orange-500" },
	];
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Instrumentpanel</h1>
		<p class="mt-2 text-gray-600">Välkommen tillbaka, {data.user?.name || "Användare"}!</p>
	</div>
	
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			{@const Icon = stat.icon}
			<Card class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">{stat.label}</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
					</div>
					<div class="rounded-lg {stat.color} p-3">
						<Icon class="h-6 w-6 text-white" />
					</div>
				</div>
			</Card>
		{/each}
	</div>
	
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900">Senaste aktivitet</h2>
			<div class="mt-4 space-y-4">
				<p class="text-sm text-gray-500">Ingen senaste aktivitet</p>
			</div>
		</Card>
		
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900">Snabbt åtgärder</h2>
			<div class="mt-4 space-y-2">
				<a href="/dashboard/prospects/new" class="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Lägg till nytt prospekt
				</a>
				<a href="/dashboard/quotes/new" class="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Skapa offert
				</a>
				<a href="/dashboard/tasks/new" class="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Skapa uppgift
				</a>
			</div>
		</Card>
	</div>
</div>
