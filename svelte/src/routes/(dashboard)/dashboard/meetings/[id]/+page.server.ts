import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const ATTENDEE_STATUS_LABELS: Record<string, string> = {
	INVITED: "Inbjuden",
	ACCEPTED: "Accepterad",
	DECLINED: "Avböjd",
	ATTENDED: "Deltog",
	NO_SHOW: "Dök inte upp",
};

export const load: PageServerLoad = async ({ params }) => {
	const meeting = await db.meeting.findUnique({
		where: { id: params.id },
		include: {
			attendees: {
				include: {
					user: { select: { id: true, name: true, email: true } },
					contact: { select: { id: true, firstName: true, lastName: true, email: true } },
				},
			},
		},
	});
	if (!meeting) {
		throw error(404, "Möte hittades inte");
	}
	const users = await db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
	const contacts = await db.contact.findMany({
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
	return { meeting, users, contacts, attendeeStatusLabels: ATTENDEE_STATUS_LABELS };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim() || undefined;
		const startTimeRaw = data.get("startTime") as string;
		const endTimeRaw = data.get("endTime") as string;
		const location = (data.get("location") as string)?.trim() || undefined;
		const videoLink = (data.get("videoLink") as string)?.trim() || undefined;
		const notes = (data.get("notes") as string)?.trim() || undefined;

		if (!title || !startTimeRaw || !endTimeRaw) {
			return { error: "Titel, starttid och sluttid krävs" };
		}

		const startTime = new Date(startTimeRaw);
		const endTime = new Date(endTimeRaw);
		if (endTime <= startTime) {
			return { error: "Sluttid måste vara efter starttid" };
		}

		await db.meeting.update({
			where: { id: params.id },
			data: { title, description, startTime, endTime, location, videoLink, notes },
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "meeting.update",
			entityType: "Meeting",
			entityId: params.id,
			details: { title },
			request,
		});
		return { success: true };
	},

	delete: async ({ params, locals, request }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "meeting.delete",
			entityType: "Meeting",
			entityId: params.id,
			details: {},
			request,
		});
		await db.meeting.delete({ where: { id: params.id } });
		return { success: true };
	},

	addAttendee: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const userId = (data.get("userId") as string) || undefined;
		const contactId = (data.get("contactId") as string) || undefined;
		if (!userId && !contactId) {
			return { error: "Välj användare eller kontakt" };
		}
		await db.meetingAttendee.create({
			data: {
				meetingId: params.id,
				userId: userId || null,
				contactId: contactId || null,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "meeting.addAttendee",
			entityType: "Meeting",
			entityId: params.id,
			details: { userId: userId ?? undefined, contactId: contactId ?? undefined },
			request,
		});
		return { success: true };
	},

	removeAttendee: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const attendeeId = data.get("attendeeId") as string;
		if (!attendeeId) return { error: "Deltagare krävs" };
		await db.meetingAttendee.deleteMany({
			where: { id: attendeeId, meetingId: params.id },
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "meeting.removeAttendee",
			entityType: "Meeting",
			entityId: params.id,
			details: { attendeeId },
			request,
		});
		return { success: true };
	},
};
