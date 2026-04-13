-- AlterTable
ALTER TABLE `users` ADD COLUMN `themePreference` ENUM('LIGHT', 'DARK') NOT NULL DEFAULT 'LIGHT';
