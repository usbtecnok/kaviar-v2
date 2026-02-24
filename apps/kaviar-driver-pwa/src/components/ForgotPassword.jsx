import { useState } from 'react';
import { requestPasswordReset } from '../lib/apiClient';
import { openWhatsAppSupport, getPasswordResetWhatsAppMessage } from '../lib/whatsapp';

const FEATURE_ENABLED = import.meta.env.VITE_FEATURE_PASSWORD_RESET === 'true';

export default function ForgotPassword({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!FEATURE_ENABLED) {
      // Fallback: WhatsApp
      openWhatsAppSupport(getPasswordResetWhatsAppMessage(email));
      setLoading(false);
      onClose();
      return;
    }

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError('Erro ao solicitar reset. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>✅ Email Enviado</h2>
          <p>Se o email existir, você receberá instruções para redefinir sua senha.</p>
          <button onClick={onClose} style={styles.button}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Esqueci minha senha</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.buttonSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Enviando...' : FEATURE_ENABLED ? 'Enviar' : 'Contatar Suporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#fff',
    padding: 30,
    borderRadius: 8,
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15
  },
  input: {
    padding: 12,
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 4
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  button: {
    padding: 12,
    fontSize: 16,
    background: '#0066ff',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  buttonSecondary: {
    padding: 12,
    fontSize: 16,
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  },
  error: {
    color: 'red',
    fontSize: 14
  }
};
