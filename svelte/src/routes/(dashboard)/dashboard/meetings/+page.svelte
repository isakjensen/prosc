<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import Card from "$lib/components/ui/card.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import { format } from "date-fns";
	import { sv } from "date-fns/locale";
	import { PlusIcon } from "heroicons-svelte/24/outline";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let formData = $state({
		title: "",
		description: "",
		startTime: "",
		endTime: "",
		location: "",
		videoLink: "",
		notes: "",
		userIds: [] as string[],
		contactIds: [] as string[],
	});
	let error = $state("");
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Möten</h1>
			<p class="mt-2 text-gray-600">Schemalägg och hantera möten</p>
		</div>
		<Button onclick={() => (showForm = !showForm)}>
			<PlusIcon class="mr-2 h-5 w-5" />
			Boka möte
		</Button>
	</div>

	{#if showForm}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Nytt möte</h2>
			{#if error}
				<p class="mb-4 text-sm text-red-600">{error}</p>
			{/if}
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success" && result.data?.meetingId) {
							showForm = false;
							formData = { title: "", description: "", startTime: "", endTime: "", location: "", videoLink: "", notes: "", userIds: [], contactIds: [] };
							await invalidateAll();
							// optional: goto(`/dashboard/meetings/${result.data.meetingId}`);
						} else if (result.type === "failure" && result.data?.error) {
							error = result.data.error;
						}
					};
				}}
			>
				<div class="space-y-4 max-w-2xl">
					<div>
						<Label for="title">Titel *</Label>
						<Input id="title" name="title" bind:value={formData.title} required />
					</div>
					<div>
						<Label for="description">Beskrivning</Label>
						<textarea
							id="description"
							name="description"
							bind:value={formData.description}
							rows="2"
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						></textarea>
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
						<Input id="videoLink" name="videoLink" type="url" bind:value={formData.videoLink} placeholder="https://..." />
					</div>
					<div>
						<Label for="notes">Anteckningar</Label>
						<textarea
							id="notes"
							name="notes"
							bind:value={formData.notes}
							rows="2"
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						></textarea>
					</div>
					<div>
						<Label class="text-xs">Deltagare (användare)</Label>
						<div class="mt-1 flex flex-wrap gap-2">
							{#each data.users as u}
								<label class="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-sm">
									<input type="checkbox" value={u.id} bind:group={formData.userIds} />
									{u.name}
								</label>
							{/each}
						</div>
					</div>
					<div>
						<Label class="text-xs">Deltagare (kontakter)</Label>
						<div class="mt-1 flex flex-wrap gap-2">
							{#each data.contacts as c}
								<label class="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-sm">
									<input type="checkbox" value={c.id} bind:group={formData.contactIds} />
									{c.firstName} {c.lastName}
								</label>
							{/each}
						</div>
					</div>
					<input type="hidden" name="userIds" value={formData.userIds.join(",")} />
					<input type="hidden" name="contactIds" value={formData.contactIds.join(",")} />
					<Button type="submit">Skapa möte</Button>
				</div>
			</form>
		</Card>
	{/if}

	{#if data.meetings.length === 0}
		<Card class="p-12 text-center">
			<p class="text-gray-500">Inga möten schemalagda</p>
			<button type="button" onclick={() => (showForm = true)} class="mt-4 text-blue-600 hover:text-blue-700">
				Boka ett möte
			</button>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each data.meetings as meeting}
				<Card class="p-4">
					<div class="flex items-start justify-between">
						<div>
							<a href="/dashboard/meetings/{meeting.id}" class="text-lg font-semibold text-gray-900 hover:text-blue-600">
								{meeting.title}
							</a>
							<p class="mt-1 text-sm text-gray-600">
								{format(new Date(meeting.startTime), "d MMM yyyy HH:mm", { locale: sv })} – {format(new Date(meeting.endTime), "HH:mm", { locale: sv })}
							</p>
							{#if meeting.location}
								<p class="text-sm text-gray-500">{meeting.location}</p>
							{/if}
							{#if meeting.attendees.length > 0}
								<p class="mt-2 text-xs text-gray-500">
									Deltagare:
									{meeting.attendees.map((a) => a.user ? a.user.name : a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : "").filter(Boolean).join(", ")}
								</p>
							{/if}
						</div>
						<a href="/dashboard/meetings/{meeting.id}">
							<Button variant="outline" size="sm">Visa</Button>
						</a>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
