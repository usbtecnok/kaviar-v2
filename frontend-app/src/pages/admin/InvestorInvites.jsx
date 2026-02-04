import { useState } from 'react';
import { API_BASE_URL } from '../../config/api';

export default function InvestorInvites() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('INVESTOR_VIEW');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/investors/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setEmail('');
      } else {
        setError(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ color: '#d32f2f', marginBottom: '10px' }}>👥 Convites Investidor/Anjo</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
        Envie convites para investidores ou anjos acessarem o sistema com permissões read-only.
      </p>

      {success && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          ✅ {success}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #ef5350'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Email do Investidor/Anjo
          </label>
          <input
            type="email"
            placeholder="email.real@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Tipo de Acesso
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <option value="INVESTOR_VIEW">Investidor (Read-Only)</option>
            <option value="ANGEL_VIEWER">Angel Viewer (Read-Only)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#999' : '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Enviando...' : '📧 Enviar Convite'}
        </button>
      </form>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>ℹ️ Como funciona:</h3>
        <ul style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', paddingLeft: '20px' }}>
          <li>O convidado receberá um email com link para definir senha</li>
          <li>Link expira em 15 minutos</li>
          <li>Acesso read-only: pode visualizar mas não editar dados</li>
          <li>Login em: app.kaviar.com.br/admin/login</li>
        </ul>
      </div>
    </div>
  );
}
