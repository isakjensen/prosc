-- Rename MEMBER to USER and remove MANAGER from UserRole enum
-- Step 1: Convert existing MANAGER users to USER
UPDATE `users` SET `role` = 'USER' WHERE `role` = 'MANAGER';

-- Step 2: Convert existing MEMBER users to USER
UPDATE `users` SET `role` = 'USER' WHERE `role` = 'MEMBER';

-- Step 3: Alter the column to the new enum values
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER';
