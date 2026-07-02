CREATE TABLE IF NOT EXISTS municipal_regulatory_consultation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  admin_name varchar(255),
  admin_email varchar(255),
  admin_role varchar(50) NOT NULL,
  territory_id text,
  destination_phone varchar(20) NOT NULL,
  recipient_name varchar(255),
  organization_name varchar(255) NOT NULL,
  municipality_name varchar(120),
  document_version varchar(30) NOT NULL DEFAULT 'v1.0',
  protocol_code varchar(60),
  observation text,
  template_key varchar(80) NOT NULL DEFAULT 'kaviar_regulatory_consultation_v1',
  twilio_message_sid varchar(80) UNIQUE,
  twilio_status varchar(30),
  twilio_error_code varchar(30),
  twilio_error_message text,
  source_screen varchar(80) NOT NULL DEFAULT 'crm_regulatory_consultation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mrcl_admin_created ON municipal_regulatory_consultation_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mrcl_territory_created ON municipal_regulatory_consultation_logs (territory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mrcl_dest_created ON municipal_regulatory_consultation_logs (destination_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mrcl_protocol ON municipal_regulatory_consultation_logs (protocol_code);

CREATE OR REPLACE FUNCTION trg_set_updated_at_mrcl()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_mrcl ON municipal_regulatory_consultation_logs;
CREATE TRIGGER set_updated_at_mrcl
BEFORE UPDATE ON municipal_regulatory_consultation_logs
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at_mrcl();
