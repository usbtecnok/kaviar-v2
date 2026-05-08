-- AlterTable: add active_session_id to drivers for single-device session control
ALTER TABLE "drivers" ADD COLUMN "active_session_id" TEXT;
