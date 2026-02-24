import { useState } from 'react';
import { auth } from '../lib/auth';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';
import { useGPS } from '../hooks/useGPS';
import { useRealtimeOffers } from '../hooks/useRealtimeOffers';

export default function Dashboard({ onLogout }) {
  const [online, setOnline] = useState(false);
  const { location, error: gpsError } = useGPS(online);
  const { offers, removeOffer } = useRealtimeOffers(online);

  const toggleOnline = async () => {
    const newStatus = !online;
    logger.log('AVAILABILITY_TOGGLE', `Changing to ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
    
    try {
      await apiClient.post('/api/v2/drivers/me/availability', { 
        availability: newStatus ? 'online' : 'offline' 
      });
      setOnline(newStatus);
      logger.log('AVAILABILITY_SUCCESS', `Now ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err) {
      logger.log('AVAILABILITY_ERROR', 'Failed to toggle availability', { error: err.message });
    }
  };

  const acceptOffer = async (offerId) => {
    logger.log('OFFER_ACCEPT_START', 'Accepting offer', { offerId });
    
    try {
      const result = await apiClient.post(`/api/v2/drivers/offers/${offerId}/accept`);
      removeOffer(offerId);
      logger.log('OFFER_ACCEPT_SUCCESS', 'Offer accepted', { 
        offerId, 
        rideId: result.data?.ride_id 
      });
    } catch (err) {
      logger.log('OFFER_ACCEPT_ERROR', 'Failed to accept offer', { 
        offerId, 
        error: err.message 
      });
    }
  };

  const handleLogout = () => {
    auth.logout();
    onLogout();
  };

  const downloadLogs = () => {
    const blob = new Blob([logger.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-pwa-logs-${Date.now()}.json`;
    a.click();
    logger.log('LOGS_EXPORTED', 'Logs downloaded');
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>🚗 Kaviar Driver</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={toggleOnline}
          style={{
            flex: 1,
            minWidth: 120,
            padding: 12,
            fontSize: 16,
            background: online ? '#00cc00' : '#cc0000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 4
          }}
        >
          {online ? '🟢 ONLINE' : '🔴 OFFLINE'}
        </button>
        <button 
          onClick={handleLogout} 
          style={{ padding: 12, fontSize: 16, borderRadius: 4 }}
        >
          Logout
        </button>
        <button 
          onClick={downloadLogs} 
          style={{ padding: 12, fontSize: 16, borderRadius: 4 }}
        >
          📥 Logs
        </button>
      </div>

      {location && (
        <div style={{ background: '#f0f0f0', padding: 12, marginBottom: 20, borderRadius: 4 }}>
          📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}

      {gpsError && (
        <div style={{ background: '#ffcccc', padding: 12, marginBottom: 20, borderRadius: 4 }}>
          ⚠️ GPS Error: {gpsError}
        </div>
      )}

      {offers.length > 0 && (
        <div>
          <h2>Offers ({offers.length})</h2>
          {offers.map(offer => (
            <div key={offer.id} style={{ 
              background: '#f9f9f9', 
              padding: 12, 
              marginBottom: 10,
              borderRadius: 4,
              border: '1px solid #ddd'
            }}>
              <div><strong>ID:</strong> {offer.id}</div>
              <div><strong>From:</strong> {offer.pickup}</div>
              <div><strong>To:</strong> {offer.dropoff}</div>
              <button
                onClick={() => acceptOffer(offer.id)}
                style={{
                  marginTop: 10,
                  padding: 8,
                  width: '100%',
                  background: '#00cc00',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
