import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

export function MatchSimulatorCard() {
  const [originLat, setOriginLat] = useState('-22.9711');
  const [originLng, setOriginLng] = useState('-43.1822');
  const [limit, setLimit] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const lat = parseFloat(originLat);
      const lng = parseFloat(originLng);
      const limitNum = parseInt(limit);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude inválida (-90 a 90)');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Longitude inválida (-180 a 180)');
      }
      if (isNaN(limitNum) || limitNum < 1) {
        throw new Error('Limit deve ser >= 1');
      }

      const response = await fetch(`${API_BASE_URL}/api/match/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat, lng },
          limit: limitNum
        })
      });

      if (response.status === 404) {
        throw new Error('Backend T2 ainda não publicado. Aguarde deploy.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao simular matching');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Match Simulator (MVP)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Simula matching de motoristas próximos à origem (sem criar corrida real)
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Latitude"
            value={originLat}
            onChange={(e) => setOriginLat(e.target.value)}
            size="small"
            sx={{ width: 150 }}
            placeholder="-22.9711"
          />
          <TextField
            label="Longitude"
            value={originLng}
            onChange={(e) => setOriginLng(e.target.value)}
            size="small"
            sx={{ width: 150 }}
            placeholder="-43.1822"
          />
          <TextField
            label="Limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            size="small"
            type="number"
            sx={{ width: 100 }}
          />
          <Button
            variant="contained"
            onClick={handleSimulate}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simular'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {results.total} drivers ativos encontrados. Mostrando top {results.results.length}.
            </Alert>

            {results.results.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Driver ID</TableCell>
                      <TableCell align="right">Distância (m)</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell>Última Localização</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.results.map((driver, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{driver.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {driver.driverId}
                        </TableCell>
                        <TableCell align="right">{driver.distanceMeters.toLocaleString()}</TableCell>
                        <TableCell align="right">{driver.score.toLocaleString()}</TableCell>
                        <TableCell>
                          {driver.lastLocationAt
                            ? new Date(driver.lastLocationAt).toLocaleString('pt-BR')
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning">
                Nenhum driver ativo encontrado. Execute o seed em DEV ou crie drivers manualmente.
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
