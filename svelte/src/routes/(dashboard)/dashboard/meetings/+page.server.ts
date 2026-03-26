import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	const meetings = await db.meeting.findMany({
		include: {
			attendees: {
				include: {
					user: { select: { id: true, name: true, email: true } },
					contact: { select: { id: true, firstName: true, lastName: true, email: true } },
				},
			},
		},
		orderBy: { startTime: "asc" },
	});
	const users = await db.user.findMany({
		select: { id: true, name: true, email: true },
		orderBy: { name: "asc" },
	});
	const contacts = await db.contact.findMany({
		select: { id: true, firstName: true, lastName: true, email: true },
		orderBy: { firstName: "asc" },
	});
	return { meetings, users, contacts };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim() || undefined;
		const startTimeRaw = data.get("startTime") as string;
		const endTimeRaw = data.get("endTime") as string;
		const location = (data.get("location") as string)?.trim() || undefined;
		const videoLink = (data.get("videoLink") as string)?.trim() || undefined;
		const notes = (data.get("notes") as string)?.trim() || undefined;
		const userIds = (data.get("userIds") as string)?.split(",").filter(Boolean) ?? [];
		const contactIds = (data.get("contactIds") as string)?.split(",").filter(Boolean) ?? [];

		if (!title || !startTimeRaw || !endTimeRaw) {
			return fail(400, { error: "Titel, starttid och sluttid krävs" });
		}

		const startTime = new Date(startTimeRaw);
		const endTime = new Date(endTimeRaw);
		if (endTime <= startTime) {
			return fail(400, { error: "Sluttid måste vara efter starttid" });
		}

		const meeting = await db.meeting.create({
			data: {
				title,
				description,
				startTime,
				endTime,
				location,
				videoLink,
				notes,
			},
		});

		for (const userId of userIds) {
			await db.meetingAttendee.create({
				data: { meetingId: meeting.id, userId, contactId: null },
			});
		}
		for (const contactId of contactIds) {
			await db.meetingAttendee.create({
				data: { meetingId: meeting.id, userId: null, contactId },
			});
		}

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "meeting.create",
			entityType: "Meeting",
			entityId: meeting.id,
			details: { title, startTime: startTimeRaw, endTime: endTimeRaw, attendeeCount: userIds.length + contactIds.length },
			request,
		});

		return { success: true, meetingId: meeting.id };
	},
};
