<script lang="ts">
	import { enhance } from "$app/forms";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import Label from "$lib/components/ui/label.svelte";
	import Card from "$lib/components/ui/card.svelte";
	
	let email = $state("");
	let password = $state("");
	let error = $state("");
	let loading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-900">ProSC</h1>
			<p class="mt-2 text-sm text-gray-600">Logga in på ditt konto</p>
		</div>
		
		{#if error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}
		
		<form
			method="POST"
			action="?/login"
			use:enhance={() => {
				loading = true;
				error = "";
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === "failure") {
						error = result.data?.error ?? "Något gick fel";
					}
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<Label for="email">E-post</Label>
					<Input
						id="email"
						name="email"
						type="email"
						bind:value={email}
						required
						placeholder="du@exempel.se"
					/>
				</div>
				
				<div>
					<Label for="password">Lösenord</Label>
					<Input
						id="password"
						name="password"
						type="password"
						bind:value={password}
						required
					/>
				</div>
				
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? "Loggar in..." : "Logga in"}
				</Button>
			</div>
		</form>
	</Card>
</div>
