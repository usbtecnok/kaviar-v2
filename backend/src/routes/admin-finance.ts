import { Router, Request, Response } from 'express';
import { allowFinanceAccess, authenticateAdmin } from '../middlewares/auth';
import {
  financeAccountsListQuerySchema,
  financeCategoriesListQuerySchema,
  financeCostCentersListQuerySchema,
  financeIdParamSchema,
  financeRecognitionPoliciesListQuerySchema,
  financeTransactionsListQuerySchema,
} from '../services/finance/finance-query-validation';
import {
  getFinanceAccountById,
  getFinanceCategoryById,
  getFinanceCostCenterById,
  getFinanceRecognitionPolicyById,
  getFinanceTransactionById,
  listFinanceAccounts,
  listFinanceCategories,
  listFinanceCostCenters,
  listFinanceRecognitionPolicies,
  listFinanceTransactions,
} from '../services/finance/finance-query.service';
import {
  serializeAccountDetail,
  serializeAccountItem,
  serializeCategoryDetail,
  serializeCategoryListItem,
  serializeCostCenterDetail,
  serializeCostCenterListItem,
  serializeRecognitionPolicyDetail,
  serializeRecognitionPolicyListItem,
  serializeTransactionDetail,
  serializeTransactionItem,
} from '../services/finance/finance-serializers';

const router = Router();

router.use(authenticateAdmin);
router.use(allowFinanceAccess);

function validationError(response: Response, error: any) {
  const message = error?.issues?.[0]?.message || error?.message || 'Query inválida';
  return response.status(400).json({ success: false, error: message });
}

function notFound(response: Response, message: string) {
  return response.status(404).json({ success: false, error: message });
}

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const parsed = financeAccountsListQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const result = await listFinanceAccounts(parsed.data);
    return res.json({ success: true, data: result.rows.map(serializeAccountItem), pagination: result.pagination });
  } catch (error) {
    console.error('[ADMIN_FINANCE_ACCOUNTS_LIST]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const parsed = financeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    const record = await getFinanceAccountById(parsed.data.id);
    if (!record) return notFound(res, 'Conta financeira não encontrada');
    return res.json({ success: true, data: serializeAccountDetail(record) });
  } catch (error) {
    console.error('[ADMIN_FINANCE_ACCOUNT_DETAIL]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const parsed = financeCategoriesListQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const result = await listFinanceCategories(parsed.data);
    return res.json({ success: true, data: result.rows.map(serializeCategoryListItem), pagination: result.pagination });
  } catch (error) {
    console.error('[ADMIN_FINANCE_CATEGORIES_LIST]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/categories/:id', async (req: Request, res: Response) => {
  try {
    const parsed = financeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    const record = await getFinanceCategoryById(parsed.data.id);
    if (!record) return notFound(res, 'Categoria financeira não encontrada');
    return res.json({ success: true, data: serializeCategoryDetail(record) });
  } catch (error) {
    console.error('[ADMIN_FINANCE_CATEGORY_DETAIL]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/cost-centers', async (req: Request, res: Response) => {
  try {
    const parsed = financeCostCentersListQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const result = await listFinanceCostCenters(parsed.data);
    return res.json({ success: true, data: result.rows.map(serializeCostCenterListItem), pagination: result.pagination });
  } catch (error) {
    console.error('[ADMIN_FINANCE_COST_CENTERS_LIST]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/cost-centers/:id', async (req: Request, res: Response) => {
  try {
    const parsed = financeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    const record = await getFinanceCostCenterById(parsed.data.id);
    if (!record) return notFound(res, 'Centro de custo não encontrado');
    return res.json({ success: true, data: serializeCostCenterDetail(record) });
  } catch (error) {
    console.error('[ADMIN_FINANCE_COST_CENTER_DETAIL]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/recognition-policies', async (req: Request, res: Response) => {
  try {
    const parsed = financeRecognitionPoliciesListQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const result = await listFinanceRecognitionPolicies(parsed.data);
    return res.json({ success: true, data: result.rows.map(serializeRecognitionPolicyListItem), pagination: result.pagination });
  } catch (error) {
    console.error('[ADMIN_FINANCE_RECOGNITION_POLICIES_LIST]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/recognition-policies/:id', async (req: Request, res: Response) => {
  try {
    const parsed = financeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    const record = await getFinanceRecognitionPolicyById(parsed.data.id);
    if (!record) return notFound(res, 'Política de reconhecimento não encontrada');
    return res.json({ success: true, data: serializeRecognitionPolicyDetail(record) });
  } catch (error) {
    console.error('[ADMIN_FINANCE_RECOGNITION_POLICY_DETAIL]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const parsed = financeTransactionsListQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const result = await listFinanceTransactions(parsed.data);
    return res.json({ success: true, data: result.rows.map(serializeTransactionItem), pagination: result.pagination });
  } catch (error) {
    console.error('[ADMIN_FINANCE_TRANSACTIONS_LIST]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const parsed = financeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    const record = await getFinanceTransactionById(parsed.data.id);
    if (!record) return notFound(res, 'Lançamento financeiro não encontrado');
    return res.json({ success: true, data: serializeTransactionDetail(record) });
  } catch (error) {
    console.error('[ADMIN_FINANCE_TRANSACTION_DETAIL]', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
