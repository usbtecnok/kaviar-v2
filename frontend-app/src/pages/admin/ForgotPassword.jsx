import { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { Link } from 'react-router-dom';


export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Erro ao enviar email');
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
        <h1 style={{ color: '#4caf50', textAlign: 'center' }}>✓ Email Enviado</h1>
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          <p>Se o email informado estiver cadastrado, você receberá instruções para redefinir sua senha.</p>
          <p><strong>Verifique sua caixa de entrada e spam.</strong></p>
          <p style={{ fontSize: '14px', marginTop: '15px' }}>
            O link expira em 15 minutos.
          </p>
        </div>
        <Link
          to="/admin/login"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#d32f2f',
            textDecoration: 'none',
            marginTop: '20px'
          }}
        >
          ← Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1 style={{ color: '#d32f2f', textAlign: 'center' }}>🔑 Esqueci Minha Senha</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
        Digite seu email para receber instruções de redefinição de senha.
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
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Email
          </label>
          <input
            type="email"
            placeholder="seu-email@kaviar.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
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
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '15px'
          }}
        >
          {loading ? '⏳ Enviando...' : '📧 Enviar Email'}
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
        Por segurança, sempre retornamos a mesma mensagem, independente do email existir ou não.
      </p>
    </div>
  );
}
