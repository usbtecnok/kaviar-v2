-- Corrective migration 3A.1: reclassify PUBLICIDADE_DIGITAL as EXPENSE under MARKETING_E_VENDAS.
-- Defensive and transactional by design (single DO block; any exception aborts the migration).

DO $$
DECLARE
  expected_publicidade_id constant text := 'fcat_' || md5('publicidade_digital');
  expected_old_parent_id constant text := 'fcat_' || md5('valores_em_transito');
  expected_new_parent_id constant text := 'fcat_' || md5('despesa.marketing');

  total_count integer;
  unique_id_count integer;
  unique_code_count integer;
  publicidade_rows integer;
  publicidade_child_count integer;
  publicidade_tx_count integer;
  publicidade_alloc_count integer;
  marketing_rows integer;
  update_count integer;

  final_total_count integer;
  final_active_count integer;
  final_inactive_count integer;
  final_root_count integer;
  final_child_count integer;
  final_unique_id_count integer;
  final_unique_code_count integer;

  final_revenue_count integer;
  final_expense_count integer;
  final_adjustment_count integer;
  final_contribution_count integer;
  final_withdrawal_count integer;
  final_transfer_count integer;
  final_liability_count integer;
  final_clearing_count integer;

  publicidade_after_count integer;

  non_target_snapshot_before text;
  non_target_snapshot_after text;
