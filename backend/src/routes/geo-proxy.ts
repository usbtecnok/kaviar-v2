import { Router, Request, Response } from 'express';

const router = Router();
const PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

if (!PLACES_KEY) console.warn('[GEO_PROXY] GOOGLE_PLACES_KEY not set — geo proxy disabled');

// GET /api/geo/reverse?lat=X&lng=Y
router.get('/reverse', async (req: Request, res: Response) => {
  if (!PLACES_KEY) return res.status(503).json({ error: 'Geo service unavailable' });
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${PLACES_KEY}&language=pt-BR`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: 'Geocoding failed' });
  }
});

// GET /api/geo/autocomplete?input=X&lat=Y&lng=Z
router.get('/autocomplete', async (req: Request, res: Response) => {
  if (!PLACES_KEY) return res.status(503).json({ error: 'Geo service unavailable' });
  const { input, lat, lng } = req.query;
  if (!input) return res.status(400).json({ error: 'input required' });
  try {
    const loc = lat && lng ? `&location=${lat},${lng}&radius=30000` : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(String(input))}&key=${PLACES_KEY}&components=country:br&language=pt-BR${loc}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: 'Autocomplete failed' });
  }
});

// GET /api/geo/place-details?place_id=X
router.get('/place-details', async (req: Request, res: Response) => {
  if (!PLACES_KEY) return res.status(503).json({ error: 'Geo service unavailable' });
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: 'place_id required' });
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry&key=${PLACES_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: 'Place details failed' });
  }
});

export default router;
