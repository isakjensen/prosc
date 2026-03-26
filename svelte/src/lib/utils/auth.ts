import { db } from "$lib/db";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function getUserByEmail(email: string): Promise<User | null> {
	return db.user.findUnique({
		where: { email },
	});
}

export async function createUser(email: string, password: string, name: string) {
	const passwordHash = await hashPassword(password);
	return db.user.create({
		data: {
			email,
			passwordHash,
			name,
		},
	});
}
