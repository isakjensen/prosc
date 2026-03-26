import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { db } from "$lib/db";

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get("session");
	
	if (sessionId) {
		// In a real app, you'd look up the session in a database
		// For now, we'll use a simple approach with user ID in cookie
		const userId = event.cookies.get("userId");
		if (userId) {
			const user = await db.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					avatar: true,
				},
			});
			if (user) {
				event.locals.user = user;
			}
		}
	}

	return resolve(event);
};

export const handle = sequence(authHandle);
