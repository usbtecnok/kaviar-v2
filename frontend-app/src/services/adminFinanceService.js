import api from '../api';

const FINANCE_BASE_PATH = '/api/admin/finance';

const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

const performGet = async (path, params, fallbackMessage) => {
  try {
    const query = buildQueryString(params);
    const response = await api.get(`${path}${query}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, fallbackMessage));
  }
};

export const listFinanceAccounts = async (params = {}) => {
  return performGet(
    `${FINANCE_BASE_PATH}/accounts`,
    params,
    'Não foi possível carregar contas financeiras.'
  );
};

export const listFinanceCategories = async (params = {}) => {
  return performGet(
    `${FINANCE_BASE_PATH}/categories`,
    params,
    'Não foi possível carregar categorias financeiras.'
  );
};

export const listFinanceCostCenters = async (params = {}) => {
  return performGet(
    `${FINANCE_BASE_PATH}/cost-centers`,
    params,
    'Não foi possível carregar centros de custo.'
  );
};
