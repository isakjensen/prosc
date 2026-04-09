-- =============================================
-- SQL-migration för schema-ändringar
-- Kör dessa i ordning mot MySQL-databasen
-- =============================================

-- 1. Task: Lägg till customerId och projectId
ALTER TABLE `tasks` ADD COLUMN `customerId` VARCHAR(191) NULL;
ALTER TABLE `tasks` ADD COLUMN `projectId` VARCHAR(191) NULL;
CREATE INDEX `tasks_customerId_idx` ON `tasks`(`customerId`);
CREATE INDEX `tasks_projectId_idx` ON `tasks`(`projectId`);
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Meeting: Lägg till customerId och projectId
ALTER TABLE `meetings` ADD COLUMN `customerId` VARCHAR(191) NULL;
ALTER TABLE `meetings` ADD COLUMN `projectId` VARCHAR(191) NULL;
CREATE INDEX `meetings_customerId_idx` ON `meetings`(`customerId`);
CREATE INDEX `meetings_projectId_idx` ON `meetings`(`projectId`);
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Invoice: Lägg till quoteId
ALTER TABLE `invoices` ADD COLUMN `quoteId` VARCHAR(191) NULL;
CREATE INDEX `invoices_quoteId_idx` ON `invoices`(`quoteId`);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. SupportTicket: Lägg till projectId
ALTER TABLE `support_tickets` ADD COLUMN `projectId` VARCHAR(191) NULL;
CREATE INDEX `support_tickets_projectId_idx` ON `support_tickets`(`projectId`);
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Expense: projectId finns redan som kolumn, lägg till FK + index
CREATE INDEX `expenses_projectId_idx` ON `expenses`(`projectId`);
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Outreach: Lägg till emailTemplateId
ALTER TABLE `outreach` ADD COLUMN `emailTemplateId` VARCHAR(191) NULL;
CREATE INDEX `outreach_emailTemplateId_idx` ON `outreach`(`emailTemplateId`);
ALTER TABLE `outreach` ADD CONSTRAINT `outreach_emailTemplateId_fkey` FOREIGN KEY (`emailTemplateId`) REFERENCES `email_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
