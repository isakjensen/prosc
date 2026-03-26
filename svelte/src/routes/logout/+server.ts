import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.set("session", "", {
		path: "/",
		maxAge: 0,
	});
	cookies.set("userId", "", {
		path: "/",
		maxAge: 0,
	});
	throw redirect(303, "/login");
};
