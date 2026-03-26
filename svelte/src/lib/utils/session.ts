import type { Cookies } from "@sveltejs/kit";
import { db } from "$lib/db";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string, cookies: Cookies): Promise<string> {
	const sessionId = crypto.randomUUID();
	
	// In a real app, you'd store sessions in a database
	// For now, we'll use a simple cookie-based approach
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: "/",
		maxAge: SESSION_MAX_AGE,
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	return sessionId;
}

export function getSession(cookies: Cookies): string | null {
	return cookies.get(SESSION_COOKIE_NAME) || null;
}

export function deleteSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
}

export async function getUserFromSession(cookies: Cookies) {
	const sessionId = getSession(cookies);
	if (!sessionId) return null;

	// In a real app, you'd look up the session in a database
	// For simplicity, we'll decode user info from the session
	// For now, return null - we'll implement proper session storage later
	return null;
}
