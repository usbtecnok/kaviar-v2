import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  FiberNew as NewIcon,
} from '@mui/icons-material';

const BADGE_CONFIG = {
  DIAMOND: {
    label: 'Guardião Comunitário',
    color: '#1976d2',
    icon: <TrophyIcon />,
    description: '200+ corridas, avaliação 4.9+, validado pela comunidade',
  },
  GOLD: {
    label: 'Verificado pela Comunidade',
    color: '#f59e0b',
    icon: <StarIcon />,
    description: '50+ corridas ou validado por liderança comunitária',
  },
  GREEN: {
    label: 'Motorista Ativo',
    color: '#10b981',
    icon: <CheckIcon />,
    description: '10+ corridas, avaliação 4.5+',
  },
  YELLOW: {
    label: 'Motorista Novo',
    color: '#eab308',
    icon: <NewIcon />,
    description: 'Iniciando na comunidade',
  },
};

interface ReputationBadgeProps {
  level?: string;
  badge?: string;
  totalRides?: number;
  avgRating?: number;
  showDetails?: boolean;
  firstRideAt?: string | Date;
}

export default function ReputationBadge({
  level = 'NEW',
  badge = 'YELLOW',
  totalRides = 0,
  avgRating = 0,
  showDetails = true,
  firstRideAt,
}: ReputationBadgeProps) {
  const config = BADGE_CONFIG[badge as keyof typeof BADGE_CONFIG] || BADGE_CONFIG.YELLOW;
  
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Recente';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recente';
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  
  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {config.label}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
        {config.description}
      </Typography>
      {showDetails && (
        <>
          <Typography variant="caption" sx={{ display: 'block' }}>
            📊 {totalRides} corridas realizadas
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            ⭐ Avaliação média: {avgRating.toFixed(1)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            📅 Membro desde {formatDate(firstRideAt)}
          </Typography>
        </>
      )}
    </Box>
  );
  
  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.color,
          color: 'white',
          fontWeight: 'bold',
          '& .MuiChip-icon': {
            color: 'white',
          },
        }}
      />
    </Tooltip>
  );
}
