import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function DriverEarnings() {
  const [earnings, setEarnings] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const res = await api.get(`/drivers/me/earnings?${params}`);
    if (res.data.success) {
      setEarnings(res.data);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!earnings) return <div>Carregando...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Meus Ganhos</h2>
      
      <div className="mb-4 flex gap-2">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2" />
        <button onClick={load} className="bg-blue-500 text-white px-4 py-2 rounded">Filtrar</button>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <p><strong>Total:</strong> R$ {earnings.summary.total_earnings.toFixed(2)}</p>
        <p><strong>Corridas:</strong> {earnings.summary.total_rides}</p>
        <p><strong>Média:</strong> R$ {earnings.summary.avg_earnings.toFixed(2)}</p>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Data</th>
            <th className="p-2">Preço</th>
            <th className="p-2">Taxa</th>
            <th className="p-2">Ganho</th>
          </tr>
        </thead>
        <tbody>
          {earnings.rides.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-2">R$ {Number(r.price).toFixed(2)}</td>
              <td className="p-2">R$ {Number(r.platform_fee || 0).toFixed(2)}</td>
              <td className="p-2">R$ {Number(r.driver_amount || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
