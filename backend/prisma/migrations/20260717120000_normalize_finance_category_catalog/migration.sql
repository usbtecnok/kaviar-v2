-- Financial category catalog normalization.
-- Defensive migration for local execution with strict baseline checks.

DO $$
DECLARE
  current_count integer;
  non_system_count integer;
  transaction_count integer;
  allocation_count integer;
  duplicate_code_count integer;
  missing_legacy_count integer;
  unexpected_legacy_count integer;
  missing_legacy_id_count integer;
  unexpected_legacy_id_count integer;
  occupied_new_code_count integer;
  occupied_new_id_count integer;
  inserted_new_count integer;
  updated_legacy_count integer;
BEGIN
  SELECT count(*) INTO non_system_count
  FROM financial_categories
  WHERE is_system IS DISTINCT FROM true;
  IF non_system_count <> 0 THEN
    RAISE EXCEPTION 'Expected all finance categories to be system categories';
  END IF;

  SELECT count(*) INTO transaction_count FROM financial_transactions;
  IF transaction_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transactions, found %', transaction_count;
  END IF;

  SELECT count(*) INTO allocation_count FROM financial_transaction_allocations;
  IF allocation_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transaction_allocations, found %', allocation_count;
  END IF;

  SELECT count(*) INTO duplicate_code_count
  FROM (
    SELECT code
    FROM financial_categories
    GROUP BY code
    HAVING count(*) > 1
  ) dup;
  IF duplicate_code_count <> 0 THEN
    RAISE EXCEPTION 'Duplicate finance category codes detected';
  END IF;

  SELECT count(*) INTO occupied_new_code_count
  FROM financial_categories
  WHERE code IN (
    'RECEITAS_OPERACIONAIS','TAXA_CORRIDA','ADESAO_GESTOR','GESTAO_TERRITORIAL','SERVICO_COMERCIAL','OUTRAS_RECEITAS','RECEITA_MENSALIDADE_LEGACY',
    'DESPESAS_ADMINISTRATIVAS','MARKETING_E_VENDAS','CUSTOS_DIRETOS_PLATAFORMA','OPERACOES_E_SUPORTE','TECNOLOGIA_E_PRODUTO','DESPESAS_FINANCEIRAS','COMBO_PREMIUM',
    'AWS','CLOUDFLARE','GOOGLE_PLAY_STORE','EXPO','DOMINIOS_E_CERTIFICADOS','EQUIPAMENTOS_LEGACY','TWILIO','TELEFONIA_INTERNET','REGULACAO_MUNICIPAL',
    'CONTABILIDADE','PRO_LABORE','OUTRAS_DESPESAS','PROCESSAMENTO_PAGAMENTOS','TAXAS_BANCARIAS','REEMBOLSOS','ASAAS_LEGACY','IMPOSTOS_LEGACY',
    'PUBLICIDADE_DIGITAL','AJUSTES_E_DEDUCOES_RECEITA','CHARGEBACKS_LIQUIDACAO','APORTES','APORTE_SOCIO','RETIRADAS','RETIRADA_SOCIO','TRANSFERENCIAS',
    'TRANSFERENCIA_INTERNA','OBRIGACOES_OPERACIONAIS','CREDITOS_PRE_PAGOS','VALORES_MOTORISTAS','VALORES_GESTORES','VALORES_COMERCIOS','RETENCOES','OUTROS_TERCEIROS',
    'VALORES_EM_TRANSITO','VALORES_PROCESSADOR','RECEBIVEIS_LIQUIDAR','REEMBOLSOS_PROCESSAMENTO'
  );
  IF occupied_new_code_count <> 0 THEN
    RAISE EXCEPTION 'A final category code is already occupied';
  END IF;

  SELECT count(*) INTO occupied_new_id_count
  FROM financial_categories
  WHERE id IN (
    'fcat_' || md5('custos_diretos_plataforma'),
    'fcat_' || md5('operacoes_e_suporte'),
    'fcat_' || md5('tecnologia_e_produto'),
    'fcat_' || md5('despesas_financeiras'),
    'fcat_' || md5('publicidade_digital'),
    'fcat_' || md5('ajustes_e_deducoes_receita'),
    'fcat_' || md5('ajustes_e_deducoes_receita.chargebacks'),
    'fcat_' || md5('valores_em_transito'),
    'fcat_' || md5('valores_em_transito.processador'),
    'fcat_' || md5('valores_em_transito.recebiveis'),
    'fcat_' || md5('valores_em_transito.reembolsos_processamento')
  );
  IF occupied_new_id_count <> 0 THEN
    RAISE EXCEPTION 'A deterministic new category id is already occupied';
  END IF;

  SELECT count(*) INTO current_count FROM financial_categories;
  IF current_count <> 40 THEN
    RAISE EXCEPTION 'Expected 40 finance categories, found %', current_count;
  END IF;

  WITH expected_legacy(code) AS (
    VALUES
      ('receita'),('receita.taxa_corrida'),('receita.adesao_gestor'),('receita.mensalidade'),('receita.servico_comercial'),('receita.combo_premium'),('receita.outras_receitas'),
      ('despesa'),('despesa.aws'),('despesa.cloudflare'),('despesa.twilio'),('despesa.google_play'),('despesa.expo'),('despesa.dominio'),('despesa.contabilidade'),('despesa.juridico'),
      ('despesa.marketing'),('despesa.taxas_bancarias'),('despesa.sumup'),('despesa.asaas'),('despesa.despesas_municipais'),('despesa.equipamentos'),('despesa.telefonia_internet'),
      ('despesa.reembolsos'),('despesa.pro_labore'),('despesa.impostos'),('despesa.outras_despesas'),
      ('aporte'),('aporte.socio'),('retirada'),('retirada.socio'),('transferencia'),('transferencia.interna'),
      ('passivo'),('passivo.creditos_pre_pagos'),('passivo.valores_motoristas'),('passivo.valores_gestores'),('passivo.valores_comercios'),('passivo.retencoes'),('passivo.outros_terceiros')
  )
  SELECT count(*) INTO missing_legacy_count
  FROM (
    SELECT code FROM expected_legacy
    EXCEPT
    SELECT code FROM financial_categories
  ) missing;
  IF missing_legacy_count <> 0 THEN
    RAISE EXCEPTION 'Missing expected legacy categories';
  END IF;

  WITH expected_legacy(code) AS (
    VALUES
      ('receita'),('receita.taxa_corrida'),('receita.adesao_gestor'),('receita.mensalidade'),('receita.servico_comercial'),('receita.combo_premium'),('receita.outras_receitas'),
      ('despesa'),('despesa.aws'),('despesa.cloudflare'),('despesa.twilio'),('despesa.google_play'),('despesa.expo'),('despesa.dominio'),('despesa.contabilidade'),('despesa.juridico'),
      ('despesa.marketing'),('despesa.taxas_bancarias'),('despesa.sumup'),('despesa.asaas'),('despesa.despesas_municipais'),('despesa.equipamentos'),('despesa.telefonia_internet'),
      ('despesa.reembolsos'),('despesa.pro_labore'),('despesa.impostos'),('despesa.outras_despesas'),
      ('aporte'),('aporte.socio'),('retirada'),('retirada.socio'),('transferencia'),('transferencia.interna'),
      ('passivo'),('passivo.creditos_pre_pagos'),('passivo.valores_motoristas'),('passivo.valores_gestores'),('passivo.valores_comercios'),('passivo.retencoes'),('passivo.outros_terceiros')
  )
  SELECT count(*) INTO unexpected_legacy_count
  FROM (
    SELECT code FROM financial_categories
    EXCEPT
    SELECT code FROM expected_legacy
  ) unexpected;
  IF unexpected_legacy_count <> 0 THEN
    RAISE EXCEPTION 'Unexpected finance category codes found in legacy baseline';
  END IF;

  WITH expected_legacy_ids(id) AS (
    VALUES
      ('fcat_' || md5('receita')),('fcat_' || md5('receita.taxa_corrida')),('fcat_' || md5('receita.adesao_gestor')),('fcat_' || md5('receita.mensalidade')),
      ('fcat_' || md5('receita.servico_comercial')),('fcat_' || md5('receita.combo_premium')),('fcat_' || md5('receita.outras_receitas')),
      ('fcat_' || md5('despesa')),('fcat_' || md5('despesa.aws')),('fcat_' || md5('despesa.cloudflare')),('fcat_' || md5('despesa.twilio')),('fcat_' || md5('despesa.google_play')),
      ('fcat_' || md5('despesa.expo')),('fcat_' || md5('despesa.dominio')),('fcat_' || md5('despesa.contabilidade')),('fcat_' || md5('despesa.juridico')),('fcat_' || md5('despesa.marketing')),
      ('fcat_' || md5('despesa.taxas_bancarias')),('fcat_' || md5('despesa.sumup')),('fcat_' || md5('despesa.asaas')),('fcat_' || md5('despesa.despesas_municipais')),
      ('fcat_' || md5('despesa.equipamentos')),('fcat_' || md5('despesa.telefonia_internet')),('fcat_' || md5('despesa.reembolsos')),('fcat_' || md5('despesa.pro_labore')),
      ('fcat_' || md5('despesa.impostos')),('fcat_' || md5('despesa.outras_despesas')),
      ('fcat_' || md5('aporte')),('fcat_' || md5('aporte.socio')),('fcat_' || md5('retirada')),('fcat_' || md5('retirada.socio')),('fcat_' || md5('transferencia')),('fcat_' || md5('transferencia.interna')),
      ('fcat_' || md5('passivo')),('fcat_' || md5('passivo.creditos_pre_pagos')),('fcat_' || md5('passivo.valores_motoristas')),('fcat_' || md5('passivo.valores_gestores')),
      ('fcat_' || md5('passivo.valores_comercios')),('fcat_' || md5('passivo.retencoes')),('fcat_' || md5('passivo.outros_terceiros'))
  )
  SELECT count(*) INTO missing_legacy_id_count
  FROM (
    SELECT id FROM expected_legacy_ids
    EXCEPT
    SELECT id FROM financial_categories
  ) missing;
  IF missing_legacy_id_count <> 0 THEN
    RAISE EXCEPTION 'Missing expected legacy category ids';
  END IF;

  WITH expected_legacy_ids(id) AS (
    VALUES
      ('fcat_' || md5('receita')),('fcat_' || md5('receita.taxa_corrida')),('fcat_' || md5('receita.adesao_gestor')),('fcat_' || md5('receita.mensalidade')),
      ('fcat_' || md5('receita.servico_comercial')),('fcat_' || md5('receita.combo_premium')),('fcat_' || md5('receita.outras_receitas')),
      ('fcat_' || md5('despesa')),('fcat_' || md5('despesa.aws')),('fcat_' || md5('despesa.cloudflare')),('fcat_' || md5('despesa.twilio')),('fcat_' || md5('despesa.google_play')),
      ('fcat_' || md5('despesa.expo')),('fcat_' || md5('despesa.dominio')),('fcat_' || md5('despesa.contabilidade')),('fcat_' || md5('despesa.juridico')),('fcat_' || md5('despesa.marketing')),
      ('fcat_' || md5('despesa.taxas_bancarias')),('fcat_' || md5('despesa.sumup')),('fcat_' || md5('despesa.asaas')),('fcat_' || md5('despesa.despesas_municipais')),
      ('fcat_' || md5('despesa.equipamentos')),('fcat_' || md5('despesa.telefonia_internet')),('fcat_' || md5('despesa.reembolsos')),('fcat_' || md5('despesa.pro_labore')),
      ('fcat_' || md5('despesa.impostos')),('fcat_' || md5('despesa.outras_despesas')),
      ('fcat_' || md5('aporte')),('fcat_' || md5('aporte.socio')),('fcat_' || md5('retirada')),('fcat_' || md5('retirada.socio')),('fcat_' || md5('transferencia')),('fcat_' || md5('transferencia.interna')),
      ('fcat_' || md5('passivo')),('fcat_' || md5('passivo.creditos_pre_pagos')),('fcat_' || md5('passivo.valores_motoristas')),('fcat_' || md5('passivo.valores_gestores')),
      ('fcat_' || md5('passivo.valores_comercios')),('fcat_' || md5('passivo.retencoes')),('fcat_' || md5('passivo.outros_terceiros'))
  )
  SELECT count(*) INTO unexpected_legacy_id_count
  FROM (
    SELECT id FROM financial_categories
    EXCEPT
    SELECT id FROM expected_legacy_ids
  ) unexpected;
  IF unexpected_legacy_id_count <> 0 THEN
    RAISE EXCEPTION 'Unexpected legacy category ids found in baseline';
  END IF;

  INSERT INTO financial_categories (
    id,
    code,
    name,
    kind,
    parent_id,
    default_direction,
    requires_document,
    is_system,
    is_active,
    sort_order,
    created_by_admin_id,
    updated_by_admin_id,
    updated_at
  )
  SELECT
    id,
    code,
    name,
    kind::financial_category_kind,
    CASE WHEN parent_source IS NULL THEN NULL ELSE 'fcat_' || md5(parent_source) END,
    default_direction::financial_direction,
    requires_document,
    is_system,
    is_active,
    sort_order,
    NULL,
    NULL,
    now()
  FROM (
    VALUES
      ('fcat_' || md5('custos_diretos_plataforma'),'CUSTOS_DIRETOS_PLATAFORMA','Custos diretos da plataforma','EXPENSE',NULL::text,'OUT',false,true,true,3000),
      ('fcat_' || md5('operacoes_e_suporte'),'OPERACOES_E_SUPORTE','Operações e suporte','EXPENSE',NULL::text,'OUT',false,true,true,4000),
      ('fcat_' || md5('tecnologia_e_produto'),'TECNOLOGIA_E_PRODUTO','Tecnologia e produto','EXPENSE',NULL::text,'OUT',false,true,true,5000),
      ('fcat_' || md5('despesas_financeiras'),'DESPESAS_FINANCEIRAS','Despesas financeiras','EXPENSE',NULL::text,'OUT',false,true,true,8000),
      ('fcat_' || md5('ajustes_e_deducoes_receita'),'AJUSTES_E_DEDUCOES_RECEITA','Ajustes e deduções de receita','ADJUSTMENT',NULL::text,'OUT',false,true,true,9000),
      ('fcat_' || md5('valores_em_transito'),'VALORES_EM_TRANSITO','Valores em trânsito','CLEARING',NULL::text,'OUT',false,true,true,14000),
      ('fcat_' || md5('publicidade_digital'),'PUBLICIDADE_DIGITAL','Publicidade digital','CLEARING','valores_em_transito','OUT',false,false,true,14040),
      ('fcat_' || md5('ajustes_e_deducoes_receita.chargebacks'),'CHARGEBACKS_LIQUIDACAO','Chargebacks liquidação','ADJUSTMENT','ajustes_e_deducoes_receita','OUT',false,true,true,9010),
      ('fcat_' || md5('valores_em_transito.processador'),'VALORES_PROCESSADOR','Valores processador','CLEARING','valores_em_transito','OUT',false,true,true,14010),
      ('fcat_' || md5('valores_em_transito.recebiveis'),'RECEBIVEIS_LIQUIDAR','Recebíveis a liquidar','CLEARING','valores_em_transito','OUT',false,true,true,14020),
      ('fcat_' || md5('valores_em_transito.reembolsos_processamento'),'REEMBOLSOS_PROCESSAMENTO','Reembolsos processamento','CLEARING','valores_em_transito','OUT',false,true,true,14030)
  ) AS new_rows(id, code, name, kind, parent_source, default_direction, requires_document, is_active, is_system, sort_order);

  GET DIAGNOSTICS inserted_new_count = ROW_COUNT;
  IF inserted_new_count <> 11 THEN
    RAISE EXCEPTION 'Expected 11 new category inserts, affected %', inserted_new_count;
  END IF;

  WITH legacy_updates AS (
    SELECT * FROM (VALUES
      ('receita','RECEITAS_OPERACIONAIS','Receitas operacionais','REVENUE',NULL::text,'IN',false,true,true,1000),
      ('receita.taxa_corrida','TAXA_CORRIDA','Taxa de corrida','REVENUE','receita','IN',false,true,true,1010),
      ('receita.adesao_gestor','ADESAO_GESTOR','Adesão de gestor','REVENUE','receita','IN',false,true,true,1020),
      ('despesa.despesas_municipais','GESTAO_TERRITORIAL','Gestão territorial','REVENUE','receita','IN',false,true,true,1030),
      ('receita.servico_comercial','SERVICO_COMERCIAL','Serviço comercial','REVENUE','receita','IN',false,true,true,1040),
      ('receita.outras_receitas','OUTRAS_RECEITAS','Outras receitas','REVENUE','receita','IN',false,true,true,1050),
      ('receita.mensalidade','RECEITA_MENSALIDADE_LEGACY','Mensalidade (legado)','REVENUE','receita','IN',false,false,true,1060),

      ('despesa','DESPESAS_ADMINISTRATIVAS','Despesas administrativas','EXPENSE',NULL::text,'OUT',false,true,true,7000),
      ('despesa.marketing','MARKETING_E_VENDAS','Marketing e vendas','EXPENSE',NULL::text,'OUT',false,true,true,6000),
      ('receita.combo_premium','COMBO_PREMIUM','Combo premium','EXPENSE','despesa.marketing','OUT',false,false,true,6010),
      ('despesa.aws','AWS','AWS','EXPENSE','tecnologia_e_produto','OUT',false,true,true,5010),
      ('despesa.cloudflare','CLOUDFLARE','Cloudflare','EXPENSE','tecnologia_e_produto','OUT',false,true,true,5020),
      ('despesa.google_play','GOOGLE_PLAY_STORE','Google Play Store','EXPENSE','tecnologia_e_produto','OUT',false,true,true,5030),
      ('despesa.expo','EXPO','Expo','EXPENSE','tecnologia_e_produto','OUT',false,true,true,5040),
      ('despesa.dominio','DOMINIOS_E_CERTIFICADOS','Domínios e certificados','EXPENSE','tecnologia_e_produto','OUT',false,true,true,5050),
      ('despesa.equipamentos','EQUIPAMENTOS_LEGACY','Equipamentos (legado)','EXPENSE','tecnologia_e_produto','OUT',false,false,true,5060),
      ('despesa.twilio','TWILIO','Twilio','EXPENSE','operacoes_e_suporte','OUT',false,true,true,4010),
      ('despesa.telefonia_internet','TELEFONIA_INTERNET','Telefonia e internet','EXPENSE','operacoes_e_suporte','OUT',false,true,true,4020),
      ('despesa.juridico','REGULACAO_MUNICIPAL','Regulação municipal','EXPENSE','operacoes_e_suporte','OUT',false,true,true,4030),
      ('despesa.contabilidade','CONTABILIDADE','Contabilidade','EXPENSE','despesa','OUT',false,false,true,7010),
      ('despesa.pro_labore','PRO_LABORE','Pró-labore','EXPENSE','despesa','OUT',false,false,true,7020),
      ('despesa.outras_despesas','OUTRAS_DESPESAS','Outras despesas','EXPENSE','despesa','OUT',false,false,true,7030),
      ('despesa.sumup','PROCESSAMENTO_PAGAMENTOS','Processamento de pagamentos','EXPENSE','despesas_financeiras','OUT',false,true,true,8010),
      ('despesa.taxas_bancarias','TAXAS_BANCARIAS','Taxas bancárias','EXPENSE','despesas_financeiras','OUT',false,true,true,8020),
      ('despesa.reembolsos','REEMBOLSOS','Reembolsos','EXPENSE','despesas_financeiras','OUT',false,false,true,8030),
      ('despesa.asaas','ASAAS_LEGACY','Asaas (legado)','EXPENSE','despesas_financeiras','OUT',false,false,true,8040),
      ('despesa.impostos','IMPOSTOS_LEGACY','Impostos (legado)','EXPENSE','despesas_financeiras','OUT',false,false,true,8050),

      ('aporte','APORTES','Aportes','CONTRIBUTION',NULL::text,'IN',false,true,true,10000),
      ('aporte.socio','APORTE_SOCIO','Aporte de sócio','CONTRIBUTION','aporte','IN',false,true,true,10010),

      ('retirada','RETIRADAS','Retiradas','WITHDRAWAL',NULL::text,'OUT',false,true,true,11000),
      ('retirada.socio','RETIRADA_SOCIO','Retirada de sócio','WITHDRAWAL','retirada','OUT',false,true,true,11010),

      ('transferencia','TRANSFERENCIAS','Transferências','TRANSFER',NULL::text,'OUT',false,true,true,12000),
      ('transferencia.interna','TRANSFERENCIA_INTERNA','Transferência interna','TRANSFER','transferencia','OUT',false,true,true,12010),

      ('passivo','OBRIGACOES_OPERACIONAIS','Obrigações operacionais','LIABILITY',NULL::text,'OUT',false,true,true,13000),
      ('passivo.creditos_pre_pagos','CREDITOS_PRE_PAGOS','Créditos pré-pagos','LIABILITY','passivo','OUT',false,true,true,13010),
      ('passivo.valores_motoristas','VALORES_MOTORISTAS','Valores de motoristas','LIABILITY','passivo','OUT',false,true,true,13020),
      ('passivo.valores_gestores','VALORES_GESTORES','Valores de gestores','LIABILITY','passivo','OUT',false,true,true,13030),
      ('passivo.valores_comercios','VALORES_COMERCIOS','Valores de comércios','LIABILITY','passivo','OUT',false,true,true,13040),
      ('passivo.retencoes','RETENCOES','Retenções','LIABILITY','passivo','OUT',false,true,true,13050),
      ('passivo.outros_terceiros','OUTROS_TERCEIROS','Outros terceiros','LIABILITY','passivo','OUT',false,true,true,13060)
    ) AS t(source_code, final_code, final_name, final_kind, parent_source, final_direction, final_requires_document, final_is_active, final_is_system, final_sort_order)
  )
  UPDATE financial_categories AS fc
  SET
    code = legacy_updates.final_code,
    name = legacy_updates.final_name,
    kind = legacy_updates.final_kind::financial_category_kind,
    parent_id = CASE WHEN legacy_updates.parent_source IS NULL THEN NULL ELSE 'fcat_' || md5(legacy_updates.parent_source) END,
    default_direction = legacy_updates.final_direction::financial_direction,
    requires_document = legacy_updates.final_requires_document,
    is_system = legacy_updates.final_is_system,
    is_active = legacy_updates.final_is_active,
    sort_order = legacy_updates.final_sort_order,
    updated_by_admin_id = NULL,
    updated_at = now()
  FROM legacy_updates
  WHERE fc.id = 'fcat_' || md5(legacy_updates.source_code);

  GET DIAGNOSTICS updated_legacy_count = ROW_COUNT;
  IF updated_legacy_count <> 40 THEN
    RAISE EXCEPTION 'Expected 40 legacy updates, affected %', updated_legacy_count;
  END IF;
