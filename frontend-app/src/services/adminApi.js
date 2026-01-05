const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class AdminApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('kaviar_admin_token');
  }

  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle unauthorized responses
      if (response.status === 401) {
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
        throw new Error('Sessão expirada');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Admin-specific methods
  async getDrivers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/drivers${queryString ? `?${queryString}` : ''}`);
  }

  async getDriverById(id) {
    return this.get(`/api/admin/drivers/${id}`);
  }

  async approveDriver(id) {
    return this.put(`/api/admin/drivers/${id}/approve`);
  }

  async suspendDriver(id, reason) {
    return this.put(`/api/admin/drivers/${id}/suspend`, { reason });
  }

  async reactivateDriver(id) {
    return this.put(`/api/admin/drivers/${id}/reactivate`);
  }

  async getRides(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/rides${queryString ? `?${queryString}` : ''}`);
  }

  async getRideById(id) {
    return this.get(`/api/admin/rides/${id}`);
  }

  async cancelRide(id, reason) {
    return this.put(`/api/admin/rides/${id}/cancel`, { reason });
  }

  async reassignDriver(id, newDriverId, reason) {
    return this.put(`/api/admin/rides/${id}/reassign-driver`, { newDriverId, reason });
  }

  async forceCompleteRide(id, reason) {
    return this.put(`/api/admin/rides/${id}/force-complete`, { reason });
  }

  async getDashboardMetrics() {
    return this.get('/api/admin/dashboard/metrics');
  }

  // Premium Tourism - Tour Packages
  async getTourPackages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/tour-packages${queryString ? `?${queryString}` : ''}`);
  }

  async createTourPackage(data) {
    return this.post('/api/admin/tour-packages', data);
  }

  async getTourPackage(id) {
    return this.get(`/api/admin/tour-packages/${id}`);
  }

  async updateTourPackage(id, data) {
    return this.put(`/api/admin/tour-packages/${id}`, data);
  }

  async deactivateTourPackage(id) {
    return this.request(`/api/admin/tour-packages/${id}/deactivate`, { method: 'PATCH' });
  }

  // Premium Tourism - Tour Bookings
  async getTourBookings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/tour-bookings${queryString ? `?${queryString}` : ''}`);
  }

  async updateTourBookingStatus(id, status) {
    return this.request(`/api/admin/tour-bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async confirmTourBooking(id, adminId) {
    return this.post(`/api/admin/tour-bookings/${id}/confirm`, { adminId });
  }
}

export const adminApi = new AdminApiService();
