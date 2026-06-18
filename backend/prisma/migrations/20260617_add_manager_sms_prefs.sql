-- SMS alert preferences for territorial managers
ALTER TABLE admins ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS notify_new_drivers BOOLEAN DEFAULT true;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS notify_new_passengers BOOLEAN DEFAULT false;