END $$;

DO $$
DECLARE
  final_count integer;
  final_active_count integer;
  final_inactive_count integer;
  final_root_count integer;
  final_child_count integer;
  duplicate_code_count integer;
  child_parent_mismatch integer;
  inactive_parent_violation integer;
BEGIN
  SELECT count(*) INTO final_count FROM financial_categories;
  IF final_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 finance categories after normalization, found %', final_count;
  END IF;

  SELECT count(*) INTO final_active_count FROM financial_categories WHERE is_active IS TRUE;
  IF final_active_count <> 41 THEN
    RAISE EXCEPTION 'Expected 41 active finance categories after normalization, found %', final_active_count;
  END IF;

  SELECT count(*) INTO final_inactive_count FROM financial_categories WHERE is_active IS FALSE;
  IF final_inactive_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 inactive finance categories after normalization, found %', final_inactive_count;
  END IF;

  SELECT count(*) INTO final_root_count FROM financial_categories WHERE parent_id IS NULL;
  IF final_root_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 root finance categories after normalization, found %', final_root_count;
  END IF;

  SELECT count(*) INTO final_child_count FROM financial_categories WHERE parent_id IS NOT NULL;
  IF final_child_count <> 38 THEN
    RAISE EXCEPTION 'Expected 38 child finance categories after normalization, found %', final_child_count;
  END IF;

  SELECT count(*) INTO duplicate_code_count
  FROM (
    SELECT code
    FROM financial_categories
    GROUP BY code
    HAVING count(*) > 1
  ) dup;
  IF duplicate_code_count <> 0 THEN
    RAISE EXCEPTION 'Duplicate codes detected after normalization';
  END IF;

  SELECT count(*) INTO child_parent_mismatch
  FROM financial_categories child
  JOIN financial_categories parent ON parent.id = child.parent_id
  WHERE child.kind <> parent.kind;
  IF child_parent_mismatch <> 0 THEN
    RAISE EXCEPTION 'Found finance categories with mismatched parent kind';
  END IF;

  SELECT count(*) INTO inactive_parent_violation
  FROM financial_categories child
  JOIN financial_categories parent ON parent.id = child.parent_id
  WHERE child.is_active IS TRUE AND parent.is_active IS FALSE;
  IF inactive_parent_violation <> 0 THEN
    RAISE EXCEPTION 'Found active finance categories with inactive parent';
  END IF;
END $$;
