-- =====================================================
-- AJUSTES FINAIS LGPD - SEGURANÇA E AUDITORIA
-- =====================================================

-- 1. ADICIONAR CAMPO DE EXPIRAÇÃO PARA RETENÇÃO
ALTER TABLE emergency_events 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS consent_received BOOLEAN DEFAULT FALSE;

-- 2. TABELA DE AUDITORIA ADMIN
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL, -- ID do usuário admin
    admin_email TEXT NOT NULL,
    action TEXT CHECK (action IN ('VIEW_EMERGENCY', 'PLAY_AUDIO', 'ACCESS_DASHBOARD')) NOT NULL,
    emergency_id UUID REFERENCES emergency_events(id) ON DELETE SET NULL,
    details JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES PARA AUDITORIA
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_emergency ON admin_audit_log(emergency_id);

-- 4. RLS PARA AUDITORIA
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_audit_log" 
ON admin_audit_log FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Admin read own audit logs" 
ON admin_audit_log FOR SELECT 
TO authenticated 
USING (
  (auth.jwt() ->> 'role' = 'admin' OR 
   (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

-- 5. FUNÇÃO DE LIMPEZA AUTOMÁTICA (30 DIAS)
CREATE OR REPLACE FUNCTION cleanup_expired_emergencies()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Registrar auditoria da limpeza
  INSERT INTO admin_audit_log (
    admin_id, 
    admin_email, 
    action, 
    details
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'system@kaviar.com',
    'CLEANUP_EXPIRED',
    jsonb_build_object(
      'cleanup_date', NOW(),
      'retention_days', 30
    )
  );
  
  -- Excluir emergências expiradas
  DELETE FROM emergency_events 
  WHERE expires_at < NOW()
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. HABILITAR REALTIME PARA AUDITORIA
ALTER PUBLICATION supabase_realtime ADD TABLE admin_audit_log;

-- 7. COMENTÁRIOS
COMMENT ON TABLE admin_audit_log IS 'Log de auditoria para ações de admins (LGPD)';
COMMENT ON COLUMN emergency_events.expires_at IS 'Data de expiração automática (30 dias)';
COMMENT ON COLUMN emergency_events.consent_received IS 'Se usuário respondeu SIM ao consentimento';

-- =====================================================
-- CONFIGURAÇÃO CONCLUÍDA
-- =====================================================
