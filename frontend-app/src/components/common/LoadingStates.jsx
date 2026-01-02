import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

// Loading genérico
export const LoadingSpinner = ({ message = 'Carregando...' }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
    <CircularProgress />
    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

// Loading para listas
export const ListSkeleton = ({ items = 3 }) => (
  <Box>
    {Array.from({ length: items }).map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={60} />
      </Box>
    ))}
  </Box>
);

// Loading para cards de métricas
export const MetricCardSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="40%" height={40} />
    <Skeleton variant="text" width="80%" />
  </Box>
);

// Loading para mapas
export const MapSkeleton = () => (
  <Box 
    sx={{ 
      width: '100%', 
      height: 300, 
      bgcolor: 'grey.200', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      borderRadius: 1
    }}
  >
    <Typography variant="body2" color="textSecondary">
      Carregando mapa...
    </Typography>
  </Box>
);

export default {
  LoadingSpinner,
  ListSkeleton,
  MetricCardSkeleton,
  MapSkeleton
};
