import { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Alert, Grid, Chip,
  Autocomplete, CircularProgress, MenuItem
} from '@mui/material';
import api from '../../api/index';

function usePlaceSearch() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((input) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input || input.length < 3) { setOptions([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/geo-proxy/autocomplete?input=${encodeURIComponent(input)}`);
        setOptions((data.predictions || []).map(p => ({ label: p.description, place_id: p.place_id })));
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  const resolve = useCallback(async (place_id) => {
    const { data } = await api.get(`/api/geo-proxy/place-details?place_id=${place_id}`);
    const loc = data.result?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  }, []);

  return { options, loading, search, resolve };
}

export default function RideSimulator() {
  const origin = usePlaceSearch();
  const dest = usePlaceSearch();
  const [originValue, setOriginValue] = useState(null);
  const [destValue, setDestValue] = useState(null);
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualOrigin, setManualOrigin] = useState({ lat: '', lng: '' });
  const [manualDest, setManualDest] = useState({ lat: '', lng: '' });
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [driverNeighborhood, setDriverNeighborhood] = useState('');

  useState(() => {
    api.get('/api/governance/neighborhoods').then(({ data }) => {
      if (data.success) setNeighborhoods(data.data.filter(n => n.is_active));
    }).catch(() => {});
  });

  const handleOriginSelect = async (_, val) => {
    setOriginValue(val);
    if (val?.place_id) {
      const coords = await origin.resolve(val.place_id);
      setOriginCoords(coords);
    } else { setOriginCoords(null); }
  };

  const handleDestSelect = async (_, val) => {
    setDestValue(val);
    if (val?.place_id) {
      const coords = await dest.resolve(val.place_id);
      setDestCoords(coords);
    } else { setDestCoords(null); }
  };

  const simulate = async () => {
    const oCoords = manualMode ? { lat: parseFloat(manualOrigin.lat), lng: parseFloat(manualOrigin.lng) } : originCoords;
    const dCoords = manualMode ? { lat: parseFloat(manualDest.lat), lng: parseFloat(manualDest.lng) } : destCoords;
    if (!oCoords?.lat || !oCoords?.lng || !dCoords?.lat || !dCoords?.lng) { setError('Selecione ou informe origem e destino'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/api/admin/pricing-profiles/simulate', {
        origin_lat: oCoords.lat, origin_lng: oCoords.lng,
        dest_lat: dCoords.lat, dest_lng: dCoords.lng,
        ...(driverNeighborhood ? { driver_neighborhood_id: driverNeighborhood } : {}),
      });
      if (data.success) setResult(data.data);
      else setError(data.error || 'Erro na simulação');
    } catch (err) { setError(err.response?.data?.error || 'Erro na simulação'); }
    finally { setLoading(false); }
  };

  const territoryLabel = { local: '🟢 LOCAL / Área 1', adjacent: '🟡 ADJACENT / Região próxima', external: '🔴 EXTERNAL / Área 2' };

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const money = (value) => `R$ ${toNumber(value).toFixed(2)}`;
  const km = (value) => `${toNumber(value).toFixed(2)} km`;
  const min = (value) => `${toNumber(value).toFixed(2)} min`;

  const feeModel = result?.fee_model || 'TERRITORIAL_CREDITS';
  const isFlatFee = feeModel === 'FLAT_FEE';
  const pricingSourceLabel = result?.pricing_source === 'google_route'
    ? 'Google Maps — rota real'
    : 'Estimativa em linha reta, quando houver fallback';

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Simulador de Corrida</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>SIMULAÇÃO — nenhuma corrida é criada.</Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Button size="small" variant="text" sx={{ mb: 1 }} onClick={() => setManualMode(!manualMode)}>
          {manualMode ? '← Usar autocomplete' : 'Usar coordenadas manuais'}
        </Button>
        <Grid container spacing={2}>
          {!manualMode ? (<>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={origin.options}
              loading={origin.loading}
              value={originValue}
              inputValue={originInput}
              onInputChange={(_, v, reason) => { setOriginInput(v); if (reason === 'input') origin.search(v); }}
              onChange={handleOriginSelect}
              getOptionLabel={o => typeof o === 'string' ? o : o.label || ''}
              isOptionEqualToValue={(o, v) => o.place_id === v?.place_id}
              filterOptions={x => x}
              noOptionsText={originInput.length < 3 ? 'Digite ao menos 3 caracteres' : origin.loading ? 'Buscando...' : 'Nenhuma sugestão encontrada'}
              renderInput={p => <TextField {...p} label="Origem" size="small" placeholder="Ex: Estrada das Furnas 3001" InputProps={{ ...p.InputProps, endAdornment: <>{origin.loading && <CircularProgress size={18} />}{p.InputProps.endAdornment}</> }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={dest.options}
              loading={dest.loading}
              value={destValue}
              inputValue={destInput}
              onInputChange={(_, v, reason) => { setDestInput(v); if (reason === 'input') dest.search(v); }}
              onChange={handleDestSelect}
              getOptionLabel={o => typeof o === 'string' ? o : o.label || ''}
              isOptionEqualToValue={(o, v) => o.place_id === v?.place_id}
              filterOptions={x => x}
              noOptionsText={destInput.length < 3 ? 'Digite ao menos 3 caracteres' : dest.loading ? 'Buscando...' : 'Nenhuma sugestão encontrada'}
              renderInput={p => <TextField {...p} label="Destino" size="small" placeholder="Ex: Museu do Açude" InputProps={{ ...p.InputProps, endAdornment: <>{dest.loading && <CircularProgress size={18} />}{p.InputProps.endAdornment}</> }} />}
            />
          </Grid>
          </>) : (<>
          <Grid item xs={3}><TextField label="Origem lat" size="small" fullWidth type="number" value={manualOrigin.lat} onChange={e => setManualOrigin({ ...manualOrigin, lat: e.target.value })} /></Grid>
          <Grid item xs={3}><TextField label="Origem lng" size="small" fullWidth type="number" value={manualOrigin.lng} onChange={e => setManualOrigin({ ...manualOrigin, lng: e.target.value })} /></Grid>
          <Grid item xs={3}><TextField label="Destino lat" size="small" fullWidth type="number" value={manualDest.lat} onChange={e => setManualDest({ ...manualDest, lat: e.target.value })} /></Grid>
          <Grid item xs={3}><TextField label="Destino lng" size="small" fullWidth type="number" value={manualDest.lng} onChange={e => setManualDest({ ...manualDest, lng: e.target.value })} /></Grid>
          </>)}
          <Grid item xs={12} sm={6}>
            <TextField select label="Bairro/base cadastrada do motorista (opcional)" size="small" fullWidth
              value={driverNeighborhood} onChange={e => setDriverNeighborhood(e.target.value)}
              helperText="Use apenas para bairros já cadastrados no KAVIAR. Para cidades novas, deixe vazio."
            >
              <MenuItem value="">Nenhum (visão da rota)</MenuItem>
              {neighborhoods.map(n => <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={simulate} disabled={loading}>
              {loading ? 'Simulando...' : 'Simular'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Resultado</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Perfil usado</Typography></Grid>
            <Grid item xs={6}><Chip label={result.pricing_profile} size="small" /></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Área</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{territoryLabel[result.route_territory] || result.route_territory}</Typography></Grid>

            {result.driver_territory && result.driver_territory !== result.route_territory && (
              <><Grid item xs={6}><Typography variant="body2" color="text.secondary">Área (motorista)</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{territoryLabel[result.driver_territory] || result.driver_territory}</Typography></Grid></>
            )}

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Distância</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{km(result.distance_km)}</Typography></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Duração estimada</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{min(result.duration_min)}</Typography></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Minutos tarifáveis</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{min(result.billable_minutes)}</Typography></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Fonte do cálculo</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{pricingSourceLabel}</Typography></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Preço final</Typography></Grid>
            <Grid item xs={6}><Typography variant="body1" fontWeight={700}>{money(result.price)}</Typography></Grid>

            {result.territory_floor_applied ? (
              <>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Piso territorial</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="warning.main">Aplicado: {money(result.territory_floor_value)}</Typography></Grid>
              </>
            ) : null}

            {toNumber(result.surcharge_applied) > 0 && (
              <><Grid item xs={6}><Typography variant="body2" color="text.secondary">Adicional Área 2</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" color="error">+ {money(result.surcharge_applied)}</Typography></Grid></>
            )}

            <Grid item xs={12}><Box sx={{ borderTop: '1px solid #eee', my: 1 }} /></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Modelo de cobrança</Typography></Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight={600}>
                {isFlatFee ? 'Taxa única' : 'Modelo territorial legado'}
              </Typography>
            </Grid>

            {isFlatFee ? (
              <>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Observação</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">Taxa única — sem cobrança fixa por corrida</Typography></Grid>
              </>
            ) : null}

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Taxa KAVIAR</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{toNumber(result.fee_percent).toFixed(2)}% = {money(result.fee_amount)}</Typography></Grid>

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Motorista bruto</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{money(result.driver_earnings)}</Typography></Grid>

            {!isFlatFee ? (
              <>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Créditos de operação — modelo legado</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{toNumber(result.credit_cost)} × R$ 2,00 = {money(result.credit_value)}</Typography></Grid>
              </>
            ) : null}

            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Motorista recebe</Typography></Grid>
            <Grid item xs={6}>
              <Typography
                variant="body1"
                fontWeight={700}
                color={(isFlatFee ? toNumber(result.driver_earnings) : toNumber(result.driver_net_after_credit)) >= 10 ? 'success.main' : 'warning.main'}
              >
                {money(isFlatFee ? result.driver_earnings : result.driver_net_after_credit)}
              </Typography>
            </Grid>

            {result.origin_neighborhood && (
              <><Grid item xs={6}><Typography variant="caption" color="text.secondary">Bairro origem</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption">{result.origin_neighborhood}</Typography></Grid></>
            )}
            {result.dest_neighborhood && (
              <><Grid item xs={6}><Typography variant="caption" color="text.secondary">Bairro destino</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption">{result.dest_neighborhood}</Typography></Grid></>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
