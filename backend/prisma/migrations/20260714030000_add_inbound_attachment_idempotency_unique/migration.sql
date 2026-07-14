CREATE UNIQUE INDEX "inbound_email_attachments_inbound_sha256_filename_key"
ON "inbound_email_attachments" ("inbound_email_id", "sha256", "filename");
