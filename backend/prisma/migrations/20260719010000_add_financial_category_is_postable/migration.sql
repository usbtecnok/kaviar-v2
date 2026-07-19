-- Phase 1C-B 3B-1: add explicit is_postable classification for the official 51-category finance catalog.
-- Defensive migration: validate catalog shape and deterministic id/code mapping before any classification write.

DO $$
DECLARE
  expected_rows integer;
  expected_unique_ids integer;
  expected_unique_codes integer;

  total_count integer;
  active_count integer;
  inactive_count integer;
  root_count integer;
  child_count integer;
  unique_id_count integer;
  unique_code_count integer;

  revenue_count integer;
  expense_count integer;
  adjustment_count integer;
  contribution_count integer;
  withdrawal_count integer;
  transfer_count integer;
  liability_count integer;
  clearing_count integer;

  missing_expected_count integer;
  extra_actual_count integer;

  publicidade_rows integer;
  publicidade_tx_count integer;
  publicidade_alloc_count integer;

  tx_count_before integer;
  alloc_count_before integer;
  account_count_before integer;
  cost_center_count_before integer;
  policy_count_before integer;

  updated_rows integer;
  postable_true_count integer;
  postable_false_count integer;
  postable_null_count integer;

  parent_true_count integer;
  inactive_true_count integer;
  root_true_count integer;
  custos_true_count integer;
  publicidade_true_count integer;

  tx_count_after integer;
  alloc_count_after integer;
  account_count_after integer;
  cost_center_count_after integer;
  policy_count_after integer;

  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_categories'
      AND column_name = 'is_postable'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE EXCEPTION 'financial_categories.is_postable already exists';
  END IF;

  CREATE TEMP TABLE expected_financial_category_postable (
    id text PRIMARY KEY,
    code text UNIQUE,
    is_postable boolean NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO expected_financial_category_postable (id, code, is_postable)
  VALUES
    ('fcat_750ab088b8618e7c4b22ebc7c28d9ef2', 'RECEITAS_OPERACIONAIS', false),
    ('fcat_1e1b845507b2c72888ff7c9d0664e5f7', 'TAXA_CORRIDA', true),
    ('fcat_ffb5f52c9b0946d18f8edd69177a86fe', 'ADESAO_GESTOR', true),
    ('fcat_64271f7accb4ae3206d5d427eab53bd0', 'GESTAO_TERRITORIAL', true),
    ('fcat_65fcd75ef6a9367bd69badef10093235', 'SERVICO_COMERCIAL', true),
    ('fcat_7bc26a99002b22586bf8f3d8e62df701', 'OUTRAS_RECEITAS', true),
    ('fcat_252885c877b47f584a170831e9826cbd', 'RECEITA_MENSALIDADE_LEGACY', false),
    ('fcat_bafd5ddb91d03c60a27748d76e09d09c', 'DESPESAS_ADMINISTRATIVAS', false),
    ('fcat_a760da5ca4c4655821994de82acb0fb8', 'MARKETING_E_VENDAS', false),
    ('fcat_250b87f0f1a5328d43ab794d43b4389a', 'CUSTOS_DIRETOS_PLATAFORMA', false),
    ('fcat_95cbbd9bad2fbecfce1f9c76829bd191', 'OPERACOES_E_SUPORTE', false),
    ('fcat_8809bbe62cb78a37d898848ab12fe6a5', 'TECNOLOGIA_E_PRODUTO', false),
    ('fcat_89781c1326b5e4cabf100441bffdd79b', 'DESPESAS_FINANCEIRAS', false),
    ('fcat_31e30871123a6875ad17fd8624df61bd', 'COMBO_PREMIUM', false),
    ('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', true),
    ('fcat_6f33a9734b98d70c9fd80d6e48cd0cf0', 'CLOUDFLARE', true),
    ('fcat_27992c827ef0676e35138a8c31981939', 'GOOGLE_PLAY_STORE', true),
    ('fcat_6be87ef879a1a77ba11e2c1b7c1808cb', 'EXPO', true),
    ('fcat_badf4aa8fb238f545b6ee2468877de27', 'DOMINIOS_E_CERTIFICADOS', true),
    ('fcat_7d6482c651943d2c6c23dd1581673c06', 'EQUIPAMENTOS_LEGACY', false),
    ('fcat_e53f3bbfb08d5bd450e187c585ac1329', 'TWILIO', true),
    ('fcat_8fff5834777905ddcb4f04658eab1b56', 'TELEFONIA_INTERNET', true),
    ('fcat_7b5e85344192f123d2f0ec9f734c8050', 'REGULACAO_MUNICIPAL', true),
    ('fcat_e11c24a9128072b5c8d72a1160f120cb', 'CONTABILIDADE', false),
    ('fcat_26dc69afcd59ee348780a6616ad410ff', 'PRO_LABORE', false),
    ('fcat_986dd29e49fd4a974f30244fff3be359', 'OUTRAS_DESPESAS', false),
    ('fcat_db98c7abe0d5cdc80f326d904de60799', 'PROCESSAMENTO_PAGAMENTOS', true),
    ('fcat_626d1e09c46592f55bb3347b5ffcc70c', 'TAXAS_BANCARIAS', true),
    ('fcat_709f8138749f094ea890c3f5b1385df9', 'REEMBOLSOS', false),
    ('fcat_0e242985e7f492fc9c2256203b7b6db4', 'ASAAS_LEGACY', false),
    ('fcat_4ad584f0ff33840f0ef7a6daa1dd02a5', 'IMPOSTOS_LEGACY', false),
    ('fcat_531f9f95b7ba8537f54c773603cec791', 'PUBLICIDADE_DIGITAL', true),
    ('fcat_f90012ff6e8d8e576e07544cd3350e02', 'AJUSTES_E_DEDUCOES_RECEITA', false),
    ('fcat_04e6957f162773e50c4de9ef48ced019', 'CHARGEBACKS_LIQUIDACAO', true),
    ('fcat_54310b6d8acdd1df8b01f006beb923bb', 'APORTES', false),
    ('fcat_0f35bdc34e856d4e366c6b6e25205941', 'APORTE_SOCIO', true),
    ('fcat_f3d9283e3b7dcdf0e46cf8914f7317a4', 'RETIRADAS', false),
    ('fcat_fef13e02adb0cf30b67a31718ab03141', 'RETIRADA_SOCIO', true),
    ('fcat_76713996d508b18e1b36bc9a8d138db9', 'TRANSFERENCIAS', false),
    ('fcat_36d7e69accd07f9ab539f12a4b3f101e', 'TRANSFERENCIA_INTERNA', true),
    ('fcat_4c30cc6b6dd82c489d5748dd50e2dbf9', 'OBRIGACOES_OPERACIONAIS', false),
    ('fcat_5bf3c122925bbd61992ea683e02d3eb1', 'CREDITOS_PRE_PAGOS', true),
    ('fcat_6b2a3382e8e51a19cd4bc46d574c1be2', 'VALORES_MOTORISTAS', true),
    ('fcat_0bf19570c02140da0df2fa2b8062c467', 'VALORES_GESTORES', true),
    ('fcat_3b46cfde209a61fa1147695d65983f4a', 'VALORES_COMERCIOS', true),
    ('fcat_7554f1f984d6e2cec1ffebf9e9bfdf5c', 'RETENCOES', true),
    ('fcat_64b288f3a9a88d7fb337636025756bbb', 'OUTROS_TERCEIROS', true),
    ('fcat_06f6c36e2a194d6fdb0156125463d49b', 'VALORES_EM_TRANSITO', false),
    ('fcat_55aeb27283122e6d674ac56a8fd522f2', 'VALORES_PROCESSADOR', true),
    ('fcat_847582905061204c351065cd7f93b531', 'RECEBIVEIS_LIQUIDAR', true),
    ('fcat_125141013f224853afa564a2150b06a8', 'REEMBOLSOS_PROCESSAMENTO', true);

  SELECT count(*), count(DISTINCT id), count(DISTINCT code)
  INTO expected_rows, expected_unique_ids, expected_unique_codes
  FROM expected_financial_category_postable;

  IF expected_rows <> 51 OR expected_unique_ids <> 51 OR expected_unique_codes <> 51 THEN
    RAISE EXCEPTION 'Expected explicit is_postable map with 51 unique id/code entries, found rows=% ids=% codes=%', expected_rows, expected_unique_ids, expected_unique_codes;
  END IF;

  SELECT count(*) INTO tx_count_before FROM financial_transactions;
  SELECT count(*) INTO alloc_count_before FROM financial_transaction_allocations;
  SELECT count(*) INTO account_count_before FROM financial_accounts;
  SELECT count(*) INTO cost_center_count_before FROM financial_cost_centers;
  SELECT count(*) INTO policy_count_before FROM financial_recognition_policies;

  ALTER TABLE financial_categories ADD COLUMN is_postable BOOLEAN;

  SELECT
    count(*),
    count(*) FILTER (WHERE is_active),
    count(*) FILTER (WHERE NOT is_active),
    count(*) FILTER (WHERE parent_id IS NULL),
    count(*) FILTER (WHERE parent_id IS NOT NULL),
    count(DISTINCT id),
    count(DISTINCT code)
  INTO total_count, active_count, inactive_count, root_count, child_count, unique_id_count, unique_code_count
  FROM financial_categories;

  IF total_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 finance categories before is_postable classification, found %', total_count;
  END IF;
  IF active_count <> 42 THEN
    RAISE EXCEPTION 'Expected 42 active finance categories before is_postable classification, found %', active_count;
  END IF;
  IF inactive_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 inactive finance categories before is_postable classification, found %', inactive_count;
  END IF;
  IF root_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 root finance categories before is_postable classification, found %', root_count;
  END IF;
  IF child_count <> 38 THEN
    RAISE EXCEPTION 'Expected 38 child finance categories before is_postable classification, found %', child_count;
  END IF;
  IF unique_id_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category ids before is_postable classification, found %', unique_id_count;
  END IF;
  IF unique_code_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category codes before is_postable classification, found %', unique_code_count;
  END IF;

  SELECT
    count(*) FILTER (WHERE kind = 'REVENUE'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'EXPENSE'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'ADJUSTMENT'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'CONTRIBUTION'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'WITHDRAWAL'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'TRANSFER'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'LIABILITY'::financial_category_kind),
    count(*) FILTER (WHERE kind = 'CLEARING'::financial_category_kind)
  INTO revenue_count, expense_count, adjustment_count, contribution_count, withdrawal_count, transfer_count, liability_count, clearing_count
  FROM financial_categories;

  IF revenue_count <> 7 THEN
    RAISE EXCEPTION 'Expected REVENUE=7 before is_postable classification, found %', revenue_count;
  END IF;
  IF expense_count <> 25 THEN
    RAISE EXCEPTION 'Expected EXPENSE=25 before is_postable classification, found %', expense_count;
  END IF;
  IF adjustment_count <> 2 THEN
    RAISE EXCEPTION 'Expected ADJUSTMENT=2 before is_postable classification, found %', adjustment_count;
  END IF;
  IF contribution_count <> 2 THEN
    RAISE EXCEPTION 'Expected CONTRIBUTION=2 before is_postable classification, found %', contribution_count;
  END IF;
  IF withdrawal_count <> 2 THEN
    RAISE EXCEPTION 'Expected WITHDRAWAL=2 before is_postable classification, found %', withdrawal_count;
  END IF;
  IF transfer_count <> 2 THEN
    RAISE EXCEPTION 'Expected TRANSFER=2 before is_postable classification, found %', transfer_count;
  END IF;
  IF liability_count <> 7 THEN
    RAISE EXCEPTION 'Expected LIABILITY=7 before is_postable classification, found %', liability_count;
  END IF;
  IF clearing_count <> 4 THEN
    RAISE EXCEPTION 'Expected CLEARING=4 before is_postable classification, found %', clearing_count;
  END IF;

  SELECT count(*) INTO missing_expected_count
  FROM expected_financial_category_postable expected
  LEFT JOIN financial_categories actual
    ON actual.id = expected.id
   AND actual.code = expected.code
  WHERE actual.id IS NULL;

  IF missing_expected_count <> 0 THEN
    RAISE EXCEPTION 'Found % expected finance categories missing from current catalog', missing_expected_count;
  END IF;

  SELECT count(*) INTO extra_actual_count
  FROM financial_categories actual
  LEFT JOIN expected_financial_category_postable expected
    ON expected.id = actual.id
   AND expected.code = actual.code
  WHERE expected.id IS NULL;

  IF extra_actual_count <> 0 THEN
    RAISE EXCEPTION 'Found % unexpected finance categories not present in explicit expected map', extra_actual_count;
  END IF;

  SELECT count(*) INTO publicidade_rows
  FROM financial_categories
  WHERE id = 'fcat_531f9f95b7ba8537f54c773603cec791'
    AND code = 'PUBLICIDADE_DIGITAL'
    AND kind = 'EXPENSE'::financial_category_kind
    AND parent_id = 'fcat_a760da5ca4c4655821994de82acb0fb8'
    AND is_active = true
    AND sort_order = 6020;

  IF publicidade_rows <> 1 THEN
    RAISE EXCEPTION 'PUBLICIDADE_DIGITAL is not in expected corrected 3A.1 state before is_postable classification';
  END IF;

  IF tx_count_before <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transactions before is_postable classification, found %', tx_count_before;
  END IF;
  IF alloc_count_before <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transaction_allocations before is_postable classification, found %', alloc_count_before;
  END IF;

  UPDATE financial_categories actual
  SET is_postable = expected.is_postable
  FROM expected_financial_category_postable expected
  WHERE actual.id = expected.id
    AND actual.code = expected.code;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 51 THEN
    RAISE EXCEPTION 'Expected 51 finance categories classified with is_postable, updated %', updated_rows;
  END IF;

  SELECT
    count(*) FILTER (WHERE is_postable = true),
    count(*) FILTER (WHERE is_postable = false),
    count(*) FILTER (WHERE is_postable IS NULL)
  INTO postable_true_count, postable_false_count, postable_null_count
  FROM financial_categories;

  IF postable_true_count <> 29 THEN
    RAISE EXCEPTION 'Expected is_postable=true for 29 categories, found %', postable_true_count;
  END IF;
  IF postable_false_count <> 22 THEN
    RAISE EXCEPTION 'Expected is_postable=false for 22 categories, found %', postable_false_count;
  END IF;
  IF postable_null_count <> 0 THEN
    RAISE EXCEPTION 'Expected no NULL is_postable values after explicit classification, found %', postable_null_count;
  END IF;

  SELECT count(*) INTO parent_true_count
  FROM financial_categories parent
  WHERE parent.is_postable = true
    AND EXISTS (
      SELECT 1
      FROM financial_categories child
      WHERE child.parent_id = parent.id
    );

  IF parent_true_count <> 0 THEN
    RAISE EXCEPTION 'Expected no category with children to be postable, found %', parent_true_count;
  END IF;

  SELECT count(*) INTO inactive_true_count
  FROM financial_categories
  WHERE is_active = false
    AND is_postable = true;

  IF inactive_true_count <> 0 THEN
    RAISE EXCEPTION 'Expected no inactive category to be postable, found %', inactive_true_count;
  END IF;

  SELECT count(*) INTO root_true_count
  FROM financial_categories
  WHERE parent_id IS NULL
    AND is_postable = true;

  IF root_true_count <> 0 THEN
    RAISE EXCEPTION 'Expected no root category to be postable, found %', root_true_count;
  END IF;

  SELECT count(*) INTO custos_true_count
  FROM financial_categories
  WHERE code = 'CUSTOS_DIRETOS_PLATAFORMA'
    AND is_postable = true;

  IF custos_true_count <> 0 THEN
    RAISE EXCEPTION 'CUSTOS_DIRETOS_PLATAFORMA must be non-postable';
  END IF;

  SELECT count(*) INTO publicidade_true_count
  FROM financial_categories
  WHERE code = 'PUBLICIDADE_DIGITAL'
    AND id = 'fcat_531f9f95b7ba8537f54c773603cec791'
    AND is_postable = true;

  IF publicidade_true_count <> 1 THEN
    RAISE EXCEPTION 'PUBLICIDADE_DIGITAL must be postable and keep deterministic id';
  END IF;

  SELECT count(*) INTO publicidade_tx_count
  FROM financial_transactions
  WHERE category_id = 'fcat_531f9f95b7ba8537f54c773603cec791';

  SELECT count(*) INTO publicidade_alloc_count
  FROM financial_transaction_allocations
  WHERE category_id = 'fcat_531f9f95b7ba8537f54c773603cec791';

  IF publicidade_tx_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transactions for PUBLICIDADE_DIGITAL after classification, found %', publicidade_tx_count;
  END IF;
  IF publicidade_alloc_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transaction_allocations for PUBLICIDADE_DIGITAL after classification, found %', publicidade_alloc_count;
  END IF;

  SELECT count(*) INTO tx_count_after FROM financial_transactions;
  SELECT count(*) INTO alloc_count_after FROM financial_transaction_allocations;
  SELECT count(*) INTO account_count_after FROM financial_accounts;
  SELECT count(*) INTO cost_center_count_after FROM financial_cost_centers;
  SELECT count(*) INTO policy_count_after FROM financial_recognition_policies;

  IF tx_count_after <> tx_count_before THEN
    RAISE EXCEPTION 'financial_transactions count changed unexpectedly (% -> %)', tx_count_before, tx_count_after;
  END IF;
  IF alloc_count_after <> alloc_count_before THEN
    RAISE EXCEPTION 'financial_transaction_allocations count changed unexpectedly (% -> %)', alloc_count_before, alloc_count_after;
  END IF;
  IF account_count_after <> account_count_before THEN
    RAISE EXCEPTION 'financial_accounts count changed unexpectedly (% -> %)', account_count_before, account_count_after;
  END IF;
  IF cost_center_count_after <> cost_center_count_before THEN
    RAISE EXCEPTION 'financial_cost_centers count changed unexpectedly (% -> %)', cost_center_count_before, cost_center_count_after;
  END IF;
  IF policy_count_after <> policy_count_before THEN
    RAISE EXCEPTION 'financial_recognition_policies count changed unexpectedly (% -> %)', policy_count_before, policy_count_after;
  END IF;

  ALTER TABLE financial_categories
    ALTER COLUMN is_postable SET NOT NULL;
END $$;
