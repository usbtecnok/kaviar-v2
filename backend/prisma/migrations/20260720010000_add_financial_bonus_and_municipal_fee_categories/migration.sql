-- Phase 1C-B 3B-1.1: add the two deferred postable finance categories.
--
-- New categories (titles stored in "name"; catalog has no description column, so the
-- approved descriptions are recorded here for audit):
--   BONUS_ANUAL_MOTORISTAS_A_PAGAR (LIABILITY, child of OBRIGACOES_OPERACIONAIS):
--     Obrigações acumuladas decorrentes do programa anual de bônus destinado aos motoristas.
--     No percentage is hardcoded; the bonus rate is a future configurable automation rule.
--   TAXAS_MUNICIPAIS_SOBRE_CORRIDAS (EXPENSE, child of OPERACOES_E_SUPORTE):
--     Taxas e encargos municipais incidentes sobre operações de transporte intermediadas pela plataforma.
--     No city or rate is hardcoded; municipality comes from cost center/territory metadata.
--
-- Defensive migration: validates the exact 3B-1 catalog state before inserting, is a
-- safe no-op when both categories already exist in their expected final shape, and
-- never creates accounts, transactions or allocations.

DO $$
DECLARE
  bonus_id text := 'fcat_fb31c48ce603495524e0afcb71625353';
  bonus_code text := 'BONUS_ANUAL_MOTORISTAS_A_PAGAR';
  bonus_parent_id text := 'fcat_4c30cc6b6dd82c489d5748dd50e2dbf9';
  bonus_sort_order integer := 13070;

  municipal_id text := 'fcat_cd17b84eaa92c309e549b872b98146ac';
  municipal_code text := 'TAXAS_MUNICIPAIS_SOBRE_CORRIDAS';
  municipal_parent_id text := 'fcat_95cbbd9bad2fbecfce1f9c76829bd191';
  municipal_sort_order integer := 4040;

  bonus_exact_count integer;
  municipal_exact_count integer;
  new_code_or_id_count integer;

  total_count integer;
  active_count integer;
  inactive_count integer;
  root_count integer;
  child_count integer;
  unique_id_count integer;
  unique_code_count integer;

  postable_true_count integer;
  postable_false_count integer;
  postable_null_count integer;

  revenue_count integer;
  expense_count integer;
  adjustment_count integer;
  contribution_count integer;
  withdrawal_count integer;
  transfer_count integer;
  liability_count integer;
  clearing_count integer;

  bonus_parent_count integer;
  municipal_parent_count integer;

  tx_count_before integer;
  alloc_count_before integer;
  account_count_before integer;
  cost_center_count_before integer;
  policy_count_before integer;

  inserted_rows integer;

  parent_true_count integer;
  inactive_true_count integer;
  root_true_count integer;
  new_children_count integer;
  new_usage_count integer;

  tx_count_after integer;
  alloc_count_after integer;
  account_count_after integer;
  cost_center_count_after integer;
  policy_count_after integer;
