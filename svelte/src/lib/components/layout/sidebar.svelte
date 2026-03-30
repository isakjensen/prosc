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
		XMarkIcon,
		CubeIcon,
	} from "heroicons-svelte/24/outline";

	interface Props {
		user?: { name: string; email: string; role: string };
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = false, onclose }: Props = $props();

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
		{ label: "Produkter", href: "/dashboard/products", icon: CubeIcon },
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

	// Auto-close on navigation (track pathname changes, skip initial run)
	let prevPathname = $state($page.url.pathname);
	$effect(() => {
		const current = $page.url.pathname;
		if (current !== prevPathname) {
			prevPathname = current;
			if (open) onclose?.();
		}
	});
</script>

<!-- Backdrop overlay (mobile only) -->
{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={onclose}
	></div>
{/if}

<!-- Sidebar panel -->
<aside
	class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out
		{open ? 'translate-x-0' : '-translate-x-full'}
		lg:static lg:z-auto lg:translate-x-0 lg:shadow-none"
>
	<!-- Header -->
	<div class="flex h-16 items-center justify-between border-b border-gray-200 px-4">
		<h1 class="text-xl font-bold text-gray-900">ProSC</h1>
		<button
			type="button"
			onclick={onclose}
			class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
		>
			<XMarkIcon class="h-5 w-5" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
		{#each navItems as item}
			{@const Icon = item.icon}
			{@const isActive = $page?.url?.pathname === item.href}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
					{isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}"
			>
				<Icon class="h-5 w-5 flex-shrink-0" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
