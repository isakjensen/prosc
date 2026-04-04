-- CreateTable
CREATE TABLE `project_links` (
    `id` VARCHAR(191) NOT NULL,
    `projektId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_links_projektId_idx`(`projektId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_links` ADD CONSTRAINT `project_links_projektId_fkey` FOREIGN KEY (`projektId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
