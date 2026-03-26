import type { PrismaClient } from "@prisma/client";

export interface CreateSystemLogOptions {
	userId?: string | null;
	action: string;
	entityType?: string | null;
	entityId?: string | null;
	details?: Record<string, unknown> | string | null;
	request?: Request;
}

export async function createSystemLog(
	db: PrismaClient,
	opts: CreateSystemLogOptions,
): Promise<void> {
	let ipAddress: string | undefined;
	let userAgent: string | undefined;
	if (opts.request) {
		ipAddress =
			opts.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
			opts.request.headers.get("x-real-ip") ??
			undefined;
		userAgent = opts.request.headers.get("user-agent") ?? undefined;
	}

	const detailsStr =
		typeof opts.details === "string"
			? opts.details
			: opts.details != null
				? JSON.stringify(opts.details)
				: null;

	await db.systemLog.create({
		data: {
			userId: opts.userId ?? undefined,
			action: opts.action,
			entityType: opts.entityType ?? undefined,
			entityId: opts.entityId ?? undefined,
			details: detailsStr,
			ipAddress: ipAddress ?? undefined,
			userAgent: userAgent ?? undefined,
		},
	});
}
