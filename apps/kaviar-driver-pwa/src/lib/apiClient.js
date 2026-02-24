import { logger } from './logger';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const apiClient = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const requestId = Date.now();
    logger.log('API_REQUEST', `${options.method || 'GET'} ${endpoint}`, {
      requestId,
      body: options.body ? JSON.parse(options.body) : undefined
    });

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json();

      if (!res.ok) {
        logger.log('API_ERROR', `${res.status} ${endpoint}`, {
          requestId,
          status: res.status,
          error: data
        });
        throw new Error(`HTTP ${res.status}`);
      }

      logger.log('API_SUCCESS', `${res.status} ${endpoint}`, {
        requestId,
        response: data
      });

      return data;
    } catch (err) {
      logger.log('API_EXCEPTION', endpoint, {
        requestId,
        error: err.message
      });
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
};

// Mask email for logs (show only first 3 chars + domain)
export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.substring(0, 3)}***@${domain}`;
};

// Password reset
export const requestPasswordReset = async (email) => {
  const masked = maskEmail(email);
  logger.log('PASSWORD_RESET_REQUEST', 'Requesting password reset', { email: masked });
  
  try {
    const data = await apiClient.post('/api/admin/auth/forgot-password', {
      email,
      userType: 'driver'
    });
    logger.log('PASSWORD_RESET_SUCCESS', 'Reset email sent', { email: masked });
    return data;
  } catch (err) {
    logger.log('PASSWORD_RESET_ERROR', 'Failed to request reset', { 
      email: masked, 
      error: err.message 
    });
    throw err;
  }
};

// Driver signup
export const requestDriverAccess = async (payload) => {
  const masked = maskEmail(payload.email);
  logger.log('DRIVER_SIGNUP_REQUEST', 'Requesting driver access', { 
    email: masked,
    name: payload.name 
  });
  
  try {
    const data = await apiClient.post('/api/driver/onboarding', payload);
    logger.log('DRIVER_SIGNUP_SUCCESS', 'Signup successful', { email: masked });
    return data;
  } catch (err) {
    logger.log('DRIVER_SIGNUP_ERROR', 'Failed to signup', { 
      email: masked, 
      error: err.message 
    });
    throw err;
  }
};
