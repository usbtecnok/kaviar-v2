const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/auth/driver/login', (req, res) => {
  console.log('Login:', req.body.email);
  res.json({ token: 'mock-token-123', driverId: 'driver-1' });
});

app.post('/api/v2/drivers/me/availability', (req, res) => {
  console.log('Availability:', req.body.availability);
  res.json({ success: true });
});

app.post('/api/v2/drivers/me/location', (req, res) => {
  console.log('GPS:', req.body.lat, req.body.lng);
  res.json({ success: true });
});

app.get('/api/realtime/driver', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('SSE connected');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    const offer = {
      id: `offer-${Date.now()}`,
      pickup: 'Rua A, 123',
      dropoff: 'Rua B, 456'
    };
    console.log('Sending offer:', offer.id);
    res.write(`event: offer\ndata: ${JSON.stringify(offer)}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
    console.log('SSE disconnected');
  });
});

app.post('/api/v2/drivers/offers/:id/accept', (req, res) => {
  console.log('Accepted:', req.params.id);
  res.json({ success: true, data: { ride_id: `ride-${Date.now()}` } });
});

app.listen(3000, () => console.log('🚀 Mock server on http://localhost:3000'));
