import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Refresh a cada 30s
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const res = await api.get('/admin/dashboard/metrics');
      if (res.data.success) {
        setMetrics(res.data.metrics);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Rides Hoje */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Corridas Hoje</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.rides.today}</p>
            <p className="text-xs text-gray-400 mt-1">Total: {metrics.rides.total}</p>
          </div>
          <div className="text-4xl">🚗</div>
        </div>
      </div>

      {/* Drivers Online */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Motoristas Online</p>
            <p className="text-3xl font-bold text-green-600">{metrics.drivers.online}</p>
            <p className="text-xs text-gray-400 mt-1">
              Offline: {metrics.drivers.offline} | Total: {metrics.drivers.total}
            </p>
          </div>
          <div className="text-4xl">👨‍✈️</div>
        </div>
      </div>

      {/* Revenue Hoje */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Receita Hoje</p>
            <p className="text-3xl font-bold text-purple-600">
              R$ {metrics.revenue.today.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Taxa da plataforma</p>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </div>

      {/* Passageiros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Passageiros</p>
            <p className="text-3xl font-bold text-orange-600">{metrics.passengers.total}</p>
            <p className="text-xs text-gray-400 mt-1">Total cadastrados</p>
          </div>
          <div className="text-4xl">👥</div>
        </div>
      </div>
    </div>
  );
}
