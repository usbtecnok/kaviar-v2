import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function DriverAvailabilityToggle() {
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await api.get('/drivers/me/availability');
    if (res.data.success) {
      setAvailable(res.data.available);
    }
  };

  const toggle = async () => {
    setLoading(true);
    try {
      await api.put('/drivers/me/availability', { available: !available });
      setAvailable(!available);
    } catch (error) {
      alert('Erro ao atualizar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded shadow">
      <span className="font-medium">Disponível para corridas:</span>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          available ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            available ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={available ? 'text-green-600 font-bold' : 'text-gray-500'}>
        {available ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}
