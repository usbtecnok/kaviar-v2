import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';


export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token inválido ou ausente');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token inválido');
      return;
    }

    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 3000);
      } else {
        setError(data.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <h1 style={{ color: '#4caf50', textAlign: 'center' }}>✓ Senha Redefinida</h1>
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          <p>Sua senha foi redefinida com sucesso!</p>
          <p><strong>Redirecionando para o painel...</strong></p>
        </div>
        <Link
          to="/admin"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#d32f2f',
            textDecoration: 'none'
          }}
        >
          Ir para o painel agora →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1 style={{ color: '#d32f2f', textAlign: 'center' }}>🔒 Redefinir Senha</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
        Digite sua nova senha abaixo.
      </p>

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
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Nova Senha
          </label>
          <input
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading || !token}
            autoComplete="new-password"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Mínimo 8 caracteres
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Confirmar Nova Senha
          </label>
          <input
            type="password"
            placeholder="Digite a senha novamente"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || !token}
            autoComplete="new-password"
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

        <button
          type="submit"
          disabled={loading || !token}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading || !token ? '#999' : '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading || !token ? 'not-allowed' : 'pointer',
            marginBottom: '15px'
          }}
        >
          {loading ? '⏳ Salvando...' : '✓ Redefinir Senha'}
        </button>

        <Link
          to="/admin/login"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#666',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Voltar para o login
        </Link>
      </form>

      <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
        O link de redefinição expira em 15 minutos.
      </p>
    </div>
  );
}
