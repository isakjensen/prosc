import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { db } from "$lib/db";
import { verifyPassword } from "$lib/utils/auth";
import { createSystemLog } from "$lib/utils/systemLog";

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get("email") as string;
		const password = data.get("password") as string;

		if (!email || !password) {
			return fail(400, { error: "Email and password are required" });
		}

		const user = await db.user.findUnique({
			where: { email },
		});

		if (!user) {
			await createSystemLog(db, {
				action: "auth.login_failed",
				details: { email, reason: "user_not_found" },
				request,
			});
			return fail(401, { error: "Invalid email or password" });
		}

		const isValid = await verifyPassword(password, user.passwordHash);
		if (!isValid) {
			await createSystemLog(db, {
				action: "auth.login_failed",
				details: { email, reason: "invalid_password" },
				request,
			});
			return fail(401, { error: "Invalid email or password" });
		}

		// Create session
		const sessionId = crypto.randomUUID();
		cookies.set("session", sessionId, {
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 days
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
		cookies.set("userId", user.id, {
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});

		await createSystemLog(db, {
			userId: user.id,
			action: "auth.login",
			details: { email: user.email },
			request,
		});

		throw redirect(303, "/dashboard");
	},
};
