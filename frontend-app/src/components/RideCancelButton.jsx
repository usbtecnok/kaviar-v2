import { useState } from 'react';
import { api } from '../api/client';

export function RideCancelButton({ rideId, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [showModal, setShowModal] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/rides/${rideId}/cancel`, { reason });
      setShowModal(false);
      onCancel?.();
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Cancelar Corrida
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-md">
            <h3 className="text-lg font-bold mb-4">Cancelar Corrida</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="border p-2 w-full mb-4"
              rows={3}
            />
            <div className="flex gap-2">
              <button 
                onClick={cancel}
                disabled={cancelling}
                className="bg-red-500 text-white px-4 py-2 rounded flex-1"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar'}
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
