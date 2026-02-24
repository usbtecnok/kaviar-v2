import { useState } from 'react';
import { auth } from '../lib/auth';
import ForgotPassword from '../components/ForgotPassword';
import RequestAccess from '../components/RequestAccess';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRequestAccess, setShowRequestAccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await auth.login(email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 20 }}>🚗 Kaviar Driver</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 12, fontSize: 16, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: 12, fontSize: 16, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: 12, 
              fontSize: 16, 
              background: '#0066ff', 
              color: '#fff', 
              border: 'none',
              borderRadius: 4,
              fontWeight: 'bold'
            }}
          >
            Login
          </button>
          {error && <div style={{ color: 'red', padding: 10, background: '#ffeeee', borderRadius: 4 }}>{error}</div>}
        </form>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setShowRequestAccess(true)}
            style={{
              padding: 12,
              fontSize: 16,
              background: '#f0f0f0',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            📝 Solicitar Acesso
          </button>
          
          <button
            onClick={() => setShowForgotPassword(true)}
            style={{
              padding: 8,
              fontSize: 14,
              background: 'transparent',
              color: '#0066ff',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Esqueci minha senha
          </button>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPassword onClose={() => setShowForgotPassword(false)} />
      )}

      {showRequestAccess && (
        <RequestAccess onClose={() => setShowRequestAccess(false)} />
      )}
    </>
  );
}
