/**
 * API Client Único - Sistema Anti-Frankenstein
 * Garante: path correto, token automático, anti-cache, erro padronizado
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.kaviar.com.br';
const TOKEN_KEY = 'kaviar_admin_token';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private normalizePath(path: string): string {
    // Remove leading/trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    
    // Se já começa com api/, retorna com /
    if (cleanPath.startsWith('api/')) {
      return `/${cleanPath}`;
    }
    
    // Mapeamento de paths legados para corretos
    const legacyMap: Record<string, string> = {
      'health': '/api/health',
      'neighborhoods': '/api/governance/neighborhoods',
    };
    
    if (legacyMap[cleanPath]) {
      console.warn(`[ApiClient] Legacy path detected: ${path} → ${legacyMap[cleanPath]}`);
      return legacyMap[cleanPath];
    }
    
    // Caso contrário, adiciona /api/
    console.warn(`[ApiClient] Path sem /api: ${path} → /api/${cleanPath}`);
    return `/api/${cleanPath}`;
  }

  private buildUrl(path: string): string {
    const normalized = this.normalizePath(path);
    return `${API_BASE}${normalized}`;
  }

  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number; requestId?: string }> {
    const url = this.buildUrl(path);
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      cache: 'no-store', // Anti-cache
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Log padronizado
      const logData = {
        method: options.method || 'GET',
        url,
        status: response.status,
        requestId: data.requestId,
        success: response.ok,
      };

      if (!response.ok) {
        console.error('[ApiClient] Request failed:', logData);
        throw {
          status: response.status,
          message: data.error || data.message || 'Erro na requisição',
          requestId: data.requestId,
          data,
        };
      }

      console.log('[ApiClient] Request success:', logData);
      return { data, status: response.status, requestId: data.requestId };
    } catch (error: any) {
      if (error.status) throw error; // Já tratado acima

      // Erro de rede/parsing
      console.error('[ApiClient] Network error:', {
        method: options.method || 'GET',
        url,
        error: error.message,
      });

      throw {
        status: 0,
        message: 'Erro de conexão com o servidor',
        error,
      };
    }
  }

  get<T = any>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  patch<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
