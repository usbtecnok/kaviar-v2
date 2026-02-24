import { useState, useEffect } from 'react';
import { api } from './api';
import './App.css';

const GPS_INTERVAL = parseInt(import.meta.env.VITE_GPS_INTERVAL) || 10000;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [online, setOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [offers, setOffers] = useState([]);
  const [logs, setLogs] = useState([]);

  const log = (msg) => {
    const ts = new Date().toISOString();
    setLogs(prev => [...prev, `[${ts}] ${msg}`]);
    console.log(msg);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      log(`✓ Login success: ${data.driverId}`);
    } catch (err) {
      log(`✗ Login error: ${err.message}`);
    }
  };

  const handleToggleOnline = async () => {
    try {
      await api.setOnline(token, !online);
      setOnline(!online);
      log(`✓ Status: ${!online ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err) {
      log(`✗ Status error: ${err.message}`);
    }
  };

  const handleAccept = async (offerId) => {
    try {
      await api.acceptOffer(token, offerId);
      log(`✓ Accepted offer: ${offerId}`);
      setOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (err) {
      log(`✗ Accept error: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setOnline(false);
    setOffers([]);
    log('✓ Logged out');
  };

  useEffect(() => {
    if (!token) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      (err) => log(`✗ GPS error: ${err.message}`),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  useEffect(() => {
    if (!token || !location) return;

    const interval = setInterval(async () => {
      try {
        await api.updateLocation(token, location.lat, location.lng);
        log(`✓ GPS sent: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      } catch (err) {
        log(`✗ GPS send error: ${err.message}`);
      }
    }, GPS_INTERVAL);

    return () => clearInterval(interval);
  }, [token, location]);

  useEffect(() => {
    if (!token || !online) return;

    const es = api.connectSSE(token, (offer) => {
      log(`✓ Offer received: ${offer.id}`);
      setOffers(prev => [...prev, offer]);
    });

    return () => es.close();
  }, [token, online]);

  if (!token) {
    return (
      <div className="container">
        <h1>🚗 Kaviar Driver</h1>
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🚗 Kaviar Driver</h1>
      
      <div className="status">
        <button onClick={handleToggleOnline} className={online ? 'online' : 'offline'}>
          {online ? '🟢 ONLINE' : '🔴 OFFLINE'}
        </button>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {location && (
        <div className="info">
          📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}

      {offers.length > 0 && (
        <div className="offers">
          <h2>Offers ({offers.length})</h2>
          {offers.map(offer => (
            <div key={offer.id} className="offer">
              <div>ID: {offer.id}</div>
              <div>From: {offer.pickup}</div>
              <div>To: {offer.dropoff}</div>
              <button onClick={() => handleAccept(offer.id)}>Accept</button>
            </div>
          ))}
        </div>
      )}

      <div className="logs">
        <h3>Logs</h3>
        <div className="log-content">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

export default App;
