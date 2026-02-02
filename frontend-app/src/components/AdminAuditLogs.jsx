import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [adminId, setAdminId] = useState('');
  const [startDate, setStartDate] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (adminId) params.append('admin_id', adminId);
    if (startDate) params.append('start_date', startDate);
    params.append('limit', '100');
    
    const res = await api.get(`/admin/audit-logs?${params}`);
    if (res.data.success) {
      setLogs(res.data.logs);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
      
      <div className="mb-4 flex gap-2">
        <input placeholder="Admin ID" value={adminId} onChange={e => setAdminId(e.target.value)} className="border p-2" />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2" />
        <button onClick={load} className="bg-blue-500 text-white px-4 py-2 rounded">Filtrar</button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Data</th>
            <th className="p-2">Admin</th>
            <th className="p-2">Ação</th>
            <th className="p-2">Ride ID</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-t">
              <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
              <td className="p-2">{log.admin_id}</td>
              <td className="p-2">{log.action}</td>
              <td className="p-2">{log.ride_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
