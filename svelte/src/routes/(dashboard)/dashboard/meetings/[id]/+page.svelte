<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { goto } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PencilIcon, TrashIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let formData = $state({
		title: "",
		description: "",
		startTime: "",
		endTime: "",
		location: "",
		videoLink: "",
		notes: "",
	});
	let newAttendee = $state({ userId: "", contactId: "" });
	let error = $state("");

	$effect(() => {
		formData.title = data.meeting.title;
		formData.description = data.meeting.description ?? "";
		formData.startTime = data.meeting.startTime ? format(new Date(data.meeting.startTime), "yyyy-MM-dd'T'HH:mm") : "";
		formData.endTime = data.meeting.endTime ? format(new Date(data.meeting.endTime), "yyyy-MM-dd'T'HH:mm") : "";
		formData.location = data.meeting.location ?? "";
		formData.videoLink = data.meeting.videoLink ?? "";
		formData.notes = data.meeting.notes ?? "";
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.meeting.title}</h1>
			<p class="mt-2 text-gray-600">
				{format(new Date(data.meeting.startTime), "d MMM yyyy HH:mm", { locale: sv })} – {format(new Date(data.meeting.endTime), "HH:mm", { locale: sv })}
			</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={() => (editing = !editing)}>
				<PencilIcon class="mr-2 h-5 w-5" />
				{editing ? "Avbryt" : "Redigera"}
			</Button>
			<form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => { await update(); if (result.type === "success" && result.data?.success) { goto("/dashboard/meetings"); } }}>
				<Button type="submit" variant="outline">Ta bort</Button>
			</form>
			<a href="/dashboard/meetings">
				<Button variant="outline">Tillbaka</Button>
			</a>
		</div>
	</div>

	<Card class="p-6">
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
						} else if (result.type === "success" && result.data?.error) {
							error = result.data.error;
						}
					};
				}}
			>
				{#if error}
					<p class="mb-4 text-sm text-red-600">{error}</p>
				{/if}
				<div class="space-y-4 max-w-2xl">
					<div>
						<Label for="title">Titel *</Label>
						<Input id="title" name="title" bind:value={formData.title} required />
					</div>
					<div>
						<Label for="description">Beskrivning</Label>
						<textarea id="description" name="description" bind:value={formData.description} rows="2" class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label for="startTime">Starttid *</Label>
							<Input id="startTime" name="startTime" type="datetime-local" bind:value={formData.startTime} required />
						</div>
						<div>
							<Label for="endTime">Sluttid *</Label>
							<Input id="endTime" name="endTime" type="datetime-local" bind:value={formData.endTime} required />
						</div>
					</div>
					<div>
						<Label for="location">Plats</Label>
						<Input id="location" name="location" bind:value={formData.location} />
					</div>
					<div>
						<Label for="videoLink">Videolänk</Label>
						<Input id="videoLink" name="videoLink" type="url" bind:value={formData.videoLink} />
					</div>
					<div>
						<Label for="notes">Anteckningar</Label>
						<textarea id="notes" name="notes" bind:value={formData.notes} rows="2" class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
					</div>
					<Button type="submit">Spara</Button>
				</div>
			</form>
		{:else}
			<dl class="space-y-2">
				{#if data.meeting.description}
					<div>
						<dt class="text-sm font-medium text-gray-500">Beskrivning</dt>
						<dd class="text-gray-900 whitespace-pre-wrap">{data.meeting.description}</dd>
					</div>
				{/if}
				{#if data.meeting.location}
					<div>
						<dt class="text-sm font-medium text-gray-500">Plats</dt>
						<dd class="text-gray-900">{data.meeting.location}</dd>
					</div>
				{/if}
				{#if data.meeting.videoLink}
					<div>
						<dt class="text-sm font-medium text-gray-500">Videolänk</dt>
						<dd class="text-gray-900">
							<a href={data.meeting.videoLink} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">{data.meeting.videoLink}</a>
						</dd>
					</div>
				{/if}
				{#if data.meeting.notes}
					<div>
						<dt class="text-sm font-medium text-gray-500">Anteckningar</dt>
						<dd class="text-gray-900 whitespace-pre-wrap">{data.meeting.notes}</dd>
					</div>
				{/if}
			</dl>
		{/if}
	</Card>

	<Card class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Deltagare</h2>
		{#if data.meeting.attendees.length === 0}
			<p class="text-sm text-gray-500">Inga deltagare tillagda.</p>
		{:else}
			<ul class="space-y-2 mb-4">
				{#each data.meeting.attendees as a}
					<li class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
						<span>
							{#if a.user}
								{a.user.name} <span class="text-gray-500">({a.user.email})</span>
							{:else if a.contact}
								{a.contact.firstName} {a.contact.lastName}
							{/if}
							– {data.attendeeStatusLabels[a.status] ?? a.status}
						</span>
						<form method="POST" action="?/removeAttendee" use:enhance={() => async ({ update }) => await update().then(() => invalidateAll())}>
							<input type="hidden" name="attendeeId" value={a.id} />
							<button type="submit" class="text-red-600 hover:text-red-700">Ta bort</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
		<form method="POST" action="?/addAttendee" class="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-gray-300 p-3" use:enhance={() => async ({ update }) => await update().then(() => invalidateAll())}>
			<div>
				<Label for="addUser" class="text-xs">Användare</Label>
				<select id="addUser" name="userId" bind:value={newAttendee.userId} class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">–</option>
					{#each data.users as u}
						<option value={u.id}>{u.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label for="addContact" class="text-xs">Kontakt</Label>
				<select id="addContact" name="contactId" bind:value={newAttendee.contactId} class="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">–</option>
					{#each data.contacts as c}
						<option value={c.id}>{c.firstName} {c.lastName}</option>
					{/each}
				</select>
			</div>
			<Button type="submit">Lägg till deltagare</Button>
		</form>
	</Card>
</div>
