const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  async login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  async setOnline(token, online) {
    const res = await fetch(`${API_URL}/api/v2/drivers/me/availability`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ availability: online ? 'online' : 'offline' })
    });
    if (!res.ok) throw new Error('Status update failed');
    return res.json();
  },

  async updateLocation(token, lat, lng) {
    const res = await fetch(`${API_URL}/api/v2/drivers/me/location`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lat, lng })
    });
    if (!res.ok) throw new Error('Location update failed');
    return res.json();
  },

  async acceptOffer(token, offerId) {
    const res = await fetch(`${API_URL}/api/v2/drivers/offers/${offerId}/accept`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Accept failed');
    return res.json();
  },

  connectSSE(token, onOffer) {
    const es = new EventSource(`${API_URL}/api/realtime/driver`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    es.addEventListener('offer', (e) => {
      onOffer(JSON.parse(e.data));
    });
    return es;
  }
};