BEGIN
  SELECT count(*) INTO bonus_exact_count
  FROM financial_categories
  WHERE id = bonus_id
    AND code = bonus_code
    AND name = 'Bônus anual de motoristas a pagar'
    AND kind = 'LIABILITY'::financial_category_kind
    AND parent_id = bonus_parent_id
    AND default_direction = 'OUT'::financial_direction
    AND requires_document = false
    AND is_system = true
    AND is_active = true
    AND is_postable = true
    AND sort_order = bonus_sort_order;

  SELECT count(*) INTO municipal_exact_count
  FROM financial_categories
  WHERE id = municipal_id
    AND code = municipal_code
    AND name = 'Taxas municipais sobre corridas'
    AND kind = 'EXPENSE'::financial_category_kind
    AND parent_id = municipal_parent_id
    AND default_direction = 'OUT'::financial_direction
    AND requires_document = false
    AND is_system = true
    AND is_active = true
    AND is_postable = true
    AND sort_order = municipal_sort_order;

  IF bonus_exact_count = 1 AND municipal_exact_count = 1 THEN
    RAISE NOTICE '3B-1.1 categories already present in expected shape; skipping as idempotent no-op';
    RETURN;
  END IF;

  SELECT count(*) INTO new_code_or_id_count
  FROM financial_categories
  WHERE id IN (bonus_id, municipal_id)
     OR code IN (bonus_code, municipal_code);

  IF new_code_or_id_count <> 0 THEN
    RAISE EXCEPTION '3B-1.1 target ids/codes partially occupied with unexpected shape, found % rows', new_code_or_id_count;
  END IF;

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
    RAISE EXCEPTION 'Expected 51 finance categories before 3B-1.1 additions, found %', total_count;
  END IF;
  IF active_count <> 42 THEN
    RAISE EXCEPTION 'Expected 42 active finance categories before 3B-1.1 additions, found %', active_count;
  END IF;
  IF inactive_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 inactive finance categories before 3B-1.1 additions, found %', inactive_count;
  END IF;
  IF root_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 root finance categories before 3B-1.1 additions, found %', root_count;
  END IF;
  IF child_count <> 38 THEN
    RAISE EXCEPTION 'Expected 38 child finance categories before 3B-1.1 additions, found %', child_count;
  END IF;
  IF unique_id_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category ids before 3B-1.1 additions, found %', unique_id_count;
  END IF;
  IF unique_code_count <> 51 THEN
    RAISE EXCEPTION 'Expected 51 unique finance category codes before 3B-1.1 additions, found %', unique_code_count;
  END IF;

  SELECT
    count(*) FILTER (WHERE is_postable = true),
    count(*) FILTER (WHERE is_postable = false),
    count(*) FILTER (WHERE is_postable IS NULL)
  INTO postable_true_count, postable_false_count, postable_null_count
  FROM financial_categories;

  IF postable_true_count <> 29 THEN
    RAISE EXCEPTION 'Expected is_postable=true for 29 categories before 3B-1.1 additions, found %', postable_true_count;
  END IF;
  IF postable_false_count <> 22 THEN
    RAISE EXCEPTION 'Expected is_postable=false for 22 categories before 3B-1.1 additions, found %', postable_false_count;
  END IF;
  IF postable_null_count <> 0 THEN
    RAISE EXCEPTION 'Expected no NULL is_postable before 3B-1.1 additions, found %', postable_null_count;
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

  IF revenue_count <> 7 OR expense_count <> 25 OR adjustment_count <> 2 OR contribution_count <> 2
     OR withdrawal_count <> 2 OR transfer_count <> 2 OR liability_count <> 7 OR clearing_count <> 4 THEN
    RAISE EXCEPTION 'Unexpected kind distribution before 3B-1.1 additions (REVENUE=% EXPENSE=% ADJUSTMENT=% CONTRIBUTION=% WITHDRAWAL=% TRANSFER=% LIABILITY=% CLEARING=%)',
      revenue_count, expense_count, adjustment_count, contribution_count, withdrawal_count, transfer_count, liability_count, clearing_count;
  END IF;

  SELECT count(*) INTO bonus_parent_count
  FROM financial_categories
  WHERE id = bonus_parent_id
    AND code = 'OBRIGACOES_OPERACIONAIS'
    AND kind = 'LIABILITY'::financial_category_kind
    AND parent_id IS NULL
    AND is_active = true
    AND is_postable = false;

  IF bonus_parent_count <> 1 THEN
    RAISE EXCEPTION 'OBRIGACOES_OPERACIONAIS parent is not in expected active non-postable root state for 3B-1.1';
  END IF;

  SELECT count(*) INTO municipal_parent_count
  FROM financial_categories
  WHERE id = municipal_parent_id
    AND code = 'OPERACOES_E_SUPORTE'
    AND kind = 'EXPENSE'::financial_category_kind
    AND parent_id IS NULL
    AND is_active = true
    AND is_postable = false;

  IF municipal_parent_count <> 1 THEN
    RAISE EXCEPTION 'OPERACOES_E_SUPORTE parent is not in expected active non-postable root state for 3B-1.1';
  END IF;

  SELECT count(*) INTO tx_count_before FROM financial_transactions;
  SELECT count(*) INTO alloc_count_before FROM financial_transaction_allocations;
  SELECT count(*) INTO account_count_before FROM financial_accounts;
  SELECT count(*) INTO cost_center_count_before FROM financial_cost_centers;
  SELECT count(*) INTO policy_count_before FROM financial_recognition_policies;

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
    is_postable,
    sort_order,
    created_by_admin_id,
    updated_by_admin_id,
    created_at,
    updated_at
  )
  VALUES
    (
      bonus_id,
      bonus_code,
      'Bônus anual de motoristas a pagar',
      'LIABILITY'::financial_category_kind,
      bonus_parent_id,
      'OUT'::financial_direction,
      false,
      true,
      true,
      true,
      bonus_sort_order,
      NULL,
      NULL,
      now(),
      now()
    ),
    (
      municipal_id,
      municipal_code,
      'Taxas municipais sobre corridas',
      'EXPENSE'::financial_category_kind,
      municipal_parent_id,
      'OUT'::financial_direction,
      false,
      true,
      true,
      true,
      municipal_sort_order,
      NULL,
      NULL,
      now(),
      now()
    );

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  IF inserted_rows <> 2 THEN
    RAISE EXCEPTION 'Expected 2 finance categories inserted by 3B-1.1, inserted %', inserted_rows;
  END IF;

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

  IF total_count <> 53 THEN
    RAISE EXCEPTION 'Expected 53 finance categories after 3B-1.1 additions, found %', total_count;
  END IF;
  IF active_count <> 44 THEN
    RAISE EXCEPTION 'Expected 44 active finance categories after 3B-1.1 additions, found %', active_count;
  END IF;
  IF inactive_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 inactive finance categories after 3B-1.1 additions, found %', inactive_count;
  END IF;
  IF root_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 root finance categories after 3B-1.1 additions, found %', root_count;
  END IF;
  IF child_count <> 40 THEN
    RAISE EXCEPTION 'Expected 40 child finance categories after 3B-1.1 additions, found %', child_count;
  END IF;
  IF unique_id_count <> 53 THEN
    RAISE EXCEPTION 'Expected 53 unique finance category ids after 3B-1.1 additions, found %', unique_id_count;
  END IF;
  IF unique_code_count <> 53 THEN
    RAISE EXCEPTION 'Expected 53 unique finance category codes after 3B-1.1 additions, found %', unique_code_count;
  END IF;

  SELECT
    count(*) FILTER (WHERE is_postable = true),
    count(*) FILTER (WHERE is_postable = false),
    count(*) FILTER (WHERE is_postable IS NULL)
  INTO postable_true_count, postable_false_count, postable_null_count
  FROM financial_categories;

  IF postable_true_count <> 31 THEN
    RAISE EXCEPTION 'Expected is_postable=true for 31 categories after 3B-1.1 additions, found %', postable_true_count;
  END IF;
  IF postable_false_count <> 22 THEN
    RAISE EXCEPTION 'Expected is_postable=false for 22 categories after 3B-1.1 additions, found %', postable_false_count;
  END IF;
  IF postable_null_count <> 0 THEN
    RAISE EXCEPTION 'Expected no NULL is_postable after 3B-1.1 additions, found %', postable_null_count;
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

  IF revenue_count <> 7 OR expense_count <> 26 OR adjustment_count <> 2 OR contribution_count <> 2
     OR withdrawal_count <> 2 OR transfer_count <> 2 OR liability_count <> 8 OR clearing_count <> 4 THEN
    RAISE EXCEPTION 'Unexpected kind distribution after 3B-1.1 additions (REVENUE=% EXPENSE=% ADJUSTMENT=% CONTRIBUTION=% WITHDRAWAL=% TRANSFER=% LIABILITY=% CLEARING=%)',
      revenue_count, expense_count, adjustment_count, contribution_count, withdrawal_count, transfer_count, liability_count, clearing_count;
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
    RAISE EXCEPTION 'Expected no category with children to be postable after 3B-1.1, found %', parent_true_count;
  END IF;

  SELECT count(*) INTO inactive_true_count
  FROM financial_categories
  WHERE is_active = false
    AND is_postable = true;

  IF inactive_true_count <> 0 THEN
    RAISE EXCEPTION 'Expected no inactive category to be postable after 3B-1.1, found %', inactive_true_count;
  END IF;

  SELECT count(*) INTO root_true_count
  FROM financial_categories
  WHERE parent_id IS NULL
    AND is_postable = true;

  IF root_true_count <> 0 THEN
    RAISE EXCEPTION 'Expected no root category to be postable after 3B-1.1, found %', root_true_count;
  END IF;

  SELECT count(*) INTO new_children_count
  FROM financial_categories
  WHERE parent_id IN (bonus_id, municipal_id);

  IF new_children_count <> 0 THEN
    RAISE EXCEPTION 'Expected 3B-1.1 categories to be terminal, found % children', new_children_count;
  END IF;

  SELECT
    (SELECT count(*) FROM financial_transactions WHERE category_id IN (bonus_id, municipal_id))
    + (SELECT count(*) FROM financial_transaction_allocations WHERE category_id IN (bonus_id, municipal_id))
  INTO new_usage_count;

  IF new_usage_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero usage for 3B-1.1 categories, found %', new_usage_count;
  END IF;

  SELECT count(*) INTO tx_count_after FROM financial_transactions;
  SELECT count(*) INTO alloc_count_after FROM financial_transaction_allocations;
  SELECT count(*) INTO account_count_after FROM financial_accounts;
  SELECT count(*) INTO cost_center_count_after FROM financial_cost_centers;
  SELECT count(*) INTO policy_count_after FROM financial_recognition_policies;

  IF tx_count_after <> tx_count_before THEN
    RAISE EXCEPTION 'financial_transactions count changed unexpectedly during 3B-1.1 (% -> %)', tx_count_before, tx_count_after;
  END IF;
  IF alloc_count_after <> alloc_count_before THEN
    RAISE EXCEPTION 'financial_transaction_allocations count changed unexpectedly during 3B-1.1 (% -> %)', alloc_count_before, alloc_count_after;
  END IF;
  IF account_count_after <> account_count_before THEN
    RAISE EXCEPTION 'financial_accounts count changed unexpectedly during 3B-1.1 (% -> %)', account_count_before, account_count_after;
  END IF;
  IF cost_center_count_after <> cost_center_count_before THEN
    RAISE EXCEPTION 'financial_cost_centers count changed unexpectedly during 3B-1.1 (% -> %)', cost_center_count_before, cost_center_count_after;
  END IF;
  IF policy_count_after <> policy_count_before THEN
    RAISE EXCEPTION 'financial_recognition_policies count changed unexpectedly during 3B-1.1 (% -> %)', policy_count_before, policy_count_after;
  END IF;
END $$;
