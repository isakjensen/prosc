import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	// Create default user
	const passwordHash = await bcrypt.hash("password123", 10);
	
	const user = await prisma.user.upsert({
		where: { email: "admin@prosc.com" },
		update: {},
		create: {
			email: "admin@prosc.com",
			passwordHash,
			name: "Admin User",
			role: "ADMIN",
		},
	});

	// Create default prospect stages
	const stages = [
		{ name: "Found / Lead", order: 1, description: "Prospect discovered", color: "#3B82F6" },
		{ name: "Qualified", order: 2, description: "Needs confirmed, budget/timeline fit", color: "#10B981" },
		{ name: "Proposal", order: 3, description: "Quote/proposal sent", color: "#F59E0B" },
		{ name: "Negotiation", order: 4, description: "In discussion, revisions", color: "#8B5CF6" },
		{ name: "Won", order: 5, description: "Deal closed, contract signed", color: "#EC4899" },
		{ name: "Implementation", order: 6, description: "Project in progress", color: "#6366F1" },
		{ name: "Implemented Customer", order: 7, description: "Live and handed over", color: "#059669" },
	];

	for (const stage of stages) {
		await prisma.prospectStage.upsert({
			where: { name: stage.name },
			update: {},
			create: stage,
		});
	}

	console.log("Seed data created:", { user });
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
