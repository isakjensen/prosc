import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			// Only allow serving files from the project root (avoids requests from other projects, e.g. cached service workers)
			allow: [path.resolve("."), path.resolve("node_modules")],
		},
	},
});
