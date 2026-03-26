<script lang="ts">
	import { page } from "$app/stores";
	import {
		HomeIcon,
		UserGroupIcon,
		BuildingOfficeIcon,
		DocumentTextIcon,
		CurrencyDollarIcon,
		ClipboardDocumentListIcon,
		ClockIcon,
		CalendarIcon,
		InboxIcon,
		ChartBarIcon,
		Cog6ToothIcon,
		DocumentMagnifyingGlassIcon,
		BoltIcon,
	} from "heroicons-svelte/24/outline";

	interface Props {
		user?: { name: string; email: string; role: string };
	}

	let { user }: Props = $props();

	interface NavItem {
		label: string;
		href: string;
		icon: any;
	}

	const baseNavItems: NavItem[] = [
		{ label: "Instrumentpanel", href: "/dashboard", icon: HomeIcon },
		{ label: "Pipelines", href: "/dashboard/pipelines", icon: BoltIcon },
		{ label: "Prospekt", href: "/dashboard/prospects", icon: UserGroupIcon },
		{ label: "Kunder", href: "/dashboard/customers", icon: BuildingOfficeIcon },
		{ label: "Kontakter", href: "/dashboard/contacts", icon: UserGroupIcon },
		{ label: "Offerter", href: "/dashboard/quotes", icon: DocumentTextIcon },
		{ label: "Avtal", href: "/dashboard/contracts", icon: DocumentTextIcon },
		{ label: "Fakturor", href: "/dashboard/invoices", icon: CurrencyDollarIcon },
		{ label: "Uppgifter", href: "/dashboard/tasks", icon: ClipboardDocumentListIcon },
		{ label: "Tidrapportering", href: "/dashboard/time-tracking", icon: ClockIcon },
		{ label: "Möten", href: "/dashboard/meetings", icon: CalendarIcon },
		{ label: "Support", href: "/dashboard/support", icon: InboxIcon },
		{ label: "Rapporter", href: "/dashboard/reports", icon: ChartBarIcon },
		{ label: "Systemloggar", href: "/dashboard/systemloggar", icon: DocumentMagnifyingGlassIcon },
		{ label: "Inställningar", href: "/dashboard/settings", icon: Cog6ToothIcon },
	];

	const navItems = $derived(
		user?.role === "ADMIN"
			? baseNavItems
			: baseNavItems.filter((item) => item.href !== "/dashboard/systemloggar"),
	);
	
	let collapsed = $state(false);
</script>

<aside class="flex h-screen flex-col border-r border-gray-200 bg-white">
	<div class="flex h-16 items-center border-b border-gray-200 px-4">
		<h1 class="text-xl font-bold text-gray-900">ProSC</h1>
	</div>
	
	<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
		{#each navItems as item}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 {$page?.url?.pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}"
			>
				<Icon class="h-5 w-5" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
