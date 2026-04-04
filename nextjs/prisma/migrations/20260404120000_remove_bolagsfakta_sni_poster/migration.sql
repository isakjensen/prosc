-- Remove full SNI list JSON; primary branch remains in sniKodPrimary / sniBenamningPrimary.
ALTER TABLE `bolagsfakta_data` DROP COLUMN `sniPoster`;