BEGIN
  -- Baseline integrity checks.
  SELECT count(*) INTO total_count FROM financial_categories;
  IF total_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 finance categories before corrective migration, found %', total_count;
  END IF;

  SELECT count(DISTINCT id), count(DISTINCT code)
  INTO unique_id_count, unique_code_count
  FROM financial_categories;
  IF unique_id_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category ids before corrective migration, found %', unique_id_count;
  END IF;
  IF unique_code_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category codes before corrective migration, found %', unique_code_count;
  END IF;

  SELECT count(*) INTO publicidade_rows
  FROM financial_categories
  WHERE code = 'PUBLICIDADE_DIGITAL';
  IF publicidade_rows <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one PUBLICIDADE_DIGITAL category, found %', publicidade_rows;
  END IF;

  SELECT count(*) INTO publicidade_rows
  FROM financial_categories
  WHERE id = expected_publicidade_id
    AND code = 'PUBLICIDADE_DIGITAL'
    AND kind = 'CLEARING'::financial_category_kind
    AND parent_id = expected_old_parent_id
    AND is_active = false
    AND default_direction = 'OUT'::financial_direction
    AND sort_order = 14040
    AND is_system = true;
  IF publicidade_rows <> 1 THEN
    RAISE EXCEPTION 'PUBLICIDADE_DIGITAL does not match expected pre-correction state';
  END IF;

  SELECT count(*) INTO marketing_rows
  FROM financial_categories
  WHERE code = 'MARKETING_E_VENDAS'
    AND id = expected_new_parent_id
    AND kind = 'EXPENSE'::financial_category_kind
    AND is_active = true;
  IF marketing_rows <> 1 THEN
    RAISE EXCEPTION 'MARKETING_E_VENDAS missing or incompatible (expected active EXPENSE root)';
  END IF;

  SELECT count(*) INTO publicidade_child_count
  FROM financial_categories
  WHERE parent_id = expected_publicidade_id;
  IF publicidade_child_count <> 0 THEN
    RAISE EXCEPTION 'PUBLICIDADE_DIGITAL must not have child categories, found %', publicidade_child_count;
  END IF;

  SELECT count(*) INTO publicidade_tx_count
  FROM financial_transactions
  WHERE category_id = expected_publicidade_id;
  IF publicidade_tx_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transactions using PUBLICIDADE_DIGITAL, found %', publicidade_tx_count;
  END IF;

  SELECT count(*) INTO publicidade_alloc_count
  FROM financial_transaction_allocations
  WHERE category_id = expected_publicidade_id;
  IF publicidade_alloc_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero financial_transaction_allocations using PUBLICIDADE_DIGITAL, found %', publicidade_alloc_count;
  END IF;

  -- Capture full non-target snapshot to prove no collateral mutation.
  SELECT md5(coalesce(string_agg(
    id || '|' || code || '|' || name || '|' || kind::text || '|' || coalesce(parent_id, '') || '|' ||
    coalesce(default_direction::text, '') || '|' || requires_document::text || '|' ||
    is_system::text || '|' || is_active::text || '|' || sort_order::text,
    E'\n' ORDER BY id
  ), ''))
  INTO non_target_snapshot_before
  FROM financial_categories
  WHERE code <> 'PUBLICIDADE_DIGITAL';

  -- Single targeted update with expected-current-state filter.
  UPDATE financial_categories
  SET
    kind = 'EXPENSE'::financial_category_kind,
    parent_id = expected_new_parent_id,
    is_active = true,
    sort_order = 6020,
    updated_at = now()
  WHERE id = expected_publicidade_id
    AND code = 'PUBLICIDADE_DIGITAL'
    AND kind = 'CLEARING'::financial_category_kind
    AND parent_id = expected_old_parent_id
    AND is_active = false
    AND default_direction = 'OUT'::financial_direction
    AND sort_order = 14040
    AND is_system = true;

  GET DIAGNOSTICS update_count = ROW_COUNT;
  IF update_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one PUBLICIDADE_DIGITAL row update, affected %', update_count;
  END IF;

  -- Post-conditions.
  SELECT count(*) INTO final_total_count FROM financial_categories;
  IF final_total_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 finance categories after corrective migration, found %', final_total_count;
  END IF;

  SELECT
    count(*) FILTER (WHERE is_active),
    count(*) FILTER (WHERE NOT is_active),
    count(*) FILTER (WHERE parent_id IS NULL),
    count(*) FILTER (WHERE parent_id IS NOT NULL)
  INTO final_active_count, final_inactive_count, final_root_count, final_child_count
  FROM financial_categories;

  IF final_active_count <> 42 THEN
    RAISE EXCEPTION 'Expected 42 active finance categories after corrective migration, found %', final_active_count;
  END IF;
  IF final_inactive_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 inactive finance categories after corrective migration, found %', final_inactive_count;
  END IF;
  IF final_root_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 root finance categories after corrective migration, found %', final_root_count;
  END IF;
  IF final_child_count <> 38 THEN
    RAISE EXCEPTION 'Expected 38 child finance categories after corrective migration, found %', final_child_count;
  END IF;

  SELECT count(DISTINCT id), count(DISTINCT code)
  INTO final_unique_id_count, final_unique_code_count
  FROM financial_categories;
  IF final_unique_id_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category ids after corrective migration, found %', final_unique_id_count;
  END IF;
  IF final_unique_code_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category codes after corrective migration, found %', final_unique_code_count;
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
  INTO
    final_revenue_count,
    final_expense_count,
    final_adjustment_count,
    final_contribution_count,
    final_withdrawal_count,
    final_transfer_count,
    final_liability_count,
    final_clearing_count
  FROM financial_categories;

  IF final_revenue_count <> 7 THEN
    RAISE EXCEPTION 'Expected REVENUE=7 after corrective migration, found %', final_revenue_count;
  END IF;
  IF final_expense_count <> 25 THEN
    RAISE EXCEPTION 'Expected EXPENSE=25 after corrective migration, found %', final_expense_count;
  END IF;
  IF final_adjustment_count <> 2 THEN
    RAISE EXCEPTION 'Expected ADJUSTMENT=2 after corrective migration, found %', final_adjustment_count;
  END IF;
  IF final_contribution_count <> 2 THEN
    RAISE EXCEPTION 'Expected CONTRIBUTION=2 after corrective migration, found %', final_contribution_count;
  END IF;
  IF final_withdrawal_count <> 2 THEN
    RAISE EXCEPTION 'Expected WITHDRAWAL=2 after corrective migration, found %', final_withdrawal_count;
  END IF;
  IF final_transfer_count <> 2 THEN
    RAISE EXCEPTION 'Expected TRANSFER=2 after corrective migration, found %', final_transfer_count;
  END IF;
  IF final_liability_count <> 7 THEN
    RAISE EXCEPTION 'Expected LIABILITY=7 after corrective migration, found %', final_liability_count;
  END IF;
  IF final_clearing_count <> 4 THEN
    RAISE EXCEPTION 'Expected CLEARING=4 after corrective migration, found %', final_clearing_count;
  END IF;

  SELECT count(*) INTO publicidade_after_count
  FROM financial_categories
  WHERE id = expected_publicidade_id
    AND code = 'PUBLICIDADE_DIGITAL'
    AND kind = 'EXPENSE'::financial_category_kind
    AND parent_id = expected_new_parent_id
    AND is_active = true
    AND default_direction = 'OUT'::financial_direction
    AND sort_order = 6020
    AND is_system = true;
  IF publicidade_after_count <> 1 THEN
    RAISE EXCEPTION 'PUBLICIDADE_DIGITAL does not match expected post-correction state';
  END IF;

  SELECT md5(coalesce(string_agg(
    id || '|' || code || '|' || name || '|' || kind::text || '|' || coalesce(parent_id, '') || '|' ||
    coalesce(default_direction::text, '') || '|' || requires_document::text || '|' ||
    is_system::text || '|' || is_active::text || '|' || sort_order::text,
    E'\n' ORDER BY id
  ), ''))
  INTO non_target_snapshot_after
  FROM financial_categories
  WHERE code <> 'PUBLICIDADE_DIGITAL';

  IF non_target_snapshot_after IS DISTINCT FROM non_target_snapshot_before THEN
    RAISE EXCEPTION 'Detected unintended changes in categories other than PUBLICIDADE_DIGITAL';
  END IF;

END $$;
