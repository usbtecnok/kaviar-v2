-- =====================================================
-- AUTENTICAÇÃO ADMIN - SUPABASE AUTH + RLS
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. CRIAR USUÁRIO ADMIN (via SQL - apenas para bootstrap)
-- IMPORTANTE: Trocar email pelo real do admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@kaviar.com', -- TROCAR PELO EMAIL REAL
  crypt('@#*Z4939ia4', gen_salt('bf')), -- Senha temporária hashada
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"role":"admin","force_password_change":true}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. REMOVER POLÍTICAS ANTIGAS (muito permissivas)
DROP POLICY IF EXISTS "Admin read access on whatsapp_conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Admin read access on whatsapp_messages" ON whatsapp_messages;

-- 3. POLÍTICAS RESTRITIVAS PARA ADMIN AUTENTICADO
CREATE POLICY "Admin auth read conversations" 
ON whatsapp_conversations FOR SELECT 
TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Admin auth read messages" 
ON whatsapp_messages FOR SELECT 
TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 4. MANTER SERVICE ROLE PARA BACKEND (escrita)
-- Políticas de service_role já existem e estão corretas

-- 5. FUNÇÃO PARA VERIFICAR SE É ADMIN
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONFIGURAÇÃO CONCLUÍDA
-- =====================================================
-- Próximos passos:
-- 1. Trocar 'admin@kaviar.com' pelo email real
-- 2. Testar login no dashboard
-- 3. Forçar troca de senha no primeiro acesso
