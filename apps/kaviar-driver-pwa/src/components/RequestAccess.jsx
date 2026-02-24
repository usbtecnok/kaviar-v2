import { useState } from 'react';
import { requestDriverAccess } from '../lib/apiClient';
import { openWhatsAppSupport, getDriverAccessWhatsAppMessage } from '../lib/whatsapp';

const FEATURE_ENABLED = import.meta.env.VITE_FEATURE_DRIVER_SIGNUP === 'true';

export default function RequestAccess({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    neighborhoodId: 'default-neighborhood'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!FEATURE_ENABLED) {
      // Fallback: WhatsApp
      openWhatsAppSupport(getDriverAccessWhatsAppMessage(
        formData.name,
        formData.email,
        formData.phone
      ));
      setLoading(false);
      onClose();
      return;
    }

    try {
      await requestDriverAccess({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        neighborhoodId: formData.neighborhoodId
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao solicitar acesso. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>✅ Solicitação Enviada</h2>
          <p>Seu cadastro foi realizado com sucesso! Aguarde aprovação da equipe.</p>
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
        <h2>Solicitar Acesso</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            name="name"
            placeholder="Nome completo *"
            value={formData.name}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            type="email"
            name="email"
            placeholder="Email *"
            value={formData.email}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Telefone (opcional)"
            value={formData.phone}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="Senha (mínimo 6 caracteres) *"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            style={styles.input}
          />
          <input
            type="text"
            name="neighborhoodId"
            placeholder="ID do Bairro *"
            value={formData.neighborhoodId}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <div style={styles.hint}>
            * Campos obrigatórios
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.buttonSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Enviando...' : FEATURE_ENABLED ? 'Solicitar' : 'Contatar Suporte'}
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
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  input: {
    padding: 12,
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 4
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: -8
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 10
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
    fontSize: 14,
    padding: 10,
    background: '#ffeeee',
    borderRadius: 4
  }
};
